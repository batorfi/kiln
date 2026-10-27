// `kiln.row` — the shell of one feature (CORE-2): it runs its scripted list of units one after another and completes when they have. r14 replaces the script with the real walk of the flow and r18
// with the director; here it only proves that a task can own tasks, wait for them, and resume mid-list. Creating the child and parking on it are ONE commit, so a kill never leaves an orphan.
import type { Services } from "../services.ts";
import { defineKilnTask, type TaskKind } from "../store.ts";
import type { JSON, TaskId } from "../types.ts";
import type { RowInput } from "./validate.ts";

type RowCheckpoint = { phase: "run"; index: number; unitIds: TaskId[] } | { phase: "collect"; index: number; unitIds: TaskId[] };
type RowResult = { units: number; results: JSON[] };

export function rowKind(_s: Services): TaskKind<RowInput, RowCheckpoint, RowResult> {
  return defineKilnTask<RowInput, RowCheckpoint, RowResult>({
    name: "kiln.row",
    version: 1,
    initial: () => ({ phase: "run", index: 0, unitIds: [] }),
    phases: {
      run: async (task, run) => {
        const { index, unitIds } = task.checkpoint;
        const script = task.input.script;
        if (index >= script.length) {
          const outcomes = unitIds.length ? await run.outcomes(unitIds) : [];
          await run.commit(() => ({ status: "terminal", outcome: { status: "completed", result: { units: unitIds.length, results: outcomes.map((o) => (o.status === "completed" ? o.result : null)) } } }));
          return;
        }
        await run.commit(async (tx) => {
          const id = await tx.createTask("kiln.unit", script[index] as unknown as JSON, { kind: "task", taskId: task.id });
          return { status: "waiting", checkpoint: { phase: "collect", index, unitIds: [...unitIds, id] }, on: [id] };
        });
      },
      collect: async (task, run) => {
        const last = task.checkpoint.unitIds[task.checkpoint.unitIds.length - 1];
        const [o] = await run.outcomes([last]);
        if (o.status !== "completed") {
          await run.commit(() => ({ status: "terminal", outcome: { status: "failed", message: `unit ${last} ended ${o.status}` } }));
          return;
        }
        await run.commit(() => ({ status: "running", checkpoint: { phase: "run", index: task.checkpoint.index + 1, unitIds: task.checkpoint.unitIds } }));
      },
    },
    abort: async (_task, run) => {
      await run.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }));
    },
  });
}
