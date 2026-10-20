begin;
create table private.team_invitations (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id),
 team_id uuid not null,
 email text not null check(char_length(email) between 3 and 254),
 role public.team_role not null,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 invited_by uuid not null references public.profiles(id),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '7 days',
 revoked_at timestamptz,accepted_at timestamptz,
 accepted_by uuid references public.profiles(id),
 foreign key(workspace_id,team_id) references public.teams(workspace_id,id)
);
create index team_invitations_team_idx on private.team_invitations(team_id,created_at desc);
create index team_invitations_rate_idx on private.team_invitations(workspace_id,created_at desc);
alter table private.team_invitations enable row level security;
revoke all on private.team_invitations from public,anon,authenticated,service_role;
create trigger record_audit after insert or update on private.team_invitations
 for each row execute function private.audit_change();

create function public.create_team_invitation(p_team_id uuid,p_email text,p_role public.team_role,p_token_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();team public.teams;recipient text:=lower(btrim(p_email));result uuid;begin
 select * into team from public.teams where id=p_team_id;
 perform 1 from public.workspaces where id=team.workspace_id for update;
 if not private.is_workspace_admin(team.workspace_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 if recipient is null or char_length(recipient)>254 or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or p_role is null or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
  raise exception 'Convite inválido. Confira o e-mail e o papel.' using errcode='22023';
 end if;
 if exists(select 1 from auth.users u where lower(u.email)=recipient and private.active_team_user(team.id,u.id)) then
  raise exception 'Esta pessoa já participa do time. Edite o acesso na lista de membros.' using errcode='22023';
 end if;
 if exists(select 1 from private.team_invitations where team_id=team.id and email=recipient and created_at>clock_timestamp()-interval '1 minute') then
  raise exception 'Aguarde um minuto antes de reenviar este convite.' using errcode='53300';
 end if;
 if (select count(*) from private.team_invitations where workspace_id=team.workspace_id and created_at>clock_timestamp()-interval '1 hour')>=50 then
  raise exception 'Limite de convites atingido. Aguarde uma hora.' using errcode='53300';
 end if;
 update private.team_invitations set revoked_at=clock_timestamp()
 where team_id=team.id and email=recipient and accepted_at is null and revoked_at is null;
 insert into private.team_invitations(workspace_id,team_id,email,role,token_hash,invited_by)
 values(team.workspace_id,team.id,recipient,p_role,p_token_hash,actor) returning id into result;
 return (select jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'expires_at',i.expires_at,
 'team_name',team.name,'workspace_name',w.name) from private.team_invitations i join public.workspaces w on w.id=i.workspace_id where i.id=result);
end $$;

create function public.list_team_access(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare workspace uuid;invitations jsonb;members jsonb;begin
 perform private.require_mfa();
 select workspace_id into workspace from public.teams where id=p_team_id;
 if not private.is_workspace_admin(workspace) then raise exception 'Acesso negado' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into invitations from(
  select id,email,role,created_at,expires_at,case when accepted_at is not null then 'accepted' when revoked_at is not null then 'revoked'
   when expires_at<=clock_timestamp() then 'expired' else 'pending' end as status
  from private.team_invitations where team_id=p_team_id order by created_at desc limit 100
 )x;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into members from(
  select p.id,p.display_name,tm.role as team_role,tm.is_active as team_active,wm.role as workspace_role,wm.is_active as workspace_active
  from public.team_members tm join public.workspace_members wm on wm.workspace_id=tm.workspace_id and wm.user_id=tm.user_id
  join public.profiles p on p.id=tm.user_id where tm.team_id=p_team_id order by tm.is_active desc,p.display_name
 )x;
 return jsonb_build_object('invitations',invitations,'members',members);
end $$;

create function public.revoke_team_invitation(p_invitation_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare invitation private.team_invitations;begin
 perform private.require_mfa();
 select * into invitation from private.team_invitations where id=p_invitation_id;
 perform 1 from public.workspaces where id=invitation.workspace_id for update;
 if not private.is_workspace_admin(invitation.workspace_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 update private.team_invitations set revoked_at=clock_timestamp() where id=invitation.id and accepted_at is null and revoked_at is null;
end $$;

create function public.preview_team_invitation(p_token text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();result jsonb;begin
 if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'Convite inválido ou expirado.' using errcode='22023';end if;
 select jsonb_build_object('team_name',t.name,'workspace_name',w.name,'role',i.role,'expires_at',i.expires_at) into result
 from private.team_invitations i join public.teams t on t.id=i.team_id join public.workspaces w on w.id=i.workspace_id
 join auth.users u on u.id=actor and lower(u.email)=i.email and u.email_confirmed_at is not null
 where i.token_hash=encode(sha256(p_token::bytea),'hex') and i.revoked_at is null and i.expires_at>clock_timestamp()
 and (i.accepted_at is null or i.accepted_by=actor)
 and exists(select 1 from public.workspace_members wm where wm.workspace_id=i.workspace_id and wm.user_id=i.invited_by and wm.role='admin' and wm.is_active);
 if result is null then raise exception 'Convite indisponível. Entre com o e-mail que recebeu o convite ou peça um novo link.' using errcode='22023';end if;
 return result;
end $$;

create function public.accept_team_invitation(p_token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();invitation private.team_invitations;general uuid;begin
 perform public.preview_team_invitation(p_token);
 select * into invitation from private.team_invitations where token_hash=encode(sha256(p_token::bytea),'hex');
 perform 1 from public.workspaces where id=invitation.workspace_id for update;
 select * into invitation from private.team_invitations where id=invitation.id for update;
 perform public.preview_team_invitation(p_token);
 if invitation.accepted_at is not null then return invitation.team_id;end if;
 if exists(select 1 from public.workspace_members where workspace_id=invitation.workspace_id and user_id=actor and not is_active)
 or exists(select 1 from public.team_members where team_id=invitation.team_id and user_id=actor and not is_active) then
  raise exception 'Seu acesso está suspenso. Peça ao administrador para reativá-lo.' using errcode='42501';
 end if;
 insert into public.workspace_members(workspace_id,user_id,role) values(invitation.workspace_id,actor,'member') on conflict do nothing;
 insert into public.team_members(workspace_id,team_id,user_id,role) values(invitation.workspace_id,invitation.team_id,actor,invitation.role) on conflict do nothing;
 insert into public.member_statuses(team_id,user_id) values(invitation.team_id,actor) on conflict do nothing;
 select id into general from public.channels where team_id=invitation.team_id and kind='public' and lower(name)='geral' and archived_at is null limit 1;
 if general is not null then perform public.join_public_channel(general);end if;
 update private.team_invitations set accepted_at=clock_timestamp(),accepted_by=actor where id=invitation.id;
 return invitation.team_id;
end $$;

create function public.manage_team_access(p_team_id uuid,p_user_id uuid,p_workspace_role public.workspace_role,p_team_role public.team_role,p_is_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare workspace uuid;begin
 perform private.require_mfa();
 select workspace_id into workspace from public.teams where id=p_team_id;
 perform 1 from public.workspaces where id=workspace for update;
 if not private.is_workspace_admin(workspace) then raise exception 'Acesso negado' using errcode='42501';end if;
 if not exists(select 1 from public.workspace_members where workspace_id=workspace and user_id=p_user_id and is_active)
 or not exists(select 1 from public.team_members where team_id=p_team_id and user_id=p_user_id) then
  raise exception 'Reative o acesso à organização antes de editar o time.' using errcode='22023';
 end if;
 perform public.set_team_member(p_team_id,p_user_id,p_team_role,p_is_active);
 perform public.set_workspace_member(workspace,p_user_id,p_workspace_role,true);
end $$;

do $$declare routine record;begin
 for routine in select p.proname,pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname=any(array['create_team_invitation','list_team_access','revoke_team_invitation','preview_team_invitation','accept_team_invitation','manage_team_access']) loop
 execute format('revoke all on function public.%I(%s) from public,anon,authenticated',routine.proname,routine.args);
 execute format('grant execute on function public.%I(%s) to authenticated',routine.proname,routine.args);
 end loop;
end $$;
commit;
