begin;
create table private.calendar_watches (
 connection_id uuid primary key references public.calendar_connections(id) on delete cascade,
 subscription_id text not null unique,resource_id text,token_hash text not null,expires_at timestamptz not null
);
create table private.calendar_jobs (
 connection_id uuid primary key references public.calendar_connections(id) on delete cascade,
 requested_at timestamptz not null default clock_timestamp(),next_attempt_at timestamptz not null default clock_timestamp(),attempts integer not null default 0
);
alter table private.calendar_watches enable row level security;
alter table private.calendar_jobs enable row level security;
revoke all on private.calendar_watches,private.calendar_jobs from public,anon,authenticated;
create function public.calendar_background(p_operation text,p_connection_id uuid default null,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if p_operation='jobs' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from(select j.*,c.user_id,c.team_id,c.provider from private.calendar_jobs j join public.calendar_connections c on c.id=j.connection_id where j.next_attempt_at<=clock_timestamp() and private.active_team_user(c.team_id,c.user_id) order by j.requested_at limit 5)x;return result;
 elsif p_operation='watches_due' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from(select c.id connection_id,c.user_id,c.team_id,c.provider from public.calendar_connections c left join private.calendar_watches w on w.connection_id=c.id where(w.expires_at is null or w.expires_at<clock_timestamp()+interval '1 day') and private.active_team_user(c.team_id,c.user_id) limit 5)x;return result;
 elsif p_operation='find_watch' then
  select to_jsonb(w)||jsonb_build_object('provider',c.provider) into result from private.calendar_watches w join public.calendar_connections c on c.id=w.connection_id where w.subscription_id=p_payload->>'subscription_id' and w.expires_at>clock_timestamp() and private.active_team_user(c.team_id,c.user_id);return result;
 end if;
 if not exists(select 1 from public.calendar_connections c where c.id=p_connection_id and private.active_team_user(c.team_id,c.user_id)) then raise exception 'Conexão indisponível' using errcode='42501';end if;
 if p_operation='get_watch' then select to_jsonb(w) into result from private.calendar_watches w where connection_id=p_connection_id;return result;
 elsif p_operation='save_watch' then
  insert into private.calendar_watches(connection_id,subscription_id,resource_id,token_hash,expires_at) values(p_connection_id,p_payload->>'subscription_id',p_payload->>'resource_id',p_payload->>'token_hash',(p_payload->>'expires_at')::timestamptz)
  on conflict(connection_id) do update set subscription_id=excluded.subscription_id,resource_id=excluded.resource_id,token_hash=excluded.token_hash,expires_at=excluded.expires_at;
 elsif p_operation='queue' then insert into private.calendar_jobs(connection_id) values(p_connection_id) on conflict(connection_id) do update set requested_at=clock_timestamp(),next_attempt_at=clock_timestamp(),attempts=0;
 elsif p_operation='done' then delete from private.calendar_jobs where connection_id=p_connection_id and requested_at<=(p_payload->>'requested_at')::timestamptz;
 elsif p_operation='retry' then update private.calendar_jobs set attempts=least(attempts+1,10),next_attempt_at=clock_timestamp()+make_interval(mins=>least(60,power(2,least(attempts,5))::integer)) where connection_id=p_connection_id;
 else raise exception 'Operação inválida' using errcode='22023';end if;return null;
end $$;
create function public.calendar_worker_dispatch(p_connection_id uuid,p_operation text,p_arguments jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare connection public.calendar_connections;previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;a jsonb:=p_arguments;begin
 select * into connection from public.calendar_connections where id=p_connection_id;
 if not found or not private.active_team_user(connection.team_id,connection.user_id) then raise exception 'Conexão indisponível' using errcode='42501';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',connection.user_id,'role','authenticated','aal','aal2')::text,true);
 case p_operation
 when 'calendar_connection_secret' then result:=to_jsonb(public.calendar_connection_secret(connection.id));
 when 'claim_calendar_sync' then result:=to_jsonb(public.claim_calendar_sync(connection.id));
 when 'release_calendar_sync' then perform public.release_calendar_sync(connection.id,(a->>'p_token')::uuid);
 when 'save_calendar_connection' then
  if(a->>'p_team_id')::uuid<>connection.team_id or a->>'p_provider'<>connection.provider or a->>'p_calendar_id'<>connection.calendar_id then raise exception 'Conexão inválida' using errcode='42501';end if;
  result:=to_jsonb(public.save_calendar_connection(connection.team_id,connection.provider,connection.calendar_id,a->>'p_ciphertext'));
 when 'apply_calendar_event' then result:=to_jsonb(public.apply_calendar_event(connection.id,a->>'p_title',(a->>'p_starts_at')::timestamptz,(a->>'p_ends_at')::timestamptz,coalesce(a->>'p_description',''),(a->>'p_event_id')::uuid,(a->>'p_expected_updated_at')::timestamptz,coalesce((a->>'p_cancelled')::boolean,false)));
 when 'save_calendar_event_link' then perform public.save_calendar_event_link(connection.id,(a->>'p_event_id')::uuid,a->>'p_external_id',a->>'p_external_updated_at',(a->>'p_hub_updated_at')::timestamptz);
 else raise exception 'Operação inválida' using errcode='22023';end case;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end $$;
revoke all on function public.calendar_background(text,uuid,jsonb),public.calendar_worker_dispatch(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_background(text,uuid,jsonb),public.calendar_worker_dispatch(uuid,text,jsonb) to service_role;
grant select on public.calendar_connections,public.calendar_event_links,public.events to service_role;
commit;
