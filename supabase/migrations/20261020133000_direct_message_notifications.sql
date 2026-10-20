begin;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
 check(kind in ('message','mention','meeting','timer','absence','shift'));

create or replace function public.send_message(p_channel_id uuid,p_client_id uuid,p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa();channel public.channels;result uuid;next_ordinal bigint;
begin
 select * into channel from public.channels where id=p_channel_id for update;
 if not private.can_access_channel(p_channel_id) or channel.archived_at is not null then
  raise exception 'Canal indisponível' using errcode='42501';
 end if;
 select id into result from public.messages where channel_id=p_channel_id and author_id=actor and client_id=p_client_id;
 if result is not null then return result;end if;
 update public.channels set last_message_ordinal=last_message_ordinal+1
 where id=p_channel_id returning last_message_ordinal into next_ordinal;
 insert into public.messages(team_id,channel_id,author_id,client_id,ordinal,body)
 values(channel.team_id,channel.id,actor,p_client_id,next_ordinal,p_body) returning id into result;
 if channel.kind='dm' then
  insert into public.notifications(user_id,team_id,channel_id,message_id,kind,dedupe_key)
  select cm.user_id,channel.team_id,channel.id,result,'message','message:'||result::text
  from public.channel_members cm where cm.channel_id=channel.id and cm.user_id<>actor
  and private.active_team_user(channel.team_id,cm.user_id)
  on conflict(user_id,dedupe_key) do nothing;
 end if;
 return result;
end $$;
revoke all on function public.send_message(uuid,uuid,text) from public,anon;
grant execute on function public.send_message(uuid,uuid,text) to authenticated;
commit;
