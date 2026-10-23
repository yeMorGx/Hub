"use client";
import { ZuluForm, ZuluFieldset } from "./dashboard-ui";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useReducedMotion } from "motion/react";
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
import {
  ZuluButton,
  ZuluInput,
  ZuluLabel,
  ZuluSelect,
  ZuluTextArea,
} from "./dashboard-ui";
import {
  BoardColumn,
  BoardPointerSensor,
  BoardTouchSensor,
  KANBAN_PHYSICS,
  PhysicsCard,
  SortableTask,
} from "./kanban-dnd";
import {
  moveBoardTask,
  orderedTasks,
  taskPlacement,
  type BoardTask,
  type TaskPlacement,
} from "@/lib/hub/kanban";
import { dayKey } from "@/lib/hub/dates";
import type { Person, Row } from "@/lib/hub/types";
export type Task = BoardTask;
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
  onMove: (task: Task, status: string, placement?: TaskPlacement) => Operation;
  onArchive: (task: Task) => Operation;
  onStart: (task: Task) => Operation;
  onStop: () => Operation;
};
const mayEdit = (task: Task, p: Props) =>
  p.canParticipate &&
  (p.canManage ||
    task.created_by === p.userId ||
    !task.assignee_id ||
    task.assignee_id === p.userId);

export function LiveBoard(props: Props) {
  const [query, setQuery] = useState(""),
    [project, setProject] = useState("all"),
    [mine, setMine] = useState(false),
    [editor, setEditor] = useState<{ task: Task | null } | null>(null),
    [error, setError] = useState("");
  const [board, setBoard] = useState(() => orderedTasks(props.tasks)),
    [activeId, setActiveId] = useState<string | null>(null),
    [saving, setSaving] = useState(false),
    [targetStage, setTargetStage] = useState("");
  const latest = useRef(props);
  latest.current = props;
  const snapshot = useRef<Task[]>([]);
  const boardRef = useRef(board);
  boardRef.current = board;
  const locked = useRef(false);
  const reduced = useReducedMotion();
  const sensors = useSensors(
    useSensor(BoardPointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(BoardTouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  useEffect(() => {
    if (!activeId && !saving) setBoard(orderedTasks(props.tasks));
  }, [props.tasks, activeId, saving]);
  const visible = useMemo(
    () =>
      board.filter(
        (task) =>
          (project === "all" ||
            (project === "none"
              ? !task.project_id
              : task.project_id === project)) &&
          (!mine || task.assignee_id === props.userId) &&
          `${task.title} ${task.description}`
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR").trim()),
      ),
    [board, project, mine, query, props.userId],
  );
  const projectNames = useMemo(
    () => new Map(props.projects.map((p) => [p.id, p.name])),
    [props.projects],
  );
  const people = useMemo(
    () => new Map(props.people.map((p) => [p.id, p])),
    [props.people],
  );
  const edit = useCallback((task: Task) => setEditor({ task }), []);
  const move = useCallback(async (task: Task, status: string) => {
    const p = latest.current;
    if (task.status === status || p.busy || locked.current || !mayEdit(task, p))
      return;
    locked.current = true;
    try {
      setError((await p.onMove(task, status)) || "");
    } catch {
      setError("Não foi possível mover a tarefa. Tente novamente.");
    } finally {
      locked.current = false;
    }
  }, []);
  const start = useCallback(async (task: Task) => {
    try {
      setError((await latest.current.onStart(task)) || "");
    } catch {
      setError("Não foi possível iniciar o timer.");
    }
  }, []);
  const stop = useCallback(async () => {
    try {
      setError((await latest.current.onStop()) || "");
    } catch {
      setError("Não foi possível parar o timer.");
    }
  }, []);
  const cancel = useCallback(() => {
    setBoard(snapshot.current);
    setActiveId(null);
    setTargetStage("");
  }, []);
  const dragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return;
    const current = boardRef.current;
    const task = current.find((t) => t.id === String(active.id));
    const status =
      current.find((t) => t.id === String(over.id))?.status ?? String(over.id);
    if (!task || !stages.some((s) => s.id === status)) return;
    setTargetStage(status);
    if (task.status !== status) {
      const next = moveBoardTask(
        current,
        task.id,
        status,
        current.some((t) => t.id === String(over.id))
          ? String(over.id)
          : undefined,
      );
      boardRef.current = next;
      setBoard(next);
    }
  }, []);
  const dragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      if (!over) {
        cancel();
        return;
      }
      const current = boardRef.current,
        task = current.find((t) => t.id === String(active.id)),
        original = snapshot.current.find((t) => t.id === String(active.id));
      if (!task || !original) {
        cancel();
        return;
      }
      const status =
        current.find((t) => t.id === String(over.id))?.status ??
        String(over.id);
      if (!stages.some((s) => s.id === status)) {
        cancel();
        return;
      }
      let next = current;
      if (task.status !== status)
        next = moveBoardTask(current, task.id, status, String(over.id));
      else {
        const column = current.filter((t) => t.status === status),
          from = column.findIndex((t) => t.id === task.id),
          to = column.findIndex((t) => t.id === String(over.id));
        if (to >= 0 && from !== to) {
          const reordered = arrayMove(column, from, to);
          let index = 0;
          next = current.map((t) =>
            t.status === status ? reordered[index++] : t,
          );
        }
      }
      const before = taskPlacement(snapshot.current, task.id),
        after = taskPlacement(next, task.id),
        changed =
          original.status !== status ||
          before.afterId !== after.afterId ||
          before.beforeId !== after.beforeId;
      setBoard(next);
      setActiveId(null);
      setTargetStage("");
      if (!changed) return;
      locked.current = true;
      setSaving(true);
      setError("");
      try {
        const result = await latest.current.onMove(original, status, after);
        if (result) {
          setError(result);
          setBoard(snapshot.current);
        }
      } catch {
        setError("Não foi possível salvar a posição. O quadro foi restaurado.");
        setBoard(snapshot.current);
      } finally {
        locked.current = false;
        setSaving(false);
      }
    },
    [cancel],
  );
  const active = board.find((t) => t.id === activeId);
  const busy = props.busy || saving;
  const renderCard = (task: Task, overlay = false) => (
    <KanbanCard
      task={task}
      projectName={projectNames.get(task.project_id ?? "")}
      person={people.get(task.assignee_id ?? "")}
      editable={mayEdit(task, props)}
      busy={busy}
      running={props.activeTimer?.task_id === task.id}
      timerActive={Boolean(props.activeTimer)}
      canParticipate={props.canParticipate}
      overlay={overlay}
      onEdit={edit}
      onMove={move}
      onStart={start}
      onStop={stop}
    />
  );
  return (
    <section
      className="task-board"
      aria-label="Quadro de tarefas"
      aria-busy={saving}
      data-lenis-prevent
    >
      <div className="board-toolbar">
        <div className="board-filters">
          <ZuluLabel className="board-search">
            <MagnifyingGlass size={17} />
            <ZuluInput
              aria-label="Buscar tarefas"
              placeholder="Buscar uma tarefa…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={Boolean(activeId)}
            />
          </ZuluLabel>
          <ZuluSelect
            aria-label="Filtrar por projeto"
            value={project}
            onValueChange={setProject}
            disabled={Boolean(activeId)}
          >
            <option value="all">Todos os projetos</option>
            <option value="none">Sem projeto</option>
            {props.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </ZuluSelect>
          <ZuluButton
            type="button"
            className={`outline-button board-mine ${mine ? "selected" : ""}`}
            aria-pressed={mine}
            onClick={() => setMine(!mine)}
            disabled={Boolean(activeId)}
          >
            Atribuídas a mim
          </ZuluButton>
        </div>
        {props.canParticipate && (
          <ZuluButton
            type="button"
            className="primary-button"
            disabled={busy}
            onClick={() => setEditor({ task: null })}
          >
            <Plus size={17} />
            Nova tarefa
          </ZuluButton>
        )}
      </div>
      <div className="board-summary">
        <span>
          <Columns size={16} />
          {visible.length} {visible.length === 1 ? "tarefa" : "tarefas"}
          {mine ? " para você" : " no quadro"}
        </span>
        <span>{saving ? "Salvando posição…" : "Arraste para organizar"}</span>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
          <ZuluButton
            type="button"
            className="text-button"
            onClick={() => setError("")}
          >
            Fechar aviso
          </ZuluButton>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={({ active }) => {
          snapshot.current = boardRef.current;
          setActiveId(String(active.id));
          setError("");
        }}
        onDragOver={dragOver}
        onDragEnd={dragEnd}
        onDragCancel={cancel}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Pressione Espaço para pegar a tarefa. Use as setas para mudar a posição e Espaço para soltar. Escape cancela.",
          },
          announcements: {
            onDragStart: ({ active }) =>
              `Movendo ${boardRef.current.find((t) => t.id === active.id)?.title ?? "tarefa"}.`,
            onDragOver: ({ over }) =>
              over
                ? `Destino: ${stages.find((s) => s.id === (boardRef.current.find((t) => t.id === over.id)?.status ?? over.id))?.label ?? "quadro"}.`
                : undefined,
            onDragEnd: () => "Tarefa solta. A posição será salva.",
            onDragCancel: () => "Movimento cancelado.",
          },
        }}
      >
        <div className="board-columns">
          {stages.map((stage) => {
            const cards = visible.filter((t) => t.status === stage.id);
            return (
              <BoardColumn id={stage.id} label={stage.label} key={stage.id}>
                <div
                  className={`board-column-heading${targetStage === stage.id ? " is-drag-target" : ""}`}
                >
                  <h2>
                    <stage.icon size={18} />
                    {stage.label}
                  </h2>
                  <span>{cards.length}</span>
                </div>
                <SortableContext
                  items={cards.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="board-card-list">
                    {cards.map((task) => (
                      <SortableTask
                        key={task.id}
                        id={task.id}
                        title={task.title}
                        disabled={busy || !mayEdit(task, props)}
                      >
                        {renderCard(task)}
                      </SortableTask>
                    ))}
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
                        {stage.id === "todo" && props.canParticipate && (
                          <ZuluButton
                            type="button"
                            className="text-button"
                            disabled={busy}
                            onClick={() => setEditor({ task: null })}
                          >
                            Criar tarefa
                            <Plus size={14} />
                          </ZuluButton>
                        )}
                      </div>
                    )}
                  </div>
                </SortableContext>
              </BoardColumn>
            );
          })}
        </div>
        {typeof document !== "undefined" &&
          createPortal(
            <DragOverlay
              dropAnimation={{
                duration: reduced ? 150 : KANBAN_PHYSICS.dropDuration,
                easing: reduced ? "ease-out" : KANBAN_PHYSICS.dropEasing,
                sideEffects: defaultDropAnimationSideEffects({
                  styles: { active: { opacity: "0.3" } },
                }),
              }}
            >
              {active && (
                <PhysicsCard>
                  <div className="live-app workspace-inset kanban-overlay-surface">
                    {renderCard(active, true)}
                  </div>
                </PhysicsCard>
              )}
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
      <p className="board-help">
        <Timer size={15} />
        Inicie as horas no card. Mover ou concluir uma tarefa não encerra o
        timer.
      </p>
      {editor && (
        <TaskEditor
          key={editor.task?.id || "new"}
          task={editor.task}
          editable={
            !editor.task ? props.canParticipate : mayEdit(editor.task, props)
          }
          canArchive={Boolean(
            editor.task &&
            props.canParticipate &&
            (props.canManage || editor.task.created_by === props.userId),
          )}
          projects={props.projects}
          people={props.people}
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
const KanbanCard = memo(function KanbanCard({
  task,
  projectName,
  person,
  editable,
  busy,
  running,
  timerActive,
  canParticipate,
  overlay,
  onEdit,
  onMove,
  onStart,
  onStop,
}: {
  task: Task;
  projectName?: string;
  person?: Person;
  editable: boolean;
  busy: boolean;
  running: boolean;
  timerActive: boolean;
  canParticipate: boolean;
  overlay: boolean;
  onEdit: (task: Task) => void;
  onMove: (task: Task, status: string) => void;
  onStart: (task: Task) => void;
  onStop: () => void;
}) {
  const overdue =
    task.due_on && task.due_on < dayKey(new Date()) && task.status !== "done";
  return (
    <article
      className={`task-card${running ? " task-running" : ""}${overlay ? " task-overlay" : ""}`}
    >
      <div className="task-card-top">
        <span className="task-project">
          {projectName ||
            (task.project_id ? "Projeto arquivado" : "Sem projeto")}
        </span>
        {task.priority !== "normal" && (
          <span className={`task-priority priority-${task.priority}`}>
            <Flag
              size={12}
              weight={task.priority === "high" ? "fill" : "regular"}
            />
            {priorities[task.priority]}
          </span>
        )}
      </div>
      <ZuluButton
        type="button"
        className="task-title"
        onClick={() => onEdit(task)}
        disabled={overlay}
      >
        {task.title}
      </ZuluButton>
      {task.description && <p className="task-preview">{task.description}</p>}
      <div className="task-metadata">
        <span className={overdue ? "task-overdue" : ""}>
          {task.due_on ? (
            <>
              <CalendarBlank size={14} />
              {new Date(`${task.due_on}T12:00:00`).toLocaleDateString("pt-BR", {
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
            {task.assignee_id ? "Pessoa inativa" : "Sem responsável"}
          </span>
        )}
      </div>
      <div className="task-card-actions">
        <ZuluSelect
          aria-label={`Andamento de ${task.title}`}
          value={task.status}
          disabled={!editable || busy || overlay}
          onValueChange={(status) => onMove(task, status)}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </ZuluSelect>
        {running ? (
          <ZuluButton
            type="button"
            className="task-timer-button is-running"
            disabled={busy || overlay}
            onClick={onStop}
            aria-label={`Parar timer de ${task.title}`}
          >
            <Stop size={14} weight="fill" />
            Parar
          </ZuluButton>
        ) : task.status !== "done" && canParticipate ? (
          <ZuluButton
            type="button"
            className="task-timer-button"
            disabled={busy || timerActive || overlay}
            onClick={() => onStart(task)}
            aria-label={`Iniciar timer de ${task.title}`}
          >
            <Play size={14} weight="fill" />
            Iniciar
          </ZuluButton>
        ) : (
          <span className="task-finished">
            <CheckCircle size={15} />
            {task.status === "done" ? "Concluída" : "Consulta"}
          </span>
        )}
      </div>
    </article>
  );
});
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
      <ZuluForm className="dialog-form" onSubmit={(e) => void submit(e)}>
        <ZuluFieldset className="task-fields" disabled={!editable || busy}>
          <ZuluLabel>
            Título
            <ZuluInput
              name="title"
              required
              maxLength={180}
              defaultValue={task?.title || ""}
              placeholder="O que precisa ser feito?"
              autoFocus
            />
          </ZuluLabel>
          <ZuluLabel>
            Descrição
            <ZuluTextArea
              name="description"
              rows={4}
              maxLength={10000}
              defaultValue={task?.description || ""}
              placeholder="Contexto, passos e o que define uma entrega pronta."
            />
          </ZuluLabel>
          <div className="form-row">
            <ZuluLabel>
              Projeto
              <ZuluSelect
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
              </ZuluSelect>
            </ZuluLabel>
            <ZuluLabel>
              Responsável
              <ZuluSelect
                name="assignee"
                defaultValue={task?.assignee_id || ""}
              >
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
              </ZuluSelect>
            </ZuluLabel>
          </div>
          <div className="form-row">
            <ZuluLabel>
              Prazo
              <ZuluInput
                type="date"
                name="due"
                defaultValue={task?.due_on || ""}
              />
            </ZuluLabel>
            <ZuluLabel>
              Prioridade
              <ZuluSelect
                name="priority"
                defaultValue={task?.priority || "normal"}
              >
                {Object.entries(priorities).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </ZuluSelect>
            </ZuluLabel>
          </div>
        </ZuluFieldset>
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
              <ZuluButton
                type="button"
                className="outline-button"
                disabled={busy}
                onClick={() => setConfirmArchive(false)}
              >
                Voltar
              </ZuluButton>
              <ZuluButton
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
              </ZuluButton>
            </div>
          </div>
        )}
        <div className="dialog-actions">
          {canArchive && !confirmArchive && (
            <ZuluButton
              type="button"
              className="text-button task-archive"
              disabled={busy}
              onClick={() => setConfirmArchive(true)}
            >
              <Archive size={16} />
              Arquivar
            </ZuluButton>
          )}
          <ZuluButton
            type="button"
            className="outline-button"
            disabled={busy}
            onClick={onClose}
          >
            {editable ? "Cancelar" : "Fechar"}
          </ZuluButton>
          {editable && !confirmArchive && (
            <ZuluButton
              className="primary-button"
              disabled={busy}
              type="submit"
            >
              {busy ? "Salvando…" : task ? "Salvar alterações" : "Criar tarefa"}
            </ZuluButton>
          )}
        </div>
      </ZuluForm>
    </HubDialog>
  );
}
