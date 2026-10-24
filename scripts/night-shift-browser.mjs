// Public, memory-only regression. No test accounts, e-mails or production mutations.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  { chromium } = require("playwright");
const base = process.env.HUB_APP_URL || "http://127.0.0.1:3003",
  out = process.env.ZULU_QA_OUTPUT || "/tmp/zulu-night-shift";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const errors = [],
  results = [];
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1024 },
      reducedMotion: "reduce",
      timezoneId: "America/Sao_Paulo",
    }),
    page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/demo/dashboard");
  await page.locator(".night-dashboard").waitFor();
  await page.getByRole("button", { name: "Nova tarefa", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nova tarefa", exact: true });
  await dialog
    .getByRole("textbox", { name: "Título", exact: true })
    .fill("Tarefa de verificação");
  await dialog
    .getByRole("textbox", { name: "Descrição", exact: true })
    .fill("Dados de teste apenas em memória.");
  await dialog
    .getByRole("button", { name: "Criar tarefa", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /Tarefa de verificação/ }).waitFor();
  results.push("task-create-memory");
  await page
    .getByRole("button", { name: "Pausar para almoço", exact: true })
    .click();
  await page
    .getByRole("timer", { name: "Duração do almoço", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Retomar trabalho", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Encerrar e salvar", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: /Iniciar timer|Escolher atividade/,
      exact: true,
    })
    .click();
  await page
    .getByRole("region", { name: "Escolher atividade", exact: true })
    .waitFor();
  const close = page.getByRole("button", {
    name: "Fechar escolha de atividade",
    exact: true,
  });
  await close.click();
  results.push("timer-lunch-resume-stop-picker");
  await page
    .getByRole("button", { name: "Buscar no ZULU", exact: true })
    .click();
  await page
    .getByRole("textbox", {
      name: "Buscar páginas, pessoas e eventos",
      exact: true,
    })
    .fill("relatorios");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Relatórios", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByText("Nenhum resultado. Tente outro termo.", { exact: true })
      .count(),
    0,
  );
  await page.keyboard.press("Escape");
  results.push("search");
  await page.getByRole("button", { name: "Meu perfil", exact: true }).click();
  const profile = page.getByRole("dialog");
  await profile
    .getByRole("textbox", { name: "Como podemos chamar você?", exact: true })
    .fill("Marina QA");
  await profile
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  await profile.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Meu perfil", exact: true }).click();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Como podemos chamar você?", exact: true })
      .inputValue(),
    "Marina QA",
  );
  await page.keyboard.press("Escape");
  assert(
    await page
      .locator(".today-team-list")
      .innerText()
      .then(
        (text) => text.includes("Pedro Alves") && text.includes("Lia Martins"),
      ),
  );
  results.push("profile-only-updates-own-person-and-bootstrap");
  const pages = [
    "overview",
    "board",
    "hours",
    "reports",
    "library",
    "notes",
    "goals",
    "clients",
    "chat",
    "organization-chat",
    "calls",
    "notifications",
    "calendar",
    "shifts",
    "absences",
    "dates",
    "meetings",
    "people",
    "standups",
    "settings",
    "organization",
    "integrations",
  ];
  for (const id of pages) {
    await page.goto(base + "/demo/workspace?page=" + id);
    await page.locator(`main[data-motion-page="${id}"]`).waitFor();
    await page.waitForTimeout(500);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1024 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        `${id} overflow at${width}`,
      );
      if (width > 760) {
        const settings = page
          .locator(".rail")
          .getByRole("button", { name: "Configurações", exact: true });
        assert(
          await settings.evaluate((el) => {
            const b = el.getBoundingClientRect(),
              hit = document.elementFromPoint(
                b.x + b.width / 2,
                b.y + b.height / 2,
              );
            return hit === el || el.contains(hit);
          }),
          "settings must remain clickable above timer",
        );
      }
      const dock = await page.locator(".night-timer-dock").boundingBox();
      assert(
        dock &&
          dock.height <= 190 &&
          dock.y >= 0 &&
          dock.y + dock.height <= 1024,
        `${id} timer dock`,
      );
      await page.screenshot({
        path: path.join(out, `${id}-${width}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1024 });
    results.push(id);
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(out, "result.json"),
    JSON.stringify(
      {
        base,
        pages: 22,
        viewportWidths: [1440, 390],
        results,
        errors,
        data: "public in-memory demonstration; not evidence of authenticated effects",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      scenarios: results.length,
      pages: 22,
      errors: errors.length,
    }),
  );
} finally {
  await browser.close();
}
