import type { HomeOfficeEntry } from "./types";
import { dateAt, dayKey } from "./dates";

export function homeOfficeSummaryRange(today: string) {
  const date = new Date(`${today}T12:00:00`);
  return {
    startsOn: dayKey(dateAt(date, -date.getDay())),
    endsOn: dayKey(dateAt(date, 42)),
  };
}

/** The scale uses Sunday-based weeks, independently of the agenda's selected date. */
export function homeOfficeSummary(entries: HomeOfficeEntry[], today: string) {
  const week = homeOfficeSummaryRange(today).startsOn;
  const pausedWeeks = new Set(
    entries
      .filter((entry) => entry.entry_kind === "holiday_week")
      .map((entry) => entry.week_start),
  );
  const assignments = entries
    .filter(
      (entry) =>
        entry.entry_kind === "home_office" &&
        !pausedWeeks.has(entry.week_start),
    )
    .sort((a, b) => a.scheduled_on.localeCompare(b.scheduled_on));
  const nextDate = assignments.find(
    (entry) => entry.scheduled_on > today,
  )?.scheduled_on;
  return {
    today: assignments.filter((entry) => entry.scheduled_on === today),
    next: assignments.filter((entry) => entry.scheduled_on === nextDate),
    holidayWeek: entries.find(
      (entry) =>
        entry.entry_kind === "holiday_week" && entry.week_start === week,
    ),
    holiday: entries.find(
      (entry) => entry.entry_kind === "holiday" && entry.scheduled_on === today,
    ),
  };
}

export type JourneyBalance = {
  expectedMinutes: number;
  actualSeconds: number;
  balanceMinutes: number;
};
