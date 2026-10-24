"use client";
import { useState, type ReactNode } from "react";
import {
  CaretDown,
  CaretRight,
  Flag,
  CalendarBlank,
  Plus,
  ArrowUpRight,
  Play,
  House,
  CheckCircle,
} from "@phosphor-icons/react";
import { ZuluButton, ZuluSelect, ZuluCheckboxField } from "./dashboard-ui";
import type { Person, Row, HomeOfficeEntry } from "@/lib/hub/types";
import { dayKey } from "@/lib/hub/dates";
import { homeOfficeSummary } from "@/lib/hub/dashboard";
import { orderedTasks } from "@/lib/hub/kanban";

type Props = {
  tasks: Row<"tasks">[];
  projects: Row<"projects">[];
  people: Person[];
  userId: string;
  now: number;
  busy: boolean;
  canWrite: boolean;
  canManage: boolean;
  canTrack: boolean;
  hasTimer: boolean;
  context: ReactNode;
  homeOffice: HomeOfficeEntry[];
  homeOfficeError: boolean;
  showTasks: boolean;
  showCalendar: boolean;
  showHours: boolean;
  journey: { actualSeconds: number; expectedMinutes: number };
  configured: boolean;
  onNew: () => void;
  onBoard: () => void;
  onStart: (task: Row<"tasks">) => void;
  onComplete: (task: Row<"tasks">, done: boolean) => Promise<boolean>;
  onHomeOffice: () => void;
  onHours: () => void;
};
const priorities: Record<string, string> = {
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};
export function NightDashboard(p: Props) {
  const [filter, setFilter] = useState<"open" | "week" | "done">("open"),
    [project, setProject] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null),
    [error, setError] = useState("");
  const tasks = orderedTasks(
    p.tasks.filter(
      (t) => !t.archived_at && (project === "all" || t.project_id === project),
    ),
  )
    .filter((t) =>
      filter === "done" ? t.status === "done" : t.status !== "done",
    )
    .filter((t) => {
      if (filter !== "week" || !t.due_on) return true;
      const days =
        (Date.parse(`${t.due_on}T12:00:00`) -
          Date.parse(`${dayKey(new Date(p.now))}T12:00:00`)) /
        86400000;
      return days <= 7;
    });
  const selected =
    expanded ??
    tasks.find((t) => t.status === "in_progress")?.id ??
    tasks[0]?.id;
  const office = homeOfficeSummary(p.homeOffice, dayKey(new Date(p.now)));
  const remaining = Math.max(
    0,
    p.journey.expectedMinutes * 60 - p.journey.actualSeconds,
  );
  return (
    <div className="night-dashboard">
      <section className="night-work" aria-label="Seu trabalho em foco">
        <header className="night-heading">
          <div>
            <h1>Seu trabalho, em foco.</h1>
            <p>
              {new Date(p.now).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          {p.showTasks && p.canWrite && (
            <ZuluButton className="primary-button" onClick={p.onNew}>
              <Plus size={18} />
              Nova tarefa
            </ZuluButton>
          )}
        </header>
        {p.showTasks ? (
          <>
            <div className="night-task-toolbar">
              <div
                className="night-task-tabs"
                role="group"
                aria-label="Filtrar tarefas"
              >
                {(
                  [
                    ["open", "Em aberto"],
                    ["week", "Próximos dias"],
                    ["done", "Concluídas"],
                  ] as const
                ).map(([id, label]) => (
                  <ZuluButton
                    key={id}
                    aria-pressed={filter === id}
                    onClick={() => setFilter(id)}
                  >
                    {label}
                    {id === "open" && (
                      <span>
                        {
                          p.tasks.filter(
                            (t) => !t.archived_at && t.status !== "done",
                          ).length
                        }
                      </span>
                    )}
                  </ZuluButton>
                ))}
              </div>
              <ZuluSelect
                aria-label="Filtrar tarefas por projeto"
                value={project}
                onValueChange={setProject}
              >
                <option value="all">Todos os projetos</option>
                {p.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </ZuluSelect>
            </div>
            <div className="night-task-list">
              {tasks.map((task) => {
                const open = selected === task.id,
                  done = task.status === "done",
                  editable =
                    p.canWrite &&
                    (p.canManage ||
                      task.created_by === p.userId ||
                      !task.assignee_id ||
                      task.assignee_id === p.userId),
                  projectName =
                    p.projects.find((item) => item.id === task.project_id)
                      ?.name ?? "Sem projeto";
                return (
                  <article
                    className="night-task"
                    data-expanded={open}
                    data-complete={done}
                    key={task.id}
                  >
                    <div className="night-task-row">
                      <ZuluCheckboxField
                        aria-label={`Concluir ${task.title}`}
                        checked={done}
                        disabled={p.busy || !editable}
                        onCheckedChange={async (checked) => {
                          setError("");
                          if (!(await p.onComplete(task, checked)))
                            setError(
                              "Não foi possível atualizar a tarefa. Tente novamente.",
                            );
                        }}
                      />
                      <ZuluButton
                        className="night-task-summary"
                        aria-expanded={open}
                        aria-controls={`task-detail-${task.id}`}
                        onClick={() => setExpanded(open ? "" : task.id)}
                      >
                        <span className="night-task-name">{task.title}</span>
                        <span className="night-task-meta">
                          <span>
                            <i />
                            {projectName}
                          </span>
                          {task.due_on && (
                            <span>
                              <CalendarBlank size={15} />
                              {new Date(
                                `${task.due_on}T12:00:00`,
                              ).toLocaleDateString("pt-BR", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                          <span className={`priority-${task.priority}`}>
                            <Flag size={15} />
                            {priorities[task.priority] ?? "Normal"}
                          </span>
                        </span>
                        {open ? (
                          <CaretDown size={18} />
                        ) : (
                          <CaretRight size={18} />
                        )}
                      </ZuluButton>
                    </div>
                    {open && (
                      <div
                        id={`task-detail-${task.id}`}
                        className="night-task-detail"
                      >
                        <p>
                          {task.description ||
                            "Adicione os detalhes desta tarefa no quadro para manter o contexto com o time."}
                        </p>
                        <div className="night-task-detail-footer">
                          <span>
                            {task.assignee_id
                              ? (p.people.find(
                                  (person) => person.id === task.assignee_id,
                                )?.display_name ?? "Pessoa do time")
                              : "Sem responsável"}{" "}
                            ·{" "}
                            {done
                              ? "Concluída"
                              : task.status === "in_progress"
                                ? "Em andamento"
                                : "A fazer"}
                          </span>
                          {p.canTrack && !done && (
                            <ZuluButton
                              className="night-task-start"
                              disabled={p.busy || p.hasTimer}
                              onClick={() => p.onStart(task)}
                            >
                              <Play size={15} />
                              Registrar tempo
                            </ZuluButton>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {!tasks.length && (
                <div className="night-empty">
                  <CheckCircle size={30} />
                  <h2>
                    {filter === "done"
                      ? "Cada entrega aparece aqui."
                      : "Espaço para o próximo passo."}
                  </h2>
                  <p>
                    {filter === "done"
                      ? "As tarefas concluídas ficam organizadas neste lugar."
                      : "Crie uma tarefa ou ajuste os filtros para começar."}
                  </p>
                  {p.canWrite && (
                    <ZuluButton className="primary-button" onClick={p.onNew}>
                      <Plus size={16} />
                      Criar tarefa
                    </ZuluButton>
                  )}
                </div>
              )}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <ZuluButton className="night-board-link" onClick={p.onBoard}>
              Abrir quadro de tarefas
              <ArrowUpRight size={16} />
            </ZuluButton>
          </>
        ) : (
          <div className="night-empty">
            <h2>Seu espaço está pronto.</h2>
            <p>As funções disponíveis para você estão na navegação lateral.</p>
          </div>
        )}
        {p.showHours && (
          <ZuluButton className="night-journey" onClick={p.onHours}>
            {p.configured ? (
              <>
                <span>Jornada de hoje</span>
                <strong>
                  {Math.floor(p.journey.actualSeconds / 3600)}h{" "}
                  {String(
                    Math.floor((p.journey.actualSeconds % 3600) / 60),
                  ).padStart(2, "0")}
                  m registradas
                </strong>
                <span>
                  {p.journey.expectedMinutes === 0
                    ? "Sem carga prevista hoje"
                    : remaining > 0
                      ? `${Math.floor(remaining / 3600)}h ${String(Math.ceil((remaining % 3600) / 60)).padStart(2, "0")}m para a jornada prevista`
                      : "Jornada prevista concluída"}
                </span>
              </>
            ) : (
              <>
                <span>Sua jornada</span>
                <strong>Configure seus dias e horários</strong>
              </>
            )}
            <ArrowUpRight size={16} />
          </ZuluButton>
        )}
      </section>
      <aside className="night-context" aria-label="Agenda e equipe">
        {p.context}
        {p.showCalendar && (
          <section className="night-office">
            <header>
              <House size={20} />
              <h2>Home office</h2>
            </header>
            <p>
              {p.homeOfficeError
                ? "Não foi possível carregar a escala."
                : office.holidayWeek
                  ? "Semana sem home office · feriado"
                  : office.today.length
                    ? office.today.map((item) => item.display_name).join(", ")
                    : "Sem home office na escala hoje"}
            </p>
            {office.next[0] && (
              <small>
                Próximo:{" "}
                {office.next.map((item) => item.display_name).join(", ")} ·{" "}
                {new Date(
                  `${office.next[0].scheduled_on}T12:00:00`,
                ).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                })}
              </small>
            )}
            <ZuluButton className="text-button" onClick={p.onHomeOffice}>
              Ver escala
              <ArrowUpRight size={15} />
            </ZuluButton>
          </section>
        )}
      </aside>
    </div>
  );
}
