"use client";

import { Button } from "@heroui/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from "react";
import { calendarSelection } from "@/lib/hub/calendar";
import { hourLabel } from "@/lib/hub/dates";

type Selection = { anchor: number; current: number; dragged: boolean; pointerId: number };

export function CalendarTimeColumn({ date, label, startHour, endHour, hourHeight, enabled, isToday, onNew, children }: {
  date: Date;
  label: string;
  startHour: number;
  endHour: number;
  hourHeight: number;
  enabled: boolean;
  isToday: boolean;
  onNew: (date: Date, start: number, end: number) => void;
  children: ReactNode;
}) {
  const active = useRef<Selection | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const cancel = () => { active.current = null; setSelection(null); };

  useEffect(() => {
    if (!selection) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", cancel);
    };
  }, [Boolean(selection)]);

  const position = (event: PointerEvent<HTMLDivElement>) => {
    const offset = event.clientY - event.currentTarget.getBoundingClientRect().top;
    return Math.max(startHour, Math.min(endHour - 0.25, startHour + Math.floor(offset / hourHeight * 4) / 4));
  };
  const range = selection ? calendarSelection(selection.anchor, selection.current, endHour, selection.dragged) : null;

  return (
    <div
      className={`day-column calendar-selectable-column ${isToday ? "today-column" : ""}`}
      style={{ height: (endHour - startHour) * hourHeight, "--calendar-hour-height": `${hourHeight}px` } as CSSProperties}
      onPointerDownCapture={(event) => {
        // Touch keeps native calendar scrolling. A tap uses the button's onPress.
        if (!enabled || !event.isPrimary || event.button !== 0 || event.pointerType === "touch" || !(event.target as HTMLElement).closest("[data-calendar-slot]")) return;
        const anchor = position(event);
        active.current = { anchor, current: anchor, dragged: false, pointerId: event.pointerId };
        setSelection(active.current);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMoveCapture={(event) => {
        if (!active.current || active.current.pointerId !== event.pointerId) return;
        const current = position(event);
        active.current = { ...active.current, current, dragged: active.current.dragged || current !== active.current.anchor };
        setSelection(active.current);
      }}
      onPointerUpCapture={(event) => {
        if (!active.current || active.current.pointerId !== event.pointerId) return;
        const current = position(event);
        const chosen = calendarSelection(active.current.anchor, current, endHour, active.current.dragged || current !== active.current.anchor);
        cancel();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (enabled) onNew(date, chosen.start, chosen.end);
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
    >
      {Array.from({ length: endHour - startHour }, (_, index) => startHour + index).map(hour => (
        <Button
          key={hour}
          type="button"
          variant="ghost"
          data-calendar-slot
          className="hour-cell calendar-time-slot"
          isDisabled={!enabled}
          aria-label={`Criar evento ${label} às ${hourLabel(hour)}`}
          style={{ height: hourHeight }}
          onPress={(event) => {
            if (event.pointerType === "mouse" || event.pointerType === "pen") return;
            const chosen = calendarSelection(hour, hour, endHour, false);
            onNew(date, chosen.start, chosen.end);
          }}
        />
      ))}
      {range && (
        <div className="calendar-selection" aria-hidden="true" style={{ top: (range.start - startHour) * hourHeight, height: (range.end - range.start) * hourHeight }}>
          <span>{hourLabel(range.start)} – {hourLabel(range.end)}</span>
        </div>
      )}
      {children}
    </div>
  );
}
