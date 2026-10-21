-- Hub: fundação e MVP. Aplicar em um projeto Supabase novo.
-- auth.*, realtime.* e os papéis anon/authenticated/service_role são do Supabase.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.workspace_role as enum ('admin', 'member');
create type public.team_role as enum ('leader', 'member');
create type public.channel_kind as enum ('public', 'private', 'dm');
create type public.channel_role as enum ('moderator', 'member');
create type public.event_kind as enum ('event', 'meeting');
create type public.attendance_response as enum ('pending', 'accepted', 'tentative', 'declined');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  avatar_url text check (char_length(avatar_url) <= 2048),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id),
  user_id uuid not null references public.profiles(id),
  role public.workspace_role not null default 'member',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create table public.team_members (
  workspace_id uuid not null,
  team_id uuid not null,
  user_id uuid not null,
  role public.team_role not null default 'member',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id),
  foreign key (workspace_id, team_id) references public.teams(workspace_id, id),
  foreign key (workspace_id, user_id) references public.workspace_members(workspace_id, user_id)
);

create table public.member_statuses (
  team_id uuid not null,
  user_id uuid not null,
  body text not null default '' check (char_length(body) <= 160),
  emoji text check (char_length(emoji) <= 32),
  expires_at timestamptz,
  timer_running boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id),
  foreign key (team_id, user_id) references public.team_members(team_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 10000),
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, id)
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  kind public.channel_kind not null,
  name text,
  dm_user_low uuid,
  dm_user_high uuid,
  last_message_ordinal bigint not null default 0 check (last_message_ordinal >= 0),
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, id),
  unique (team_id, dm_user_low, dm_user_high),
  foreign key (team_id, dm_user_low) references public.team_members(team_id, user_id),
  foreign key (team_id, dm_user_high) references public.team_members(team_id, user_id),
  check (
    (kind = 'dm' and name is null and dm_user_low is not null
      and dm_user_high is not null and dm_user_low < dm_user_high)
    or (kind <> 'dm' and char_length(btrim(name)) between 1 and 80
      and name is not null and dm_user_low is null and dm_user_high is null)
  )
);
-- Nomes privados não são um diretório consultável por colisões de unicidade.
create unique index channels_named_unique on public.channels (team_id, lower(name)) where kind = 'public';

create table public.channel_members (
  team_id uuid not null,
  channel_id uuid not null,
  user_id uuid not null,
  role public.channel_role not null default 'member',
  last_read_ordinal bigint not null default 0 check (last_read_ordinal >= 0),
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id),
  foreign key (team_id, channel_id) references public.channels(team_id, id),
  foreign key (team_id, user_id) references public.team_members(team_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  channel_id uuid not null,
  author_id uuid not null,
  client_id uuid not null,
  ordinal bigint not null check (ordinal > 0),
  body text not null check (char_length(body) <= 10000),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, channel_id) references public.channels(team_id, id),
  foreign key (team_id, author_id) references public.team_members(team_id, user_id),
  unique (channel_id, ordinal),
  unique (channel_id, author_id, client_id),
  unique (team_id, channel_id, id),
  check (deleted_at is not null or char_length(btrim(body)) > 0)
);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  user_id uuid not null,
  project_id uuid,
  description text not null default '' check (char_length(description) <= 2000),
  source text not null check (source in ('timer', 'manual')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds bigint generated always as (
    case when ended_at is not null then floor(extract(epoch from (ended_at - started_at)))::bigint end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, user_id) references public.team_members(team_id, user_id),
  foreign key (team_id, project_id) references public.projects(team_id, id),
  check (ended_at is null or ended_at > started_at),
  check (source <> 'manual' or ended_at is not null)
);
-- Um timer por pessoa, mesmo quando ela pertence a vários times/organizações.
create unique index time_entries_one_running on public.time_entries(user_id) where ended_at is null;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  kind public.event_kind not null default 'event',
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'UTC',
  call_url text check (call_url is null or (char_length(call_url) <= 2048 and call_url ~ '^https://')),
  cancelled_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, id),
  check (ends_at > starts_at)
);

create table public.event_attendees (
  team_id uuid not null,
  event_id uuid not null,
  user_id uuid not null,
  response public.attendance_response not null default 'pending',
  responded_at timestamptz,
  primary key (event_id, user_id),
  foreign key (team_id, event_id) references public.events(team_id, id),
  foreign key (team_id, user_id) references public.team_members(team_id, user_id)
);

create index workspaces_creator_idx on public.workspaces(created_by);
create index workspace_members_user_idx on public.workspace_members(user_id, workspace_id);
create index teams_workspace_idx on public.teams(workspace_id);
create index teams_creator_idx on public.teams(created_by);
create index team_members_workspace_team_idx on public.team_members(workspace_id, team_id);
create index team_members_workspace_user_idx on public.team_members(workspace_id, user_id);
create index team_members_user_idx on public.team_members(user_id, team_id) where is_active;
create index projects_creator_idx on public.projects(created_by);
create index channels_creator_idx on public.channels(created_by);
create index channels_dm_high_idx on public.channels(team_id, dm_user_high);
create index channel_members_team_channel_idx on public.channel_members(team_id, channel_id);
create index channel_members_team_user_idx on public.channel_members(team_id, user_id);
create index channel_members_user_idx on public.channel_members(user_id, channel_id);
create index messages_author_idx on public.messages(team_id, author_id);
create index time_entries_team_user_idx on public.time_entries(team_id, user_id, started_at desc);
create index time_entries_user_history_idx on public.time_entries(user_id, started_at desc);
create index time_entries_project_idx on public.time_entries(team_id, project_id);
create index events_creator_idx on public.events(created_by);
create index events_team_start_idx on public.events(team_id, starts_at);
create index event_attendees_team_event_idx on public.event_attendees(team_id, event_id);
create index event_attendees_team_user_idx on public.event_attendees(team_id, user_id);
create index event_attendees_user_idx on public.event_attendees(user_id, event_id);

create function private.bump_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','workspaces','teams','member_statuses','projects','channels','messages','time_entries','events'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.bump_updated_at()', table_name);
  end loop;
end;
$$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Membro'), 80))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger hub_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();
insert into public.profiles(id, display_name)
select id, left(coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), 'Membro'), 80)
from auth.users on conflict (id) do nothing;

-- Helpers com owner confiável e search_path vazio evitam recursão de RLS.
-- Não aceitam um actor_id do cliente: o ator sempre vem de auth.uid().
create function private.has_mfa() returns boolean
language sql stable set search_path = '' as $$
  select auth.uid() is not null and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create function private.require_mfa() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if not private.has_mfa() then
    raise exception 'MFA obrigatório' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

create function private.is_workspace_member(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_mfa() and exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid() and m.is_active
  );
$$;

create function private.is_workspace_admin(p_workspace_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_mfa() and exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid() and m.is_active and m.role = 'admin'
  );
$$;

create function private.active_team_user(p_team_id uuid, p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.team_members tm join public.workspace_members wm
      on wm.workspace_id = tm.workspace_id and wm.user_id = tm.user_id
    where tm.team_id = p_team_id and tm.user_id = p_user_id and tm.is_active and wm.is_active
  );
$$;

create function private.is_team_participant(p_team_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_mfa() and private.active_team_user(p_team_id, auth.uid());
$$;

create function private.can_access_team(p_team_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_mfa() and exists (
    select 1 from public.teams t where t.id = p_team_id
    and (private.is_workspace_admin(t.workspace_id) or private.is_team_participant(t.id))
  );
$$;

create function private.can_manage_team(p_team_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_mfa() and exists (
    select 1 from public.teams t where t.id = p_team_id and (
      private.is_workspace_admin(t.workspace_id) or
      (private.is_team_participant(t.id) and exists (
        select 1 from public.team_members tm where tm.team_id = t.id
          and tm.user_id = auth.uid() and tm.role = 'leader'
      ))
    )
  );
$$;

create function private.can_view_profile(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_mfa() and exists (
    select 1 from public.workspace_members mine join public.workspace_members theirs
      on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id and mine.is_active and theirs.is_active
  );
$$;

create function private.can_access_channel(p_channel_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_mfa() and exists (
    select 1 from public.channel_members cm where cm.channel_id = p_channel_id
      and cm.user_id = auth.uid() and private.active_team_user(cm.team_id, cm.user_id)
  );
$$;

create function private.can_moderate_channel(p_channel_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.can_access_channel(p_channel_id) and exists (
    select 1 from public.channel_members cm where cm.channel_id = p_channel_id
      and cm.user_id = auth.uid() and cm.role = 'moderator'
  );
$$;

-- Todos os dados colaborativos exigem AAL2. O perfil próprio é a exceção
-- necessária para a tela de onboarding/MFA, sem e-mail ou segredo de autenticação.
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','workspaces','workspace_members','teams','team_members','member_statuses','projects','channels','channel_members','messages','time_entries','events','event_attendees'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);
  end loop;
end;
$$;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.can_view_profile(id));
grant update (display_name, avatar_url) on public.profiles to authenticated;
create policy profiles_update_own on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy workspaces_read on public.workspaces for select to authenticated
using (private.is_workspace_member(id));
create policy workspace_members_read on public.workspace_members for select to authenticated
using (private.is_workspace_member(workspace_id));
create policy teams_read on public.teams for select to authenticated
using (private.can_access_team(id));
create policy team_members_read on public.team_members for select to authenticated
using (private.can_access_team(team_id));
create policy member_statuses_read on public.member_statuses for select to authenticated
using (private.can_access_team(team_id));
create policy projects_read on public.projects for select to authenticated
using (private.can_access_team(team_id));
create policy channels_read on public.channels for select to authenticated
using (private.can_access_channel(id) or (kind = 'public' and private.is_team_participant(team_id)));
create policy channel_members_read on public.channel_members for select to authenticated
using (private.can_access_channel(channel_id));
create policy messages_read on public.messages for select to authenticated
using (private.can_access_channel(channel_id));
create policy time_entries_read on public.time_entries for select to authenticated
using (private.can_access_team(team_id) and (user_id = (select auth.uid()) or private.can_manage_team(team_id)));
create policy events_read on public.events for select to authenticated
using (private.can_access_team(team_id));
create policy event_attendees_read on public.event_attendees for select to authenticated
using (private.can_access_team(team_id));

-- As mutações restantes são RPCs: identidade/escopo imutáveis e validação
-- transacional. Sem grants de INSERT/UPDATE/DELETE para o navegador.

create function public.create_workspace(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); result uuid;
begin
  insert into public.workspaces(name, created_by) values (btrim(p_name), actor) returning id into result;
  insert into public.workspace_members(workspace_id, user_id, role) values (result, actor, 'admin');
  return result;
end;
$$;

create function public.set_workspace_member(
  p_workspace_id uuid, p_user_id uuid, p_role public.workspace_role, p_is_active boolean default true
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa();
  perform 1 from public.workspaces where id = p_workspace_id for update;
  if not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Usuário não cadastrado' using errcode = '22023'; end if;
  if (not p_is_active or p_role <> 'admin') and exists (
    select 1 from public.workspace_members where workspace_id = p_workspace_id
      and user_id = p_user_id and role = 'admin' and is_active
  ) and not exists (
    select 1 from public.workspace_members where workspace_id = p_workspace_id
      and user_id <> p_user_id and role = 'admin' and is_active
  ) then raise exception 'A organização precisa de um admin ativo' using errcode = '23514'; end if;
  insert into public.workspace_members(workspace_id, user_id, role, is_active)
  values (p_workspace_id, p_user_id, p_role, p_is_active)
  on conflict (workspace_id, user_id) do update set role = excluded.role, is_active = excluded.is_active;
  if not p_is_active then
    update public.time_entries te set ended_at = greatest(clock_timestamp(), te.started_at + interval '1 microsecond')
    from public.teams t where te.team_id = t.id and t.workspace_id = p_workspace_id
      and te.user_id = p_user_id and te.ended_at is null;
  end if;
end;
$$;

create function public.create_team(p_workspace_id uuid, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); result uuid;
begin
  if not private.is_workspace_admin(p_workspace_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  insert into public.teams(workspace_id, name, created_by)
  values (p_workspace_id, btrim(p_name), actor) returning id into result;
  insert into public.team_members(workspace_id, team_id, user_id, role) values (p_workspace_id, result, actor, 'leader');
  insert into public.member_statuses(team_id, user_id) values (result, actor);
  return result;
end;
$$;

create function public.set_team_member(
  p_team_id uuid, p_user_id uuid, p_role public.team_role, p_is_active boolean default true
) returns void
language plpgsql security definer set search_path = '' as $$
declare workspace uuid;
begin
  perform private.require_mfa();
  select workspace_id into workspace from public.teams where id = p_team_id;
  perform 1 from public.workspaces where id = workspace for update;
  if not private.is_workspace_admin(workspace) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not exists (select 1 from public.workspace_members where workspace_id = workspace and user_id = p_user_id and is_active) then
    raise exception 'O usuário precisa pertencer à organização' using errcode = '22023';
  end if;
  insert into public.team_members(workspace_id, team_id, user_id, role, is_active)
  values (workspace, p_team_id, p_user_id, p_role, p_is_active)
  on conflict (team_id, user_id) do update set role = excluded.role, is_active = excluded.is_active;
  insert into public.member_statuses(team_id, user_id) values (p_team_id, p_user_id) on conflict do nothing;
  if not p_is_active then
    update public.time_entries set ended_at = greatest(clock_timestamp(), started_at + interval '1 microsecond')
    where team_id = p_team_id and user_id = p_user_id and ended_at is null;
  end if;
end;
$$;

create function public.touch_last_seen() returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa();
begin
  update public.profiles set last_seen_at = clock_timestamp() where id = actor;
end;
$$;

create function public.set_work_status(p_team_id uuid, p_body text, p_emoji text default null, p_expires_at timestamptz default null) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa();
begin
  if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  insert into public.member_statuses(team_id, user_id, body, emoji, expires_at)
  values (p_team_id, actor, p_body, p_emoji, p_expires_at)
  on conflict (team_id, user_id) do update set body = excluded.body, emoji = excluded.emoji, expires_at = excluded.expires_at;
end;
$$;

create function public.save_project(
  p_team_id uuid, p_name text, p_description text default '', p_project_id uuid default null, p_archived boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); result uuid;
begin
  if not private.can_manage_team(p_team_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  if p_project_id is null then
    insert into public.projects(team_id, name, description, created_by, archived_at)
    values (p_team_id, btrim(p_name), p_description, actor, case when p_archived then clock_timestamp() end)
    returning id into result;
  else
    update public.projects set name = btrim(p_name), description = p_description,
      archived_at = case when p_archived then coalesce(archived_at, clock_timestamp()) end
    where id = p_project_id and team_id = p_team_id returning id into result;
    if not found then raise exception 'Projeto não encontrado' using errcode = '22023'; end if;
  end if;
  return result;
end;
$$;

create function public.create_channel(
  p_team_id uuid, p_name text, p_kind public.channel_kind default 'public', p_member_ids uuid[] default '{}'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); result uuid; member_id uuid;
begin
  if not private.is_team_participant(p_team_id) or not private.can_manage_team(p_team_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if p_kind = 'dm' then raise exception 'Use open_dm para mensagens diretas' using errcode = '22023'; end if;
  insert into public.channels(team_id, name, kind, created_by)
  values (p_team_id, btrim(p_name), p_kind, actor) returning id into result;
  insert into public.channel_members(team_id, channel_id, user_id, role) values (p_team_id, result, actor, 'moderator');
  foreach member_id in array coalesce(p_member_ids, '{}'::uuid[]) loop
    if not private.active_team_user(p_team_id, member_id) then
      raise exception 'Participante fora do time' using errcode = '22023';
    end if;
    insert into public.channel_members(team_id, channel_id, user_id)
    values (p_team_id, result, member_id) on conflict do nothing;
  end loop;
  return result;
end;
$$;

create function public.join_public_channel(p_channel_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); channel public.channels;
begin
  select * into channel from public.channels where id = p_channel_id for update;
  if not found or channel.kind <> 'public' or channel.archived_at is not null
    or not private.is_team_participant(channel.team_id) then
    raise exception 'Canal indisponível' using errcode = '42501';
  end if;
  insert into public.channel_members(team_id, channel_id, user_id)
  values (channel.team_id, channel.id, actor) on conflict do nothing;
end;
$$;

create function public.set_channel_member(p_channel_id uuid, p_user_id uuid, p_role public.channel_role default 'member') returns void
language plpgsql security definer set search_path = '' as $$
declare channel public.channels;
begin
  perform private.require_mfa();
  select * into channel from public.channels where id = p_channel_id for update;
  if not private.can_moderate_channel(p_channel_id) or channel.kind = 'dm' then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if not private.active_team_user(channel.team_id, p_user_id) then
    raise exception 'Participante fora do time' using errcode = '22023';
  end if;
  if p_role <> 'moderator' and exists (
    select 1 from public.channel_members where channel_id = p_channel_id and user_id = p_user_id and role = 'moderator'
  ) and not exists (
    select 1 from public.channel_members where channel_id = p_channel_id and user_id <> p_user_id and role = 'moderator'
      and private.active_team_user(channel.team_id, user_id)
  ) then raise exception 'O canal precisa de um moderador' using errcode = '23514'; end if;
  insert into public.channel_members(team_id, channel_id, user_id, role)
  values (channel.team_id, channel.id, p_user_id, p_role)
  on conflict (channel_id, user_id) do update set role = excluded.role;
end;
$$;

create function public.remove_channel_member(p_channel_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); channel public.channels;
begin
  select * into channel from public.channels where id = p_channel_id for update;
  if not private.can_access_channel(p_channel_id) or channel.kind = 'dm'
    or (p_user_id <> actor and not private.can_moderate_channel(p_channel_id)) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if exists (select 1 from public.channel_members where channel_id = p_channel_id and user_id = p_user_id and role = 'moderator')
    and not exists (select 1 from public.channel_members where channel_id = p_channel_id and user_id <> p_user_id and role = 'moderator'
      and private.active_team_user(channel.team_id, user_id)) then
    raise exception 'O canal precisa de um moderador' using errcode = '23514';
  end if;
  delete from public.channel_members where channel_id = p_channel_id and user_id = p_user_id;
end;
$$;

create function public.recover_channel_moderator(p_channel_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare channel public.channels; workspace uuid;
begin
  perform private.require_mfa();
  select * into channel from public.channels where id = p_channel_id for update;
  select workspace_id into workspace from public.teams where id = channel.team_id;
  if not private.is_workspace_admin(workspace) or channel.kind = 'dm' or exists (
    select 1 from public.channel_members cm where cm.channel_id = channel.id and cm.role = 'moderator'
      and private.active_team_user(channel.team_id, cm.user_id)
  ) then raise exception 'Acesso negado ou canal já possui moderador ativo' using errcode = '42501'; end if;
  -- Recuperar moderação não adiciona ninguém ao canal nem expõe seu conteúdo.
  if not private.active_team_user(channel.team_id, p_user_id) or not exists (
    select 1 from public.channel_members where channel_id = channel.id and user_id = p_user_id
  ) then raise exception 'Escolha um participante ativo do canal' using errcode = '22023'; end if;
  update public.channel_members set role = 'moderator' where channel_id = channel.id and user_id = p_user_id;
end;
$$;

create function public.set_channel_archived(p_channel_id uuid, p_archived boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa();
  perform 1 from public.channels where id = p_channel_id for update;
  if not private.can_moderate_channel(p_channel_id)
    or exists (select 1 from public.channels where id = p_channel_id and kind = 'dm') then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  update public.channels set archived_at = case when p_archived then coalesce(archived_at, clock_timestamp()) end
  where id = p_channel_id;
end;
$$;

create function public.open_dm(p_team_id uuid, p_other_user_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); low_user uuid; high_user uuid; result uuid;
begin
  if not private.is_team_participant(p_team_id) or not private.active_team_user(p_team_id, p_other_user_id)
    or p_other_user_id = actor then raise exception 'Participante inválido' using errcode = '42501'; end if;
  low_user := least(actor, p_other_user_id); high_user := greatest(actor, p_other_user_id);
  -- Lock exclusivo do par, sem bloquear todas as conversas ou FKs do time.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_team_id::text || ':' || low_user::text || ':' || high_user::text, 0
  ));
  select id into result from public.channels where team_id = p_team_id and dm_user_low = low_user and dm_user_high = high_user;
  if result is not null then return result; end if;
  insert into public.channels(team_id, kind, dm_user_low, dm_user_high, created_by)
  values (p_team_id, 'dm', low_user, high_user, actor) returning id into result;
  insert into public.channel_members(team_id, channel_id, user_id)
  values (p_team_id, result, low_user), (p_team_id, result, high_user);
  return result;
end;
$$;

create function public.send_message(p_channel_id uuid, p_client_id uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); channel public.channels; result uuid; next_ordinal bigint;
begin
  select * into channel from public.channels where id = p_channel_id for update;
  if not private.can_access_channel(p_channel_id) or channel.archived_at is not null then
    raise exception 'Canal indisponível' using errcode = '42501';
  end if;
  select id into result from public.messages where channel_id = p_channel_id and author_id = actor and client_id = p_client_id;
  if result is not null then return result; end if;
  -- O lock dura até o commit: o cursor não perde mensagens por ordem de commit.
  update public.channels set last_message_ordinal = last_message_ordinal + 1
  where id = p_channel_id returning last_message_ordinal into next_ordinal;
  insert into public.messages(team_id, channel_id, author_id, client_id, ordinal, body)
  values (channel.team_id, channel.id, actor, p_client_id, next_ordinal, p_body) returning id into result;
  return result;
end;
$$;

create function public.edit_message(p_message_id uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); channel public.channels;
begin
  select c.* into channel from public.channels c join public.messages m on m.channel_id = c.id
  where m.id = p_message_id for update of c;
  if not private.can_access_channel(channel.id) or channel.archived_at is not null then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  update public.messages set body = p_body where id = p_message_id and author_id = actor and deleted_at is null;
  if not found then raise exception 'Acesso negado' using errcode = '42501'; end if;
end;
$$;

create function public.delete_message(p_message_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); channel public.channels; author uuid;
begin
  select c.* into channel from public.channels c join public.messages m on m.channel_id = c.id
  where m.id = p_message_id for update of c;
  select author_id into author from public.messages where id = p_message_id;
  if not private.can_access_channel(channel.id) or (actor <> author and not private.can_moderate_channel(channel.id)) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  update public.messages set body = '', deleted_at = coalesce(deleted_at, clock_timestamp()) where id = p_message_id;
end;
$$;

create function public.mark_channel_read(p_channel_id uuid, p_through_ordinal bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); max_ordinal bigint;
begin
  if not private.can_access_channel(p_channel_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  if p_through_ordinal is null or p_through_ordinal < 0 then raise exception 'Cursor inválido' using errcode = '22023'; end if;
  select last_message_ordinal into max_ordinal from public.channels where id = p_channel_id;
  update public.channel_members set last_read_ordinal = greatest(last_read_ordinal, least(p_through_ordinal, max_ordinal))
  where channel_id = p_channel_id and user_id = actor;
end;
$$;

create view public.channel_unread_counts with (security_invoker = true) as
select cm.team_id, cm.channel_id, cm.user_id, cm.last_read_ordinal,
  count(m.id) as unread_count
from public.channel_members cm
left join public.messages m on m.channel_id = cm.channel_id and m.ordinal > cm.last_read_ordinal
  and m.author_id <> cm.user_id and m.deleted_at is null
where cm.user_id = (select auth.uid())
group by cm.team_id, cm.channel_id, cm.user_id, cm.last_read_ordinal;
revoke all on public.channel_unread_counts from public, anon, authenticated;
grant select on public.channel_unread_counts to authenticated;

create function private.validate_project(p_team_id uuid, p_project_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_project_id is not null and not exists (
    select 1 from public.projects where id = p_project_id and team_id = p_team_id and archived_at is null
  ) then raise exception 'Projeto indisponível neste time' using errcode = '22023'; end if;
end;
$$;

create function private.validate_time_range(p_user_id uuid, p_start timestamptz, p_end timestamptz, p_exclude_id uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_start is null or p_end is null or p_end <= p_start or p_end > clock_timestamp() then
    raise exception 'Intervalo inválido ou no futuro' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.time_entries te where te.user_id = p_user_id
      and (p_exclude_id is null or te.id <> p_exclude_id)
      and te.started_at < p_end and (te.ended_at is null or te.ended_at > p_start)
  ) then raise exception 'O intervalo se sobrepõe a outro registro' using errcode = '23P01'; end if;
end;
$$;

create function private.sync_timer_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.member_statuses(team_id, user_id, timer_running)
  values (new.team_id, new.user_id, exists (
    select 1 from public.time_entries where team_id = new.team_id and user_id = new.user_id and ended_at is null
  )) on conflict (team_id, user_id) do update set timer_running = excluded.timer_running;
  return new;
end;
$$;
create trigger sync_timer_status after insert or update on public.time_entries
for each row execute function private.sync_timer_status();

create function public.start_timer(p_team_id uuid, p_project_id uuid default null, p_description text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); active public.time_entries; result uuid;
begin
  -- Todas as mutações de horas do usuário usam o mesmo lock, inclusive revogação.
  perform 1 from public.profiles where id = actor for update;
  if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  perform private.validate_project(p_team_id, p_project_id);
  select * into active from public.time_entries where user_id = actor and ended_at is null;
  if found then
    if active.team_id = p_team_id and active.project_id is not distinct from p_project_id and active.description = p_description then
      return active.id;
    end if;
    raise exception 'Já existe um timer em execução' using errcode = '23505';
  end if;
  insert into public.time_entries(team_id, user_id, project_id, description, source, started_at)
  values (p_team_id, actor, p_project_id, p_description, 'timer', clock_timestamp()) returning id into result;
  return result;
end;
$$;

create function public.stop_timer(p_entry_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); entry public.time_entries;
begin
  perform 1 from public.profiles where id = actor for update;
  select * into entry from public.time_entries where id = p_entry_id and user_id = actor;
  if not found or entry.source <> 'timer' or not private.can_access_team(entry.team_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if entry.ended_at is not null then return entry.id; end if;
  update public.time_entries set ended_at = greatest(clock_timestamp(), started_at + interval '1 microsecond') where id = entry.id;
  return entry.id;
end;
$$;

create function public.add_manual_time_entry(
  p_team_id uuid, p_started_at timestamptz, p_ended_at timestamptz,
  p_project_id uuid default null, p_description text default ''
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); result uuid;
begin
  perform 1 from public.profiles where id = actor for update;
  if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  perform private.validate_project(p_team_id, p_project_id);
  perform private.validate_time_range(actor, p_started_at, p_ended_at);
  insert into public.time_entries(team_id, user_id, project_id, description, source, started_at, ended_at)
  values (p_team_id, actor, p_project_id, p_description, 'manual', p_started_at, p_ended_at) returning id into result;
  return result;
end;
$$;

create function public.edit_time_entry(
  p_entry_id uuid, p_started_at timestamptz, p_ended_at timestamptz,
  p_project_id uuid default null, p_description text default ''
) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); entry public.time_entries;
begin
  perform 1 from public.profiles where id = actor for update;
  select * into entry from public.time_entries where id = p_entry_id and user_id = actor;
  if not found or entry.ended_at is null or not private.is_team_participant(entry.team_id) then
    raise exception 'Registro indisponível para edição' using errcode = '42501';
  end if;
  if p_project_id is distinct from entry.project_id then perform private.validate_project(entry.team_id, p_project_id); end if;
  perform private.validate_time_range(actor, p_started_at, p_ended_at, entry.id);
  update public.time_entries set started_at = p_started_at, ended_at = p_ended_at,
    project_id = p_project_id, description = p_description where id = entry.id;
end;
$$;

create function private.can_manage_event(p_event_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.events e where e.id = p_event_id
    and private.can_access_team(e.team_id) and (e.created_by = auth.uid() or private.can_manage_team(e.team_id)));
$$;

create function public.save_event(
  p_team_id uuid, p_title text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_kind public.event_kind default 'event', p_description text default '',
  p_call_url text default null, p_timezone text default 'UTC', p_event_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); result uuid;
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Fuso horário IANA inválido' using errcode = '22023';
  end if;
  if p_event_id is null then
    if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
    insert into public.events(team_id, title, starts_at, ends_at, kind, description, call_url, timezone, created_by)
    values (p_team_id, btrim(p_title), p_starts_at, p_ends_at, p_kind, p_description, p_call_url, p_timezone, actor)
    returning id into result;
    insert into public.event_attendees(team_id, event_id, user_id, response, responded_at)
    values (p_team_id, result, actor, 'accepted', clock_timestamp());
  else
    perform 1 from public.events where id = p_event_id for update;
    if not private.can_manage_event(p_event_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
    update public.events set title = btrim(p_title), starts_at = p_starts_at, ends_at = p_ends_at,
      kind = p_kind, description = p_description, call_url = p_call_url, timezone = p_timezone
    where id = p_event_id and team_id = p_team_id and cancelled_at is null returning id into result;
    if not found then raise exception 'Evento indisponível' using errcode = '22023'; end if;
  end if;
  return result;
end;
$$;

create function public.cancel_event(p_event_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_mfa();
  perform 1 from public.events where id = p_event_id for update;
  if not private.can_manage_event(p_event_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  update public.events set cancelled_at = coalesce(cancelled_at, clock_timestamp()) where id = p_event_id;
end;
$$;

create function public.invite_event_attendee(p_event_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare event public.events;
begin
  perform private.require_mfa();
  select * into event from public.events where id = p_event_id for update;
  if not private.can_manage_event(p_event_id) or event.cancelled_at is not null then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if not private.active_team_user(event.team_id, p_user_id) then raise exception 'Participante fora do time' using errcode = '22023'; end if;
  insert into public.event_attendees(team_id, event_id, user_id) values (event.team_id, event.id, p_user_id)
  on conflict do nothing;
end;
$$;

create function public.respond_to_event(p_event_id uuid, p_response public.attendance_response) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); event public.events;
begin
  select * into event from public.events where id = p_event_id for update;
  if not private.is_team_participant(event.team_id) or event.cancelled_at is not null then
    raise exception 'Evento indisponível' using errcode = '42501';
  end if;
  insert into public.event_attendees(team_id, event_id, user_id, response, responded_at)
  values (event.team_id, event.id, actor, p_response, clock_timestamp())
  on conflict (event_id, user_id) do update set response = excluded.response, responded_at = excluded.responded_at;
end;
$$;

-- O usuário desativado ainda lê a própria associação para a UI detectar
-- revogação via Realtime; nenhum dado colaborativo adicional é exposto.
drop policy workspace_members_read on public.workspace_members;
create policy workspace_members_read on public.workspace_members for select to authenticated
using (private.is_workspace_member(workspace_id) or ((select private.has_mfa()) and user_id = (select auth.uid())));
drop policy team_members_read on public.team_members;
create policy team_members_read on public.team_members for select to authenticated
using (private.can_access_team(team_id) or ((select private.has_mfa()) and user_id = (select auth.uid())));

-- Presence e digitando são efêmeros. Corpos de mensagens usam Postgres Changes,
-- nunca Broadcast (a autorização de um room Realtime pode ficar em cache).
create function private.can_use_realtime_topic(p_topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare parts text[]; resource_id uuid;
begin
  if not private.has_mfa() or p_topic is null then return false; end if;
  parts := string_to_array(p_topic, ':');
  if array_length(parts, 1) <> 3 or parts[2] !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    return false;
  end if;
  resource_id := parts[2]::uuid;
  if parts[1] = 'team' and parts[3] = 'presence' then return private.is_team_participant(resource_id); end if;
  if parts[1] = 'channel' and parts[3] = 'typing' then return private.can_access_channel(resource_id); end if;
  return false;
end;
$$;

-- A tabela pertence ao Supabase; validar o RLS existente sem alterar seu owner.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'realtime' and c.relname = 'messages' and c.relrowsecurity
  ) then raise exception 'Realtime requer RLS habilitado pelo Supabase' using errcode = '55000'; end if;
end;
$$;
create policy hub_realtime_read on realtime.messages for select to authenticated
using (topic = (select realtime.topic()) and private.can_use_realtime_topic((select realtime.topic()))
  and extension in ('broadcast', 'presence'));
create policy hub_realtime_write on realtime.messages for insert to authenticated
with check (topic = (select realtime.topic()) and private.can_use_realtime_topic((select realtime.topic()))
  and extension in ('broadcast', 'presence'));
grant select, insert on realtime.messages to authenticated;

-- Não publicar DELETE físico de dados multitenant: Realtime não filtra DELETE
-- por RLS como filtra INSERT/UPDATE. Mensagens/eventos usam tombstones.
alter publication supabase_realtime add table
  public.channels, public.messages, public.member_statuses, public.projects,
  public.events, public.event_attendees, public.time_entries,
  public.workspace_members, public.team_members;

revoke create on schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.has_mfa(), private.is_workspace_member(uuid), private.can_access_team(uuid),
  private.is_team_participant(uuid), private.can_manage_team(uuid),
  private.can_view_profile(uuid), private.can_access_channel(uuid), private.can_use_realtime_topic(text)
to authenticated;

-- Somente as RPCs deste módulo, sem alterar funções internas do Supabase.
do $$
declare routine record;
begin
  for routine in
    select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) as args
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any(array[
      'create_workspace','set_workspace_member','create_team','set_team_member',
      'touch_last_seen','set_work_status','save_project',
      'create_channel','join_public_channel','set_channel_member','remove_channel_member','recover_channel_moderator','set_channel_archived','open_dm',
      'send_message','edit_message','delete_message','mark_channel_read',
      'start_timer','stop_timer','add_manual_time_entry','edit_time_entry',
      'save_event','cancel_event','invite_event_attendee','respond_to_event'
    ])
  loop
    execute format('revoke all on function %I.%I(%s) from public, anon, authenticated', routine.nspname, routine.proname, routine.args);
    execute format('grant execute on function %I.%I(%s) to authenticated', routine.nspname, routine.proname, routine.args);
  end loop;
end;
$$;

commit;
