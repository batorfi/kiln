// The lane (LANE-1, research R9): ONE lane per factory, at most ONE running generation at any instant, and its facts — who holds it, which model is resident, whether it is held, how many swaps — are
// stored, so they survive a restart. The lane implements the `LaneApi` port that the durable package defines (durable cannot import the lane) and contributes the `kiln.lane` task kind; whoever
// composes a factory hands both in:  `const { api, kinds } = createLane();  openFactory({ store, lane: api, tasks: kinds })`.
//
//   · state — one document `kiln.lane/main`: { resident, hold, swaps, lease }. Every change is ONE commit that also appends its `lane.*` outbox entries (actor the step's task, cause what asked), so an
//     entry and the state it records are never apart (constitution VII, FR-031);
//   · waiting — a step that asks while the lane is held waits IN THE OWNER'S MEMORY, in the order it asked. That queue is deliberately not stored: a restart means the generation died with the process,
//     so `start()` releases the lease it finds (recording `lane.released` with actor "factory" and cause "restart") and the resumed steps ask again, in task-id order (FR-032);
//   · swaps — a swap is counted only when a model that is resident is replaced by a different one; the first load, and asking for the model that is already resident, are not swaps.
// Priority and affinity ordering are LANE-2 (the pure logic is in affinity.ts). Real model residency is r16: when a
// `Residency` (residency.ts) is handed to `createLane()`, `grant()` loads a model before granting a lease that names
// one not yet resident, and `release()` unloads it when nothing pins it (FR-020, FR-024, research R9). Without a
// residency manager (the default, and every r13/r14/r15 caller), nothing changes: the model name is still only
// recorded, exactly as before this row.
import { runCommand } from "#durable/commands.ts";
import { appendEvent } from "#durable/record/append.ts";
import { correlationOfTask } from "#durable/record/runs.ts";
import type { Services } from "#durable/services.ts";
import { defineKilnTask, type TaskKind } from "#durable/store.ts";
import type { LaneApi, Lease, TaskId } from "#durable/types.ts";
import type { Residency } from "./residency.ts";

interface LaneDoc {
  resident: string | null;
  hold: boolean;
  swaps: number;
  lease: { holder: TaskId; since: number } | null;
  /** r16, FR-024: the model name currently pinned (never unloaded on release), or null. Visible, not implicit. */
  pin: string | null;
  /** r16, FR-025: the configured per-host memory budget this factory's residency manager enforces — recorded for visibility; enforcement lives in residency.ts. */
  budgetBytes: number | null;
}
const seed = (): LaneDoc => ({ resident: null, hold: false, swaps: 0, lease: null, pin: null, budgetBytes: null });

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

export function createLane(opts: { residency?: Residency; budgetBytes?: number } = {}): LaneModule {
  const residency = opts.residency;
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
    // The real load happens BEFORE the commit (research R9): a network call never runs inside a store transaction.
    // residency.load() is cheap (a no-op) when the model is already resident through this manager, so an acquire
    // that keeps the same model pays nothing extra here. A refusal (budget, Ollama unreachable, model missing)
    // rejects grant() before any state changes — the judged step waits and names the reason (US4), never partially
    // acquires.
    if (residency && w.opts.model !== undefined) {
      // r16 T029/OBS-5: reconcile() runs immediately before every load — a model Ollama already runs that this
      // manager never asked for is a broken guarantee, reported BY NAME (a refused acquire, never silently adopted
      // as the new resident). Not a new committed event: the record gains no new type this row (data-model.md §8);
      // the broken-guarantee EVENT that OBS-5 ultimately wants belongs to r27 (Health) — see notes.md's T029 entry.
      // r16 (found at T039): pass the model this acquire is about to request, so a process restarted after a kill
      // can adopt a model `keep_alive:-1` kept resident from before it died, instead of reporting its own empty,
      // fresh-process bookkeeping as a broken guarantee. See residency.ts's `reconcile()` for the full reasoning.
      const broken = await residency.reconcile(w.opts.model);
      if (broken) throw new LaneError(`broken guarantee: Ollama is running "${broken.model}" outside KILN's residency path — ${broken.detail}`);
      await residency.load(w.opts.model, { pin: w.opts.pin === true, signal: w.opts.signal });
    }
    await sv.store.commit(async (tx) => {
      const correlation = await correlationOfTask(tx, w.step); // the run the holder belongs to, read first (the library reads no task after a write)
      const doc = await tx.doc<LaneDoc>("kiln.lane", "main", seed());
      if (doc.lease) throw new LaneError(`the lane is held by task ${doc.lease.holder} in the store while the owner believed it free`);
      const from = doc.resident;
      const swapped = w.opts.model !== undefined && from !== null && from !== w.opts.model;
      if (w.opts.model !== undefined) doc.resident = w.opts.model;
      doc.hold = w.opts.hold === true;
      if (w.opts.pin === true && w.opts.model !== undefined) doc.pin = w.opts.model;
      if (opts.budgetBytes !== undefined && doc.budgetBytes === null) doc.budgetBytes = opts.budgetBytes;
      if (swapped) doc.swaps += 1;
      doc.lease = { holder: w.step, since: at };
      const actor = `task:${w.step}`;
      const cause = w.opts.cause ?? actor;
      await appendEvent(tx, { type: "lane.acquired", subject: "lane", at, actor, cause, correlation, data: { holder: w.step, model: doc.resident, hold: doc.hold } });
      if (swapped) await appendEvent(tx, { type: "lane.swapped", subject: "lane", at, actor, cause, correlation, data: { from, to: doc.resident, swaps: doc.swaps } });
      // NOT `lane.transition` here (see the T013 note in notes.md): that type is `legacyEntry`-declared — `legacy:
      // true`, committable: false — read-only, kept so the first program's OWN streams replay; `appendEvent` refuses
      // it by name ("event-type-read-only"). A real load is visible today through `realLoad` driving this function's
      // behaviour and through `unloads`/`pin`/`budgetBytes` on the document; no new committed event reports it yet.
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
      const made = await runCommand(sv, "lane.create", "task.create", { kind: "kiln.lane" }, async (tx) => ({ id: await tx.createTask("kiln.lane", {}, { kind: "factory" }) })); // the ONE lane task, once for the life of the store
      if (made.status === "refused") throw new LaneError(`the lane task could not be created: ${made.reason}${made.detail ? ` (${made.detail})` : ""}`);
      await sv.store.commit(async (tx) => {
        const doc = await tx.doc<LaneDoc>("kiln.lane", "main", seed());
        if (!doc.lease) return;
        const lost = doc.lease.holder;
        const correlation = await correlationOfTask(tx, lost);
        doc.lease = null; // the generation died with the process: nothing is running, so nothing may be recorded as running
        await appendEvent(tx, { type: "lane.released", subject: "lane", at: sv.now(), actor: "factory", cause: "restart", correlation, data: { holder: lost, reason: "owner-restart" } });
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

    holds(step) {
      return holder === step; // r16 T012: the owner's own in-memory view, same source `grant`/`pump` already trust — no wait, no commit
    },

    async release(step) {
      const sv = services();
      const at = sv.now();
      let resident: string | null = null;
      let pinned: string | null = null;
      await sv.store.commit(async (tx) => {
        const correlation = await correlationOfTask(tx, step);
        const doc = await tx.doc<LaneDoc>("kiln.lane", "main", seed());
        if (!doc.lease || doc.lease.holder !== step) throw new LaneError(`task ${step} does not hold the lane${doc.lease ? ` (task ${doc.lease.holder} does)` : ""}`);
        doc.lease = null;
        resident = doc.resident;
        pinned = doc.pin;
        await appendEvent(tx, { type: "lane.released", subject: "lane", at, actor: `task:${step}`, cause: `task:${step}`, correlation, data: { holder: step } });
        await sv.hooks.at("lane.release-after-write");
      });
      await sv.hooks.at("lane.release-committed");
      // The real unload happens AFTER the lease commit, outside any transaction (same discipline as grant's load):
      // residency.unload() is a no-op when the model is pinned or was never resident through this manager, so a
      // held/pinned judge model survives a release untouched (FR-024). Not tied to a committed event: `lane.transition`
      // (the catalog's type for exactly this) is `legacyEntry`-declared — read-only, kept so the first program's
      // streams replay; `appendEvent` refuses it by name (see notes.md's T013 entry). `residency.unload()`'s own
      // caller (the test suite, via a fake `Residency`) is how a real unload is proven today, not a new event.
      //
      // r16 (found during T038): `holder = null` MUST wait until the unload above has resolved, not run before it.
      // `acquire()` calls `pump()` itself the instant a new waiter is pushed (it does not wait to be told the lane
      // is free) — if `holder` were cleared before `unload()` finishes, a queued next unit's `grant()` can run its
      // own `reconcile()`/`load()` for the SAME model concurrently with this unload, racing on `residency`'s own
      // `own` bookkeeping: whichever of the two `own.set`/`own.delete` calls resolves last silently wins, and a
      // worker that actually won the race (its load genuinely succeeded) can be left with no record of its own
      // model — the next reconcile() then reports Ollama's real resident model as a broken guarantee it never asked
      // for. Serializing unload-before-next-grant removes the overlap entirely; it costs one release's worth of
      // latency, never a correctness compromise, and matches the comment two lines up ("outside any transaction")
      // in spirit: the real HTTP effects of a release and the next acquire must not interleave either.
      if (residency && resident !== null && resident !== pinned) {
        await residency.unload(resident).catch(() => ({ unloaded: false }));
      }
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
