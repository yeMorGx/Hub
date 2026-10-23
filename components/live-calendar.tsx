"use client";
import { ZuluButton, ZuluSelect } from "./dashboard-ui";
import { Card, Dropdown, Label, ToggleButtonGroup, ToggleButton } from "@heroui/react";
import { DashboardDatePicker } from "./dashboard-ui";
import { useState } from "react";
import {
  FunnelSimple,
  Plus,
  CaretLeft,
  CaretRight,
  Clock,
  CalendarDots,
  House,
} from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import type { HomeOfficeEntry, Row } from "@/lib/hub/types";
import { dayKey, dateAt, hourLabel } from "@/lib/hub/dates";
import {
  calendarDays,
  calendarRange,
  eventDaySegment,
  overlapsPeriod,
  type CalendarView,
} from "@/lib/hub/calendar";
import { PeopleAvatars } from "./hub-ui";
import { CalendarTimeColumn } from "./calendar-time-column";
const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
function sundayKey(date: Date) {
  const sunday = new Date(date);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return dayKey(sunday);
}
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
  onHomeOffice,
  full = false,
  compact = false,
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
  onNew: (date: Date, hour?: number, endHour?: number) => void;
  onSelect: (event: Row<"events">) => void;
  onHomeOffice: (entry: HomeOfficeEntry) => void;
  full?: boolean;
  compact?: boolean;
}) {
  const hourHeight = compact ? 60 : 84;
  const [filter, setFilter] = useState("all"),
    [filterOpen, setFilterOpen] = useState(false);
  const range = calendarRange(date, view);
  const monthDays = view === "month" ? calendarDays(date, "month") : [];
  const showEvents = filter !== "home_office",
    showHomeOffice = filter === "all" || filter === "home_office";
  const events = hub.snapshot.events.filter(
    (e) =>
      showEvents &&
      (filter === "all" || e.kind === filter) &&
      overlapsPeriod(e, range.start, range.end),
  );
  const visibleDays = view === "week" ? [0, 1, 2, 3, 4, 5, 6] : [day];
  const segments = visibleDays.map((index) => {
    const start = dateAt(monday, index);
    return {
      index,
      start,
      homeOffice: showHomeOffice
        ? hub.snapshot.homeOffice.filter((item) => item.scheduled_on === dayKey(start))
        : [],
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
  const CalendarContainer = compact ? Card : "section";
  return (
    <CalendarContainer
      className={`calendar-section ${full ? "calendar-full" : ""} ${compact ? "calendar-compact" : ""}`}
      role="region"
      aria-label="Agenda do time"
      aria-busy={hub.teamLoading}
    >
      <div className="section-heading calendar-heading">
        <div className="heading-with-count">
          <h2>{full ? "Agenda do time" : view === "week" ? "Sua semana" : "Sua agenda"}</h2>
          {compact ? (
            <Dropdown isOpen={filterOpen} onOpenChange={setFilterOpen}>
              <ZuluButton className={`filter-button ${filter !== "all" ? "filter-active" : ""}`}><FunnelSimple size={14} />Filtrar</ZuluButton>
              <Dropdown.Popover className="zulu-overlay zulu-filter" placement="bottom start">
                  <Dropdown.Menu aria-label="Tipo de evento" selectionMode="single" selectedKeys={[filter]} onAction={(key) => { setFilter(String(key)); setFilterOpen(false); }}>
                    {[["all", "Todos os eventos"], ["meeting", "Reuniões"], ["event", "Eventos"], ["home_office", "Home office"]].map(([id, label]) => (
                      <Dropdown.Item key={id} id={id} textValue={label}><Label>{label}</Label><Dropdown.ItemIndicator /></Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          ) : (<>
          <ZuluButton
            className={`filter-button ${filter !== "all" ? "filter-active" : ""}`}
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <FunnelSimple size={14} />
            Filtrar
          </ZuluButton>
          {filterOpen && (
            <div className="filter-popover">
              <label htmlFor="event-filter">Tipo de evento</label>
              <ZuluSelect
                id="event-filter" aria-label="Tipo de evento"
                value={filter}
                onValueChange={(value) => {
                  setFilter(value);
                  setFilterOpen(false);
                }}
              >
                <option value="all">Todos os eventos</option>
                <option value="meeting">Reuniões</option>
                <option value="event">Eventos</option>
                <option value="home_office">Home office</option>
              </ZuluSelect>
            </div>
          )}
          </>)}
        </div>
        <div className="calendar-actions">
          {(hub.canParticipate || hub.canManage) && (
            <ZuluButton
              className="home-office-open"
              onClick={() => onHomeOffice({
                team_id: hub.teamId,
                user_id: null,
                scheduled_on: dayKey(date),
                week_start: sundayKey(date),
                display_name: null,
                avatar_url: null,
                entry_kind: "home_office",
                entry_label: null,
              })}
            >
              <House size={14} />
              Escala
            </ZuluButton>
          )}
          {compact ? (
            <ToggleButtonGroup className="zulu-view-switch" aria-label="Visualização da agenda" selectionMode="single" disallowEmptySelection selectedKeys={[view]} onSelectionChange={(keys) => { const key = [...keys][0]; if (key) onView(String(key) as CalendarView); }}>
              <ToggleButton id="month">Mês</ToggleButton><ToggleButton id="week">Semana</ToggleButton><ToggleButton id="day">Dia</ToggleButton>
            </ToggleButtonGroup>
          ) : (
          <div className="segmented" aria-label="Visualização da agenda">
            <ZuluButton
              className={view === "month" ? "selected" : ""}
              aria-pressed={view === "month"}
              onClick={() => onView("month")}
            >
              Mês
            </ZuluButton>
            <ZuluButton
              className={view === "week" ? "selected" : ""}
              aria-pressed={view === "week"}
              onClick={() => onView("week")}
            >
              Semana
            </ZuluButton>
            <ZuluButton
              className={view === "day" ? "selected" : ""}
              aria-pressed={view === "day"}
              onClick={() => onView("day")}
            >
              Dia
            </ZuluButton>
          </div>
          )}
          {hub.canParticipate && (
            <ZuluButton
              className="icon-button add-calendar"
              aria-label="Criar evento"
              onClick={() => onNew(dateAt(monday, day))}
            >
              <Plus size={18} />
            </ZuluButton>
          )}
        </div>
      </div>
      <div className="calendar-toolbar">
        <div className="date-controls">
          <ZuluButton
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
          </ZuluButton>
          <span>{label}</span>
          {compact && <DashboardDatePicker date={date} onDate={onDate} />}
          <ZuluButton
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
          </ZuluButton>
          <ZuluButton className="text-button today-button" onClick={onToday}>
            Hoje
          </ZuluButton>
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
              const markers = showHomeOffice
                ? hub.snapshot.homeOffice.filter((item) => item.scheduled_on === dayKey(cell))
                : [];
              const office = markers.find((item) => item.entry_kind === "home_office");
              const holidayWeek = markers.find((item) => item.entry_kind === "holiday_week");
              const holiday = markers.find((item) => item.entry_kind === "holiday");
              const monthItems = [
                ...(office ? [{ type: "home_office" as const, office }] : []),
                ...(holidayWeek ? [{ type: "holiday_week" as const, holidayWeek }] : []),
                ...(holiday ? [{ type: "holiday" as const, holiday }] : []),
                ...entries.map((event) => ({ type: "event" as const, event })),
              ];
              const isToday = dayKey(cell) === dayKey(today);
              const openDay = () => {
                onDate(cell);
                onView("day");
              };
              return (
                <div
                  key={dayKey(cell)}
                  className={`month-cell ${cell.getMonth() !== date.getMonth() ? "outside-month" : ""} ${isToday ? "month-today" : ""}`}
                  onClick={(event) => {
                    if (hub.canParticipate && !hub.busy && !(event.target as HTMLElement).closest("button, a")) onNew(cell);
                  }}
                >
                  <div className="month-cell-header">
                    <ZuluButton
                      className="month-date"
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`Abrir dia ${cell.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}`}
                      onClick={openDay}
                    >
                      {cell.getDate()}
                    </ZuluButton>
                    {hub.canParticipate && (
                      <ZuluButton
                        className="month-add"
                        aria-label={`Criar evento em ${cell.toLocaleDateString("pt-BR")}`}
                        onClick={() => onNew(cell)}
                      >
                        <Plus size={12} />
                      </ZuluButton>
                    )}
                  </div>
                  <div className="month-events">
                    {monthItems.slice(0, 3).map((item) => {
                      if (item.type === "home_office")
                        return (
                          <ZuluButton
                            key={`home-office-${item.office.user_id}-${item.office.scheduled_on}`}
                            className="month-event month-event-home-office"
                            title={`Home office · ${item.office.display_name}`}
                            onClick={() => onHomeOffice(item.office)}
                          >
                            <House size={10} />
                            <strong>{item.office.display_name}</strong>
                          </ZuluButton>
                        );
                      if (item.type === "holiday_week")
                        return (
                          <span key={`holiday-week-${item.holidayWeek.week_start}`} className="month-event month-event-holiday-week" title={item.holidayWeek.entry_label ?? undefined}>
                            <strong>Sem escala · feriado</strong>
                          </span>
                        );
                      if (item.type === "holiday")
                        return (
                          <span key={`holiday-${item.holiday.scheduled_on}`} className="month-event month-event-holiday" title={item.holiday.entry_label ?? undefined}>
                            <strong>{item.holiday.entry_label}</strong>
                          </span>
                        );
                      const event = item.event;
                      const continues = new Date(event.starts_at) < cell;
                      const time = continues
                        ? "Continua"
                        : new Date(event.starts_at).toLocaleTimeString(
                            "pt-BR",
                            { hour: "2-digit", minute: "2-digit" },
                          );
                      return (
                        <ZuluButton
                          key={event.id}
                          className={`month-event month-event-${event.kind}`}
                          title={`${time} · ${event.title}`}
                          onClick={() => onSelect(event)}
                        >
                          <span>{time}</span>
                          <strong>{event.title}</strong>
                        </ZuluButton>
                      );
                    })}
                  </div>
                  {monthItems.length > 3 && (
                    <ZuluButton className="month-more" onClick={openDay}>
                      +{monthItems.length - 3} itens
                    </ZuluButton>
                  )}
                  {monthItems.length > 0 && (
                    <ZuluButton
                      className="month-count"
                      aria-label={`${monthItems.length} itens em ${cell.toLocaleDateString("pt-BR")}`}
                      onClick={openDay}
                    >
                      <span aria-hidden="true" className="month-count-dot" />
                      {monthItems.length}
                    </ZuluButton>
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
              <ZuluButton
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
              </ZuluButton>
            ))}
            <div className="home-office-gutter" aria-hidden="true">
              <House size={12} />
            </div>
            {segments.map((segment) => {
              const office = segment.homeOffice.find((item) => item.entry_kind === "home_office");
              const holidayWeek = segment.homeOffice.find((item) => item.entry_kind === "holiday_week");
              const holiday = segment.homeOffice.find((item) => item.entry_kind === "holiday");
              return (
                <div className="home-office-cell" key={`home-office-${segment.index}`}>
                  {holidayWeek ? (
                    <span className="home-office-pause" title={holidayWeek.entry_label ?? undefined}>
                      Sem home office · feriado
                    </span>
                  ) : office ? (
                    <ZuluButton className="home-office-assignment" onClick={() => onHomeOffice(office)} title={`Home office · ${office.display_name}`}>
                      <House size={11} />
                      {office.display_name}
                    </ZuluButton>
                  ) : holiday ? (
                    <span className="home-office-holiday" title={holiday.entry_label ?? undefined}>
                      Feriado · {holiday.entry_label}
                    </span>
                  ) : null}
                </div>
              );
            })}
            <div
              className="time-gutter"
              style={{ height: (endHour - startHour) * hourHeight }}
            >
              {hours.map((hour) => (
                <span key={hour} style={{ top: (hour - startHour) * hourHeight }}>
                  {hourLabel(hour)}
                </span>
              ))}
            </div>
            {segments.map((segment) => (
              <CalendarTimeColumn
                key={dayKey(segment.start)}
                date={segment.start}
                label={days[segment.index]}
                startHour={startHour}
                endHour={endHour}
                hourHeight={hourHeight}
                enabled={hub.canParticipate && !hub.busy}
                isToday={dayKey(segment.start) === dayKey(today)}
                onNew={onNew}
              >
                {eventLanes(segment.events).map(
                  ({ event, start, end, lane, lanes }) => {
                    const attendees = hub.snapshot.people.filter((p) =>
                      hub.snapshot.attendees.some(
                        (a) => a.event_id === event.id && a.user_id === p.id,
                      ),
                    );
                    return (
                      <ZuluButton
                        title={`${event.title} · ${hourLabel(start)} – ${hourLabel(end)}`}
                        className={`calendar-event event-${event.kind === "meeting" ? "blue" : "orange"} ${end - start < 0.75 ? "event-compact" : ""}`}
                        key={event.id}
                        style={{
                          left: `calc(${(lane / lanes) * 100}% + 4px)`,
                          width: `calc(${100 / lanes}% - 8px)`,
                          right: "auto",
                          top: (start - startHour) * hourHeight + 3,
                          height: Math.max((end - start) * hourHeight - 6, 30),
                        }}
                        onClick={() => onSelect(event)}
                      >
                        <span className="event-time">
                          {hourLabel(start)} – {hourLabel(end)}
                        </span>
                        <strong>{event.title}</strong>
                        {!compact && end - start >= 1 && (
                          <span className="event-project">
                            {event.kind === "meeting" ? "Reunião" : "Evento"}
                          </span>
                        )}
                        {!compact && end - start >= 1.25 && (
                          <PeopleAvatars people={attendees} />
                        )}
                      </ZuluButton>
                    );
                  },
                )}
              </CalendarTimeColumn>
            ))}
          </div>
        </div>
      )}
      <div className="calendar-footer">
        <span>
          <i className="legend-dot home-office" />
          Home office
        </span>
        <span>
          <i className="legend-dot holiday" />
          Semana sem escala por feriado
        </span>
        <span>
          <i className="legend-dot blue" />
          Reuniões
        </span>
        <span>
          <i className="legend-dot orange" />
          Eventos
        </span>
        {!events.length && !hub.snapshot.homeOffice.length && (
          <span>
            <CalendarDots size={12} />
            Nenhum evento neste período
          </span>
        )}
      </div>
    </CalendarContainer>
  );
}
