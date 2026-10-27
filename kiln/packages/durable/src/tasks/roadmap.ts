// `kiln.roadmap` — holds THE ROADMAP GATE (CORE-2, constitution VI). It opens gate0 through the same gate API as every other gate and waits on its gate task; it settles with the person's move.
// It has NO delegation field, by construction: its input is exactly `{factory}` (anything else is refused by `tasks.create`, see validate.ts), and no code path here settles the gate.
// Opening is keyed by the task's own id, so a kill between "gate opened" and "task parked" re-runs into a `repeat`, never a second gate.
import { openGate } from "../gate/open.ts";
import type { MoveDocData } from "../gate/documents.ts";
import type { Services } from "../services.ts";
import { defineKilnTask, type TaskKind } from "../store.ts";
import type { TaskId } from "../types.ts";
import type { RoadmapInput } from "./validate.ts";

type RoadmapCheckpoint = { phase: "open" } | { phase: "decide"; gateId: string; gateTaskId: TaskId };
type RoadmapResult = { gateId: string; moveKind: string; key: string };

export function roadmapKind(s: Services): TaskKind<RoadmapInput, RoadmapCheckpoint, RoadmapResult> {
  return defineKilnTask<RoadmapInput, RoadmapCheckpoint, RoadmapResult>({
    name: "kiln.roadmap",
    version: 1,
    initial: () => ({ phase: "open" }),
    phases: {
      open: async (task, run) => {
        const gateId = `gate:${task.input.factory}:gate0:${task.id}`;
        const opened = await openGate(s, `roadmap-gate:${task.id}`, { gateId, gateKey: "gate0", flow: "v2", brief: { kind: "roadmap", factory: task.input.factory }, openedBy: `task:${task.id}` });
        if (opened.status === "refused") throw new Error(`the Roadmap gate could not be opened: ${opened.reason} ${opened.detail ?? ""}`);
        await run.commit(() => ({ status: "waiting", checkpoint: { phase: "decide", gateId, gateTaskId: opened.taskId }, on: [opened.taskId] }));
      },
      decide: async (task, run) => {
        const move = (await s.store.snapshot<MoveDocData>("kiln.move", task.checkpoint.gateId))?.record;
        if (!move) throw new Error("the Roadmap gate's task ended without a move: nothing settles this gate but a person's committed move");
        await run.commit(() => ({ status: "terminal", outcome: { status: "completed", result: { gateId: task.checkpoint.gateId, moveKind: move.move.kind, key: move.key } } }));
      },
    },
    abort: async (_task, run) => {
      await run.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }));
    },
  });
}
