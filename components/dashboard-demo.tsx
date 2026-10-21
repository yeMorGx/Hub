"use client";
import { BrandMark } from "./brand";
// Public, in-memory preview. Shared dashboard components; no Supabase client or credentials.
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDots,
  ChatCircleText,
  Columns,
  DotsThree,
  GearSix,
  Plus,
  SquaresFour,
  Timer,
  UsersThree,
} from "@phosphor-icons/react";
import { TodayContext, TodayOverview } from "./today-dashboard";
import { LiveCalendar } from "./live-calendar";
import { HubDialog, PersonAvatar } from "./hub-ui";
import { createDemoBackend } from "@/lib/hub/demo-backend";
import { dateAt, dayKey, mondayOf } from "@/lib/hub/dates";
import { moveCalendarDate, type CalendarView } from "@/lib/hub/calendar";
import type { HomeOfficeEntry, Row } from "@/lib/hub/types";

export function DashboardDemo() {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(new Date("2026-10-21T12:00:00"));
  const [date, setDate] = useState(today);
  const [view, setView] = useState<CalendarView>("week");
  const [scenario, setScenario] = useState("running");
  const [timer, setTimer] = useState<"idle" | "running" | "lunch">("running");
  const [elapsed, setElapsed] = useState(5082);
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState("");
  useEffect(() => {
    const current = new Date();
    setToday(current);
    setDate(current);
    setReady(true);
    if (window.matchMedia("(max-width:520px)").matches) setView("day");
  }, []);
  useEffect(() => {
    if (timer !== "running") return;
    const interval = setInterval(
      () => setElapsed((seconds) => seconds + 1),
      1000,
    );
    return () => clearInterval(interval);
  }, [timer]);
  const hub = useMemo(() => {
    const { hub } = createDemoBackend();
    const monday = mondayOf(today);
    const base = hub.snapshot.events[0];
    const at = (day: number, hour: number) => {
      const time = dateAt(monday, day);
      time.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
      return time.toISOString();
    };
    hub.snapshot.events = [
      {
        ...base,
        id: "demo-review",
        title: "Revisão de produto",
        starts_at: at(0, 10),
        ends_at: at(0, 11),
        kind: "meeting",
      },
      {
        ...base,
        id: "demo-design",
        title: "Alinhamento de design",
        starts_at: at(1, 9.5),
        ends_at: at(1, 10.5),
        kind: "meeting",
      },
      {
        ...base,
        id: "demo-team",
        title: "Planejamento do time",
        starts_at: at((today.getDay() + 6) % 7, 14),
        ends_at: at((today.getDay() + 6) % 7, 15),
        kind: "meeting",
      },
      {
        ...base,
        id: "demo-handoff",
        title: "Revisão de entregas",
        starts_at: at(3, 11),
        ends_at: at(3, 12),
        kind: "event",
      },
      {
        ...base,
        id: "demo-retro",
        title: "Retrospectiva",
        starts_at: at(4, 14),
        ends_at: at(4, 15),
        kind: "meeting",
      },
    ];
    hub.snapshot.people = hub.snapshot.people.map((person, i) => ({
      ...person,
      body: [
        "Trabalhando no lançamento",
        "Em reunião",
        "Disponível para conversar",
      ][i],
      timer_running: i === 0,
    }));
    const weekStart = dateAt(today, -today.getDay());
    const nextDay = dateAt(today, 1);
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6)
      nextDay.setDate(nextDay.getDate() + 1);
    const marker: HomeOfficeEntry = {
      team_id: hub.teamId,
      user_id: hub.snapshot.people[1].id,
      display_name: hub.snapshot.people[1].display_name,
      avatar_url: null,
      scheduled_on: dayKey(today),
      week_start: dayKey(weekStart),
      entry_kind: "home_office",
      entry_label: null,
    };
    hub.snapshot.homeOffice = [
      marker,
      {
        ...marker,
        user_id: hub.snapshot.people[2].id,
        display_name: hub.snapshot.people[2].display_name,
        scheduled_on: dayKey(nextDay),
        week_start: dayKey(dateAt(nextDay, -nextDay.getDay())),
      },
    ];
    if (scenario === "holiday") {
      hub.snapshot.homeOffice = [
        {
          ...marker,
          scheduled_on: dayKey(dateAt(weekStart, 1)),
          user_id: null,
          display_name: null,
          entry_kind: "holiday_week",
          entry_label: "Semana sem home office · feriado de demonstração",
        },
        {
          ...marker,
          user_id: hub.snapshot.people[2].id,
          display_name: hub.snapshot.people[2].display_name,
          scheduled_on: dayKey(dateAt(weekStart, 8)),
          week_start: dayKey(dateAt(weekStart, 7)),
        },
      ];
    }
    if (scenario === "empty") {
      hub.snapshot.events = [];
      hub.snapshot.homeOffice = [];
      hub.snapshot.people = [];
    }
    return hub;
  }, [today, scenario]);
  function showScenario(value: string) {
    setScenario(value);
    setTimer(
      value === "lunch"
        ? "lunch"
        : value === "idle" || value === "empty"
          ? "idle"
          : "running",
    );
    setElapsed(value === "idle" || value === "empty" ? 0 : 5082);
    setNotice("");
  }
  const demoNav = [
    { label: "Hoje", icon: SquaresFour, href: "/demo/dashboard" },
    { label: "Calendário", icon: CalendarDots, href: "/demo/calendar" },
    { label: "Tarefas", icon: Columns, href: "/demo/kanban" },
    { label: "Conversas", icon: ChatCircleText, href: "/demo/operations" },
    { label: "Minhas horas", icon: Timer, href: "/demo" },
    { label: "Pessoas", icon: UsersThree, href: "/demo" },
    { label: "Mais", icon: DotsThree, href: "/demo/operations" },
  ];
  const actual = scenario === "empty" ? 0 : 10800 + elapsed;
  const configured = scenario !== "unconfigured";
  if (!ready)
    return (
      <p className="live-team-loading" role="status">
        Carregando demonstração…
      </p>
    );
  return (
    <div className="app-shell live-app dashboard-redesign">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <aside className="rail" aria-label="Navegação da demonstração">
        <a className="brand" href="/demo/dashboard" aria-label="ZULU — início">
          <BrandMark size={44} />

        </a>
        <div className="rail-divider" />
        <nav>
          {demoNav.map((item, i) => (
            <a
              key={item.label}
              className={`rail-button ${i === 0 ? "active" : ""} ${i === 4 || i === 5 ? "nav-secondary" : ""} ${i === 6 ? "mobile-more-button" : ""}`}
              href={item.href}
              aria-label={item.label}
              aria-current={i === 0 ? "page" : undefined}
            >
              <item.icon size={23} weight={i === 0 ? "fill" : "regular"} />
              <span className="nav-tooltip">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="rail-bottom">
          <button
            className="rail-button"
            aria-label="Preferências"
            onClick={() => setDialog("Preferências da demonstração")}
          >
            <GearSix size={23} />
          </button>
          <PersonAvatar name="Rafa Costa" id="demo-current" />
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="workspace-button">
            <span className="workspace-icon">
              <SquaresFour size={18} weight="fill" />
            </span>
            <strong>Estúdio</strong>
          </div>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb">Hoje</span>
          <div className="topbar-right">
            <span className="today-preview-badge">
              Demonstração · dados fictícios
            </span>
            <PersonAvatar name="Rafa Costa" id="demo-current" />
          </div>
        </header>
        <main className="main-content today-page" id="main-content">
          <div className="page-heading">
            <div>
              <h1>
                Olá, Rafa<span className="heading-period">.</span>
              </h1>
              <p>
                Seu dia, em um só lugar.{" "}
                {today.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                .
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => setDialog("Novo evento")}
            >
              <Plus size={17} />
              Novo evento
            </button>
          </div>
          {notice && (
            <p className="today-demo-notice" role="status">
              {notice}
            </p>
          )}
          <div className="dashboard-layout today-layout">
            <div className="dashboard-main">
              <TodayOverview
                timer={{
                  state: timer,
                  elapsed,
                  description:
                    scenario === "idle" || scenario === "empty"
                      ? ""
                      : "Interface do aplicativo",
                  project:
                    scenario === "empty" ? "" : "ZULU · Design de produto",
                }}
                busy={false}
                canParticipate
                configured={configured}
                today={{
                  actualSeconds: actual,
                  expectedMinutes: 480,
                  balanceMinutes: Math.round(actual / 60) - 480,
                }}
                week={{
                  actualSeconds: 72000 + actual,
                  expectedMinutes: 1440,
                  balanceMinutes: 120,
                }}
                month={{
                  actualSeconds: 360000 + actual,
                  expectedMinutes: 6000,
                  balanceMinutes: -45,
                }}
                monthTargetMinutes={10560}
                todayKey={dayKey(today)}
                homeOffice={hub.snapshot.homeOffice}
                homeOfficeError={scenario === "error"}
                onToggleTimer={() => {
                  setTimer(timer === "running" ? "lunch" : "running");
                  setNotice(
                    "Timer demonstrativo. Nenhuma hora é enviada ao servidor.",
                  );
                }}
                onStopTimer={() => {
                  setTimer("idle");
                  setElapsed(0);
                  setNotice("Atividade encerrada apenas nesta demonstração.");
                }}
                onHours={() => setDialog("Minhas horas")}
                onSchedule={() => setDialog("Configurar jornada")}
                onHomeOffice={() => setDialog("Escala de home office")}
                onRetry={() => {
                  showScenario("running");
                  setNotice("Escala fictícia recarregada.");
                }}
              />
              <LiveCalendar
                hub={hub}
                monday={mondayOf(date)}
                date={date}
                onDate={setDate}
                today={today}
                day={(date.getDay() + 6) % 7}
                view={view}
                onView={setView}
                onDay={(day) => setDate(dateAt(mondayOf(date), day))}
                onMove={(direction) =>
                  setDate(moveCalendarDate(date, view, direction))
                }
                onToday={() => setDate(today)}
                onNew={(date) =>
                  setDialog(`Novo evento · ${date.toLocaleDateString("pt-BR")}`)
                }
                onSelect={(event) => setDialog(event.title)}
                onHomeOffice={() => setDialog("Escala de home office")}
                compact
              />
            </div>
            <TodayContext
              events={hub.snapshot.events.filter(
                (event) => dayKey(new Date(event.starts_at)) === dayKey(today),
              )}
              people={hub.snapshot.people}
              presence="live"
              online={Object.fromEntries(
                hub.snapshot.people.map((person, i) => [
                  person.id,
                  i === 1 ? "meeting" : "online",
                ]),
              )}
              unread={scenario === "empty" ? 0 : 3}
              recent={
                scenario === "empty"
                  ? []
                  : [
                      {
                        id: "1",
                        description: "Biblioteca de componentes",
                        project: "ZULU · Design system",
                      },
                      {
                        id: "2",
                        description: "Fluxo de entrada",
                        project: "ZULU · Produto",
                      },
                    ]
              }
              busy={false}
              canRestart={timer === "idle"}
              onEvent={(event: Row<"events">) => setDialog(event.title)}
              onCalendar={() => setDialog("Calendário completo")}
              onPerson={(person) => setDialog(person.display_name)}
              onPeople={() => setDialog("Pessoas do time")}
              onRestart={() => {
                setTimer("running");
                setElapsed(0);
                setNotice("Atividade retomada apenas na demonstração.");
              }}
              onChat={() => setDialog("Conversas do time")}
            />
          </div>
          <footer className="today-demo-footer">
            <span>
              Demonstração em memória. Seus dados não são usados aqui.
            </span>
            <label>
              Cenário da demonstração
              <select
                value={scenario}
                onChange={(event) => showScenario(event.target.value)}
              >
                <option value="running">Timer ativo</option>
                <option value="lunch">Pausa para almoço</option>
                <option value="idle">Timer parado</option>
                <option value="unconfigured">Jornada não configurada</option>
                <option value="holiday">Semana com feriado</option>
                <option value="empty">Sem dados</option>
                <option value="error">Falha ao carregar escala</option>
              </select>
            </label>
          </footer>
        </main>
      </div>
      {dialog && (
        <HubDialog title={dialog} onClose={() => setDialog("")}>
          <p className="resource-note">
            Esta é uma prévia com dados fictícios. No app, esta ação abre{" "}
            {dialog.toLocaleLowerCase("pt-BR")} com os dados autorizados do seu
            time.
          </p>
          <button className="outline-button" onClick={() => setDialog("")}>
            Voltar ao dashboard
          </button>
        </HubDialog>
      )}
    </div>
  );
}
