"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  CalendarBlank,
  CheckCircle,
  Circle,
  CircleHalf,
  Columns,
  Flag,
  MagnifyingGlass,
  Play,
  Plus,
  Stop,
  Timer,
} from "@phosphor-icons/react";
import { HubDialog, PersonAvatar } from "./hub-ui";
import { dayKey } from "@/lib/hub/dates";
import type { Person, Row } from "@/lib/hub/types";

export type Task = Row<"tasks">;
export type TaskInput = {
  id?: string;
  version?: number;
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  dueOn: string;
  priority: string;
};
const stages = [
  { id: "todo", label: "A fazer", icon: Circle },
  { id: "in_progress", label: "Em andamento", icon: CircleHalf },
  { id: "done", label: "Concluído", icon: CheckCircle },
] as const;
const priorities: Record<string, string> = {
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};
type Operation = Promise<string | null>;
type Props = {
  tasks: Task[];
  projects: Pick<Row<"projects">, "id" | "name">[];
  people: Person[];
  userId: string;
  canParticipate: boolean;
  canManage: boolean;
  busy: boolean;
  activeTimer: Pick<Row<"time_entries">, "id" | "task_id"> | undefined;
  onSave: (input: TaskInput) => Operation;
  onMove: (task: Task, status: string) => Operation;
  onArchive: (task: Task) => Operation;
  onStart: (task: Task) => Operation;
  onStop: () => Operation;
};
export function LiveBoard(props: Props) {
  const {
    tasks,
    projects,
    people,
    userId,
    canParticipate,
    canManage,
    busy,
    activeTimer,
  } = props;
  const [query, setQuery] = useState(""),
    [project, setProject] = useState("all"),
    [mine, setMine] = useState(false);
  const [editor, setEditor] = useState<{ task: Task | null } | null>(null),
    [dragged, setDragged] = useState(""),
    [dropStage, setDropStage] = useState("");
  const [error, setError] = useState("");
  const today = dayKey(new Date());
  const canEdit = (task: Task) =>
    canParticipate &&
    (canManage ||
      task.created_by === userId ||
      !task.assignee_id ||
      task.assignee_id === userId);
  const visible = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            (project === "all" ||
              (project === "none"
                ? !task.project_id
                : task.project_id === project)) &&
            (!mine || task.assignee_id === userId) &&
            `${task.title} ${task.description}`
              .toLocaleLowerCase("pt-BR")
              .includes(query.toLocaleLowerCase("pt-BR").trim()),
        )
        .sort((a, b) => {
          const rank = { high: 0, normal: 1, low: 2 };
          return (
            rank[a.priority as keyof typeof rank] -
              rank[b.priority as keyof typeof rank] ||
            (a.due_on || "9999").localeCompare(b.due_on || "9999") ||
            b.created_at.localeCompare(a.created_at) ||
            a.id.localeCompare(b.id)
          );
        }),
    [tasks, project, mine, query, userId],
  );
  async function move(task: Task, status: string) {
    if (task.status === status || busy || !canEdit(task)) return;
    setError((await props.onMove(task, status)) || "");
  }
  return (
    <section className="task-board" aria-label="Quadro de tarefas">
      <div className="board-toolbar">
        <div className="board-filters">
          <label className="board-search">
            <MagnifyingGlass size={17} />
            <input
              aria-label="Buscar tarefas"
              placeholder="Buscar uma tarefa…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="board-project">
            <span className="sr-only">Filtrar por projeto</span>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <option value="all">Todos os projetos</option>
              <option value="none">Sem projeto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              {project !== "all" &&
                project !== "none" &&
                !projects.some((p) => p.id === project) && (
                  <option value={project}>Projeto arquivado</option>
                )}
            </select>
          </label>
          <button
            className={`outline-button board-mine ${mine ? "selected" : ""}`}
            aria-pressed={mine}
            onClick={() => setMine(!mine)}
          >
            Atribuídas a mim
          </button>
        </div>
        {canParticipate && (
          <button
            className="primary-button"
            disabled={busy}
            onClick={() => setEditor({ task: null })}
          >
            <Plus size={17} />
            Nova tarefa
          </button>
        )}
      </div>
      <div className="board-summary">
        <span>
          <Columns size={16} />
          {visible.length} {visible.length === 1 ? "tarefa" : "tarefas"}
          {mine ? " para você" : " no quadro"}
        </span>
        <span>Prioridade e prazo primeiro</span>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
          <button className="text-button" onClick={() => setError("")}>
            Fechar aviso
          </button>
        </div>
      )}
      <div className="board-columns">
        {stages.map((stage) => {
          const cards = visible.filter((task) => task.status === stage.id);
          return (
            <section
              key={stage.id}
              className={`board-column board-${stage.id} ${dropStage === stage.id ? "board-drop-target" : ""}`}
              aria-label={stage.label}
              onDragOver={(e) => {
                if (dragged && !busy) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropStage(stage.id);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setDropStage("");
              }}
              onDrop={(e) => {
                e.preventDefault();
                const task = tasks.find((t) => t.id === dragged);
                setDragged("");
                setDropStage("");
                if (task) void move(task, stage.id);
              }}
            >
              <div className="board-column-heading">
                <h2>
                  <stage.icon size={18} />
                  {stage.label}
                </h2>
                <span>{cards.length}</span>
              </div>
              <div className="board-card-list">
                {cards.map((task) => {
                  const person = people.find((p) => p.id === task.assignee_id),
                    projectName = projects.find(
                      (p) => p.id === task.project_id,
                    )?.name;
                  const running = activeTimer?.task_id === task.id;
                  const editable = canEdit(task),
                    overdue =
                      task.due_on &&
                      task.due_on < today &&
                      task.status !== "done";
                  return (
                    <article
                      key={task.id}
                      className={`task-card ${running ? "task-running" : ""} ${dragged === task.id ? "task-dragging" : ""}`}
                      draggable={editable && !busy}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", task.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragged(task.id);
                      }}
                      onDragEnd={() => {
                        setDragged("");
                        setDropStage("");
                      }}
                    >
                      <div className="task-card-top">
                        <span className="task-project">
                          {projectName ||
                            (task.project_id
                              ? "Projeto arquivado"
                              : "Sem projeto")}
                        </span>
                        {task.priority !== "normal" && (
                          <span
                            className={`task-priority priority-${task.priority}`}
                          >
                            <Flag
                              size={12}
                              weight={
                                task.priority === "high" ? "fill" : "regular"
                              }
                            />
                            {priorities[task.priority]}
                          </span>
                        )}
                      </div>
                      <button
                        className="task-title"
                        onClick={() => setEditor({ task })}
                      >
                        {task.title}
                      </button>
                      {task.description && (
                        <p className="task-preview">{task.description}</p>
                      )}
                      <div className="task-metadata">
                        <span className={overdue ? "task-overdue" : ""}>
                          {task.due_on ? (
                            <>
                              <CalendarBlank size={14} />
                              {new Date(
                                `${task.due_on}T12:00:00`,
                              ).toLocaleDateString("pt-BR", {
                                day: "numeric",
                                month: "short",
                              })}
                              {overdue && " · Atrasada"}
                            </>
                          ) : (
                            "Sem prazo"
                          )}
                        </span>
                        {person ? (
                          <PersonAvatar
                            name={person.display_name}
                            id={person.id}
                            size="small"
                          />
                        ) : (
                          <span className="task-unassigned">
                            {task.assignee_id
                              ? "Pessoa inativa"
                              : "Sem responsável"}
                          </span>
                        )}
                      </div>
                      <div className="task-card-actions">
                        <label>
                          <span className="sr-only">
                            Andamento de {task.title}
                          </span>
                          <select
                            value={task.status}
                            disabled={!editable || busy}
                            onChange={(e) => void move(task, e.target.value)}
                          >
                            {stages.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {running ? (
                          <button
                            className="task-timer-button is-running"
                            disabled={busy}
                            onClick={async () =>
                              setError((await props.onStop()) || "")
                            }
                            aria-label={`Parar timer de ${task.title}`}
                          >
                            <Stop size={14} weight="fill" />
                            Parar
                          </button>
                        ) : task.status !== "done" && canParticipate ? (
                          <button
                            className="task-timer-button"
                            disabled={busy || Boolean(activeTimer)}
                            title={
                              activeTimer
                                ? "Pare o timer atual antes de iniciar outro"
                                : "Iniciar registro de horas"
                            }
                            onClick={async () =>
                              setError((await props.onStart(task)) || "")
                            }
                            aria-label={`Iniciar timer de ${task.title}`}
                          >
                            <Play size={14} weight="fill" />
                            Iniciar
                          </button>
                        ) : (
                          <span className="task-finished">
                            <CheckCircle size={15} />
                            {task.status === "done" ? "Concluída" : "Consulta"}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
                {!cards.length && (
                  <div className="board-empty">
                    <stage.icon size={23} />
                    <p>
                      {query || mine || project !== "all"
                        ? "Nenhuma tarefa neste filtro."
                        : stage.id === "todo"
                          ? "Seu próximo trabalho começa aqui."
                          : stage.id === "in_progress"
                            ? "O que estiver em foco aparece aqui."
                            : "As entregas do time ficam aqui."}
                    </p>
                    {stage.id === "todo" && canParticipate && (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => setEditor({ task: null })}
                      >
                        Criar tarefa
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <p className="board-help">
        <Timer size={15} />
        Inicie as horas no card. Mover ou concluir uma tarefa não encerra o
        timer.
      </p>
      {editor && (
        <TaskEditor
          key={editor.task?.id || "new"}
          task={editor.task}
          editable={!editor.task ? canParticipate : canEdit(editor.task)}
          canArchive={Boolean(
            editor.task &&
              canParticipate &&
              (canManage || editor.task.created_by === userId),
          )}
          projects={projects}
          people={people}
          initialProject={
            project !== "all" && project !== "none" ? project : ""
          }
          busy={busy}
          onClose={() => setEditor(null)}
          onSave={props.onSave}
          onArchive={props.onArchive}
        />
      )}
    </section>
  );
}
function TaskEditor({
  task,
  editable,
  canArchive,
  projects,
  people,
  initialProject,
  busy,
  onClose,
  onSave,
  onArchive,
}: {
  task: Task | null;
  editable: boolean;
  canArchive: boolean;
  projects: Props["projects"];
  people: Person[];
  initialProject: string;
  busy: boolean;
  onClose: () => void;
  onSave: Props["onSave"];
  onArchive: Props["onArchive"];
}) {
  const [error, setError] = useState(""),
    [confirmArchive, setConfirmArchive] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (name: string) => String(form.get(name) || "");
    const result = await onSave({
      id: task?.id,
      version: task?.version,
      title: value("title").trim(),
      description: value("description"),
      projectId: value("project"),
      assigneeId: value("assignee"),
      dueOn: value("due"),
      priority: value("priority"),
    });
    if (result) setError(result);
    else onClose();
  }
  return (
    <HubDialog
      title={task ? "Detalhes da tarefa" : "Nova tarefa"}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <form className="dialog-form" onSubmit={(e) => void submit(e)}>
        <fieldset className="task-fields" disabled={!editable || busy}>
          <label>
            Título
            <input
              name="title"
              required
              maxLength={180}
              defaultValue={task?.title || ""}
              placeholder="O que precisa ser feito?"
              autoFocus
            />
          </label>
          <label>
            Descrição
            <textarea
              name="description"
              rows={4}
              maxLength={10000}
              defaultValue={task?.description || ""}
              placeholder="Contexto, passos e o que define uma entrega pronta."
            />
          </label>
          <div className="form-row">
            <label>
              Projeto
              <select
                name="project"
                defaultValue={task?.project_id || initialProject}
              >
                <option value="">Sem projeto</option>
                {projects.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
                {task?.project_id &&
                  !projects.some((p) => p.id === task.project_id) && (
                    <option value={task.project_id}>Projeto arquivado</option>
                  )}
              </select>
            </label>
            <label>
              Responsável
              <select name="assignee" defaultValue={task?.assignee_id || ""}>
                <option value="">Sem responsável</option>
                {people.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.display_name}
                  </option>
                ))}
                {task?.assignee_id &&
                  !people.some((p) => p.id === task.assignee_id) && (
                    <option value={task.assignee_id}>Pessoa inativa</option>
                  )}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Prazo
              <input type="date" name="due" defaultValue={task?.due_on || ""} />
            </label>
            <label>
              Prioridade
              <select name="priority" defaultValue={task?.priority || "normal"}>
                {Object.entries(priorities).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        {!editable && (
          <p className="muted">
            Você pode consultar esta tarefa. A edição é permitida ao criador,
            responsável e liderança do time; tarefas sem responsável são
            colaborativas.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {confirmArchive && (
          <div className="task-archive-confirm" role="alert">
            <p>
              Arquivar remove a tarefa do quadro. Os registros de horas são
              preservados e um timer ativo continua contando.
            </p>
            <div>
              <button
                type="button"
                className="outline-button"
                disabled={busy}
                onClick={() => setConfirmArchive(false)}
              >
                Voltar
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={busy}
                onClick={async () => {
                  if (!task) return;
                  const result = await onArchive(task);
                  if (result) setError(result);
                  else onClose();
                }}
              >
                Confirmar arquivamento
              </button>
            </div>
          </div>
        )}
        <div className="dialog-actions">
          {canArchive && !confirmArchive && (
            <button
              type="button"
              className="text-button task-archive"
              disabled={busy}
              onClick={() => setConfirmArchive(true)}
            >
              <Archive size={16} />
              Arquivar
            </button>
          )}
          <button
            type="button"
            className="outline-button"
            disabled={busy}
            onClick={onClose}
          >
            {editable ? "Cancelar" : "Fechar"}
          </button>
          {editable && !confirmArchive && (
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Salvando…" : task ? "Salvar alterações" : "Criar tarefa"}
            </button>
          )}
        </div>
      </form>
    </HubDialog>
  );
}
