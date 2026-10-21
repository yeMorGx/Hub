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
