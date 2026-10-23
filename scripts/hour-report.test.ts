import { test } from "node:test";
import assert from "node:assert/strict";
import { reportDays, reportDuration, reportGroups, reportPeople } from "../lib/hub/hour-report";
import { createHoursPdf } from "../lib/hub/hour-report-pdf";
import type { ReportRow } from "../lib/hub/use-management";
const row = (values: Partial<ReportRow> = {}): ReportRow => ({ entry_id: "entry", user_id: "alice", display_name: "Alice", project_id: "p1", project_name: "Produto", client_id: "client", client_name: "Cliente", description: "Revisão de produto", started_at: new Date(2026, 9, 20, 9).toISOString(), ended_at: new Date(2026, 9, 20, 10).toISOString(), duration_seconds: 3600, ...values });
test("report totals group by IDs and preserve missing projects without merging names", () => {
  const rows = [row(), row({ user_id: "bob", project_id: "", project_name: "", duration_seconds: 1800 }), row({ project_id: "p2", project_name: "Produto", duration_seconds: 7200 })];
  assert.equal(reportGroups(rows, "project_id").length, 3);
  assert.equal(reportGroups(rows, "user_id")[0].seconds, 10800);
  assert.equal(reportDuration(60 * 60 + 59 * 60 + 59), "1h 59min");
  const days = reportDays([row({ started_at: new Date(2026, 9, 20, 23, 30).toISOString(), ended_at: new Date(2026, 9, 21, 0, 30).toISOString() })]);
  assert.deepEqual(days.map(day => day.seconds), [1800, 1800]);
});
test("people with planned hours and zero entries remain in the team report", () => {
  assert.equal(reportPeople({ rows: [], balances: [{ user_id: "alice", display_name: "Alice", work_date: "2026-10-20", expected_minutes: 480, actual_seconds: 0, configured: true }] })[0].seconds, 0);
});
test("detailed PDF paginates long activities, retains every record and separates people", async () => {
  const pdf = await createHoursPdf({ organization: "Estúdio", team: "Produto", from: "2026-10-01", to: "2026-10-23", timezone: "America/Sao_Paulo", project: "", person: "", balances: [], rows: Array.from({ length: 90 }, (_, i) => row({ entry_id: String(i), user_id: i < 45 ? "alice" : "bob", display_name: i < 45 ? "Alice" : "Bruno", description: `Atividade ${i} / ` + "Detalhamento do trabalho realizado. ".repeat(8) })) });
  assert.ok(pdf.getNumberOfPages() > 4);
  const output = pdf.output();
  assert.ok(output.startsWith("%PDF"));
  for (const index of [0, 44, 45, 89]) assert.ok(output.includes(`Atividade ${index}`));
  assert.ok(output.includes("Alice")); assert.ok(output.includes("Bruno"));
});
