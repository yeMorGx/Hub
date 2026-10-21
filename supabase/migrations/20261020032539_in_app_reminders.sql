begin;
create function public.refresh_my_reminders(p_team_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();begin
 if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 insert into public.notifications(user_id,team_id,event_id,kind,dedupe_key)
 select actor,p_team_id,e.id,'meeting','meeting:'||e.id::text||':'||e.starts_at::text||':15m' from public.events e
 where e.team_id=p_team_id and e.cancelled_at is null and e.starts_at between clock_timestamp() and clock_timestamp()+interval '15 minutes'
 and(e.created_by=actor or exists(select 1 from public.event_attendees a where a.event_id=e.id and a.user_id=actor and a.response<>'declined'))
 on conflict(user_id,dedupe_key) do nothing;
 insert into public.notifications(user_id,team_id,kind,dedupe_key)
 select actor,p_team_id,'timer','timer:'||e.id::text||':forgotten' from public.time_entries e left join public.time_goals g on g.team_id=e.team_id and g.user_id=e.user_id
 where e.team_id=p_team_id and e.user_id=actor and e.ended_at is null and e.started_at<clock_timestamp()-make_interval(mins=>coalesce(g.forgotten_after_minutes,480))
 on conflict(user_id,dedupe_key) do nothing;
end $$;
revoke all on function public.refresh_my_reminders(uuid) from public,anon,authenticated;
grant execute on function public.refresh_my_reminders(uuid) to authenticated;
commit;
