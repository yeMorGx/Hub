begin;
create table private.delivery_settings (
 id boolean primary key default true check(id), public_key text not null, private_key text not null, job_secret text not null
);
alter table private.delivery_settings enable row level security;
revoke all on private.delivery_settings from public,anon,authenticated;
grant usage on schema private to service_role;
grant all on private.delivery_settings to service_role;
create function public.delivery_configuration() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('public_key',public_key,'private_key',private_key,'job_secret',job_secret) from private.delivery_settings where id;
$$;
revoke all on function public.delivery_configuration() from public,anon,authenticated;
grant execute on function public.delivery_configuration() to service_role;
alter table public.notifications add column delivery_claimed_at timestamptz;
alter table public.notifications add column delivery_attempts integer not null default 0;
create index notifications_delivery_idx on public.notifications(created_at) where delivered_at is null;
create function public.claim_notification_deliveries(p_message_id uuid default null) returns setof public.notifications
language sql security definer set search_path='' as $$
 with claimed as (
 select id from public.notifications where delivered_at is null and read_at is null and delivery_attempts<4
 and (delivery_claimed_at is null or delivery_claimed_at<clock_timestamp()-interval '5 minutes')
 and (p_message_id is null or message_id=p_message_id)
 order by created_at for update skip locked limit 20
 ) update public.notifications n set delivery_claimed_at=clock_timestamp(),delivery_attempts=delivery_attempts+1
 from claimed c where n.id=c.id returning n.*;
$$;
revoke all on function public.claim_notification_deliveries(uuid) from public,anon,authenticated;
grant execute on function public.claim_notification_deliveries(uuid) to service_role;
grant select,insert,update,delete on public.notifications,public.push_subscriptions to service_role;
grant select on public.messages,public.channel_members,public.team_members,public.workspace_members,public.events,public.event_attendees,public.time_entries,public.teams,public.time_goals to service_role;
create function private.dispatch_notification_job() returns void
language plpgsql security definer set search_path='' as $$
declare secret text;
begin
 select job_secret into secret from private.delivery_settings where id;
 if secret is null then return; end if;
 perform net.http_post(
 url:='https://mjaidgzqsztwygdyzkeq.supabase.co/functions/v1/hub-notifications',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
 body:='{"job":"reminders"}'::jsonb,timeout_milliseconds:=60000);
end $$;
revoke all on function private.dispatch_notification_job() from public,anon,authenticated;
-- Hosted Supabase supports these extensions; the SQL-only test runtime does not.
do $$ begin
 if exists(select 1 from pg_available_extensions where name='pg_net') and exists(select 1 from pg_available_extensions where name='pg_cron') then
  execute 'create extension if not exists pg_net with schema extensions';
  execute 'create extension if not exists pg_cron with schema pg_catalog';
  execute $job$select cron.schedule('hub-notifications','* * * * *','select private.dispatch_notification_job();')$job$;
 end if;
end $$;
commit;
