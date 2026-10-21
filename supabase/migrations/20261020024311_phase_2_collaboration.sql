begin;

alter table public.messages add column reply_to uuid;
alter table public.messages add constraint messages_thread_scope_fk
  foreign key (team_id, channel_id, reply_to) references public.messages(team_id, channel_id, id);
create index messages_thread_idx on public.messages(channel_id, reply_to, ordinal);

create table public.message_reactions (
  team_id uuid not null, channel_id uuid not null, message_id uuid not null,
  user_id uuid not null references public.profiles(id),
  reaction text not null check (reaction in ('like','heart','celebrate','eyes','check')),
  active boolean not null default true, updated_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction),
  foreign key (team_id, channel_id, message_id) references public.messages(team_id, channel_id, id)
);
create index message_reactions_channel_idx on public.message_reactions(channel_id, message_id);
create index message_reactions_team_idx on public.message_reactions(team_id);
create index message_reactions_user_idx on public.message_reactions(user_id);
create table public.message_pins (
  team_id uuid not null, channel_id uuid not null, message_id uuid primary key,
  pinned_by uuid not null references public.profiles(id), active boolean not null default true,
  updated_at timestamptz not null default now(),
  foreign key (team_id, channel_id, message_id) references public.messages(team_id, channel_id, id)
);
create index message_pins_channel_idx on public.message_pins(channel_id);
create index message_pins_team_idx on public.message_pins(team_id);
create index message_pins_author_idx on public.message_pins(pinned_by);
create table public.attachments (
  id uuid primary key default gen_random_uuid(), team_id uuid not null,
  channel_id uuid not null, message_id uuid,
  created_by uuid not null references public.profiles(id),
  filename text not null check (char_length(filename) between 1 and 240),
  mime_type text not null, byte_size bigint not null check (byte_size between 1 and 26214400),
  object_path text not null unique,
  state text not null default 'pending' check (state in ('pending','ready','removed')),
  created_at timestamptz not null default now(),
  foreign key (team_id, channel_id) references public.channels(team_id, id),
  foreign key (team_id, channel_id, message_id) references public.messages(team_id, channel_id, id)
);
create index attachments_message_idx on public.attachments(channel_id, message_id);
create index attachments_team_idx on public.attachments(team_id);
create index attachments_author_idx on public.attachments(created_by);
create table public.team_notes (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  body text not null default '' check (char_length(body) <= 100000),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id), version integer not null default 1,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index team_notes_team_idx on public.team_notes(team_id, updated_at desc);
create index team_notes_author_idx on public.team_notes(created_by);
create index team_notes_editor_idx on public.team_notes(updated_by);
create table public.standups (
  id uuid primary key default gen_random_uuid(), team_id uuid not null,
  user_id uuid not null, period_on date not null,
  kind text not null check (kind in ('daily','weekly')),
  accomplished text not null default '' check (char_length(accomplished) <= 5000),
  planned text not null default '' check (char_length(planned) <= 5000),
  blockers text not null default '' check (char_length(blockers) <= 5000),
  mood text not null default 'steady' check (mood in ('great','steady','struggling')),
  updated_at timestamptz not null default now(),
  unique(team_id,user_id,period_on,kind),
  foreign key (team_id,user_id) references public.team_members(team_id,user_id)
);
create index standups_team_idx on public.standups(team_id,period_on desc);
create index standups_user_idx on public.standups(user_id);
create table public.meeting_documents (
  event_id uuid primary key references public.events(id), team_id uuid not null references public.teams(id),
  agenda text not null default '' check (char_length(agenda) <= 50000),
  minutes text not null default '' check (char_length(minutes) <= 50000),
  updated_by uuid not null references public.profiles(id), version integer not null default 1,
  updated_at timestamptz not null default now(),
  foreign key (team_id,event_id) references public.events(team_id,id)
);
create index meeting_documents_team_idx on public.meeting_documents(team_id);
create index meeting_documents_editor_idx on public.meeting_documents(updated_by);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
  team_id uuid not null references public.teams(id), channel_id uuid, message_id uuid,
  event_id uuid references public.events(id),
  kind text not null check (kind in ('mention','meeting','timer','absence','shift')),
  dedupe_key text not null, read_at timestamptz, delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,dedupe_key),
  foreign key (team_id,channel_id,message_id) references public.messages(team_id,channel_id,id),
  foreign key (team_id,event_id) references public.events(team_id,id)
);
create index notifications_owner_idx on public.notifications(user_id,created_at desc);
create index notifications_team_idx on public.notifications(team_id);
create index notifications_message_idx on public.notifications(team_id,channel_id,message_id);
create index notifications_event_idx on public.notifications(event_id);
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
  endpoint text not null check (char_length(endpoint) <= 2048 and endpoint ~ '^https://'),
  p256dh text not null check (char_length(p256dh) between 20 and 512),
  auth_key text not null check (char_length(auth_key) between 8 and 512),
  created_at timestamptz not null default now(), unique(user_id,endpoint)
);
create index push_subscriptions_owner_idx on public.push_subscriptions(user_id);

do $$ declare tbl text; begin
  foreach tbl in array array['message_reactions','message_pins','attachments','team_notes','standups','meeting_documents','notifications','push_subscriptions'] loop
    execute format('alter table public.%I enable row level security',tbl);
    execute format('revoke all on public.%I from public, anon, authenticated',tbl);
    execute format('grant select on public.%I to authenticated',tbl);
  end loop;
end $$;
create policy reactions_read on public.message_reactions for select to authenticated using(private.can_access_channel(channel_id));
create policy pins_read on public.message_pins for select to authenticated using(private.can_access_channel(channel_id));
create policy attachments_read on public.attachments for select to authenticated using(
  private.can_access_channel(channel_id) and (created_by=(select auth.uid()) or (state='ready' and exists(select 1 from public.messages m where m.id=message_id and m.deleted_at is null)))
);
create policy notes_read on public.team_notes for select to authenticated using(private.can_access_team(team_id));
create policy standups_read on public.standups for select to authenticated using(private.can_access_team(team_id));
create policy meeting_documents_read on public.meeting_documents for select to authenticated using(private.can_access_team(team_id));
create policy notifications_read on public.notifications for select to authenticated using(
  user_id=(select auth.uid()) and private.can_access_team(team_id) and (channel_id is null or private.can_access_channel(channel_id))
);
create policy push_subscriptions_read on public.push_subscriptions for select to authenticated using(private.has_mfa() and user_id=(select auth.uid()));

create function public.react_to_message(p_message_id uuid,p_reaction text,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); msg public.messages;
begin
 select m.* into msg from public.messages m join public.channels c on c.id=m.channel_id where m.id=p_message_id and m.deleted_at is null and c.archived_at is null;
 if not found or not private.can_access_channel(msg.channel_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
 insert into public.message_reactions(team_id,channel_id,message_id,user_id,reaction,active)
 values(msg.team_id,msg.channel_id,msg.id,actor,p_reaction,p_active)
 on conflict(message_id,user_id,reaction) do update set active=excluded.active,updated_at=clock_timestamp();
end $$;
create function public.pin_message(p_message_id uuid,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); msg public.messages;
begin
 select * into msg from public.messages where id=p_message_id and deleted_at is null;
 if not found or not private.can_access_channel(msg.channel_id) or not private.can_moderate_channel(msg.channel_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
 insert into public.message_pins(team_id,channel_id,message_id,pinned_by,active)
 values(msg.team_id,msg.channel_id,msg.id,actor,p_active)
 on conflict(message_id) do update set active=excluded.active,pinned_by=actor,updated_at=clock_timestamp();
end $$;

create function public.reserve_attachment(p_channel_id uuid,p_filename text,p_mime_type text,p_byte_size bigint) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); channel public.channels; result uuid:=gen_random_uuid();
begin
 select * into channel from public.channels where id=p_channel_id for update;
 if not private.can_access_channel(p_channel_id) or channel.archived_at is not null then raise exception 'Acesso negado' using errcode='42501'; end if;
 if p_mime_type not in ('image/png','image/jpeg','image/webp','image/gif','application/pdf','text/plain','text/csv','application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','audio/webm','audio/ogg','audio/mpeg','audio/mp4') or p_mime_type is null then
  raise exception 'Arquivo não permitido. Use imagem, PDF, documento ou áudio.' using errcode='22023';
 end if;
 insert into public.attachments(id,team_id,channel_id,created_by,filename,mime_type,byte_size,object_path)
 values(result,channel.team_id,channel.id,actor,p_filename,p_mime_type,p_byte_size,channel.team_id::text||'/'||channel.id::text||'/'||result::text);
 return result;
end $$;
create function public.finish_attachment(p_attachment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); item public.attachments;
begin
 select * into item from public.attachments where id=p_attachment_id for update;
 if not found or item.created_by<>actor or not private.can_access_channel(item.channel_id) or item.state='removed' then raise exception 'Acesso negado' using errcode='42501'; end if;
 if not exists(select 1 from storage.objects where bucket_id='hub-files' and name=item.object_path) then raise exception 'Arquivo indisponível. Reenvie o arquivo.' using errcode='22023'; end if;
 update public.attachments set state='ready' where id=item.id;
end $$;
create function public.remove_attachment(p_attachment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); item public.attachments;
begin
 select * into item from public.attachments where id=p_attachment_id for update;
 if not found or not private.can_access_channel(item.channel_id) or (item.created_by<>actor and not private.can_moderate_channel(item.channel_id)) then raise exception 'Acesso negado' using errcode='42501'; end if;
 update public.attachments set state='removed' where id=item.id;
end $$;

create function public.send_rich_message(p_channel_id uuid,p_client_id uuid,p_body text,p_reply_to uuid default null,p_attachment_ids uuid[] default '{}',p_mention_ids uuid[] default '{}',p_mention_channel boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); result uuid; item uuid; channel public.channels; mention uuid; recipients uuid[];
begin
 select * into channel from public.channels where id=p_channel_id for update;
 if not private.can_access_channel(p_channel_id) or channel.archived_at is not null then raise exception 'Acesso negado' using errcode='42501'; end if;
 select id into result from public.messages where channel_id=p_channel_id and author_id=actor and client_id=p_client_id;
 if found then return result; end if;
 if p_reply_to is not null and not exists(select 1 from public.messages where id=p_reply_to and channel_id=p_channel_id and reply_to is null) then raise exception 'Resposta inválida' using errcode='22023'; end if;
 if coalesce(cardinality(p_attachment_ids),0)>10 or coalesce(cardinality(p_mention_ids),0)>100 then raise exception 'Limite de anexos ou menções excedido' using errcode='22023'; end if;
 foreach item in array coalesce(p_attachment_ids,'{}') loop
  perform 1 from public.attachments where id=item and channel_id=p_channel_id and created_by=actor and state='ready' and message_id is null for update;
  if not found then raise exception 'Arquivo indisponível' using errcode='22023'; end if;
 end loop;
 result:=public.send_message(p_channel_id,p_client_id,case when btrim(coalesce(p_body,''))='' and cardinality(p_attachment_ids)>0 then 'Arquivo compartilhado' else p_body end);
 update public.messages set reply_to=p_reply_to where id=result;
 update public.attachments set message_id=result where id=any(coalesce(p_attachment_ids,'{}'));
 recipients:=coalesce(p_mention_ids,'{}');
 if p_mention_channel then
  if not private.can_moderate_channel(p_channel_id) then raise exception 'Somente a moderação pode mencionar o canal inteiro' using errcode='42501'; end if;
  select coalesce(array_agg(cm.user_id),'{}') into recipients from public.channel_members cm where cm.channel_id=p_channel_id;
 end if;
 foreach mention in array recipients loop
  if mention<>actor and private.active_team_user(channel.team_id,mention) and exists(select 1 from public.channel_members where channel_id=p_channel_id and user_id=mention) then
   insert into public.notifications(user_id,team_id,channel_id,message_id,kind,dedupe_key)
   values(mention,channel.team_id,p_channel_id,result,'mention','message:'||result::text) on conflict(user_id,dedupe_key) do nothing;
  end if;
 end loop;
 return result;
end $$;

create function public.save_team_note(p_team_id uuid,p_title text,p_body text,p_note_id uuid default null,p_expected_version integer default null,p_archived boolean default false) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); note public.team_notes; result uuid;
begin
 if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
 if p_note_id is null then
  insert into public.team_notes(team_id,title,body,created_by,updated_by) values(p_team_id,btrim(p_title),p_body,actor,actor) returning id into result;
 else
  select * into note from public.team_notes where id=p_note_id and team_id=p_team_id for update;
  if not found or note.archived_at is not null then raise exception 'Documento indisponível' using errcode='22023'; end if;
  if note.version is distinct from p_expected_version then raise exception 'O documento mudou. Reabra antes de salvar.' using errcode='40001'; end if;
  if p_archived and note.created_by<>actor and not private.can_manage_team(p_team_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  update public.team_notes set title=btrim(p_title),body=p_body,updated_by=actor,version=version+1,updated_at=clock_timestamp(),archived_at=case when p_archived then clock_timestamp() end where id=note.id returning id into result;
 end if;
 return result;
end $$;
create function public.save_standup(p_team_id uuid,p_period_on date,p_kind text,p_accomplished text,p_planned text,p_blockers text,p_mood text default 'steady') returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); result uuid;
begin
 if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
 if p_period_on is null or p_period_on>current_date+1 or p_period_on<current_date-366 then raise exception 'Data do check-in inválida' using errcode='22023'; end if;
 insert into public.standups(team_id,user_id,period_on,kind,accomplished,planned,blockers,mood)
 values(p_team_id,actor,p_period_on,p_kind,p_accomplished,p_planned,p_blockers,p_mood)
 on conflict(team_id,user_id,period_on,kind) do update set accomplished=excluded.accomplished,planned=excluded.planned,blockers=excluded.blockers,mood=excluded.mood,updated_at=clock_timestamp() returning id into result;
 return result;
end $$;
create function public.save_meeting_documents(p_event_id uuid,p_agenda text,p_minutes text,p_expected_version integer default null) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); event public.events; version_now integer;
begin
 select * into event from public.events where id=p_event_id for update;
 if not found or not private.can_manage_event(p_event_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
 select version into version_now from public.meeting_documents where event_id=p_event_id;
 if version_now is distinct from p_expected_version then raise exception 'A pauta ou ata mudou. Reabra antes de salvar.' using errcode='40001'; end if;
 insert into public.meeting_documents(event_id,team_id,agenda,minutes,updated_by)
 values(event.id,event.team_id,p_agenda,p_minutes,actor)
 on conflict(event_id) do update set agenda=excluded.agenda,minutes=excluded.minutes,updated_by=actor,version=public.meeting_documents.version+1,updated_at=clock_timestamp();
end $$;
create function public.mark_notification_read(p_notification_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); begin
 update public.notifications set read_at=coalesce(read_at,clock_timestamp()) where id=p_notification_id and user_id=actor;
end $$;
create function public.register_push_subscription(p_endpoint text,p_p256dh text,p_auth text) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); result uuid; begin
 if p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/' then raise exception 'Endpoint push inválido' using errcode='22023'; end if;
 if (select count(*) from public.push_subscriptions where user_id=actor)>=10 and not exists(select 1 from public.push_subscriptions where user_id=actor and endpoint=p_endpoint) then raise exception 'Limite de dispositivos atingido' using errcode='22023'; end if;
 insert into public.push_subscriptions(user_id,endpoint,p256dh,auth_key) values(actor,p_endpoint,p_p256dh,p_auth)
 on conflict(user_id,endpoint) do update set p256dh=excluded.p256dh,auth_key=excluded.auth_key returning id into result;
 return result;
end $$;
create function public.unregister_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_mfa(); begin
 delete from public.push_subscriptions where user_id=actor and endpoint=p_endpoint;
end $$;

create index messages_body_search_idx on public.messages using gin(to_tsvector('portuguese',body)) where deleted_at is null;
create function public.search_channel_messages(p_channel_id uuid,p_query text,p_before_ordinal bigint default null) returns setof public.messages
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.require_mfa();
 if not private.can_access_channel(p_channel_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
 if char_length(btrim(coalesce(p_query,'')))<2 or char_length(p_query)>200 then return; end if;
 return query select m.* from public.messages m where m.channel_id=p_channel_id and m.deleted_at is null
  and (p_before_ordinal is null or m.ordinal<p_before_ordinal)
  and to_tsvector('portuguese',m.body) @@ websearch_to_tsquery('portuguese',p_query)
  order by m.ordinal desc limit 50;
end $$;

create function private.can_read_hub_file(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_mfa() and exists(select 1 from public.attachments a where a.object_path=p_path and private.can_access_channel(a.channel_id)
  and (a.created_by=auth.uid() or (a.state='ready' and exists(select 1 from public.messages m where m.id=a.message_id and m.deleted_at is null))));
$$;
create function private.can_upload_hub_file(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.has_mfa() and exists(select 1 from public.attachments a join public.channels c on c.id=a.channel_id where a.object_path=p_path and a.created_by=auth.uid() and a.state='pending' and a.message_id is null and c.archived_at is null and private.can_access_channel(a.channel_id));
$$;
revoke all on function private.can_read_hub_file(text),private.can_upload_hub_file(text) from public,anon,authenticated;
grant execute on function private.can_read_hub_file(text),private.can_upload_hub_file(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('hub-files','hub-files',false,26214400,array['image/png','image/jpeg','image/webp','image/gif','application/pdf','text/plain','text/csv','application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','audio/webm','audio/ogg','audio/mpeg','audio/mp4']);
create policy hub_files_read on storage.objects for select to authenticated using(bucket_id='hub-files' and private.can_read_hub_file(name));
create policy hub_files_upload on storage.objects for insert to authenticated with check(bucket_id='hub-files' and private.can_upload_hub_file(name));
create policy hub_files_remove on storage.objects for delete to authenticated using(bucket_id='hub-files' and private.has_mfa() and exists(select 1 from public.attachments a where a.object_path=name and a.created_by=(select auth.uid()) and (a.state='removed' or a.message_id is null) and private.can_access_channel(a.channel_id)));

do $$ declare routine record; begin
 for routine in select p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid) args from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any(array['react_to_message','pin_message','reserve_attachment','finish_attachment','remove_attachment','send_rich_message','save_team_note','save_standup','save_meeting_documents','mark_notification_read','register_push_subscription','unregister_push_subscription','search_channel_messages']) loop
 execute format('revoke all on function public.%I(%s) from public,anon,authenticated',routine.proname,routine.args);
 execute format('grant execute on function public.%I(%s) to authenticated',routine.proname,routine.args);
 end loop;
end $$;
alter publication supabase_realtime add table public.message_reactions,public.message_pins,public.attachments,public.team_notes,public.standups,public.meeting_documents,public.notifications;
commit;
