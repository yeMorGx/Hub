begin;
create table public.audit_events (
 id bigint generated always as identity primary key,workspace_id uuid not null references public.workspaces(id),team_id uuid references public.teams(id),
 actor_id uuid,action text not null,entity_table text not null,entity_id text not null,changes jsonb not null default '{}',occurred_at timestamptz not null default clock_timestamp()
);
create index audit_workspace_idx on public.audit_events(workspace_id,occurred_at desc);
create index audit_team_idx on public.audit_events(team_id);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from public,anon,authenticated;
grant select on public.audit_events to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;
create policy audit_read on public.audit_events for select to authenticated using(private.is_workspace_admin(workspace_id));
create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare payload jsonb;previous jsonb;team uuid;workspace uuid;metadata jsonb;before_metadata jsonb;entity text;begin
 payload:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 previous:=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 team:=(payload->>'team_id')::uuid;workspace:=(payload->>'workspace_id')::uuid;
 if tg_table_name='workspaces' then workspace:=(payload->>'id')::uuid;elsif tg_table_name='teams' then team:=(payload->>'id')::uuid;end if;
 if workspace is null and team is not null then select workspace_id into workspace from public.teams where id=team;end if;
 if workspace is null then return coalesce(new,old);end if;
 select coalesce(jsonb_object_agg(key,value),'{}') into metadata from jsonb_each(payload) where key=any(array['status','role','is_active','project_id','client_id','user_id','assignee_id','starts_at','ends_at','starts_on','ends_on','archived_at','cancelled_at','deleted_at','version','source','webhook_id','author_id','created_by','provider']);
 select coalesce(jsonb_object_agg(key,value),'{}') into before_metadata from jsonb_each(previous) where key=any(array['status','role','is_active','project_id','client_id','user_id','assignee_id','starts_at','ends_at','starts_on','ends_on','archived_at','cancelled_at','deleted_at','version','source','webhook_id','author_id','created_by','provider']);
 entity:=coalesce(payload->>'id',payload->>'event_id',payload->>'message_id',payload->>'channel_id',payload->>'user_id','unknown');
 insert into public.audit_events(workspace_id,team_id,actor_id,action,entity_table,entity_id,changes) values(workspace,team,auth.uid(),tg_op,tg_table_name,entity,jsonb_build_object('before',before_metadata,'after',metadata,'fields',(select coalesce(jsonb_agg(key),'[]') from jsonb_each(payload) where previous->key is distinct from value and key<>'updated_at')));
 return coalesce(new,old);
end $$;
revoke all on function private.audit_change() from public,anon,authenticated;
do $$declare tbl text;begin foreach tbl in array array['workspaces','workspace_members','teams','team_members','projects','clients','channels','channel_members','messages','time_entries','events','event_attendees','tasks','team_notes','standups','meeting_documents','shifts','shift_swaps','absences','team_dates','time_goals'] loop
 execute format('create trigger record_audit after insert or update or delete on public.%I for each row execute function private.audit_change()',tbl);end loop;end $$;

create table public.incoming_webhooks (
 id uuid primary key default gen_random_uuid(),team_id uuid not null,channel_id uuid not null,created_by uuid not null references public.profiles(id),
 name text not null check(char_length(btrim(name)) between 1 and 100),token_hash bytea not null,enabled boolean not null default true,last_called_at timestamptz,created_at timestamptz not null default now(),
 foreign key(team_id,channel_id) references public.channels(team_id,id)
);
create index webhooks_channel_idx on public.incoming_webhooks(team_id,channel_id);
create index webhooks_creator_idx on public.incoming_webhooks(created_by);
alter table public.incoming_webhooks enable row level security;
revoke all on public.incoming_webhooks from public,anon,authenticated;
grant select(id,team_id,channel_id,created_by,name,enabled,last_called_at,created_at) on public.incoming_webhooks to authenticated;
create policy webhooks_read on public.incoming_webhooks for select to authenticated using(private.can_access_channel(channel_id) and private.can_moderate_channel(channel_id));
alter table public.messages add column source text not null default 'user' check(source in ('user','webhook','command'));
alter table public.messages add column webhook_id uuid references public.incoming_webhooks(id);
create index messages_webhook_idx on public.messages(webhook_id);
create function public.create_incoming_webhook(p_channel_id uuid,p_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();channel public.channels;secret text;result uuid;begin
 select * into channel from public.channels where id=p_channel_id;
 if not found or not private.can_access_channel(p_channel_id) or not private.can_moderate_channel(p_channel_id) or channel.kind='dm' or channel.archived_at is not null then raise exception 'Acesso negado' using errcode='42501';end if;
 secret:=encode(sha256((gen_random_uuid()::text||gen_random_uuid()::text||gen_random_uuid()::text)::bytea),'hex');
 insert into public.incoming_webhooks(team_id,channel_id,created_by,name,token_hash) values(channel.team_id,channel.id,actor,btrim(p_name),sha256(secret::bytea)) returning id into result;
 return jsonb_build_object('id',result,'token',secret);
end $$;
create function public.set_incoming_webhook(p_webhook_id uuid,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare item public.incoming_webhooks;begin
 perform private.require_mfa();select * into item from public.incoming_webhooks where id=p_webhook_id;
 if not found or not private.can_access_channel(item.channel_id) or not private.can_moderate_channel(item.channel_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 update public.incoming_webhooks set enabled=p_enabled where id=item.id;
end $$;
create function public.accept_incoming_webhook(p_webhook_id uuid,p_token text,p_body text,p_event_id text) returns uuid
language plpgsql security definer set search_path='' as $$
declare hook public.incoming_webhooks;channel public.channels;result uuid;client uuid;ordinal bigint;begin
 if p_token is null or char_length(p_token)<>64 or p_body is null or char_length(btrim(p_body)) not between 1 and 10000 or p_event_id is null or char_length(p_event_id) not between 1 and 200 then raise exception 'Webhook inválido' using errcode='22023';end if;
 select * into hook from public.incoming_webhooks where id=p_webhook_id for update;
 if not found or not hook.enabled or hook.token_hash<>sha256(p_token::bytea) or not private.active_team_user(hook.team_id,hook.created_by) or not exists(select 1 from public.channel_members where channel_id=hook.channel_id and user_id=hook.created_by) then raise exception 'Webhook inválido' using errcode='42501';end if;
 select * into channel from public.channels where id=hook.channel_id for update;
 if channel.archived_at is not null then raise exception 'Canal indisponível' using errcode='42501';end if;
 client:=substr(encode(sha256((hook.id::text||':'||p_event_id)::bytea),'hex'),1,32)::uuid;
 select id into result from public.messages where channel_id=hook.channel_id and author_id=hook.created_by and client_id=client;if found then return result;end if;
 if hook.last_called_at>clock_timestamp()-interval '1 second' then raise exception 'Limite do webhook atingido' using errcode='53300';end if;
 update public.channels set last_message_ordinal=last_message_ordinal+1 where id=channel.id returning last_message_ordinal into ordinal;
 insert into public.messages(team_id,channel_id,author_id,client_id,ordinal,body,source,webhook_id) values(hook.team_id,hook.channel_id,hook.created_by,client,ordinal,p_body,'webhook',hook.id) returning id into result;
 update public.incoming_webhooks set last_called_at=clock_timestamp() where id=hook.id;return result;
end $$;
revoke all on function public.create_incoming_webhook(uuid,text),public.set_incoming_webhook(uuid,boolean),public.accept_incoming_webhook(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.create_incoming_webhook(uuid,text),public.set_incoming_webhook(uuid,boolean) to authenticated;
grant execute on function public.accept_incoming_webhook(uuid,text,text,text) to service_role;

create table public.calendar_connections (
 id uuid primary key default gen_random_uuid(),team_id uuid not null,user_id uuid not null,
 provider text not null check(provider in ('google','outlook')),calendar_id text not null check(char_length(calendar_id) between 1 and 1000),
 last_synced_at timestamptz,created_at timestamptz not null default now(),unique(team_id,user_id,provider),unique(team_id,id),
 foreign key(team_id,user_id) references public.team_members(team_id,user_id)
);
create index calendar_connections_user_idx on public.calendar_connections(user_id);
create table private.calendar_credentials (
 connection_id uuid primary key references public.calendar_connections(id) on delete cascade,ciphertext text not null check(char_length(ciphertext) between 20 and 20000)
);
alter table private.calendar_credentials enable row level security;
revoke all on private.calendar_credentials from public,anon,authenticated;
grant all on private.calendar_credentials to service_role;
create table public.calendar_event_links (
 connection_id uuid not null references public.calendar_connections(id) on delete cascade,
 team_id uuid not null,event_id uuid not null,external_id text not null check(char_length(external_id) between 1 and 1000),
 external_updated_at text,hub_updated_at timestamptz,synced_at timestamptz not null default now(),
 primary key(connection_id,event_id),unique(connection_id,external_id),foreign key(team_id,event_id) references public.events(team_id,id)
);
create index calendar_links_event_idx on public.calendar_event_links(team_id,event_id);
alter table public.calendar_connections enable row level security;
alter table public.calendar_event_links enable row level security;
revoke all on public.calendar_connections,public.calendar_event_links from public,anon,authenticated;
grant select on public.calendar_connections,public.calendar_event_links to authenticated;
create policy calendar_connections_read on public.calendar_connections for select to authenticated using(private.is_team_participant(team_id) and user_id=(select auth.uid()));
create policy calendar_links_read on public.calendar_event_links for select to authenticated using(private.is_team_participant(team_id) and exists(select 1 from public.calendar_connections c where c.id=connection_id and c.user_id=(select auth.uid())));
create function public.save_calendar_connection(p_team_id uuid,p_provider text,p_calendar_id text,p_ciphertext text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();result uuid;begin
 if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 insert into public.calendar_connections(team_id,user_id,provider,calendar_id) values(p_team_id,actor,p_provider,p_calendar_id)
 on conflict(team_id,user_id,provider) do update set calendar_id=excluded.calendar_id returning id into result;
 insert into private.calendar_credentials(connection_id,ciphertext) values(result,p_ciphertext) on conflict(connection_id) do update set ciphertext=excluded.ciphertext;return result;
end $$;
create function public.calendar_connection_secret(p_connection_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();result text;begin
 if not exists(select 1 from public.calendar_connections where id=p_connection_id and user_id=actor and private.is_team_participant(team_id)) then raise exception 'Acesso negado' using errcode='42501';end if;
 select ciphertext into result from private.calendar_credentials where connection_id=p_connection_id;return result;
end $$;
create function public.save_calendar_event_link(p_connection_id uuid,p_event_id uuid,p_external_id text,p_external_updated_at text,p_hub_updated_at timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();connection public.calendar_connections;begin
 select * into connection from public.calendar_connections where id=p_connection_id and user_id=actor;
 if not found or not private.is_team_participant(connection.team_id) or not exists(select 1 from public.events where id=p_event_id and team_id=connection.team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 insert into public.calendar_event_links(connection_id,team_id,event_id,external_id,external_updated_at,hub_updated_at) values(connection.id,connection.team_id,p_event_id,p_external_id,p_external_updated_at,p_hub_updated_at)
 on conflict(connection_id,event_id) do update set external_id=excluded.external_id,external_updated_at=excluded.external_updated_at,hub_updated_at=excluded.hub_updated_at,synced_at=clock_timestamp();
 update public.calendar_connections set last_synced_at=clock_timestamp() where id=connection.id;
end $$;
create function public.disconnect_calendar(p_connection_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();begin
 delete from public.calendar_connections where id=p_connection_id and user_id=actor and private.is_team_participant(team_id);
end $$;
do $$declare routine record;begin
 for routine in select p.proname,pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['save_calendar_connection','calendar_connection_secret','save_calendar_event_link','disconnect_calendar']) loop
 execute format('revoke all on function public.%I(%s) from public,anon,authenticated',routine.proname,routine.args);execute format('grant execute on function public.%I(%s) to authenticated',routine.proname,routine.args);end loop;
end $$;
create trigger record_audit after insert or update or delete on public.incoming_webhooks for each row execute function private.audit_change();
create trigger record_audit after insert or update or delete on public.calendar_connections for each row execute function private.audit_change();
create function public.run_channel_command(p_channel_id uuid,p_client_id uuid,p_action text,p_description text default '',p_starts_at timestamptz default null,p_ends_at timestamptz default null,p_timezone text default 'UTC') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();channel public.channels;existing uuid;entry uuid;reply text;result uuid;begin
 perform 1 from public.profiles where id=actor for update;
 select * into channel from public.channels where id=p_channel_id for update;
 if not private.can_access_channel(p_channel_id) or channel.archived_at is not null then raise exception 'Acesso negado' using errcode='42501';end if;
 select id into existing from public.messages where channel_id=p_channel_id and author_id=actor and client_id=p_client_id;if found then return existing;end if;
 if p_action='start_timer' then
  perform public.start_timer(channel.team_id,null,coalesce(nullif(btrim(p_description),''),'Trabalho com o time'));
  reply:='Timer iniciado. Use /hora parar para encerrar.';
 elsif p_action='stop_timer' then
  select id into entry from public.time_entries where user_id=actor and ended_at is null;
  if entry is null then raise exception 'Nenhum timer ativo' using errcode='22023';end if;
  perform public.stop_timer(entry);reply:='Timer encerrado. Horas salvas no seu histórico.';
 elsif p_action='create_meeting' then
  if p_starts_at is null or p_starts_at<clock_timestamp() then raise exception 'Horário inválido. Escolha uma reunião futura.' using errcode='22023';end if;
  perform public.save_event(channel.team_id,coalesce(nullif(btrim(p_description),''),'Reunião do time'),p_starts_at,p_ends_at,'meeting','Criada por comando no chat.',null,p_timezone);
  reply:='Reunião criada no calendário do time.';
 else raise exception 'Comando inválido' using errcode='22023';end if;
 result:=public.send_message(channel.id,p_client_id,reply);update public.messages set source='command' where id=result;return result;
end $$;
revoke all on function public.run_channel_command(uuid,uuid,text,text,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.run_channel_command(uuid,uuid,text,text,timestamptz,timestamptz,text) to authenticated;
commit;
