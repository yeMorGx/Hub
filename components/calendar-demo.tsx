"use client";
import { useEffect, useMemo, useState } from "react";
import { LiveCalendar } from "./live-calendar";
import { HubDialog } from "./hub-ui";
import { createDemoBackend } from "@/lib/hub/demo-backend";
import { dateAt, dayKey, mondayOf } from "@/lib/hub/dates";
import { moveCalendarDate, type CalendarView } from "@/lib/hub/calendar";
import type { Row } from "@/lib/hub/types";
export function CalendarDemo() {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(new Date("2026-10-20T12:00:00"));
  const [date, setDate] = useState(today),
    [view, setView] = useState<CalendarView>("month");
  const [notice, setNotice] = useState(""),
    [event, setEvent] = useState<Row<"events"> | null>(null);
  useEffect(() => {
    const now = new Date();
    setToday(now);
    setDate(now);
    setReady(true);
  }, []);
  const hub = useMemo(() => {
    const { hub } = createDemoBackend();
    const monday = mondayOf(today);
    const at = (day: number, hour: number) => {
      const date = dateAt(monday, day);
      date.setHours(hour, 0, 0, 0);
      return date.toISOString();
    };
    const base = hub.snapshot.events[0];
    hub.snapshot.events = [
      ...Array.from({ length: 5 }, (_, i) => ({
        ...base,
        id: `review-${i}`,
        title: [
          "Revisão de produto",
          "Planejamento do time",
          "Alinhamento de design",
          "Revisão de entregas",
          "Retrospectiva",
        ][i],
        starts_at: at(1, 9 + i),
        ends_at: at(1, 10 + i),
        kind: i % 2 ? ("event" as const) : ("meeting" as const),
      })),
      {
        ...base,
        id: "weekend",
        title: "Plantão de sábado",
        starts_at: at(5, 10),
        ends_at: at(5, 12),
        kind: "event",
      },
      {
        ...base,
        id: "night",
        title: "Manutenção noturna",
        starts_at: at(4, 22),
        ends_at: at(5, 2),
        kind: "event",
      },
    ];
    return hub;
  }, [today]);
  const monday = mondayOf(date);
  return (
    <div className="calendar-demo">
      <header className="operations-demo-header">
        <a href="/demo">Voltar ao dashboard</a>
        <span className="demo-badge">Demonstração · dados fictícios</span>
        <a href="/login">Entrar no ZULU</a>
      </header>
      <div className="page-heading">
        <div>
          <h1>
            Calendário<span className="heading-period">.</span>
          </h1>
          <p>Uma visão do mês, espaço para cada dia.</p>
        </div>
      </div>
      {notice && (
        <p className="inline-notice" role="status">
          {notice}
        </p>
      )}
      {ready ? (
        <LiveCalendar
          hub={hub}
          date={date}
          onDate={setDate}
          monday={monday}
          today={today}
          day={(date.getDay() + 6) % 7}
          view={view}
          onView={setView}
          onDay={(day) => setDate(dateAt(monday, day))}
          onMove={(direction) =>
            setDate(moveCalendarDate(date, view, direction))
          }
          onToday={() => setDate(today)}
          onNew={(day) =>
            setNotice(
              `Demonstração: novo evento em ${dayKey(day)}. Nenhum dado real será criado.`,
            )
          }
          onSelect={setEvent}
          onHomeOffice={() =>
            setNotice("Demonstração: a escala de home office não usa dados reais.")
          }
          full
        />
      ) : (
        <p role="status">Carregando agenda de demonstração…</p>
      )}
      {event && (
        <HubDialog title={event.title} onClose={() => setEvent(null)}>
          <p>
            {new Date(event.starts_at).toLocaleString("pt-BR")} —{" "}
            {new Date(event.ends_at).toLocaleString("pt-BR")}
          </p>
          <p className="demo-note">
            Evento fictício, sem conexão com a agenda do seu time.
          </p>
        </HubDialog>
      )}
    </div>
  );
}
