begin;
alter table public.tasks add column sort_order double precision not null default 0;
with ranked as (
 select id,row_number() over(partition by team_id,status order by case priority when 'high' then 0 when 'normal' then 1 else 2 end,due_on nulls last,created_at desc,id)*1024.0 as position
 from public.tasks where archived_at is null
) update public.tasks t set sort_order=r.position from ranked r where t.id=r.id;
create index tasks_board_order_idx on public.tasks(team_id,status,sort_order,id) where archived_at is null;

-- Delegate status, MFA, module and ownership checks to the existing guarded RPC.
-- Only the moved row normally changes; rebalance a column if fractional gaps run out.
create function public.position_task(p_task_id uuid,p_status text,p_expected_version integer,p_before_id uuid default null,p_after_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare t uuid; b double precision; a double precision; position double precision;
begin
 perform private.require_mfa();
 select team_id into t from public.tasks where id=p_task_id;
 if t is null then raise exception 'Acesso negado' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(t::text,13));
 perform public.move_task(p_task_id,p_status,p_expected_version);
 if p_before_id=p_task_id or p_after_id=p_task_id or (p_before_id is not null and p_before_id=p_after_id) then raise exception 'Posição inválida' using errcode='22023';end if;
 if p_before_id is not null then
  select sort_order into b from public.tasks where id=p_before_id and team_id=t and status=p_status and archived_at is null;
  if not found then raise exception 'O quadro mudou. Atualize e tente novamente.' using errcode='40001';end if;
 end if;
 if p_after_id is not null then
  select sort_order into a from public.tasks where id=p_after_id and team_id=t and status=p_status and archived_at is null;
  if not found then raise exception 'O quadro mudou. Atualize e tente novamente.' using errcode='40001';end if;
 end if;
 if a is not null and b is not null and b-a<0.000001 then
  with ranked as (select id,row_number() over(order by sort_order,created_at desc,id)*1024.0 as position from public.tasks where team_id=t and status=p_status and archived_at is null and id<>p_task_id)
  update public.tasks target set sort_order=r.position from ranked r where target.id=r.id;
  select sort_order into a from public.tasks where id=p_after_id;
  select sort_order into b from public.tasks where id=p_before_id;
 end if;
 if a is not null and b is not null and a>=b then raise exception 'O quadro mudou. Atualize e tente novamente.' using errcode='40001';end if;
 position:=case when a is not null and b is not null then (a+b)/2 when b is not null then b-1024 when a is not null then a+1024 else coalesce((select max(sort_order) from public.tasks where team_id=t and status=p_status and archived_at is null and id<>p_task_id),0)+1024 end;
 update public.tasks set sort_order=position where id=p_task_id;
end;
$$;
revoke all on function public.position_task(uuid,text,integer,uuid,uuid) from public,anon,authenticated;
grant execute on function public.position_task(uuid,text,integer,uuid,uuid) to authenticated;
commit;
