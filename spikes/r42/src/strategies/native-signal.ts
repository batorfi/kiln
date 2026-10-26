// T038/T039 — C1, "signal into a running phase": the first NATIVE strategy (Pi Durable's own operations only; no KILN-side decision record).
//   gate task  `spike.gate`     phase open   — creates the decision child, parks `waiting` on it
//                               phase settle — reads the child's outcome, commits terminal
//   decision   `spike.decision` phase wait   — registers a single-shot slot in an OWNER-LEVEL map and awaits it; when a move arrives it performs ONE
//                                              `runtime.commit` that writes the move record (document `spike.move`) AND returns the task's own terminal state.
// The move and the completion are one commit by construction; what the spike measures is everything around it: the restart (the phase re-runs from its top and
// must re-register), the crash-loop guard (`restartLimit`), the startup race, and exactly-once. Reads go to the store (a snapshot / a scan), never to memory,
// except the slot — the one piece of owner memory this design needs, and the reason `submit` answers `not-ready` until the phase has re-registered.
//
// The gate's state as the PORT sees it is "a move record exists" (what `state()` and `inspect()` derive from the store). The gate TASK is a projection that
// converges (decision terminal → gate wakes → settles); `start()` waits for that convergence before it says ready. Recorded in NOTES.md.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createModels } from "@earendil-works/pi-ai/models";
import { createRegistry, createSession, defineDocFamily, defineExtension, defineTask, Harness, ROOT_CONVERSATION_ID } from "@earendil-works/pi-durable";
import type { Session, Storage, TaskId, TaskRecord } from "@earendil-works/pi-durable";
import { openNodeSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/node";
import type { Inspection } from "../invariants.ts";
import { faultPoint, killPoint } from "../kill.ts";
import { refused, sameMove, validateMove, type GateCompletion, type GateId, type GateState, type Move, type MoveKey, type MoveRecord, type Outcome } from "../port.ts";
import type { KillPoint, StartOptions, Strategy } from "../strategy.ts";

export const ctx = BACKGROUND_CONTEXT;
export const GATE_KIND = "spike.gate";
export const DECISION_KIND = "spike.decision";

type MoveDocState = { gateId: string; record: { gate: string; key: string; move: { kind: string; decidedBy: string; briefRef: string }; seq: 1 } | null };

/** One gate's move, keyed by the gate id, in the root conversation. */
export const MoveDoc = defineDocFamily<MoveDocState, string>({
  kind: "spike.move",
  version: 1,
  scope: "conversation",
  history: "latest",
  fork: "initial",
  family: true,
  initial: (gateId) => ({ gateId, record: null }),
  checkpointWhen: () => true,
});

// ---- the owner-level slot (memory) -------------------------------------------------------------------------------------------------------------------
interface Request {
  key: MoveKey;
  move: Move;
  done(result: "committed" | "lost" | { error: string }): void;
}
interface Slot {
  /** The decision phase has (re-)registered and is awaiting a move. */
  registered: boolean;
  /** A submission has taken the slot and its commit is in flight. */
  taken: boolean;
  deliver?: (r: Request | undefined) => void;
  /** Settles when the in-flight submission's commit has finished (committed, lost or failed). */
  inflight?: Promise<void>;
}
const slots = new Map<GateId, Slot>();

type GateCheckpoint = { phase: "open" } | { phase: "settle"; decisionId: string };
type DecisionCheckpoint = { phase: "wait" };

const abortAsAborted = async (_task: unknown, runtime: { commit: (f: () => never, c: typeof ctx) => Promise<void> }) => {
  await runtime.commit((() => ({ status: "terminal", outcome: { status: "aborted" } })) as never, ctx);
};

const Decision = defineTask<{ gateId: string }, DecisionCheckpoint, { key: string }>({
  name: DECISION_KIND,
  version: 1,
  initial: () => ({ phase: "wait" }),
  phases: {
    wait: async (task, runtime) => {
      const gateId = task.input.gateId;
      const slot: Slot = { registered: false, taken: false };
      slots.set(gateId, slot);
      try {
        for (;;) {
          const request = await new Promise<Request | undefined>((resolve) => {
            if (runtime.signal.aborted) return resolve(undefined);
            runtime.signal.addEventListener("abort", () => resolve(undefined), { once: true });
            slot.deliver = resolve;
            slot.registered = true; // from here on a move can reach the phase
          });
          slot.registered = false;
          if (!request) return; // aborted or closing: nothing is committed
          try {
            let lost = false;
            await runtime.commit(async (tx) => {
              killPoint("commit-begin");
              const doc = await tx.doc(MoveDoc, ROOT_CONVERSATION_ID, gateId, gateId);
              killPoint("commit-after-read");
              if (doc.record !== null) {
                lost = true; // a record already exists: write nothing, change nothing
                return undefined;
              }
              faultPoint("store-write");
              doc.record = { gate: gateId, key: request.key, move: { ...request.move }, seq: 1 };
              killPoint("commit-after-write"); // mid-transaction: written in the callback, not yet stored
              return { status: "terminal", outcome: { status: "completed", result: { key: request.key } } };
            }, ctx);
            killPoint("commit-returned");
            request.done(lost ? "lost" : "committed");
            if (!lost) return;
          } catch (e) {
            request.done({ error: (e as Error).message });
          }
          slot.taken = false; // the attempt left no trace: wait again
        }
      } finally {
        if (slots.get(gateId) === slot) slots.delete(gateId);
      }
    },
  },
  abort: abortAsAborted as never,
});

const Gate = defineTask<{ gateId: string }, GateCheckpoint, { key: string }>({
  name: GATE_KIND,
  version: 1,
  initial: () => ({ phase: "open" }),
  phases: {
    open: async (task, runtime) => {
      await runtime.commit(async (tx) => {
        const decisionId = await tx.createTask(Decision, { gateId: task.input.gateId }, { ownership: { kind: "task", taskId: task.id } });
        return { status: "waiting", checkpoint: { phase: "settle", decisionId }, on: [decisionId], policy: "allSettled" };
      }, ctx);
    },
    settle: async (task, runtime) => {
      killPoint("gate-wake"); // the decision is terminal; this gate has not yet advanced
      const [outcome] = await runtime.outcomes([task.state.checkpoint.decisionId as TaskId<{ key: string }>], ctx);
      const key = outcome?.status === "completed" ? outcome.result.key : "";
      await runtime.commit(() => ({ status: "terminal", outcome: { status: "completed", result: { key } } }), ctx);
      killPoint("gate-settled");
    },
  },
  abort: abortAsAborted as never,
});

const spike = defineExtension({ name: "spike", tasks: [Gate, Decision] });

// ---- reading the store -------------------------------------------------------------------------------------------------------------------------------
export type AnyTaskRecord = TaskRecord<unknown, unknown, unknown>;

export async function scanKind(storage: Storage, kind: string): Promise<AnyTaskRecord[]> {
  const out: AnyTaskRecord[] = [];
  let cursor;
  do {
    const page = await storage.scanTasks({ kind }, 100, cursor, ctx);
    out.push(...(page.items as unknown as AnyTaskRecord[]));
    cursor = page.next;
  } while (cursor);
  return out;
}
export const forGate = (records: AnyTaskRecord[], gateId: GateId): AnyTaskRecord | undefined => records.find((r) => (r.input as { gateId?: string }).gateId === gateId);

export interface Facts {
  gate: AnyTaskRecord | undefined;
  decision: AnyTaskRecord | undefined;
  record: MoveRecord | undefined;
}
export async function readFacts(storage: Storage, session: Pick<Session, "snapshot">, gateId: GateId): Promise<Facts> {
  const gate = forGate(await scanKind(storage, GATE_KIND), gateId);
  const decision = forGate(await scanKind(storage, DECISION_KIND), gateId);
  const doc = await session.snapshot(MoveDoc, ROOT_CONVERSATION_ID, gateId, ctx);
  const r = doc?.record ?? undefined;
  return { gate, decision, record: r ? { gateId: r.gate, key: r.key, move: r.move as Move, seq: 1 } : undefined };
}

export const piFile = (store: string): string => join(store, "pi.sqlite");
export const limitFile = (store: string): string => join(store, "restart-limit");

export const NATIVE_SIGNAL_KILL_POINTS: KillPoint[] = [
  { name: "idle-before-move", where: "submit entered; nothing read or written yet", phase: "move" },
  { name: "move-received", where: "the owner has read the request line and not yet dispatched it", phase: "move" },
  { name: "commit-begin", where: "first line of the commit callback in the decision phase", phase: "move" },
  { name: "commit-after-read", where: "inside the commit callback, after reading the move document, before writing", phase: "move" },
  { name: "commit-after-write", where: "inside the commit callback, after writing the document, before returning the terminal state (mid-transaction)", phase: "move" },
  { name: "commit-returned", where: "runtime.commit has resolved (the move is stored); the acknowledgement is not yet sent", phase: "completion" },
  { name: "ack-sent", where: "the acknowledgement has been written to the socket", phase: "completion" },
  { name: "gate-wake", where: "the decision task is terminal; the gate task has woken but not advanced", phase: "completion" },
  { name: "gate-settled", where: "the gate task's own terminal commit has resolved", phase: "completion" },
  { name: "recovery-start", where: "first line of the owner's start after a previous kill, before the store is reopened", phase: "recovery" },
];

// ---- the strategy ------------------------------------------------------------------------------------------------------------------------------------
async function waitConverged(harness: Harness, storage: Storage, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const decisions = (await scanKind(storage, DECISION_KIND)).filter((d) => d.state.status !== "terminal");
    const allRegistered = decisions.every((d) => slots.get((d.input as { gateId: string }).gateId)?.registered);
    const busy = (await harness.inspect(ctx)).tasks.some((t) => t.state.kind === "ready" || (t.state.kind === "running" && t.record.kind === GATE_KIND));
    if (allRegistered && !busy) return;
    if (Date.now() > deadline) return; // not ready in time: submit answers not-ready, which is the honest report
    await new Promise((r) => setTimeout(r, 20));
  }
}

async function create(opts: StartOptions): Promise<GateCompletion> {
  mkdirSync(opts.store, { recursive: true });
  const restartLimit = opts.restartLimit ?? (process.env.RESTART_LIMIT !== undefined ? Number(process.env.RESTART_LIMIT) : Infinity);
  writeFileSync(limitFile(opts.store), String(restartLimit)); // so a reader with no Harness knows which limit the owner ran under (for I6)
  const storage = await openNodeSqliteStorage(piFile(opts.store));
  const registry = createRegistry();
  registry.install(spike);
  slots.clear();
  const harness = await Harness.open(
    storage,
    {
      models: createModels(), // no provider: the spike never submits a model input
      registry,
      settings: { restartLimit },
      now: opts.now,
      onReport: (info) => console.error(`pi report: ${info.type}${"task" in info && info.task ? ` ${info.task.kind}` : ""}`),
    },
    ctx,
  );
  const root = await harness.root(ctx);
  harness.resume();
  await waitConverged(harness, storage, 5000);

  const find = async (gateId: GateId): Promise<Facts> => readFacts(storage, harness, gateId);

  /** The outcome a submission gets when the store already holds a record for this gate. */
  const judge = (facts: Facts, key: MoveKey, move: Move, how: "arrived" | "raced"): Outcome | undefined => {
    const rec = facts.record;
    if (!rec) return undefined;
    if (rec.key !== key) return refused(how === "arrived" ? "stale" : "lost-race", { winner: rec.key });
    return sameMove(rec.move, move) ? { status: "repeat", record: rec } : refused("key-conflict", { original: rec.key });
  };

  return {
    async open(gateId) {
      try {
        await root.commit(async (tx) => {
          const existing = forGate((await tx.scanTasks({ kind: GATE_KIND }, 1000)).items as unknown as AnyTaskRecord[], gateId);
          if (!existing) await tx.createTask(Gate, { gateId }, { ownership: { kind: "conversation" } });
        }, ctx);
        // the decision phase registers shortly after; opening is done when the gate can take a move
        const deadline = Date.now() + 3000;
        while (!slots.get(gateId)?.registered && !(await find(gateId)).record && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
        return { status: "opened" };
      } catch (e) {
        return { status: "refused", reason: "store-error", detail: (e as Error).message };
      }
    },

    async submit(gateId, key, move): Promise<Outcome> {
      killPoint("idle-before-move");
      const bad = validateMove(move);
      if (bad) return refused("invalid-move", { detail: bad });
      try {
        let how: "arrived" | "raced" = "arrived";
        for (let attempt = 0; attempt < 8; attempt++) {
          const facts = await find(gateId);
          if (!facts.gate) return refused("unknown-gate");
          const known = judge(facts, key, move, how);
          if (known) return known;
          const slot = slots.get(gateId);
          if (!slot || !slot.registered) {
            if (slot?.taken && slot.inflight) {
              await slot.inflight;
              how = "raced";
              continue;
            }
            return refused("not-ready", { detail: "the decision phase has not (re-)registered" });
          }
          if (slot.taken) {
            await slot.inflight; // the first caller took the slot: wait for its commit, then judge against the store
            how = "raced";
            continue;
          }
          slot.taken = true;
          let finish!: () => void;
          slot.inflight = new Promise<void>((r) => (finish = r));
          const result = await new Promise<"committed" | "lost" | { error: string }>((resolve) => {
            slot.deliver?.({ key, move, done: resolve });
          });
          finish();
          if (typeof result === "object") return refused("store-error", { detail: result.error });
          if (result === "committed") return { status: "committed", record: { gateId, key, move, seq: 1 } };
          how = "raced"; // "lost": a record appeared; judge against it
        }
        return refused("store-error", { detail: "gave up after repeated races" });
      } catch (e) {
        return refused("store-error", { detail: (e as Error).message });
      }
    },

    async state(gateId): Promise<GateState> {
      const facts = await find(gateId);
      if (!facts.gate) return { state: "unknown" };
      return facts.record ? { state: "settled", record: facts.record } : { state: "waiting" };
    },

    async close() {
      await harness.close(ctx);
    },
  };
}

export async function inspect(store: string, gateId: GateId): Promise<Inspection> {
  mkdirSync(store, { recursive: true });
  let limit = Infinity;
  try {
    limit = Number(readFileSync(limitFile(store), "utf8"));
  } catch {
    /* no owner has run here yet */
  }
  const storage = await openNodeSqliteStorage(piFile(store));
  const session = createSession(storage);
  try {
    const f = await readFacts(storage, session, gateId);
    const d = f.decision;
    const terminal = d?.state.status === "terminal";
    const outcome = terminal ? (d!.state as { outcome?: { status: string; result?: { key?: string } } }).outcome : undefined;
    const live = [f.gate, f.decision].filter((t): t is AnyTaskRecord => !!t && t.state.status !== "terminal");
    return {
      gate: f.record ? "settled" : "waiting",
      records: f.record ? [f.record] : [],
      decisionTask: !d ? "absent" : terminal ? "terminal" : "live",
      decisionOutcomeMatches: terminal ? outcome?.status === "completed" && !!f.record && outcome.result?.key === f.record.key : true,
      timers: live.filter((t) => t.state.status === "sleeping").map((t) => `${t.kind} sleeping`),
      // a live task cut off `limit` times in a row is parked by the library; the limit the owner ran under was written next to the store
      blocked: live.some((t) => (t.restarts ?? 0) >= limit),
    };
  } finally {
    await session.close(ctx);
  }
}

export const strategy: Strategy = {
  name: "native-signal",
  native: true,
  killPoints: NATIVE_SIGNAL_KILL_POINTS,
  caveats: [{ text: "guarantee d holds only with settings.restartLimit = Infinity (the library parks a task cut off 5 times in a row)", enforceable: true }],
  start: create,
  inspect,
};
