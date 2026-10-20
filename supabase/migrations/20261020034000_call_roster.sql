begin;
create function public.call_channel_roster(p_channel_id uuid) returns table(user_id uuid)
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_mfa();
 if not private.can_access_channel(p_channel_id) or not exists(select 1 from public.channels where id=p_channel_id and archived_at is null) then raise exception 'Acesso negado' using errcode='42501';end if;
 return query select m.user_id from public.channel_members m join public.channels c on c.id=m.channel_id where m.channel_id=p_channel_id and private.active_team_user(c.team_id,m.user_id);
end $$;
revoke all on function public.call_channel_roster(uuid) from public,anon,authenticated;
grant execute on function public.call_channel_roster(uuid) to authenticated;
commit;
