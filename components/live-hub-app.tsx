"use client";
import { OrganizationContacts } from "./organization-contacts";
import { OrganizationAdmin } from "./organization-admin";
import { OrganizationLibrary } from "./organization-library";
import { OrganizationNotices } from "./organization-notices";
import { useOrganization } from "@/lib/organization/use-organization";
import { allowedPage } from "@/lib/organization/model";
import { WorkspaceDrawer } from "./workspace-drawer";
import { DashboardLoading, ZuluAlert, DashboardNotice, DashboardWorkspacePicker, DashboardUIProvider, ZuluForm, ZuluLabel, ZuluFieldset, ZuluLegend, ZuluButton, ZuluSelect, ZuluInput, ZuluTextArea, ZuluCheckboxField } from "./dashboard-ui";
import { WorkspaceAreaTabs } from "./workspace-area-tabs";
import { workspaceArea, workspaceAreas, pageTitles } from "@/lib/hub/navigation";
import { OpeningGreeting } from "./opening-greeting";
import { WorkspaceSettings } from "./workspace-settings";
import { HoursReport } from "./hours-report";
import { AvatarProvider, AvatarUpload } from "./profile-avatar";
import { DashboardNavIcon } from "./dashboard-nav-icon";
import { BrandMark } from "./brand";
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
  Coffee,
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
import { DesktopChrome } from "./desktop-chrome";
import { DesktopBridge } from "./desktop-bridge";
import { LiveCalls } from "./live-calls";
import { LiveIntegrations } from "./live-integrations";
import { LiveManagement } from "./live-management";
import { LiveCollaboration } from "./live-collaboration";
import { LiveBoard, type TaskInput } from "./live-board";
import { LiveCalendar } from "./live-calendar";
import { TodayOverview, TodayContext } from "./today-dashboard";
import { HomeOfficeManager } from "./home-office-manager";
import { WorkScheduleSetup } from "./work-schedule-setup";
import {
  calendarRange,
  calendarDraft,
  moveCalendarDate,
  type CalendarView,
} from "@/lib/hub/calendar";
import { LiveOnboarding } from "./live-onboarding";
import { CreateOrganizationDialog } from "./create-organization-dialog";
import { usePageTransition } from "./motion/use-page-transition";
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
  unknown: "",
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
  | "organization"
  | "message"
  | "channel-members"
  | null;
export function LiveHubApp({ userId }: { userId: string }) {
  const [now, setNow] = useState(0),
    [page, setPage] = useState<LivePage>("overview"),
    [calendarDate, setCalendarDate] = useState("2026-01-05"),
    [calendarView, setCalendarView] = useState<CalendarView>("week");
  const mainContentRef = useRef<HTMLElement>(null);
  usePageTransition(mainContentRef, page);
  const [collaborationInitialTab, setCollaborationInitialTab] = useState<
    "notes" | "notifications"
  >("notes");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("inbox") === "1") {
      setCollaborationInitialTab("notifications");
      setPage("notifications");
    }
    if (new URLSearchParams(window.location.search).get("integrations") === "1")
      setPage("integrations");
    const current = new Date();
    setNow(current.getTime());
    setCalendarDate(dayKey(current));
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
  const selectedDate = useMemo(
    () => new Date(`${calendarDate}T12:00:00`),
    [calendarDate],
  );
  const activeDay = (selectedDate.getDay() + 6) % 7;
  const monday = useMemo(() => mondayOf(selectedDate), [selectedDate]);
  const range = useMemo(
    () => calendarRange(selectedDate, calendarView),
    [selectedDate, calendarView],
  );
  const rangeStart = range.start.toISOString(),
    rangeEnd = range.end.toISOString();
  const hub = useHub(userId, rangeStart, rangeEnd, todayKey),
    data = hub.snapshot;
  const organization = useOrganization(hub);
  const canAdminister = Boolean(organization.authority && (organization.authority.owner || organization.authority.general_admin || organization.authority.team_admin || organization.authority.can_approve));
  const isAllowed = (target: LivePage) => target === "organization" ? canAdminister : allowedPage(organization.authority, target, hub.teamId);
  useEffect(() => { if (organization.authority && !isAllowed(page)) setPage("overview"); }, [organization.authority, page, hub.teamId]);
  const modulePermission = (module: string, action: string) => {
    const a=organization.authority;if(!a||a.features[module]===false)return false;
    if(a.owner)return true;const permissions=a.permissions[hub.teamId]||{};
    if(permissions[`${module}.view`]===false)return false;
    return permissions[`${module}.${action}`] ?? (action==='manage' || module==='projects'&&action==='write' ? hub.canManage : true);
  };
  const priorTeam = useRef("");
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
    [eventEnd, setEventEnd] = useState(""),
    [editingTime, setEditingTime] = useState<Row<"time_entries"> | null>(null),
    [editingMessage, setEditingMessage] = useState<Row<"messages"> | null>(
      null,
    );
  const [homeOfficeOpen, setHomeOfficeOpen] = useState(false),
    [homeOfficeFocusWeek, setHomeOfficeFocusWeek] = useState("");
  const [workScheduleOpen, setWorkScheduleOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [atBottom, setAtBottom] = useState(true),
    [showChannelList, setShowChannelList] = useState(true);
  const [channelQuery, setChannelQuery] = useState("");
  useEffect(() => setChannelQuery(""), [hub.teamId]);
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
    if (priorTeam.current && priorTeam.current !== hub.teamId) {
      setPage("overview"); setCalendarDate(todayKey); setHomeOfficeOpen(false); setWorkScheduleOpen(false); setMenuOpen(false);
    }
    priorTeam.current = hub.teamId;
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
  const pausedTimer = data.pausedTimer;
  const timerSession = activeTimer ?? pausedTimer;
  const activeSegmentSeconds = activeTimer
    ? Math.max(0, Math.floor((now - new Date(activeTimer.started_at).getTime()) / 1000))
    : 0;
  const elapsed = activeTimer
    ? Number(activeTimer.carried_seconds ?? 0) + activeSegmentSeconds
    : Number(pausedTimer?.accumulated_seconds ?? 0);
  const entries = data.entries.filter(
    (e) => e.team_id === hub.teamId && e.ended_at !== null,
  );
  const currentSunday = dateAt(currentMonday, 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const workScheduleConfigured = data.workSchedule?.setup_state === "complete";
  const runningBalanceSeconds = activeTimer?.team_id === hub.teamId
    ? Math.max(0, Math.floor((now - data.workBalanceLoadedAt) / 1000))
    : 0;
  const workBalanceFor = (start: string, end: string) => {
    const days = data.workBalance.filter(
      (entry) => entry.work_date >= start && entry.work_date <= end && entry.work_date <= todayKey,
    );
    const expectedMinutes = days.reduce((sum, entry) => sum + entry.expected_minutes, 0);
    const actualSeconds = days.reduce((sum, entry) => sum + entry.actual_seconds, 0) +
      (todayKey >= start && todayKey <= end ? runningBalanceSeconds : 0);
    return { expectedMinutes, actualSeconds, balanceMinutes: Math.round(actualSeconds / 60) - expectedMinutes };
  };
  const todayBalance = workBalanceFor(todayKey, todayKey);
  const weekBalance = workBalanceFor(dayKey(currentMonday), dayKey(currentSunday));
  const monthBalance = workBalanceFor(dayKey(monthStart), dayKey(monthEnd));
  const fullMonthTargetMinutes = data.workBalance
    .filter((entry) => entry.work_date >= dayKey(monthStart) && entry.work_date <= dayKey(monthEnd))
    .reduce((sum, entry) => sum + entry.expected_minutes, 0);
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
    if (!isAllowed(next)) { hub.notify("Esta função não está disponível para seu acesso.", true); return; }
    setMenuOpen(false);
    setPage(next === "management" ? "reports" : next === "collaboration" ? "notes" : next === "more" ? "settings" : next);
    setPopover(false);
    setSearch("");
    if (next === "chat") setShowChannelList(true);
  }
  function openModal(next: Modal) {
    setFormError("");
    setPopover(false);
    setModal(next);
  }
  function newEvent(date = selectedDate, hour = 10, endHour = hour + 1) {
    const { start, end } = calendarDraft(date, hour, endHour);
    setEventStart(toLocalInput(start.toISOString()));
    setEventEnd(toLocalInput(end.toISOString()));
    setEditingEvent(null);
    openModal("event");
  }
  function editEvent(event: Row<"events">) {
    setEditingEvent(event);
    setEventStart(toLocalInput(event.starts_at));
    setEventEnd(toLocalInput(event.ends_at));
    setEventId("");
    openModal("event");
  }
  function newTime() {
    setEditingTime(null);
    openModal("time");
  }
  function moveCalendar(direction: number) {
    setCalendarDate(
      dayKey(moveCalendarDate(selectedDate, calendarView, direction)),
    );
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
    if (pausedTimer) {
      hub.notify("Seu timer está pausado para o almoço. Retome ou encerre antes de iniciar outro.", true);
      return;
    }
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
    return await hub.mutate(
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
    if (pausedTimer) {
      await hub.mutate(
        () => hub.rpc("stop_paused_timer", {}),
        "Timer encerrado. O tempo anterior ao almoço ficou salvo.",
      );
      return;
    }
    if (!activeTimer) return;
    await hub.mutate(
      () => hub.rpc("stop_timer", { p_entry_id: activeTimer.id }),
      "Tempo registrado pelo servidor.",
    );
  }
  async function pauseTimer() {
    if (!activeTimer) return;
    await hub.mutate(
      () => hub.rpc("pause_timer", {}),
      "Timer pausado. O almoço não será contado como hora trabalhada.",
    );
  }
  async function resumeTimer() {
    if (!pausedTimer) return;
    await hub.mutate(
      () => hub.rpc("resume_timer", {}),
      "Timer retomado. Bom trabalho!",
    );
  }
  async function toggleFocusTimer() {
    if (pausedTimer) return resumeTimer();
    if (activeTimer) return pauseTimer();
    return startTimer();
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
      setCalendarDate(dayKey(start));
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
  async function createOrganization(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget);
    const result = await hub.mutate(async () => {
      const created = await hub.rpc("create_organization", {
        p_name: String(fields.get("name") ?? "").trim(),
        p_team_name: String(fields.get("team") ?? "").trim(),
      }) as { team_id: string };
      hub.setTeamId(created.team_id);
      return created;
    }, "Organização criada. Seu novo espaço está pronto.");
    if (result.ok) { setModal(null); setPage("overview"); }
  }
  const Notice = hub.notice ? (page === "overview" ? <DashboardNotice message={hub.notice.message} error={hub.notice.error} onClose={hub.dismissNotice} /> : (
    <div
      role={hub.notice.error ? "alert" : "status"}
      className={`toast ${hub.notice.error ? "toast-error" : ""}`}
    >
      <CheckCircle size={19} />
      {hub.notice.message}
      <ZuluButton aria-label="Dispensar aviso" onClick={hub.dismissNotice}>
        <X size={16} />
      </ZuluButton>
    </div>
  )) : null;
  if ((hub.bootLoading || !now) && page === "overview") return <DashboardLoading />;
  if (hub.bootLoading || !now)
    return (
      <div className="loading-screen">
        <BrandMark size={34} />
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
        <ZuluButton className="text-button" onClick={signOut}>
          Sair da conta <SignOut size={15} />
        </ZuluButton>
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
  const currentArea = workspaceArea(page);
  const currentPage = { label: pageTitles[page] ?? navigation.find(item => item.id === page)?.label ?? "ZULU" };
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
    <DashboardUIProvider enabled>
    <AvatarProvider hub={hub}>
    <div className={`app-shell live-app workspace-inset ${page === "overview" ? "dashboard-redesign" : ""}`} data-menu-open={menuOpen}>
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>

      <aside className="rail" aria-label="Navegação principal">
        <ZuluButton
          className="brand"
          aria-label="ZULU — início"
          onClick={() => navigate("overview")}
        >
          <BrandMark size={44} />

        </ZuluButton>
        <nav>
          {workspaceAreas.filter(area => area.id !== "settings" && area.tabs.some(([id]) => isAllowed(id))).map(area => (
            <ZuluButton key={area.id} className={`rail-button ${currentArea.id === area.id ? "active" : ""}`} onClick={() => navigate(area.tabs.find(([id]) => isAllowed(id))![0])} aria-label={area.label} aria-current={currentArea.id === area.id ? "page" : undefined}>
              <DashboardNavIcon name={area.icon} />
              {area.id === "conversations" && totalUnread > 0 && <span className="nav-unread" aria-label={`${totalUnread} mensagens não lidas`} />}
            </ZuluButton>
          ))}
        </nav>
        <div className="rail-bottom"><ZuluButton className={`rail-button ${currentArea.id === "settings" ? "active" : ""}`} aria-label="Configurações" onClick={() => navigate("settings")}><DashboardNavIcon name="settings" /></ZuluButton></div>
      </aside>
<WorkspaceDrawer isAllowed={isAllowed} open={menuOpen} onOpenChange={setMenuOpen} onPage={navigate} />      <DesktopBridge hub={hub} />
      <div className="app-content">
        <DesktopChrome><header className="topbar"><ZuluButton className="mobile-navigation-toggle" aria-label="Abrir navegação" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><SquaresFour size={21} /></ZuluButton>
          <div className="workspace-wrap">
            <DashboardWorkspacePicker workspace={hub.workspace?.name ?? "Meu workspace"} teamId={hub.teamId}
              teams={hub.bootstrap.teams.map(team => ({ id: team.id, label: team.name, organization: hub.bootstrap!.workspaces.find(workspace => workspace.id === team.workspace_id)?.name ?? "" }))}
              role={hub.isAdmin ? "Administrador" : hub.canManage ? "Líder" : "Membro"} canManage={hub.isAdmin}
              onTeam={id => { if (id === hub.teamId) return; hub.setTeamId(id); setPage("overview"); setSearch(""); setChannelId(""); setEventId(""); setEditingEvent(null); setModal(null); setDraft(""); setProjectId(""); setCalendarDate(todayKey); }} onNewTeam={() => openModal("team")}
              onSignOut={() => void signOut()}
              onNewOrganization={() => openModal("organization")}
            />
          </div>
          <div className="topbar-right">
            <ZuluButton
              className="search-button"
              aria-label="Buscar no ZULU"
              onClick={() => openModal("search")}
            >
              <MagnifyingGlass size={17} />
              <span>Buscar</span>

            </ZuluButton>
            <NotificationBell
              hub={hub}
              onOpenChannel={id => {
                navigate("chat");
                setChannelId(id);
                setShowChannelList(false);
              }}
              onOpen={() => {
                setCollaborationInitialTab("notifications");
                navigate("notifications");
              }}
            />
            <ZuluButton
              className="top-avatar"
              aria-label="Meu perfil"
              onClick={() => openModal("profile")}
            >
              <PersonAvatar name={currentName} id={userId} />
            </ZuluButton>
          </div>
        </header></DesktopChrome>
        <main ref={mainContentRef} id="main-content" data-motion-page={page} className={`main-content ${page === "overview" ? "today-page" : ""}`}>
          <WorkspaceAreaTabs page={page} onPage={navigate} isAllowed={isAllowed} />
          {organization.error&&<div className="org-notice-banner" role="alert"><p>{organization.error}</p><ZuluButton onClick={()=>void organization.refresh()}>Conferir acesso novamente</ZuluButton></div>}
          <OrganizationNotices hub={hub} authority={organization.authority} command={organization.command} />
          <div className="page-heading">
            <div>
              <h1>
                {page === "overview" ? <OpeningGreeting name={currentName.split(" ")[0]} userId={userId} /> : currentArea.label}
                <span className="heading-period">.</span>
              </h1>
              <p>
                {page === "overview"
                  ? `Seu dia, em um só lugar. ${today.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}.`
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
              {timerSession && page !== "overview" && (
                <ZuluButton
                  className={`running-pill ${pausedTimer ? "is-paused" : ""}`}
                  onClick={() => navigate("hours")}
                  aria-label={`Abrir timer${pausedTimer ? " pausado" : " ativo"}: ${clock(elapsed)}`}
                >
                  <i className={`live-dot ${activeTimer ? "live" : ""}`} />
                  <span>{clock(elapsed)}</span>
                  {pausedTimer ? <Coffee size={16} /> : <TimerIcon size={16} />}
                </ZuluButton>
              )}
              {page === "hours" && hub.canParticipate ? (
                <ZuluButton
                  className="primary-button"
                  disabled={hub.busy}
                  onClick={newTime}
                >
                  <Plus size={17} />
                  Adicionar horas
                </ZuluButton>
              ) : page === "people" && hub.isAdmin ? (
                <ZuluButton
                  className="primary-button"
                  onClick={() => openModal("member")}
                >
                  <UserPlus size={17} />
                  Convidar pessoa
                </ZuluButton>
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
          {hub.canParticipate && !hub.teamLoading && !data.workSchedule && (
            <section className="work-schedule-nudge" aria-label="Configurar jornada">
              <div>
                <strong>Defina sua jornada</strong>
                <p>Informe seus dias e horas para acompanhar saldo diário, semanal e mensal.</p>
              </div>
              <div>
                <ZuluButton className="text-button" onClick={() => setWorkScheduleOpen(true)}>
                  Configurar agora
                </ZuluButton>
                <ZuluButton
                  className="text-button muted"
                  disabled={hub.busy}
                  onClick={() => void hub.mutate(
                    () => hub.rpc("skip_work_schedule_setup", { p_team_id: hub.teamId }),
                    "Tudo certo. Você pode configurar sua jornada em Minhas horas quando quiser.",
                  )}
                >
                  Agora não
                </ZuluButton>
              </div>
            </section>
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
                  className={`dashboard-layout ${page === "calendar" ? "calendar-page-layout" : "today-layout"}`}
                >
                  <div className="dashboard-main">
                    {page === "overview" && (
                      <TodayOverview
                        showHours={isAllowed("hours")} showCalendar={isAllowed("calendar")}
                        key={hub.teamId}
                        timer={{
                          state: activeTimer
                            ? "running"
                            : pausedTimer
                              ? "lunch"
                              : "idle",
                          elapsed,
                          pausedAt: pausedTimer?.paused_at,
                          projectId: timerSession?.project_id ?? projectId,
                          description: timerSession?.description || description,
                          project: timerSession
                            ? timerSession.team_id === hub.teamId
                              ? projectName(timerSession.project_id)
                              : "Timer de outro time"
                            : projectId
                              ? projectName(projectId)
                              : "",
                        }}
                        busy={hub.busy}
                        canParticipate={hub.canParticipate}
                        configured={workScheduleConfigured}
                        today={todayBalance}
                        week={weekBalance}
                        month={monthBalance}
                        monthTargetMinutes={fullMonthTargetMinutes}
                        todayKey={todayKey}
                        homeOffice={data.upcomingHomeOffice}
                        homeOfficeError={data.homeOfficeSummaryError}
                        projects={data.projects}
                        activities={[
                          ...data.tasks.filter(task => !task.archived_at && task.status !== "done" && (!task.project_id || data.projects.some(project => project.id === task.project_id))).slice(0, 3).map(task => ({id: task.id, description: task.title, projectId: task.project_id ?? "", kind: "task" as const})),
                          ...recentWork.map(entry => ({id: entry.id, description: entry.description, projectId: entry.project_id ?? "", kind: "recent" as const})),
                        ]}
                        onCreateProject={modulePermission("projects","write") ? async name => {
                          const result = await hub.mutate(() => hub.rpc("save_project", {
                            p_team_id: hub.teamId, p_name: name, p_description: "",
                          }), "Projeto criado.");
                          return result.ok ? { id: result.value, name } : null;
                        } : undefined}
                        onStartActivity={async input => {
                          if (activeTimer || pausedTimer) {hub.notify("Encerre o timer atual antes de iniciar outro.", true); return false;}
                          const result = input.taskId
                            ? await hub.mutate(() => hub.rpc("start_task_timer", {p_task_id: input.taskId!}), "Timer iniciado na tarefa.")
                            : await startTimer(input.description, input.projectId);
                          if (result?.ok) {setDescription(input.description);setProjectId(input.projectId);}
                          return Boolean(result?.ok);
                        }}
                        onToggleTimer={() => void toggleFocusTimer()}
                        onStopTimer={() => void stopTimer()}
                        onHours={() => navigate("hours")}
                        onSchedule={() => setWorkScheduleOpen(true)}
                        onHomeOffice={() => {
                          setHomeOfficeFocusWeek("");
                          setHomeOfficeOpen(true);
                        }}
                        onRetry={() => void hub.refreshTeam()}
                      />
                    )}
                    {isAllowed("calendar") && <LiveCalendar
                      hub={hub}
                      monday={monday}
                      date={selectedDate}
                      onDate={(date) => setCalendarDate(dayKey(date))}
                      today={today}
                      day={activeDay}
                      view={calendarView}
                      onView={setCalendarView}
                      onDay={(day) =>
                        setCalendarDate(dayKey(dateAt(monday, day)))
                      }
                      onMove={moveCalendar}
                      onToday={() => {
                        setCalendarDate(dayKey(today));
                      }}
                      onNew={newEvent}
                      onSelect={(event) => setEventId(event.id)}
                      onHomeOffice={(entry) => {
                        setHomeOfficeFocusWeek(entry.week_start);
                        setHomeOfficeOpen(true);
                      }}
                      full={page === "calendar"}
                      compact={page === "overview"}
                    />}
                  </div>
                  {page === "overview" ? (
                    <TodayContext
                      showCalendar={isAllowed("calendar")} showPeople={isAllowed("people")} showChat={isAllowed("chat")} showHours={isAllowed("hours")}
                      events={todayEvents.filter(
                        (event) => new Date(event.ends_at).getTime() > now,
                      )}
                      people={data.people}
                      presence={hub.presenceReady}
                      online={hub.onlinePeople}
                      unread={totalUnread}
                      currentUserId={userId}
                      currentActivity={timerSession?.team_id === hub.teamId ? [pausedTimer ? `Almoço · ${timerSession.description}` : timerSession.description || "Trabalhando agora", data.projects.find(project => project.id === timerSession.project_id)?.name].filter(Boolean).join(" · ") : ""}
                      activities={hub.onlineActivities}
                      inbox={data.inbox}
                      unreadByPerson={Object.fromEntries(data.channels.filter(channel => channel.kind === "dm" && !channel.archived_at && (channel.dm_user_low === userId || channel.dm_user_high === userId) && data.channelMemberships.some(member => member.channel_id === channel.id && member.user_id === userId)).map(channel => [channel.dm_user_low === userId ? channel.dm_user_high! : channel.dm_user_low!, data.unread[channel.id] ?? 0]))}
                      inboxError={data.inboxError}
                      onMessage={id => {setChannelId(id);navigate("chat");setShowChannelList(false);}}
                      recent={recentWork.map((entry) => ({
                        id: entry.id,
                        description: entry.description,
                        project: projectName(entry.project_id),
                      }))}
                      busy={hub.busy}
                      canRestart={!timerSession && hub.canParticipate}
                      onEvent={(event) => setEventId(event.id)}
                      onCalendar={() => navigate("calendar")}
                      onPerson={(person) => {
                        setPeopleQuery(person.display_name);
                        navigate("people");
                      }}
                      onPeople={() => {
                        setPeopleQuery("");
                        navigate("people");
                      }}
                      onRestart={(id) => {
                        const entry = recentWork.find(
                          (entry) => entry.id === id,
                        );
                        if (entry)
                          void startTimer(
                            entry.description,
                            entry.project_id ?? "",
                          );
                      }}
                      onChat={() => navigate("chat")}
                    />
                  ) : (
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
                                : ""}
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
                              <ZuluButton
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
                                    {person.timer_running
                                      ? " · Timer ativo"
                                      : ""}
                                  </small>
                                </span>
                              </ZuluButton>
                            ))}
                          {data.people.length <= 1 && (
                            <p className="resource-note">
                              Seu time começa com você. Convide as próximas
                              pessoas para esse espaço.
                            </p>
                          )}
                        </div>
                        <ZuluButton
                          className="text-button sidebar-link"
                          onClick={() => {
                            setPeopleQuery("");
                            navigate("people");
                          }}
                        >
                          Ver todo o time <ArrowUpRight size={14} />
                        </ZuluButton>
                      </section>
                      <section className="hours-summary">
                        <div className="section-heading">
                          <h2>Seu tempo esta semana</h2>
                          <TimerIcon size={16} />
                        </div>
                        <div className="weekly-total">
                          {shortDuration(weekBalance.actualSeconds)}
                          <span>registradas</span>
                        </div>
                        <div
                          className="week-bars"
                          aria-label="Suas horas por dia nesta semana"
                        >
                          {[0, 1, 2, 3, 4].map((day) => {
                            const key = dayKey(dateAt(currentMonday, day)),
                              seconds =
                                Number(
                                  data.workBalance.find(
                                    (item) => item.work_date === key,
                                  )?.actual_seconds ?? 0,
                                ) +
                                (key === todayKey ? runningBalanceSeconds : 0);
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
                          <strong>
                            {shortDuration(todayBalance.actualSeconds)}
                          </strong>
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
                        <ZuluButton
                          className="outline-button"
                          onClick={() => navigate("chat")}
                        >
                          Abrir conversas <ArrowUpRight size={15} />
                        </ZuluButton>
                      </section>
                      <div className="sidebar-footnote">
                        <span className="tiny-brand">ZULU</span>
                        <span>Um espaço. Seu time.</span>
                      </div>
                    </aside>
                  )}
                </div>
              )}
              {page === "organization-chat" && isAllowed("organization-chat") && <OrganizationContacts key={hub.workspace?.id} hub={hub} canCall={isAllowed("calls")} />}
              {page === "organization" && organization.authority && canAdminister && <OrganizationAdmin key={hub.workspace?.id} hub={hub} authority={organization.authority} command={organization.command} />}
              {page === "library" && isAllowed("library") && <OrganizationLibrary key={hub.workspace?.id} hub={hub} />}
              {page === "calls" && <LiveCalls key={hub.teamId} hub={hub} />}
              {page === "integrations" && (
                <LiveIntegrations key={hub.teamId} hub={hub} />
              )}
              {(["goals", "clients", "shifts", "absences", "dates"] as string[]).includes(page) && <LiveManagement key={`${hub.teamId}:${page}`} hub={{...hub,canManage:modulePermission(page==="goals"?"hours":"management","manage")}} initialTab={page as "goals" | "clients" | "shifts" | "absences" | "dates"} embedded />}
              {page === "reports" && <HoursReport key={hub.teamId} hub={{...hub,isAdmin:hub.isAdmin || Boolean(organization.authority?.permissions[hub.teamId]?.["reports.manage"])}} />}
              {page === "settings" && <WorkspaceSettings hub={hub} organization={organization} onProfile={() => openModal("profile")} onMembers={() => navigate("organization")} onIntegrations={() => navigate("integrations")} onSignOut={signOut} />}
              {(["notes", "standups", "meetings", "notifications"] as string[]).includes(page) && (
                <LiveCollaboration
                  key={`${hub.teamId}:${page}`}
                  hub={{...hub,canManage:modulePermission(page==="standups"?"checkins":"documents","manage")}}
                  initialTab={page as "notes" | "standups" | "meetings" | "notifications"} embedded
                  onOpenChannel={(id) => {
                    navigate("chat");
                    setChannelId(id);
                    setShowChannelList(false);
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
                      <ZuluButton key={item.id} onClick={() => navigate(item.id)}>
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
                      </ZuluButton>
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
                  canParticipate={hub.canParticipate && (Boolean(organization.authority?.owner) || organization.authority?.permissions[hub.teamId]?.["tasks.write"] !== false)}
                  canManage={Boolean(organization.authority?.owner || (organization.authority?.permissions[hub.teamId]?.["tasks.manage"] ?? hub.canManage))}
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
                  onMove={async (task, status, placement) => {
                    const result = await hub.mutate(
                      () =>
                        hub.rpc(placement ? "position_task" : "move_task", {
                          ...(placement ? {p_before_id: placement.beforeId, p_after_id: placement.afterId} : {}),
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
                    if (pausedTimer)
                      return "Seu timer está pausado para o almoço. Retome ou encerre antes de iniciar outro.";
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
                      <h2>{pausedTimer ? "Seu timer está pausado" : "No que você está trabalhando?"}</h2>
                      <p>{pausedTimer ? "O tempo parado para o almoço não entra no seu saldo." : "Uma coisa de cada vez. O tempo a gente cuida."}</p>
                    </div>
                    <ZuluForm
                      className="timer-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void (pausedTimer ? resumeTimer() : activeTimer ? pauseTimer() : startTimer());
                      }}
                    >
                      <ZuluLabel>
                        Descrição
                        <ZuluInput
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Descreva sua próxima atividade"
                          maxLength={2000}
                          required={!timerSession}
                          disabled={!!timerSession || !hub.canParticipate}
                        />
                      </ZuluLabel>
                      <ZuluLabel>
                        Projeto
                        <ZuluSelect
                          value={projectId}
                          onValueChange={(value) => setProjectId(value)}
                          disabled={!!timerSession || !hub.canParticipate}
                        >
                          <option value="">Sem projeto</option>
                          {data.projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </ZuluSelect>
                      </ZuluLabel>
                      <div className="inline-timer">
                        <strong>{clock(elapsed)}</strong>
                        <ZuluButton
                          className={`primary-button ${activeTimer ? "pause-button" : pausedTimer ? "resume-button" : ""}`}
                          disabled={
                            hub.busy || (!timerSession && !hub.canParticipate)
                          }
                        >
                          {hub.busy ? (
                            <CircleNotch className="spinning" size={17} />
                          ) : pausedTimer ? (
                            <Play size={16} weight="fill" />
                          ) : activeTimer ? (
                            <Coffee size={16} />
                          ) : (
                            <Play size={16} weight="fill" />
                          )}
                          {pausedTimer ? "Retomar" : activeTimer ? "Pausa para almoço" : "Iniciar"}
                        </ZuluButton>
                        {timerSession && (
                          <ZuluButton
                            className="timer-end-button"
                            type="button"
                            disabled={hub.busy}
                            onClick={() => void stopTimer()}
                          >
                            <Stop size={15} weight="fill" />
                            Encerrar
                          </ZuluButton>
                        )}
                      </div>
                    </ZuluForm>
                    {timerSession && (
                      <p className={`running-description ${pausedTimer ? "is-paused" : ""}`}>
                        <i className={`live-dot ${activeTimer ? "live" : ""}`} />
                        {timerSession.description ||
                          "Trabalho em andamento"} ·{" "}
                        {timerSession.team_id === hub.teamId
                          ? projectName(timerSession.project_id)
                          : "Timer de outro time"}
                        {pausedTimer ? " · pausado para almoço" : ""}
                      </p>
                    )}
                    {hub.canManage && (
                      <ZuluButton
                        className="text-button project-create-link"
                        onClick={() => openModal("project")}
                      >
                        <Plus size={14} />
                        Criar projeto
                      </ZuluButton>
                    )}
                  </section>
                  <section className="hours-balance" aria-label="Saldo de horas">
                    <div className="hours-balance-heading">
                      <div>
                        <h2>Seu saldo de horas</h2>
                        <p>O tempo registrado é comparado com sua jornada prevista.</p>
                      </div>
                      <ZuluButton className="text-button" onClick={() => setWorkScheduleOpen(true)}>
                        {workScheduleConfigured ? "Editar jornada" : "Configurar jornada"}
                      </ZuluButton>
                    </div>
                    <div className="hours-balance-grid">
                      {[
                        { label: "Hoje", balance: todayBalance, actual: todayBalance.actualSeconds, target: todayBalance.expectedMinutes },
                        { label: "Esta semana", balance: weekBalance, actual: weekBalance.actualSeconds, target: weekBalance.expectedMinutes },
                        { label: "Este mês", balance: monthBalance, actual: monthBalance.actualSeconds, target: monthBalance.expectedMinutes },
                      ].map((item) => (
                        <div className="hours-balance-item" key={item.label}>
                          <span>{item.label}</span>
                          <strong className={
                            !workScheduleConfigured ? "" : item.balance.balanceMinutes > 0 ? "positive" : item.balance.balanceMinutes < 0 ? "negative" : "balanced"
                          }>
                            {!workScheduleConfigured
                              ? shortDuration(item.actual)
                              : item.balance.expectedMinutes === 0 && item.actual === 0
                                ? "Folga prevista"
                                : item.balance.balanceMinutes === 0
                                  ? "Em dia"
                                  : `${item.balance.balanceMinutes > 0 ? "+" : "−"}${shortDuration(Math.abs(item.balance.balanceMinutes) * 60)}`}
                          </strong>
                          <small>
                            {workScheduleConfigured
                              ? `${shortDuration(item.actual)} registradas · ${shortDuration(item.target * 60)} previstas`
                              : "horas registradas"}
                          </small>
                        </div>
                      ))}
                    </div>
                    {workScheduleConfigured && (
                      <p className="hours-month-target">Meta prevista para o mês: {shortDuration(fullMonthTargetMinutes * 60)} · feriados do time e ausências aprovadas já são descontados.</p>
                    )}
                  </section>
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
                                <ZuluButton
                                  className="icon-button edit-time-button"
                                  aria-label={`Editar registro: ${entry.description || "sem descrição"}`}
                                  onClick={() => {
                                    setEditingTime(entry);
                                    openModal("time");
                                  }}
                                >
                                  <PencilSimple size={14} />
                                </ZuluButton>
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
                      <ZuluLabel className="sr-only" htmlFor="people-query">
                        Buscar pessoas
                      </ZuluLabel>
                      <ZuluInput
                        id="people-query"
                        value={peopleQuery}
                        onChange={(e) => setPeopleQuery(e.target.value)}
                        placeholder="Encontrar alguém no time…"
                      />
                    </div>
                    <ZuluSelect
                      aria-label="Filtrar disponibilidade"
                      value={availabilityFilter}
                      onValueChange={(value) => setAvailabilityFilter(value)}
                    >
                      <option value="all">Todas as pessoas</option>
                      <option value="online">Disponíveis</option>
                      <option value="meeting">Em reunião</option>
                      <option value="away">Ausentes</option>
                      <option value="offline">Offline</option>
                    </ZuluSelect>
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
                            {organization.authority?.job_titles?.[person.id] || ""}
                            {person.timer_running ? " · Timer ativo" : ""}
                          </p>
                          <div className="person-work">
                            <span>No momento</span>
                            <strong>
                              {person.body || "Sem status de trabalho"}
                            </strong>
                          </div>
                          {person.id === userId ? (
                            <ZuluButton
                              className="outline-button"
                              onClick={() => openModal("profile")}
                            >
                              <PencilSimple size={16} />
                              Editar meu perfil
                            </ZuluButton>
                          ) : hub.canParticipate ? (
                            <ZuluButton
                              className="outline-button"
                              disabled={hub.busy}
                              onClick={() => void openDm(person)}
                            >
                              <ChatCircleText size={17} />
                              Conversar
                            </ZuluButton>
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
                          mesma tela, você pode editar papéis e suspender
                          acessos.
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
                        <ZuluButton
                          className="icon-button"
                          aria-label="Criar canal"
                          onClick={() => openModal("channel")}
                        >
                          <Plus size={19} />
                        </ZuluButton>
                      ) : (
                        <ChatCircleText size={21} />
                      )}
                    </div>
                    <ZuluInput aria-label="Buscar conversas" className="channel-search" placeholder="Buscar conversa…" value={channelQuery} onChange={e => setChannelQuery(e.target.value)} />
                    <p className="list-label">Canais do time</p>
                    {data.channels
                      .filter((c) => c.kind !== "dm" && channelName(c).toLocaleLowerCase("pt-BR").includes(channelQuery.toLocaleLowerCase("pt-BR")))
                      .map((c) => (
                        <ZuluButton
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
                        </ZuluButton>
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
                      .filter((c) => c.kind === "dm" && channelName(c).toLocaleLowerCase("pt-BR").includes(channelQuery.toLocaleLowerCase("pt-BR")))
                      .map((c) => (
                        <ZuluButton
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
                        </ZuluButton>
                      ))}
                    {channelQuery && !data.channels.some(c => channelName(c).toLocaleLowerCase("pt-BR").includes(channelQuery.toLocaleLowerCase("pt-BR"))) && <p className="channel-empty-note" role="status">Nenhuma conversa encontrada.</p>}
                    <ZuluButton
                      className="text-button start-dm"
                      onClick={() => {
                        setPeopleQuery("");
                        navigate("people");
                      }}
                    >
                      <Plus size={13} />
                      Conversar com alguém
                    </ZuluButton>
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
                            <ZuluButton
                              className="icon-button mobile-chat-back"
                              aria-label="Voltar para canais"
                              onClick={() => setShowChannelList(true)}
                            >
                              <CaretLeft size={20} />
                            </ZuluButton>
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
                              <ZuluButton
                                className="icon-button"
                                aria-label="Adicionar participante ao canal"
                                onClick={() => openModal("channel-members")}
                              >
                                <UserPlus size={20} />
                              </ZuluButton>
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

        </main>
      </div>
      {Notice}
      <HomeOfficeManager
        hub={hub}
        open={homeOfficeOpen}
        focusWeek={homeOfficeFocusWeek}
        onClose={() => setHomeOfficeOpen(false)}
      />
      <WorkScheduleSetup
        hub={hub}
        open={workScheduleOpen}
        onClose={() => setWorkScheduleOpen(false)}
      />
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
            <ZuluLabel className="live-rsvp">
              Sua presença
              <ZuluSelect
                disabled={hub.busy}
                value={
                  data.attendees.find(
                    (a) =>
                      a.event_id === selectedEvent.id && a.user_id === userId,
                  )?.response ?? "pending"
                }
                onValueChange={(value) => void hub.mutate(
                    () =>
                      hub.rpc("respond_to_event", {
                        p_event_id: selectedEvent.id,
                        p_response: value as
                          | "accepted"
                          | "declined"
                          | "tentative"
                          | "pending",
                      }),
                    "Sua resposta foi registrada.",
                  )}
              >
                <option value="pending">Ainda não respondi</option>
                <option value="accepted">Vou participar</option>
                <option value="tentative">Talvez</option>
                <option value="declined">Não vou participar</option>
              </ZuluSelect>
            </ZuluLabel>
          )}
          {canEditEvent && (
            <ZuluForm
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
              <ZuluLabel>
                Adicionar participante
                <ZuluSelect name="user" required defaultValue="">
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
                </ZuluSelect>
              </ZuluLabel>
              <ZuluButton className="outline-button" disabled={hub.busy}>
                <UserPlus size={16} />
                Convidar
              </ZuluButton>
            </ZuluForm>
          )}
          {canEditEvent && (
            <div className="dialog-actions event-manage-actions">
              <ZuluButton
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
              </ZuluButton>
              <ZuluButton
                className="outline-button"
                onClick={() => editEvent(selectedEvent)}
              >
                <PencilSimple size={16} />
                Editar
              </ZuluButton>
            </div>
          )}
        </HubDialog>
      )}
      {modal === "event" && (
        <HubDialog
          title={editingEvent ? "Editar evento" : "Novo encontro"}
          onClose={() => setModal(null)}
        >
          <ZuluForm className="dialog-form" onSubmit={saveEvent}>
            {formError && (
              <ZuluAlert className="form-alert" role="alert">
                {formError}
              </ZuluAlert>
            )}
            <ZuluLabel>
              Título
              <ZuluInput
                name="title"
                required
                maxLength={200}
                autoFocus
                defaultValue={editingEvent?.title}
                placeholder="O que vamos fazer juntos?"
              />
            </ZuluLabel>
            <ZuluLabel>
              Tipo
              <ZuluSelect
                name="kind"
                defaultValue={editingEvent?.kind ?? "meeting"}
              >
                <option value="meeting">Reunião</option>
                <option value="event">Evento</option>
              </ZuluSelect>
            </ZuluLabel>
            <ZuluLabel>
              Início
              <ZuluInput
                name="start"
                type="datetime-local"
                required
                defaultValue={eventStart}
              />
            </ZuluLabel>
            <ZuluLabel>
              Término
              <ZuluInput
                name="end"
                type="datetime-local"
                required
                defaultValue={eventEnd}
              />
            </ZuluLabel>
            <ZuluLabel>
              Pauta
              <ZuluTextArea
                name="description"
                rows={3}
                maxLength={10000}
                defaultValue={editingEvent?.description}
                placeholder="Contexto e assuntos para a conversa…"
              />
            </ZuluLabel>
            <ZuluLabel>
              Link da reunião (opcional)
              <ZuluInput
                name="call_url"
                type="url"
                pattern="https://.*"
                maxLength={2048}
                defaultValue={editingEvent?.call_url ?? ""}
                placeholder="https://…"
              />
            </ZuluLabel>
            <p className="demo-note">
              Horários em {Intl.DateTimeFormat().resolvedOptions().timeZone}.
              Você poderá convidar participantes depois de salvar.
            </p>
            <div className="dialog-actions">
              <ZuluButton
                className="outline-button"
                type="button"
                onClick={() => setModal(null)}
              >
                Voltar
              </ZuluButton>
              <ZuluButton className="primary-button" disabled={hub.busy}>
                {hub.busy ? (
                  <CircleNotch className="spinning" size={17} />
                ) : (
                  <Check size={17} />
                )}
                Salvar evento
              </ZuluButton>
            </div>
          </ZuluForm>
        </HubDialog>
      )}
      {modal === "time" && (
        <HubDialog
          title={editingTime ? "Editar registro" : "Adicionar horas"}
          onClose={() => setModal(null)}
        >
          <ZuluForm className="dialog-form" onSubmit={saveTime}>
            {formError && (
              <ZuluAlert className="form-alert" role="alert">
                {formError}
              </ZuluAlert>
            )}
            <ZuluLabel>
              Atividade
              <ZuluInput
                name="description"
                required
                maxLength={2000}
                defaultValue={editingTime?.description}
                placeholder="O que você fez?"
                autoFocus
              />
            </ZuluLabel>
            <ZuluLabel>
              Projeto
              <ZuluSelect
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
              </ZuluSelect>
            </ZuluLabel>
            <ZuluLabel>
              Início
              <ZuluInput
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
            </ZuluLabel>
            <ZuluLabel>
              Término
              <ZuluInput
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
            </ZuluLabel>
            <p className="demo-note">
              O servidor calcula a duração e impede intervalos sobrepostos,
              inclusive entre times.
            </p>
            <div className="dialog-actions">
              <ZuluButton
                type="button"
                className="outline-button"
                onClick={() => setModal(null)}
              >
                Voltar
              </ZuluButton>
              <ZuluButton className="primary-button" disabled={hub.busy}>
                {hub.busy ? (
                  <CircleNotch className="spinning" size={17} />
                ) : (
                  <Check size={17} />
                )}
                Salvar registro
              </ZuluButton>
            </div>
          </ZuluForm>
        </HubDialog>
      )}
      {modal === "profile" && (
        <HubDialog
          title="Seu espaço, do seu jeito"
          onClose={() => setModal(null)}
        >
          <ZuluForm className="dialog-form" onSubmit={saveProfile}>
            <div className="profile-preview">
              <PersonAvatar name={currentName} id={userId} size="large" />
              <span>
                <strong>{currentName}</strong>
                <small>
                  {organization.authority?.job_titles?.[userId] || ""}
                </small>
              </span>
            </div>
            <AvatarUpload hub={hub} />
            <ZuluLabel>
              Como podemos chamar você?
              <ZuluInput
                name="name"
                required
                maxLength={80}
                defaultValue={currentName}
              />
            </ZuluLabel>
            <ZuluLabel>
              Disponibilidade
              <ZuluSelect name="availability" defaultValue={hub.availability}>
                <option value="online">Disponível</option>
                <option value="meeting">Em reunião</option>
                <option value="away">Ausente</option>
              </ZuluSelect>
            </ZuluLabel>
            {hub.canParticipate && (
              <ZuluLabel>
                No que você está trabalhando?
                <ZuluInput
                  name="body"
                  maxLength={160}
                  defaultValue={profileBody}
                  placeholder="Compartilhe seu foco com o time"
                />
              </ZuluLabel>
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
              <ZuluButton
                type="button"
                className="outline-button"
                onClick={() => setModal(null)}
              >
                Voltar
              </ZuluButton>
              <ZuluButton className="primary-button" disabled={hub.busy}>
                <Check size={16} />
                Salvar perfil
              </ZuluButton>
            </div>
          </ZuluForm>
          <ZuluButton className="outline-button" onClick={() => { setModal(null); navigate("settings"); }}>Abrir configurações</ZuluButton>
          <div className="profile-account-actions">
            <ZuluLabel>
              Seu identificador<code>{userId}</code>
            </ZuluLabel>
            <ZuluButton
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
            </ZuluButton>
            <ZuluButton className="text-button danger-text" onClick={signOut}>
              <SignOut size={16} />
              Sair da conta
            </ZuluButton>
          </div>
        </HubDialog>
      )}
      {modal === "project" && hub.canManage && (
        <HubDialog title="Novo projeto" onClose={() => setModal(null)}>
          <ZuluForm className="dialog-form" onSubmit={createProject}>
            <ZuluLabel>
              Nome do projeto
              <ZuluInput
                name="name"
                required
                maxLength={120}
                autoFocus
                placeholder="Ex.: Website institucional"
              />
            </ZuluLabel>
            <ZuluLabel>
              Descrição
              <ZuluTextArea
                name="description"
                maxLength={10000}
                rows={3}
                placeholder="Um pouco de contexto para o time"
              />
            </ZuluLabel>
            <div className="dialog-actions">
              <ZuluButton
                className="outline-button"
                type="button"
                onClick={() => setModal(null)}
              >
                Voltar
              </ZuluButton>
              <ZuluButton className="primary-button" disabled={hub.busy}>
                <Plus size={16} />
                Criar projeto
              </ZuluButton>
            </div>
          </ZuluForm>
        </HubDialog>
      )}
      {modal === "channel" && hub.canManage && hub.canParticipate && (
        <HubDialog title="Novo canal" onClose={() => setModal(null)}>
          <ZuluForm className="dialog-form" onSubmit={createChannel}>
            <ZuluLabel>
              Nome do canal
              <ZuluInput
                name="name"
                required
                maxLength={80}
                autoFocus
                placeholder="Ex.: design"
              />
            </ZuluLabel>
            <ZuluLabel>
              Visibilidade
              <ZuluSelect name="kind" defaultValue="public">
                <option value="public">
                  Público — pessoas do time podem participar
                </option>
                <option value="private">
                  Privado — apenas participantes adicionados
                </option>
              </ZuluSelect>
            </ZuluLabel>
            <ZuluFieldset className="member-checkboxes">
              <ZuluLegend>Participantes iniciais (opcional)</ZuluLegend>
              {data.people
                .filter((p) => p.id !== userId)
                .map((person) => (
                  <ZuluCheckboxField key={person.id} name="members" value={person.id} aria-label={person.display_name}>
                    <PersonAvatar
                      name={person.display_name}
                      id={person.id}
                      size="small"
                    />
                    {person.display_name}
                  </ZuluCheckboxField>
                ))}
            </ZuluFieldset>
            <div className="dialog-actions">
              <ZuluButton
                className="outline-button"
                type="button"
                onClick={() => setModal(null)}
              >
                Voltar
              </ZuluButton>
              <ZuluButton className="primary-button" disabled={hub.busy}>
                <Plus size={16} />
                Criar canal
              </ZuluButton>
            </div>
          </ZuluForm>
        </HubDialog>
      )}
      {modal === "channel-members" &&
        channelMembership?.role === "moderator" &&
        selectedChannel?.kind !== "dm" && (
          <HubDialog
            title="Adicionar participante ao canal"
            onClose={() => setModal(null)}
          >
            <ZuluForm
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
              <ZuluLabel>
                Pessoa
                <ZuluSelect name="user" required defaultValue="">
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
                </ZuluSelect>
              </ZuluLabel>
              <ZuluLabel>
                Papel no canal
                <ZuluSelect name="role" defaultValue="member">
                  <option value="member">Participante</option>
                  <option value="moderator">Moderador</option>
                </ZuluSelect>
              </ZuluLabel>
              <div className="dialog-actions">
                <ZuluButton
                  type="button"
                  className="outline-button"
                  onClick={() => setModal(null)}
                >
                  Voltar
                </ZuluButton>
                <ZuluButton className="primary-button" disabled={hub.busy}>
                  <UserPlus size={16} />
                  Adicionar
                </ZuluButton>
              </div>
            </ZuluForm>
          </HubDialog>
        )}
      {modal === "member" && hub.isAdmin && (
        <HubDialog
          title="Pessoas e convites"
          onClose={() => setModal(null)}
          wide
        >
          <TeamAccess hub={hub} onClose={() => setModal(null)} />
        </HubDialog>
      )}
      {modal === "organization" && (
        <CreateOrganizationDialog busy={hub.busy} onSubmit={createOrganization} onClose={() => setModal(null)} />
      )}
      {modal === "team" && hub.isAdmin && (
        <HubDialog title="Novo time" onClose={() => setModal(null)}>
          <ZuluForm className="dialog-form" onSubmit={createTeam}>
            <ZuluLabel>
              Workspace
              <ZuluSelect name="workspace" defaultValue={hub.workspace?.id}>
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
              </ZuluSelect>
            </ZuluLabel>
            <ZuluLabel>
              Nome do time
              <ZuluInput
                name="name"
                required
                autoFocus
                maxLength={120}
                placeholder="Nome do novo time"
              />
            </ZuluLabel>
            <div className="dialog-actions">
              <ZuluButton
                type="button"
                className="outline-button"
                onClick={() => setModal(null)}
              >
                Voltar
              </ZuluButton>
              <ZuluButton className="primary-button" disabled={hub.busy}>
                <Plus size={16} />
                Criar time
              </ZuluButton>
            </div>
          </ZuluForm>
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
            <ZuluForm
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
              <ZuluLabel>
                Mensagem
                <ZuluTextArea
                  name="body"
                  defaultValue={editingMessage.body}
                  required
                  maxLength={10000}
                  rows={5}
                  autoFocus
                />
              </ZuluLabel>
              <div className="dialog-actions">
                <ZuluButton
                  type="button"
                  className="outline-button"
                  onClick={() => setModal(null)}
                >
                  Voltar
                </ZuluButton>
                <ZuluButton className="primary-button" disabled={hub.busy}>
                  <Check size={16} />
                  Salvar
                </ZuluButton>
              </div>
            </ZuluForm>
          ) : (
            <p className="event-description">{editingMessage.body}</p>
          )}
          <ZuluButton
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
          </ZuluButton>
        </HubDialog>
      )}
      {modal === "search" && (
        <HubDialog title="Buscar no ZULU" wide onClose={() => setModal(null)}>
          <div className="search-input-wrap">
            <MagnifyingGlass size={21} />
            <ZuluInput
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
                <ZuluButton
                  key={n.id}
                  onClick={() => {
                    navigate(n.id);
                    setModal(null);
                  }}
                >
                  <n.icon size={20} />
                  <span>{n.label}</span>
                  <ArrowUpRight size={16} />
                </ZuluButton>
              ))}
            <p className="list-label">Pessoas do time</p>
            {data.people
              .filter((p) =>
                p.display_name.toLowerCase().includes(search.toLowerCase()),
              )
              .slice(0, 8)
              .map((person) => (
                <ZuluButton
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
                </ZuluButton>
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
                <ZuluButton
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
                </ZuluButton>
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
    </AvatarProvider>
    </DashboardUIProvider>
  );
}
