begin;
create function public.complete_calendar_sync(p_connection_id uuid,p_token uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();begin
 update public.calendar_connections set last_synced_at=clock_timestamp(),sync_token=null,sync_locked_until=null
 where id=p_connection_id and user_id=actor and sync_token=p_token;
 if not found then raise exception 'Sincronização expirada.' using errcode='55000';end if;
end $$;
revoke all on function public.complete_calendar_sync(uuid,uuid) from public,anon,authenticated;
grant execute on function public.complete_calendar_sync(uuid,uuid) to authenticated;

create or replace function public.calendar_worker_dispatch(p_connection_id uuid,p_operation text,p_arguments jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare connection public.calendar_connections;previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;a jsonb:=p_arguments;begin
 select * into connection from public.calendar_connections where id=p_connection_id;
 if not found or not private.active_team_user(connection.team_id,connection.user_id) then raise exception 'Conexão indisponível' using errcode='42501';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',connection.user_id,'role','authenticated','aal','aal2')::text,true);
 case p_operation
 when 'calendar_connection_secret' then result:=to_jsonb(public.calendar_connection_secret(connection.id));
 when 'claim_calendar_sync' then result:=to_jsonb(public.claim_calendar_sync(connection.id));
 when 'release_calendar_sync' then perform public.release_calendar_sync(connection.id,(a->>'p_token')::uuid);
 when 'complete_calendar_sync' then perform public.complete_calendar_sync(connection.id,(a->>'p_token')::uuid);
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
commit;
