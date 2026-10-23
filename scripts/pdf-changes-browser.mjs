import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright"),
  { buildSync } = require("esbuild");
const base = process.env.HUB_APP_URL || "http://127.0.0.1:3000",
  out = "/tmp/zulu-pdf-qa";
fs.mkdirSync(out, { recursive: true });
for (const name of ["kanban", "form-controls"])
  buildSync({
    entryPoints: [`scripts/fixtures/${name}-harness.tsx`],
    bundle: true,
    outfile: `${out}/${name}.js`,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [],
  warnings = [];
function observe(page) {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    else if (
      m.type() === "warning" &&
      !/WebGL|GPU|software|ReadPixels|Service Worker registration blocked by Playwright/.test(
        m.text(),
      )
    )
      warnings.push(m.text());
  });
}
async function fixture(page, name, count = 60) {
  await page.goto(base + "/demo/workspace?page=board");
  const css = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((es) => es.map((e) => e.href));
  await page.route("**/__zulu_pdf_fixture", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="pt-BR" data-kanban-cards="${count}"><head>${css.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head><body><div id="${name === "kanban" ? "kanban" : "form"}-harness"></div><script src="/__zulu_pdf_fixture.js"></script></body></html>`,
    }),
  );
  await page.route("**/__zulu_pdf_fixture.js", (r) =>
    r.fulfill({
      contentType: "application/javascript",
      path: `${out}/${name}.js`,
    }),
  );
  await page.goto(base + "/__zulu_pdf_fixture");
  await page
    .locator(name === "kanban" ? ".task-card" : "button[type=submit]")
    .first()
    .waitFor();
}
async function drag(
  page,
  source,
  target,
  { cancel = false, screenshot = false } = {},
) {
  await source.scrollIntoViewIfNeeded();
  const a = await source.boundingBox(),
    b = await target.boundingBox();
  assert(a && b);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2, {
    steps: 2,
  });
  await page.locator(".kanban-physics-card").waitFor();
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(40, b.height / 2), {
    steps: 18,
  });
  await page.waitForTimeout(30);
  if (screenshot) await page.screenshot({ path: out + "/kanban-drag.png" });
  await page.waitForTimeout(250);
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.waitForTimeout(500);
}
async function measureActiveDrag(page) {
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  const source=page.locator('.board-todo .kanban-drag-handle').first();await source.scrollIntoViewIfNeeded();const a=await source.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(a.x+a.width/2+12,a.y+a.height/2);await page.locator('.kanban-physics-card').waitFor();await page.waitForTimeout(150);
  const before=await cdp.send('Performance.getMetrics');
  await page.evaluate(()=>{window.dragFrameTimes=[];window.collectDragFrames=true;let previous=performance.now();function frame(time){if(!window.collectDragFrames)return;window.dragFrameTimes.push(time-previous);previous=time;requestAnimationFrame(frame)}requestAnimationFrame(frame)});
  for(let i=1;i<=72;i++){await page.mouse.move(a.x+a.width/2+320*Math.sin(i/72*Math.PI),a.y+a.height/2+20*Math.sin(i/72*Math.PI*2));await page.waitForTimeout(16);}
  const frames=await page.evaluate(()=>{window.collectDragFrames=false;return window.dragFrameTimes.slice(3)});const after=await cdp.send('Performance.getMetrics');
  await page.mouse.up();await page.waitForTimeout(500);frames.sort((a,b)=>a-b);
  const metric=(values,name)=>values.metrics.find(m=>m.name===name)?.value??0;
  return {cards:60,frames:frames.length,medianFrameMs:frames[Math.floor(frames.length*.5)],p95FrameMs:frames[Math.floor(frames.length*.95)],mainThreadTaskSeconds:metric(after,'TaskDuration')-metric(before,'TaskDuration'),method:'rAF + CDP Performance during active drag; no screenshots'};
}

const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  locale: "pt-BR",
  serviceWorkers: "block",
});
observe(page);
await fixture(page, "kanban");
assert.equal(await page.locator(".task-card").count(), 60);
if(process.env.ZULU_QA_PERF_ONLY){console.log(JSON.stringify(await measureActiveDrag(page),null,2));await browser.close();process.exit(0);}

await page.evaluate(() => {
  window.qaFrames = [];
  let previous = performance.now();
  function frame(time) {
    window.qaFrames.push(time - previous);
    previous = time;
    if (window.qaFrames.length < 240) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
});
let source = page.getByRole("button", {
  name: "Arrastar tarefa Revisar a navegação",
  exact: true,
});
await drag(
  page,
  source,
  page.locator(".board-in_progress .task-card").first(),
  { screenshot: true },
);
let result = JSON.parse(await page.locator("#drop-result").textContent());
assert.equal(result.id, "demo-task-1");
assert.equal(result.status, "in_progress");
source = page.locator(".board-in_progress .kanban-drag-handle").first();
await drag(page, source, page.locator(".board-in_progress .task-card").nth(1));
result = JSON.parse(await page.locator("#drop-result").textContent());
assert.equal(result.status, "in_progress");
const beforeCancel = await page.locator("#persisted-board").textContent();
await drag(
  page,
  page.locator(".board-todo .kanban-drag-handle").first(),
  page.locator(".board-done .task-card").first(),
  { cancel: true },
);
assert.equal(
  await page.locator("#persisted-board").textContent(),
  beforeCancel,
);
await page.locator("#fail-next").click();
await drag(
  page,
  page.locator(".board-todo .kanban-drag-handle").first(),
  page.locator(".board-done .task-card").first(),
);
assert.match(
  await page.getByRole("alert").textContent(),
  /Falha de persistência/,
);
assert.equal(
  await page.locator("#persisted-board").textContent(),
  beforeCancel,
);
const frames = await page.evaluate(() =>
  window.qaFrames.filter((n) => n < 1000),
);
frames.sort((a, b) => a - b);
const performance = {
  cards: 60,
  workflowMedianFrameMs: frames[Math.floor(frames.length * 0.5)],
  workflowP95FrameMs: frames[Math.floor(frames.length * 0.95)],
};
await page.screenshot({ path: out + "/kanban-60.png" });
const keyboard = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  locale: "pt-BR",
  reducedMotion: "reduce",
  serviceWorkers: "block",
});
observe(keyboard);
await fixture(keyboard, "kanban", 6);
await keyboard.locator(".board-todo .kanban-drag-handle").first().focus();
await keyboard.keyboard.press("Space");
await keyboard.locator(".kanban-physics-card").waitFor();
await keyboard.waitForTimeout(100);
await keyboard.keyboard.press("ArrowDown");
await keyboard.waitForTimeout(100);
await keyboard.keyboard.press("Space");
await keyboard.waitForTimeout(250);
assert.notEqual(await keyboard.locator("#drop-result").textContent(), "");
const touch = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: "pt-BR",
  serviceWorkers: "block",
});
observe(touch);
await fixture(touch, "kanban", 6);
const handles = touch.locator(".board-todo .kanban-drag-handle");
await handles.first().scrollIntoViewIfNeeded();
const a = await handles.first().boundingBox(),
  b = await touch.locator(".board-todo .task-card").nth(1).boundingBox();
const cdp = await touch.context().newCDPSession(touch);
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: a.x + a.width / 2, y: a.y + a.height / 2 }],
});
await touch.waitForTimeout(180);
for (let i = 1; i <= 12; i++) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      {
        x: a.x + a.width / 2 + ((b.x - a.x) * i) / 12,
        y: a.y + a.height / 2 + ((b.y + 35 - a.y) * i) / 12,
      },
    ],
  });
  await touch.waitForTimeout(20);
}
await cdp.send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
await touch.waitForTimeout(500);
assert.notEqual(await touch.locator("#drop-result").textContent(), "");
await touch.screenshot({ path: out + "/kanban-mobile.png" });
const forms = await browser.newPage({
  viewport: { width: 1000, height: 900 },
  locale: "pt-BR",
  reducedMotion: "reduce",
  serviceWorkers: "block",
});
observe(forms);
await fixture(forms, "form-controls");
await forms.getByRole("button", { name: "Enviar", exact: true }).click();
let data = JSON.parse(await forms.locator("#form-result").textContent());
assert.deepEqual(data, {
  date: "2026-10-23",
  time: "12:30",
  start: "2026-10-23T09:15",
  hours: "7.5",
  accept: "yes",
});
assert.equal(
  await forms
    .locator(
      "input[type=date],input[type=time],input[type=datetime-local],input[type=number],select",
    )
    .evaluateAll(
      (all) =>
        all.filter((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.width > 2 && r.height > 2 && !el.closest("[aria-hidden=true]")
          );
        }).length,
    ),
  0,
);
await forms.getByRole("textbox", { name: /^Horas/ }).fill("8,5");
await forms.getByRole("button", { name: "Enviar", exact: true }).click();
data = JSON.parse(await forms.locator("#form-result").textContent());
assert.equal(data.hours, "8.5");
await forms
  .getByRole("button", { name: /^Abrir calendário/ })
  .first()
  .click();
assert.match(
  await forms.locator("[data-slot=date-picker-popover]").textContent(),
  /outubro|Outubro/,
);
await forms.screenshot({ path: out + "/fields-calendar.png" });
await forms.keyboard.press("Escape");
await forms.locator("form").evaluate((form) => form.reset());
await forms.waitForTimeout(50);
await forms.getByRole("button", { name: "Enviar", exact: true }).click();
assert.equal(
  JSON.parse(await forms.locator("#form-result").textContent()).hours,
  "7.5",
);
for (const width of [1440, 390]) {
  const p = await browser.newPage({
    viewport: { width, height: 1000 },
    locale: "pt-BR",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  observe(p);
  await p.goto(base + "/demo/workspace?page=organization");
  await p.getByRole("heading", { name: "Forma", exact: true }).waitFor();
  const checkbox = p.getByRole("checkbox", {
    name: "Usar e editar Projetos",
    exact: true,
  });
  const checked = await checkbox.isChecked();
  await checkbox.locator("xpath=ancestor::label").click();
  assert.notEqual(await checkbox.isChecked(), checked);
  await checkbox.focus();
  await p.keyboard.press("Space");
  assert.equal(await checkbox.isChecked(), checked);
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await p.screenshot({
    path: `${out}/permissions-${width}.png`,
    fullPage: true,
  });
  await p.getByRole("tab", { name: "Funcionalidades", exact: true }).click();
  const alignment = await p
    .locator(".org-feature strong")
    .evaluateAll((all) => all.map((el) => el.getBoundingClientRect().x));
  assert(alignment.every((x) => Math.abs(x - alignment[0]) < 1));
  await p.screenshot({ path: `${out}/features-${width}.png`, fullPage: true });
  await p.goto(base + "/demo/workspace?page=settings");
  await p.getByRole("heading", { name: "Sua conta", exact: true }).waitFor();
  await p.screenshot({ path: `${out}/settings-${width}.png`, fullPage: true });
  await p.close();
}
const desktop = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36",
  reducedMotion: "reduce",
});
observe(desktop);
await desktop.addInitScript(() => {
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd) => {
      if (cmd === "desktop_titlebar")
        return { supported: true, maximized: false };
      throw Error("Unavailable fixture IPC");
    },
  };
});
await desktop.goto(base + "/demo/dashboard");
await desktop.waitForFunction(
  () => document.documentElement.dataset.desktopAppChrome === "true",
);
const frame = await desktop.evaluate(() => ({
  padding: getComputedStyle(document.body).paddingTop,
  main: document.querySelector(".main-content").getBoundingClientRect().top,
  titlebar: document.querySelector(".desktop-titlebar").getBoundingClientRect()
    .height,
}));
assert.equal(frame.padding, "0px");
assert.equal(frame.main, 48);
assert.equal(frame.titlebar, 48);
await desktop.locator(".greeting-signature > g path").first().waitFor();
const clipped = await desktop.locator(".greeting-signature").evaluate((svg) => {
  const v = svg.viewBox.baseVal;
  return [...svg.querySelectorAll("g path")].some((p) => {
    const b = p.getBBox();
    return (
      b.x < v.x - 0.5 ||
      b.y < v.y - 0.5 ||
      b.x + b.width > v.x + v.width + 0.5 ||
      b.y + b.height > v.y + v.height + 0.5
    );
  });
});
assert.equal(clipped, false);
await desktop.screenshot({ path: out + "/desktop-frame.png", fullPage: true });
assert.deepEqual(errors, []);
console.log(
  JSON.stringify(
    {
      mouse: true,
      reorder: true,
      cancel: true,
      rollback: true,
      keyboard: true,
      touch: true,
      formValues: data,
      permissions: true,
      featuresAligned: true,
      desktopFrame: frame,
      signatureClipped: clipped,
      performance,
      errors,
      warnings,
      screenshots: out,
    },
    null,
    2,
  ),
);
await browser.close();
