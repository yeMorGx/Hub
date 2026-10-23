import type { Row } from "./types";
export type BoardTask = Row<"tasks"> & { sort_order?: number };
export type TaskPlacement = { beforeId?: string; afterId?: string };
export const BOARD_STAGES = ["todo", "in_progress", "done"] as const;
export function orderedTasks(tasks: BoardTask[]) {
  const rank: Record<string, number> = { high: 0, normal: 1, low: 2 };
  return [...tasks].sort(
    (a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
      rank[a.priority] - rank[b.priority] ||
      (a.due_on || "9999").localeCompare(b.due_on || "9999") ||
      b.created_at.localeCompare(a.created_at) ||
      a.id.localeCompare(b.id),
  );
}
export function moveBoardTask(
  tasks: BoardTask[],
  activeId: string,
  status: string,
  overId?: string,
) {
  const active = tasks.find((t) => t.id === activeId);
  if (
    !active ||
    !BOARD_STAGES.includes(status as (typeof BOARD_STAGES)[number]) ||
    overId === activeId
  )
    return tasks;
  const next = tasks.filter((t) => t.id !== activeId);
  const target = overId
    ? next.findIndex((t) => t.id === overId && t.status === status)
    : -1;
  const last = next.findLastIndex((t) => t.status === status);
  next.splice(target >= 0 ? target : last >= 0 ? last + 1 : next.length, 0, {
    ...active,
    status,
  });
  return next;
}
export function taskPlacement(tasks: BoardTask[], id: string): TaskPlacement {
  const task = tasks.find((t) => t.id === id);
  if (!task) return {};
  const column = tasks.filter((t) => t.status === task.status),
    index = column.findIndex((t) => t.id === id);
  return { afterId: column[index - 1]?.id, beforeId: column[index + 1]?.id };
}
