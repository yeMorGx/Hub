import assert from "node:assert/strict";
import test from "node:test";
import { moveBoardTask, orderedTasks, taskPlacement } from "../lib/hub/kanban";
import { createBoardDemoTasks } from "../lib/hub/demo-board";
test("moving across columns preserves ids and supplies final neighbors", () => {
  const tasks = createBoardDemoTasks();
  const moved = moveBoardTask(tasks, tasks[0].id, "in_progress", tasks[1].id);
  assert.equal(moved.length, tasks.length);
  assert.equal(new Set(moved.map((t) => t.id)).size, tasks.length);
  assert.equal(moved.find((t) => t.id === tasks[0].id)?.status, "in_progress");
  assert.equal(taskPlacement(moved, tasks[0].id).beforeId, tasks[1].id);
  assert.equal(tasks[0].status, "todo");
});
test("append and cancel snapshots preserve other cards", () => {
  const tasks = createBoardDemoTasks();
  const moved = moveBoardTask(tasks, tasks[0].id, "done");
  assert.equal(taskPlacement(moved, tasks[0].id).beforeId, undefined);
  assert.equal(taskPlacement(moved, tasks[0].id).afterId, tasks[5].id);
  assert.equal(
    moved.find((t) => t.id === tasks[1].id),
    tasks[1],
  );
  assert.equal(moveBoardTask(tasks, tasks[0].id, "unknown"), tasks);
});
test("persisted order takes priority over automatic priority sorting", () => {
  const tasks = createBoardDemoTasks(60);
  tasks[0].sort_order = 99999;
  const ordered = orderedTasks(tasks);
  assert.equal(ordered.at(-1)?.id, tasks[0].id);
  assert.equal(ordered.length, 60);
});
