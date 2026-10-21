"use client";
import { ZuluButton } from "./dashboard-ui";
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
  Stop,
  CircleNotch,
} from "@phosphor-icons/react";
import type { HomeOfficeEntry, Person, Row } from "@/lib/hub/types";
import { clock, shortDuration } from "@/lib/hub/dates";
import { homeOfficeSummary, type JourneyBalance } from "@/lib/hub/dashboard";
import { PersonAvatar } from "./hub-ui";

export type TodayOverviewProps = {
  timer: {
    state: "idle" | "running" | "lunch";
    elapsed: number;
    description: string;
    project: string;
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
  onToggleTimer: () => void;
  onStopTimer: () => void;
  onHours: () => void;
  onSchedule: () => void;
  onHomeOffice: () => void;
  onRetry: () => void;
};

function signedBalance(minutes: number) {
  return minutes === 0
    ? "Em dia"
    : `${minutes > 0 ? "+" : "−"}${shortDuration(Math.abs(minutes) * 60)}`;
}

const TIMER_GRADIENT = { preset: "Prism" } as const;
const WORKING_GRADIENT = { preset: "Lava" } as const;

export function TodayOverview(props: TodayOverviewProps) {
  const { timer, today, week, month, configured, busy } = props;
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
              onClick={props.onToggleTimer}
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
          {timer.state === "lunch" && (
            <p className="today-lunch-note">
              O almoço não entra nas horas. Retome quando voltar.
            </p>
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
                      {signedBalance(value.balanceMinutes)}
                    </dd>
                    <small>previsto até hoje</small>
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
  unknown: "Presença indisponível",
};

export function TodayContext(props: TodayContextProps) {
  const onlineCount = props.people.filter(
    (person) => props.online[person.id],
  ).length;
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
            {props.presence === "live"
              ? `${onlineCount} online`
              : props.presence === "connecting"
                ? "Conectando…"
                : "Indisponível"}
          </span>
        </Card.Header>
        <div className="today-team-list">
          {props.people.slice(0, 4).map((person) => {
            const status =
              props.presence === "live"
                ? (props.online[person.id] ?? "offline")
                : "unknown";
            return (
              <ZuluButton
                key={person.id}
                className="today-person"
                onClick={() => props.onPerson(person)}
              >
                <PersonAvatar
                  name={person.display_name}
                  id={person.id}
                  presence={status}
                />
                <span>
                  <strong>{person.display_name}</strong>
                  <small>
                    {person.body || statuses[status] || statuses.unknown}
                  </small>
                </span>
              </ZuluButton>
            );
          })}
        </div>
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
