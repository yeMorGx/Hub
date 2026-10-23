"use client";
import { ZuluAlert, ZuluForm, ZuluLabel, ZuluInput, ZuluSelect, ZuluButton } from "./dashboard-ui";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowsLeftRight,
  Bell,
  CalendarBlank,
  Check,
  House,
  Plus,
  X,
} from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import type { HomeOfficeEntry, Row } from "@/lib/hub/types";
import { dateAt, dayKey } from "@/lib/hub/dates";
import { errorMessage } from "@/lib/supabase/errors";
import { HubDialog } from "./hub-ui";

const weekdays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const pdfOrder = ["David", "Gabriel", "Guilherme", "Rhuan", "Christian"];
const defaultHolidays2026 = [
  { holiday_date: "2026-01-01", label: "Confraternização Universal · nacional" },
  { holiday_date: "2026-01-26", label: "Aniversário de Santos · municipal" },
  { holiday_date: "2026-04-03", label: "Paixão de Cristo · Santos" },
  { holiday_date: "2026-04-21", label: "Tiradentes · nacional" },
  { holiday_date: "2026-05-01", label: "Dia do Trabalho · nacional" },
  { holiday_date: "2026-06-04", label: "Corpus Christi · Santos" },
  { holiday_date: "2026-07-09", label: "Revolução Constitucionalista · estadual SP" },
  { holiday_date: "2026-09-07", label: "Independência do Brasil · nacional" },
  { holiday_date: "2026-09-08", label: "Nossa Senhora do Monte Serrat · padroeira de Santos" },
  { holiday_date: "2026-10-12", label: "Nossa Senhora Aparecida · nacional" },
  { holiday_date: "2026-11-02", label: "Finados · nacional" },
  { holiday_date: "2026-11-15", label: "Proclamação da República · nacional" },
  { holiday_date: "2026-11-20", label: "Consciência Negra · nacional" },
  { holiday_date: "2026-12-24", label: "Véspera de Natal · calendário do time / ponto facultativo municipal" },
  { holiday_date: "2026-12-25", label: "Natal · nacional" },
];

type Member = { id: string; display_name: string };
type Holiday = { holiday_date: string; label: string };
type Swap = Row<"home_office_swaps">;

function sundayOf(date: Date) {
  const sunday = new Date(date);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return sunday;
}

function defaultRoster(people: Member[]) {
  const normalize = (value: string) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const fromPdf = pdfOrder.map((name) =>
    people.find((person) => normalize(person.display_name) === normalize(name))?.id ?? "",
  );
  if (fromPdf.every(Boolean) && new Set(fromPdf).size === 5) return fromPdf;
  return [...people]
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "pt-BR"))
    .slice(0, 5)
    .map((person) => person.id)
    .concat(Array.from({ length: Math.max(0, 5 - people.length) }, () => ""));
}

function formatWeek(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function HomeOfficeManager({
  hub,
  open,
  focusWeek,
  onClose,
}: {
  hub: HubController;
  open: boolean;
  focusWeek: string;
  onClose: () => void;
}) {
  const client = hub.client;
  const teamId = hub.teamId;
  const userId = hub.userId;
  const peopleSignature = JSON.stringify(
    hub.snapshot.people.map(({ id, display_name }) => ({ id, display_name })),
  );
  const people = useMemo(() => JSON.parse(peopleSignature) as Member[], [peopleSignature]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [anchorWeek, setAnchorWeek] = useState("2026-10-04");
  const [reminderTime, setReminderTime] = useState("08:30");
  const [memberIds, setMemberIds] = useState<string[]>(Array(5).fill(""));
  const [holidays, setHolidays] = useState<Holiday[]>(defaultHolidays2026);
  const [scheduleExists, setScheduleExists] = useState(false);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [upcoming, setUpcoming] = useState<HomeOfficeEntry[]>([]);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayLabel, setHolidayLabel] = useState("");
  const [swapWeek, setSwapWeek] = useState("");
  const [targetUserId, setTargetUserId] = useState("");

  useEffect(() => {
    if (!open || !teamId) return;
    let active = true;
    setLoading(true);
    setLoadError("");
    async function load() {
      try {
        const [scheduleResult, memberResult, holidayResult, swapResult] = await Promise.all([
          client.from("home_office_schedules").select("*").eq("team_id", teamId).maybeSingle(),
          client.from("home_office_members").select("*").eq("team_id", teamId).order("anchor_weekday"),
          client.from("home_office_holidays").select("*").eq("team_id", teamId).order("holiday_date"),
          client.from("home_office_swaps").select("*").eq("team_id", teamId).order("week_start").limit(100),
        ]);
        for (const result of [scheduleResult, memberResult, holidayResult, swapResult])
          if (result.error) throw result.error;

        const start = sundayOf(new Date());
        const end = dateAt(start, 83);
        const calendarResult = await client.rpc("get_home_office_calendar", {
          p_team_id: teamId,
          p_starts_on: dayKey(start),
          p_ends_on: dayKey(end),
        });
        if (calendarResult.error) throw calendarResult.error;
        if (!active) return;

        const configured = Boolean(scheduleResult.data);
        setScheduleExists(configured);
        setAnchorWeek(scheduleResult.data?.anchor_week ?? "2026-10-04");
        setReminderTime(scheduleResult.data?.reminder_time?.slice(0, 5) ?? "08:30");
        setMemberIds(
          configured
            ? Array.from({ length: 5 }, (_, index) =>
                memberResult.data?.find((item) => item.anchor_weekday === index)?.user_id ?? "",
              )
            : defaultRoster(people),
        );
        setHolidays(
          configured
            ? (holidayResult.data ?? []).map((item) => ({ holiday_date: item.holiday_date, label: item.label }))
            : defaultHolidays2026,
        );
        setSwaps(swapResult.data ?? []);
        setUpcoming(calendarResult.data ?? []);
        const availableWeeks = (calendarResult.data ?? [])
          .filter((item) => item.entry_kind === "home_office" && item.user_id === userId)
          .map((item) => item.week_start);
        setSwapWeek(availableWeeks.includes(focusWeek) ? focusWeek : (availableWeeks[0] ?? ""));
        setTargetUserId("");
      } catch (error) {
        if (active) setLoadError(errorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [open, teamId, client, userId, focusWeek, revision, peopleSignature, people]);

  const peopleById = new Map(people.map((person) => [person.id, person.display_name]));
  const myWeeks = [...new Set(
    upcoming
      .filter((entry) => entry.entry_kind === "home_office" && entry.user_id === userId)
      .filter((entry) => entry.scheduled_on >= dayKey(new Date()))
      .map((entry) => entry.week_start),
  )];
  const swapPeople = upcoming.filter(
    (entry) =>
      entry.entry_kind === "home_office" &&
      entry.week_start === swapWeek &&
      entry.user_id !== userId &&
      entry.scheduled_on >= dayKey(new Date()),
  );

  function chooseMember(index: number, nextId: string) {
    setMemberIds((current) => {
      const next = [...current];
      const other = next.indexOf(nextId);
      if (other >= 0 && other !== index) next[other] = next[index];
      next[index] = nextId;
      return next;
    });
  }

  async function saveSchedule() {
    if (!anchorWeek || !reminderTime || new Set(memberIds).size !== 5 || memberIds.some((id) => !id)) return;
    const result = await hub.mutate(
      () =>
        hub.rpc("save_home_office_schedule", {
          p_team_id: teamId,
          p_anchor_week: anchorWeek,
          p_member_ids: memberIds,
          p_reminder_time: `${reminderTime}:00`,
          p_timezone: "America/Sao_Paulo",
          p_holidays: holidays.map((holiday) => ({
            holiday_date: holiday.holiday_date,
            label: holiday.label,
          })),
        }),
      "Escala de home office salva no calendário.",
    );
    if (result.ok) {
      setScheduleExists(true);
      setRevision((value) => value + 1);
    }
  }

  async function requestSwap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!swapWeek || !targetUserId) return;
    const result = await hub.mutate(
      () =>
        hub.rpc("request_home_office_swap", {
          p_team_id: teamId,
          p_week_start: swapWeek,
          p_target_user_id: targetUserId,
        }),
      "Pedido de troca enviado.",
    );
    if (result.ok) setRevision((value) => value + 1);
  }

  async function decideSwap(requestId: string, action: "accept" | "decline" | "cancel") {
    const result = await hub.mutate(
      () => hub.rpc("decide_home_office_swap", { p_request_id: requestId, p_action: action }),
      action === "accept" ? "Troca confirmada. A escala foi atualizada." : "Pedido de troca atualizado.",
    );
    if (result.ok) setRevision((value) => value + 1);
  }

  function addHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!holidayDate || holidays.some((holiday) => holiday.holiday_date === holidayDate)) return;
    setHolidays((current) =>
      [...current, { holiday_date: holidayDate, label: holidayLabel.trim() || "Feriado" }]
        .sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)),
    );
    setHolidayDate("");
    setHolidayLabel("");
  }

  if (!open) return null;
  const canSaveRoster = hub.canManage && people.length >= 5 &&
    memberIds.length === 5 && memberIds.every(Boolean) && new Set(memberIds).size === 5;
  const pendingSwaps = swaps.filter((swap) => swap.status === "pending");
  const answeredSwaps = swaps.filter((swap) => swap.status === "accepted");

  return (
    <HubDialog title="Escala de home office" onClose={onClose} wide>
      {loading ? (
        <div className="home-office-loading" aria-label="Carregando escala">
          <span /><span /><span /><span /><span />
        </div>
      ) : loadError ? (
        <ZuluAlert className="form-alert" role="alert">{loadError}</ZuluAlert>
      ) : (
        <div className="home-office-manager">
          <p className="home-office-intro">
            Cada pessoa tem um dia. A rodada avança uma posição por semana ativa; feriados pausam a semana inteira.
          </p>

          {hub.canManage ? (
            <div className="home-office-setup">
              <div className="home-office-form-grid">
                <ZuluLabel>
                  Semana de referência
                  <ZuluInput type="date" required value={anchorWeek} onValueChange={(event) => setAnchorWeek(event)} />
                  <small>Use um domingo. O PDF começa em 04/10; a primeira escala acontece na segunda, 05/10.</small>
                </ZuluLabel>
                <ZuluLabel>
                  Lembrete no dia
                  <span className="home-office-time-input"><Bell size={15} /><ZuluInput type="time" required value={reminderTime} onValueChange={(event) => setReminderTime(event)} /></span>
                  <small>Horário de Brasília. Cada pessoa recebe um aviso no dia do home office.</small>
                </ZuluLabel>
              </div>
              <div className="home-office-roster">
                <div className="home-office-section-title">
                  <div><h3>Ordem inicial</h3><p>Estas cinco posições avançam de segunda a sexta.</p></div>
                  <House size={17} />
                </div>
                {weekdays.map((weekday, index) => (
                  <ZuluLabel className="home-office-roster-row" key={weekday}>
                    <span><b>{String.fromCharCode(65 + index)}</b>{weekday}</span>
                    <ZuluSelect value={memberIds[index] ?? ""} onValueChange={(value) => chooseMember(index, value)} disabled={!hub.canManage}>
                      <option value="">Escolha alguém</option>
                      {people.map((person) => <option value={person.id} key={person.id}>{person.display_name}</option>)}
                    </ZuluSelect>
                  </ZuluLabel>
                ))}
                {people.length < 5 && <p className="home-office-hint">Adicione mais {5 - people.length} {5 - people.length === 1 ? "pessoa" : "pessoas"} ao time para completar a escala.</p>}
              </div>

              <div className="home-office-holidays">
                <div className="home-office-section-title">
                  <div><h3>Semanas sem escala</h3><p>Qualquer feriado entre domingo e sábado pausa toda a rodada.</p></div>
                  <CalendarBlank size={17} />
                </div>
                <div className="home-office-holiday-list">
                  {holidays.length ? holidays.map((holiday) => (
                    <div className="home-office-holiday-row" key={holiday.holiday_date}>
                      <span>{formatWeek(holiday.holiday_date)} <small>{holiday.label}</small></span>
                      {hub.canManage && <ZuluButton type="button" className="icon-button" aria-label={`Remover feriado ${holiday.label}`} onClick={() => setHolidays((current) => current.filter((item) => item.holiday_date !== holiday.holiday_date))}><X size={15} /></ZuluButton>}
                    </div>
                  )) : <p className="home-office-hint">Nenhum feriado cadastrado.</p>}
                </div>
                {hub.canManage && (
                  <ZuluForm className="home-office-add-holiday" onSubmit={addHoliday}>
                    <ZuluInput aria-label="Data do feriado" type="date" required value={holidayDate} onValueChange={(event) => setHolidayDate(event)} />
                    <ZuluInput aria-label="Nome do feriado" placeholder="Nome do feriado" maxLength={120} value={holidayLabel} onChange={(event) => setHolidayLabel(event.target.value)} />
                    <ZuluButton className="outline-button" type="submit"><Plus size={15} /> Adicionar</ZuluButton>
                  </ZuluForm>
                )}
              </div>
              {hub.canManage && (
                <div className="home-office-save-row">
                    <p>{scheduleExists ? "Alterar a semana base ou as pessoas cancela trocas futuras." : "Feriados nacionais, de São Paulo e de Santos para 2026 já estão carregados e podem ser ajustados."}</p>
                  <ZuluButton className="primary-button" type="button" onClick={() => void saveSchedule()} disabled={!canSaveRoster || hub.busy}>
                    <Check size={16} /> {hub.busy ? "Salvando…" : "Salvar escala"}
                  </ZuluButton>
                </div>
              )}
            </div>
          ) : (
            <p className="home-office-hint">Líderes do time e administradores do workspace podem configurar pessoas, semana de referência e feriados.</p>
          )}

          <section className="home-office-swaps">
            <div className="home-office-section-title">
              <div><h3>Trocas de dia</h3><p>Peça para alguém assumir seu dia; a escala muda quando a outra pessoa aceitar.</p></div>
              <ArrowsLeftRight size={18} />
            </div>
            {myWeeks.length ? (
              <ZuluForm className="home-office-swap-form" onSubmit={requestSwap}>
                <ZuluLabel>
                  Seu dia
                  <ZuluSelect value={swapWeek} onValueChange={(value) => { setSwapWeek(value); setTargetUserId(""); }}>
                    {myWeeks.map((week) => <option value={week} key={week}>{formatWeek(week)}</option>)}
                  </ZuluSelect>
                </ZuluLabel>
                <ZuluLabel>
                  Trocar com
                  <ZuluSelect value={targetUserId} onValueChange={(value) => setTargetUserId(value)} required>
                    <option value="">Escolha alguém</option>
                    {swapPeople.map((entry) => <option value={entry.user_id!} key={entry.user_id!}>{entry.display_name} · {new Date(`${entry.scheduled_on}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long" })}</option>)}
                  </ZuluSelect>
                </ZuluLabel>
                <ZuluButton className="outline-button" type="submit" disabled={!targetUserId || hub.busy}><ArrowsLeftRight size={15} /> Pedir troca</ZuluButton>
              </ZuluForm>
            ) : scheduleExists ? (
              <p className="home-office-hint">Você não tem um dia futuro na escala das próximas semanas para trocar.</p>
            ) : (
              <p className="home-office-hint">A escala precisa ser configurada antes de solicitar trocas.</p>
            )}
            {pendingSwaps.length > 0 && (
              <div className="home-office-request-list">
                <h4>Pendentes</h4>
                {pendingSwaps.map((swap) => {
                  const received = swap.target_user_id === userId;
                  return (
                    <div className="home-office-request" key={swap.id}>
                      <p>
                        <strong>{received ? peopleById.get(swap.requested_by) ?? "Uma pessoa do time" : "Seu pedido"}</strong>
                        {received ? " pediu uma troca para a semana de " : " aguarda resposta para a semana de "}
                        {formatWeek(swap.week_start)}.
                      </p>
                      <div>
                        {received ? (
                          <>
                            <ZuluButton className="outline-button" onClick={() => void decideSwap(swap.id, "accept")} disabled={hub.busy}><Check size={14} /> Aceitar</ZuluButton>
                            <ZuluButton className="text-button" onClick={() => void decideSwap(swap.id, "decline")} disabled={hub.busy}>Recusar</ZuluButton>
                          </>
                        ) : (
                          <ZuluButton className="text-button" onClick={() => void decideSwap(swap.id, "cancel")} disabled={hub.busy}>Cancelar pedido</ZuluButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {answeredSwaps.length > 0 && (
              <div className="home-office-confirmed-swaps">
                <Check size={14} /> {answeredSwaps.length} troca(s) confirmada(s) na escala.
              </div>
            )}
          </section>
        </div>
      )}
    </HubDialog>
  );
}
