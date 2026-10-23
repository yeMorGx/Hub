import { dateAt, dayKey, localHour, mondayOf } from "./dates";
export type CalendarView = "month" | "week" | "day";

// Selection uses local wall-clock hours, including 24:00 on the following day.
export function calendarSelection(anchor: number, current: number, limit: number, dragged = true) {
  return dragged
    ? { start: Math.min(anchor, current), end: Math.min(Math.max(anchor, current) + 0.25, limit) }
    : { start: anchor, end: Math.min(anchor + 1, limit) };
}

export function calendarDraft(date: Date, hour = 10, endHour = hour + 1) {
  const start = new Date(date), end = new Date(date);
  start.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
  end.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);
  return { start, end };
}
export function calendarRange(date: Date, view: CalendarView) {
  if (view === "day") {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return { start, end: dateAt(start, 1) };
  }
  if (view === "week") {
    const start = mondayOf(date);
    return { start, end: dateAt(start, 7) };
  }
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = mondayOf(first);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end: dateAt(mondayOf(last), 7) };
}
export function calendarDays(date: Date, view: CalendarView) {
  const { start, end } = calendarRange(date, view);
  const days: Date[] = [];
  for (let day = start; day < end; day = dateAt(day, 1)) days.push(day);
  return days;
}
export function moveCalendarDate(
  date: Date,
  view: CalendarView,
  direction: number,
) {
  if (view !== "month")
    return dateAt(date, direction * (view === "week" ? 7 : 1));
  const first = new Date(date.getFullYear(), date.getMonth() + direction, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(date.getDate(), last));
  return first;
}
export function overlapsPeriod(
  event: { starts_at: string; ends_at: string },
  start: Date,
  end: Date,
) {
  return new Date(event.starts_at) < end && new Date(event.ends_at) > start;
}
export function eventDaySegment(
  event: { starts_at: string; ends_at: string },
  day: Date,
) {
  const end = dateAt(day, 1);
  if (!overlapsPeriod(event, day, end)) return null;
  const from = new Date(event.starts_at),
    to = new Date(event.ends_at);
  return {
    start: from <= day ? 0 : localHour(from),
    end: to >= end ? 24 : localHour(to),
    continuesBefore: from < day,
    continuesAfter: to > end,
    key: dayKey(day),
  };
}
