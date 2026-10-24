import { test } from "node:test";
import assert from "node:assert/strict";
import {
  homeOfficeSummary,
  homeOfficeSummaryRange,
} from "../lib/hub/dashboard";
import type { HomeOfficeEntry } from "../lib/hub/types";

function entry(
  date: string,
  week: string,
  name = "Pessoa A",
  kind = "home_office",
): HomeOfficeEntry {
  return {
    scheduled_on: date,
    week_start: week,
    display_name: name,
    entry_kind: kind,
    entry_label: kind === "holiday_week" ? "Semana de feriado" : null,
    team_id: "team",
    user_id: name,
    avatar_url: null,
  };
}

test("resumo usa domingo da semana atual e consulta seis semanas, inclusive na virada do ano", () => {
  assert.deepEqual(homeOfficeSummaryRange("2026-10-21"), {
    startsOn: "2026-10-18",
    endsOn: "2026-12-02",
  });
  assert.deepEqual(homeOfficeSummaryRange("2026-12-31"), {
    startsOn: "2026-12-27",
    endsOn: "2027-02-11",
  });
  assert.deepEqual(homeOfficeSummaryRange("2026-10-25"), {
    startsOn: "2026-10-25",
    endsOn: "2026-12-06",
  });
});

test("resumo encontra hoje e próxima data, mantém trocas e múltiplas atribuições, sem alterar a entrada", () => {
  const rows = [
    entry("2026-10-23", "2026-10-18", "Pessoa D"),
    entry("2026-10-22", "2026-10-18", "Pessoa B"),
    entry("2026-10-20", "2026-10-18", "Pessoa anterior"),
    entry("2026-10-21", "2026-10-18"),
    entry("2026-10-22", "2026-10-18", "Pessoa C"),
  ];
  const original = rows.map((item) => ({ ...item }));
  const summary = homeOfficeSummary(rows, "2026-10-21");
  assert.deepEqual(
    summary.today.map((item) => item.display_name),
    ["Pessoa A"],
  );
  assert.deepEqual(
    summary.next.map((item) => item.display_name),
    ["Pessoa B", "Pessoa C"],
  );
  assert.deepEqual(rows, original);
});

test("semana de feriado suprime todas as atribuições e procura a próxima semana válida", () => {
  const rows = [
    entry("2026-10-21", "2026-10-18"),
    entry("2026-10-22", "2026-10-18"),
    entry("2026-10-19", "2026-10-18", "Feriado", "holiday_week"),
    entry("2026-10-26", "2026-10-25", "Próxima pessoa"),
  ];
  const summary = homeOfficeSummary(rows, "2026-10-21");
  assert.deepEqual(summary.today, []);
  assert.equal(summary.holidayWeek?.entry_label, "Semana de feriado");
  assert.equal(summary.next[0].display_name, "Próxima pessoa");
  const nextWeek = homeOfficeSummary(rows, "2026-10-26");
  assert.equal(nextWeek.holidayWeek, undefined);
  assert.equal(nextWeek.today[0].display_name, "Próxima pessoa");
});

test("feriado no dia e ausência de escala têm estados distintos", () => {
  assert.equal(
    homeOfficeSummary(
      [entry("2026-10-21", "2026-10-18", "Feriado local", "holiday")],
      "2026-10-21",
    ).holiday?.display_name,
    "Feriado local",
  );
  assert.deepEqual(homeOfficeSummary([], "2026-10-21"), {
    today: [],
    next: [],
    holiday: undefined,
    holidayWeek: undefined,
  });
});

test("saldo descreve crédito, débito e equilíbrio sem depender de sinais", async () => {
  const { balanceCaption, inboxText } = await import("../lib/hub/dashboard");
  assert.equal(balanceCaption(120), "a mais");
  assert.equal(balanceCaption(-120), "a compensar");
  assert.equal(balanceCaption(0), "em dia");
  assert.equal(inboxText("\n  Vamos   revisar?  \n"), "Vamos revisar?");
  assert.equal(inboxText(" "), "Enviou um anexo");
  assert.equal(inboxText("a".repeat(1000)).length, 160);
});

test("prévia só considera DMs próprias, não lidas, ativas e com associação", async () => {
  const { unreadDmChannels } = await import("../lib/hub/dashboard");
  const { EMPTY_TEAM } = await import("../lib/hub/types");
  type Channel = (typeof EMPTY_TEAM.channels)[number];
  type Membership = (typeof EMPTY_TEAM.channelMemberships)[number];
  const dm = {
    id: "own",
    kind: "dm",
    dm_user_low: "me",
    dm_user_high: "friend",
    archived_at: null,
    updated_at: "2026-10-21",
  } as Channel;
  const channel = (id: string, patch: Partial<Channel>) => ({
    ...dm,
    id,
    ...patch,
  });
  const list = [
    dm,
    channel("other", { dm_user_low: "stranger" }),
    channel("public", { kind: "public" }),
    channel("archived", { archived_at: "2026-10-21" }),
    channel("read", {}),
    channel("no-membership", {}),
  ];
  const memberships = list
    .filter((c) => c.id !== "no-membership")
    .map((c) => ({ channel_id: c.id, user_id: "me" }) as Membership);
  const unread = Object.fromEntries(
    list.map((c) => [c.id, c.id === "read" ? 0 : 2]),
  );
  assert.deepEqual(
    unreadDmChannels(list, memberships, unread, "me").map((c) => c.id),
    ["own"],
  );
  assert.deepEqual(unreadDmChannels(list, memberships, unread, "stranger"), []);
  const many = Array.from({ length: 20 }, (_, i) =>
    channel(String(i), {
      updated_at: `2026-10-${String(i + 1).padStart(2, "0")}`,
    }),
  );
  assert.equal(
    unreadDmChannels(
      many,
      many.map((c) => ({ channel_id: c.id, user_id: "me" }) as Membership),
      Object.fromEntries(many.map((c) => [c.id, 1])),
      "me",
    ).length,
    8,
  );
});


test("busca global usa as mesmas 22 páginas da navegação e respeita permissões", async () => {
  const { workspaceAreas, workspaceSearchPages, searchWorkspacePages } = await import("../lib/hub/navigation");
  assert.equal(workspaceSearchPages.length, 22);
  assert.equal(new Set(workspaceSearchPages.map(page => page.id)).size, 22);
  assert.deepEqual(workspaceSearchPages.map(page => page.id), workspaceAreas.flatMap(area => area.tabs.map(([id]) => id)));
  assert.deepEqual(searchWorkspacePages("relatorios").map(page => page.id), ["reports"]);
  assert.deepEqual(searchWorkspacePages(" BIBLIOTECA ").map(page => page.id), ["library"]);
  assert.equal(searchWorkspacePages("Agenda").length, 5);
  assert.equal(searchWorkspacePages("Organização", page => page !== "organization").length, 0);
  assert.equal(searchWorkspacePages("").some(page => ["more", "management", "collaboration"].includes(page.id)), false);
});
