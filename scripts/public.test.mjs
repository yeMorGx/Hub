import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Run against an already-started Hub. No accounts, emails or business writes.
const base = new URL(process.env.HUB_APP_URL || "http://127.0.0.1:3000");
assert.ok(["http:", "https:"].includes(base.protocol));
const allowedOrigin =
  process.env.HUB_APP_ORIGIN || "https://hub-one-azure.vercel.app";
const request = (path) =>
  fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
function redirectTo(response, path) {
  assert.ok(
    [302, 303, 307, 308].includes(response.status),
    `HTTP ${response.status}`,
  );
  const location = new URL(response.headers.get("location"), base);
  assert.equal(location.origin, base.origin);
  assert.equal(location.pathname + location.search, path);
}
for (const path of ["/", "/mfa"]) {
  test(`sem sessão, ${path} exige login`, async () => {
    const response = await request(path);
    redirectTo(response, "/login");
    assert.match(response.headers.get("cache-control") || "", /no-store/);
  });
}
for (const path of ["/login", "/reset-password"]) {
  test(`${path} responde sem permitir cache compartilhado`, async () => {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
    assert.match(response.headers.get("cache-control") || "", /private/);
    assert.match(response.headers.get("cache-control") || "", /no-store/);
  });
}
for (const path of [
  "/auth/callback",
  "/auth/callback?next=https%3A%2F%2Fexample.invalid%2F",
  "/auth/confirm",
  "/auth/confirm?token_hash=not-a-real-token&type=unknown",
]) {
  test(`${path} retorna ao login quando o link é incompleto/inválido`, async () => {
    const response = await request(path);
    redirectTo(response, "/login?notice=link-expired");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.match(response.headers.get("cache-control") || "", /no-store/);
  });
}
test("manifest contém escopo e ícones da PWA", async () => {
  const response = await request("/manifest.webmanifest");
  assert.equal(response.status, 200);
  const manifest = await response.json();
  assert.equal(manifest.short_name, "ZULU");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  for (const size of [192, 512])
    assert.ok(
      manifest.icons.some(
        (icon) =>
          icon.src === `/pwa/icon/${size}?v=zulu-1` && icon.sizes === `${size}x${size}`,
      ),
    );
});
for (const size of [180, 192, 512]) {
  test(`ícone ${size} é um PNG com dimensões corretas`, async () => {
    const response = await request(`/pwa/icon/${size}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /image\/png/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  });
}
test("service worker é servido para a raiz sem cache persistente do script", async () => {
  const response = await request("/sw.js");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("service-worker-allowed"), "/");
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  assert.match(response.headers.get("content-type") || "", /javascript/);
});
test("página offline está disponível sem sessão", async () => {
  const response = await request("/offline.html");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /reconect|conexão/i);
});
for (const [path, target] of [
  ["/demo", "/demo/dashboard"],
  ["/demo/kanban", "/demo/workspace?page=board"],
]) {
  test(`${path} encaminha para a demonstração mantida`, async () => {
    redirectTo(await request(path), target);
  });
}

for (const path of ["/api/integrations/status", "/api/integrations/jobs"]) {
  test(`${path} recusa acesso sem sessão ou segredo de job`, async () => {
    const response = await request(path);
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control") || "", /no-store/);
  });
}
for (const path of [
  "/api/livekit/token",
  "/api/livekit/access",
  "/api/integrations/google/sync",
  "/api/integrations/google/disconnect",
]) {
  test(`${path} exige sessão MFA para POST de origem permitida`, async () => {
    const response = await fetch(new URL(path, base), {
      method: "POST",
      headers: {
        Origin: allowedOrigin,
        "Content-Type": "application/json",
      },
      body: "{}",
      redirect: "manual",
    });
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control") || "", /no-store/);
  });
}
test("calendário Outlook responde ao desafio como texto sem refletir HTML executável", async () => {
  const value = "<fixture-validation>";
  const response = await fetch(
    new URL(
      "/api/integrations/webhooks/outlook?validationToken=" +
        encodeURIComponent(value),
      base,
    ),
    { method: "POST" },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /text\/plain/);
  assert.equal(await response.text(), value);
});
test("demonstração operacional antiga encaminha para a organização atual", async () => {
  redirectTo(await request("/demo/operations"), "/demo/workspace?page=organization");
});

test("convite público responde sem cache e sem enviar referência", async () => {
  const response = await request("/invite");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(await response.text(), /Seu time está esperando/);
});
for (const path of ["/api/team-invitations", "/api/team-invitations/accept"]) {
  test(`${path} exige sessão MFA e rejeita origem externa`, async () => {
    for (const [origin, expected] of [
      [allowedOrigin, 401],
      ["https://external.invalid", 403],
    ]) {
      const response = await fetch(new URL(path, base), {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(response.status, expected);
      assert.match(response.headers.get("cache-control") || "", /no-store/);
    }
  });
}
test("convite pendente: token inválido é recusado; cookie é privado e pode ser descartado", async () => {
  const url = new URL("/api/team-invitations/pending", base);
  const headers = { Origin: allowedOrigin, "Content-Type": "application/json" };
  const invalid = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ token: "invalid" }),
  });
  assert.equal(invalid.status, 400);
  const crossOrigin = await fetch(url, {
    method: "POST",
    headers: { ...headers, Origin: "https://external.invalid" },
    body: JSON.stringify({ token: "a".repeat(43) }),
  });
  assert.equal(crossOrigin.status, 403);
  // Token fictício: guardar a intenção de abrir um convite não cria associação.
  const valid = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ token: "a".repeat(43) }),
  });
  assert.equal(valid.status, 200);
  const cookie = valid.headers.get("set-cookie") || "";
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=lax/i);
  const preview = await fetch(url, {
    headers: { Cookie: cookie.split(";")[0] },
  });
  assert.equal(preview.status, 401);
  const dismissed = await fetch(url, { method: "DELETE", headers });
  assert.equal(dismissed.status, 200);
  assert.match(dismissed.headers.get("set-cookie") || "", /Max-Age=0/i);
});

test("prévia antiga do calendário encaminha para o calendário atual", async () => {
  redirectTo(await request("/demo/calendar"), "/demo/workspace?page=calendar");
});

test("site público apresenta o produto e leva à central de downloads", async () => {
  const response = await request("/site");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Seu time\./);
  assert.match(html, /href="\/download"/);
  assert.match(html, /canonical/);
  assert.match(html, /dados fictícios/);
});
test("downloads expõe o instalador oficial e informa versão e assinatura pendente", async () => {
  const response = await request("/download");
  assert.equal(response.status, 200);
  const html = await response.text();
  const release = readFileSync(new URL("../lib/desktop/public-release.ts", import.meta.url), "utf8");
  const filename = release.match(/filename: "([^"]+)"/)?.[1];
  const sha256 = release.match(/sha256: "([^"]+)"/)?.[1];
  assert.match(filename ?? "", /^Hub_\d+\.\d+\.\d+_x64-setup\.exe$/);
  assert.match(sha256 ?? "", /^[a-f0-9]{64}$/);
  assert.ok(html.includes(filename), "download deve apontar para o instalador configurado");
  assert.match(html, /não tem assinatura de código/);
  assert.match(html, /macOS/);
  assert.match(html, /Linux/);
  assert.ok(html.includes(sha256), "download deve informar o SHA-256 configurado");
});
test("marketing publica apenas as páginas públicas no sitemap e serve imagem social", async () => {
  const response = await request("/sitemap.xml");
  assert.equal(response.status, 200);
  const xml = await response.text();
  assert.match(xml, /\/site/);
  assert.match(xml, /\/download/);
  assert.doesNotMatch(xml, /\/invite|\/demo|\/login/);
  const image = await request("/marketing/og.png");
  assert.equal(image.status,200);
  assert.match(image.headers.get("content-type") || "", /image\/png/);
});

test('administração: convite configurado exige origem e MFA',async()=>{
 const response=await fetch(new URL('/api/organization/invite',base),{method:'POST',headers:{Origin:allowedOrigin,'Content-Type':'application/json'},body:JSON.stringify({authorizationId:'00000000-0000-0000-0000-000000000000'})});assert.equal(response.status,401);assert.match(response.headers.get('cache-control')||'',/no-store/);
});
test('administração: origem externa não emite convite',async()=>{
 const response=await fetch(new URL('/api/organization/invite',base),{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(response.status,403);
});
test('biblioteca: download sem sessão não revela arquivo nem URL assinada',async()=>{
 const response=await request('/api/library/download?workspace=00000000-0000-0000-0000-000000000000&id=00000000-0000-0000-0000-000000000000');assert.equal(response.status,401);assert.match(response.headers.get('cache-control')||'',/no-store/);const body=await response.json();assert.equal(body.url,undefined);
});
