import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.ZULU_QA_URL || "http://127.0.0.1:3002";
const out = process.env.ZULU_QA_OUTPUT || "/tmp/zulu-design-qa";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const errors = [], warnings = [];
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); if (message.type() === "warning" && !/WebGL|GPU|software|Service Worker registration/.test(message.text())) warnings.push(message.text()); });
    const settleTop = async () => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(250);
    };
    const go = async name => {
      await page.goto(`${base}/demo/workspace?page=${name}`);
      await page.locator(".workspace-inset").waitFor();
      await page.waitForTimeout(350);
      console.log(`Loaded ${name} ${width}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: overflow ${width}`);
    };
    await go("calendar");
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await page.getByRole("menuitemradio", { name: "Reuniões", exact: true }).click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
    await page.getByRole("radio", { name: "Dia", exact: true }).click();
    assert(await page.locator(".calendar-grid.day-view").count());
    await page.getByRole("radio", { name: "Mês", exact: true }).click();
    assert(await page.locator(".calendar-month").count());
    await page.getByRole("radio", { name: "Semana", exact: true }).click();
    console.log("Calendar views/filters passed");
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await page.getByRole("menuitemradio", { name: "Todos os eventos", exact: true }).click();
    const event = page.locator(".calendar-event").first();
    if (await event.count()) {
      assert((await event.locator("strong").boundingBox()).height >= 14, "event title clipped");
      // Mobile week scrolls horizontally, keeping the grid readable.
      await event.click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
    }
    await settleTop();
    if (process.env.ZULU_QA_CAPTURE !== "0") await page.screenshot({ path: `${out}/calendar-${width}.png`, fullPage: true });
    await go("chat");
    await page.getByRole("textbox", { name: "Buscar conversas" }).fill("não-existe");
    await page.getByRole("status").filter({ hasText: "Nenhuma conversa encontrada" }).waitFor();
    await page.getByRole("textbox", { name: "Buscar conversas" }).fill("");
    if (width === 390) await page.getByRole("button", { name: "projeto-hub", exact: true }).click();
    assert.equal(await page.locator(".advanced-message").count(), 3);
    assert(await page.locator(".advanced-conversation").evaluate(e => e.scrollWidth <= e.clientWidth + 1), "chat content overflows");
    const draft = page.getByRole("textbox", { name: "Sua mensagem", exact: true });
    assert(await draft.isVisible(), "composer missing");
    const form = await page.locator(".message-form").boundingBox();
    assert(form.x + form.width <= width + 1, "composer outside viewport");
    await page.locator(".advanced-message").last().hover();
    await page.getByRole("button", { name: "Reagir à mensagem", exact: true }).last().click();
    await page.getByRole("menu").waitFor();
    assert.equal(await page.getByRole("menuitem").count(), 5);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".conversation-day").count(), 1);
    if (width === 1440) {
      const panel = page.getByRole("complementary", { name: "Detalhes da conversa" });
      assert(await panel.isVisible(), "context panel missing on desktop");
      assert.equal(await panel.locator(".conversation-person").count(), 3);
      await panel.getByRole("button", { name: /Arquivos/ }).click();
      await panel.getByText("Nenhum item neste histórico.").last().waitFor();
      await page.getByRole("button", { name: "Detalhes da conversa", exact: true }).click();
      assert.equal(await panel.count(), 0);
      await page.getByRole("button", { name: "Detalhes da conversa", exact: true }).click();
      const ownText = await page.locator(".own-message .advanced-message-body > p").evaluate(e => {
        const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
        canvas.width = canvas.height = 1;
        ctx.fillStyle = getComputedStyle(e).color; ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
      });
      assert(ownText.every(channel => channel >= 240), "own message must have readable light text");
    }
    const own = await page.locator(".own-message .advanced-message-body").boundingBox();
    const other = await page.locator(".advanced-message:not(.own-message) .advanced-message-body").first().boundingBox();
    assert(own.x > other.x || width === 390, "own message not right aligned");
    await page.locator(".advanced-message").first().hover();
    await page.getByRole("button", { name: /Fixadas/ }).click();
    assert.equal(await page.locator(".advanced-message").count(), 1);
    await page.getByRole("button", { name: "Conversa", exact: true }).click();
    await settleTop();
    if (process.env.ZULU_QA_CAPTURE !== "0") await page.screenshot({ path: `${out}/chat-${width}.png`, fullPage: true });
    await go("notifications");
    await page.getByRole("radio", { name: "Não lidas", exact: true }).click();
    assert.equal(await page.locator(".notification-feed-row").count(), 1);
    const bell = page.getByRole("button", { name: /^Notificações/ });
    await bell.click();
    const inbox = page.getByRole("dialog", { name: "Central de notificações" });
    await inbox.waitFor();
    await page.waitForTimeout(300);
    await settleTop();
    if (process.env.ZULU_QA_CAPTURE !== "0") await page.screenshot({ path: `${out}/inbox-${width}.png` });
    await page.keyboard.press("Escape");
    await inbox.waitFor({ state: "hidden" });
    assert(await bell.evaluate(e => e === document.activeElement), "popover focus not restored");
    await page.getByRole("button", { name: "Marcar como lida", exact: true }).click();
    await page.getByRole("heading", { name: "Nenhuma notificação não lida", exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector(".notification-bell")?.getAttribute("aria-label") === "Notificações");
    await page.getByRole("radio", { name: "Todas", exact: true }).click();
    assert.equal(await page.getByRole("radio", { name: "Todas", exact: true }).getAttribute("aria-checked"), "true");
    assert.equal(await page.locator(".notification-feed-row.is-read").count(), 3);
    await settleTop();
    if (process.env.ZULU_QA_CAPTURE !== "0") await page.screenshot({ path: `${out}/notifications-${width}.png`, fullPage: true });
    await page.close();
    console.log(`PASS ${width}px: calendar controls/title, chat search/pins, notification read/filter/badge, popover focus`);
  }
  const reduced = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  await reduced.goto(`${base}/demo/workspace?page=calendar`);
  await reduced.locator(".calendar-full").waitFor();
  assert.equal(await reduced.locator(".rail-button").first().evaluate(e => getComputedStyle(e).transitionDuration), "0s");
  await reduced.evaluate(() => { localStorage.setItem("zulu:theme", "dark"); document.documentElement.dataset.zuluTheme = "dark"; });
  await reduced.getByRole("button", { name: /^Notificações/ }).click();
  const dialog = reduced.getByRole("dialog", { name: "Central de notificações" });
  await dialog.waitFor();
  assert.equal(await reduced.locator(".notification-popover").evaluate(e => getComputedStyle(e).backgroundColor), "rgb(28, 36, 49)");
  await reduced.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  console.log("PASS reduced motion, dark inbox, no page errors or console warnings");
} finally { await browser.close(); }
