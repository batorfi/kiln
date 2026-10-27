// A DELIBERATELY half-applying decision step, for the tests only — the control that shows the proof can fail (FR-061). It stores the move in ONE commit and completes the decision in a SECOND,
// with a kill point between them: the two-commit design r42 showed to be wrong. It replaces the real `kiln.decision` kind (same name) when the child owner is started with BROKEN_GATE=1.
import { plain } from "#durable/canonical.ts";
import { appendOutbox } from "#durable/outbox.ts";
import type { Hooks } from "#durable/hooks.ts";
import type { Services } from "#durable/services.ts";
import type { MoveDocData } from "#durable/gate/documents.ts";
import type { Slot, SlotRequest } from "#durable/gate/slots.ts";
import { defineKilnTask, type TaskKind } from "#durable/store.ts";

export function brokenDecision(s: Services & { hooks: Hooks }): TaskKind<any, any, any> {
  return defineKilnTask<{ gateId: string }, { phase: "wait" }, { key: string }>({
    name: "kiln.decision",
    version: 1,
    initial: () => ({ phase: "wait" }),
    phases: {
      wait: async (task, run) => {
        const gateId = task.input.gateId;
        const slot: Slot = { registered: false, taken: false };
        s.slots.set(gateId, slot);
        try {
          const waiting = new Promise<SlotRequest | undefined>((resolve) => {
            if (run.signal.aborted) return resolve(undefined);
            run.signal.addEventListener("abort", () => resolve(undefined), { once: true });
            slot.deliver = resolve;
            slot.registered = true;
          });
          const request = await waiting;
          if (!request) return;
          // commit 1 of 2: the move is stored; the decision is NOT completed
          await run.commit(async (tx) => {
            const md = await tx.doc<MoveDocData>("kiln.move", gateId, { record: null });
            md.record = plain({ gateId, key: request.key, move: { ...request.move }, decidedAt: s.now(), seq: 1 as const });
            await appendOutbox(tx, { type: "move.committed", subject: gateId, at: s.now(), actor: request.move.decidedBy, cause: request.key, data: { kind: request.move.kind, briefRef: request.move.briefRef } });
            return { status: "running", checkpoint: { phase: "wait" } };
          });
          await s.hooks.at("between-commits"); // a kill here leaves a move on a gate that never settled
          // commit 2 of 2
          await run.commit(() => ({ status: "terminal", outcome: { status: "completed", result: { key: request.key } } }));
          request.done("committed");
        } finally {
          s.slots.delete(gateId, slot);
        }
      },
    },
    abort: async (_t, run) => {
      await run.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }));
    },
  });
}
