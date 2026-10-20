import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { parseChatCommand } from "../lib/hub/commands";
import {
  seal,
  unseal,
  equalState,
  challenge,
} from "../lib/integrations/crypto";
import {
  authorizationUrl,
  readExternalEvent,
  saveExternalEvent,
  listExternalEvents,
  refreshToken,
} from "../lib/integrations/provider";
const key = "a".repeat(64),
  originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
test("comandos reconhecem ações, textos comuns e ajuda", () => {
  assert.equal(parseChatCommand("oi"), null);
  assert.equal(parseChatCommand("//não é comando"), null);
  assert.deepEqual(parseChatCommand("/hora iniciar Planejamento"), {
    action: "start_timer",
    description: "Planejamento",
  });
  assert.deepEqual(parseChatCommand("/hora parar"), {
    action: "stop_timer",
    description: "",
  });
  assert.ok("error" in parseChatCommand("/outro")!);
});
test("reunião valida data e horário, usa 30 minutos e rejeita passado", () => {
  const now = new Date("2026-10-19T12:00:00");
  const tomorrow = parseChatCommand("/reunião amanhã 14h Revisão", now);
  assert.ok(
    tomorrow && "action" in tomorrow && tomorrow.action === "create_meeting",
  );
  assert.equal(new Date(tomorrow.startsAt!).getHours(), 14);
  assert.equal(new Date(tomorrow.startsAt!).getDate(), 20);
  assert.equal(
    Date.parse(tomorrow.endsAt!) - Date.parse(tomorrow.startsAt!),
    1800000,
  );
  for (const s of [
    "/reunião 2026-02-30 14h",
    "/reunião hoje 11h",
    "/reunião amanhã 25h",
    "/reunião amanhã 14:90",
  ])
    assert.ok("error" in parseChatCommand(s, now)!);
});
test("AES-GCM cifra com nonce aleatório e rejeita adulteração ou chave errada", () => {
  const input = { refreshToken: "fixture", owner: "local-test" },
    a = seal(input, key),
    b = seal(input, key);
  assert.notEqual(a, b);
  assert.ok(!a.includes("fixture"));
  assert.deepEqual(unseal(a, key), input);
  assert.throws(() => unseal(a, "b".repeat(64)));
  assert.throws(() => unseal(a.slice(0, -8) + "AAAAAAAA", key));
  assert.throws(() => seal(input, "short"));
});
test("state compara tamanho/conteúdo e PKCE produz SHA256 base64url", () => {
  assert.equal(equalState("abc", "abc"), true);
  assert.equal(equalState("abc", "ab"), false);
  assert.equal(equalState("abc", "abd"), false);
  assert.equal(
    challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});
const token = {
  accessToken: "fixture-access",
  refreshToken: "fixture-refresh",
  expiresAt: Date.now() + 3600000,
};
function respond(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
test("OAuth fixa destinos oficiais, PKCE e callback configurado", () => {
  process.env.GOOGLE_CALENDAR_CLIENT_ID = "fixture-client";
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "fixture-secret";
  process.env.HUB_INTEGRATION_ENCRYPTION_KEY = key;
  const url = new URL(authorizationUrl("google", "state", "challenge"));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), "state");
  assert.match(
    url.searchParams.get("redirect_uri")!,
    /\/api\/integrations\/google\/callback$/,
  );
});
test("Google exporta com ID determinístico, sem convites e com precondição", async () => {
  let request: { url: string; options?: RequestInit } | undefined;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), options };
    return respond({ id: "external", updated: "stamp" });
  };
  const event = {
    id: "a16b0000-0000-0000-0000-000000000001",
    title: "Evento",
    description: "Pauta",
    starts_at: "2030-01-01T10:00:00Z",
    ends_at: "2030-01-01T11:00:00Z",
    cancelled_at: null,
  };
  await saveExternalEvent("google", token, "cal", event);
  assert.ok(request!.url.endsWith("?sendUpdates=none"));
  const body = JSON.parse(request!.options!.body as string);
  assert.equal(body.id, "hub" + event.id.replaceAll("-", ""));
  assert.equal(body.attendees, undefined);
  await saveExternalEvent(
    "google",
    token,
    "cal",
    event,
    "external",
    '"version"',
  );
  assert.equal(
    (request!.options!.headers as Record<string, string>)["If-Match"],
    '"version"',
  );
});
test("Outlook cancela via DELETE e leitura ausente retorna null", async () => {
  const methods: string[] = [];
  globalThis.fetch = async (_url, options) => {
    methods.push(options?.method || "GET");
    return respond({}, options?.method === "DELETE" ? 204 : 404);
  };
  await saveExternalEvent(
    "outlook",
    token,
    "cal",
    {
      id: "id",
      title: "Evento",
      description: "",
      starts_at: "2030-01-01T10:00:00Z",
      ends_at: "2030-01-01T11:00:00Z",
      cancelled_at: "2030-01-01",
    },
    "external",
  );
  assert.equal(methods[0], "DELETE");
  assert.equal(
    await readExternalEvent("outlook", token, "cal", "external"),
    null,
  );
});
test("Outlook recusa paginação fora do Graph", async () => {
  globalThis.fetch = async () =>
    respond({ value: [], "@odata.nextLink": "https://example.invalid/steal" });
  await assert.rejects(
    listExternalEvents("outlook", token, "cal", "2030-01-01", "2030-02-01"),
    /pagination/,
  );
});
test("renovação preserva refresh token quando provedor não o repete", async () => {
  globalThis.fetch = async () =>
    respond({ access_token: "renewed", expires_in: 3600 });
  const renewed = await refreshToken("google", { ...token, expiresAt: 0 });
  assert.equal(renewed.refreshToken, token.refreshToken);
  assert.equal(renewed.accessToken, "renewed");
});

test("sala remove somente identidades fora do roster e propaga falhas do servidor", async () => {
  const { removeDisallowedParticipants } = await import(
    "../lib/livekit/permissions"
  );
  const removed: string[] = [];
  const service = {
    listParticipants: async () => [
      { identity: "active" },
      { identity: "revoked" },
      { identity: "not-a-user" },
    ],
    removeParticipant: async (_room: string, id: string) => {
      removed.push(id);
    },
  };
  assert.equal(
    await removeDisallowedParticipants(service, "room", new Set(["active"])),
    2,
  );
  assert.deepEqual(removed, ["revoked", "not-a-user"]);
  assert.equal(
    await removeDisallowedParticipants(
      {
        ...service,
        listParticipants: async () => {
          throw { code: "not_found" };
        },
      },
      "room",
      new Set(),
    ),
    0,
  );
  await assert.rejects(
    removeDisallowedParticipants(
      {
        ...service,
        listParticipants: async () => {
          throw new Error("API down");
        },
      },
      "room",
      new Set(),
    ),
    /API down/,
  );
});

test("convites usam tokens aleatórios de 256 bits, hash SHA-256 e formato estrito", async () => {
  const { invitationToken, validInvitationToken } = await import(
    "../lib/invitations/token"
  );
  const { createHash } = await import("node:crypto");
  const first = invitationToken(),
    second = invitationToken();
  assert.equal(Buffer.from(first.token, "base64url").length, 32);
  assert.ok(validInvitationToken(first.token));
  assert.notEqual(first.token, second.token);
  assert.equal(
    first.hash,
    createHash("sha256").update(first.token).digest("hex"),
  );
  for (const invalid of [
    null,
    undefined,
    123,
    "",
    "a".repeat(42),
    "a".repeat(44),
    "=".repeat(43),
    `${first.token}\n`,
  ])
    assert.equal(validInvitationToken(invalid), false);
});

test("agenda mensal cobre semanas inteiras, inclusive ano anterior e fevereiro bissexto", async () => {
  const { calendarDays, calendarRange } = await import("../lib/hub/calendar");
  const { dayKey } = await import("../lib/hub/dates");
  const january = calendarRange(new Date(2026, 0, 15), "month");
  assert.equal(dayKey(january.start), "2025-12-29");
  assert.equal(dayKey(january.end), "2026-02-02");
  const february = calendarDays(new Date(2024, 1, 15), "month");
  assert.equal(february.length, 35);
  assert.ok(february.some((day) => dayKey(day) === "2024-02-29"));
  assert.equal(calendarDays(new Date(2026, 2, 15), "month").length, 42);
  assert.equal(calendarDays(new Date(2027, 1, 15), "month").length, 28);
  assert.equal(calendarDays(new Date(2026, 9, 20), "week").length, 7);
  assert.equal(calendarDays(new Date(2026, 9, 20), "day").length, 1);
});
test("agenda navega por mês sem saltar fevereiro e por dia/semana incluindo fins de semana", async () => {
  const { moveCalendarDate } = await import("../lib/hub/calendar");
  const { dayKey } = await import("../lib/hub/dates");
  assert.equal(
    dayKey(moveCalendarDate(new Date(2026, 0, 31), "month", 1)),
    "2026-02-28",
  );
  assert.equal(
    dayKey(moveCalendarDate(new Date(2024, 2, 31), "month", -1)),
    "2024-02-29",
  );
  assert.equal(
    dayKey(moveCalendarDate(new Date(2026, 11, 20), "month", 1)),
    "2027-01-20",
  );
  assert.equal(
    dayKey(moveCalendarDate(new Date(2026, 9, 23), "day", 1)),
    "2026-10-24",
  );
  assert.equal(
    dayKey(moveCalendarDate(new Date(2026, 9, 25), "week", 1)),
    "2026-11-01",
  );
});
test("agenda divide eventos na meia-noite sem repetir término na abertura do dia seguinte", async () => {
  const { eventDaySegment, overlapsPeriod } = await import(
    "../lib/hub/calendar"
  );
  const day = new Date(2026, 9, 23),
    tomorrow = new Date(2026, 9, 24);
  const event = {
    starts_at: new Date(2026, 9, 23, 22).toISOString(),
    ends_at: new Date(2026, 9, 24, 2).toISOString(),
  };
  assert.deepEqual(eventDaySegment(event, day), {
    start: 22,
    end: 24,
    continuesBefore: false,
    continuesAfter: true,
    key: "2026-10-23",
  });
  assert.deepEqual(eventDaySegment(event, tomorrow), {
    start: 0,
    end: 2,
    continuesBefore: true,
    continuesAfter: false,
    key: "2026-10-24",
  });
  const midnight = { ...event, ends_at: tomorrow.toISOString() };
  assert.equal(eventDaySegment(midnight, tomorrow), null);
  assert.equal(
    overlapsPeriod(midnight, tomorrow, new Date(2026, 9, 25)),
    false,
  );
});
test("agenda carrega todas as páginas com filtros de time, intervalo e cancelamento", async () => {
  const { loadCalendarEvents } = await import("../lib/hub/calendar-events");
  const pages = [
      Array.from({ length: 500 }, (_, i) => ({
        id: String(i).padStart(4, "0"),
      })),
      [{ id: "0500" }],
    ],
    calls: unknown[][] = [];
  const client = {
    from: (table: string) => {
      const call: unknown[] = [table];
      calls.push(call);
      const query: any = {};
      for (const name of ["select", "eq", "is", "gt", "lt", "order", "limit"])
        query[name] = (...args: unknown[]) => {
          call.push([name, ...args]);
          return query;
        };
      query.then = (resolve: any) =>
        Promise.resolve({ data: pages.shift(), error: null }).then(resolve);
      return query;
    },
  };
  const result = await loadCalendarEvents(
    client as any,
    "team",
    "start",
    "end",
  );
  assert.equal(result.length, 501);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.ok(
      call.some(
        (item) =>
          JSON.stringify(item) === JSON.stringify(["eq", "team_id", "team"]),
      ),
    );
    assert.ok(
      call.some(
        (item) =>
          JSON.stringify(item) === JSON.stringify(["is", "cancelled_at", null]),
      ),
    );
    assert.ok(
      call.some(
        (item) =>
          JSON.stringify(item) === JSON.stringify(["gt", "ends_at", "start"]),
      ),
    );
    assert.ok(
      call.some(
        (item) =>
          JSON.stringify(item) === JSON.stringify(["lt", "starts_at", "end"]),
      ),
    );
  }
  assert.ok(
    calls[1].some(
      (item) => JSON.stringify(item) === JSON.stringify(["gt", "id", "0499"]),
    ),
  );
});
test("agenda interrompe uma paginação obsoleta e propaga falhas de consulta", async () => {
  const { loadCalendarEvents } = await import("../lib/hub/calendar-events");
  assert.deepEqual(
    await loadCalendarEvents({} as any, "team", "start", "end", () => false),
    [],
  );
  const query: any = {};
  for (const name of ["select", "eq", "is", "gt", "lt", "order", "limit"])
    query[name] = () => query;
  query.then = (resolve: any) =>
    Promise.resolve({ data: null, error: new Error("Fixture failure") }).then(
      resolve,
    );
  await assert.rejects(
    () =>
      loadCalendarEvents({ from: () => query } as any, "team", "start", "end"),
    /Fixture failure/,
  );
});

test("verificação LiveKit é opt-in, somente leitura e não expõe erros do provedor", async () => {
  const { verifyLivekitConfiguration } = await import(
    "../lib/livekit/verify-configuration.mjs"
  );
  assert.deepEqual(await verifyLivekitConfiguration({}), { checked: false });
  const env = {
    HUB_VERIFY_LIVEKIT: "1",
    LIVEKIT_URL: "wss://fixture.livekit.cloud",
    LIVEKIT_API_KEY: "fixture-key",
    LIVEKIT_API_SECRET: "fixture-secret",
  };
  const calls: unknown[] = [];
  assert.deepEqual(
    await verifyLivekitConfiguration(env, (...args: unknown[]) => ({
      listRooms: async () => {
        calls.push(args);
        return [];
      },
    })),
    { checked: true },
  );
  assert.deepEqual(calls, [
    ["https://fixture.livekit.cloud", "fixture-key", "fixture-secret"],
  ]);
  await assert.rejects(
    () => verifyLivekitConfiguration({ ...env, LIVEKIT_API_SECRET: "" }),
    /faltam variáveis/,
  );
  for (const url of [
    "https://fixture.livekit.cloud",
    "wss://user:pass@fixture.livekit.cloud",
    "wss://fixture.livekit.cloud/token?key=secret",
    "bad-url",
  ]) {
    await assert.rejects(
      () => verifyLivekitConfiguration({ ...env, LIVEKIT_URL: url }),
      /URL WebSocket/,
    );
  }
  await assert.rejects(
    () =>
      verifyLivekitConfiguration(env, () => ({
        listRooms: async () => {
          throw new Error("fixture-secret raw provider error");
        },
      })),
    (error) => {
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes("fixture-secret"));
      return /não foi possível autenticar/.test(error.message);
    },
  );
});
