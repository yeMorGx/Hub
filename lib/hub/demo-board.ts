import type { BoardTask } from "./kanban";
export function createBoardDemoTasks(count = 6): BoardTask[] {
  const titles = [
    "Revisar a navegação",
    "Documentar componentes",
    "Preparar apresentação",
    "Validar fluxo de entrada",
    "Organizar biblioteca",
    "Publicar versão",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `demo-task-${i + 1}`,
    team_id: "demo",
    created_by: "demo",
    assignee_id: null,
    project_id: null,
    title: titles[i] ?? `Atividade de demonstração ${i + 1}`,
    description:
      i === 0 ? "Confira o fluxo e os estados antes da revisão do time." : "",
    status: i % 3 === 0 ? "todo" : i % 3 === 1 ? "in_progress" : "done",
    sort_order: Math.floor(i / 3) * 1024,
    priority: i === 0 ? "high" : "normal",
    due_on: null,
    version: 1,
    archived_at: null,
    created_at: "2026-10-23T09:00:00Z",
    updated_at: "2026-10-23T09:00:00Z",
  }));
}
