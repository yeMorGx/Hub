begin;

-- Lunch is a real pause, not elapsed time. A paused session keeps enough context
-- to resume the same task while completed time remains in normal time entries.
alter table public.time_entries
  add column carried_seconds bigint not null default 0 check (carried_seconds >= 0);

create table public.paused_timers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  team_id uuid not null,
  project_id uuid,
  task_id uuid,
  description text not null default '' check (char_length(description) <= 2000),
  accumulated_seconds bigint not null check (accumulated_seconds >= 0),
  paused_at timestamptz not null default clock_timestamp(),
  foreign key (team_id,user_id) references public.team_members(team_id,user_id) on delete cascade,
  foreign key (team_id,project_id) references public.projects(team_id,id),
  foreign key (team_id,task_id) references public.tasks(team_id,id)
);
alter table public.paused_timers enable row level security;
revoke all on public.paused_timers from public,anon,authenticated;
grant select on public.paused_timers to authenticated;
grant select,insert,update,delete on public.paused_timers to service_role;
create policy paused_timers_read on public.paused_timers for select to authenticated
using (user_id=(select auth.uid()) and private.can_access_team(team_id));

create function private.prevent_timer_while_paused() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.source='timer' and exists(select 1 from public.paused_timers where user_id=new.user_id) then
    raise exception 'Seu timer está pausado. Retome ou encerre antes de iniciar outro.' using errcode='23505';
  end if;
  return new;
end $$;
create trigger prevent_timer_while_paused before insert on public.time_entries
for each row execute function private.prevent_timer_while_paused();

create function private.clear_paused_timer_for_inactive_member() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if old.is_active and not new.is_active then
    delete from public.paused_timers where team_id=new.team_id and user_id=new.user_id;
  end if;
  return new;
end $$;
create trigger clear_paused_timer_for_inactive_member after update of is_active on public.team_members
for each row execute function private.clear_paused_timer_for_inactive_member();

create function private.clear_paused_timer_for_inactive_workspace_member() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if old.is_active and not new.is_active then
    delete from public.paused_timers p using public.teams t
    where p.team_id=t.id and t.workspace_id=new.workspace_id and p.user_id=new.user_id;
  end if;
  return new;
end $$;
create trigger clear_paused_timer_for_inactive_workspace_member after update of is_active on public.workspace_members
for each row execute function private.clear_paused_timer_for_inactive_workspace_member();

create function public.pause_timer() returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();entry public.time_entries;pause_time timestamptz;result uuid;
begin
  perform 1 from public.profiles where id=actor for update;
  select * into entry from public.time_entries where user_id=actor and ended_at is null for update;
  if not found or entry.source<>'timer' or not private.can_access_team(entry.team_id) then
    raise exception 'Não há timer ativo para pausar.' using errcode='22023';
  end if;
  pause_time:=clock_timestamp();
  insert into public.paused_timers(user_id,team_id,project_id,task_id,description,accumulated_seconds,paused_at)
  values(actor,entry.team_id,entry.project_id,entry.task_id,entry.description,
    coalesce(entry.carried_seconds,0)+greatest(0,floor(extract(epoch from pause_time-entry.started_at))::bigint),pause_time);
  update public.time_entries set ended_at=greatest(pause_time,started_at+interval '1 microsecond') where id=entry.id;
  result:=entry.id;
  return result;
end $$;

create function public.resume_timer() returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();paused public.paused_timers;result uuid;resume_time timestamptz;
begin
  perform 1 from public.profiles where id=actor for update;
  select * into paused from public.paused_timers where user_id=actor for update;
  if not found or not private.is_team_participant(paused.team_id) then
    raise exception 'Não há timer pausado neste time.' using errcode='22023';
  end if;
  resume_time:=clock_timestamp();
  delete from public.paused_timers where user_id=actor;
  insert into public.time_entries(team_id,user_id,project_id,task_id,description,source,started_at,carried_seconds)
  values(paused.team_id,actor,paused.project_id,paused.task_id,paused.description,'timer',resume_time,paused.accumulated_seconds)
  returning id into result;
  return result;
end $$;

create function public.stop_paused_timer() returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();
begin
  perform 1 from public.profiles where id=actor for update;
  delete from public.paused_timers where user_id=actor;
  if not found then raise exception 'Não há timer pausado para encerrar.' using errcode='22023'; end if;
end $$;

-- A versioned personal schedule keeps past balances stable when someone changes
-- their expected days or hours later in the year.
create table public.work_schedules (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  effective_from date not null,
  daily_minutes smallint not null check (daily_minutes between 0 and 1440),
  workdays_mask smallint not null check (workdays_mask between 0 and 127),
  timezone text not null default 'America/Sao_Paulo',
  setup_state text not null check (setup_state in ('complete','skipped')),
  updated_at timestamptz not null default now(),
  primary key (team_id,user_id,effective_from),
  foreign key (team_id,user_id) references public.team_members(team_id,user_id) on delete cascade,
  check (
    (setup_state='complete' and daily_minutes between 1 and 1440 and workdays_mask between 1 and 127)
    or (setup_state='skipped' and daily_minutes=0 and workdays_mask=0)
  ),
  check (char_length(timezone) between 1 and 80)
);
create index work_schedules_user_effective_idx on public.work_schedules(team_id,user_id,effective_from desc);
alter table public.work_schedules enable row level security;
revoke all on public.work_schedules from public,anon,authenticated;
grant select on public.work_schedules to authenticated;
grant select,insert,update,delete on public.work_schedules to service_role;
create policy work_schedules_read on public.work_schedules for select to authenticated
using (private.can_access_team(team_id) and (user_id=(select auth.uid()) or private.can_manage_team(team_id)));
create trigger set_updated_at before update on public.work_schedules
for each row execute function private.bump_updated_at();

-- Existing weekly targets become a weekday schedule at their current value.
insert into public.work_schedules(team_id,user_id,effective_from,daily_minutes,workdays_mask,timezone,setup_state)
select g.team_id,g.user_id,(clock_timestamp() at time zone 'America/Sao_Paulo')::date,
  case when g.weekly_minutes>0 then least(1440,ceil(g.weekly_minutes::numeric/5)::integer)::smallint else 0 end,
  case when g.weekly_minutes>0 then 31 else 0 end,
  'America/Sao_Paulo',case when g.weekly_minutes>0 then 'complete' else 'skipped' end
from public.time_goals g
on conflict(team_id,user_id,effective_from) do nothing;

create function public.save_work_schedule(
  p_team_id uuid,p_user_id uuid,p_daily_minutes integer,p_workdays_mask integer,
  p_timezone text default 'America/Sao_Paulo'
) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();local_date date;workday_count integer;weekly_minutes integer;
begin
  if not private.is_team_participant(p_team_id)
    or (actor<>p_user_id and not private.can_manage_team(p_team_id))
    or not private.active_team_user(p_team_id,p_user_id) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  if p_daily_minutes is null or p_daily_minutes not between 15 and 1440
    or p_workdays_mask is null or p_workdays_mask not between 1 and 127 then
    raise exception 'Escolha horas por dia e pelo menos um dia de trabalho.' using errcode='22023';
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then
    raise exception 'Fuso horário inválido.' using errcode='22023';
  end if;
  select count(*)::integer into workday_count
  from generate_series(0,6) as day(n)
  where (p_workdays_mask & (1 << n))<>0;
  weekly_minutes:=p_daily_minutes*workday_count;
  if weekly_minutes>10080 then raise exception 'A jornada semanal não pode passar de 168 horas.' using errcode='22023'; end if;
  local_date:=(clock_timestamp() at time zone p_timezone)::date;
  insert into public.work_schedules(team_id,user_id,effective_from,daily_minutes,workdays_mask,timezone,setup_state)
  values(p_team_id,p_user_id,local_date,p_daily_minutes,p_workdays_mask,p_timezone,'complete')
  on conflict(team_id,user_id,effective_from) do update set daily_minutes=excluded.daily_minutes,
    workdays_mask=excluded.workdays_mask,timezone=excluded.timezone,setup_state='complete';
  insert into public.time_goals(team_id,user_id,weekly_minutes,forgotten_after_minutes)
  values(p_team_id,p_user_id,weekly_minutes,480)
  on conflict(team_id,user_id) do update set weekly_minutes=excluded.weekly_minutes,updated_at=clock_timestamp();
end $$;

create function public.skip_work_schedule_setup(p_team_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();local_date date;
begin
  if not private.is_team_participant(p_team_id) or not private.active_team_user(p_team_id,actor) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  local_date:=(clock_timestamp() at time zone 'America/Sao_Paulo')::date;
  insert into public.work_schedules(team_id,user_id,effective_from,daily_minutes,workdays_mask,timezone,setup_state)
  values(p_team_id,actor,local_date,0,0,'America/Sao_Paulo','skipped')
  on conflict(team_id,user_id,effective_from) do update set daily_minutes=0,workdays_mask=0,
    timezone=excluded.timezone,setup_state='skipped';
  insert into public.time_goals(team_id,user_id,weekly_minutes,forgotten_after_minutes)
  values(p_team_id,actor,0,480)
  on conflict(team_id,user_id) do update set weekly_minutes=0,updated_at=clock_timestamp();
end $$;

create function public.get_work_hour_balance(p_team_id uuid,p_from date,p_to date)
returns table(work_date date,expected_minutes integer,actual_seconds bigint)
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();
begin
  if not private.can_access_team(p_team_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then
    raise exception 'Intervalo inválido. Selecione até um ano.' using errcode='22023';
  end if;
  return query
  with days as (
    select (p_from+series.n)::date as day
    from generate_series(0,p_to-p_from) as series(n)
  ), assigned as (
    select d.day,s.daily_minutes,s.workdays_mask,s.timezone,s.setup_state
    from days d
    left join lateral (
      select ws.daily_minutes,ws.workdays_mask,ws.timezone,ws.setup_state
      from public.work_schedules ws
      where ws.team_id=p_team_id and ws.user_id=actor and ws.effective_from<=d.day
      order by ws.effective_from desc limit 1
    ) s on true
  )
  select a.day,
    case when a.setup_state='complete'
      and extract(isodow from a.day)::integer between 1 and 7
      and (coalesce(a.workdays_mask,0) & (1 << (extract(isodow from a.day)::integer-1)))<>0
      and not exists(select 1 from public.home_office_holidays h where h.team_id=p_team_id and h.holiday_date=a.day)
      and not exists(select 1 from public.absences absence where absence.team_id=p_team_id and absence.user_id=actor
        and absence.status='approved' and a.day between absence.starts_on and absence.ends_on)
      then a.daily_minutes::integer else 0 end,
    coalesce((
      select sum(greatest(0,floor(extract(epoch from (
        least(coalesce(entry.ended_at,clock_timestamp()),(a.day+1)::timestamp at time zone coalesce(a.timezone,'America/Sao_Paulo'))
        - greatest(entry.started_at,a.day::timestamp at time zone coalesce(a.timezone,'America/Sao_Paulo'))
      )))::bigint))
      from public.time_entries entry
      where entry.team_id=p_team_id and entry.user_id=actor
        and entry.started_at<(a.day+1)::timestamp at time zone coalesce(a.timezone,'America/Sao_Paulo')
        and coalesce(entry.ended_at,clock_timestamp())>a.day::timestamp at time zone coalesce(a.timezone,'America/Sao_Paulo')
    ),0)::bigint
  from assigned a order by a.day;
end $$;

-- Keep the existing manager-facing weekly goal RPC aligned with the personal
-- schedule so older clients do not create conflicting targets.
create or replace function public.set_time_goal(
  p_team_id uuid,p_user_id uuid,p_weekly_minutes integer,p_forgotten_after_minutes integer default 480
) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();local_date date;timezone_name text:='America/Sao_Paulo';workdays_mask integer:=31;workday_count integer:=5;daily_minutes integer;setup_state text;
begin
  if not private.is_team_participant(p_team_id)
    or (actor<>p_user_id and not private.can_manage_team(p_team_id))
    or not private.active_team_user(p_team_id,p_user_id) then
    raise exception 'Acesso negado' using errcode='42501';
  end if;
  if p_weekly_minutes is null or p_weekly_minutes not between 0 and 10080
    or p_forgotten_after_minutes is null or p_forgotten_after_minutes not between 30 and 1440 then
    raise exception 'Meta ou limite do timer inválido.' using errcode='22023';
  end if;
  select ws.workdays_mask,ws.timezone into workdays_mask,timezone_name
  from public.work_schedules ws where ws.team_id=p_team_id and ws.user_id=p_user_id
    and ws.effective_from<=(clock_timestamp() at time zone ws.timezone)::date
  order by ws.effective_from desc limit 1;
  if workdays_mask is null or workdays_mask=0 then workdays_mask:=31;end if;
  if timezone_name is null then timezone_name:='America/Sao_Paulo';end if;
  select count(*)::integer into workday_count from generate_series(0,6) as day(n)
  where (workdays_mask & (1 << n))<>0;
  if workday_count=0 then workdays_mask:=31;workday_count:=5;end if;
  daily_minutes:=case when p_weekly_minutes=0 then 0 else least(1440,ceil(p_weekly_minutes::numeric/workday_count)::integer) end;
  setup_state:=case when p_weekly_minutes=0 then 'skipped' else 'complete' end;
  local_date:=(clock_timestamp() at time zone timezone_name)::date;
  insert into public.work_schedules(team_id,user_id,effective_from,daily_minutes,workdays_mask,timezone,setup_state)
  values(p_team_id,p_user_id,local_date,daily_minutes,case when p_weekly_minutes=0 then 0 else workdays_mask end,timezone_name,setup_state)
  on conflict(team_id,user_id,effective_from) do update set daily_minutes=excluded.daily_minutes,
    workdays_mask=excluded.workdays_mask,timezone=excluded.timezone,setup_state=excluded.setup_state;
  insert into public.time_goals(team_id,user_id,weekly_minutes,forgotten_after_minutes)
  values(p_team_id,p_user_id,p_weekly_minutes,p_forgotten_after_minutes)
  on conflict(team_id,user_id) do update set weekly_minutes=excluded.weekly_minutes,
    forgotten_after_minutes=excluded.forgotten_after_minutes,updated_at=clock_timestamp();
end $$;

revoke all on function public.save_work_schedule(uuid,uuid,integer,integer,text) from public,anon;
revoke all on function public.skip_work_schedule_setup(uuid) from public,anon;
revoke all on function public.get_work_hour_balance(uuid,date,date) from public,anon;
grant execute on function public.save_work_schedule(uuid,uuid,integer,integer,text) to authenticated;
grant execute on function public.skip_work_schedule_setup(uuid) to authenticated;
grant execute on function public.get_work_hour_balance(uuid,date,date) to authenticated;
revoke all on function public.pause_timer() from public,anon;
revoke all on function public.resume_timer() from public,anon;
revoke all on function public.stop_paused_timer() from public,anon;
grant execute on function public.pause_timer() to authenticated;
grant execute on function public.resume_timer() to authenticated;
grant execute on function public.stop_paused_timer() to authenticated;

commit;
