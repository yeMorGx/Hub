"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  SquaresFour,
  Columns,
  BookOpenText,
  ChartBar,
  CalendarDots,
  ChatCircleText,
  Timer as TimerIcon,
  UsersThree,
  GearSix,
  CaretDown,
  CaretLeft,
  ArrowUpRight,
  ArrowRight,
  Headphones,
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
  Command,
  PencilSimple,
  SignOut,
  Copy,
  Lock,
  WifiSlash,
  ArrowClockwise,
  DotsThree,
  Trash,
  ShieldCheck,
  UserPlus,
} from "@phosphor-icons/react";
import { clearVault } from "@/public/offline-vault.js";
import { OfflineSettings } from "./offline-settings";
import { PushSettings } from "./push-settings";
import { InstallApp } from "./pwa";
import { useHub } from "@/lib/hub/use-hub";
import { useChannel } from "@/lib/hub/use-channel";
import type { LivePage, Person, Row } from "@/lib/hub/types";
import {
  clock,
  dateAt,
  dayKey,
  hourLabel,
  localHour,
  mondayOf,
  shortDuration,
  toLocalInput,
} from "@/lib/hub/dates";
import { errorMessage } from "@/lib/supabase/errors";
import { AdvancedConversation } from "./advanced-conversation";
import { TeamAccess } from "./team-access";
import { NotificationBell } from "./notification-bell";
import { DesktopBridge } from "./desktop-bridge";
import { LiveCalls } from "./live-calls";
import { LiveIntegrations } from "./live-integrations";
import { LiveManagement } from "./live-management";
import { LiveCollaboration } from "./live-collaboration";
import { LiveBoard, type TaskInput } from "./live-board";
import { LiveCalendar } from "./live-calendar";
import { LiveOnboarding } from "./live-onboarding";
import { PersonAvatar, PeopleAvatars, HubDialog, EmptyState } from "./hub-ui";
const navigation = [
  { id: "overview", label: "Hoje", icon: SquaresFour },
  { id: "calendar", label: "Calendário", icon: CalendarDots },
  { id: "board", label: "Tarefas", icon: Columns },
  { id: "chat", label: "Conversas", icon: ChatCircleText },
  { id: "hours", label: "Minhas horas", icon: TimerIcon },
  { id: "people", label: "Pessoas", icon: UsersThree },
  { id: "collaboration", label: "Colaboração", icon: BookOpenText },
  { id: "management", label: "Gestão", icon: ChartBar },
  { id: "calls", label: "Chamadas", icon: Headphones },
  { id: "integrations", label: "Integrações", icon: ShieldCheck },
  { id: "more", label: "Mais", icon: DotsThree },
] as const;
const availabilityLabels: Record<string, string> = {
  online: "Disponível",
  meeting: "Em reunião",
  away: "Ausente",
  offline: "Offline",
  unknown: "Presença indisponível",
};
type Modal =
  | "event"
  | "time"
  | "profile"
  | "search"
  | "channel"
  | "project"
  | "member"
  | "team"
  | "message"
  | "channel-members"
  | null;
export function LiveHubApp({ userId }: { userId: string }) {
  const [now, setNow] = useState(0),
    [page, setPage] = useState<LivePage>("overview"),
    [weekOffset, setWeekOffset] = useState(0),
    [calendarView, setCalendarView] = useState<"week" | "day">("week"),
    [activeDay, setActiveDay] = useState(0);
  const [collaborationInitialTab, setCollaborationInitialTab] = useState<
    "notes" | "notifications"
  >("notes");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("inbox") === "1") {
      setCollaborationInitialTab("notifications");
      setPage("collaboration");
    }
    if (new URLSearchParams(window.location.search).get("integrations") === "1")
      setPage("integrations");
    const current = new Date();
    setNow(current.getTime());
    setActiveDay((current.getDay() + 6) % 7);
    if (window.matchMedia("(max-width:520px)").matches) setCalendarView("day");
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const today = new Date(now || "2026-01-05T12:00:00"),
    todayKey = dayKey(today);
  const currentMonday = useMemo(
    () => mondayOf(new Date(`${todayKey}T12:00:00`)),
    [todayKey],
  );
  const monday = useMemo(
    () => dateAt(currentMonday, weekOffset * 7),
    [currentMonday, weekOffset],
  );
  const rangeStart = monday.toISOString(),
    rangeEnd = dateAt(monday, 7).toISOString();
  const hub = useHub(userId, rangeStart, rangeEnd, todayKey),
    data = hub.snapshot;
  const [modal, setModal] = useState<Modal>(null),
    [popover, setPopover] = useState(false),
    [formError, setFormError] = useState("");
  const [description, setDescription] = useState(""),
    [projectId, setProjectId] = useState(""),
    [channelId, setChannelId] = useState(""),
    [draft, setDraft] = useState(""),
    [search, setSearch] = useState(""),
    [peopleQuery, setPeopleQuery] = useState(""),
    [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [eventId, setEventId] = useState(""),
    [editingEvent, setEditingEvent] = useState<Row<"events"> | null>(null),
    [eventStart, setEventStart] = useState(""),
    [editingTime, setEditingTime] = useState<Row<"time_entries"> | null>(null),
    [editingMessage, setEditingMessage] = useState<Row<"messages"> | null>(
      null,
    );
  const [atBottom, setAtBottom] = useState(true),
    [showChannelList, setShowChannelList] = useState(true);
  const chatEnd = useRef<HTMLDivElement>(null),
    messagesArea = useRef<HTMLDivElement>(null),
    retryMessage = useRef<{ key: string; id: string } | null>(null),
    stickyBottom = useRef(true);
  const selectedChannel = data.channels.find((c) => c.id === channelId);
  const channelMembership = data.channelMemberships.find(
    (m) => m.channel_id === channelId,
  );
  const channel = useChannel(
    selectedChannel?.id ?? "",
    Boolean(channelMembership),
    hub.refreshTeam,
  );
  useEffect(() => {
    setChannelId("");
    setDraft("");
    setProjectId("");
    setEventId("");
    setModal(null);
    setPopover(false);
  }, [hub.teamId]);
  useEffect(() => {
    if (
      channelId &&
      !data.channels.some((c) => c.id === channelId) &&
      data.teamId
    ) {
      setChannelId("");
      setDraft("");
    }
  }, [data.channels, data.teamId, channelId]);
  useEffect(() => {
    if (!channelId && data.channels.length) {
      setChannelId(
        data.channels.find(
          (c) =>
            c.kind !== "dm" &&
            data.channelMemberships.some((m) => m.channel_id === c.id),
        )?.id ?? data.channels[0].id,
      );
    }
  }, [channelId, data.channels, data.channelMemberships]);
  useEffect(() => {
    stickyBottom.current = true;
    setAtBottom(true);
    setDraft("");
    retryMessage.current = null;
  }, [channelId]);
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setModal("search");
      }
      if (e.key === "Escape") setPopover(false);
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  const activeTimer = data.entries.find((e) => e.ended_at === null);
  const elapsed = activeTimer
    ? Math.max(
        0,
        Math.floor((now - new Date(activeTimer.started_at).getTime()) / 1000),
      )
    : 0;
  const entries = data.entries.filter(
    (e) => e.team_id === hub.teamId && e.ended_at !== null,
  );
  const durationForDay = (key: string) =>
    entries
      .filter((e) => dayKey(new Date(e.started_at)) === key)
      .reduce((sum, e) => sum + Number(e.duration_seconds ?? 0), 0) +
    (activeTimer?.team_id === hub.teamId &&
    dayKey(new Date(activeTimer.started_at)) === key
      ? elapsed
      : 0);
  const todaySeconds = durationForDay(todayKey),
    weekSeconds = [0, 1, 2, 3, 4, 5, 6].reduce(
      (sum, day) => sum + durationForDay(dayKey(dateAt(currentMonday, day))),
      0,
    );
  const currentName = hub.bootstrap?.profile.display_name ?? "Meu perfil";
  const totalUnread = Object.values(data.unread).reduce((sum, n) => sum + n, 0);
  const todayStart = new Date(`${todayKey}T00:00:00`),
    todayEnd = dateAt(todayStart, 1);
  const todayEvents = data.events.filter(
    (e) => new Date(e.starts_at) < todayEnd && new Date(e.ends_at) > todayStart,
  );
  const selectedEvent = data.events.find((e) => e.id === eventId);
  const canEditEvent = Boolean(
    selectedEvent && (hub.canManage || selectedEvent.created_by === userId),
  );
  const projectName = (id: string | null) =>
    data.projects.find((p) => p.id === id)?.name ??
    (id ? "Projeto de outro período/time" : "Sem projeto");
  const personName = (id: string) =>
    id === userId
      ? currentName
      : (data.people.find((p) => p.id === id)?.display_name ??
        "Pessoa do time");
  const personStatus = (person: Person) =>
    hub.presenceReady === "live"
      ? (hub.onlinePeople[person.id] ?? "offline")
      : "unknown";
  const channelName = (row: Row<"channels">) =>
    row.kind === "dm"
      ? personName(
          row.dm_user_low === userId ? row.dm_user_high! : row.dm_user_low!,
        )
      : (row.name ?? "Canal");
  const eventPeople = (id: string) =>
    data.people.filter((p) =>
      data.attendees.some((a) => a.event_id === id && a.user_id === p.id),
    );
  function navigate(next: LivePage) {
    setPage(next);
    setPopover(false);
    setSearch("");
    if (next === "chat") setShowChannelList(true);
  }
  function openModal(next: Modal) {
    setFormError("");
    setPopover(false);
    setModal(next);
  }
  function newEvent(date = today, hour = 10) {
    const start = new Date(date);
    start.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
    setEventStart(toLocalInput(start.toISOString()));
    setEditingEvent(null);
    openModal("event");
  }
  function editEvent(event: Row<"events">) {
    setEditingEvent(event);
    setEventStart(toLocalInput(event.starts_at));
    setEventId("");
    openModal("event");
  }
  function newTime() {
    setEditingTime(null);
    openModal("time");
  }
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
  async function signOut() {
    await clearVault().catch(() => {});
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await hub
            .rpc("unregister_push_subscription", {
              p_endpoint: subscription.endpoint,
            })
            .catch(() => {});
          await subscription.unsubscribe();
        }
      } catch {}
      try {
        localStorage.removeItem("hub.push.owner");
      } catch {}
    }
    const { error } = await hub.client.auth.signOut({ scope: "local" });
    if (error) hub.notify(errorMessage(error), true);
    else window.location.replace("/login");
  }
  async function startTimer(text = description, id = projectId) {
    if (activeTimer) {
      hub.notify(
        "Você já tem um timer em andamento. Pare-o antes de iniciar outro.",
        true,
      );
      return;
    }
    if (!text.trim()) {
      setPage("hours");
      return;
    }
    await hub.mutate(
      () =>
        hub.rpc("start_timer", {
          p_team_id: hub.teamId,
          p_description: text.trim(),
          p_project_id: id || undefined,
        }),
      "Timer iniciado. Bom trabalho!",
    );
  }
  async function stopTimer() {
    if (!activeTimer) return;
    await hub.mutate(
      () => hub.rpc("stop_timer", { p_entry_id: activeTimer.id }),
      "Tempo registrado pelo servidor.",
    );
  }
  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !selectedChannel || !channelMembership || hub.busy)
      return;
    const text = draft.trim(),
      key = `${channelId}:${text}`;
    if (retryMessage.current?.key !== key)
      retryMessage.current = { key, id: crypto.randomUUID() };
    const clientId = retryMessage.current.id;
    const result = await hub.mutate(
      () =>
        hub.rpc("send_message", {
          p_channel_id: channelId,
          p_client_id: clientId,
          p_body: text,
        }),
      "Mensagem enviada.",
    );
    if (result.ok) {
      setDraft((current) => (current.trim() === text ? "" : current));
      retryMessage.current = null;
      stickyBottom.current = true;
      setAtBottom(true);
      await channel.refresh();
    }
  }
  async function saveEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const start = new Date(String(fields.get("start"))),
      end = new Date(String(fields.get("end")));
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    ) {
      setFormError("O término precisa ser depois do início.");
      return;
    }
    setFormError("");
    const result = await hub.mutate(
      () =>
        hub.rpc("save_event", {
          p_team_id: hub.teamId,
          p_event_id: editingEvent?.id,
          p_title: String(fields.get("title")).trim(),
          p_kind: String(fields.get("kind")) as "meeting" | "event",
          p_starts_at: start.toISOString(),
          p_ends_at: end.toISOString(),
          p_description: String(fields.get("description")),
          p_call_url: String(fields.get("call_url")).trim() || undefined,
          p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      "Evento salvo na agenda do time.",
    );
    if (result.ok) {
      setModal(null);
      setWeekOffset(
        Math.round(
          (mondayOf(start).getTime() - currentMonday.getTime()) / 604800000,
        ),
      );
      setActiveDay((start.getDay() + 6) % 7);
      if (start.getDay() === 0 || start.getDay() === 6) setCalendarView("day");
      setEventId(result.value);
    }
  }
  async function saveTime(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const start = new Date(String(fields.get("start"))),
      end = new Date(String(fields.get("end")));
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start ||
      end.getTime() > Date.now()
    ) {
      setFormError(
        "Informe um intervalo válido, com início antes do término e sem horários no futuro.",
      );
      return;
    }
    setFormError("");
    const args = {
      p_started_at: start.toISOString(),
      p_ended_at: end.toISOString(),
      p_project_id: String(fields.get("project")) || undefined,
      p_description: String(fields.get("description")).trim(),
    };
    const result = await hub.mutate(
      () =>
        editingTime
          ? hub.rpc("edit_time_entry", { ...args, p_entry_id: editingTime.id })
          : hub.rpc("add_manual_time_entry", {
              ...args,
              p_team_id: hub.teamId,
            }),
      "Registro de horas salvo.",
    );
    if (result.ok) setModal(null);
  }
  async function openDm(person: Person) {
    const result = await hub.mutate(
      () =>
        hub.rpc("open_dm", {
          p_team_id: hub.teamId,
          p_other_user_id: person.id,
        }),
      "Conversa aberta.",
    );
    if (result.ok) {
      setChannelId(result.value);
      setPage("chat");
      setShowChannelList(false);
    }
  }
  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const result = await hub.mutate(async () => {
      const { error } = await hub.client
        .from("profiles")
        .update({ display_name: String(fields.get("name")).trim() })
        .eq("id", userId);
      if (error) throw error;
      if (hub.canParticipate)
        await hub.rpc("set_work_status", {
          p_team_id: hub.teamId,
          p_body: String(fields.get("body")).trim(),
        });
      hub.setAvailability(String(fields.get("availability")));
    }, "Perfil e status atualizados.");
    if (result.ok) setModal(null);
  }
  async function createProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const result = await hub.mutate(
      () =>
        hub.rpc("save_project", {
          p_team_id: hub.teamId,
          p_name: String(fields.get("name")).trim(),
          p_description: String(fields.get("description")),
        }),
      "Projeto criado.",
    );
    if (result.ok) {
      setProjectId(result.value);
      setModal(null);
    }
  }
  async function createChannel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const result = await hub.mutate(
      () =>
        hub.rpc("create_channel", {
          p_team_id: hub.teamId,
          p_name: String(fields.get("name")).trim(),
          p_kind: String(fields.get("kind")) as "public" | "private",
          p_member_ids: fields.getAll("members").map(String),
        }),
      "Canal criado.",
    );
    if (result.ok) {
      setChannelId(result.value);
      setModal(null);
      setPage("chat");
      setShowChannelList(false);
    }
  }
  async function createTeam(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const result = await hub.mutate(
      () =>
        hub.rpc("create_team", {
          p_workspace_id: String(fields.get("workspace")),
          p_name: String(fields.get("name")).trim(),
        }),
      "Time criado.",
    );
    if (result.ok) {
      hub.setTeamId(result.value);
      setModal(null);
    }
  }
  const Notice = hub.notice ? (
    <div
      role={hub.notice.error ? "alert" : "status"}
      className={`toast ${hub.notice.error ? "toast-error" : ""}`}
    >
      <CheckCircle size={19} />
      {hub.notice.message}
      <button aria-label="Dispensar aviso" onClick={hub.dismissNotice}>
        <X size={16} />
      </button>
    </div>
  ) : null;
  if (hub.bootLoading || !now)
    return (
      <div className="loading-screen">
        <SquaresFour size={34} weight="fill" />
        <span>Abrindo seu espaço…</span>
        <CircleNotch className="spinning" size={20} />
      </div>
    );
  if (hub.bootError)
    return (
      <main className="live-access-error">
        <EmptyState
          icon={<WifiSlash size={38} />}
          title="Não conseguimos abrir seu espaço"
          description={hub.bootError}
          action="Tentar novamente"
          onAction={() => void hub.refreshAll()}
        />
        <button className="text-button" onClick={signOut}>
          Sair da conta <SignOut size={15} />
        </button>
        {Notice}
      </main>
    );
  if (!hub.bootstrap)
    return (
      <div className="loading-screen">
        <CircleNotch className="spinning" size={22} />
        Conferindo sua sessão…
      </div>
    );
  if (!hub.bootstrap.teams.length)
    return (
      <>
        <LiveOnboarding hub={hub} />
        {Notice}
      </>
    );
  const currentPage = navigation.find((item) => item.id === page)!;
  const recentWork = entries
    .filter(
      (entry) =>
        !entry.project_id ||
        data.projects.some((p) => p.id === entry.project_id),
    )
    .filter(
      (entry, index, array) =>
        array.findIndex(
          (other) =>
            other.description === entry.description &&
            other.project_id === entry.project_id,
        ) === index,
    )
    .slice(0, 3);
  const selectedOthers =
    selectedChannel?.kind === "dm"
      ? data.people.find(
          (p) =>
            p.id ===
            (selectedChannel.dm_user_low === userId
              ? selectedChannel.dm_user_high
              : selectedChannel.dm_user_low),
        )
      : null;
  const profileBody = data.people.find((p) => p.id === userId)?.body ?? "";
  return (
    <div className="app-shell live-app">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <aside className="rail" aria-label="Navegação principal">
        <button
          className="brand"
          aria-label="Hub — início"
          onClick={() => navigate("overview")}
        >
          <SquaresFour size={29} weight="fill" />
        </button>
        <div className="rail-divider" />
        <nav>
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`rail-button ${page === item.id ? "active" : ""} ${["hours", "people", "collaboration", "management", "integrations", "calls"].includes(item.id) ? "nav-secondary" : ""} ${item.id === "more" ? "mobile-more-button" : ""}`}
              onClick={() => navigate(item.id)}
              aria-label={item.label}
              aria-current={page === item.id ? "page" : undefined}
            >
              <item.icon
                size={23}
                weight={page === item.id ? "fill" : "regular"}
              />
              <span className="nav-tooltip">{item.label}</span>
              {item.id === "chat" && totalUnread > 0 && (
                <span
                  className="nav-unread"
                  aria-label={`${totalUnread} mensagens não lidas`}
                />
              )}
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <button
            className="rail-button"
            aria-label="Preferências e perfil"
            onClick={() => openModal("profile")}
          >
            <GearSix size={23} />
            <span className="nav-tooltip">Preferências</span>
          </button>
          <button
            className="profile-button"
            aria-label="Meu perfil"
            onClick={() => openModal("profile")}
          >
            <PersonAvatar
              name={currentName}
              id={userId}
              presence={hub.availability}
            />
          </button>
        </div>
      </aside>
      <DesktopBridge hub={hub} />
      <div className="app-content">
        <header className="topbar">
          <div className="workspace-wrap">
            <button
              className="workspace-button"
              aria-expanded={popover}
              onClick={() => setPopover(!popover)}
            >
              <span className="workspace-icon">
                <SquaresFour weight="fill" size={18} />
              </span>
              <strong>{hub.workspace?.name ?? "Meu workspace"}</strong>
              <CaretDown size={13} />
            </button>
            {popover && (
              <div className="popover workspace-popover">
                <span className="popover-label">Seu workspace e time</span>
                <label className="live-workspace-label" htmlFor="team-picker">
                  Time ativo
                  <select
                    id="team-picker"
                    value={hub.teamId}
                    onChange={(e) => {
                      hub.setTeamId(e.target.value);
                      setPopover(false);
                    }}
                  >
                    {hub.bootstrap.workspaces.map((workspace) => (
                      <optgroup key={workspace.id} label={workspace.name}>
                        {hub
                          .bootstrap!.teams.filter(
                            (t) => t.workspace_id === workspace.id,
                          )
                          .map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <span className="workspace-role">
                  <ShieldCheck size={14} />
                  {hub.isAdmin
                    ? "Administrador"
                    : hub.canManage
                      ? "Líder"
                      : "Membro"}
                </span>
                {hub.isAdmin && (
                  <button
                    className="text-button"
                    onClick={() => openModal("team")}
                  >
                    Criar time <Plus size={14} />
                  </button>
                )}
                <button
                  className="text-button workspace-signout"
                  onClick={signOut}
                >
                  Sair da conta <SignOut size={14} />
                </button>
              </div>
            )}
          </div>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb">{currentPage.label}</span>
          <div className="topbar-right">
            <span
              className={`connection-label connection-${hub.connection}`}
              title={
                hub.connection === "degraded"
                  ? "Atualizações por consulta periódica enquanto o tempo real reconecta."
                  : undefined
              }
            >
              <i />
              {hub.connection === "live"
                ? "Conectado"
                : hub.connection === "offline"
                  ? "Sem conexão"
                  : hub.connection === "degraded"
                    ? "Reconectando"
                    : "Conectando"}
            </span>
            <button
              className="search-button"
              aria-label="Buscar no Hub"
              onClick={() => openModal("search")}
            >
              <MagnifyingGlass size={17} />
              <span>Buscar</span>
              <kbd>
                <Command size={11} />K
              </kbd>
            </button>
            <button
              className="icon-button"
              aria-label="Atualizar dados"
              disabled={hub.busy || hub.teamLoading}
              onClick={() => void hub.refreshAll()}
            >
              <ArrowClockwise size={20} />
            </button>
            <NotificationBell
              hub={hub}
              onOpen={() => {
                setCollaborationInitialTab("notifications");
                navigate("collaboration");
              }}
            />
            <button
              className="top-avatar"
              aria-label="Meu perfil"
              onClick={() => openModal("profile")}
            >
              <PersonAvatar name={currentName} id={userId} />
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
                  ? `Um bom dia para criar juntos. ${today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}.`
                  : page === "calendar"
                    ? "Espaço na agenda para o que importa."
                    : page === "board"
                      ? "Do próximo passo à entrega, com o tempo registrado."
                      : page === "chat"
                        ? "O trabalho flui melhor em uma boa conversa."
                        : page === "hours"
                          ? "Seu tempo, com mais clareza."
                          : page === "collaboration"
                            ? "O contexto do trabalho, sempre ao alcance."
                            : page === "management"
                              ? "Planeje a capacidade e acompanhe o trabalho do time."
                              : page === "integrations"
                                ? "Conecte suas ferramentas e acompanhe as alterações."
                                : page === "calls"
                                  ? "Quando uma conversa ao vivo faz diferença."
                                  : `${hub.currentTeam?.name ?? "Seu time"} · pessoas e trabalho em comum.`}
              </p>
            </div>
            <div className="page-heading-actions">
              {activeTimer && page !== "overview" && (
                <button
                  className="running-pill"
                  onClick={() => navigate("hours")}
                  aria-label={`Abrir timer ativo: ${clock(elapsed)}`}
                >
                  <i className="live-dot live" />
                  <span>{clock(elapsed)}</span>
                  <TimerIcon size={16} />
                </button>
              )}
              {(page === "overview" || page === "calendar") &&
              hub.canParticipate ? (
                <button
                  className="primary-button"
                  disabled={hub.busy}
                  onClick={() => newEvent()}
                >
                  <Plus size={17} />
                  Novo evento
                </button>
              ) : page === "hours" && hub.canParticipate ? (
                <button
                  className="primary-button"
                  disabled={hub.busy}
                  onClick={newTime}
                >
                  <Plus size={17} />
                  Adicionar horas
                </button>
              ) : page === "people" && hub.isAdmin ? (
                <button
                  className="primary-button"
                  onClick={() => openModal("member")}
                >
                  <UserPlus size={17} />
                  Convidar pessoa
                </button>
              ) : (
                <span className="team-pill">
                  <i className="live-dot live" />
                  {hub.currentTeam?.name}
                </span>
              )}
            </div>
          </div>
          {hub.connection === "offline" && (
            <div className="connection-banner" role="status">
              <WifiSlash size={17} />
              Você está sem conexão. Os dados exibidos podem estar
              desatualizados; as gravações precisam de conexão.
            </div>
          )}
          {!hub.canParticipate && (
            <div className="connection-banner">
              <ShieldCheck size={17} />
              Você pode consultar este time como administrador. A participação
              no time é necessária para conversar e registrar horas.
            </div>
          )}
          {hub.teamError ? (
            <EmptyState
              icon={<WifiSlash size={35} />}
              title="Não foi possível carregar este time"
              description={hub.teamError}
              action="Tentar novamente"
              onAction={() => void hub.refreshAll()}
            />
          ) : !data.teamId ? (
            <div className="live-team-loading" role="status">
              <CircleNotch className="spinning" size={23} />
              Carregando seu time…
            </div>
          ) : (
            <>
              {(page === "overview" || page === "calendar") && (
                <div
                  className={`dashboard-layout ${page === "calendar" ? "calendar-page-layout" : ""}`}
                >
                  <div className="dashboard-main">
                    {page === "overview" && (
                      <div className="summary-grid">
                        <section
                          className={`focus-card ${activeTimer ? "is-running" : ""}`}
                          aria-label="Registro de tempo"
                        >
                          <div className="card-topline">
                            <span>
                              <i
                                className={`live-dot ${activeTimer ? "live" : ""}`}
                              />
                              {activeTimer
                                ? "Foco em andamento"
                                : "Seu próximo foco"}
                            </span>
                            <TimerIcon size={17} />
                          </div>
                          <div className="focus-title">
                            <h2>
                              {activeTimer?.description ||
                                description ||
                                "Escolha seu próximo foco"}
                            </h2>
                            <span>
                              {activeTimer
                                ? projectName(activeTimer.project_id)
                                : projectId
                                  ? projectName(projectId)
                                  : "Uma coisa de cada vez."}
                            </span>
                          </div>
                          <button
                            className="timer-control"
                            disabled={
                              hub.busy || (!activeTimer && !hub.canParticipate)
                            }
                            aria-label={
                              activeTimer
                                ? "Parar timer"
                                : description
                                  ? "Iniciar timer"
                                  : "Escolher atividade"
                            }
                            onClick={() =>
                              activeTimer ? void stopTimer() : void startTimer()
                            }
                          >
                            {hub.busy ? (
                              <CircleNotch className="spinning" size={24} />
                            ) : activeTimer ? (
                              <Stop size={25} weight="fill" />
                            ) : (
                              <Play size={25} weight="fill" />
                            )}
                          </button>
                          <div className="timer-bottom">
                            <span className="timer-digits">
                              {clock(elapsed)}
                            </span>
                            <span>
                              {activeTimer
                                ? "Parar e registrar"
                                : "Pronto para começar"}
                            </span>
                          </div>
                        </section>
                        <section className="work-card panel">
                          <div className="section-heading">
                            <h2>Continue de onde parou</h2>
                            <span className="muted-count">
                              {recentWork.length}
                            </span>
                          </div>
                          <div className="work-list">
                            {recentWork.length ? (
                              recentWork.map((entry, index) => (
                                <button
                                  className="work-item"
                                  key={entry.id}
                                  disabled={
                                    hub.busy ||
                                    !!activeTimer ||
                                    !hub.canParticipate
                                  }
                                  onClick={() =>
                                    void startTimer(
                                      entry.description,
                                      entry.project_id ?? "",
                                    )
                                  }
                                >
                                  <span
                                    className={`small-play tone-${["orange", "purple", "green"][index]}`}
                                  >
                                    <Play size={12} weight="fill" />
                                  </span>
                                  <span>
                                    <strong>
                                      {entry.description ||
                                        "Trabalho sem descrição"}
                                    </strong>
                                    <small>
                                      {projectName(entry.project_id)}
                                    </small>
                                  </span>
                                  <ArrowUpRight
                                    size={16}
                                    className="work-arrow"
                                  />
                                </button>
                              ))
                            ) : (
                              <div className="compact-empty">
                                <TimerIcon size={27} />
                                <span>O próximo passo é seu.</span>
                                <small>
                                  Seus registros recentes aparecerão aqui.
                                </small>
                              </div>
                            )}
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
                              todayEvents.slice(0, 2).map((event, index) => (
                                <button
                                  className={`meeting-preview ${index === 0 ? "meeting-featured" : ""}`}
                                  key={event.id}
                                  onClick={() => setEventId(event.id)}
                                >
                                  <span className="meeting-hour">
                                    {new Date(
                                      event.starts_at,
                                    ).toLocaleTimeString("pt-BR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {event.kind === "meeting" ? (
                                      <VideoCamera size={15} />
                                    ) : (
                                      <CalendarDots size={15} />
                                    )}
                                  </span>
                                  <strong>{event.title}</strong>
                                  <span className="meeting-bottom">
                                    <PeopleAvatars
                                      people={eventPeople(event.id)}
                                    />
                                    <span>
                                      {Math.round(
                                        (new Date(event.ends_at).getTime() -
                                          new Date(event.starts_at).getTime()) /
                                          60000,
                                      )}{" "}
                                      min
                                    </span>
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="compact-empty">
                                <CalendarDots size={27} />
                                <span>Um respiro na agenda.</span>
                                <small>
                                  Não há encontros marcados para hoje.
                                </small>
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
                    <LiveCalendar
                      hub={hub}
                      monday={monday}
                      today={today}
                      day={activeDay}
                      view={calendarView}
                      onView={setCalendarView}
                      onDay={setActiveDay}
                      onMove={moveCalendar}
                      onToday={() => {
                        setWeekOffset(0);
                        setActiveDay((today.getDay() + 6) % 7);
                      }}
                      onNew={newEvent}
                      onSelect={(event) => setEventId(event.id)}
                      full={page === "calendar"}
                    />
                  </div>
                  <aside className="context-sidebar">
                    <section className="team-section">
                      <div className="section-heading">
                        <h2>Por aqui agora</h2>
                        <span
                          className={`online-count ${hub.presenceReady !== "live" ? "presence-unavailable" : ""}`}
                        >
                          {hub.presenceReady === "live"
                            ? `${Object.keys(hub.onlinePeople).filter((id) => data.people.some((p) => p.id === id)).length} online`
                            : hub.presenceReady === "connecting"
                              ? "Conectando presença"
                              : "Presença indisponível"}
                        </span>
                      </div>
                      <p className="section-description">
                        Cada um no seu foco. Todos juntos.
                      </p>
                      <div className="team-list">
                        {data.people
                          .filter((p) => p.id !== userId)
                          .slice(0, 4)
                          .map((person) => (
                            <button
                              className="person-row"
                              key={person.id}
                              onClick={() => {
                                setPeopleQuery(person.display_name);
                                navigate("people");
                              }}
                            >
                              <PersonAvatar
                                id={person.id}
                                name={person.display_name}
                                presence={personStatus(person)}
                              />
                              <span>
                                <strong>{person.display_name}</strong>
                                <small>
                                  {person.body ||
                                    availabilityLabels[personStatus(person)]}
                                  {person.timer_running ? " · Timer ativo" : ""}
                                </small>
                              </span>
                            </button>
                          ))}
                        {data.people.length <= 1 && (
                          <p className="resource-note">
                            Seu time começa com você. Convide as próximas
                            pessoas para esse espaço.
                          </p>
                        )}
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
                        aria-label="Suas horas por dia nesta semana"
                      >
                        {[0, 1, 2, 3, 4].map((day) => {
                          const key = dayKey(dateAt(currentMonday, day)),
                            seconds = durationForDay(key);
                          return (
                            <div
                              className={`week-bar-item ${key === todayKey ? "current" : ""}`}
                              key={day}
                              title={`${["Seg", "Ter", "Qua", "Qui", "Sex"][day]}: ${shortDuration(seconds)}`}
                            >
                              <div className="week-bar-track">
                                <div
                                  className="week-bar-fill"
                                  style={{
                                    height: `${Math.min(100, (seconds / 28800) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span>{["S", "T", "Q", "Q", "S"][day]}</span>
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
                        <ChatCircleText size={17} />
                      </div>
                      <p className="live-chat-summary">
                        {totalUnread
                          ? `${totalUnread} ${totalUnread === 1 ? "mensagem espera" : "mensagens esperam"} por você nos seus canais.`
                          : "Troque ideias, compartilhe contexto e encontre seu time."}
                      </p>
                      <button
                        className="outline-button"
                        onClick={() => navigate("chat")}
                      >
                        Abrir conversas <ArrowUpRight size={15} />
                      </button>
                    </section>
                    <div className="sidebar-footnote">
                      <span className="tiny-brand">hub</span>
                      <span>Um espaço. Seu time.</span>
                    </div>
                  </aside>
                </div>
              )}
              {page === "calls" && <LiveCalls key={hub.teamId} hub={hub} />}
              {page === "integrations" && (
                <LiveIntegrations key={hub.teamId} hub={hub} />
              )}
              {page === "management" && (
                <LiveManagement key={hub.teamId} hub={hub} />
              )}
              {page === "collaboration" && (
                <LiveCollaboration
                  key={`${hub.teamId}:${collaborationInitialTab}`}
                  hub={hub}
                  initialTab={collaborationInitialTab}
                  onOpenChannel={(id) => {
                    setChannelId(id);
                    setShowChannelList(false);
                    navigate("chat");
                  }}
                />
              )}
              {page === "more" && (
                <section
                  className="module-directory"
                  aria-label="Outros módulos"
                >
                  {navigation
                    .filter((item) =>
                      [
                        "hours",
                        "people",
                        "collaboration",
                        "management",
                        "integrations",
                        "calls",
                      ].includes(item.id),
                    )
                    .map((item) => (
                      <button key={item.id} onClick={() => navigate(item.id)}>
                        <item.icon size={24} />
                        <span>
                          <strong>{item.label}</strong>
                          <small>
                            {item.id === "hours"
                              ? "Timer e registros de trabalho"
                              : item.id === "people"
                                ? "Disponibilidade e pessoas do time"
                                : item.id === "integrations"
                                  ? "Calendários conectados, webhooks e auditoria"
                                  : item.id === "calls"
                                    ? "Voz, vídeo e compartilhamento de tela"
                                    : item.id === "management"
                                      ? "Relatórios, metas, escalas e ausências"
                                      : "Documentos, check-ins, pautas e notificações"}
                          </small>
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    ))}
                </section>
              )}
              {page === "board" && (
                <LiveBoard
                  key={hub.teamId}
                  tasks={data.tasks}
                  projects={data.projects}
                  people={data.people}
                  userId={userId}
                  canParticipate={hub.canParticipate}
                  canManage={hub.canManage}
                  busy={hub.busy}
                  activeTimer={activeTimer}
                  onSave={async (input: TaskInput) => {
                    const result = await hub.mutate(
                      () =>
                        hub.rpc("save_task", {
                          p_team_id: hub.teamId,
                          p_title: input.title,
                          p_description: input.description,
                          p_project_id: input.projectId || undefined,
                          p_assignee_id: input.assigneeId || undefined,
                          p_due_on: input.dueOn || undefined,
                          p_priority: input.priority,
                          p_task_id: input.id,
                          p_expected_version: input.version,
                        }),
                      "Tarefa salva.",
                    );
                    return result.ok
                      ? null
                      : result.error || "Não foi possível salvar a tarefa.";
                  }}
                  onMove={async (task, status) => {
                    const result = await hub.mutate(
                      () =>
                        hub.rpc("move_task", {
                          p_task_id: task.id,
                          p_status: status,
                          p_expected_version: task.version,
                        }),
                      "Andamento atualizado.",
                    );
                    return result.ok
                      ? null
                      : result.error || "Não foi possível mover a tarefa.";
                  }}
                  onArchive={async (task) => {
                    const result = await hub.mutate(
                      () =>
                        hub.rpc("archive_task", {
                          p_task_id: task.id,
                          p_expected_version: task.version,
                        }),
                      "Tarefa arquivada. Horas preservadas.",
                    );
                    return result.ok
                      ? null
                      : result.error || "Não foi possível arquivar a tarefa.";
                  }}
                  onStart={async (task) => {
                    const result = await hub.mutate(
                      () => hub.rpc("start_task_timer", { p_task_id: task.id }),
                      "Timer iniciado na tarefa.",
                    );
                    return result.ok
                      ? null
                      : result.error || "Não foi possível iniciar o timer.";
                  }}
                  onStop={async () => {
                    if (!activeTimer) return "Não há timer ativo.";
                    const result = await hub.mutate(
                      () =>
                        hub.rpc("stop_timer", { p_entry_id: activeTimer.id }),
                      "Tempo registrado pelo servidor.",
                    );
                    return result.ok
                      ? null
                      : result.error || "Não foi possível parar o timer.";
                  }}
                />
              )}
              {page === "hours" && (
                <div className="hours-page">
                  <section className="time-entry-panel panel">
                    <div>
                      <h2>No que você está trabalhando?</h2>
                      <p>Uma coisa de cada vez. O tempo a gente cuida.</p>
                    </div>
                    <form
                      className="timer-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void (activeTimer ? stopTimer() : startTimer());
                      }}
                    >
                      <label>
                        Descrição
                        <input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Descreva sua próxima atividade"
                          maxLength={2000}
                          required={!activeTimer}
                          disabled={!!activeTimer || !hub.canParticipate}
                        />
                      </label>
                      <label>
                        Projeto
                        <select
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          disabled={!!activeTimer || !hub.canParticipate}
                        >
                          <option value="">Sem projeto</option>
                          {data.projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="inline-timer">
                        <strong>{clock(elapsed)}</strong>
                        <button
                          className={`primary-button ${activeTimer ? "stop-button" : ""}`}
                          disabled={
                            hub.busy || (!activeTimer && !hub.canParticipate)
                          }
                        >
                          {hub.busy ? (
                            <CircleNotch className="spinning" size={17} />
                          ) : activeTimer ? (
                            <Stop size={16} weight="fill" />
                          ) : (
                            <Play size={16} weight="fill" />
                          )}
                          {activeTimer ? "Parar" : "Iniciar"}
                        </button>
                      </div>
                    </form>
                    {activeTimer && (
                      <p className="running-description">
                        <i className="live-dot live" />
                        {activeTimer.description ||
                          "Trabalho em andamento"} ·{" "}
                        {activeTimer.team_id === hub.teamId
                          ? projectName(activeTimer.project_id)
                          : "Timer de outro time"}
                      </p>
                    )}
                    {hub.canManage && (
                      <button
                        className="text-button project-create-link"
                        onClick={() => openModal("project")}
                      >
                        <Plus size={14} />
                        Criar projeto
                      </button>
                    )}
                  </section>
                  <div className="hours-overview">
                    <div>
                      <span>Hoje · neste time</span>
                      <strong>{shortDuration(todaySeconds)}</strong>
                    </div>
                    <div>
                      <span>Esta semana</span>
                      <strong>{shortDuration(weekSeconds)}</strong>
                    </div>
                    <div>
                      <span>Entradas carregadas</span>
                      <strong>{entries.length}</strong>
                    </div>
                  </div>
                  <section className="time-history">
                    <div className="section-heading">
                      <h2>Histórico de horas</h2>
                      <span className="subtle-text">
                        Até 500 registros recentes · horários locais
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
                        {entries.map((entry) => (
                          <div className="time-table-row" key={entry.id}>
                            <strong>
                              <span className="entry-icon">
                                <CheckCircle size={17} />
                              </span>
                              {entry.description || "Sem descrição"}
                              {hub.canParticipate && (
                                <button
                                  className="icon-button edit-time-button"
                                  aria-label={`Editar registro: ${entry.description || "sem descrição"}`}
                                  onClick={() => {
                                    setEditingTime(entry);
                                    openModal("time");
                                  }}
                                >
                                  <PencilSimple size={14} />
                                </button>
                              )}
                            </strong>
                            <span>{projectName(entry.project_id)}</span>
                            <time
                              dateTime={entry.started_at}
                              title={`${new Date(entry.started_at).toLocaleString("pt-BR")} – ${new Date(entry.ended_at!).toLocaleTimeString("pt-BR")}`}
                            >
                              {new Date(entry.started_at).toLocaleDateString(
                                "pt-BR",
                                { day: "2-digit", month: "short" },
                              )}
                            </time>
                            <span className="duration-cell">
                              {shortDuration(
                                Number(entry.duration_seconds ?? 0),
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<TimerIcon size={38} />}
                        title="Seu primeiro registro começa aqui"
                        description="Inicie o timer ou adicione um intervalo de trabalho manualmente."
                        action={
                          hub.canParticipate ? "Adicionar horas" : undefined
                        }
                        onAction={newTime}
                      />
                    )}
                  </section>
                </div>
              )}
              {page === "people" && (
                <section className="people-page">
                  <div className="people-toolbar">
                    <div className="people-search">
                      <MagnifyingGlass size={18} />
                      <label className="sr-only" htmlFor="people-query">
                        Buscar pessoas
                      </label>
                      <input
                        id="people-query"
                        value={peopleQuery}
                        onChange={(e) => setPeopleQuery(e.target.value)}
                        placeholder="Encontrar alguém no time…"
                      />
                    </div>
                    <select
                      aria-label="Filtrar disponibilidade"
                      value={availabilityFilter}
                      onChange={(e) => setAvailabilityFilter(e.target.value)}
                    >
                      <option value="all">Todas as pessoas</option>
                      <option value="online">Disponíveis</option>
                      <option value="meeting">Em reunião</option>
                      <option value="away">Ausentes</option>
                      <option value="offline">Offline</option>
                    </select>
                    <span className="subtle-text">
                      {data.people.length}{" "}
                      {data.people.length === 1 ? "pessoa" : "pessoas"} no time
                    </span>
                  </div>
                  <div className="people-directory">
                    {data.people
                      .filter(
                        (person) =>
                          person.display_name
                            .toLowerCase()
                            .includes(peopleQuery.toLowerCase()) &&
                          (availabilityFilter === "all" ||
                            personStatus(person) === availabilityFilter),
                      )
                      .map((person) => (
                        <article className="person-card" key={person.id}>
                          <div className="person-card-top">
                            <PersonAvatar
                              name={person.display_name}
                              id={person.id}
                              size="large"
                            />
                            <span className="status-label">
                              <i
                                className={`presence ${personStatus(person)}`}
                              />
                              {availabilityLabels[personStatus(person)]}
                            </span>
                          </div>
                          <h2>
                            {person.display_name}
                            {person.id === userId && (
                              <span className="you-tag">você</span>
                            )}
                          </h2>
                          <p>
                            {person.role === "leader"
                              ? "Líder do time"
                              : "Membro do time"}
                            {person.timer_running ? " · Timer ativo" : ""}
                          </p>
                          <div className="person-work">
                            <span>No momento</span>
                            <strong>
                              {person.body || "Sem status de trabalho"}
                            </strong>
                          </div>
                          {person.id === userId ? (
                            <button
                              className="outline-button"
                              onClick={() => openModal("profile")}
                            >
                              <PencilSimple size={16} />
                              Editar meu perfil
                            </button>
                          ) : hub.canParticipate ? (
                            <button
                              className="outline-button"
                              disabled={hub.busy}
                              onClick={() => void openDm(person)}
                            >
                              <ChatCircleText size={17} />
                              Conversar
                            </button>
                          ) : null}
                        </article>
                      ))}
                  </div>
                  {!data.people.some(
                    (person) =>
                      person.display_name
                        .toLowerCase()
                        .includes(peopleQuery.toLowerCase()) &&
                      (availabilityFilter === "all" ||
                        personStatus(person) === availabilityFilter),
                  ) && (
                    <EmptyState
                      icon={<UsersThree size={38} />}
                      title="Nenhuma pessoa com esse filtro"
                      description="Tente outro nome ou disponibilidade."
                      action="Limpar filtros"
                      onAction={() => {
                        setPeopleQuery("");
                        setAvailabilityFilter("all");
                      }}
                    />
                  )}
                  {hub.isAdmin && (
                    <div className="admin-access-note">
                      <ShieldCheck size={20} />
                      <div>
                        <strong>Gerencie quem participa do time.</strong>
                        <p>
                          Convide pelo e-mail da pessoa e compartilhe o link. Na
                          mesma tela, você pode editar papéis e suspender acessos.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              )}
              {page === "chat" && (
                <section
                  className={`chat-layout live-chat-layout ${showChannelList ? "mobile-channel-list" : "mobile-conversation"}`}
                >
                  <aside className="channel-sidebar">
                    <div className="channel-sidebar-heading">
                      <h2>Conversas</h2>
                      {hub.canManage && hub.canParticipate ? (
                        <button
                          className="icon-button"
                          aria-label="Criar canal"
                          onClick={() => openModal("channel")}
                        >
                          <Plus size={19} />
                        </button>
                      ) : (
                        <ChatCircleText size={21} />
                      )}
                    </div>
                    <p className="list-label">Canais do time</p>
                    {data.channels
                      .filter((c) => c.kind !== "dm")
                      .map((c) => (
                        <button
                          className={`channel-button ${channelId === c.id ? "selected" : ""}`}
                          key={c.id}
                          onClick={() => {
                            setChannelId(c.id);
                            setShowChannelList(false);
                          }}
                        >
                          {c.kind === "private" ? (
                            <Lock size={16} />
                          ) : (
                            <Hash size={17} />
                          )}
                          <span>{channelName(c)}</span>
                          {data.unread[c.id] > 0 && (
                            <span className="channel-count">
                              {data.unread[c.id] > 99
                                ? "99+"
                                : data.unread[c.id]}
                            </span>
                          )}
                        </button>
                      ))}
                    {!data.channels.some((c) => c.kind !== "dm") && (
                      <p className="channel-empty-note">
                        {hub.canManage
                          ? "Crie o primeiro canal do time."
                          : "Seu time ainda não tem canais disponíveis."}
                      </p>
                    )}
                    <p className="list-label dm-label">Mensagens diretas</p>
                    {data.channels
                      .filter((c) => c.kind === "dm")
                      .map((c) => (
                        <button
                          key={c.id}
                          className={`channel-button dm-button ${channelId === c.id ? "selected" : ""}`}
                          onClick={() => {
                            setChannelId(c.id);
                            setShowChannelList(false);
                          }}
                        >
                          <PersonAvatar
                            name={channelName(c)}
                            id={
                              c.dm_user_low === userId
                                ? c.dm_user_high!
                                : c.dm_user_low!
                            }
                            size="small"
                          />
                          <span>{channelName(c)}</span>
                          {data.unread[c.id] > 0 && (
                            <span className="channel-count">
                              {data.unread[c.id]}
                            </span>
                          )}
                        </button>
                      ))}
                    <button
                      className="text-button start-dm"
                      onClick={() => {
                        setPeopleQuery("");
                        navigate("people");
                      }}
                    >
                      <Plus size={13} />
                      Conversar com alguém
                    </button>
                    <div className="channel-sidebar-note">
                      <i
                        className={`live-dot ${hub.connection === "live" ? "live" : ""}`}
                      />
                      <span>
                        {hub.currentTeam?.name}
                        <br />
                        <small>Conversas protegidas por participação</small>
                      </span>
                    </div>
                  </aside>
                  <div className="chat-main">
                    {!selectedChannel ? (
                      <EmptyState
                        icon={<ChatCircleText size={40} />}
                        title="Toda boa ideia começa com uma conversa"
                        description={
                          hub.canManage
                            ? "Crie um canal para reunir o time."
                            : "Selecione um canal ou encontre uma pessoa para conversar."
                        }
                        action={
                          hub.canManage && hub.canParticipate
                            ? "Criar canal"
                            : "Ver pessoas"
                        }
                        onAction={() =>
                          hub.canManage && hub.canParticipate
                            ? openModal("channel")
                            : navigate("people")
                        }
                      />
                    ) : (
                      <>
                        <div className="chat-head">
                          <div>
                            <button
                              className="icon-button mobile-chat-back"
                              aria-label="Voltar para canais"
                              onClick={() => setShowChannelList(true)}
                            >
                              <CaretLeft size={20} />
                            </button>
                            {selectedChannel.kind === "dm" ? (
                              <PersonAvatar
                                name={channelName(selectedChannel)}
                                id={selectedOthers?.id ?? ""}
                              />
                            ) : (
                              <span className="channel-heading-icon">
                                {selectedChannel.kind === "private" ? (
                                  <Lock size={22} />
                                ) : (
                                  <Hash size={24} />
                                )}
                              </span>
                            )}
                            <span>
                              <h2>{channelName(selectedChannel)}</h2>
                              <small>
                                {selectedChannel.kind === "dm"
                                  ? "Conversa direta"
                                  : selectedChannel.kind === "private"
                                    ? "Canal privado · somente participantes"
                                    : "Canal público do time"}
                              </small>
                            </span>
                          </div>
                          {channelMembership?.role === "moderator" &&
                            selectedChannel.kind !== "dm" && (
                              <button
                                className="icon-button"
                                aria-label="Adicionar participante ao canal"
                                onClick={() => openModal("channel-members")}
                              >
                                <UserPlus size={20} />
                              </button>
                            )}
                        </div>
                        {!channelMembership ? (
                          <EmptyState
                            icon={<Hash size={38} />}
                            title={`Entre em #${selectedChannel.name}`}
                            description="Participe do canal para ler e enviar mensagens."
                            action="Participar do canal"
                            onAction={() =>
                              void hub.mutate(
                                () =>
                                  hub.rpc("join_public_channel", {
                                    p_channel_id: channelId,
                                  }),
                                "Você entrou no canal.",
                              )
                            }
                          />
                        ) : (
                          <AdvancedConversation
                            key={channelId}
                            hub={hub}
                            channel={channel}
                            channelId={channelId}
                            moderator={channelMembership.role === "moderator"}
                            personName={personName}
                            onEdit={(message) => {
                              setEditingMessage(message);
                              openModal("message");
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
          <footer className="app-footer">
            <span>Feito para o trabalho acontecer.</span>
            <span>
              <ShieldCheck size={11} />
              Acesso com MFA · {hub.currentTeam?.name}
            </span>
          </footer>
        </main>
      </div>
      {Notice}
      {selectedEvent && (
        <HubDialog title="Detalhes do evento" onClose={() => setEventId("")}>
          <div
            className={`event-detail-symbol tone-${selectedEvent.kind === "meeting" ? "blue" : "orange"}`}
          >
            <CalendarDots size={26} />
          </div>
          <h3 className="event-detail-title">{selectedEvent.title}</h3>
          <span className="project-tag">
            {selectedEvent.kind === "meeting" ? "Reunião" : "Evento"}
          </span>
          <div className="event-detail-meta">
            <span>
              <CalendarDots size={18} />
              {new Date(selectedEvent.starts_at).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <span>
              <Clock size={18} />
              {new Date(selectedEvent.starts_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              –{" "}
              {new Date(selectedEvent.ends_at).toLocaleString("pt-BR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <small>
              Exibido em {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </small>
          </div>
          <p className="event-description">
            {selectedEvent.description || "Um espaço reservado para o time."}
          </p>
          {selectedEvent.call_url && (
            <a
              className="outline-button event-call-link"
              href={selectedEvent.call_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <VideoCamera size={17} />
              Abrir link da reunião <ArrowUpRight size={15} />
            </a>
          )}
          <div className="event-participants">
            <span>Participantes</span>
            <div>
              {data.attendees
                .filter((a) => a.event_id === selectedEvent.id)
                .map((attendee) => (
                  <span key={attendee.user_id}>
                    <PersonAvatar
                      name={personName(attendee.user_id)}
                      id={attendee.user_id}
                      size="small"
                    />
                    {personName(attendee.user_id).split(" ")[0]}
                    <small>
                      {
                        (
                          {
                            accepted: "Confirmado",
                            pending: "Pendente",
                            tentative: "Talvez",
                            declined: "Recusado",
                          } as const
                        )[attendee.response]
                      }
                    </small>
                  </span>
                ))}
            </div>
          </div>
          {hub.canParticipate && (
            <label className="live-rsvp">
              Sua presença
              <select
                disabled={hub.busy}
                value={
                  data.attendees.find(
                    (a) =>
                      a.event_id === selectedEvent.id && a.user_id === userId,
                  )?.response ?? "pending"
                }
                onChange={(e) =>
                  void hub.mutate(
                    () =>
                      hub.rpc("respond_to_event", {
                        p_event_id: selectedEvent.id,
                        p_response: e.target.value as
                          | "accepted"
                          | "declined"
                          | "tentative"
                          | "pending",
                      }),
                    "Sua resposta foi registrada.",
                  )
                }
              >
                <option value="pending">Ainda não respondi</option>
                <option value="accepted">Vou participar</option>
                <option value="tentative">Talvez</option>
                <option value="declined">Não vou participar</option>
              </select>
            </label>
          )}
          {canEditEvent && (
            <form
              className="event-invite-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const fields = new FormData(e.currentTarget);
                const id = String(fields.get("user"));
                if (id)
                  await hub.mutate(
                    () =>
                      hub.rpc("invite_event_attendee", {
                        p_event_id: selectedEvent.id,
                        p_user_id: id,
                      }),
                    "Participante adicionado ao evento.",
                  );
              }}
            >
              <label>
                Adicionar participante
                <select name="user" required defaultValue="">
                  <option value="" disabled>
                    Escolha uma pessoa
                  </option>
                  {data.people
                    .filter(
                      (p) =>
                        !data.attendees.some(
                          (a) =>
                            a.event_id === selectedEvent.id &&
                            a.user_id === p.id,
                        ),
                    )
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.display_name}
                      </option>
                    ))}
                </select>
              </label>
              <button className="outline-button" disabled={hub.busy}>
                <UserPlus size={16} />
                Convidar
              </button>
            </form>
          )}
          {canEditEvent && (
            <div className="dialog-actions event-manage-actions">
              <button
                className="text-button danger-text"
                disabled={hub.busy}
                onClick={async () => {
                  const result = await hub.mutate(
                    () =>
                      hub.rpc("cancel_event", { p_event_id: selectedEvent.id }),
                    "Evento cancelado.",
                  );
                  if (result.ok) setEventId("");
                }}
              >
                <Trash size={15} />
                Cancelar evento
              </button>
              <button
                className="outline-button"
                onClick={() => editEvent(selectedEvent)}
              >
                <PencilSimple size={16} />
                Editar
              </button>
            </div>
          )}
        </HubDialog>
      )}
      {modal === "event" && (
        <HubDialog
          title={editingEvent ? "Editar evento" : "Novo encontro"}
          onClose={() => setModal(null)}
        >
          <form className="dialog-form" onSubmit={saveEvent}>
            {formError && (
              <div className="form-alert" role="alert">
                {formError}
              </div>
            )}
            <label>
              Título
              <input
                name="title"
                required
                maxLength={200}
                autoFocus
                defaultValue={editingEvent?.title}
                placeholder="O que vamos fazer juntos?"
              />
            </label>
            <label>
              Tipo
              <select
                name="kind"
                defaultValue={editingEvent?.kind ?? "meeting"}
              >
                <option value="meeting">Reunião</option>
                <option value="event">Evento</option>
              </select>
            </label>
            <label>
              Início
              <input
                name="start"
                type="datetime-local"
                required
                defaultValue={eventStart}
              />
            </label>
            <label>
              Término
              <input
                name="end"
                type="datetime-local"
                required
                defaultValue={
                  editingEvent
                    ? toLocalInput(editingEvent.ends_at)
                    : eventStart
                      ? toLocalInput(
                          new Date(
                            new Date(eventStart).getTime() + 3600000,
                          ).toISOString(),
                        )
                      : ""
                }
              />
            </label>
            <label>
              Pauta
              <textarea
                name="description"
                rows={3}
                maxLength={10000}
                defaultValue={editingEvent?.description}
                placeholder="Contexto e assuntos para a conversa…"
              />
            </label>
            <label>
              Link da reunião (opcional)
              <input
                name="call_url"
                type="url"
                pattern="https://.*"
                maxLength={2048}
                defaultValue={editingEvent?.call_url ?? ""}
                placeholder="https://…"
              />
            </label>
            <p className="demo-note">
              Horários em {Intl.DateTimeFormat().resolvedOptions().timeZone}.
              Você poderá convidar participantes depois de salvar.
            </p>
            <div className="dialog-actions">
              <button
                className="outline-button"
                type="button"
                onClick={() => setModal(null)}
              >
                Voltar
              </button>
              <button className="primary-button" disabled={hub.busy}>
                {hub.busy ? (
                  <CircleNotch className="spinning" size={17} />
                ) : (
                  <Check size={17} />
                )}
                Salvar evento
              </button>
            </div>
          </form>
        </HubDialog>
      )}
      {modal === "time" && (
        <HubDialog
          title={editingTime ? "Editar registro" : "Adicionar horas"}
          onClose={() => setModal(null)}
        >
          <form className="dialog-form" onSubmit={saveTime}>
            {formError && (
              <div className="form-alert" role="alert">
                {formError}
              </div>
            )}
            <label>
              Atividade
              <input
                name="description"
                required
                maxLength={2000}
                defaultValue={editingTime?.description}
                placeholder="O que você fez?"
                autoFocus
              />
            </label>
            <label>
              Projeto
              <select
                name="project"
                defaultValue={editingTime?.project_id ?? projectId}
              >
                <option value="">Sem projeto</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
                {editingTime?.project_id &&
                  !data.projects.some(
                    (p) => p.id === editingTime.project_id,
                  ) && (
                    <option value={editingTime.project_id}>
                      Projeto arquivado
                    </option>
                  )}
              </select>
            </label>
            <label>
              Início
              <input
                name="start"
                type="datetime-local"
                step="1"
                required
                max={toLocalInput(new Date(now).toISOString())}
                defaultValue={
                  editingTime
                    ? toLocalInput(editingTime.started_at)
                    : toLocalInput(new Date(now - 3600000).toISOString())
                }
              />
            </label>
            <label>
              Término
              <input
                name="end"
                type="datetime-local"
                step="1"
                required
                max={toLocalInput(new Date(now).toISOString())}
                defaultValue={
                  editingTime?.ended_at
                    ? toLocalInput(editingTime.ended_at)
                    : toLocalInput(new Date(now).toISOString())
                }
              />
            </label>
            <p className="demo-note">
              O servidor calcula a duração e impede intervalos sobrepostos,
              inclusive entre times.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setModal(null)}
              >
                Voltar
              </button>
              <button className="primary-button" disabled={hub.busy}>
                {hub.busy ? (
                  <CircleNotch className="spinning" size={17} />
                ) : (
                  <Check size={17} />
                )}
                Salvar registro
              </button>
            </div>
          </form>
        </HubDialog>
      )}
      {modal === "profile" && (
        <HubDialog
          title="Seu espaço, do seu jeito"
          onClose={() => setModal(null)}
        >
          <form className="dialog-form" onSubmit={saveProfile}>
            <div className="profile-preview">
              <PersonAvatar name={currentName} id={userId} size="large" />
              <span>
                <strong>{currentName}</strong>
                <small>
                  {hub.isAdmin
                    ? "Administrador"
                    : hub.canManage
                      ? "Líder"
                      : "Membro"}
                </small>
              </span>
            </div>
            <label>
              Como podemos chamar você?
              <input
                name="name"
                required
                maxLength={80}
                defaultValue={currentName}
              />
            </label>
            <label>
              Disponibilidade
              <select name="availability" defaultValue={hub.availability}>
                <option value="online">Disponível</option>
                <option value="meeting">Em reunião</option>
                <option value="away">Ausente</option>
              </select>
            </label>
            {hub.canParticipate && (
              <label>
                No que você está trabalhando?
                <input
                  name="body"
                  maxLength={160}
                  defaultValue={profileBody}
                  placeholder="Compartilhe seu foco com o time"
                />
              </label>
            )}
            <div className="settings-info">
              <ShieldCheck size={23} />
              <div>
                <strong>Sua sessão está protegida por MFA</strong>
                <p>
                  Seu nome pode mudar aqui. Papéis e permissões são definidos
                  pelo administrador e validados no banco.
                </p>
              </div>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setModal(null)}
              >
                Voltar
              </button>
              <button className="primary-button" disabled={hub.busy}>
                <Check size={16} />
                Salvar perfil
              </button>
            </div>
          </form>
          <InstallApp />
          <OfflineSettings userId={userId} />
          <PushSettings hub={hub} />
          <div className="profile-account-actions">
            <label>
              Seu identificador<code>{userId}</code>
            </label>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(userId);
                  hub.notify("Identificador copiado.");
                } catch {
                  hub.notify("Selecione e copie o identificador acima.", true);
                }
              }}
            >
              <Copy size={15} />
              Copiar identificador
            </button>
            <button className="text-button danger-text" onClick={signOut}>
              <SignOut size={16} />
              Sair da conta
            </button>
          </div>
        </HubDialog>
      )}
      {modal === "project" && hub.canManage && (
        <HubDialog title="Novo projeto" onClose={() => setModal(null)}>
          <form className="dialog-form" onSubmit={createProject}>
            <label>
              Nome do projeto
              <input
                name="name"
                required
                maxLength={120}
                autoFocus
                placeholder="Ex.: Website institucional"
              />
            </label>
            <label>
              Descrição
              <textarea
                name="description"
                maxLength={10000}
                rows={3}
                placeholder="Um pouco de contexto para o time"
              />
            </label>
            <div className="dialog-actions">
              <button
                className="outline-button"
                type="button"
                onClick={() => setModal(null)}
              >
                Voltar
              </button>
              <button className="primary-button" disabled={hub.busy}>
                <Plus size={16} />
                Criar projeto
              </button>
            </div>
          </form>
        </HubDialog>
      )}
      {modal === "channel" && hub.canManage && hub.canParticipate && (
        <HubDialog title="Novo canal" onClose={() => setModal(null)}>
          <form className="dialog-form" onSubmit={createChannel}>
            <label>
              Nome do canal
              <input
                name="name"
                required
                maxLength={80}
                autoFocus
                placeholder="Ex.: design"
              />
            </label>
            <label>
              Visibilidade
              <select name="kind" defaultValue="public">
                <option value="public">
                  Público — pessoas do time podem participar
                </option>
                <option value="private">
                  Privado — apenas participantes adicionados
                </option>
              </select>
            </label>
            <fieldset className="member-checkboxes">
              <legend>Participantes iniciais (opcional)</legend>
              {data.people
                .filter((p) => p.id !== userId)
                .map((person) => (
                  <label key={person.id}>
                    <input name="members" type="checkbox" value={person.id} />
                    <PersonAvatar
                      name={person.display_name}
                      id={person.id}
                      size="small"
                    />
                    {person.display_name}
                  </label>
                ))}
            </fieldset>
            <div className="dialog-actions">
              <button
                className="outline-button"
                type="button"
                onClick={() => setModal(null)}
              >
                Voltar
              </button>
              <button className="primary-button" disabled={hub.busy}>
                <Plus size={16} />
                Criar canal
              </button>
            </div>
          </form>
        </HubDialog>
      )}
      {modal === "channel-members" &&
        channelMembership?.role === "moderator" &&
        selectedChannel?.kind !== "dm" && (
          <HubDialog
            title="Adicionar participante ao canal"
            onClose={() => setModal(null)}
          >
            <form
              className="dialog-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const fields = new FormData(e.currentTarget);
                const result = await hub.mutate(
                  () =>
                    hub.rpc("set_channel_member", {
                      p_channel_id: channelId,
                      p_user_id: String(fields.get("user")),
                      p_role: String(fields.get("role")) as
                        | "member"
                        | "moderator",
                    }),
                  "Participação no canal atualizada.",
                );
                if (result.ok) setModal(null);
              }}
            >
              <p className="demo-note">
                Você modera #{selectedChannel?.name}. Só é possível adicionar
                pessoas ativas neste time.
              </p>
              <label>
                Pessoa
                <select name="user" required defaultValue="">
                  <option value="" disabled>
                    Selecione uma pessoa
                  </option>
                  {data.people
                    .filter((p) => p.id !== userId)
                    .map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.display_name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Papel no canal
                <select name="role" defaultValue="member">
                  <option value="member">Participante</option>
                  <option value="moderator">Moderador</option>
                </select>
              </label>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setModal(null)}
                >
                  Voltar
                </button>
                <button className="primary-button" disabled={hub.busy}>
                  <UserPlus size={16} />
                  Adicionar
                </button>
              </div>
            </form>
          </HubDialog>
        )}
      {modal === "member" && hub.isAdmin && (
        <HubDialog title="Pessoas e convites" onClose={() => setModal(null)} wide>
          <TeamAccess hub={hub} onClose={() => setModal(null)} />
        </HubDialog>
      )}
      {modal === "team" && hub.isAdmin && (
        <HubDialog title="Novo time" onClose={() => setModal(null)}>
          <form className="dialog-form" onSubmit={createTeam}>
            <label>
              Workspace
              <select name="workspace" defaultValue={hub.workspace?.id}>
                {hub.bootstrap.workspaces
                  .filter((w) =>
                    hub.bootstrap!.workspaceMemberships.some(
                      (m) =>
                        m.workspace_id === w.id &&
                        m.is_active &&
                        m.role === "admin",
                    ),
                  )
                  .map((w) => (
                    <option value={w.id} key={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Nome do time
              <input
                name="name"
                required
                autoFocus
                maxLength={120}
                placeholder="Nome do novo time"
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setModal(null)}
              >
                Voltar
              </button>
              <button className="primary-button" disabled={hub.busy}>
                <Plus size={16} />
                Criar time
              </button>
            </div>
          </form>
        </HubDialog>
      )}
      {modal === "message" && editingMessage && (
        <HubDialog
          title={
            editingMessage.author_id === userId
              ? "Editar mensagem"
              : "Moderar mensagem"
          }
          onClose={() => setModal(null)}
        >
          {editingMessage.author_id === userId ? (
            <form
              className="dialog-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const fields = new FormData(e.currentTarget);
                const body = String(fields.get("body")).trim();
                if (!body) return;
                const result = await hub.mutate(
                  () =>
                    hub.rpc("edit_message", {
                      p_message_id: editingMessage.id,
                      p_body: body,
                    }),
                  "Mensagem atualizada.",
                );
                if (result.ok) {
                  setModal(null);
                  await channel.refresh();
                }
              }}
            >
              <label>
                Mensagem
                <textarea
                  name="body"
                  defaultValue={editingMessage.body}
                  required
                  maxLength={10000}
                  rows={5}
                  autoFocus
                />
              </label>
              <div className="dialog-actions">
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => setModal(null)}
                >
                  Voltar
                </button>
                <button className="primary-button" disabled={hub.busy}>
                  <Check size={16} />
                  Salvar
                </button>
              </div>
            </form>
          ) : (
            <p className="event-description">{editingMessage.body}</p>
          )}
          <button
            className="text-button danger-text message-delete"
            disabled={hub.busy}
            onClick={async () => {
              const result = await hub.mutate(
                () =>
                  hub.rpc("delete_message", {
                    p_message_id: editingMessage.id,
                  }),
                "Mensagem removida.",
              );
              if (result.ok) {
                setModal(null);
                await channel.refresh();
              }
            }}
          >
            <Trash size={15} />
            Remover mensagem
          </button>
        </HubDialog>
      )}
      {modal === "search" && (
        <HubDialog title="Buscar no Hub" wide onClose={() => setModal(null)}>
          <div className="search-input-wrap">
            <MagnifyingGlass size={21} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar páginas, pessoas e eventos"
              placeholder="Páginas, pessoas, eventos…"
            />
          </div>
          <div className="search-results">
            <p className="list-label">Páginas</p>
            {navigation
              .filter((n) =>
                n.label.toLowerCase().includes(search.toLowerCase()),
              )
              .map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    navigate(n.id);
                    setModal(null);
                  }}
                >
                  <n.icon size={20} />
                  <span>{n.label}</span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            <p className="list-label">Pessoas do time</p>
            {data.people
              .filter((p) =>
                p.display_name.toLowerCase().includes(search.toLowerCase()),
              )
              .slice(0, 8)
              .map((person) => (
                <button
                  key={person.id}
                  onClick={() => {
                    setPeopleQuery(person.display_name);
                    navigate("people");
                    setModal(null);
                  }}
                >
                  <PersonAvatar
                    name={person.display_name}
                    id={person.id}
                    size="small"
                  />
                  <span>{person.display_name}</span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            <p className="list-label">Eventos carregados</p>
            {data.events
              .filter((e) =>
                `${e.title} ${e.description}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .slice(0, 8)
              .map((event) => (
                <button
                  key={event.id}
                  onClick={() => {
                    setModal(null);
                    setEventId(event.id);
                  }}
                >
                  <CalendarDots size={20} />
                  <span>
                    {event.title}
                    <small>
                      {new Date(event.starts_at).toLocaleDateString("pt-BR")}
                    </small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            {search &&
              !navigation.some((n) =>
                n.label.toLowerCase().includes(search.toLowerCase()),
              ) &&
              !data.people.some((p) =>
                p.display_name.toLowerCase().includes(search.toLowerCase()),
              ) &&
              !data.events.some((e) =>
                `${e.title} ${e.description}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              ) && (
                <p className="search-empty">
                  Nenhum resultado. Tente outro termo.
                </p>
              )}
          </div>
        </HubDialog>
      )}
    </div>
  );
}
