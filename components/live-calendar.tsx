"use client";
import { useState } from "react";
import {
  FunnelSimple,
  Plus,
  CaretLeft,
  CaretRight,
  Clock,
  CalendarDots,
} from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import type { Row } from "@/lib/hub/types";
import { dayKey, dateAt, hourLabel } from "@/lib/hub/dates";
import {
  calendarDays,
  calendarRange,
  eventDaySegment,
  overlapsPeriod,
  type CalendarView,
} from "@/lib/hub/calendar";
import { PeopleAvatars } from "./hub-ui";
const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
type SegmentEvent = { event: Row<"events">; start: number; end: number };
function eventLanes(items: SegmentEvent[]) {
  const result: (SegmentEvent & { lane: number; lanes: number })[] = [];
  let group: SegmentEvent[] = [],
    groupEnd = -1;
  const flush = () => {
    const ends: number[] = [];
    const placed = group.map((item) => {
      let lane = ends.findIndex((end) => end <= item.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = item.end;
      return { ...item, lane };
    });
    for (const item of placed) result.push({ ...item, lanes: ends.length });
    group = [];
  };
  for (const item of [...items].sort(
    (a, b) => a.start - b.start || b.end - a.end,
  )) {
    if (group.length && item.start >= groupEnd) flush();
    group.push(item);
    groupEnd = Math.max(groupEnd, item.end);
  }
  flush();
  return result;
}
export function LiveCalendar({
  hub,
  monday,
  date,
  onDate,
  today,
  day,
  view,
  onView,
  onDay,
  onMove,
  onToday,
  onNew,
  onSelect,
  full = false,
}: {
  hub: HubController;
  monday: Date;
  date: Date;
  onDate: (date: Date) => void;
  today: Date;
  day: number;
  view: CalendarView;
  onView: (view: CalendarView) => void;
  onDay: (day: number) => void;
  onMove: (direction: number) => void;
  onToday: () => void;
  onNew: (date: Date, hour?: number) => void;
  onSelect: (event: Row<"events">) => void;
  full?: boolean;
}) {
  const [filter, setFilter] = useState("all"),
    [filterOpen, setFilterOpen] = useState(false);
  const range = calendarRange(date, view);
  const monthDays = view === "month" ? calendarDays(date, "month") : [];
  const events = hub.snapshot.events.filter(
    (e) =>
      (filter === "all" || e.kind === filter) &&
      overlapsPeriod(e, range.start, range.end),
  );
  const visibleDays = view === "week" ? [0, 1, 2, 3, 4, 5, 6] : [day];
  const segments = visibleDays.map((index) => {
    const start = dateAt(monday, index);
    return {
      index,
      start,
      events: events.flatMap((event) => {
        const segment = eventDaySegment(event, start);
        return segment ? [{ event, ...segment }] : [];
      }),
    };
  });
  const startHour = Math.min(
    9,
    ...segments.flatMap((s) => s.events.map((e) => Math.floor(e.start))),
  );
  const endHour = Math.max(
    16,
    ...segments.flatMap((s) => s.events.map((e) => Math.ceil(e.end))),
  );
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => i + startHour,
  );
  const endOfWeek = dateAt(monday, 6);
  const label =
    view === "month"
      ? date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : view === "day"
        ? dateAt(monday, day).toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "numeric",
            month: "long",
          })
        : monday.getMonth() === endOfWeek.getMonth()
          ? `${monday.getDate()} – ${endOfWeek.getDate()} de ${endOfWeek.toLocaleDateString("pt-BR", { month: "long" })}, ${endOfWeek.getFullYear()}`
          : `${monday.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${endOfWeek.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`;
  return (
    <section
      className={`calendar-section ${full ? "calendar-full" : ""}`}
      aria-label="Agenda do time"
      aria-busy={hub.teamLoading}
    >
      <div className="section-heading calendar-heading">
        <div className="heading-with-count">
          <h2>{full ? "Agenda do time" : "Sua agenda"}</h2>
          <button
            className={`filter-button ${filter !== "all" ? "filter-active" : ""}`}
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <FunnelSimple size={14} />
            Filtrar
          </button>
          {filterOpen && (
            <div className="filter-popover">
              <label htmlFor="event-filter">Tipo de evento</label>
              <select
                id="event-filter"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setFilterOpen(false);
                }}
              >
                <option value="all">Todos os eventos</option>
                <option value="meeting">Reuniões</option>
                <option value="event">Eventos</option>
              </select>
            </div>
          )}
        </div>
        <div className="calendar-actions">
          <div className="segmented" aria-label="Visualização da agenda">
            <button
              className={view === "month" ? "selected" : ""}
              aria-pressed={view === "month"}
              onClick={() => onView("month")}
            >
              Mês
            </button>
            <button
              className={view === "week" ? "selected" : ""}
              aria-pressed={view === "week"}
              onClick={() => onView("week")}
            >
              Semana
            </button>
            <button
              className={view === "day" ? "selected" : ""}
              aria-pressed={view === "day"}
              onClick={() => onView("day")}
            >
              Dia
            </button>
          </div>
          {hub.canParticipate && (
            <button
              className="icon-button add-calendar"
              aria-label="Criar evento"
              onClick={() => onNew(dateAt(monday, day))}
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
      <div className="calendar-toolbar">
        <div className="date-controls">
          <button
            className="icon-button"
            aria-label={
              view === "month"
                ? "Mês anterior"
                : view === "week"
                  ? "Semana anterior"
                  : "Dia anterior"
            }
            onClick={() => onMove(-1)}
          >
            <CaretLeft size={15} />
          </button>
          <span>{label}</span>
          <button
            className="icon-button"
            aria-label={
              view === "month"
                ? "Próximo mês"
                : view === "week"
                  ? "Próxima semana"
                  : "Próximo dia"
            }
            onClick={() => onMove(1)}
          >
            <CaretRight size={15} />
          </button>
          <button className="text-button today-button" onClick={onToday}>
            Hoje
          </button>
        </div>
        <span
          className="timezone"
          title={Intl.DateTimeFormat().resolvedOptions().timeZone}
        >
          {view === "week" ? "Seg–dom · " : ""}GMT
          {-today.getTimezoneOffset() / 60 >= 0 ? "+" : ""}
          {-today.getTimezoneOffset() / 60}
        </span>
      </div>
      {hub.teamLoading && (
        <p className="resource-note" role="status">
          Atualizando agenda…
        </p>
      )}
      {view === "month" ? (
        <div className="calendar-month" aria-label={label}>
          <div className="month-weekdays" aria-hidden="true">
            {days.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="month-grid">
            {monthDays.map((cell) => {
              const entries = events
                .filter((event) => overlapsPeriod(event, cell, dateAt(cell, 1)))
                .sort(
                  (a, b) =>
                    a.starts_at.localeCompare(b.starts_at) ||
                    a.id.localeCompare(b.id),
                );
              const isToday = dayKey(cell) === dayKey(today);
              const openDay = () => {
                onDate(cell);
                onView("day");
              };
              return (
                <div
                  key={dayKey(cell)}
                  className={`month-cell ${cell.getMonth() !== date.getMonth() ? "outside-month" : ""} ${isToday ? "month-today" : ""}`}
                >
                  <div className="month-cell-header">
                    <button
                      className="month-date"
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`Abrir dia ${cell.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}`}
                      onClick={openDay}
                    >
                      {cell.getDate()}
                    </button>
                    {hub.canParticipate && (
                      <button
                        className="month-add"
                        aria-label={`Criar evento em ${cell.toLocaleDateString("pt-BR")}`}
                        onClick={() => onNew(cell)}
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                  <div className="month-events">
                    {entries.slice(0, 3).map((event) => {
                      const continues = new Date(event.starts_at) < cell;
                      const time = continues
                        ? "Continua"
                        : new Date(event.starts_at).toLocaleTimeString(
                            "pt-BR",
                            { hour: "2-digit", minute: "2-digit" },
                          );
                      return (
                        <button
                          key={event.id}
                          className={`month-event month-event-${event.kind}`}
                          title={`${time} · ${event.title}`}
                          onClick={() => onSelect(event)}
                        >
                          <span>{time}</span>
                          <strong>{event.title}</strong>
                        </button>
                      );
                    })}
                  </div>
                  {entries.length > 3 && (
                    <button className="month-more" onClick={openDay}>
                      +{entries.length - 3} eventos
                    </button>
                  )}
                  {entries.length > 0 && (
                    <button
                      className="month-count"
                      aria-label={`${entries.length} ${entries.length === 1 ? "evento" : "eventos"} em ${cell.toLocaleDateString("pt-BR")}`}
                      onClick={openDay}
                    >
                      <span aria-hidden="true" className="month-count-dot" />
                      {entries.length}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="calendar-scroll">
          <div
            className={`calendar-grid ${view === "day" ? "day-view" : "week-view"}`}
            style={{ "--days": visibleDays.length } as React.CSSProperties}
          >
            <div className="time-gutter-header">
              <Clock size={14} />
            </div>
            {segments.map((s) => (
              <button
                key={s.index}
                className={`day-header ${dayKey(s.start) === dayKey(today) ? "is-today" : ""}`}
                onClick={() => {
                  onDay(s.index);
                  onView("day");
                }}
              >
                <span>{days[s.index]}</span>
                <strong>{String(s.start.getDate()).padStart(2, "0")}</strong>
                {dayKey(s.start) === dayKey(today) && (
                  <span className="day-today">Hoje</span>
                )}
              </button>
            ))}
            <div
              className="time-gutter"
              style={{ height: (endHour - startHour) * 84 }}
            >
              {hours.map((hour) => (
                <span key={hour} style={{ top: (hour - startHour) * 84 }}>
                  {hourLabel(hour)}
                </span>
              ))}
            </div>
            {segments.map((segment) => (
              <div
                key={segment.index}
                className={`day-column ${dayKey(segment.start) === dayKey(today) ? "today-column" : ""}`}
                style={{ height: (endHour - startHour) * 84 }}
              >
                {hours.slice(0, -1).map((hour) => (
                  <button
                    key={hour}
                    className="hour-cell"
                    disabled={!hub.canParticipate}
                    aria-label={`Criar evento ${days[segment.index]} às ${hourLabel(hour)}`}
                    style={{ height: 84 }}
                    onClick={() => onNew(segment.start, hour)}
                  />
                ))}
                {eventLanes(segment.events).map(
                  ({ event, start, end, lane, lanes }) => {
                    const attendees = hub.snapshot.people.filter((p) =>
                      hub.snapshot.attendees.some(
                        (a) => a.event_id === event.id && a.user_id === p.id,
                      ),
                    );
                    return (
                      <button
                        title={`${event.title} · ${hourLabel(start)} – ${hourLabel(end)}`}
                        className={`calendar-event event-${event.kind === "meeting" ? "blue" : "orange"} ${end - start < 0.75 ? "event-compact" : ""}`}
                        key={event.id}
                        style={{
                          left: `calc(${(lane / lanes) * 100}% + 4px)`,
                          width: `calc(${100 / lanes}% - 8px)`,
                          right: "auto",
                          top: (start - startHour) * 84 + 3,
                          height: Math.max((end - start) * 84 - 6, 30),
                        }}
                        onClick={() => onSelect(event)}
                      >
                        <span className="event-time">
                          {hourLabel(start)} – {hourLabel(end)}
                        </span>
                        <strong>{event.title}</strong>
                        {end - start >= 1 && (
                          <span className="event-project">
                            {event.kind === "meeting" ? "Reunião" : "Evento"}
                          </span>
                        )}
                        {end - start >= 1.25 && (
                          <PeopleAvatars people={attendees} />
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="calendar-footer">
        <span>
          <i className="legend-dot blue" />
          Reuniões
        </span>
        <span>
          <i className="legend-dot orange" />
          Eventos
        </span>
        {!events.length && (
          <span>
            <CalendarDots size={12} />
            Nenhum evento neste período
          </span>
        )}
      </div>
    </section>
  );
}
