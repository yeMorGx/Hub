begin;
create function private.can_export_team(p_team_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_mfa() and exists(select 1 from public.teams t where t.id=p_team_id and private.is_workspace_admin(t.workspace_id));
$$;
create or replace function public.report_time_entries(p_team_id uuid,p_from timestamptz,p_to timestamptz,p_user_id uuid default null,p_project_id uuid default null,p_client_id uuid default null,p_after uuid default null)
returns table(entry_id uuid,user_id uuid,display_name text,project_id uuid,project_name text,client_id uuid,client_name text,description text,started_at timestamptz,ended_at timestamptz,duration_seconds bigint)
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();begin
 if not private.can_access_team(p_team_id) or (p_user_id is not null and p_user_id<>actor and not private.can_export_team(p_team_id)) then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '367 days' then raise exception 'Intervalo inválido. Selecione até um ano.' using errcode='22023';end if;
 return query select e.id,e.user_id,u.display_name,e.project_id,p.name,p.client_id,c.name,e.description,greatest(e.started_at,p_from),least(e.ended_at,p_to),floor(extract(epoch from least(e.ended_at,p_to)-greatest(e.started_at,p_from)))::bigint
 from public.time_entries e join public.profiles u on u.id=e.user_id left join public.projects p on p.id=e.project_id left join public.clients c on c.id=p.client_id
 where e.team_id=p_team_id and e.ended_at is not null and e.started_at<p_to and e.ended_at>p_from
 and (e.user_id=actor or private.can_export_team(p_team_id)) and(p_user_id is null or e.user_id=p_user_id)
 and(p_project_id is null or e.project_id=p_project_id) and(p_client_id is null or p.client_id=p_client_id)
 and(p_after is null or e.id>p_after) order by e.id limit 500;
end $$;

create function public.report_work_balances(p_team_id uuid,p_from date,p_to date,p_user_id uuid default null)
returns table(user_id uuid,display_name text,work_date date,expected_minutes integer,actual_seconds bigint,configured boolean)
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); is_admin boolean:=private.can_export_team(p_team_id);
begin
 if not private.can_access_team(p_team_id) or (p_user_id is not null and p_user_id<>actor and not is_admin) then raise exception 'Acesso negado' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Selecione um período de até um ano.' using errcode='22023'; end if;
 return query
 with people as (
  select p.id,p.display_name from public.profiles p
  where (is_admin or p.id=actor) and (p_user_id is null or p.id=p_user_id)
   and (private.active_team_user(p_team_id,p.id) or exists(select 1 from public.time_entries e where e.team_id=p_team_id and e.user_id=p.id))
 ), days as (select p_from+n as day from generate_series(0,p_to-p_from) n)
 select p.id,p.display_name,d.day,
  case when ws.setup_state='complete' and (coalesce(ws.workdays_mask,0) & (1 << (extract(isodow from d.day)::integer-1)))<>0
   and not exists(select 1 from public.home_office_holidays h where h.team_id=p_team_id and h.holiday_date=d.day)
   and not exists(select 1 from public.absences a where a.team_id=p_team_id and a.user_id=p.id and a.status='approved' and d.day between a.starts_on and a.ends_on)
   then ws.daily_minutes::integer else 0 end,
  coalesce((select sum(greatest(0,floor(extract(epoch from (
   least(e.ended_at,(d.day+1)::timestamp at time zone coalesce(ws.timezone,'America/Sao_Paulo'))
   - greatest(e.started_at,d.day::timestamp at time zone coalesce(ws.timezone,'America/Sao_Paulo'))
  )))::bigint)) from public.time_entries e where e.team_id=p_team_id and e.user_id=p.id and e.ended_at is not null
   and e.started_at<(d.day+1)::timestamp at time zone coalesce(ws.timezone,'America/Sao_Paulo')
   and e.ended_at>d.day::timestamp at time zone coalesce(ws.timezone,'America/Sao_Paulo')),0)::bigint, coalesce(ws.setup_state='complete',false)
 from people p cross join days d left join lateral (
  select s.* from public.work_schedules s where s.team_id=p_team_id and s.user_id=p.id and s.effective_from<=d.day order by s.effective_from desc limit 1
 ) ws on true order by p.id,d.day;
end $$;
revoke all on function public.report_work_balances(uuid,date,date,uuid) from public,anon;
grant execute on function public.report_work_balances(uuid,date,date,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('zulu-avatars','zulu-avatars',false,5242880,array['image/webp']) on conflict(id) do nothing;
create function private.can_read_zulu_avatar(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_mfa() and exists(select 1 from public.profiles p where p.avatar_url=p_path and split_part(p_path,'/',1)=p.id::text and (
  p.id=auth.uid() or exists(select 1 from public.workspace_members owner_member join public.workspace_members viewer_member on viewer_member.workspace_id=owner_member.workspace_id
   where owner_member.user_id=p.id and owner_member.is_active and viewer_member.user_id=auth.uid() and viewer_member.is_active)
 ));
$$;
revoke all on function private.can_read_zulu_avatar(text) from public,anon;
grant execute on function private.can_read_zulu_avatar(text) to authenticated;
create policy zulu_avatars_read on storage.objects for select to authenticated using(bucket_id='zulu-avatars' and private.can_read_zulu_avatar(name));
create policy zulu_avatars_upload on storage.objects for insert to authenticated with check(bucket_id='zulu-avatars' and private.has_mfa() and name ~ ('^'||auth.uid()::text||'/[a-f0-9-]{36}\.webp$'));
create policy zulu_avatars_delete on storage.objects for delete to authenticated using(bucket_id='zulu-avatars' and private.has_mfa() and split_part(name,'/',1)=auth.uid()::text);
commit;
