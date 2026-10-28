// The two tasks of a gate (research R2, from the composition r42 proved):
//   kiln.gate      phase open   — creates its decision child, parks `waiting` on it (the child, not a clock)
//                  phase settle — reads the decision's outcome, appends `gate.settled`, commits terminal
//   kiln.decision  phase wait   — registers a single-shot slot in the owner's memory and awaits it; a move wakes it, and the step performs ONE commit that writes the move record, appends
//                  `move.committed` AND returns the task's own terminal state: the move and the completion are the same commit by construction (a).
// Nothing here sleeps, so there is no timer on a gate or its decision (d, I7). A failed commit is answered `store-error` and the step re-arms its slot — a step never returns without
// durable progress, or the library would fault it.
import { plain } from "../canonical.ts";
import { appendEvent } from "../record/append.ts";
import { pairOf } from "../record/refs.ts";
import type { Services } from "../services.ts";
import { defineKilnTask, type TaskKind } from "../store.ts";
import type { JSON, TaskId } from "../types.ts";
import type { MoveDocData } from "./documents.ts";
import { walkDoc } from "../walk/doc.ts";
import type { Slot, SlotRequest } from "./slots.ts";

type GateInput = { gateId: string };
type GateCheckpoint = { phase: "open" } | { phase: "settle"; decisionId: TaskId };
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
              const feature = /^gate:([^:]+):/.exec(gateId)?.[1];
              if (feature) s.watch.notify(feature); // a walk's `feature next` shows the gate only once it can take a move (walk/view.ts)
            });
            await s.hooks.at("wait.registered");
            const request = await waiting;
            slot.registered = false;
            if (!request) return; // the factory is closing: nothing is committed
            try {
              let lost = false;
              const withdrawing = request.kind === "withdraw";
              await run.commit(async (tx) => {
                await s.hooks.at("move.commit-begin");
                const md = await tx.doc<MoveDocData>("kiln.move", gateId, { record: null });
                await s.hooks.at("move.commit-after-read");
                if (md.record !== null || md.withdrawn) {
                  lost = true; // a record (or a withdrawal) exists already: write nothing, change nothing
                  return undefined;
                }
                if (request.kind === "withdraw") {
                  // r14: a FEATURE-LEVEL move ends this gate WITHOUT settling it — ONE commit: the withdrawal, the feature's record of the move, the entries, and the decision's own end (never a move record)
                  const feature = /^gate:([^:]+):/.exec(gateId)![1];
                  const wd = await walkDoc(tx, feature);
                  if (wd.pending) {
                    lost = true; // another feature-level move is already waiting: first wins
                    return undefined;
                  }
                  const at = s.now();
                  const rec = plain({ key: request.key, move: { ...request.move }, decidedAt: at, effect: "withdrew" as const, gateId });
                  md.withdrawn = plain({ key: request.key, by: request.move.decidedBy, at, target: request.move.target, note: request.move.note });
                  wd.moves = { ...(wd.moves ?? {}), [request.key]: rec };
                  wd.pending = rec;
                  wd.openGateId = null;
                  await appendEvent(tx, { type: "gate.withdrawn", subject: gateId, at, actor: request.move.decidedBy, cause: request.key, data: { target: request.move.target, ...pairOf("note", { kind: "feature-move", feature, key: request.key }, request.move.note) } });
                  await appendEvent(tx, { type: "move.committed", subject: gateId, at, actor: request.move.decidedBy, cause: request.key, data: { kind: "reject", scope: "feature", target: request.move.target, decidedBy: request.move.decidedBy } });
                  await s.hooks.at("walk.withdraw-after-write");
                  return { status: "terminal", outcome: { status: "completed", result: { key: request.key, withdrawn: true } } };
                }
                s.hooks.fault("store-write");
                const decidedAt = s.now();
                md.record = plain({ gateId, key: request.key, move: { ...request.move }, decidedAt, seq: 1 as const });
                await appendEvent(tx, { type: "move.committed", subject: gateId, at: decidedAt, actor: request.move.decidedBy, cause: request.key, data: { kind: request.move.kind, briefRef: request.move.briefRef, decidedBy: request.move.decidedBy } });
                await s.hooks.at("move.commit-after-write"); // mid-commit: written in the callback, not yet stored
                return { status: "terminal", outcome: { status: "completed", result: { key: request.key } } };
              });
              if (withdrawing && !lost) await s.hooks.at("walk.withdraw-committed");
              else await s.hooks.at("move.committed");
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
        if (outcome?.status === "completed" && (outcome.result as { withdrawn?: boolean } | null)?.withdrawn) {
          // r14: a withdrawn gate was never settled: it appends no `gate.settled` (the decision step already recorded `gate.withdrawn`)
          await run.commit(() => ({ status: "terminal", outcome: { status: "completed", result: { key, withdrawn: true } } }));
          return;
        }
        await run.commit(async (tx) => {
          const at = s.now();
          // FR-014: a gate does not settle without a decider. The settlement names the move and the person from the STORED record; with no record there is nothing to settle.
          const stored = (await tx.doc<MoveDocData>("kiln.move", task.input.gateId, { record: null })).record;
          if (!stored) throw new Error(`gate ${task.input.gateId} would settle with no committed move: nothing settles a gate but a person's move`);
          await appendEvent(tx, { type: "gate.settled", subject: task.input.gateId, at, actor: "factory", cause: key || "(no key)", data: { key, move: stored.move.kind, decidedBy: stored.move.decidedBy } });
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
