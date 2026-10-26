// The two tasks of a gate (research R2, from the composition r42 proved):
//   kiln.gate      phase open   — creates its decision child, parks `waiting` on it (the child, not a clock)
//                  phase settle — reads the decision's outcome, appends `gate.settled`, commits terminal
//   kiln.decision  phase wait   — registers a single-shot slot in the owner's memory and awaits it; a move wakes it, and the step performs ONE commit that writes the move record, appends
//                  `move.committed` AND returns the task's own terminal state: the move and the completion are the same commit by construction (a).
// Nothing here sleeps, so there is no timer on a gate or its decision (d, I7). A failed commit is answered `store-error` and the step re-arms its slot — a step never returns without
// durable progress, or the library would fault it.
import { plain } from "../canonical.ts";
import { appendOutbox } from "../outbox.ts";
import type { Services } from "../services.ts";
import { defineKilnTask, type TaskKind } from "../store.ts";
import type { JSON } from "../types.ts";
import type { MoveDocData } from "./documents.ts";
import type { Slot, SlotRequest } from "./slots.ts";

type GateInput = { gateId: string };
type GateCheckpoint = { phase: "open" } | { phase: "settle"; decisionId: string };
type DecisionCheckpoint = { phase: "wait" };

export function gateKinds(s: Services): TaskKind<any, any, any>[] {
  const decision = defineKilnTask<GateInput, DecisionCheckpoint, { key: string }>({
    name: "kiln.decision",
    version: 1,
    initial: () => ({ phase: "wait" }),
    phases: {
      wait: async (task, run) => {
        const gateId = task.input.gateId;
        const slot: Slot = { registered: false, taken: false };
        s.slots.set(gateId, slot);
        try {
          for (;;) {
            await s.hooks.at("wait.before-register");
            // register: from here on a move can reach this step
            const waiting = new Promise<SlotRequest | undefined>((resolve) => {
              if (run.signal.aborted) return resolve(undefined);
              run.signal.addEventListener("abort", () => resolve(undefined), { once: true });
              slot.deliver = resolve;
              slot.registered = true;
            });
            await s.hooks.at("wait.registered");
            const request = await waiting;
            slot.registered = false;
            if (!request) return; // the factory is closing: nothing is committed
            try {
              let lost = false;
              await run.commit(async (tx) => {
                await s.hooks.at("move.commit-begin");
                const md = await tx.doc<MoveDocData>("kiln.move", gateId, { record: null });
                await s.hooks.at("move.commit-after-read");
                if (md.record !== null) {
                  lost = true; // a record exists already: write nothing, change nothing
                  return undefined;
                }
                s.hooks.fault("store-write");
                const decidedAt = s.now();
                md.record = plain({ gateId, key: request.key, move: { ...request.move }, decidedAt, seq: 1 as const });
                await appendOutbox(tx, { type: "move.committed", subject: gateId, at: decidedAt, actor: request.move.decidedBy, cause: request.key, data: { kind: request.move.kind, briefRef: request.move.briefRef } });
                await s.hooks.at("move.commit-after-write"); // mid-commit: written in the callback, not yet stored
                return { status: "terminal", outcome: { status: "completed", result: { key: request.key } } };
              });
              await s.hooks.at("move.committed");
              request.done(lost ? "lost" : "committed");
              if (!lost) return;
            } catch (e) {
              request.done({ error: (e as Error).message });
            }
            slot.taken = false; // the attempt left no trace: wait again
          }
        } finally {
          s.slots.delete(gateId, slot);
        }
      },
    },
    abort: async (_task, run) => {
      await run.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }));
    },
  });

  const gate = defineKilnTask<GateInput, GateCheckpoint, { key: string }>({
    name: "kiln.gate",
    version: 1,
    initial: () => ({ phase: "open" }),
    phases: {
      open: async (task, run) => {
        await run.commit(async (tx) => {
          const decisionId = await tx.createTask("kiln.decision", { gateId: task.input.gateId } as unknown as JSON, { kind: "task", taskId: task.id });
          return { status: "waiting", checkpoint: { phase: "settle", decisionId }, on: [decisionId] };
        });
      },
      settle: async (task, run) => {
        await s.hooks.at("gate.wake"); // the decision is terminal; this gate has not yet advanced
        const [outcome] = await run.outcomes([task.checkpoint.decisionId]);
        const key = outcome?.status === "completed" ? String((outcome.result as { key?: string } | null)?.key ?? "") : "";
        await run.commit(async (tx) => {
          const at = s.now();
          await appendOutbox(tx, { type: "gate.settled", subject: task.input.gateId, at, actor: "factory", cause: key || "(no key)", data: { key } });
          return { status: "terminal", outcome: { status: "completed", result: { key } } };
        });
        await s.hooks.at("gate.settled");
      },
    },
    abort: async (_task, run) => {
      await run.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }));
    },
  });
  return [gate, decision];
}
