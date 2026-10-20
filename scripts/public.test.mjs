import { test } from "node:test";
import assert from "node:assert/strict";

// Run against an already-started Hub. No accounts, emails or business writes.
const base = new URL(process.env.HUB_APP_URL || "http://127.0.0.1:3000");
assert.ok(["http:", "https:"].includes(base.protocol));
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
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  for (const size of [192, 512])
    assert.ok(
      manifest.icons.some(
        (icon) =>
          icon.src === `/pwa/icon/${size}` && icon.sizes === `${size}x${size}`,
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
for (const path of ["/demo", "/demo/kanban"]) {
  test(`${path} retorna o HTML público esperado antes da hidratação`, async () => {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
    assert.match(
      await response.text(),
      path === "/demo" ? /Preparando seu espaço/ : /[Dd]emonstração/,
    );
  });
}
