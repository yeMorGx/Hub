// Browser-only, isolated fixture: no Supabase client, auth, email or business writes.
import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "react-aria-components";
import { LiveBoard, type Task } from "../../components/live-board";
import { DashboardUIProvider } from "../../components/dashboard-ui";
import { createBoardDemoTasks } from "../../lib/hub/demo-board";
import { moveBoardTask, type TaskPlacement } from "../../lib/hub/kanban";
function Harness() {
  const [tasks, setTasks] = useState(() => createBoardDemoTasks(Number(document.documentElement.dataset.kanbanCards) || 60)),
    [last, setLast] = useState(""),
    [failure, setFailure] = useState(false);
  const move = useCallback(
    async (task: Task, status: string, placement?: TaskPlacement) => {
      if (failure) return "Falha de persistência simulada. Posição restaurada.";
      setTasks((current) =>
        moveBoardTask(current, task.id, status, placement?.beforeId).map(
          (t, i) => ({
            ...t,
            sort_order: i * 1024,
            version: t.id === task.id ? t.version + 1 : t.version,
          }),
        ),
      );
      setLast(JSON.stringify({ id: task.id, status, ...placement }));
      return null;
    },
    [failure],
  );
  return (
    <I18nProvider locale="pt-BR">
      <DashboardUIProvider enabled>
        <main className="live-app workspace-inset" style={{ padding: 24 }}>
          <button id="fail-next" onClick={() => setFailure(!failure)}>
            Simular falha
          </button>
          <output id="drop-result">{last}</output>
          <LiveBoard
            tasks={tasks}
            projects={[]}
            people={[]}
            userId="demo"
            canParticipate
            canManage
            busy={false}
            activeTimer={undefined}
            onMove={move}
            onSave={async () => null}
            onArchive={async () => null}
            onStart={async () => null}
            onStop={async () => null}
          />
          <output id="persisted-board">
            {JSON.stringify(
              tasks.map(({ id, status, sort_order }) => ({
                id,
                status,
                sort_order,
              })),
            )}
          </output>
        </main>
      </DashboardUIProvider>
    </I18nProvider>
  );
}
createRoot(document.getElementById("kanban-harness")!).render(<Harness />);
