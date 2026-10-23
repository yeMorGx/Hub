import { test } from "node:test";
import assert from "node:assert/strict";
import { timerSnapshot, quickTimerAction } from "../lib/desktop/runtime";
import { EMPTY_TEAM, type Row } from "../lib/hub/types";
import type { HubController } from "../lib/hub/use-hub";
const fixture = () => ({
  snapshot: { ...EMPTY_TEAM, entries: [] as Row<"time_entries">[] },
  userId: "me",
  teamId: "team",
  busy: false,
  canParticipate: true,
});
test("mini timer conta segmento e tempo anterior, mantém almoço estático e respeita time/pessoa", () => {
  const h = fixture(),
    now = Date.parse("2026-10-21T12:00:00Z");
  assert.deepEqual(timerSnapshot(h, now), {
    phase: "idle",
    elapsedSeconds: 0,
    canControl: false,
    busy: false,
    description: "",
    project: "",
  });
  h.snapshot.entries = [
    {
      user_id: "me",
      team_id: "team",
      started_at: "2026-10-21T11:30:00Z",
      ended_at: null,
      carried_seconds: 600,
    } as Row<"time_entries">,
  ];
  assert.deepEqual(timerSnapshot(h, now), {
    phase: "running",
    elapsedSeconds: 2400,
    canControl: true,
    busy: false,
    description: "",
    project: "",
  });
  assert.equal(timerSnapshot({ ...h, teamId: "other" }, now).canControl, false);
  assert.equal(timerSnapshot({ ...h, userId: "other" }, now).phase, "idle");
  const paused = {
    ...h,
    snapshot: {
      ...h.snapshot,
      entries: [],
      pausedTimer: {
        user_id: "me",
        team_id: "team",
        accumulated_seconds: 2400,
      } as Row<"paused_timers">,
    },
  };
  assert.equal(timerSnapshot(paused, now + 3600000).elapsedSeconds, 2400);
  assert.equal(timerSnapshot(paused, now).phase, "lunch");
  assert.equal(
    timerSnapshot({ ...paused, userId: "other" }, now).phase,
    "idle",
  );
});
function controller(
  active: { id: string; team_id: string } | null,
  paused: { team_id: string } | null,
) {
  const calls: unknown[] = [];
  const query = (data: unknown) => ({
    select() {
      return this;
    },
    eq() {
      return this;
    },
    is() {
      return this;
    },
    async maybeSingle() {
      return { data, error: null };
    },
  });
  const hub = {
    ...fixture(),
    client: {
      from: (table: string) =>
        query(table === "time_entries" ? active : paused),
    },
    rpc: async (name: string, args: unknown) => {
      calls.push([name, args]);
      return "entry";
    },
  } as unknown as HubController;
  return { hub, calls };
}
test("ações rápidas usam sessão atual e as RPCs de almoço/encerramento corretas", async () => {
  let c = controller({ id: "entry", team_id: "team" }, null);
  await quickTimerAction(c.hub, "pause");
  assert.deepEqual(c.calls, [["pause_timer", {}]]);
  c = controller(null, { team_id: "team" });
  await quickTimerAction(c.hub, "resume");
  assert.deepEqual(c.calls, [["resume_timer", {}]]);
  await quickTimerAction(c.hub, "stop");
  assert.deepEqual(c.calls[1], ["stop_paused_timer", {}]);
  c = controller({ id: "entry", team_id: "team" }, null);
  await quickTimerAction(c.hub, "stop");
  assert.deepEqual(c.calls, [["stop_timer", { p_entry_id: "entry" }]]);
});
test("mini não inicia atividade nem muda timer de outro time ou estado incompatível", async () => {
  for (const c of [
    controller(null, null),
    controller({ id: "entry", team_id: "other" }, null),
  ]) {
    await assert.rejects(quickTimerAction(c.hub, "pause"));
    assert.equal(c.calls.length, 0);
  }
  const c = controller({ id: "entry", team_id: "team" }, null);
  await assert.rejects(quickTimerAction(c.hub, "resume"));
  assert.equal(c.calls.length, 0);
  c.hub.canParticipate = false;
  await assert.rejects(quickTimerAction(c.hub, "stop"));
  assert.equal(c.calls.length, 0);
});

test("clique de push ignora a cápsula e navega a janela principal", async () => {
  const { readFileSync } = await import("node:fs");
  const { runInNewContext } = await import("node:vm");
  const listeners: Record<string, (event: any) => void> = {},
    navigated: string[] = [],
    opened: string[] = [];
  const mini = {
    url: "https://hub-one-azure.vercel.app/desktop/timer",
    navigate: async () => {
      throw Error("Mini não é uma conversa");
    },
    focus: async () => {},
  };
  const main = {
    url: "https://hub-one-azure.vercel.app/",
    navigate: async (url: string) => {
      navigated.push(url);
    },
    focus: async () => {},
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL,
    self: {
      location: { origin: "https://hub-one-azure.vercel.app" },
      addEventListener: (name: string, handler: any) => {
        listeners[name] = handler;
      },
    },
    clients: {
      matchAll: async () => [mini, main],
      openWindow: async (url: string) => {
        opened.push(url);
      },
    },
  });
  let pending: Promise<unknown> = Promise.resolve();
  listeners.notificationclick({
    notification: { close() {}, data: { url: "/?inbox=1" } },
    waitUntil: (p: Promise<unknown>) => {
      pending = p;
    },
  });
  await pending;
  assert.equal(opened.length, 0);
  const target = new URL(navigated[0]);
  assert.equal(target.searchParams.get("inbox"), "1");
  assert.equal(target.searchParams.get("desktop_notification"), "1");
});
