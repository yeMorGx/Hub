"use client";
import { BrandMark } from "./brand";
import { DashboardNavIcon } from "./dashboard-nav-icon";
import { Tooltip } from "@heroui/react";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  SquaresFour,
  CalendarDots,
  ChatCircleText,
  Timer as TimerIcon,
  UsersThree,
  GearSix,
  Bell,
  CaretDown,
  CaretLeft,
  CaretRight,
  ArrowUpRight,
  ArrowRight,
  Plus,
  MagnifyingGlass,
  Play,
  Stop,
  Check,
  X,
  PaperPlaneTilt,
  Hash,
  Clock,
  VideoCamera,
  CheckCircle,
  CircleNotch,
  FunnelSimple,
  Command,
  PencilSimple,
} from "@phosphor-icons/react";
import {
  people,
  projects,
  initialEvents,
  initialMessages,
  mondayOf,
  dateAt,
  dayKey,
  clock,
  hourLabel,
  shortDuration,
  type Page,
  type CalendarEvent,
  type ChatMessage,
  type TimeEntry,
  type Timer,
} from "@/lib/demo-data";

type StoredEvent = CalendarEvent & { week: string };
type Saved = {
  events: StoredEvent[];
  messages: Record<string, ChatMessage[]>;
  entries: TimeEntry[];
  timer: Timer;
  name: string;
  status: string;
};
const STORE = "hub.frontend.demo.v1";
const navigation = [
  { id: "overview", label: "Hoje", icon: SquaresFour },
  { id: "calendar", label: "Calendário", icon: CalendarDots },
  { id: "chat", label: "Conversas", icon: ChatCircleText },
  { id: "hours", label: "Minhas horas", icon: TimerIcon },
  { id: "people", label: "Pessoas", icon: UsersThree },
] as const;
const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const statusLabels: Record<string, string> = {
  online: "Disponível",
  meeting: "Em reunião",
  away: "Ausente",
  offline: "Offline",
};

function Avatar({
  person = 0,
  size = "normal",
  dot = false,
  name,
}: {
  person?: number;
  size?: "small" | "normal" | "large";
  dot?: boolean;
  name?: string;
}) {
  const p = people[person];
  return (
    <span
      className={`avatar avatar-${size} avatar-${p.color}`}
      title={name ?? p.name}
      aria-label={name ?? p.name}
    >
      {name
        ? name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
        : p.initials}
      {dot && <span className={`presence ${p.status}`} />}
    </span>
  );
}
function AvatarGroup({ ids }: { ids: number[] }) {
  return (
    <span className="avatar-group">
      {ids.slice(0, 3).map((id) => (
        <Avatar key={id} person={id} size="small" />
      ))}
      {ids.length > 3 && (
        <span className="avatar avatar-small avatar-extra">
          +{ids.length - 3}
        </span>
      )}
    </span>
  );
}
function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "dialog-wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function HubApp() {
  const [ready, setReady] = useState(false),
    [now, setNow] = useState<number>(0),
    [page, setPage] = useState<Page>("overview"),
    [navTooltip, setNavTooltip] = useState<string | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]),
    [messages, setMessages] = useState(initialMessages),
    [entries, setEntries] = useState<TimeEntry[]>([]),
    [timer, setTimer] = useState<Timer>(null);
  const [name, setName] = useState("Rafael Costa"),
    [status, setStatus] = useState("online");
  const [project, setProject] = useState(projects[0]),
    [description, setDescription] = useState("Interface do website");
  const [weekOffset, setWeekOffset] = useState(0),
    [calendarView, setCalendarView] = useState<"week" | "day">("week"),
    [activeDay, setActiveDay] = useState(0),
    [projectFilter, setProjectFilter] = useState("all"),
    [filterOpen, setFilterOpen] = useState(false);
  const [dialog, setDialog] = useState<
      "event" | "manual" | "settings" | "search" | null
    >(null),
    [selectedEvent, setSelectedEvent] = useState<StoredEvent | null>(null),
    [editEvent, setEditEvent] = useState<StoredEvent | null>(null);
  const [eventStart, setEventStart] = useState("10:00");
  const [toast, setToast] = useState(""),
    [popover, setPopover] = useState<"notifications" | "workspace" | null>(
      null,
    ),
    [notified, setNotified] = useState(false);
  const [channel, setChannel] = useState("geral"),
    [draft, setDraft] = useState(""),
    [query, setQuery] = useState(""),
    [peopleQuery, setPeopleQuery] = useState("");
  const [availability, setAvailability] = useState("all");
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const current = new Date();
    if (window.matchMedia("(max-width:520px)").matches) setCalendarView("day");
    setNow(current.getTime());
    setActiveDay((current.getDay() + 6) % 7);
    let saved: Saved | null = null;
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed.events) &&
          Array.isArray(parsed.entries) &&
          parsed.messages &&
          typeof parsed.name === "string"
        )
          saved = parsed;
      }
    } catch {
      /* A visualização continua disponível se o armazenamento estiver bloqueado. */
    }
    if (saved) {
      setEvents(saved.events);
      setEntries(saved.entries);
      setMessages(saved.messages);
      setTimer(
        saved.timer && Number.isFinite(saved.timer.startedAt)
          ? saved.timer
          : null,
      );
      setName(saved.name);
      setStatus(saved.status || "online");
    } else {
      const monday = mondayOf(current);
      setEvents(initialEvents.map((e) => ({ ...e, week: dayKey(monday) })));
      setEntries([
        {
          id: "seed1",
          description: "Exploração de referências",
          project: projects[0],
          seconds: 4500,
          date: dayKey(current),
        },
        {
          id: "seed2",
          description: "Ajustes nos componentes",
          project: projects[2],
          seconds: 2700,
          date: dayKey(current),
        },
        {
          id: "seed3",
          description: "Mapeamento da jornada",
          project: projects[1],
          seconds: 7200,
          date: dayKey(dateAt(current, -1)),
        },
      ]);
    }
    setReady(true);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        STORE,
        JSON.stringify({ events, messages, entries, timer, name, status }),
      );
    } catch {
      /* Sem persistência quando o navegador a impedir. */
    }
  }, [ready, events, messages, entries, timer, name, status]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (page === "chat") chatEnd.current?.scrollIntoView({ block: "nearest" });
  }, [messages, channel, page]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setDialog("search");
      }
      if (e.key === "Escape") {
        setPopover(null);
        setFilterOpen(false);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const today = new Date(now || "2026-10-19T12:00:00");
  const thisMonday = mondayOf(today);
  const monday = dateAt(thisMonday, weekOffset * 7);
  const weekKey = dayKey(monday);
  const weeklyEvents = events.filter(
    (e) =>
      e.week === weekKey &&
      (projectFilter === "all" || e.project === projectFilter),
  );
  const todayEvents = events
    .filter(
      (e) =>
        e.week === dayKey(thisMonday) && e.day === (today.getDay() + 6) % 7,
    )
    .sort((a, b) => a.start - b.start);
  const elapsed = timer
    ? Math.max(0, Math.floor((now - timer.startedAt) / 1000))
    : 0;
  const todaySeconds =
    entries
      .filter((e) => e.date === dayKey(today))
      .reduce((sum, e) => sum + e.seconds, 0) + elapsed;
  const weekSeconds =
    entries
      .filter(
        (e) =>
          e.date >= dayKey(thisMonday) &&
          e.date <= dayKey(dateAt(thisMonday, 6)),
      )
      .reduce((sum, e) => sum + e.seconds, 0) + elapsed;
  const navigate = (target: Page) => {
    setPage(target);
    setPopover(null);
    setQuery("");
  };
  function startTimer(desc = description, proj = project) {
    if (timer) {
      setToast("Pare o timer atual antes de iniciar outro.");
      return;
    }
    if (!desc.trim()) {
      setToast("Descreva no que você vai trabalhar.");
      return;
    }
    setTimer({
      startedAt: Date.now(),
      description: desc.trim(),
      project: proj,
    });
    setNow(Date.now());
    setToast("Timer iniciado. Bom trabalho!");
  }
  function stopTimer() {
    if (!timer) return;
    const seconds = Math.max(
      1,
      Math.floor((Date.now() - timer.startedAt) / 1000),
    );
    setEntries((prev) => [
      {
        id: crypto.randomUUID(),
        description: timer.description,
        project: timer.project,
        seconds,
        date: dayKey(new Date(timer.startedAt)),
      },
      ...prev,
    ]);
    setTimer(null);
    setToast("Tempo registrado no histórico.");
  }
  function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const message = {
      id: crypto.randomUUID(),
      author: 0,
      text: draft.trim(),
      time: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => ({
      ...prev,
      [channel]: [...(prev[channel] ?? []), message],
    }));
    setDraft("");
  }
  function saveEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const date = new Date(`${data.get("date")}T12:00:00`);
    const start = String(data.get("start")).split(":").map(Number);
    const duration = Number(data.get("duration"));
    if (!String(data.get("title")).trim()) return;
    if (start[0] + start[1] / 60 + duration > 24) {
      setToast("O evento precisa terminar no mesmo dia.");
      return;
    }
    const event: StoredEvent = {
      id: editEvent?.id ?? crypto.randomUUID(),
      title: String(data.get("title")).trim(),
      project: String(data.get("project")),
      day: (date.getDay() + 6) % 7,
      start: start[0] + start[1] / 60,
      duration,
      tone: String(data.get("tone")),
      people: editEvent?.people ?? [0, 1, 2],
      description: String(data.get("description")),
      week: dayKey(mondayOf(date)),
      rsvp: editEvent?.rsvp,
    };
    setEvents((prev) =>
      editEvent
        ? prev.map((ev) => (ev.id === editEvent.id ? event : ev))
        : [...prev, event],
    );
    const offset = Math.round(
      (mondayOf(date).getTime() - thisMonday.getTime()) / 604800000,
    );
    setWeekOffset(offset);
    setActiveDay(event.day);
    if (event.day > 4) setCalendarView("day");
    setDialog(null);
    setEditEvent(null);
    setToast(
      editEvent
        ? "Evento atualizado."
        : "Evento adicionado à agenda de demonstração.",
    );
  }
  function saveManual(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const seconds = Math.round(Number(data.get("minutes")) * 60);
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    setEntries((prev) => [
      {
        id: crypto.randomUUID(),
        description: String(data.get("description")).trim(),
        project: String(data.get("project")),
        seconds,
        date: String(data.get("date")),
      },
      ...prev,
    ]);
    setDialog(null);
    setToast("Entrada adicionada ao histórico.");
  }
  const openEventForm = () => {
    setEditEvent(null);
    setEventStart("10:00");
    setDialog("event");
  };
  function moveCalendar(direction: number) {
    if (calendarView === "week") {
      setWeekOffset((v) => v + direction);
      return;
    }
    const next = activeDay + direction;
    if (next < 0) {
      setActiveDay(6);
      setWeekOffset((v) => v - 1);
    } else if (next > 6) {
      setActiveDay(0);
      setWeekOffset((v) => v + 1);
    } else setActiveDay(next);
  }
  const directPerson =
    channel === "marina"
      ? 1
      : channel.startsWith("dm-")
        ? Number(channel.slice(3))
        : null;
  const directName = directPerson !== null ? people[directPerson]?.name : null;
  const dateLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const endOfWeek = dateAt(monday, 4);
  const weekLabel =
    monday.getMonth() === endOfWeek.getMonth()
      ? `${monday.getDate()} – ${endOfWeek.getDate()} de ${endOfWeek.toLocaleDateString("pt-BR", { month: "long" })}, ${endOfWeek.getFullYear()}`
      : `${monday.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${endOfWeek.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`;
  const currentPage = navigation.find((n) => n.id === page)!;

  function renderCalendar(full = false) {
    const visibleDays = calendarView === "day" ? [activeDay] : [0, 1, 2, 3, 4];
    const gridEnd = Math.max(
      15,
      ...weeklyEvents
        .filter((e) => visibleDays.includes(e.day))
        .map((e) => Math.ceil(e.start + e.duration)),
    );
    const gridStart = Math.min(
      9,
      ...weeklyEvents
        .filter((e) => visibleDays.includes(e.day))
        .map((e) => Math.floor(e.start)),
    );
    const hours = Array.from(
      { length: gridEnd - gridStart + 1 },
      (_, i) => gridStart + i,
    );
    return (
      <section
        className={`calendar-section ${full ? "calendar-full" : ""}`}
        aria-label="Agenda da equipe"
      >
        <div className="section-heading calendar-heading">
          <div className="heading-with-count">
            <h2>{full ? "Agenda do time" : "Sua semana"}</h2>
            <button
              className={`filter-button ${projectFilter !== "all" ? "filter-active" : ""}`}
              onClick={() => setFilterOpen(!filterOpen)}
              aria-expanded={filterOpen}
            >
              <FunnelSimple size={14} />
              Filtrar
              {projectFilter !== "all" && <span className="filter-dot" />}
            </button>
            {filterOpen && (
              <div className="filter-popover">
                <label htmlFor="project-filter">Projeto</label>
                <select
                  id="project-filter"
                  value={projectFilter}
                  onChange={(e) => {
                    setProjectFilter(e.target.value);
                    setFilterOpen(false);
                  }}
                >
                  <option value="all">Todos os projetos</option>
                  {projects.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="calendar-actions">
            <div className="segmented">
              <button
                className={calendarView === "week" ? "selected" : ""}
                onClick={() => setCalendarView("week")}
              >
                Semana
              </button>
              <button
                className={calendarView === "day" ? "selected" : ""}
                onClick={() => setCalendarView("day")}
              >
                Dia
              </button>
            </div>
            <button
              className="icon-button add-calendar"
              aria-label="Criar evento"
              onClick={openEventForm}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="calendar-toolbar">
          <div className="date-controls">
            <button
              className="icon-button"
              aria-label={
                calendarView === "week" ? "Semana anterior" : "Dia anterior"
              }
              onClick={() => moveCalendar(-1)}
            >
              <CaretLeft size={15} />
            </button>
            <span>
              {calendarView === "week"
                ? weekLabel
                : dateAt(monday, activeDay).toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                  })}
            </span>
            <button
              className="icon-button"
              aria-label={
                calendarView === "week" ? "Próxima semana" : "Próximo dia"
              }
              onClick={() => moveCalendar(1)}
            >
              <CaretRight size={15} />
            </button>
            <button
              className="text-button today-button"
              onClick={() => {
                setWeekOffset(0);
                setActiveDay((today.getDay() + 6) % 7);
              }}
            >
              Hoje
            </button>
          </div>
          <span className="timezone">
            GMT{-today.getTimezoneOffset() / 60 >= 0 ? "+" : ""}
            {-today.getTimezoneOffset() / 60}
          </span>
        </div>
        <div className="calendar-scroll">
          <div
            className={`calendar-grid ${calendarView === "day" ? "day-view" : ""}`}
            style={{ "--days": visibleDays.length } as React.CSSProperties}
          >
            <div className="time-gutter-header">
              <Clock size={14} />
            </div>
            {visibleDays.map((day) => {
              const d = dateAt(monday, day),
                isToday = dayKey(d) === dayKey(today);
              return (
                <button
                  key={day}
                  className={`day-header ${isToday ? "is-today" : ""}`}
                  onClick={() => {
                    setActiveDay(day);
                    setCalendarView("day");
                  }}
                >
                  <span>{days[day]}</span>
                  <strong>{String(d.getDate()).padStart(2, "0")}</strong>
                  {isToday && <span className="day-today">Hoje</span>}
                </button>
              );
            })}
            <div
              className="time-gutter"
              style={{ height: (gridEnd - gridStart) * 84 }}
            >
              {hours.map((hour) => (
                <span key={hour} style={{ top: (hour - gridStart) * 84 }}>
                  {hourLabel(hour)}
                </span>
              ))}
            </div>
            {visibleDays.map((day) => (
              <div
                className={`day-column ${dayKey(dateAt(monday, day)) === dayKey(today) ? "today-column" : ""}`}
                key={day}
                style={{ height: (gridEnd - gridStart) * 84 }}
              >
                {hours.slice(0, -1).map((hour) => (
                  <button
                    key={hour}
                    className="hour-cell"
                    style={{ height: 84 }}
                    aria-label={`Criar evento ${days[day]} às ${hourLabel(hour)}`}
                    onClick={() => {
                      setActiveDay(day);
                      setEditEvent(null);
                      setEventStart(hourLabel(hour));
                      setDialog("event");
                    }}
                  />
                ))}
                {weeklyEvents
                  .filter((e) => e.day === day)
                  .map((event) => (
                    <button
                      key={event.id}
                      className={`calendar-event event-${event.tone}`}
                      style={{
                        top: (event.start - gridStart) * 84 + 4,
                        height: Math.max(event.duration * 84 - 8, 44),
                      }}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <span className="event-time">
                        {hourLabel(event.start)} –{" "}
                        {hourLabel(event.start + event.duration)}
                        <ArrowUpRight size={13} />
                      </span>
                      <strong>{event.title}</strong>
                      <span className="event-project">{event.project}</span>
                      {event.duration >= 1.25 && (
                        <AvatarGroup ids={event.people} />
                      )}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>
        <div className="calendar-footer">
          <span>
            <i className="legend-dot orange" />
            Criação
          </span>
          <span>
            <i className="legend-dot purple" />
            Pesquisa e revisão
          </span>
          <span>
            <i className="legend-dot blue" />
            Alinhamentos
          </span>
          <span>
            <i className="legend-dot green" />
            Colaboração
          </span>
        </div>
      </section>
    );
  }

  const renderFocusCard = () => (
    <section
      className={`focus-card ${timer ? "is-running" : ""}`}
      aria-label="Registro de tempo"
    >
      <div className="card-topline">
        <span>
          <i className={`live-dot ${timer ? "live" : ""}`} />
          {timer ? "Foco em andamento" : "Seu próximo foco"}
        </span>
        <TimerIcon size={17} />
      </div>
      <div className="focus-title">
        <h2>{timer?.description ?? description}</h2>
        <span>{timer?.project ?? project}</span>
      </div>
      <button
        className="timer-control"
        onClick={() => (timer ? stopTimer() : startTimer())}
        aria-label={timer ? "Parar timer" : "Iniciar timer"}
        disabled={!ready}
      >
        {timer ? (
          <Stop weight="fill" size={25} />
        ) : (
          <Play weight="fill" size={25} />
        )}
      </button>
      <div className="timer-bottom">
        <span className="timer-digits">{clock(elapsed)}</span>
        <span>{timer ? "Parar e registrar" : "Pronto para começar"}</span>
      </div>
    </section>
  );

  if (!ready)
    return (
      <div className="loading-screen">
        <BrandMark size={34} />
        <span>Preparando seu espaço…</span>
        <CircleNotch className="spinning" size={20} />
      </div>
    );
  return (
    <div className="app-shell live-app">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <aside className="rail" aria-label="Navegação principal">
        <button
          className="brand"
          aria-label="ZULU — início"
          onClick={() => navigate("overview")}
        >
          <BrandMark size={32} />
        </button>
        <div className="rail-divider" />
        <nav>
          {navigation.map((item) => (
            <Tooltip key={item.id} isOpen={navTooltip === item.label} onOpenChange={open => { if (!open) setNavTooltip(null); }} delay={450}>
              <Tooltip.Trigger<"button">
                render={(triggerProps) => (
                  <button
                    {...triggerProps}
                    className={`rail-button ${page === item.id ? "active" : ""}`}
                    onClick={() => navigate(item.id)}
                    onMouseEnter={() => setNavTooltip(item.label)}
                    onMouseLeave={() => setNavTooltip(null)}
                    onFocus={event => { triggerProps.onFocus?.(event); setNavTooltip(item.label); }}
                    onBlur={event => { triggerProps.onBlur?.(event); setNavTooltip(null); }}
                    aria-label={item.label}
                    aria-current={page === item.id ? "page" : undefined}
                  />
                )}
              >
                <DashboardNavIcon name={item.id} />
              </Tooltip.Trigger>
              <Tooltip.Content className="zulu-tooltip" placement="right">
                {item.label}
              </Tooltip.Content>
            </Tooltip>
          ))}
        </nav>
        <div className="rail-bottom">
          <Tooltip isOpen={navTooltip === "Preferências"} onOpenChange={open => { if (!open) setNavTooltip(null); }} delay={450}>
            <Tooltip.Trigger<"button">
              render={(triggerProps) => (
                <button
                  {...triggerProps}
                  className="rail-button"
                  aria-label="Preferências e perfil"
                  onClick={() => setDialog("settings")}
                  onMouseEnter={() => setNavTooltip("Preferências")}
                  onMouseLeave={() => setNavTooltip(null)}
                  onFocus={event => { triggerProps.onFocus?.(event); setNavTooltip("Preferências"); }}
                  onBlur={event => { triggerProps.onBlur?.(event); setNavTooltip(null); }}
                />
              )}
            >
              <DashboardNavIcon name="settings" />
            </Tooltip.Trigger>
            <Tooltip.Content className="zulu-tooltip" placement="right">
              Preferências
            </Tooltip.Content>
          </Tooltip>
          <button
            className="profile-button"
            aria-label="Editar meu perfil"
            onClick={() => setDialog("settings")}
          >
            <Avatar name={name} />
            <i className={`presence ${status}`} />
          </button>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="workspace-wrap">
            <button
              className="workspace-button"
              aria-expanded={popover === "workspace"}
              onClick={() =>
                setPopover(popover === "workspace" ? null : "workspace")
              }
            >
              <span className="workspace-icon">
                <SquaresFour weight="fill" size={18} />
              </span>
              <strong>Estúdio</strong>
              <CaretDown size={13} />
            </button>
            {popover === "workspace" && (
              <div className="popover workspace-popover">
                <span className="popover-label">Workspace de demonstração</span>
                <strong>Estúdio · Time de produto</strong>
                <p>
                  Explore a interface com dados fictícios. As alterações ficam
                  neste navegador.
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    navigate("people");
                  }}
                >
                  Ver pessoas <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb">{currentPage.label}</span>
          <div className="topbar-right">
            <span className="demo-label">
              <i />
              Demonstração
            </span>
            <button
              className="search-button"
              aria-label="Buscar no ZULU"
              onClick={() => setDialog("search")}
            >
              <MagnifyingGlass size={17} />
              <span>Buscar</span>
              <kbd>
                <Command size={11} />K
              </kbd>
            </button>
            <span className="topbar-divider" />
            <div className="notification-wrap">
              <button
                className={`icon-button ${popover === "notifications" ? "is-open" : ""}`}
                aria-label="Notificações"
                aria-expanded={popover === "notifications"}
                onClick={() =>
                  setPopover(
                    popover === "notifications" ? null : "notifications",
                  )
                }
              >
                <Bell size={21} />
                {!notified && <i className="notification-dot" />}
              </button>
              {popover === "notifications" && (
                <div className="popover notifications-popover">
                  <div className="section-heading">
                    <h3>Notificações</h3>
                    <button
                      className="text-button"
                      onClick={() => setNotified(true)}
                    >
                      {notified ? "Tudo lido" : "Marcar como lidas"}
                    </button>
                  </div>
                  <button
                    className="notification-item"
                    onClick={() => {
                      navigate("chat");
                      setChannel("geral");
                      setNotified(true);
                    }}
                  >
                    <span className="notification-symbol">
                      <ChatCircleText size={20} />
                    </span>
                    <span>
                      <strong>O time está conversando</strong>
                      <small>Veja as mensagens em #geral.</small>
                    </span>
                  </button>
                  <button
                    className="notification-item"
                    onClick={() => navigate("calendar")}
                  >
                    <span className="notification-symbol">
                      <CalendarDots size={20} />
                    </span>
                    <span>
                      <strong>Sua agenda da semana</strong>
                      <small>Confira os próximos encontros.</small>
                    </span>
                  </button>
                  <p className="demo-note">Avisos ilustrativos deste espaço.</p>
                </div>
              )}
            </div>
            <button
              className="top-avatar"
              aria-label="Meu perfil"
              onClick={() => setDialog("settings")}
            >
              <Avatar name={name} />
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content">
          <div className="page-heading">
            <div>
              <h1>
                {page === "overview" ? "Visão geral" : currentPage.label}
                <span className="heading-period">.</span>
              </h1>
              <p>
                {page === "overview"
                  ? `Um bom dia para criar juntos. ${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}.`
                  : page === "calendar"
                    ? "Espaço na agenda para o que importa."
                    : page === "chat"
                      ? "O trabalho flui melhor em uma boa conversa."
                      : page === "hours"
                        ? "Seu tempo, com mais clareza."
                        : "Gente boa fazendo coisas boas."}
              </p>
            </div>
            <div className="page-heading-actions">
              {timer && page !== "overview" && (
                <button
                  className="running-pill"
                  onClick={() => navigate("hours")}
                >
                  <i className="live-dot live" />
                  <span>{clock(elapsed)}</span>
                  <TimerIcon size={16} />
                </button>
              )}
              {page === "overview" || page === "calendar" ? (
                <button className="primary-button" onClick={openEventForm}>
                  <Plus size={17} />
                  Novo evento
                </button>
              ) : page === "hours" ? (
                <button
                  className="primary-button"
                  onClick={() => setDialog("manual")}
                >
                  <Plus size={17} />
                  Adicionar horas
                </button>
              ) : (
                <span className="team-pill">
                  <i className="live-dot live" />
                  Time de produto
                </span>
              )}
            </div>
          </div>
          {(page === "overview" || page === "calendar") && (
            <div
              className={`dashboard-layout ${page === "calendar" ? "calendar-page-layout" : ""}`}
            >
              <div className="dashboard-main">
                {page === "overview" && (
                  <div className="summary-grid">
                    {renderFocusCard()}
                    <section className="work-card panel">
                      <div className="section-heading">
                        <h2>Continue de onde parou</h2>
                        <span className="muted-count">3</span>
                      </div>
                      <div className="work-list">
                        {[
                          {
                            title: "Interface do website",
                            project: projects[0],
                            tone: "orange",
                            meta: "Design de interface",
                          },
                          {
                            title: "Biblioteca de componentes",
                            project: projects[2],
                            tone: "purple",
                            meta: "Design system",
                          },
                          {
                            title: "Jornada do aplicativo",
                            project: projects[1],
                            tone: "green",
                            meta: "Pesquisa e descoberta",
                          },
                        ].map((work) => (
                          <button
                            key={work.title}
                            className="work-item"
                            onClick={() => startTimer(work.title, work.project)}
                          >
                            <span className={`small-play tone-${work.tone}`}>
                              <Play weight="fill" size={12} />
                            </span>
                            <span>
                              <strong>{work.title}</strong>
                              <small>{work.meta}</small>
                            </span>
                            <ArrowUpRight className="work-arrow" size={16} />
                          </button>
                        ))}
                      </div>
                      <button
                        className="card-bottom-link"
                        onClick={() => navigate("hours")}
                      >
                        Ver minhas horas <ArrowRight size={14} />
                      </button>
                    </section>
                    <section className="meetings-card panel">
                      <div className="section-heading">
                        <h2>Encontros de hoje</h2>
                        <span className="muted-count">
                          {todayEvents.length}
                        </span>
                      </div>
                      <div className="meeting-list">
                        {todayEvents.length ? (
                          todayEvents.slice(0, 2).map((event, i) => (
                            <button
                              className={`meeting-preview ${i === 0 ? "meeting-featured" : ""}`}
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <span className="meeting-hour">
                                {hourLabel(event.start)}
                                <VideoCamera size={15} />
                              </span>
                              <strong>{event.title}</strong>
                              <span className="meeting-bottom">
                                <AvatarGroup ids={event.people} />
                                <span>
                                  {Math.round(event.duration * 60)} min
                                </span>
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="compact-empty">
                            <CalendarDots size={26} />
                            <span>Um respiro na agenda.</span>
                            <small>Seu dia está livre de reuniões.</small>
                          </div>
                        )}
                      </div>
                      <button
                        className="card-bottom-link"
                        onClick={() => navigate("calendar")}
                      >
                        Abrir calendário <ArrowRight size={14} />
                      </button>
                    </section>
                  </div>
                )}
                {renderCalendar(page === "calendar")}
              </div>
              <aside className="context-sidebar">
                <section className="team-section">
                  <div className="section-heading">
                    <h2>Por aqui agora</h2>
                    <span className="online-count">3 online</span>
                  </div>
                  <p className="section-description">
                    Cada um no seu foco. Todos juntos.
                  </p>
                  <div className="team-list">
                    {people.slice(1, 5).map((p, i) => (
                      <button
                        className="person-row"
                        key={p.name}
                        onClick={() => {
                          navigate("people");
                          setPeopleQuery(p.name);
                        }}
                      >
                        <Avatar person={i + 1} dot />
                        <span>
                          <strong>{p.name}</strong>
                          <small>{p.work}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    className="text-button sidebar-link"
                    onClick={() => {
                      setPeopleQuery("");
                      navigate("people");
                    }}
                  >
                    Ver todo o time <ArrowUpRight size={14} />
                  </button>
                </section>
                <section className="hours-summary">
                  <div className="section-heading">
                    <h2>Seu tempo esta semana</h2>
                    <TimerIcon size={16} />
                  </div>
                  <div className="weekly-total">
                    {shortDuration(weekSeconds)}
                    <span>registradas</span>
                  </div>
                  <div
                    className="week-bars"
                    aria-label="Horas registradas por dia nesta semana"
                  >
                    {[0, 1, 2, 3, 4].map((day) => {
                      const d = dateAt(thisMonday, day);
                      const s =
                        entries
                          .filter((e) => e.date === dayKey(d))
                          .reduce((sum, e) => sum + e.seconds, 0) +
                        (dayKey(d) === dayKey(today) ? elapsed : 0);
                      return (
                        <div
                          className={`week-bar-item ${dayKey(d) === dayKey(today) ? "current" : ""}`}
                          key={day}
                          title={`${days[day]}: ${shortDuration(s)}`}
                        >
                          <div className="week-bar-track">
                            <div
                              className="week-bar-fill"
                              style={{
                                height: `${Math.min(100, (s / 28800) * 100)}%`,
                              }}
                            />
                          </div>
                          <span>{days[day].slice(0, 1)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="hours-summary-bottom">
                    <span>Hoje</span>
                    <strong>{shortDuration(todaySeconds)}</strong>
                  </div>
                </section>
                <section className="quick-chat">
                  <div className="section-heading">
                    <h2>A conversa continua</h2>
                    <span className="channel-label"># geral</span>
                  </div>
                  <div className="chat-snippet">
                    <Avatar person={1} size="small" />
                    <div>
                      <strong>
                        Marina Alves <span>09:02</span>
                      </strong>
                      <p>Bom dia, time! Já atualizei a agenda da semana.</p>
                    </div>
                  </div>
                  <button
                    className="outline-button"
                    onClick={() => {
                      setChannel("geral");
                      navigate("chat");
                    }}
                  >
                    Entrar na conversa <ArrowUpRight size={15} />
                  </button>
                </section>
                <div className="sidebar-footnote">
                  <span className="tiny-brand">ZULU</span>
                  <span>Um espaço. Seu time.</span>
                </div>
              </aside>
            </div>
          )}
          {page === "chat" && (
            <section className="chat-layout">
              <aside className="channel-sidebar">
                <div className="channel-sidebar-heading">
                  <h2>Conversas</h2>
                  <ChatCircleText size={21} />
                </div>
                <p className="list-label">Canais do time</p>
                {["geral", "design", "desenvolvimento"].map((c) => (
                  <button
                    className={`channel-button ${channel === c ? "selected" : ""}`}
                    key={c}
                    onClick={() => setChannel(c)}
                  >
                    <Hash size={17} />
                    <span>{c}</span>
                    {c === "geral" && <span className="channel-count">4</span>}
                  </button>
                ))}
                <p className="list-label dm-label">Mensagens diretas</p>
                {[
                  1,
                  ...Object.keys(messages)
                    .filter((key) => key.startsWith("dm-"))
                    .map((key) => Number(key.slice(3)))
                    .filter((i) => i > 1 && i < people.length),
                ].map((i) => (
                  <button
                    key={i}
                    className={`channel-button dm-button ${directPerson === i ? "selected" : ""}`}
                    onClick={() => setChannel(i === 1 ? "marina" : `dm-${i}`)}
                  >
                    <Avatar person={i} size="small" dot />
                    <span>{people[i].name}</span>
                  </button>
                ))}
                <div className="channel-sidebar-note">
                  <i className="live-dot live" />
                  <span>
                    Time de produto
                    <br />
                    <small>Espaço de demonstração</small>
                  </span>
                </div>
              </aside>
              <div className="chat-main">
                <div className="chat-head">
                  <div>
                    {directPerson !== null ? (
                      <Avatar person={directPerson} />
                    ) : (
                      <span className="channel-heading-icon">
                        <Hash size={24} />
                      </span>
                    )}
                    <span>
                      <h2>{directName ?? channel}</h2>
                      <small>
                        {directPerson !== null
                          ? "Conversa direta"
                          : "Um lugar para trocar ideias e trabalhar juntos"}
                      </small>
                    </span>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Ver pessoas do time"
                    onClick={() => {
                      setPeopleQuery("");
                      navigate("people");
                    }}
                  >
                    <UsersThree size={21} />
                  </button>
                </div>
                <div className="messages-area">
                  <div className="conversation-start">
                    <span className="channel-heading-icon">
                      <ChatCircleText size={30} />
                    </span>
                    <h3>
                      {directName
                        ? `Sua conversa com ${directName.split(" ")[0]}`
                        : `Bem-vindo ao #${channel}`}
                    </h3>
                    <p>Boas conversas fazem o trabalho acontecer.</p>
                  </div>
                  <div className="chat-date-divider">
                    <span>Mensagens de demonstração</span>
                  </div>
                  {(messages[channel] ?? []).map((message) => (
                    <article
                      className={`message ${message.author === 0 ? "own-message" : ""}`}
                      key={message.id}
                    >
                      <Avatar
                        person={message.author}
                        name={message.author === 0 ? name : undefined}
                      />
                      <div>
                        <div className="message-meta">
                          <strong>
                            {message.author === 0
                              ? name
                              : people[message.author].name}
                          </strong>
                          {message.author === 0 && (
                            <span className="you-tag">você</span>
                          )}
                          <time>{message.time}</time>
                        </div>
                        <p>{message.text}</p>
                      </div>
                    </article>
                  ))}
                  <div ref={chatEnd} />
                </div>
                <form className="message-form" onSubmit={sendMessage}>
                  <label className="sr-only" htmlFor="message">
                    Sua mensagem
                  </label>
                  <textarea
                    id="message"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Conversar ${directName ? `com ${directName.split(" ")[0]}` : `em #${channel}`}…`}
                    maxLength={6000}
                    rows={2}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <div className="composer-bottom">
                    <span>
                      <kbd>Enter</kbd> para enviar · <kbd>Shift + Enter</kbd>{" "}
                      para nova linha
                    </span>
                    <button
                      className="send-button"
                      type="submit"
                      aria-label="Enviar mensagem"
                      disabled={!draft.trim()}
                    >
                      <PaperPlaneTilt size={19} weight="fill" />
                    </button>
                  </div>
                </form>
                <p className="chat-local-note">
                  Mensagens salvas apenas neste navegador. O envio para o time
                  será conectado ao Supabase.
                </p>
              </div>
            </section>
          )}
          {page === "hours" && (
            <div className="hours-page">
              <section className="time-entry-panel panel">
                <div>
                  <h2>No que você está trabalhando?</h2>
                  <p>Uma coisa de cada vez. O tempo a gente cuida.</p>
                </div>
                <div className="timer-form">
                  <label>
                    Descrição
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={!!timer}
                      maxLength={180}
                    />
                  </label>
                  <label>
                    Projeto
                    <select
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      disabled={!!timer}
                    >
                      {projects.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  <div className="inline-timer">
                    <strong>{clock(elapsed)}</strong>
                    <button
                      className={`primary-button ${timer ? "stop-button" : ""}`}
                      onClick={() => (timer ? stopTimer() : startTimer())}
                    >
                      {timer ? (
                        <Stop weight="fill" size={16} />
                      ) : (
                        <Play weight="fill" size={16} />
                      )}{" "}
                      {timer ? "Parar" : "Iniciar"}
                    </button>
                  </div>
                </div>
                {timer && (
                  <p className="running-description">
                    <i className="live-dot live" />
                    {timer.description} · {timer.project}
                  </p>
                )}
              </section>
              <div className="hours-overview">
                <div>
                  <span>Hoje</span>
                  <strong>{shortDuration(todaySeconds)}</strong>
                </div>
                <div>
                  <span>Esta semana</span>
                  <strong>{shortDuration(weekSeconds)}</strong>
                </div>
                <div>
                  <span>Entradas registradas</span>
                  <strong>{entries.length}</strong>
                </div>
              </div>
              <section className="time-history">
                <div className="section-heading">
                  <h2>Histórico de horas</h2>
                  <span className="subtle-text">
                    Seus registros · demonstração local
                  </span>
                </div>
                {entries.length ? (
                  <div className="time-table">
                    <div className="time-table-head">
                      <span>Atividade</span>
                      <span>Projeto</span>
                      <span>Data</span>
                      <span>Duração</span>
                    </div>
                    {[...entries]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((entry) => (
                        <div className="time-table-row" key={entry.id}>
                          <strong>
                            <span className="entry-icon">
                              <CheckCircle size={17} />
                            </span>
                            {entry.description}
                          </strong>
                          <span>{entry.project}</span>
                          <time dateTime={entry.date}>
                            {new Date(
                              `${entry.date}T12:00:00`,
                            ).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </time>
                          <span className="duration-cell">
                            {shortDuration(entry.seconds)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <TimerIcon size={38} />
                    <h3>Seu primeiro registro começa aqui</h3>
                    <p>Inicie o timer ou adicione as horas manualmente.</p>
                    <button
                      className="outline-button"
                      onClick={() => setDialog("manual")}
                    >
                      Adicionar horas
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}
          {page === "people" && (
            <section className="people-page">
              <div className="people-toolbar">
                <div className="people-search">
                  <MagnifyingGlass size={18} />
                  <label htmlFor="people-search" className="sr-only">
                    Buscar pessoas
                  </label>
                  <input
                    id="people-search"
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                    placeholder="Encontrar alguém no time…"
                  />
                </div>
                <select
                  aria-label="Filtrar disponibilidade"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                >
                  <option value="all">Todas as pessoas</option>
                  <option value="online">Disponíveis</option>
                  <option value="meeting">Em reunião</option>
                  <option value="away">Ausentes</option>
                  <option value="offline">Offline</option>
                </select>
                <span className="subtle-text">6 pessoas no time</span>
              </div>
              <div className="people-directory">
                {people
                  .filter(
                    (p, i) =>
                      (i === 0 ? name : p.name)
                        .toLowerCase()
                        .includes(peopleQuery.toLowerCase()) &&
                      (availability === "all" ||
                        (i === 0 ? status : p.status) === availability),
                  )
                  .map((p) => {
                    const i = people.indexOf(p);
                    return (
                      <article className="person-card" key={p.name}>
                        <div className="person-card-top">
                          <Avatar
                            person={i}
                            name={i === 0 ? name : undefined}
                            size="large"
                          />
                          <span
                            className={`status-label status-${i === 0 ? status : p.status}`}
                          >
                            <i
                              className={`presence ${i === 0 ? status : p.status}`}
                            />
                            {statusLabels[i === 0 ? status : p.status]}
                          </span>
                        </div>
                        <h2>
                          {i === 0 ? name : p.name}
                          {i === 0 && <span className="you-tag">você</span>}
                        </h2>
                        <p>{p.role}</p>
                        <div className="person-work">
                          <span>No momento</span>
                          <strong>
                            {i === 0
                              ? (timer?.description ??
                                "Organizando o próximo foco")
                              : p.work}
                          </strong>
                        </div>
                        {i === 0 ? (
                          <button
                            className="outline-button"
                            onClick={() => setDialog("settings")}
                          >
                            <PencilSimple size={16} />
                            Editar perfil
                          </button>
                        ) : (
                          <button
                            className="outline-button"
                            onClick={() => {
                              const key = i === 1 ? "marina" : `dm-${i}`;
                              setChannel(key);
                              setMessages((prev) =>
                                prev[key] ? prev : { ...prev, [key]: [] },
                              );
                              navigate("chat");
                            }}
                          >
                            <ChatCircleText size={17} />
                            Conversar
                          </button>
                        )}
                      </article>
                    );
                  })}
              </div>
              {!people.some(
                (p, i) =>
                  (i === 0 ? name : p.name)
                    .toLowerCase()
                    .includes(peopleQuery.toLowerCase()) &&
                  (availability === "all" ||
                    (i === 0 ? status : p.status) === availability),
              ) && (
                <div className="empty-state">
                  <UsersThree size={38} />
                  <h3>Ninguém por aqui com esse filtro</h3>
                  <p>Tente outro nome ou disponibilidade.</p>
                  <button
                    className="outline-button"
                    onClick={() => {
                      setPeopleQuery("");
                      setAvailability("all");
                    }}
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          <CheckCircle size={19} />
          {toast}
          <button aria-label="Dispensar aviso" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {selectedEvent && (
        <Dialog
          title="Detalhes do evento"
          onClose={() => setSelectedEvent(null)}
        >
          <div className={`event-detail-symbol tone-${selectedEvent.tone}`}>
            <CalendarDots size={26} />
          </div>
          <h3 className="event-detail-title">{selectedEvent.title}</h3>
          <span className="project-tag">{selectedEvent.project}</span>
          <div className="event-detail-meta">
            <span>
              <CalendarDots size={18} />
              {dateAt(
                new Date(`${selectedEvent.week}T12:00:00`),
                selectedEvent.day,
              ).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <span>
              <Clock size={18} />
              {hourLabel(selectedEvent.start)} –{" "}
              {hourLabel(selectedEvent.start + selectedEvent.duration)}
            </span>
          </div>
          <p className="event-description">
            {selectedEvent.description || "Um espaço reservado para o time."}
          </p>
          <div className="event-participants">
            <span>Participantes</span>
            <div>
              {selectedEvent.people.map((i) => (
                <span key={i}>
                  <Avatar person={i} size="small" />
                  {i === 0 ? name : people[i].name.split(" ")[0]}
                </span>
              ))}
            </div>
          </div>
          <div className="dialog-actions">
            <button
              className="outline-button"
              onClick={() => {
                setEditEvent(selectedEvent);
                setSelectedEvent(null);
                setDialog("event");
              }}
            >
              <PencilSimple size={16} />
              Editar
            </button>
            <button
              className={`primary-button ${selectedEvent.rsvp ? "confirmed" : ""}`}
              onClick={() => {
                const updated = { ...selectedEvent, rsvp: !selectedEvent.rsvp };
                setEvents((prev) =>
                  prev.map((ev) => (ev.id === updated.id ? updated : ev)),
                );
                setSelectedEvent(updated);
              }}
            >
              <Check size={17} />
              {selectedEvent.rsvp
                ? "Presença confirmada"
                : "Confirmar presença"}
            </button>
          </div>
          <p className="demo-note">
            Confirmação local no espaço de demonstração.
          </p>
        </Dialog>
      )}
      {dialog === "event" && (
        <Dialog
          title={editEvent ? "Editar evento" : "Novo encontro"}
          onClose={() => {
            setDialog(null);
            setEditEvent(null);
          }}
        >
          <form className="dialog-form" onSubmit={saveEvent}>
            <label>
              Título do evento
              <input
                name="title"
                required
                maxLength={120}
                autoFocus
                placeholder="O que vamos fazer juntos?"
                defaultValue={editEvent?.title}
              />
            </label>
            <label>
              Projeto
              <select
                name="project"
                defaultValue={editEvent?.project ?? projects[3]}
              >
                {projects.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Data
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={
                    editEvent
                      ? dayKey(
                          dateAt(
                            new Date(`${editEvent.week}T12:00:00`),
                            editEvent.day,
                          ),
                        )
                      : dayKey(dateAt(monday, activeDay))
                  }
                />
              </label>
              <label>
                Início
                <input
                  name="start"
                  type="time"
                  required
                  defaultValue={
                    editEvent ? hourLabel(editEvent.start) : eventStart
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Duração
                <select name="duration" defaultValue={editEvent?.duration ?? 1}>
                  {[0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n * 60} minutos
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cor
                <select name="tone" defaultValue={editEvent?.tone ?? "blue"}>
                  <option value="blue">Azul</option>
                  <option value="orange">Laranja</option>
                  <option value="purple">Violeta</option>
                  <option value="green">Verde</option>
                </select>
              </label>
            </div>
            <label>
              Pauta
              <textarea
                name="description"
                placeholder="Contexto e assuntos para a conversa…"
                rows={3}
                maxLength={2000}
                defaultValue={editEvent?.description}
              />
            </label>
            <p className="demo-note">
              Nesta demonstração, os participantes são definidos pelo exemplo.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setDialog(null);
                  setEditEvent(null);
                }}
              >
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                <Check size={17} />
                {editEvent ? "Salvar alterações" : "Criar evento"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {dialog === "manual" && (
        <Dialog title="Adicionar horas" onClose={() => setDialog(null)}>
          <form className="dialog-form" onSubmit={saveManual}>
            <label>
              O que você fez?
              <input
                name="description"
                autoFocus
                required
                maxLength={180}
                placeholder="Descreva a atividade"
              />
            </label>
            <label>
              Projeto
              <select name="project">
                {projects.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Data
                <input
                  type="date"
                  name="date"
                  required
                  max={dayKey(today)}
                  defaultValue={dayKey(today)}
                />
              </label>
              <label>
                Tempo em minutos
                <input
                  type="number"
                  name="minutes"
                  min="1"
                  max="1440"
                  required
                  placeholder="60"
                />
              </label>
            </div>
            <p className="demo-note">
              Registro local de demonstração. A validação de sobreposição será
              feita na integração com o banco.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setDialog(null)}
              >
                Cancelar
              </button>
              <button className="primary-button" type="submit">
                <Check size={17} />
                Adicionar registro
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {dialog === "settings" && (
        <Dialog
          title="Seu espaço, do seu jeito"
          onClose={() => setDialog(null)}
        >
          <form
            className="dialog-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const updated = String(data.get("name")).trim();
              if (!updated) return;
              setName(updated);
              setStatus(String(data.get("status")));
              setDialog(null);
              setToast("Perfil atualizado neste navegador.");
            }}
          >
            <div className="profile-preview">
              <Avatar name={name} size="large" />
              <span>
                <strong>{name}</strong>
                <small>Perfil de demonstração</small>
              </span>
            </div>
            <label>
              Como podemos chamar você?
              <input name="name" required maxLength={80} defaultValue={name} />
            </label>
            <label>
              Disponibilidade
              <select name="status" defaultValue={status}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="settings-info">
              <SquaresFour size={23} />
              <div>
                <strong>ZULU · Estúdio</strong>
                <p>
                  Esta versão apresenta a experiência visual. Login, MFA e
                  sincronização com o time são a próxima etapa.
                </p>
              </div>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setDialog(null)}
              >
                Cancelar
              </button>
              <button type="submit" className="primary-button">
                Salvar perfil <Check size={16} />
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {dialog === "search" && (
        <Dialog
          title="Buscar no ZULU"
          onClose={() => {
            setDialog(null);
            setQuery("");
          }}
          wide
        >
          <div className="search-input-wrap">
            <MagnifyingGlass size={21} />
            <input
              autoFocus
              aria-label="Buscar páginas e eventos"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Páginas, eventos ou projetos…"
            />
          </div>
          <div className="search-results">
            <p className="list-label">Páginas</p>
            {navigation
              .filter((n) =>
                n.label.toLowerCase().includes(query.toLowerCase()),
              )
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    navigate(n.id);
                    setDialog(null);
                  }}
                >
                  <n.icon size={20} />
                  <span>{n.label}</span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            <p className="list-label">Eventos</p>
            {events
              .filter((e) =>
                `${e.title} ${e.project}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .slice(0, 8)
              .map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setDialog(null);
                    setSelectedEvent(e);
                  }}
                >
                  <CalendarDots size={20} />
                  <span>
                    {e.title}
                    <small>{e.project}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            {query &&
              !navigation.some((n) =>
                n.label.toLowerCase().includes(query.toLowerCase()),
              ) &&
              !events.some((e) =>
                `${e.title} ${e.project}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              ) && (
                <p className="search-empty">
                  Nenhum resultado. Tente outro termo.
                </p>
              )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
