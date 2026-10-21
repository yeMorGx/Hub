begin;

create table public.home_office_schedules (
  team_id uuid primary key references public.teams(id) on delete cascade,
  anchor_week date not null check (extract(dow from anchor_week) = 0),
  timezone text not null default 'America/Sao_Paulo',
  reminder_time time not null default '08:30',
  enabled boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(timezone) between 1 and 80)
);

create table public.home_office_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  anchor_weekday smallint not null check (anchor_weekday between 0 and 4),
  primary key (team_id, user_id),
  unique (team_id, anchor_weekday),
  foreign key (team_id, user_id) references public.team_members(team_id, user_id) on delete cascade
);

create table public.home_office_holidays (
  team_id uuid not null references public.teams(id) on delete cascade,
  holiday_date date not null,
  label text not null default 'Feriado' check (char_length(btrim(label)) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (team_id, holiday_date)
);

create table public.home_office_swaps (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  week_start date not null check (extract(dow from week_start) = 0),
  requested_by uuid not null,
  target_user_id uuid not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, requested_by) references public.team_members(team_id, user_id),
  foreign key (team_id, target_user_id) references public.team_members(team_id, user_id),
  check (requested_by <> target_user_id)
);
create index home_office_swaps_team_week_idx on public.home_office_swaps(team_id, week_start, status);
create index home_office_swaps_recipient_idx on public.home_office_swaps(target_user_id, created_at desc) where status='pending';

alter table public.home_office_schedules enable row level security;
alter table public.home_office_members enable row level security;
alter table public.home_office_holidays enable row level security;
alter table public.home_office_swaps enable row level security;
revoke all on public.home_office_schedules,public.home_office_members,public.home_office_holidays,public.home_office_swaps from public,anon,authenticated;
grant select on public.home_office_schedules,public.home_office_members,public.home_office_holidays,public.home_office_swaps to authenticated;
grant select,insert,update,delete on public.home_office_schedules,public.home_office_members,public.home_office_holidays,public.home_office_swaps to service_role;

create policy home_office_schedules_read on public.home_office_schedules for select to authenticated
using (private.can_access_team(team_id));
create policy home_office_members_read on public.home_office_members for select to authenticated
using (private.can_access_team(team_id));
create policy home_office_holidays_read on public.home_office_holidays for select to authenticated
using (private.can_access_team(team_id));
create policy home_office_swaps_read on public.home_office_swaps for select to authenticated
using (private.can_access_team(team_id) and (status='accepted' or requested_by=(select auth.uid()) or target_user_id=(select auth.uid())));

create trigger set_updated_at before update on public.home_office_schedules
for each row execute function private.bump_updated_at();
create trigger set_updated_at before update on public.home_office_swaps
for each row execute function private.bump_updated_at();

create function private.home_office_week_skipped(p_team_id uuid,p_week_start date) returns boolean
language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.home_office_holidays h
    where h.team_id=p_team_id and h.holiday_date between p_week_start and p_week_start+6
  );
$$;

-- The rotation advances only on active weeks. A week containing a holiday is
-- omitted, and therefore does not consume the next weekday in the sequence.
create function private.home_office_rotation(p_team_id uuid,p_week_start date)
returns table(user_id uuid,weekday smallint)
language sql stable security definer set search_path='' as $$
  with schedule as (
    select s.anchor_week,s.enabled
    from public.home_office_schedules s
    where s.team_id=p_team_id
  ),
  offset_weeks as (
    select count(*)::integer as active_weeks
    from schedule s
    cross join lateral generate_series(0,((p_week_start-s.anchor_week)/7)-1) as weeks(n)
    where p_week_start>=s.anchor_week
      and not exists (
        select 1 from public.home_office_holidays h
        where h.team_id=p_team_id
          and h.holiday_date between s.anchor_week+(n*7) and s.anchor_week+(n*7)+6
      )
  )
  select m.user_id,mod(m.anchor_weekday::integer+o.active_weeks,5)::smallint
  from schedule s
  cross join offset_weeks o
  join public.home_office_members m on m.team_id=p_team_id
  where s.enabled
    and p_week_start>=s.anchor_week
    and extract(dow from p_week_start)=0
    and not private.home_office_week_skipped(p_team_id,p_week_start)
    and private.active_team_user(p_team_id,m.user_id);
$$;

-- An accepted swap exchanges the two users' assigned weekdays. Reuse this
-- mapping for the calendar and both reminder paths so they stay in sync.
create function private.home_office_assignments(p_team_id uuid,p_week_start date)
returns table(user_id uuid,weekday smallint)
language sql stable security definer set search_path='' as $$
  select coalesce(
    case when swap.requested_by=rotation.user_id then swap.target_user_id
         when swap.target_user_id=rotation.user_id then swap.requested_by end,
    rotation.user_id
  ),rotation.weekday
  from private.home_office_rotation(p_team_id,p_week_start) rotation
  left join lateral (
    select s.requested_by,s.target_user_id
    from public.home_office_swaps s
    where s.team_id=p_team_id and s.week_start=p_week_start and s.status='accepted'
      and (s.requested_by=rotation.user_id or s.target_user_id=rotation.user_id)
    order by s.created_at desc
    limit 1
  ) swap on true;
$$;

create function public.get_home_office_calendar(p_team_id uuid,p_starts_on date,p_ends_on date)
returns table(team_id uuid,user_id uuid,scheduled_on date,week_start date,display_name text,avatar_url text,entry_kind text,entry_label text)
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_mfa();
  if not private.can_access_team(p_team_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_starts_on is null or p_ends_on is null or p_ends_on<p_starts_on or p_ends_on-p_starts_on>366 then
    raise exception 'Período inválido' using errcode='22023';
  end if;
  return query
  with workdays as (
    select (p_starts_on+days.n)::date as day
    from generate_series(0,p_ends_on-p_starts_on) as days(n)
    where extract(isodow from (p_starts_on+days.n)::date) between 1 and 5
  ), assignments as (
    select d.day,d.day-extract(dow from d.day)::integer as week_start,r.user_id as effective_user
    from workdays d
    cross join lateral private.home_office_assignments(p_team_id,d.day-extract(dow from d.day)::integer) r
    where r.weekday=extract(isodow from d.day)::integer-1
  ), calendar_weeks as (
    select (p_starts_on-extract(dow from p_starts_on)::integer+(weeks.n*7))::date as week_start
    from generate_series(0,((p_ends_on-extract(dow from p_ends_on)::integer)-(p_starts_on-extract(dow from p_starts_on)::integer))/7) as weeks(n)
  ), holiday_weeks as (
    select w.week_start,string_agg(h.label||' ('||to_char(h.holiday_date,'DD/MM')||')',', ' order by h.holiday_date) as labels
    from calendar_weeks w
    join public.home_office_schedules schedule on schedule.team_id=p_team_id and schedule.anchor_week<=w.week_start and schedule.enabled
    join public.home_office_holidays h on h.team_id=p_team_id and h.holiday_date between w.week_start and w.week_start+6
    group by w.week_start
  )
  select p_team_id,a.effective_user,a.day,a.week_start,p.display_name,p.avatar_url,'home_office'::text,null::text
  from assignments a join public.profiles p on p.id=a.effective_user
  union all
  select p_team_id,null::uuid,h.holiday_date,h.holiday_date-extract(dow from h.holiday_date)::integer,
    null::text,null::text,'holiday'::text,h.label
  from public.home_office_holidays h where h.team_id=p_team_id and h.holiday_date between p_starts_on and p_ends_on
  union all
  select p_team_id,null::uuid,
    case when p_ends_on<w.week_start+1 then p_ends_on else greatest(w.week_start+1,p_starts_on) end,
    w.week_start,null::text,null::text,'holiday_week'::text,'Sem home office · '||w.labels
  from holiday_weeks w
  order by 3,7;
end $$;

create function public.save_home_office_schedule(
  p_team_id uuid,p_anchor_week date,p_member_ids uuid[],p_reminder_time time default '08:30',
  p_timezone text default 'America/Sao_Paulo',p_holidays jsonb default '[]'::jsonb
) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();holiday record;old_anchor date;old_member_count integer;roster_changed boolean:=false;current_week date;
begin
  if not private.can_manage_team(p_team_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_anchor_week is null or extract(dow from p_anchor_week)<>0 then raise exception 'A semana de referência precisa começar no domingo.' using errcode='22023'; end if;
  if coalesce(cardinality(p_member_ids),0)<>5 or (select count(distinct x) from unnest(p_member_ids) x)<>5 then
    raise exception 'Selecione cinco pessoas diferentes, uma para cada dia útil.' using errcode='22023';
  end if;
  if exists(select 1 from unnest(p_member_ids) x where not private.active_team_user(p_team_id,x)) then
    raise exception 'Todas as pessoas precisam estar ativas neste time.' using errcode='22023';
  end if;
  if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Fuso horário inválido.' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(p_holidays,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_holidays,'[]'::jsonb))>500 then
    raise exception 'Lista de feriados inválida.' using errcode='22023';
  end if;
  for holiday in select * from jsonb_to_recordset(coalesce(p_holidays,'[]'::jsonb)) as x(holiday_date date,label text) loop
    if holiday.holiday_date is null or char_length(btrim(coalesce(holiday.label,''))) not between 1 and 120 then
      raise exception 'Confira a data e o nome dos feriados.' using errcode='22023';
    end if;
  end loop;

  select anchor_week into old_anchor from public.home_office_schedules where team_id=p_team_id for update;
  if not found or old_anchor is distinct from p_anchor_week then roster_changed:=true; end if;
  select count(*) into old_member_count from public.home_office_members where team_id=p_team_id;
  if old_member_count<>5 or exists(
    select 1 from public.home_office_members m where m.team_id=p_team_id and
      (not (m.user_id=any(p_member_ids)) or m.anchor_weekday<>array_position(p_member_ids,m.user_id)-1)
  ) then roster_changed:=true; end if;

  insert into public.home_office_schedules(team_id,anchor_week,timezone,reminder_time,enabled,created_by)
  values(p_team_id,p_anchor_week,p_timezone,p_reminder_time,true,actor)
  on conflict(team_id) do update set anchor_week=excluded.anchor_week,timezone=excluded.timezone,
    reminder_time=excluded.reminder_time,enabled=true;

  if roster_changed then
    current_week:=((clock_timestamp() at time zone p_timezone)::date)-extract(dow from (clock_timestamp() at time zone p_timezone)::date)::integer;
    update public.home_office_swaps set status='cancelled'
    where team_id=p_team_id and week_start>=current_week and status in ('pending','accepted');
    update public.notifications n set read_at=coalesce(n.read_at,clock_timestamp())
    where n.team_id=p_team_id and n.kind='home_office_swap' and n.read_at is null
      and exists(select 1 from public.home_office_swaps s where s.team_id=p_team_id and s.status='cancelled'
        and s.week_start>=current_week and n.dedupe_key='home_office_swap:'||s.id::text);
  end if;
  delete from public.home_office_members where team_id=p_team_id;
  insert into public.home_office_members(team_id,user_id,anchor_weekday)
  select p_team_id,x.user_id,(x.ordinality-1)::smallint
  from unnest(p_member_ids) with ordinality as x(user_id,ordinality);
  delete from public.home_office_holidays where team_id=p_team_id;
  insert into public.home_office_holidays(team_id,holiday_date,label)
  select p_team_id,x.holiday_date,btrim(x.label)
  from jsonb_to_recordset(coalesce(p_holidays,'[]'::jsonb)) as x(holiday_date date,label text);
end $$;

create function public.request_home_office_swap(p_team_id uuid,p_week_start date,p_target_user_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();schedule public.home_office_schedules;current_week date;local_date date;requester_weekday smallint;target_weekday smallint;result uuid;
begin
  if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if p_week_start is null or extract(dow from p_week_start)<>0 or p_target_user_id=actor then
    raise exception 'Confira a semana e escolha outra pessoa.' using errcode='22023';
  end if;
  select * into schedule from public.home_office_schedules where team_id=p_team_id and enabled for update;
  if not found then raise exception 'A escala de home office não está configurada.' using errcode='22023'; end if;
  local_date:=(clock_timestamp() at time zone schedule.timezone)::date;
  current_week:=local_date-extract(dow from local_date)::integer;
  if p_week_start<current_week then raise exception 'Não é possível trocar uma semana passada.' using errcode='22023'; end if;
  select weekday into requester_weekday from private.home_office_rotation(p_team_id,p_week_start) where user_id=actor;
  select weekday into target_weekday from private.home_office_rotation(p_team_id,p_week_start) where user_id=p_target_user_id;
  if requester_weekday is null or target_weekday is null then
    raise exception 'As duas pessoas precisam estar na escala dessa semana.' using errcode='22023';
  end if;
  if p_week_start+1+requester_weekday<local_date or p_week_start+1+target_weekday<local_date then
    raise exception 'A troca precisa ser solicitada antes dos dois dias de home office.' using errcode='22023';
  end if;
  if exists(select 1 from public.home_office_swaps s where s.team_id=p_team_id and s.week_start=p_week_start
    and s.status in ('pending','accepted') and (s.requested_by in(actor,p_target_user_id) or s.target_user_id in(actor,p_target_user_id))) then
    raise exception 'Uma dessas pessoas já tem uma troca aberta ou confirmada nessa semana.' using errcode='23505';
  end if;
  insert into public.home_office_swaps(team_id,week_start,requested_by,target_user_id)
  values(p_team_id,p_week_start,actor,p_target_user_id) returning id into result;
  insert into public.notifications(user_id,team_id,kind,dedupe_key)
  values(p_target_user_id,p_team_id,'home_office_swap','home_office_swap:'||result::text)
  on conflict(user_id,dedupe_key) do nothing;
  return result;
end $$;

create function public.decide_home_office_swap(p_request_id uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();request public.home_office_swaps;schedule public.home_office_schedules;local_date date;current_week date;requester_weekday smallint;target_weekday smallint;
begin
  select * into request from public.home_office_swaps where id=p_request_id for update;
  if not found or not private.is_team_participant(request.team_id) then raise exception 'Solicitação não encontrada.' using errcode='42501'; end if;
  if request.status<>'pending' then raise exception 'Esta solicitação já foi respondida.' using errcode='40001'; end if;
  select * into schedule from public.home_office_schedules where team_id=request.team_id and enabled for update;
  if not found then raise exception 'A escala de home office não está configurada.' using errcode='22023'; end if;
  local_date:=(clock_timestamp() at time zone schedule.timezone)::date;
  current_week:=local_date-extract(dow from local_date)::integer;
  if p_action='cancel' and actor=request.requested_by then
    update public.home_office_swaps set status='cancelled' where id=request.id;
    update public.notifications set read_at=coalesce(read_at,clock_timestamp()) where user_id=actor and dedupe_key='home_office_swap:'||request.id::text;
  elsif p_action in ('accept','decline') and actor=request.target_user_id then
    if p_action='accept' then
      if private.home_office_week_skipped(request.team_id,request.week_start)
        or not exists(select 1 from private.home_office_rotation(request.team_id,request.week_start) r where r.user_id=request.requested_by)
        or not exists(select 1 from private.home_office_rotation(request.team_id,request.week_start) r where r.user_id=request.target_user_id) then
        raise exception 'A escala dessa semana foi alterada.' using errcode='40001';
      end if;
      select weekday into requester_weekday from private.home_office_rotation(request.team_id,request.week_start) where user_id=request.requested_by;
      select weekday into target_weekday from private.home_office_rotation(request.team_id,request.week_start) where user_id=request.target_user_id;
      if request.week_start<current_week or request.week_start+1+requester_weekday<local_date or request.week_start+1+target_weekday<local_date then
        raise exception 'O dia da troca já passou.' using errcode='22023';
      end if;
      if exists(select 1 from public.home_office_swaps s where s.team_id=request.team_id and s.week_start=request.week_start
        and s.id<>request.id and s.status='accepted'
        and (s.requested_by in(request.requested_by,request.target_user_id) or s.target_user_id in(request.requested_by,request.target_user_id))) then
        raise exception 'Uma dessas pessoas já confirmou outra troca nessa semana.' using errcode='23505';
      end if;
    end if;
    update public.home_office_swaps set status=case when p_action='accept' then 'accepted' else 'declined' end where id=request.id;
    update public.notifications set read_at=coalesce(read_at,clock_timestamp()) where user_id=actor and dedupe_key='home_office_swap:'||request.id::text;
    insert into public.notifications(user_id,team_id,kind,dedupe_key)
    values(request.requested_by,request.team_id,'home_office_swap','home_office_swap_result:'||request.id::text)
    on conflict(user_id,dedupe_key) do nothing;
  else
    raise exception 'Somente quem recebeu pode responder à troca.' using errcode='42501';
  end if;
end $$;

create or replace function public.refresh_my_reminders(p_team_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();schedule public.home_office_schedules;local_now timestamp;local_date date;week_start date;
begin
  if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  insert into public.notifications(user_id,team_id,event_id,kind,dedupe_key)
  select actor,p_team_id,e.id,'meeting','meeting:'||e.id::text||':'||floor(extract(epoch from e.starts_at))::bigint::text||':15m'
  from public.events e where e.team_id=p_team_id and e.cancelled_at is null
    and e.starts_at between clock_timestamp() and clock_timestamp()+interval '15 minutes'
    and(e.created_by=actor or exists(select 1 from public.event_attendees a where a.event_id=e.id and a.user_id=actor and a.response<>'declined'))
  on conflict(user_id,dedupe_key) do nothing;
  insert into public.notifications(user_id,team_id,kind,dedupe_key)
  select actor,p_team_id,'timer','timer:'||e.id::text||':forgotten'
  from public.time_entries e left join public.time_goals g on g.team_id=e.team_id and g.user_id=e.user_id
  where e.team_id=p_team_id and e.user_id=actor and e.ended_at is null
    and e.started_at<clock_timestamp()-make_interval(mins=>coalesce(g.forgotten_after_minutes,480))
  on conflict(user_id,dedupe_key) do nothing;

  select * into schedule from public.home_office_schedules where team_id=p_team_id and enabled;
  if not found then return; end if;
  local_now:=clock_timestamp() at time zone schedule.timezone;
  local_date:=local_now::date;
  week_start:=local_date-extract(dow from local_date)::integer;
  if local_now>=local_date+schedule.reminder_time
    and exists(select 1 from private.home_office_assignments(p_team_id,week_start) r where r.user_id=actor
    and r.weekday=extract(isodow from local_date)::integer-1) then
    insert into public.notifications(user_id,team_id,kind,dedupe_key)
    values(actor,p_team_id,'home_office','home_office:'||p_team_id::text||':'||actor::text||':'||local_date::text)
    on conflict(user_id,dedupe_key) do nothing;
  end if;
end $$;

create function public.queue_home_office_reminders() returns void
language plpgsql security definer set search_path='' as $$
declare schedule public.home_office_schedules;local_now timestamp;local_date date;week_start date;assignee record;
begin
  for schedule in select * from public.home_office_schedules where enabled loop
    local_now:=clock_timestamp() at time zone schedule.timezone;
    if local_now>=local_now::date+schedule.reminder_time and local_now<local_now::date+schedule.reminder_time+interval '15 minutes' then
      local_date:=local_now::date;
      week_start:=local_date-extract(dow from local_date)::integer;
      for assignee in select * from private.home_office_assignments(schedule.team_id,week_start)
        where weekday=extract(isodow from local_date)::integer-1 loop
        insert into public.notifications(user_id,team_id,kind,dedupe_key)
        values(assignee.user_id,schedule.team_id,'home_office','home_office:'||schedule.team_id::text||':'||assignee.user_id::text||':'||local_date::text)
        on conflict(user_id,dedupe_key) do nothing;
      end loop;
    end if;
  end loop;
end $$;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check(kind in ('message','mention','meeting','timer','absence','shift','home_office','home_office_swap'));

revoke all on function private.home_office_week_skipped(uuid,date) from public,anon,authenticated;
revoke all on function private.home_office_rotation(uuid,date) from public,anon,authenticated;
revoke all on function private.home_office_assignments(uuid,date) from public,anon,authenticated;
revoke all on function public.get_home_office_calendar(uuid,date,date) from public,anon;
revoke all on function public.save_home_office_schedule(uuid,date,uuid[],time,text,jsonb) from public,anon;
revoke all on function public.request_home_office_swap(uuid,date,uuid) from public,anon;
revoke all on function public.decide_home_office_swap(uuid,text) from public,anon;
revoke all on function public.queue_home_office_reminders() from public,anon,authenticated;
grant execute on function public.get_home_office_calendar(uuid,date,date) to authenticated;
grant execute on function public.save_home_office_schedule(uuid,date,uuid[],time,text,jsonb) to authenticated;
grant execute on function public.request_home_office_swap(uuid,date,uuid) to authenticated;
grant execute on function public.decide_home_office_swap(uuid,text) to authenticated;
grant execute on function public.queue_home_office_reminders() to service_role;
grant select,insert,update,delete on public.notifications to service_role;

commit;
