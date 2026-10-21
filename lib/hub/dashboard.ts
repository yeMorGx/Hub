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

/** Only unread DMs in which this user is a participant and has a membership. */
export function unreadDmChannels(
  channels: import("./types").Row<"channels">[],
  memberships: import("./types").Row<"channel_members">[],
  unread: Record<string, number>,
  userId: string,
) {
  return channels
    .filter(
      (channel) =>
        channel.kind === "dm" &&
        !channel.archived_at &&
        (channel.dm_user_low === userId || channel.dm_user_high === userId) &&
        memberships.some(
          (member) =>
            member.channel_id === channel.id && member.user_id === userId,
        ) &&
        unread[channel.id] > 0,
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 8);
}
export function inboxText(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 160) || "Enviou um anexo";
}
export function balanceCaption(minutes: number) {
  return minutes > 0 ? "a mais" : minutes < 0 ? "a compensar" : "em dia";
}
