begin;
create or replace function public.refresh_my_reminders(p_team_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();begin
 if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 insert into public.notifications(user_id,team_id,event_id,kind,dedupe_key)
 select actor,p_team_id,e.id,'meeting','meeting:'||e.id::text||':'||floor(extract(epoch from e.starts_at))::bigint::text||':15m' from public.events e
 where e.team_id=p_team_id and e.cancelled_at is null and e.starts_at between clock_timestamp() and clock_timestamp()+interval '15 minutes'
 and(e.created_by=actor or exists(select 1 from public.event_attendees a where a.event_id=e.id and a.user_id=actor and a.response<>'declined'))
 on conflict(user_id,dedupe_key) do nothing;
 insert into public.notifications(user_id,team_id,kind,dedupe_key)
 select actor,p_team_id,'timer','timer:'||e.id::text||':forgotten' from public.time_entries e left join public.time_goals g on g.team_id=e.team_id and g.user_id=e.user_id
 where e.team_id=p_team_id and e.user_id=actor and e.ended_at is null and e.started_at<clock_timestamp()-make_interval(mins=>coalesce(g.forgotten_after_minutes,480))
 on conflict(user_id,dedupe_key) do nothing;
end $$;

create or replace function public.apply_calendar_event(p_connection_id uuid,p_title text,p_starts_at timestamptz,p_ends_at timestamptz,p_description text default '',p_event_id uuid default null,p_expected_updated_at timestamptz default null,p_cancelled boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();connection public.calendar_connections;event public.events;result uuid;begin
 select * into connection from public.calendar_connections where id=p_connection_id and user_id=actor;
 if not found or not private.is_team_participant(connection.team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_event_id is not null then
 select * into event from public.events where id=p_event_id and team_id=connection.team_id for update;
 if not found or not private.can_manage_event(event.id) then raise exception 'Acesso negado' using errcode='42501';end if;
 if event.updated_at is distinct from p_expected_updated_at then raise exception 'O evento mudou durante a sincronização.' using errcode='40001';end if;
 if p_cancelled then perform public.cancel_event(event.id);return event.id;end if;
 if event.cancelled_at is not null then update public.events set cancelled_at=null where id=event.id;end if;
 end if;
 result:=public.save_event(connection.team_id,p_title,p_starts_at,p_ends_at,coalesce(event.kind,'event'),p_description,event.call_url,coalesce(event.timezone,'UTC'),p_event_id);return result;
end $$;
commit;
