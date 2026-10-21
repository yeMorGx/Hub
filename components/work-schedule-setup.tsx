"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarBlank, Check, Clock } from "@phosphor-icons/react";
import type { HubController } from "@/lib/hub/use-hub";
import { HubDialog } from "./hub-ui";

const weekdays = [
  { short: "Seg", full: "Segunda-feira" },
  { short: "Ter", full: "Terça-feira" },
  { short: "Qua", full: "Quarta-feira" },
  { short: "Qui", full: "Quinta-feira" },
  { short: "Sex", full: "Sexta-feira" },
  { short: "Sáb", full: "Sábado" },
  { short: "Dom", full: "Domingo" },
];

export function WorkScheduleSetup({
  hub,
  open,
  onClose,
}: {
  hub: HubController;
  open: boolean;
  onClose: () => void;
}) {
  const schedule = hub.snapshot.workSchedule;
  const [dailyHours, setDailyHours] = useState("8");
  const [workdaysMask, setWorkdaysMask] = useState(31);

  useEffect(() => {
    if (!open) return;
    if (schedule?.setup_state === "complete") {
      setDailyHours(String(schedule.daily_minutes / 60));
      setWorkdaysMask(schedule.workdays_mask);
    } else {
      setDailyHours("8");
      setWorkdaysMask(31);
    }
  }, [open, schedule?.effective_from, schedule?.setup_state]);

  const selectedDays = weekdays.filter((_, index) => workdaysMask & (1 << index)).length;
  const parsedMinutes = Math.round(Number(dailyHours) * 60);
  const valid = Number.isFinite(parsedMinutes) && parsedMinutes >= 15 && parsedMinutes <= 1440 && selectedDays > 0;
  const weeklyHours = (parsedMinutes * selectedDays) / 60;
  const timezone = schedule?.timezone || "America/Sao_Paulo";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await hub.mutate(
      () => hub.rpc("save_work_schedule", {
        p_team_id: hub.teamId,
        p_user_id: hub.userId,
        p_daily_minutes: parsedMinutes,
        p_workdays_mask: workdaysMask,
        p_timezone: timezone,
      }),
      "Jornada salva. Seu saldo diário, semanal e mensal foi atualizado.",
    );
    if (result.ok) onClose();
  }

  async function skip() {
    const result = await hub.mutate(
      () => hub.rpc("skip_work_schedule_setup", { p_team_id: hub.teamId }),
      "Tudo certo. Você pode configurar sua jornada em Minhas horas quando quiser.",
    );
    if (result.ok) onClose();
  }

  if (!open) return null;

  return (
    <HubDialog title="Sua jornada de trabalho" onClose={onClose}>
      <form className="work-schedule-form" onSubmit={(event) => void save(event)}>
        <p>
          Escolha seus dias e a carga diária. O Hub compara as horas registradas
          com essa jornada e calcula o saldo ao longo do mês.
        </p>
        <fieldset className="work-schedule-days">
          <legend><CalendarBlank size={15} /> Dias previstos</legend>
          <div>
            {weekdays.map(({ short, full }, index) => {
              const checked = (workdaysMask & (1 << index)) !== 0;
              return (
                <label className={`workday-option ${checked ? "selected" : ""}`} key={short}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setWorkdaysMask((current) => current ^ (1 << index))}
                    aria-label={full}
                  />
                  {short}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="workday-hours-field">
          <span><Clock size={15} /> Horas por dia</span>
          <span className="workday-hours-input">
            <input
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              required
              value={dailyHours}
              onChange={(event) => setDailyHours(event.target.value)}
            />
            <small>h</small>
          </span>
        </label>
        <div className="work-schedule-preview" role="status">
          <strong>{valid ? `${weeklyHours.toLocaleString("pt-BR")} h por semana` : "Escolha ao menos um dia"}</strong>
          <span>A meta do mês usa os dias selecionados. Feriados da equipe e ausências aprovadas reduzem as horas previstas.</span>
        </div>
        <div className="work-schedule-actions">
          {schedule?.setup_state !== "complete" && (
            <button className="text-button" type="button" onClick={() => void skip()} disabled={hub.busy}>
              Configuro depois
            </button>
          )}
          <button className="primary-button" disabled={!valid || hub.busy}>
            <Check size={16} />
            {hub.busy ? "Salvando…" : "Salvar jornada"}
          </button>
        </div>
      </form>
    </HubDialog>
  );
}
