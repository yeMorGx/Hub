import type { ReportRow } from "./use-management";
export type ReportBalance = { user_id: string; display_name: string; work_date: string; expected_minutes: number; actual_seconds: number; configured: boolean };
export type HoursReportData = {
  organization: string; team: string; from: string; to: string; timezone: string;
  rows: ReportRow[]; balances: ReportBalance[]; project: string; person: string;
};
export function reportDuration(seconds: number) {
  const minutes = Math.floor(Math.abs(seconds) / 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`;
}
export function reportGroups(rows: ReportRow[], key: "user_id" | "project_id") {
  const map = new Map<string, { id: string; label: string; seconds: number }>();
  for (const row of rows) {
    const id = row[key] || "none", item = map.get(id) ?? { id, label: key === "user_id" ? row.display_name : row.project_name || "Sem projeto", seconds: 0 };
    item.seconds += Number(row.duration_seconds); map.set(id, item);
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds || a.label.localeCompare(b.label, "pt-BR"));
}
export function reportDays(rows: ReportRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const start = new Date(row.started_at), end = new Date(row.ended_at);
    for (let cursor = start; cursor < end;) {
      const next = new Date(cursor); next.setHours(24, 0, 0, 0);
      const finish = new Date(Math.min(next.getTime(), end.getTime()));
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + Math.max(0, (finish.getTime() - cursor.getTime()) / 1000));
      cursor = finish;
    }
  }
  return [...map].sort(([a], [b]) => a.localeCompare(b)).map(([label, seconds]) => ({ label, seconds }));
}

export function reportPeople(data: Pick<HoursReportData, "rows" | "balances">) {
  const people = new Map(reportGroups(data.rows, "user_id").map(person => [person.id, person]));
  for (const balance of data.balances) if (!people.has(balance.user_id)) people.set(balance.user_id, { id: balance.user_id, label: balance.display_name, seconds: 0 });
  return [...people.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
