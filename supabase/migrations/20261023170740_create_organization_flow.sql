begin;

-- Organization + first team + initial channel succeed or roll back together.
create function public.create_organization(p_name text, p_team_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare w uuid; t uuid; c uuid;
begin
  perform private.require_mfa();
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 120
    or char_length(btrim(coalesce(p_team_name,''))) not between 1 and 120 then
    raise exception 'Informe o nome da organização e do primeiro time.' using errcode='22023';
  end if;
  w:=public.create_workspace(btrim(p_name));
  t:=public.create_team(w,btrim(p_team_name));
  c:=public.create_channel(t,'geral','public'::public.channel_kind,'{}'::uuid[]);
  return jsonb_build_object('workspace_id',w,'team_id',t,'channel_id',c);
end $$;

-- A private, durable marker freezes writes while Storage removes physical files.
-- No client can set the transaction marker used by the finalizer.
create table private.organization_deletion_jobs (
  workspace_id uuid primary key,
  owner_id uuid not null,
  confirmation_name text not null,
  started_at timestamptz not null default clock_timestamp(),
  finalizing_txid bigint
);
alter table private.organization_deletion_jobs enable row level security;
revoke all on private.organization_deletion_jobs from public,anon,authenticated;

create function private.organization_accepts_upload(p_bucket text,p_path text) returns boolean
language plpgsql security definer set search_path='' as $$
declare w uuid;
begin
  if p_bucket='hub-files' then select t.workspace_id into w from public.teams t where t.id::text=split_part(p_path,'/',1);
  elsif p_bucket='organization-library' then select n.workspace_id into w from public.library_nodes n where n.id::text=split_part(p_path,'/',1);
  else return true; end if;
  if w is null then return true; end if;
  perform 1 from public.workspaces where id=w for key share;
  return not exists(select 1 from private.organization_deletion_jobs j where j.workspace_id=w);
end
$$;
revoke all on function private.organization_accepts_upload(text,text) from public,anon,authenticated;
grant execute on function private.organization_accepts_upload(text,text) to authenticated;
create policy organization_deletion_upload_lock on storage.objects as restrictive for insert to authenticated
with check(private.organization_accepts_upload(bucket_id,name));

create function private.guard_organization_deletion() returns trigger
language plpgsql security definer set search_path='' as $$
declare row_payload jsonb; w uuid;
begin
  foreach row_payload in array array[
    case when tg_op<>'INSERT' then to_jsonb(old) end,
    case when tg_op<>'DELETE' then to_jsonb(new) end
  ] loop
    if row_payload is null then continue; end if;
    w:=null;
    if tg_table_schema='public' and tg_table_name='workspaces' then w:=(row_payload->>'id')::uuid;
    elsif row_payload->>'workspace_id' is not null then w:=(row_payload->>'workspace_id')::uuid;
    elsif row_payload->>'node_id' is not null then select workspace_id into w from public.library_nodes where id=(row_payload->>'node_id')::uuid;
    elsif row_payload->>'request_id' is not null then select workspace_id into w from public.org_requests where id=(row_payload->>'request_id')::uuid;
    elsif row_payload->>'connection_id' is not null then select t.workspace_id into w from public.calendar_connections c join public.teams t on t.id=c.team_id where c.id=(row_payload->>'connection_id')::uuid;
    elsif row_payload->>'team_id' is not null then select workspace_id into w from public.teams where id=(row_payload->>'team_id')::uuid;
    end if;
    -- Serialize in-flight writes with the owner's deletion-start row lock.
    perform 1 from public.workspaces where id=w for key share;
    if exists(select 1 from private.organization_deletion_jobs j where j.workspace_id=w and j.finalizing_txid is distinct from txid_current()) then
      raise exception 'A exclusão da organização está em andamento. Conclua em Configurações.' using errcode='55000';
    end if;
  end loop;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.guard_organization_deletion() from public,anon,authenticated;
do $$declare item record;begin
  for item in select distinct n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in('public','private') and c.relkind in('r','p') and c.relname<>'organization_deletion_jobs'
    and (c.relname='workspaces' or exists(select 1 from pg_attribute a where a.attrelid=c.oid and not a.attisdropped and a.attname in('workspace_id','team_id','node_id','request_id','connection_id')))
  loop
    execute format('create trigger guard_organization_deletion before insert or update or delete on %I.%I for each row execute function private.guard_organization_deletion()',item.nspname,item.relname);
  end loop;
end $$;

create or replace function private.org_protect_owner() returns trigger
language plpgsql security definer set search_path='' as $$begin
  if old.user_id=(select owner_id from public.workspaces where id=old.workspace_id)
    and (tg_op='DELETE' or not new.is_active or new.role<>'admin')
    and not exists(select 1 from private.organization_deletion_jobs j where j.workspace_id=old.workspace_id and j.owner_id=auth.uid() and j.finalizing_txid=txid_current()) then
    raise exception 'Transfira a coroa antes de alterar o dono.' using errcode='23514';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

-- Deletion must not recreate organization-owned audit rows during teardown.
do $$declare definition text;patched text;begin
  definition:=pg_get_functiondef('private.audit_change()'::regprocedure);
  patched:=replace(definition,'if workspace is null then return coalesce(new,old);end if;',
    'if workspace is null then return coalesce(new,old);end if; if exists(select 1 from private.organization_deletion_jobs j where j.workspace_id=workspace and j.finalizing_txid=txid_current()) then return coalesce(new,old);end if;');
  if patched=definition then raise exception 'Audit deletion guard could not be installed'; end if;
  execute patched;
end $$;

create function public.organization_deletion_status(p_workspace_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$begin
  perform private.require_mfa();
  return private.org_owner(p_workspace_id) and exists(select 1 from private.organization_deletion_jobs where workspace_id=p_workspace_id);
end $$;

create function public.begin_organization_deletion(p_workspace_id uuid,p_confirmation_name text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); current_name text;
begin
  select name into current_name from public.workspaces where id=p_workspace_id for update;
  if not found or not private.org_owner(p_workspace_id,actor) then raise exception 'Somente o dono pode excluir a organização.' using errcode='42501'; end if;
  if btrim(p_confirmation_name) is distinct from current_name then raise exception 'Digite o nome exato da organização.' using errcode='22023'; end if;
  insert into private.organization_deletion_jobs(workspace_id,owner_id,confirmation_name)
    values(p_workspace_id,actor,current_name) on conflict(workspace_id) do nothing;
  if not exists(select 1 from private.organization_deletion_jobs where workspace_id=p_workspace_id and owner_id=actor and confirmation_name=current_name) then
    raise exception 'A exclusão precisa ser retomada pelo dono que a iniciou.' using errcode='42501';
  end if;
end $$;

-- Read metadata only. Physical deletion always uses the Storage API.
-- Prefixes include previous library attachments and pending chat uploads.
create function public.organization_deletion_files(p_workspace_id uuid) returns table(bucket_id text,object_path text)
language plpgsql security definer set search_path='' as $$begin
  perform private.require_mfa();
  if not private.org_owner(p_workspace_id) or not exists(select 1 from private.organization_deletion_jobs where workspace_id=p_workspace_id and owner_id=auth.uid()) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  return query select o.bucket_id,o.name from storage.objects o
    where (o.bucket_id='hub-files' and exists(select 1 from public.teams t where t.workspace_id=p_workspace_id and t.id::text=split_part(o.name,'/',1)))
       or (o.bucket_id='organization-library' and exists(select 1 from public.library_nodes n where n.workspace_id=p_workspace_id and n.id::text=split_part(o.name,'/',1)))
    order by o.bucket_id,o.name limit 100;
end $$;

create function public.finalize_organization_deletion(p_workspace_id uuid,p_confirmation_name text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); current_name text; team_ids uuid[];
begin
  select name into current_name from public.workspaces where id=p_workspace_id for update;
  if not found then return; end if;
  if not private.org_owner(p_workspace_id,actor) then raise exception 'Somente o dono pode excluir a organização.' using errcode='42501'; end if;
  if btrim(p_confirmation_name) is distinct from current_name then raise exception 'Digite o nome exato da organização.' using errcode='22023'; end if;
  perform 1 from private.organization_deletion_jobs where workspace_id=p_workspace_id and owner_id=actor and confirmation_name=current_name for update;
  if not found then raise exception 'Inicie a exclusão antes de concluir.' using errcode='55000'; end if;
  if exists(select 1 from public.organization_deletion_files(p_workspace_id)) then raise exception 'Ainda há arquivos para apagar. Continue a exclusão.' using errcode='55000'; end if;
  update private.organization_deletion_jobs set finalizing_txid=txid_current() where workspace_id=p_workspace_id;
  select coalesce(array_agg(id),'{}'::uuid[]) into team_ids from public.teams where workspace_id=p_workspace_id;

  delete from private.org_invite_authorizations where workspace_id=p_workspace_id;
  delete from private.team_invitations where workspace_id=p_workspace_id;
  delete from public.org_votes where request_id in(select id from public.org_requests where workspace_id=p_workspace_id);
  delete from public.org_requests where workspace_id=p_workspace_id;
  delete from public.org_transfers where workspace_id=p_workspace_id;
  delete from public.org_notices where workspace_id=p_workspace_id;
  delete from public.org_activity where workspace_id=p_workspace_id;
  delete from public.org_approval_policies where workspace_id=p_workspace_id;
  delete from public.org_features where workspace_id=p_workspace_id;
  delete from public.library_share_requests where node_id in(select id from public.library_nodes where workspace_id=p_workspace_id) or recipient_team=any(team_ids);
  delete from public.library_grants where node_id in(select id from public.library_nodes where workspace_id=p_workspace_id) or team_id=any(team_ids);
  delete from public.library_nodes where workspace_id=p_workspace_id;
  delete from public.notifications where team_id=any(team_ids);
  delete from public.calendar_event_links where team_id=any(team_ids);
  delete from public.calendar_connections where team_id=any(team_ids);
  delete from public.event_attendees where team_id=any(team_ids);
  delete from public.meeting_documents where team_id=any(team_ids);
  delete from public.events where team_id=any(team_ids);
  delete from public.message_reactions where team_id=any(team_ids);
  delete from public.message_pins where team_id=any(team_ids);
  delete from public.attachments where team_id=any(team_ids);
  delete from public.messages where team_id=any(team_ids);
  delete from public.incoming_webhooks where team_id=any(team_ids);
  delete from public.channel_members where team_id=any(team_ids);
  delete from public.channels where team_id=any(team_ids);
  delete from public.paused_timers where team_id=any(team_ids);
  delete from public.time_entries where team_id=any(team_ids);
  delete from public.tasks where team_id=any(team_ids);
  delete from public.projects where team_id=any(team_ids);
  delete from public.clients where team_id=any(team_ids);
  delete from public.shift_swaps where team_id=any(team_ids);
  delete from public.shifts where team_id=any(team_ids);
  delete from public.absences where team_id=any(team_ids);
  delete from public.home_office_swaps where team_id=any(team_ids);
  delete from public.home_office_members where team_id=any(team_ids);
  delete from public.home_office_holidays where team_id=any(team_ids);
  delete from public.home_office_schedules where team_id=any(team_ids);
  delete from public.work_schedules where team_id=any(team_ids);
  delete from public.time_goals where team_id=any(team_ids);
  delete from public.team_dates where team_id=any(team_ids);
  delete from public.team_notes where team_id=any(team_ids);
  delete from public.standups where team_id=any(team_ids);
  delete from public.member_statuses where team_id=any(team_ids);
  delete from public.audit_events where workspace_id=p_workspace_id;
  delete from public.team_members where workspace_id=p_workspace_id;
  delete from public.teams where workspace_id=p_workspace_id;
  delete from public.workspace_members where workspace_id=p_workspace_id;
  delete from public.workspaces where id=p_workspace_id;
  delete from private.organization_deletion_jobs where workspace_id=p_workspace_id;
end $$;

revoke all on function public.create_organization(text,text),public.organization_deletion_status(uuid),public.begin_organization_deletion(uuid,text),public.organization_deletion_files(uuid),public.finalize_organization_deletion(uuid,text) from public,anon,authenticated;
grant execute on function public.create_organization(text,text),public.organization_deletion_status(uuid),public.begin_organization_deletion(uuid,text),public.organization_deletion_files(uuid),public.finalize_organization_deletion(uuid,text) to authenticated;
commit;
