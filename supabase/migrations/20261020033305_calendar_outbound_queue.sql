begin;
create function private.queue_calendar_event() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into private.calendar_jobs(connection_id)
 select c.id from public.calendar_connections c where c.team_id=new.team_id and private.active_team_user(c.team_id,c.user_id)
 on conflict(connection_id) do update set requested_at=clock_timestamp(),next_attempt_at=clock_timestamp(),attempts=0;
 return new;
end $$;
revoke all on function private.queue_calendar_event() from public,anon,authenticated;
create trigger queue_calendar_changes after insert or update on public.events for each row execute function private.queue_calendar_event();
commit;
