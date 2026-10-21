begin;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  project_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  description text not null default '' check (char_length(description) <= 10000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  assignee_id uuid,
  due_on date,
  created_by uuid not null references public.profiles(id),
  version integer not null default 1,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, id),
  foreign key (team_id, project_id) references public.projects(team_id, id),
  foreign key (team_id, assignee_id) references public.team_members(team_id, user_id)
);
create index tasks_team_active_idx on public.tasks(team_id, id) where archived_at is null;
create index tasks_project_idx on public.tasks(team_id, project_id);
create index tasks_assignee_idx on public.tasks(team_id, assignee_id);
create index tasks_creator_idx on public.tasks(created_by);
create trigger set_updated_at before update on public.tasks
for each row execute function private.bump_updated_at();

alter table public.tasks enable row level security;
revoke all on public.tasks from public, anon, authenticated;
grant select on public.tasks to authenticated;
create policy tasks_read on public.tasks for select to authenticated
using (private.can_access_team(team_id));

alter table public.time_entries add column task_id uuid;
alter table public.time_entries add constraint time_entries_task_team_fk
foreign key (team_id, task_id) references public.tasks(team_id, id);
create index time_entries_task_idx on public.time_entries(team_id, task_id) where task_id is not null;

-- All mutations require MFA and active participation; clients cannot choose actor.
-- Members edit tasks they created, own, or that have no assignee. Leaders/admins
-- who participate can edit every card. Admins outside the team remain read-only.
create function public.save_task(
  p_team_id uuid, p_title text, p_description text default '',
  p_project_id uuid default null, p_assignee_id uuid default null,
  p_due_on date default null, p_priority text default 'normal',
  p_task_id uuid default null, p_expected_version integer default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); task public.tasks; result uuid;
begin
  if not private.is_team_participant(p_team_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  if p_task_id is not null then
    select * into task from public.tasks where id = p_task_id and team_id = p_team_id for update;
    if not found or task.archived_at is not null then raise exception 'Tarefa indisponível' using errcode = '22023'; end if;
    if not (task.created_by = actor or task.assignee_id = actor or task.assignee_id is null or private.can_manage_team(p_team_id)) then
      raise exception 'Acesso negado' using errcode = '42501';
    end if;
    if p_expected_version is distinct from task.version then
      raise exception 'A tarefa mudou. Feche e abra novamente antes de salvar.' using errcode = '40001';
    end if;
  end if;
  if p_task_id is null or p_project_id is distinct from task.project_id then
    perform private.validate_project(p_team_id, p_project_id);
  end if;
  if p_assignee_id is not null and (p_task_id is null or p_assignee_id is distinct from task.assignee_id)
    and not private.active_team_user(p_team_id, p_assignee_id) then
    raise exception 'Participante fora do time' using errcode = '22023';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 180
    or p_description is null or char_length(p_description) > 10000
    or p_priority is null or p_priority not in ('low', 'normal', 'high') then
    raise exception 'Tarefa inválida. Confira título, descrição e prioridade.' using errcode = '22023';
  end if;
  if p_task_id is null then
    insert into public.tasks(team_id, project_id, title, description, assignee_id, due_on, priority, created_by)
    values (p_team_id, p_project_id, btrim(p_title), p_description, p_assignee_id, p_due_on, p_priority, actor)
    returning id into result;
  else
    update public.tasks set project_id = p_project_id, title = btrim(p_title), description = p_description,
      assignee_id = p_assignee_id, due_on = p_due_on, priority = p_priority, version = version + 1
    where id = task.id returning id into result;
  end if;
  return result;
end;
$$;

create function public.move_task(p_task_id uuid, p_status text, p_expected_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); task public.tasks;
begin
  select * into task from public.tasks where id = p_task_id for update;
  if not found or not private.is_team_participant(task.team_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  if task.archived_at is not null then raise exception 'Tarefa indisponível' using errcode = '22023'; end if;
  if not (task.created_by = actor or task.assignee_id = actor or task.assignee_id is null or private.can_manage_team(task.team_id)) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if p_expected_version is distinct from task.version then
    raise exception 'A tarefa mudou. Atualize o quadro e tente novamente.' using errcode = '40001';
  end if;
  if p_status is null or p_status not in ('todo', 'in_progress', 'done') then raise exception 'Tarefa inválida' using errcode = '22023'; end if;
  update public.tasks set status = p_status, version = version + 1 where id = task.id;
end;
$$;

create function public.archive_task(p_task_id uuid, p_expected_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); task public.tasks;
begin
  select * into task from public.tasks where id = p_task_id for update;
  if not found or not private.is_team_participant(task.team_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  if not (task.created_by = actor or private.can_manage_team(task.team_id)) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  if task.archived_at is not null then return; end if;
  if p_expected_version is distinct from task.version then
    raise exception 'A tarefa mudou. Feche e abra novamente antes de arquivar.' using errcode = '40001';
  end if;
  update public.tasks set archived_at = clock_timestamp(), version = version + 1 where id = task.id;
end;
$$;

create function public.start_task_timer(p_task_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := private.require_mfa(); task public.tasks; active public.time_entries; result uuid;
begin
  -- Same per-user lock as all existing timer/history mutations.
  perform 1 from public.profiles where id = actor for update;
  select * into task from public.tasks where id = p_task_id for update;
  if not found or not private.is_team_participant(task.team_id) then raise exception 'Acesso negado' using errcode = '42501'; end if;
  select * into active from public.time_entries where user_id = actor and ended_at is null;
  if found then
    if active.task_id = task.id then return active.id; end if;
    raise exception 'Já existe um timer em execução' using errcode = '23505';
  end if;
  if task.archived_at is not null or task.status = 'done' then
    raise exception 'Tarefa indisponível para iniciar. Reabra a tarefa antes.' using errcode = '22023';
  end if;
  perform private.validate_project(task.team_id, task.project_id);
  insert into public.time_entries(team_id, user_id, project_id, task_id, description, source, started_at)
  values (task.team_id, actor, task.project_id, task.id, task.title, 'timer', clock_timestamp()) returning id into result;
  -- Starting work does not grant permission to edit another person's card.
  if task.status = 'todo' and (task.created_by = actor or task.assignee_id = actor or task.assignee_id is null or private.can_manage_team(task.team_id)) then
    update public.tasks set status = 'in_progress', version = version + 1 where id = task.id;
  end if;
  return result;
end;
$$;

revoke all on function public.save_task(uuid,text,text,uuid,uuid,date,text,uuid,integer) from public, anon, authenticated;
revoke all on function public.move_task(uuid,text,integer) from public, anon, authenticated;
revoke all on function public.archive_task(uuid,integer) from public, anon, authenticated;
revoke all on function public.start_task_timer(uuid) from public, anon, authenticated;
grant execute on function public.save_task(uuid,text,text,uuid,uuid,date,text,uuid,integer),
  public.move_task(uuid,text,integer), public.archive_task(uuid,integer), public.start_task_timer(uuid) to authenticated;
alter publication supabase_realtime add table public.tasks;

commit;
