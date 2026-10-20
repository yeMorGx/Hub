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
