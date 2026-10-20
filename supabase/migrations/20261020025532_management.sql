begin;
create table public.clients (
 id uuid primary key default gen_random_uuid(),team_id uuid not null references public.teams(id),name text not null check(char_length(btrim(name)) between 1 and 160),
 archived_at timestamptz,created_by uuid not null references public.profiles(id),unique(team_id,id)
);
create index clients_team_idx on public.clients(team_id);
create index clients_author_idx on public.clients(created_by);
alter table public.projects add column client_id uuid;
alter table public.projects add foreign key(team_id,client_id) references public.clients(team_id,id);
create index projects_client_idx on public.projects(team_id,client_id);
create table public.time_goals (
 team_id uuid not null,user_id uuid not null,weekly_minutes integer not null check(weekly_minutes between 0 and 10080),
 forgotten_after_minutes integer not null default 480 check(forgotten_after_minutes between 30 and 1440),updated_at timestamptz not null default now(),
 primary key(team_id,user_id),foreign key(team_id,user_id) references public.team_members(team_id,user_id)
);
create index time_goals_user_idx on public.time_goals(user_id);
create table public.shifts (
 id uuid primary key default gen_random_uuid(),team_id uuid not null,user_id uuid not null,
 label text not null check(char_length(btrim(label)) between 1 and 120),starts_at timestamptz not null,ends_at timestamptz not null,
 created_by uuid not null references public.profiles(id),cancelled_at timestamptz,version integer not null default 1,
 check(ends_at>starts_at and ends_at-starts_at<=interval '48 hours'),unique(team_id,id),
 foreign key(team_id,user_id) references public.team_members(team_id,user_id)
);
create index shifts_team_idx on public.shifts(team_id,starts_at);
create index shifts_user_idx on public.shifts(user_id,starts_at);
create index shifts_author_idx on public.shifts(created_by);
create table public.shift_swaps (
 id uuid primary key default gen_random_uuid(),team_id uuid not null,shift_id uuid not null,requested_by uuid not null,target_user_id uuid not null,
 status text not null default 'pending' check(status in ('pending','accepted','approved','rejected','cancelled')),decided_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(team_id,shift_id) references public.shifts(team_id,id),
 foreign key(team_id,requested_by) references public.team_members(team_id,user_id),foreign key(team_id,target_user_id) references public.team_members(team_id,user_id)
);
create unique index shift_swaps_pending_idx on public.shift_swaps(shift_id) where status in ('pending','accepted');
create index shift_swaps_team_idx on public.shift_swaps(team_id);
create index shift_swaps_requester_idx on public.shift_swaps(team_id,requested_by);
create index shift_swaps_target_idx on public.shift_swaps(team_id,target_user_id);
create index shift_swaps_decider_idx on public.shift_swaps(decided_by);
create table public.absences (
 id uuid primary key default gen_random_uuid(),team_id uuid not null,user_id uuid not null,
 kind text not null check(kind in ('vacation','leave','medical')),starts_on date not null,ends_on date not null,
 note text not null default '' check(char_length(note)<=4000),status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
 decided_by uuid references public.profiles(id),decision_note text not null default '' check(char_length(decision_note)<=2000),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(ends_on>=starts_on and ends_on-starts_on<=366),foreign key(team_id,user_id) references public.team_members(team_id,user_id)
);
create index absences_team_user_idx on public.absences(team_id,user_id,starts_on);
create index absences_user_idx on public.absences(user_id);
create index absences_decider_idx on public.absences(decided_by);
create table public.team_dates (
 id uuid primary key default gen_random_uuid(),team_id uuid not null references public.teams(id),created_by uuid not null references public.profiles(id),
 label text not null check(char_length(btrim(label)) between 1 and 160),happens_on date not null,recurs_yearly boolean not null default true
);
create index team_dates_team_idx on public.team_dates(team_id);
create index team_dates_author_idx on public.team_dates(created_by);
do $$ declare tbl text;begin
 foreach tbl in array array['clients','time_goals','shifts','shift_swaps','absences','team_dates'] loop
 execute format('alter table public.%I enable row level security',tbl);execute format('revoke all on public.%I from public,anon,authenticated',tbl);execute format('grant select on public.%I to authenticated',tbl);
 end loop;
end $$;
create policy clients_read on public.clients for select to authenticated using(private.can_access_team(team_id));
create policy goals_read on public.time_goals for select to authenticated using(private.can_access_team(team_id) and (user_id=(select auth.uid()) or private.can_manage_team(team_id)));
create policy shifts_read on public.shifts for select to authenticated using(private.can_access_team(team_id));
create policy swaps_read on public.shift_swaps for select to authenticated using(private.can_access_team(team_id));
create policy absences_read on public.absences for select to authenticated using(private.can_access_team(team_id) and (user_id=(select auth.uid()) or private.can_manage_team(team_id)));
create policy dates_read on public.team_dates for select to authenticated using(private.can_access_team(team_id));
create function public.save_client(p_team_id uuid,p_name text,p_client_id uuid default null,p_archived boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();result uuid;begin
 if not private.can_manage_team(p_team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_client_id is null then insert into public.clients(team_id,name,created_by) values(p_team_id,btrim(p_name),actor) returning id into result;
 else update public.clients set name=btrim(p_name),archived_at=case when p_archived then clock_timestamp() end where id=p_client_id and team_id=p_team_id returning id into result;if not found then raise exception 'Cliente indisponível' using errcode='22023';end if;end if;return result;
end $$;
create function public.set_project_client(p_project_id uuid,p_client_id uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare project public.projects;begin
 perform private.require_mfa();select * into project from public.projects where id=p_project_id for update;
 if not found or not private.can_manage_team(project.team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_client_id is not null and not exists(select 1 from public.clients where id=p_client_id and team_id=project.team_id and archived_at is null) then raise exception 'Cliente indisponível' using errcode='22023';end if;
 update public.projects set client_id=p_client_id where id=project.id;
end $$;
create function public.set_time_goal(p_team_id uuid,p_user_id uuid,p_weekly_minutes integer,p_forgotten_after_minutes integer default 480) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();begin
 if not private.is_team_participant(p_team_id) or (actor<>p_user_id and not private.can_manage_team(p_team_id)) or not private.active_team_user(p_team_id,p_user_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 insert into public.time_goals(team_id,user_id,weekly_minutes,forgotten_after_minutes) values(p_team_id,p_user_id,p_weekly_minutes,p_forgotten_after_minutes)
 on conflict(team_id,user_id) do update set weekly_minutes=excluded.weekly_minutes,forgotten_after_minutes=excluded.forgotten_after_minutes,updated_at=clock_timestamp();
end $$;
create function public.report_time_entries(p_team_id uuid,p_from timestamptz,p_to timestamptz,p_user_id uuid default null,p_project_id uuid default null,p_client_id uuid default null,p_after uuid default null)
returns table(entry_id uuid,user_id uuid,display_name text,project_id uuid,project_name text,client_id uuid,client_name text,description text,started_at timestamptz,ended_at timestamptz,duration_seconds bigint)
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();begin
 if not private.can_access_team(p_team_id) or (p_user_id is not null and p_user_id<>actor and not private.can_manage_team(p_team_id)) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '367 days' then raise exception 'Intervalo inválido. Selecione até um ano.' using errcode='22023';end if;
 return query select e.id,e.user_id,u.display_name,e.project_id,p.name,p.client_id,c.name,e.description,greatest(e.started_at,p_from),least(e.ended_at,p_to),floor(extract(epoch from least(e.ended_at,p_to)-greatest(e.started_at,p_from)))::bigint
 from public.time_entries e join public.profiles u on u.id=e.user_id left join public.projects p on p.id=e.project_id left join public.clients c on c.id=p.client_id
 where e.team_id=p_team_id and e.ended_at is not null and e.started_at<p_to and e.ended_at>p_from
 and (e.user_id=actor or private.can_manage_team(p_team_id)) and(p_user_id is null or e.user_id=p_user_id)
 and(p_project_id is null or e.project_id=p_project_id) and(p_client_id is null or p.client_id=p_client_id)
 and(p_after is null or e.id>p_after) order by e.id limit 500;
end $$;
create function public.save_shift(p_team_id uuid,p_user_id uuid,p_label text,p_starts_at timestamptz,p_ends_at timestamptz,p_shift_id uuid default null,p_expected_version integer default null,p_cancelled boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();existing public.shifts;result uuid;begin
 if not private.can_manage_team(p_team_id) or not private.active_team_user(p_team_id,p_user_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_team_id::text,99));
 if p_shift_id is not null then select * into existing from public.shifts where id=p_shift_id and team_id=p_team_id for update;if not found then raise exception 'Turno indisponível' using errcode='22023';end if;if existing.version is distinct from p_expected_version then raise exception 'O turno mudou. Atualize antes de salvar.' using errcode='40001';end if;end if;
 if not p_cancelled and exists(select 1 from public.shifts where team_id=p_team_id and user_id=p_user_id and cancelled_at is null and(p_shift_id is null or id<>p_shift_id) and starts_at<p_ends_at and ends_at>p_starts_at) then raise exception 'O período se sobrepõe a outro turno.' using errcode='23P01';end if;
 if p_shift_id is null then insert into public.shifts(team_id,user_id,label,starts_at,ends_at,created_by) values(p_team_id,p_user_id,btrim(p_label),p_starts_at,p_ends_at,actor) returning id into result;
 else update public.shifts set user_id=p_user_id,label=btrim(p_label),starts_at=p_starts_at,ends_at=p_ends_at,version=version+1,cancelled_at=case when p_cancelled then clock_timestamp() end where id=existing.id returning id into result;
 update public.shift_swaps set status='cancelled',updated_at=clock_timestamp() where shift_id=existing.id and status in ('pending','accepted');end if;return result;
end $$;
create function public.request_shift_swap(p_shift_id uuid,p_target_user_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();shift public.shifts;result uuid;begin
 select * into shift from public.shifts where id=p_shift_id for update;
 if not found or shift.user_id<>actor or shift.cancelled_at is not null or shift.starts_at<=clock_timestamp() or p_target_user_id=actor or not private.is_team_participant(shift.team_id) or not private.active_team_user(shift.team_id,p_target_user_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 insert into public.shift_swaps(team_id,shift_id,requested_by,target_user_id) values(shift.team_id,shift.id,actor,p_target_user_id) returning id into result;return result;
end $$;
create function public.decide_shift_swap(p_request_id uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();request public.shift_swaps;shift public.shifts;team uuid;begin
 select team_id into team from public.shift_swaps where id=p_request_id;
 if team is null or not private.is_team_participant(team) then raise exception 'Acesso negado' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(team::text,99));
 select s.* into shift from public.shifts s join public.shift_swaps r on r.shift_id=s.id where r.id=p_request_id for update of s;
 select * into request from public.shift_swaps where id=p_request_id for update;
 if request.status not in ('pending','accepted') or shift.cancelled_at is not null or shift.user_id<>request.requested_by or shift.starts_at<=clock_timestamp() then raise exception 'Troca indisponível' using errcode='22023';end if;
 if p_action='accepted' and actor=request.target_user_id and request.status='pending' then update public.shift_swaps set status='accepted',updated_at=clock_timestamp() where id=request.id;
 elsif p_action='cancelled' and actor=request.requested_by then update public.shift_swaps set status='cancelled',updated_at=clock_timestamp() where id=request.id;
 elsif p_action='rejected' and (actor=request.target_user_id or private.can_manage_team(team)) then update public.shift_swaps set status='rejected',decided_by=actor,updated_at=clock_timestamp() where id=request.id;
 elsif p_action='approved' and request.status='accepted' and private.can_manage_team(team) and private.active_team_user(team,request.target_user_id) then
  if exists(select 1 from public.shifts where team_id=team and user_id=request.target_user_id and cancelled_at is null and starts_at<shift.ends_at and ends_at>shift.starts_at) then raise exception 'O período se sobrepõe a outro turno.' using errcode='23P01';end if;
  update public.shifts set user_id=request.target_user_id,version=version+1 where id=shift.id;
  update public.shift_swaps set status='approved',decided_by=actor,updated_at=clock_timestamp() where id=request.id;
 else raise exception 'Acesso negado' using errcode='42501';end if;
end $$;
create function public.request_absence(p_team_id uuid,p_kind text,p_starts_on date,p_ends_on date,p_note text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();result uuid;begin
 if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_team_id::text,99));
 if exists(select 1 from public.absences where team_id=p_team_id and user_id=actor and status in ('pending','approved') and starts_on<=p_ends_on and ends_on>=p_starts_on) then raise exception 'O período se sobrepõe a outra ausência.' using errcode='23P01';end if;
 insert into public.absences(team_id,user_id,kind,starts_on,ends_on,note) values(p_team_id,actor,p_kind,p_starts_on,p_ends_on,p_note) returning id into result;return result;
end $$;
create function public.decide_absence(p_absence_id uuid,p_status text,p_note text default '') returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();item public.absences;team uuid;begin
 select team_id into team from public.absences where id=p_absence_id;
 if team is null or not private.can_manage_team(team) then raise exception 'Acesso negado' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(team::text,99));
 select * into item from public.absences where id=p_absence_id for update;
 if item.user_id=actor or item.status<>'pending' or p_status not in ('approved','rejected') or p_status is null then raise exception 'Aprovação indisponível. Outra liderança precisa decidir.' using errcode='22023';end if;
 update public.absences set status=p_status,decided_by=actor,decision_note=p_note,updated_at=clock_timestamp() where id=item.id;
 insert into public.notifications(user_id,team_id,kind,dedupe_key) values(item.user_id,team,'absence','absence:'||item.id::text||':'||p_status) on conflict do nothing;
end $$;
create function public.cancel_absence(p_absence_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();item public.absences;begin
 select * into item from public.absences where id=p_absence_id for update;
 if not found or not private.is_team_participant(item.team_id) or (item.user_id<>actor and not private.can_manage_team(item.team_id)) then raise exception 'Acesso negado' using errcode='42501';end if;
 update public.absences set status='cancelled',updated_at=clock_timestamp() where id=item.id;
end $$;
create function public.absence_schedule(p_team_id uuid,p_from date,p_to date) returns table(user_id uuid,starts_on date,ends_on date)
language plpgsql stable security definer set search_path='' as $$begin
 perform private.require_mfa();if not private.can_access_team(p_team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Intervalo inválido' using errcode='22023';end if;
 return query select a.user_id,a.starts_on,a.ends_on from public.absences a where a.team_id=p_team_id and a.status='approved' and a.starts_on<=p_to and a.ends_on>=p_from;
end $$;
create function public.save_team_date(p_team_id uuid,p_label text,p_happens_on date,p_recurs_yearly boolean default true,p_date_id uuid default null,p_delete boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();item public.team_dates;result uuid;begin
 if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_date_id is null then insert into public.team_dates(team_id,label,happens_on,recurs_yearly,created_by) values(p_team_id,btrim(p_label),p_happens_on,p_recurs_yearly,actor) returning id into result;
 else select * into item from public.team_dates where id=p_date_id and team_id=p_team_id for update;if not found or(item.created_by<>actor and not private.can_manage_team(p_team_id)) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_delete then delete from public.team_dates where id=item.id;result:=item.id;else update public.team_dates set label=btrim(p_label),happens_on=p_happens_on,recurs_yearly=p_recurs_yearly where id=item.id returning id into result;end if;end if;return result;
end $$;
do $$declare routine record;begin
 for routine in select p.proname,pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['save_client','set_project_client','set_time_goal','report_time_entries','save_shift','request_shift_swap','decide_shift_swap','request_absence','decide_absence','cancel_absence','absence_schedule','save_team_date']) loop
 execute format('revoke all on function public.%I(%s) from public,anon,authenticated',routine.proname,routine.args);execute format('grant execute on function public.%I(%s) to authenticated',routine.proname,routine.args);end loop;
end $$;
alter publication supabase_realtime add table public.clients,public.time_goals,public.shifts,public.shift_swaps,public.absences;
commit;
