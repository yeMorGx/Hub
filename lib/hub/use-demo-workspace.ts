"use client";
// Only public demo routes import this controller. No Supabase network or durable data writes.
import { useMemo, useState } from "react";
import {
  createDemoBackend,
  demoUser,
  demoTeam,
  demoChannel,
} from "./demo-backend";
import { EMPTY_AUTHORITY } from "@/lib/organization/model";
import { dayKey } from "./dates";
import type { HubController } from "./use-hub";
import type { Row } from "./types";

export function useDemoWorkspace(): HubController {
  const [, invalidate] = useState(0),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<HubController["notice"]>(null);
  const core = useMemo(() => {
    const { hub, messages } = createDemoBackend();
    const role =
      typeof location !== "undefined"
        ? (new URLSearchParams(location.search).get("role") ?? "owner")
        : "owner";
    const stamp = new Date().toISOString(),
      today = dayKey(new Date()),
      workspaceId = "00000000-0000-0000-0000-000000000011";
    const snapshot = hub.snapshot;
    snapshot.people.forEach((p) => {
      p.avatar_url = null;
    });
    const profile = {
      ...snapshot.people[0],
      availability: "online",
      avatar_url: null,
    };
    const workspace = {
      ...hub.workspace!,
      owner_id: role === "owner" ? demoUser : snapshot.people[1].id,
      created_at: stamp,
    };
    const team = { ...hub.currentTeam!, created_at: stamp };
    const tasks = [
      {
        id: crypto.randomUUID(),
        title: "Planejamento da semana",
        description:
          "Organizar as prioridades do time e confirmar os responsáveis pelas próximas entregas.",
        status: "todo",
        priority: "high",
        assignee_id: demoUser,
      },
      {
        id: crypto.randomUUID(),
        title: "Revisão do portal",
        description:
          "Revisar o conteúdo e a navegação do portal institucional.\nValidar com as áreas responsáveis e consolidar os ajustes para a publicação.",
        status: "in_progress",
        priority: "normal",
        assignee_id: demoUser,
      },
      {
        id: crypto.randomUUID(),
        title: "Acompanhamento de pendências",
        description:
          "Consolidar os pontos da revisão e preparar a pauta do próximo encontro.",
        status: "todo",
        priority: "low",
        assignee_id: snapshot.people[1].id,
      },
    ].map((t, i) => ({
      ...t,
      team_id: demoTeam,
      project_id: snapshot.projects[0].id,
      created_by: demoUser,
      due_on: today,
      created_at: stamp,
      updated_at: stamp,
      archived_at: null,
      version: 1,
      sort_order: i,
    })) as Row<"tasks">[];
    snapshot.tasks = tasks;
    snapshot.channelMemberships = [
      {
        channel_id: demoChannel,
        user_id: demoUser,
        role: "moderator",
        team_id: demoTeam,
        last_read_ordinal: 0,
        joined_at: stamp,
      },
    ] as typeof snapshot.channelMemberships;
    snapshot.workSchedule = {
      user_id: demoUser,
      team_id: demoTeam,
      setup_state: "complete",
    } as typeof snapshot.workSchedule;
    snapshot.workBalance = [
      {
        work_date: today,
        expected_minutes: [0, 6].includes(new Date().getDay()) ? 0 : 480,
        actual_seconds: 8078,
      },
    ] as typeof snapshot.workBalance;
    snapshot.workBalanceLoadedAt = Date.now();
    snapshot.entries = [
      {
        id: crypto.randomUUID(),
        team_id: demoTeam,
        user_id: demoUser,
        project_id: tasks[1].project_id,
        task_id: tasks[1].id,
        description: tasks[1].title,
        started_at: new Date(Date.now() - 8078000).toISOString(),
        ended_at: null,
        carried_seconds: 0,
      },
    ] as typeof snapshot.entries;
    const base = hub.client,
      baseRpc = base.rpc.bind(base),
      baseFrom = base.from.bind(base);
    const unavailable = {
      message:
        "Esta ação usa um serviço externo. Entre no ZULU para usar os dados do seu time.",
    };
    const uuid = () => crypto.randomUUID();
    function query(table: string) {
      const collection: Record<string, unknown[]> = {
        tasks: snapshot.tasks,
        time_entries: snapshot.entries,
        events: snapshot.events,
        profiles: snapshot.people,
        projects: snapshot.projects,
        messages,
      };
      if (!(table in collection)) return baseFrom(table as never);
      let rows = [...collection[table]] as Record<string, unknown>[],
        single = false;
      let pendingUpdate: Record<string, unknown> | null = null;
      const q: Record<string, unknown> = {};
      for (const key of [
        "select",
        "order",
        "limit",
        "range",
        "eq",
        "neq",
        "is",
        "in",
        "gt",
        "gte",
        "lt",
        "lte",
        "maybeSingle",
        "single",
        "update",
      ]) {
        q[key] = (...args: unknown[]) => {
          const [field, value] = args;
          if (key === "eq")
            rows = rows.filter((r) => r[String(field)] === value);
          if (key === "is")
            rows = rows.filter((r) => (r[String(field)] ?? null) === value);
          if (key === "in")
            rows = rows.filter((r) =>
              (value as unknown[]).includes(r[String(field)]),
            );
          if (key === "neq")
            rows = rows.filter((r) => r[String(field)] !== value);
          if (key === "limit") rows = rows.slice(0, Number(field));
          if (key === "range")
            rows = rows.slice(Number(field), Number(value) + 1);
          if (key === "single" || key === "maybeSingle") single = true;
          if (key === "update") {
            pendingUpdate = field as Record<string, unknown>;
          }
          return q;
        };
      }
      q.then = (resolve: (r: unknown) => unknown) => {
        if (pendingUpdate) {
          rows.forEach((row) => {
            Object.assign(row, pendingUpdate);
            if (table === "profiles" && row.id === demoUser)
              Object.assign(profile, pendingUpdate);
          });
        }
        return Promise.resolve({
          data: single ? (rows[0] ?? null) : rows,
          error: null,
          count: rows.length,
        }).then(resolve);
      };
      return q;
    }
    async function rpc(name: string, args: Record<string, unknown> = {}) {
      if (name === "set_work_status") {
        snapshot.people[0].body = String(args.p_body ?? "");
        return { data: null, error: null };
      }
      if (name === "organization_console") {
        if (args.p_command === "capabilities")
          return {
            data: {
              ...EMPTY_AUTHORITY,
              owner: role === "owner",
              general_admin: role !== "member",
              team_admin: role !== "member",
              permissions: { [demoTeam]: {} },
            },
            error: null,
          };
        if (["state", "list", "overview"].includes(String(args.p_command)))
          return {
            data: {
              workspace,
              members: snapshot.people.map((p) => ({
                ...p,
                user_id: p.id,
                job_title: "",
                is_active: true,
                can_approve: false,
              })),
              teams: [team],
              memberships: [],
              policies: [],
              requests: [],
              votes: [],
              activity: [],
              invitations: [],
              invite_authorizations: [],
            },
            error: null,
          };
      }
      if (name === "organization_contacts")
        return {
          data: {
            people: snapshot.people
              .filter((p) => p.id !== demoUser)
              .map((p) => ({ ...p, job_title: "" })),
            channels: [],
          },
          error: null,
        };
      if (name === "organization_deletion_status")
        return { data: false, error: null };
      if (
        name === "library_console" &&
        ["list", "state"].includes(String(args.p_command))
      )
        return {
          data: { nodes: [], grants: [], requests: [], documents: [] },
          error: null,
        };
      if (name === "move_task" || name === "position_task") {
        const task = snapshot.tasks.find((t) => t.id === args.p_task_id);
        if (!task || task.version !== args.p_expected_version)
          return {
            data: null,
            error: { message: "A tarefa mudou. Atualize e tente novamente." },
          };
        task.status = String(args.p_status);
        task.version++;
        snapshot.tasks = [...snapshot.tasks];
        return { data: task.id, error: null };
      }
      if (name === "save_task") {
        const task = snapshot.tasks.find((t) => t.id === args.p_task_id),
          item = {
            title: String(args.p_title),
            description: String(args.p_description ?? ""),
            project_id: args.p_project_id || null,
            assignee_id: args.p_assignee_id || null,
            due_on: args.p_due_on || null,
            priority: String(args.p_priority ?? "normal"),
            updated_at: new Date().toISOString(),
          };
        if (task) {
          Object.assign(task, item, { version: task.version + 1 });
        } else
          snapshot.tasks.push({
            ...item,
            id: uuid(),
            status: "todo",
            team_id: demoTeam,
            created_by: demoUser,
            created_at: stamp,
            archived_at: null,
            version: 1,
            sort_order: snapshot.tasks.length,
          } as Row<"tasks">);
        snapshot.tasks = [...snapshot.tasks];
        return { data: task?.id ?? snapshot.tasks.at(-1)?.id, error: null };
      }
      if (name === "save_project") {
        const item = {
          id: uuid(),
          name: String(args.p_name),
          team_id: demoTeam,
          description: "",
          archived_at: null,
        } as Row<"projects">;
        snapshot.projects = [...snapshot.projects, item];
        return { data: item.id, error: null };
      }
      if (name === "start_timer" || name === "start_task_timer") {
        if (snapshot.entries.some((e) => !e.ended_at) || snapshot.pausedTimer)
          return {
            data: null,
            error: { message: "Encerre o timer atual antes de iniciar outro." },
          };
        const task = snapshot.tasks.find((t) => t.id === args.p_task_id),
          entry = {
            id: uuid(),
            team_id: demoTeam,
            user_id: demoUser,
            project_id: task?.project_id ?? args.p_project_id ?? null,
            task_id: task?.id ?? null,
            description: task?.title ?? String(args.p_description),
            started_at: new Date().toISOString(),
            ended_at: null,
            carried_seconds: 0,
          } as Row<"time_entries">;
        snapshot.entries = [...snapshot.entries, entry];
        return { data: entry.id, error: null };
      }
      if (name === "pause_timer" || name === "stop_timer") {
        const entry = snapshot.entries.find((e) => !e.ended_at);
        if (!entry)
          return { data: null, error: { message: "Nenhum timer ativo." } };
        const seconds =
          Math.floor((Date.now() - Date.parse(entry.started_at)) / 1000) +
          Number(entry.carried_seconds ?? 0);
        entry.ended_at = new Date().toISOString();
        if (name === "pause_timer")
          snapshot.pausedTimer = {
            ...entry,
            paused_at: entry.ended_at,
            accumulated_seconds: seconds,
          } as unknown as Row<"paused_timers">;
        snapshot.entries = [...snapshot.entries];
        return { data: entry.id, error: null };
      }
      if (name === "resume_timer") {
        const paused = snapshot.pausedTimer;
        if (!paused) return { data: null, error: unavailable };
        snapshot.entries = [
          ...snapshot.entries,
          {
            ...paused,
            id: uuid(),
            started_at: new Date().toISOString(),
            ended_at: null,
            carried_seconds: paused.accumulated_seconds,
          } as unknown as Row<"time_entries">,
        ];
        snapshot.pausedTimer = null;
        return { data: null, error: null };
      }
      if (name === "stop_paused_timer") {
        snapshot.pausedTimer = null;
        return { data: null, error: null };
      }
      if (name === "mark_channel_read" || name === "skip_work_schedule_setup")
        return { data: null, error: null };
      if (name === "send_message") {
        messages.push({
          id: uuid(),
          channel_id: String(args.p_channel_id),
          team_id: demoTeam,
          author_id: demoUser,
          body: String(args.p_body),
          ordinal: messages.length + 1,
          created_at: new Date().toISOString(),
          updated_at: stamp,
          reply_to: null,
          deleted_at: null,
          source: "user",
        });
        return { data: messages.at(-1)?.id, error: null };
      }
      if (name === "report_work_balances") {
        const rows = snapshot.workBalance.map((row) => ({
          ...row,
          user_id: demoUser,
          display_name: profile.display_name,
        }));
        return { data: rows, error: null };
      }
      const result = await baseRpc(name as never, args as never);
      if (
        name === "report_time_entries" &&
        role === "member" &&
        Array.isArray(result.data)
      )
        return {
          ...result,
          data: (result.data as unknown as { user_id: string }[]).filter(
            (r) => r.user_id === demoUser,
          ),
        };
      return result;
    }
    const realtime = {
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
      send: async () => {},
      track: async () => {},
      unsubscribe: async () => {},
    };
    const client = {
      ...base,
      from: query,
      rpc: (name: string, args: Record<string, unknown> = {}) =>
        Object.assign(rpc(name, args), {
          range: (start: number, end: number) =>
            rpc(name, args).then((result) => ({
              ...result,
              data: Array.isArray(result.data)
                ? result.data.slice(start, end + 1)
                : result.data,
            })),
        }),
      channel: () => Object.create(realtime),
      removeChannel: async () => {},
      auth: {
        getUser: async () => ({
          data: { user: { id: demoUser } },
          error: null,
        }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ error: unavailable }),
      },
      functions: { invoke: async () => ({ data: null, error: unavailable }) },
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: unavailable }),
          remove: async () => ({ data: null, error: unavailable }),
          createSignedUrl: async () => ({ data: null, error: unavailable }),
        }),
      },
    };
    const notify = (message: string, error = false) =>
      setNotice({ message, error });
    const refresh = async () => invalidate((v) => v + 1);
    return {
      hub,
      role,
      client,
      notify,
      refresh,
      bootstrap: {
        profile,
        workspaces: [workspace],
        teams: [team],
        workspaceMemberships: [
          {
            workspace_id: workspaceId,
            user_id: demoUser,
            role: role === "member" ? "member" : "admin",
            is_active: true,
          },
        ],
        teamMemberships: [
          {
            team_id: demoTeam,
            user_id: demoUser,
            role: "leader",
            is_active: true,
          },
        ],
      },
      workspace,
      team,
    };
  }, []);
  return {
    ...core.hub,
    isAdmin: core.role !== "member",
    canManage: core.role !== "member",
    client: core.client,
    bootstrap: core.bootstrap,
    bootLoading: false,
    bootError: "",
    teamLoading: false,
    teamError: "",
    connection: "online",
    workspace: core.workspace,
    currentTeam: core.team,
    onlinePeople: Object.fromEntries(
      core.hub.snapshot.people.map((p) => [p.id, "online"]),
    ),
    onlineActivities: {
      [core.hub.snapshot.people[1].id]: "Revisão do portal",
      [core.hub.snapshot.people[2].id]: "Planejamento da semana",
    },
    presenceReady: "live",
    availability: "online",
    busy,
    notice,
    notify: core.notify,
    dismissNotice: () => setNotice(null),
    refreshTeam: core.refresh,
    refreshBootstrap: core.refresh,
    refreshAll: core.refresh,
    setTeamId: () => {},
    setAvailability: () => {},
    rpc: async (name: string, args: Record<string, unknown>) => {
      const result = await core.client.rpc(
        name,
        args as Record<string, unknown>,
      );
      if (result.error) throw result.error;
      return result.data;
    },
    mutate: async <T>(action: () => Promise<T>, success: string) => {
      if (busy) return { ok: false, error: "Aguarde a operação atual." };
      setBusy(true);
      try {
        const value = await action();
        core.notify(success);
        await core.refresh();
        return { ok: true, value };
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : ((e as { message?: string })?.message ??
              "Não foi possível concluir.");
        core.notify(message, true);
        return { ok: false, error: message };
      } finally {
        setBusy(false);
      }
    },
  } as unknown as HubController;
}
