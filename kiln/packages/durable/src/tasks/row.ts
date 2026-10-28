// `kiln.row` — one feature (CORE-2). Two forms, exactly one per task:
//   · the SCRIPT form (r13): it runs its scripted list of units one after another and completes when they have — it only proves that a task can own tasks, wait for them, and resume mid-list.
//   · the WALK form (r14): the real walk of the flow, a state machine whose whole state is the checkpoint (walk/walk.ts). "r14 replaces the script with the real walk of the flow and r18 with the director."
// Creating a child and parking on it are ONE commit, so a kill never leaves an orphan.
import type { Services } from "../services.ts";
import { defineKilnTask, type TaskKind } from "../store.ts";
import type { JSON, TaskId } from "../types.ts";
import * as walk from "../walk/walk.ts";
import type { RowInput } from "./validate.ts";

type ScriptCheckpoint = { phase: "run"; index: number; unitIds: TaskId[] } | { phase: "collect"; index: number; unitIds: TaskId[] };
type RowCheckpoint = ScriptCheckpoint | walk.WalkCheckpoint;
type ScriptResult = { units: number; results: JSON[] };
type RowResult = ScriptResult | walk.WalkResult;

export function rowKind(s: Services): TaskKind<RowInput, RowCheckpoint, RowResult> {
  // The script form's handlers read `script`; a row created with `walk` never enters them (its initial phase is `admit`).
  const scriptOf = (input: RowInput) => (input as { script: import("./validate.ts").UnitSpec[] }).script;
  return defineKilnTask<RowInput, RowCheckpoint, RowResult>({
    name: "kiln.row",
    version: 1,
    initial: (input) => ("walk" in input && input.walk ? { phase: "admit", round: 1 } : { phase: "run", index: 0, unitIds: [] }),
    phases: {
      run: async (task, run) => {
        const { index, unitIds } = task.checkpoint;
        const script = scriptOf(task.input);
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
      admit: (task, run) => walk.admit(s, task as never, run),
      admission: (task, run) => walk.admission(s, task as never, run),
      pin: (task, run) => walk.pin(s, task as never, run),
      work: (task, run) => walk.work(s, task as never, run),
      verify: (task, run) => walk.verify(s, task as never, run),
      open: (task, run) => walk.open(s, task as never, run),
      decide: (task, run) => walk.decide(s, task as never, run),
    },
    abort: async (_task, run) => {
      await run.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }));
    },
  });
}
