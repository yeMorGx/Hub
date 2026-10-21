// Explicit, public, in-memory fixtures. Never imported by authenticated routes.
import type { HubController } from "./use-hub";
const id = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
export const demoUser = id(1),
  demoTeam = id(10),
  demoChannel = id(20);
export function createDemoBackend() {
  const now = new Date(),
    stamp = now.toISOString(),
    day = stamp.slice(0, 10),
    future = new Date(now.getTime() + 3600000).toISOString();
  const people = [
    { id: demoUser, display_name: "Marina Costa", role: "leader" },
    { id: id(2), display_name: "Pedro Alves", role: "member" },
    { id: id(3), display_name: "Lia Martins", role: "member" },
  ];
  const messages = [
    {
      id: id(50),
      team_id: demoTeam,
      channel_id: demoChannel,
      author_id: demoUser,
      body: "A pauta da revisão está pronta. Vamos fechar os últimos detalhes do lançamento por aqui?",
      ordinal: 1,
      created_at: stamp,
      updated_at: stamp,
      reply_to: null,
      deleted_at: null,
      source: "user",
    },
    {
      id: id(51),
      team_id: demoTeam,
      channel_id: demoChannel,
      author_id: id(2),
      body: "Revisei o fluxo de entrada. As telas estão alinhadas com o que combinamos na última reunião.",
      ordinal: 2,
      created_at: stamp,
      updated_at: stamp,
      reply_to: null,
      deleted_at: null,
      source: "user",
    },
    {
      id: id(52),
      team_id: demoTeam,
      channel_id: demoChannel,
      author_id: id(3),
      body: "Boa! Vou revisar as mensagens de erro e colocar minhas observações no documento.",
      ordinal: 3,
      created_at: stamp,
      updated_at: stamp,
      reply_to: null,
      deleted_at: null,
      source: "user",
    },
  ];
  const data: Record<string, Record<string, unknown>[]> = {
    messages,
    message_reactions: [
      { message_id: id(51), user_id: demoUser, reaction: "like", active: true },
    ],
    message_pins: [
      { message_id: id(50), channel_id: demoChannel, active: true },
    ],
    attachments: [],
    team_notes: [
      {
        id: id(60),
        team_id: demoTeam,
        title: "Lançamento · decisões e próximos passos",
        body: "# Um lançamento bem preparado\n\nUma referência compartilhada para manter o time na mesma página.\n\n## O que já decidimos\n\n- Fluxo de entrada com duas etapas claras\n- Revisão de acessibilidade antes da entrega\n- Pauta e ata junto da reunião\n\n## Próximo encontro\n\nRevisar as pendências e confirmar os responsáveis.\n\n> Registre decisões aqui para que ninguém dependa de estar na reunião.",
        version: 3,
        created_by: demoUser,
        updated_by: demoUser,
        created_at: stamp,
        updated_at: stamp,
        archived_at: null,
      },
      {
        id: id(61),
        team_id: demoTeam,
        title: "Como trabalhamos juntos",
        body: "## Nosso ritmo\n\nCheck-in diário, decisões documentadas e tempo para trabalho concentrado.",
        version: 1,
        created_by: id(2),
        updated_by: id(2),
        updated_at: stamp,
      },
    ],
    standups: [
      {
        id: id(62),
        team_id: demoTeam,
        user_id: id(2),
        kind: "daily",
        period_on: day,
        accomplished: "Fluxo de entrada revisado e componentes alinhados.",
        planned: "Fechar detalhes de acessibilidade e estados vazios.",
        blockers: "Sem impedimentos.",
        mood: "steady",
        updated_at: stamp,
      },
    ],
    meeting_documents: [
      {
        event_id: id(70),
        team_id: demoTeam,
        agenda: "Revisar o lançamento e confirmar responsáveis.",
        minutes: "",
        version: 1,
        updated_by: demoUser,
        updated_at: stamp,
      },
    ],
    notifications: [
      {
        id: id(71),
        team_id: demoTeam,
        user_id: demoUser,
        kind: "mention",
        message_id: id(51),
        channel_id: demoChannel,
        read_at: null,
        created_at: stamp,
      },
    ],
    clients: [
      {
        id: id(80),
        team_id: demoTeam,
        name: "Estúdio Forma",
        archived_at: null,
      },
    ],
    time_goals: people.map((p) => ({
      team_id: demoTeam,
      user_id: p.id,
      weekly_minutes: 2400,
      forgotten_after_minutes: 480,
    })),
    shifts: [
      {
        id: id(81),
        team_id: demoTeam,
        user_id: demoUser,
        label: "Plantão · suporte ao lançamento",
        starts_at: stamp,
        ends_at: new Date(now.getTime() + 8 * 3600000).toISOString(),
        cancelled_at: null,
        version: 1,
      },
    ],
    shift_swaps: [],
    absences: [
      {
        id: id(82),
        team_id: demoTeam,
        user_id: id(3),
        kind: "vacation",
        starts_on: day,
        ends_on: day,
        status: "pending",
        note: "Período de descanso planejado.",
        decision_note: "",
        created_at: stamp,
      },
    ],
    team_dates: [
      {
        id: id(83),
        team_id: demoTeam,
        user_id: id(2),
        label: "Aniversário do Pedro",
        happens_on: day,
        recurs_yearly: true,
        created_by: id(2),
      },
    ],
    calendar_connections: [],
    incoming_webhooks: [],
    audit_events: [
      {
        id: 3,
        workspace_id: id(11),
        team_id: demoTeam,
        actor_id: demoUser,
        action: "UPDATE",
        entity_table: "tasks",
        entity_id: id(90),
        changes: {
          fields: ["status"],
          before: { status: "todo" },
          after: { status: "doing" },
        },
        occurred_at: stamp,
      },
      {
        id: 2,
        workspace_id: id(11),
        team_id: demoTeam,
        actor_id: id(2),
        action: "INSERT",
        entity_table: "team_notes",
        entity_id: id(61),
        changes: { fields: ["title", "body"], after: {} },
        occurred_at: stamp,
      },
    ],
  };
  const report = people.map((p, i) => ({
    entry_id: id(100 + i),
    user_id: p.id,
    display_name: p.display_name,
    project_id: id(40),
    project_name: "Lançamento ZULU",
    client_id: id(80),
    client_name: "Estúdio Forma",
    description: [
      "Planejamento e revisão",
      "Fluxo de entrada",
      "Documentação e conteúdo",
    ][i],
    started_at: stamp,
    ended_at: future,
    duration_seconds: [12600, 19800, 15300][i],
  }));
  function from(table: string) {
    let rows = [...(data[table] || [])],
      single = false,
      countOnly = false;
    const query: Record<string, unknown> = {};
    const operations: Record<string, (...args: unknown[]) => void> = {
      select: (_columns, options) => {
        countOnly = Boolean((options as { head?: boolean })?.head);
      },
      eq: (k, v) => {
        rows = rows.filter((r) => r[String(k)] === v);
      },
      neq: (k, v) => {
        rows = rows.filter((r) => r[String(k)] !== v);
      },
      is: (k, v) => {
        rows = rows.filter((r) => (r[String(k)] ?? null) === v);
      },
      in: (k, v) => {
        rows = rows.filter((r) => (v as unknown[]).includes(r[String(k)]));
      },
      gt: (k, v) => {
        rows = rows.filter((r) => String(r[String(k)]) > String(v));
      },
      gte: (k, v) => {
        rows = rows.filter((r) => String(r[String(k)]) >= String(v));
      },
      lt: (k, v) => {
        rows = rows.filter((r) => String(r[String(k)]) < String(v));
      },
      lte: (k, v) => {
        rows = rows.filter((r) => String(r[String(k)]) <= String(v));
      },
      order: (k, opts) => {
        rows.sort(
          (a, b) =>
            String(a[String(k)]).localeCompare(String(b[String(k)])) *
            ((opts as { ascending?: boolean })?.ascending === false ? -1 : 1),
        );
      },
      limit: (n) => {
        rows = rows.slice(0, Number(n));
      },
      maybeSingle: () => {
        single = true;
      },
      single: () => {
        single = true;
      },
    };
    for (const [name, op] of Object.entries(operations))
      query[name] = (...args: unknown[]) => {
        op(...args);
        return query;
      };
    query.then = (resolve: (r: unknown) => unknown) =>
      Promise.resolve({
        data: countOnly ? null : single ? rows[0] || null : rows,
        error: null,
        count: rows.length,
      }).then(resolve);
    return query;
  }
  const client = {
    from,
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      if (name === "report_time_entries")
        return {
          data: report.filter(
            (r) =>
              (!args.p_user_id || r.user_id === args.p_user_id) &&
              (!args.p_project_id || r.project_id === args.p_project_id),
          ),
          error: null,
        };
      if (name === "absence_schedule" || name === "search_channel_messages")
        return { data: [], error: null };
      if (name === "refresh_my_reminders" || name === "mark_notification_read")
        return { data: null, error: null };
      return {
        data: null,
        error: {
          message:
            "Demonstração em memória. Entre no ZULU para salvar alterações.",
        },
      };
    },
  };
  const hub = {
    client,
    userId: demoUser,
    teamId: demoTeam,
    currentTeam: { id: demoTeam, name: "Estúdio", workspace_id: id(11) },
    workspace: { id: id(11), name: "Forma" },
    snapshot: {
      teamId: demoTeam,
      people,
      projects: [
        {
          id: id(40),
          team_id: demoTeam,
          name: "Lançamento ZULU",
          color: "#e26540",
          client_id: id(80),
          archived_at: null,
        },
      ],
      channels: [
        {
          id: demoChannel,
          team_id: demoTeam,
          name: "projeto-hub",
          kind: "public",
          archived_at: null,
        },
      ],
      events: [
        {
          id: id(70),
          team_id: demoTeam,
          title: "Revisão de lançamento",
          starts_at: future,
          ends_at: new Date(now.getTime() + 2 * 3600000).toISOString(),
          created_by: demoUser,
          cancelled_at: null,
        },
      ],
      entries: [],
      homeOffice: [],
      upcomingHomeOffice: [],
      homeOfficeSummaryError: false,
      workSchedule: null,
      workBalance: [],
      workBalanceLoadedAt: 0,
      pausedTimer: null,
      tasks: [],
      unread: {},
      channelMemberships: [],
      attendees: [],
    },
    canManage: true,
    canParticipate: true,
    isAdmin: true,
    busy: false,
    refreshTeam: async () => {},
    notify: () => {},
    rpc: async (name: string, args: Record<string, unknown>) => {
      const result = await client.rpc(name, args);
      if (result.error) throw result.error;
      return result.data;
    },
    mutate: async () => ({
      ok: false,
      error: "Demonstração em memória. Entre no ZULU para salvar alterações.",
    }),
  } as unknown as HubController;
  return { hub, messages };
}
