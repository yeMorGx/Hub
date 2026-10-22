"use client";
import { useEffect, useRef, useState } from "react";
import {
  ZuluForm,
  ZuluLabel,
  ZuluInput,
  ZuluSelect,
  ZuluButton,
} from "./dashboard-ui";
import { Card, Chip, ProgressBar, Spinner } from "@heroui/react";
import AnimatedGradient from "./animated-gradient";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDots,
  ChatCircleText,
  CheckCircle,
  Clock,
  Coffee,
  House,
  Play,
  Plus,
  Stop,
  X,
} from "@phosphor-icons/react";
import type {
  HomeOfficeEntry,
  InboxPreview,
  Person,
  Row,
} from "@/lib/hub/types";
import { clock, shortDuration } from "@/lib/hub/dates";
import {
  homeOfficeSummary,
  balanceCaption,
  type JourneyBalance,
} from "@/lib/hub/dashboard";
import { PersonAvatar } from "./hub-ui";

export type ActivityChoice = {
  id: string;
  description: string;
  projectId: string;
  kind: "task" | "recent";
};
export type ActivityInput = {
  description: string;
  projectId: string;
  taskId?: string;
};
export type TodayOverviewProps = {
  timer: {
    state: "idle" | "running" | "lunch";
    elapsed: number;
    description: string;
    project: string;
    projectId?: string;
    pausedAt?: string;
  };
  busy: boolean;
  canParticipate: boolean;
  configured: boolean;
  today: JourneyBalance;
  week: JourneyBalance;
  month: JourneyBalance;
  monthTargetMinutes: number;
  todayKey: string;
  homeOffice: HomeOfficeEntry[];
  homeOfficeError: boolean;
  projects: { id: string; name: string }[];
  activities: ActivityChoice[];
  onCreateProject?: (name: string) => Promise<{ id: string; name: string } | null>;
  onStartActivity: (input: ActivityInput) => Promise<boolean>;
  onToggleTimer: () => void;
  onStopTimer: () => void;
  onHours: () => void;
  onSchedule: () => void;
  onHomeOffice: () => void;
  onRetry: () => void;
};

const TIMER_GRADIENT = { preset: "Prism" } as const;
const WORKING_GRADIENT = { preset: "Lava" } as const;

export function TodayOverview(props: TodayOverviewProps) {
  const { timer, today, week, month, configured, busy } = props;
  const [choosing, setChoosing] = useState(false);
  const [activity, setActivity] = useState("");
  const [project, setProject] = useState("");
  const [taskId, setTaskId] = useState<string>();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [addingProject, setAddingProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [createdProjects, setCreatedProjects] = useState<{ id: string; name: string }[]>([]);
  const [lunchNow, setLunchNow] = useState(0);
  const projectNameRef = useRef<HTMLInputElement>(null);
  const projectSaveLock = useRef(false);
  const projectOptions = [...props.projects, ...createdProjects.filter(item => !props.projects.some(existing => existing.id === item.id))];
  const activityRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (addingProject) projectNameRef.current?.focus(); }, [addingProject]);
  useEffect(() => {
    if (timer.state !== "lunch") return;
    setLunchNow(Date.now());
    const interval = setInterval(() => setLunchNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer.state, timer.pausedAt]);
  const lunchStart = timer.pausedAt ? Date.parse(timer.pausedAt) : NaN;
  const lunchSeconds = Number.isFinite(lunchStart) && lunchNow ? Math.max(0, Math.floor((lunchNow - lunchStart) / 1000)) : 0;
  function closeProjectCreator() {
    setAddingProject(false);
    setProjectError("");
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("#today-activity-picker .select__trigger")?.focus());
  }
  async function saveNewProject() {
    if (!props.onCreateProject || projectSaveLock.current || busy || !projectName.trim()) return;
    projectSaveLock.current = true;
    setSavingProject(true);
    setProjectError("");
    try {
      const created = await props.onCreateProject(projectName.trim());
      if (!created) { setProjectError("Não foi possível criar o projeto. Tente novamente."); return; }
      setCreatedProjects(items => [...items.filter(item => item.id !== created.id), created]);
      setProject(created.id);
      setTaskId(undefined);
      closeProjectCreator();
      setProjectName("");
    } catch { setProjectError("Não foi possível criar o projeto. Tente novamente."); }
    finally { projectSaveLock.current = false; setSavingProject(false); }
  }
  useEffect(() => {
    if (choosing) activityRef.current?.focus();
  }, [choosing]);
  useEffect(() => {
    if (timer.state !== "idle") setChoosing(false);
  }, [timer.state]);
  const office = homeOfficeSummary(props.homeOffice, props.todayKey);
  const progress =
    today.expectedMinutes > 0
      ? Math.min(
          100,
          (today.actualSeconds / (today.expectedMinutes * 60)) * 100,
        )
      : 0;
  const remaining = Math.max(
    0,
    today.expectedMinutes * 60 - today.actualSeconds,
  );
  const status =
    timer.state === "running"
      ? "Em andamento"
      : timer.state === "lunch"
        ? "Pausa para almoço"
        : "Pronto para começar";
  return (
    <>
      <section
        className={`today-workspace timer-${timer.state}`}
        aria-label="Timer e jornada"
      >
        <Card className="today-focus">
          <div className="today-prism" aria-hidden="true">
            <AnimatedGradient
              config={TIMER_GRADIENT}
              active={timer.state !== "running"}
            />
            <AnimatedGradient
              config={WORKING_GRADIENT}
              active={timer.state === "running"}
              className="today-lava"
            />
          </div>
          <Card.Header className="today-section-heading">
            <Card.Title>Seu tempo, hoje</Card.Title>
            <Chip className={`today-timer-status ${timer.state}`} size="sm">
              <i />
              {status}
            </Chip>
          </Card.Header>
          <div
            className="today-clock"
            role="timer"
            aria-label={`Tempo da atividade: ${clock(timer.elapsed)}`}
          >
            {clock(timer.elapsed)}
          </div>
          <div className="today-activity">
            <strong>{timer.description || "Qual é o próximo passo?"}</strong>
            <span>
              {timer.project ||
                "Escolha uma atividade para registrar seu tempo."}
            </span>
          </div>
          <div className="today-timer-actions">
            <ZuluButton
              className="today-timer-primary"
              disabled={
                busy || (timer.state === "idle" && !props.canParticipate)
              }
              aria-expanded={timer.state === "idle" ? choosing : undefined}
              aria-controls={
                timer.state === "idle" ? "today-activity-picker" : undefined
              }
              onClick={() => {
                if (timer.state !== "idle") {
                  props.onToggleTimer();
                  return;
                }
                setActivity(timer.description);
                setProject(timer.projectId ?? "");
                setTaskId(undefined);
                setStartError("");
                setChoosing(!choosing);
              }}
            >
              {busy ? (
                <Spinner size="sm" aria-label="Atualizando timer" />
              ) : timer.state === "running" ? (
                <Coffee size={18} />
              ) : (
                <Play size={17} weight="fill" />
              )}
              {timer.state === "running"
                ? "Pausar para almoço"
                : timer.state === "lunch"
                  ? "Retomar trabalho"
                  : timer.description
                    ? "Iniciar timer"
                    : "Escolher atividade"}
            </ZuluButton>
            {timer.state !== "idle" && (
              <ZuluButton
                className="today-timer-stop"
                disabled={busy}
                onClick={props.onStopTimer}
              >
                <Stop size={15} />
                Encerrar e salvar
              </ZuluButton>
            )}
          </div>
          {choosing && timer.state === "idle" && (
            <section
              className="today-activity-picker"
              id="today-activity-picker"
              aria-label="Escolher atividade"
              onKeyDown={(event) => {
                if (event.key === "Escape" && !starting) {
                  setChoosing(false);
                  event.currentTarget
                    .closest(".today-focus")
                    ?.querySelector<HTMLButtonElement>(".today-timer-primary")
                    ?.focus();
                }
              }}
            >
              <div className="today-picker-heading">
                <strong>No que você vai trabalhar?</strong>
                <ZuluButton
                  type="button"
                  className="today-link"
                  aria-label="Fechar escolha de atividade"
                  disabled={starting}
                  onClick={() => {
                    setChoosing(false);
                    document
                      .querySelector<HTMLButtonElement>(".today-timer-primary")
                      ?.focus();
                  }}
                >
                  <X size={17} />
                </ZuluButton>
              </div>
              <ZuluForm
                className="today-activity-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (starting || busy || addingProject || !activity.trim()) return;
                  setStarting(true);
                  setStartError("");
                  try {
                    if (
                      await props.onStartActivity({
                        description: activity.trim(),
                        projectId: project,
                        taskId,
                      })
                    )
                      setChoosing(false);
                    else
                      setStartError(
                        "Não foi possível iniciar. Tente novamente.",
                      );
                  } catch {
                    setStartError("Não foi possível iniciar. Tente novamente.");
                  } finally {
                    setStarting(false);
                  }
                }}
              >
                <ZuluLabel>
                  Atividade
                  <ZuluInput
                    ref={activityRef}
                    name="activity"
                    aria-label="Atividade"
                    value={activity}
                    maxLength={500}
                    required
                    disabled={starting || busy}
                    placeholder="O que você vai fazer?"
                    onChange={(event) => {
                      setActivity(event.target.value);
                      setTaskId(undefined);
                    }}
                  />
                </ZuluLabel>
                <ZuluLabel>
                  Projeto
                  <ZuluSelect
                    name="project"
                    aria-label="Projeto da atividade"
                    value={project}
                    onValueChange={(value) => {
                      setProject(value);
                      setTaskId(undefined);
                    }}
                    disabled={starting || busy || savingProject}
                    onAddNew={props.onCreateProject ? () => { setAddingProject(true); setProjectError(""); } : undefined}
                    addNewLabel="Adicionar novo projeto"
                  >
                    <option value="">Sem projeto</option>
                    {projectOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </ZuluSelect>
                </ZuluLabel>
                {addingProject && (
                  <div className="today-new-project">
                    <ZuluLabel>
                      Nome do novo projeto
                      <ZuluInput ref={projectNameRef} aria-label="Nome do novo projeto" value={projectName} maxLength={120} disabled={savingProject || busy} placeholder="Ex.: Identidade visual" onChange={event => setProjectName(event.target.value)} onKeyDown={event => {
                        if (event.key === "Enter") { event.preventDefault(); void saveNewProject(); }
                        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!savingProject) closeProjectCreator(); }
                      }} />
                    </ZuluLabel>
                    <div className="today-new-project-actions">
                      <ZuluButton type="button" disabled={savingProject || busy || !projectName.trim()} onClick={() => void saveNewProject()}>
                        {savingProject ? <Spinner size="sm" aria-label="Criando projeto" /> : <Plus size={16} />} Criar projeto
                      </ZuluButton>
                      <ZuluButton type="button" disabled={savingProject} onClick={closeProjectCreator}>Cancelar</ZuluButton>
                    </div>
                    {projectError && <p role="alert">{projectError}</p>}
                  </div>
                )}
                {props.activities.length > 0 && (
                  <div
                    className="today-activity-suggestions"
                    aria-label="Tarefas e atividades recentes"
                  >
                    {props.activities.slice(0, 5).map((item) => (
                      <ZuluButton
                        key={item.kind + item.id}
                        type="button"
                        disabled={starting || busy}
                        aria-pressed={
                          taskId
                            ? taskId === item.id
                            : activity === item.description &&
                              project === item.projectId
                        }
                        onClick={() => {
                          setActivity(item.description);
                          setProject(item.projectId);
                          setTaskId(item.kind === "task" ? item.id : undefined);
                        }}
                      >
                        <span>{item.description}</span>
                        <small>
                          {item.kind === "task" ? "Tarefa" : "Recente"}
                        </small>
                      </ZuluButton>
                    ))}
                  </div>
                )}
                {startError && <p role="alert">{startError}</p>}
                <ZuluButton
                  type="submit"
                  className="primary-button"
                  disabled={starting || busy || addingProject || !props.canParticipate}
                >
                  {starting ? (
                    <Spinner size="sm" aria-label="Iniciando atividade" />
                  ) : (
                    <Play size={15} weight="fill" />
                  )}
                  Iniciar atividade
                </ZuluButton>
              </ZuluForm>
            </section>
          )}
          {timer.state === "lunch" && (
            <div className="today-lunch-timer">
              <Coffee size={18} aria-hidden="true" />
              <div>
                <span>Tempo de almoço</span>
                <strong role="timer" aria-label="Duração do almoço">{clock(lunchSeconds)}</strong>
              </div>
              <small>{Number.isFinite(lunchStart) ? `Desde ${new Date(lunchStart).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ` : ""}Não conta como trabalho</small>
            </div>
          )}
        </Card>
        <Card className="today-journey">
          <Card.Header className="today-section-heading">
            <Card.Title>Sua jornada</Card.Title>
            <ZuluButton
              className="today-link"
              onClick={props.onHours}
              aria-label="Ver detalhes da jornada"
            >
              <ArrowUpRight size={18} />
            </ZuluButton>
          </Card.Header>
          <div className="today-journey-metrics">
            <div className="today-hours">
              <span>Trabalhadas hoje</span>
              <strong>{shortDuration(today.actualSeconds)}</strong>
              <small>
                {configured
                  ? `de ${shortDuration(today.expectedMinutes * 60)} previstas`
                  : "Jornada ainda não configurada"}
              </small>
            </div>
            {configured && (
              <dl className="today-balances">
                {[
                  { label: "Saldo da semana", value: week },
                  { label: "Saldo do mês", value: month },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd
                      className={
                        value.balanceMinutes > 0
                          ? "positive"
                          : value.balanceMinutes < 0
                            ? "negative"
                            : ""
                      }
                    >
                      {value.balanceMinutes === 0
                        ? "Em dia"
                        : shortDuration(Math.abs(value.balanceMinutes) * 60)}
                      {value.balanceMinutes !== 0 && (
                        <span className="today-balance-caption">
                          {balanceCaption(value.balanceMinutes)}
                        </span>
                      )}
                    </dd>
                    <small>
                      {shortDuration(value.actualSeconds)} feitas ·{" "}
                      {shortDuration(value.expectedMinutes * 60)} previstas até
                      hoje
                    </small>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {configured ? (
            <>
              {today.expectedMinutes > 0 && (
                <ProgressBar
                  className="today-progress"
                  value={progress}
                  aria-label="Jornada de hoje"
                  aria-valuetext={`${shortDuration(today.actualSeconds)} de ${shortDuration(today.expectedMinutes * 60)}`}
                >
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
              )}
              <p className="today-balance-basis">
                Os saldos incluem a meta de hoje, mesmo com o dia em andamento.
              </p>
              <p className="today-hours-note">
                {today.expectedMinutes === 0
                  ? "Sem jornada prevista para hoje."
                  : remaining > 0
                    ? `Faltam ${shortDuration(remaining)} para completar o dia.`
                    : "Jornada de hoje cumprida."}
              </p>
              <ZuluButton
                className="today-link today-schedule-link"
                onClick={props.onSchedule}
              >
                Meta do mês: {shortDuration(props.monthTargetMinutes * 60)}
                <ArrowUpRight size={13} />
              </ZuluButton>
            </>
          ) : (
            <div className="today-schedule-empty">
              <p>
                Defina seus dias e horários para acompanhar metas e banco de
                horas.
              </p>
              <ZuluButton className="today-link" onClick={props.onSchedule}>
                Configurar minha jornada
                <ArrowRight size={15} />
              </ZuluButton>
            </div>
          )}
        </Card>
      </section>
      <Card
        role="region"
        className="today-home-office"
        aria-label="Resumo de home office"
      >
        <Card.Header className="today-office-title">
          <House size={21} />
          <Card.Title>Home office</Card.Title>
        </Card.Header>
        {props.homeOfficeError ? (
          <div className="today-office-error">
            <p>Não foi possível carregar a escala.</p>
            <ZuluButton
              className="today-link"
              disabled={busy}
              onClick={props.onRetry}
            >
              Tentar novamente
            </ZuluButton>
          </div>
        ) : (
          <>
            <div className="today-office-person">
              {office.today[0] && (
                <PersonAvatar
                  name={office.today[0].display_name ?? "Pessoa do time"}
                  id={office.today[0].user_id ?? ""}
                  size="small"
                />
              )}
              <div>
                <span>Hoje</span>
                <strong
                  title={
                    office.holidayWeek?.entry_label ??
                    office.holiday?.entry_label ??
                    undefined
                  }
                >
                  {office.holidayWeek
                    ? "Semana sem home office · feriado"
                    : office.holiday
                      ? `Feriado · ${office.holiday.entry_label}`
                      : office.today.length
                        ? office.today
                            .map((entry) => entry.display_name)
                            .join(", ")
                        : "Sem home office na escala"}
                </strong>
              </div>
            </div>
            <div className="today-office-next">
              <span>Próximo na escala</span>
              <strong>
                {office.next.length
                  ? office.next.map((entry) => entry.display_name).join(", ")
                  : "Sem atribuições nas próximas 6 semanas"}
              </strong>
              {office.next[0] && (
                <small>
                  {new Date(
                    `${office.next[0].scheduled_on}T12:00:00`,
                  ).toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </small>
              )}
            </div>
          </>
        )}
        <ZuluButton
          className="today-link today-office-link"
          onClick={props.onHomeOffice}
        >
          Ver escala
          <ArrowUpRight size={15} />
        </ZuluButton>
      </Card>
    </>
  );
}

export type TodayContextProps = {
  events: Row<"events">[];
  people: Person[];
  presence: "connecting" | "live" | "unavailable";
  online: Record<string, string>;
  unread: number;
  currentUserId: string;
  currentActivity: string;
  activities: Record<string, string>;
  inbox: InboxPreview[];
  inboxError: boolean;
  onMessage: (channelId: string) => void;
  recent: { id: string; description: string; project: string }[];
  busy: boolean;
  canRestart: boolean;
  onEvent: (event: Row<"events">) => void;
  onCalendar: () => void;
  onPerson: (person: Person) => void;
  onPeople: () => void;
  onRestart: (id: string) => void;
  onChat: () => void;
};
const statuses: Record<string, string> = {
  online: "Disponível",
  meeting: "Em reunião",
  away: "Ausente",
  offline: "Offline",
  unknown: "",
};

export function TodayContext(props: TodayContextProps) {
  const onlineCount = props.people.filter(
    (person) => props.online[person.id],
  ).length;
  const people = [...props.people].sort(
    (a, b) =>
      Number(b.id === props.currentUserId) -
      Number(a.id === props.currentUserId),
  );
  return (
    <aside
      className="today-context"
      aria-label="Seu time e próximos compromissos"
    >
      <Card className="today-meetings-card">
        <Card.Header className="today-section-heading">
          <Card.Title>Encontros de hoje</Card.Title>
          <CalendarDots size={18} />
        </Card.Header>
        {props.events.length ? (
          <div className="today-meetings">
            {props.events.slice(0, 3).map((event) => (
              <ZuluButton
                key={event.id}
                className="today-meeting"
                onClick={() => props.onEvent(event)}
              >
                <span className="today-meeting-time">
                  {new Date(event.starts_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <small>
                    {new Date(event.ends_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </span>
                <span>
                  <strong>{event.title}</strong>
                  <small>
                    {event.kind === "meeting" ? "Reunião" : "Evento"}
                  </small>
                </span>
                <ArrowUpRight size={15} />
              </ZuluButton>
            ))}
          </div>
        ) : (
          <p className="today-context-empty">
            <CheckCircle size={18} />
            Nenhum compromisso pela frente hoje.
          </p>
        )}
        <ZuluButton
          className="today-link today-context-link"
          onClick={props.onCalendar}
        >
          Abrir calendário
          <ArrowRight size={15} />
        </ZuluButton>
      </Card>
      <Card className="today-people-card">
        <Card.Header className="today-section-heading">
          <Card.Title>Por aqui agora</Card.Title>
          <span className="today-online">
            {props.presence === "live" ? `${onlineCount} online` : ""}
          </span>
        </Card.Header>
        <div className="today-team-list">
          {people.slice(0, 4).map((person) => {
            const status =
              props.presence === "live"
                ? (props.online[person.id] ?? "offline")
                : "unknown";
            const working =
              person.id === props.currentUserId
                ? props.currentActivity
                : props.activities[person.id];
            return (
              <ZuluButton
                key={person.id}
                className="today-person"
                onClick={() => props.onPerson(person)}
              >
                <PersonAvatar
                  name={person.display_name}
                  id={person.id}
                  presence={status === "unknown" ? undefined : status}
                />
                <span>
                  <strong>
                    {person.display_name}
                    {person.id === props.currentUserId && <em> · Você</em>}
                  </strong>
                  <small>
                    {working
                      ? working
                      : person.id !== props.currentUserId &&
                          person.timer_running
                        ? "Trabalhando agora"
                        : person.body || statuses[status] || statuses.unknown}
                  </small>
                </span>
              </ZuluButton>
            );
          })}
        </div>
        {props.inbox.length > 0 && (
          <div className="today-inbox" aria-label="Mensagens diretas não lidas">
            {props.inbox.slice(0, 3).map((message) => {
              const sender = props.people.find(
                (person) => person.id === message.personId,
              );
              return (
                <ZuluButton
                  key={message.channelId}
                  className="today-inbox-message"
                  onClick={() => props.onMessage(message.channelId)}
                >
                  <ChatCircleText size={18} />
                  <span>
                    <strong>
                      {sender?.display_name ?? "Pessoa do time"}
                      <small>
                        {message.unread}{" "}
                        {message.unread === 1 ? "nova" : "novas"}
                      </small>
                    </strong>
                    <span>{message.body}</span>
                  </span>
                  <ArrowUpRight size={14} />
                </ZuluButton>
              );
            })}
          </div>
        )}
        {props.inboxError && (
          <p className="today-context-empty">
            Não foi possível atualizar as prévias de mensagens. Abra Conversas
            para conferir.
          </p>
        )}
        {!props.people.length && (
          <p className="today-context-empty">
            As pessoas do time aparecerão aqui.
          </p>
        )}
        <ZuluButton
          className="today-link today-context-link"
          onClick={props.onPeople}
        >
          Ver todo o time
          <ArrowRight size={15} />
        </ZuluButton>
      </Card>
      {props.recent.length > 0 && (
        <Card className="today-recent-card">
          <Card.Header className="today-section-heading">
            <Card.Title>Retomar atividade</Card.Title>
            <Clock size={17} />
          </Card.Header>
          <div className="today-recent-list">
            {props.recent.slice(0, 2).map((entry) => (
              <ZuluButton
                className="today-recent"
                key={entry.id}
                disabled={props.busy || !props.canRestart}
                onClick={() => props.onRestart(entry.id)}
              >
                <Play size={16} />
                <span>
                  <strong>
                    {entry.description || "Trabalho sem descrição"}
                  </strong>
                  <small>{entry.project}</small>
                </span>
              </ZuluButton>
            ))}
          </div>
        </Card>
      )}
      <ZuluButton className="today-chat" onClick={props.onChat}>
        <ChatCircleText size={21} />
        <span>
          <strong>Conversas do time</strong>
          <small>
            {props.unread
              ? `${props.unread} ${props.unread === 1 ? "mensagem não lida" : "mensagens não lidas"}`
              : "Você está em dia."}
          </small>
        </span>
        <ArrowUpRight size={17} />
      </ZuluButton>
    </aside>
  );
}
