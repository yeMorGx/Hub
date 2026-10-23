"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Columns } from "@phosphor-icons/react";
import { moveBoardTask } from "@/lib/hub/kanban";
import { LiveBoard, type Task } from "./live-board";
import type { Person } from "@/lib/hub/types";
const stamp = "2026-10-20T12:00:00Z";
const people: Person[] = [
  {
    id: "demo-rafael",
    display_name: "Rafael Costa",
    role: "leader",
    avatar_url: null,
    last_seen_at: null,
    body: "",
    timer_running: false,
    created_at: stamp,
    updated_at: stamp,
  },
  {
    id: "demo-marina",
    display_name: "Marina Alves",
    role: "member",
    avatar_url: null,
    last_seen_at: null,
    body: "",
    timer_running: false,
    created_at: stamp,
    updated_at: stamp,
  },
  {
    id: "demo-lucas",
    display_name: "Lucas Santos",
    role: "member",
    avatar_url: null,
    last_seen_at: null,
    body: "",
    timer_running: false,
    created_at: stamp,
    updated_at: stamp,
  },
];
const projects = [
  { id: "demo-site", name: "Website institucional" },
  { id: "demo-app", name: "Aplicativo mobile" },
  { id: "demo-system", name: "Design system" },
];
const initial: Task[] = [
  {
    title: "Mapear o primeiro acesso",
    description:
      "Definir os passos entre o convite e a primeira conversa com o time.",
    status: "todo",
    priority: "high",
    project_id: "demo-app",
    assignee_id: "demo-marina",
    due_on: "2026-10-22",
  },
  {
    title: "Revisar estados dos componentes",
    description:
      "Foco, erro, carregamento e conteúdo vazio nos campos de formulário.",
    status: "todo",
    priority: "normal",
    project_id: "demo-system",
    assignee_id: null,
    due_on: "2026-10-23",
  },
  {
    title: "Construir a página de projetos",
    description: "Conectar o conteúdo aprovado e ajustar a leitura no celular.",
    status: "in_progress",
    priority: "high",
    project_id: "demo-site",
    assignee_id: "demo-rafael",
    due_on: "2026-10-21",
  },
  {
    title: "Organizar os tokens de cor",
    description:
      "Publicar os nomes semânticos e os contrastes de cada superfície.",
    status: "in_progress",
    priority: "normal",
    project_id: "demo-system",
    assignee_id: "demo-lucas",
    due_on: null,
  },
  {
    title: "Alinhar a estrutura da navegação",
    description:
      "Mapa de páginas revisado com o time e pronto para implementação.",
    status: "done",
    priority: "normal",
    project_id: "demo-site",
    assignee_id: "demo-marina",
    due_on: "2026-10-19",
  },
].map((task, index) => ({
  ...task,
  id: `demo-task-${index}`,
  team_id: "demo-team",
  created_by: "demo-rafael",
  version: 1,
  sort_order: index * 1024,
  archived_at: null,
  created_at: stamp,
  updated_at: stamp,
}));
export function BoardDemo({ embedded = false }: { embedded?: boolean }) {
  const [tasks, setTasks] = useState(initial),
    [active, setActive] = useState<
      { id: string; task_id: string } | undefined
    >();
  const Frame = embedded ? "div" : "main";
  return (
    <Frame className={embedded ? "board-preview" : "kanban-demo live-app"}>
      {!embedded && (
        <>
          <header>
            <Link href="/demo" className="text-button">
              <ArrowLeft size={16} />
              Voltar à demonstração
            </Link>
            <span>Demonstração · dados fictícios, sem acesso ao Supabase</span>
          </header>
          <div className="page-heading">
            <div>
              <h1>
                Tarefas<span className="heading-period">.</span>
              </h1>
              <p>Do próximo passo à entrega, com o tempo registrado.</p>
            </div>
            <Columns size={28} />
          </div>
        </>
      )}
      <LiveBoard
        tasks={tasks}
        projects={projects}
        people={people}
        userId="demo-rafael"
        canParticipate
        canManage
        busy={false}
        activeTimer={active}
        onSave={async (input) => {
          setTasks((current) =>
            input.id
              ? current.map((task) =>
                  task.id === input.id
                    ? {
                        ...task,
                        title: input.title,
                        description: input.description,
                        project_id: input.projectId || null,
                        assignee_id: input.assigneeId || null,
                        due_on: input.dueOn || null,
                        priority: input.priority,
                        version: task.version + 1,
                      }
                    : task,
                )
              : [
                  ...current,
                  {
                    ...initial[0],
                    id: crypto.randomUUID(),
                    title: input.title,
                    description: input.description,
                    project_id: input.projectId || null,
                    assignee_id: input.assigneeId || null,
                    due_on: input.dueOn || null,
                    priority: input.priority,
                    status: "todo",
                    version: 1,
                  },
                ],
          );
          return null;
        }}
        onMove={async (task, status, placement) => {
          setTasks((current) =>
            moveBoardTask(current, task.id, status, placement?.beforeId).map(
              (t, index) => ({
                ...t,
                sort_order: index * 1024,
                version: t.id === task.id ? t.version + 1 : t.version,
              }),
            ),
          );
          return null;
        }}
        onArchive={async (task) => {
          setTasks((current) => current.filter((t) => t.id !== task.id));
          return null;
        }}
        onStart={async (task) => {
          setActive({ id: "demo-timer", task_id: task.id });
          setTasks((current) =>
            current.map((t) =>
              t.id === task.id && t.status === "todo"
                ? { ...t, status: "in_progress", version: t.version + 1 }
                : t,
            ),
          );
          return null;
        }}
        onStop={async () => {
          setActive(undefined);
          return null;
        }}
      />
    </Frame>
  );
}
