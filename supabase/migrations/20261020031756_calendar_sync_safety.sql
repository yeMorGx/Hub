begin;
alter table public.calendar_connections add column sync_token uuid;
alter table public.calendar_connections add column sync_locked_until timestamptz;
create or replace function public.save_calendar_connection(p_team_id uuid,p_provider text,p_calendar_id text,p_ciphertext text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();result uuid;previous_calendar text;begin
 if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 perform 1 from public.profiles where id=actor for update;
 select id,calendar_id into result,previous_calendar from public.calendar_connections where team_id=p_team_id and user_id=actor and provider=p_provider for update;
 if result is null then insert into public.calendar_connections(team_id,user_id,provider,calendar_id) values(p_team_id,actor,p_provider,p_calendar_id) returning id into result;
 else if previous_calendar<>p_calendar_id then delete from public.calendar_event_links where connection_id=result;end if;update public.calendar_connections set calendar_id=p_calendar_id where id=result;end if;
 insert into private.calendar_credentials(connection_id,ciphertext) values(result,p_ciphertext) on conflict(connection_id) do update set ciphertext=excluded.ciphertext;return result;
end $$;
create function public.claim_calendar_sync(p_connection_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();token uuid:=gen_random_uuid();begin
 update public.calendar_connections set sync_token=token,sync_locked_until=clock_timestamp()+interval '5 minutes'
 where id=p_connection_id and user_id=actor and private.is_team_participant(team_id) and(sync_locked_until is null or sync_locked_until<clock_timestamp());
 if not found then raise exception 'Sincronização em andamento ou conexão indisponível.' using errcode='55000';end if;return token;
end $$;
create function public.release_calendar_sync(p_connection_id uuid,p_token uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();begin
 update public.calendar_connections set sync_token=null,sync_locked_until=null where id=p_connection_id and user_id=actor and sync_token=p_token;
end $$;
create function public.apply_calendar_event(p_connection_id uuid,p_title text,p_starts_at timestamptz,p_ends_at timestamptz,p_description text default '',p_event_id uuid default null,p_expected_updated_at timestamptz default null,p_cancelled boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();connection public.calendar_connections;event public.events;result uuid;begin
 select * into connection from public.calendar_connections where id=p_connection_id and user_id=actor;
 if not found or not private.is_team_participant(connection.team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_event_id is not null then
 select * into event from public.events where id=p_event_id and team_id=connection.team_id for update;
 if not found or not private.can_manage_event(event.id) then raise exception 'Acesso negado' using errcode='42501';end if;
 if event.updated_at is distinct from p_expected_updated_at then raise exception 'O evento mudou durante a sincronização.' using errcode='40001';end if;
 if p_cancelled then perform public.cancel_event(event.id);return event.id;end if;
 end if;
 result:=public.save_event(connection.team_id,p_title,p_starts_at,p_ends_at,coalesce(event.kind,'event'),p_description,event.call_url,coalesce(event.timezone,'UTC'),p_event_id);return result;
end $$;
revoke all on function public.claim_calendar_sync(uuid),public.release_calendar_sync(uuid,uuid),public.apply_calendar_event(uuid,text,timestamptz,timestamptz,text,uuid,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.claim_calendar_sync(uuid),public.release_calendar_sync(uuid,uuid),public.apply_calendar_event(uuid,text,timestamptz,timestamptz,text,uuid,timestamptz,boolean) to authenticated;
commit;
