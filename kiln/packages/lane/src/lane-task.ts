// The lane (LANE-1, research R9): ONE lane per factory, at most ONE running generation at any instant, and its facts — who holds it, which model is resident, whether it is held, how many swaps — are
// stored, so they survive a restart. The lane implements the `LaneApi` port that the durable package defines (durable cannot import the lane) and contributes the `kiln.lane` task kind; whoever
// composes a factory hands both in:  `const { api, kinds } = createLane();  openFactory({ store, lane: api, tasks: kinds })`.
//
//   · state — one document `kiln.lane/main`: { resident, hold, swaps, lease }. Every change is ONE commit that also appends its `lane.*` outbox entries (actor the step's task, cause what asked), so an
//     entry and the state it records are never apart (constitution VII, FR-031);
//   · waiting — a step that asks while the lane is held waits IN THE OWNER'S MEMORY, in the order it asked. That queue is deliberately not stored: a restart means the generation died with the process,
//     so `start()` releases the lease it finds (recording `lane.released` with actor "factory" and cause "restart") and the resumed steps ask again, in task-id order (FR-032);
//   · swaps — a swap is counted only when a model that is resident is replaced by a different one; the first load, and asking for the model that is already resident, are not swaps.
// Priority, affinity ordering and real model residency are LANE-2 (the pure logic is in affinity.ts) and r16; here every generation is scripted.
import { runCommand } from "#durable/commands.ts";
import { appendOutbox } from "#durable/outbox.ts";
import type { Services } from "#durable/services.ts";
import { defineKilnTask, type TaskKind } from "#durable/store.ts";
import type { LaneApi, Lease, TaskId } from "#durable/types.ts";

interface LaneDoc {
  resident: string | null;
  hold: boolean;
  swaps: number;
  lease: { holder: TaskId; since: number } | null;
}
const seed = (): LaneDoc => ({ resident: null, hold: false, swaps: 0, lease: null });

export class LaneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaneError";
  }
}

interface Waiter {
  step: TaskId;
  opts: { model?: string; hold?: boolean; signal?: AbortSignal; cause?: string };
  resolve(lease: Lease): void;
  reject(e: unknown): void;
  cancelled: boolean;
}

export interface LaneModule {
  /** The port: hand it to `openFactory` as `lane`. */
  api: LaneApi;
  /** The task kinds the lane contributes: hand it to `openFactory` as `tasks`. */
  kinds(services: Services): TaskKind<any, any, any>[];
}

export function createLane(): LaneModule {
  let s: Services | undefined;
  let started = false;
  const early: Waiter[] = []; // asked before start() finished: ordered by task id when it does
  const queue: Waiter[] = []; // asked after: in the order of asking
  let holder: TaskId | null = null; // the owner's own view; the document is the record
  let granting = false;
  const services = (): Services => {
    if (!s) throw new LaneError("the lane's task kinds were not registered with this factory (pass `kinds` as `tasks`)");
    return s;
  };

  async function grant(w: Waiter): Promise<Lease> {
    const sv = services();
    const at = sv.now();
    await sv.store.commit(async (tx) => {
      const doc = await tx.doc<LaneDoc>("kiln.lane", "main", seed());
      if (doc.lease) throw new LaneError(`the lane is held by task ${doc.lease.holder} in the store while the owner believed it free`);
      const from = doc.resident;
      const swapped = w.opts.model !== undefined && from !== null && from !== w.opts.model;
      if (w.opts.model !== undefined) doc.resident = w.opts.model;
      doc.hold = w.opts.hold === true;
      if (swapped) doc.swaps += 1;
      doc.lease = { holder: w.step, since: at };
      const actor = `task:${w.step}`;
      const cause = w.opts.cause ?? actor;
      await appendOutbox(tx, { type: "lane.acquired", subject: "lane", at, actor, cause, data: { holder: w.step, model: doc.resident, hold: doc.hold } });
      if (swapped) await appendOutbox(tx, { type: "lane.swapped", subject: "lane", at, actor, cause, data: { from, to: doc.resident, swaps: doc.swaps } });
      await sv.hooks.at("lane.acquire-after-write");
    });
    await sv.hooks.at("lane.acquire-committed");
    return { holder: w.step, since: at };
  }

  async function pump(): Promise<void> {
    if (granting) return;
    granting = true;
    try {
      while (holder === null && queue.length > 0) {
        const w = queue.shift()!;
        if (w.cancelled) continue;
        try {
          const lease = await grant(w);
          holder = w.step;
          w.resolve(lease);
        } catch (e) {
          w.reject(e);
        }
      }
    } finally {
      granting = false;
    }
  }

  const api: LaneApi = {
    async start() {
      const sv = services();
      await runCommand(sv, "lane.create", "task.create", { kind: "kiln.lane" }, async (tx) => ({ id: await tx.createTask("kiln.lane", {}, { kind: "factory" }) })); // the ONE lane task, once for the life of the store
      await sv.store.commit(async (tx) => {
        const doc = await tx.doc<LaneDoc>("kiln.lane", "main", seed());
        if (!doc.lease) return;
        const lost = doc.lease.holder;
        doc.lease = null; // the generation died with the process: nothing is running, so nothing may be recorded as running
        await appendOutbox(tx, { type: "lane.released", subject: "lane", at: sv.now(), actor: "factory", cause: "restart", data: { holder: lost, reason: "owner-restart" } });
      });
      started = true;
      queue.push(...early.splice(0).sort((a, b) => a.step - b.step)); // the resumed steps ask again: deterministic, by task id
      void pump();
    },

    acquire(step, opts = {}) {
      return new Promise<Lease>((resolve, reject) => {
        if (opts.signal?.aborted) return reject(new LaneError("the request was aborted before it was made"));
        const w: Waiter = { step, opts, resolve, reject, cancelled: false };
        opts.signal?.addEventListener("abort", () => {
          if (w.cancelled) return;
          w.cancelled = true;
          reject(new LaneError(`task ${step} stopped waiting for the lane`));
        }, { once: true });
        (started ? queue : early).push(w);
        if (started) void pump();
      });
    },

    async release(step) {
      const sv = services();
      const at = sv.now();
      await sv.store.commit(async (tx) => {
        const doc = await tx.doc<LaneDoc>("kiln.lane", "main", seed());
        if (!doc.lease || doc.lease.holder !== step) throw new LaneError(`task ${step} does not hold the lane${doc.lease ? ` (task ${doc.lease.holder} does)` : ""}`);
        doc.lease = null;
        await appendOutbox(tx, { type: "lane.released", subject: "lane", at, actor: `task:${step}`, cause: `task:${step}`, data: { holder: step } });
        await sv.hooks.at("lane.release-after-write");
      });
      await sv.hooks.at("lane.release-committed");
      holder = null;
      void pump();
    },
  };

  const kinds = (services: Services): TaskKind<any, any, any>[] => {
    s = services;
    return [
      defineKilnTask<Record<string, never>, { phase: "serve" }, never>({
        name: "kiln.lane",
        version: 1,
        initial: () => ({ phase: "serve" }),
        phases: {
          // The lane task is the factory's standing record that a lane exists and the home of its future scheduler (r16). It has nothing to do until then: it stays alive until the factory closes.
          serve: async (_task, run) => {
            if (run.signal.aborted) return;
            await new Promise<void>((resolve) => run.signal.addEventListener("abort", () => resolve(), { once: true }));
          },
        },
        abort: async (_task, run) => {
          await run.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }));
        },
      }),
    ];
  };

  return { api, kinds };
}
