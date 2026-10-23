import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDraft, calendarSelection } from "../lib/hub/calendar";

test("calendar click defaults to an hour and stays inside the last visible slot", () => {
  assert.deepEqual(calendarSelection(10.25, 10.25, 16, false), { start: 10.25, end: 11.25 });
  assert.deepEqual(calendarSelection(15.75, 15.75, 16, false), { start: 15.75, end: 16 });
});

test("dragging in either direction includes both selected quarter-hour slots", () => {
  assert.deepEqual(calendarSelection(10.25, 11.5, 16), { start: 10.25, end: 11.75 });
  assert.deepEqual(calendarSelection(11.5, 10.25, 16), { start: 10.25, end: 11.75 });
  assert.deepEqual(calendarSelection(15.75, 15.75, 16), { start: 15.75, end: 16 });
});

test("drafts preserve local date and minutes, including midnight rollover", () => {
  const date = new Date(2026, 9, 23, 12);
  const draft = calendarDraft(date, 10.25, 11.75);
  assert.equal(draft.start.getDate(), 23);
  assert.equal(draft.start.getHours(), 10);
  assert.equal(draft.start.getMinutes(), 15);
  assert.equal(draft.end.getHours(), 11);
  assert.equal(draft.end.getMinutes(), 45);
  const midnight = calendarDraft(date, 23.5, 24);
  assert.equal(midnight.end.getDate(), 24);
  assert.equal(midnight.end.getHours(), 0);
  assert.equal(date.getHours(), 12);
});
