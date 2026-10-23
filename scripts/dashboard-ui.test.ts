import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import {
  DashboardUIProvider,
  ZuluButton,
  ZuluForm,
  ZuluInput,
  ZuluLabel,
  ZuluSelect,
  ZuluCheckboxField,
} from "../components/dashboard-ui";

function render(enabled: boolean, children: ReturnType<typeof h>) {
  return renderToString(h(DashboardUIProvider, { enabled, children }));
}

test("HeroUI preserves named form inputs, required fields and submit buttons", () => {
  const html = render(
    true,
    h(
      ZuluForm,
      null,
      h(ZuluInput, {
        name: "title",
        required: true,
        defaultValue: "Reunião",
        maxLength: 200,
      }),
      h(ZuluButton, null, "Salvar"),
    ),
  );
  assert.match(html, /name="title"/);
  assert.match(html, /value="Reunião"/);
  assert.match(html, /required=""/);
  assert.match(html, /type="submit"/);
  assert.match(html, /class="button/);
});

test("HeroUI serializes the empty product value instead of its internal option key", () => {
  const html = render(
    true,
    h(
      ZuluSelect,
      { name: "project", defaultValue: "", "aria-label": "Projeto" },
      h("option", { value: "" }, "Sem projeto"),
      h("option", { value: "p1" }, "Projeto 1"),
    ),
  );
  assert.match(html, /type="hidden" name="project" value=""/);
  assert.doesNotMatch(html, /name="project" value="__zulu_empty_option__"/);
});

test("disabled selects keep the submitted product field disabled", () => {
  const html = render(
    true,
    h(
      ZuluSelect,
      {
        name: "project",
        defaultValue: "p1",
        disabled: true,
        "aria-label": "Projeto",
      },
      h("option", { value: "p1" }, "Projeto 1"),
    ),
  );
  assert.match(
    html,
    /<input(?=[^>]*type="hidden")(?=[^>]*name="project")(?=[^>]*value="p1")(?=[^>]*disabled="")[^>]*>/,
  );
});

test("checkbox fields use one label with a native named checkbox", () => {
  const html = render(
    true,
    h(
      ZuluCheckboxField,
      {
        name: "members",
        value: "user1",
        checked: true,
        "aria-label": "Pessoa do time",
      },
      "Pessoa do time",
    ),
  );
  assert.equal((html.match(/<label\b/g) ?? []).length, 1);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /name="members"/);
  assert.match(html, /value="user1"/);
});

test("all surfaces use HeroUI and retain named form values", () => {
  const html = render(
    false,
    h(
      ZuluForm,
      null,
      h(ZuluButton, { disabled: true }, "Salvar"),
      h(
        ZuluSelect,
        { name: "project", defaultValue: "p1" },
        h("option", { value: "p1" }, "Projeto 1"),
      ),
    ),
  );
  assert.match(html, /data-slot="button"[^>]*disabled/);
  assert.match(html, /data-slot="select-trigger"/);
  assert.match(html, /type="hidden" name="project" value="p1"/);
});

test("select labels are composed without copying label IDs into the selected value", () => {
  const html = render(true, h(ZuluLabel, null, "Projeto", h(ZuluSelect, { name: "project", defaultValue: "p1" }, h("option", { value: "p1" }, "Projeto 1"))));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.doesNotMatch(html, /<label[^>]*>Projeto<[^>]*label/);
});
