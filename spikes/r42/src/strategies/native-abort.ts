// T041 — C2, "abort-driven": the decision task parks `sleeping` (a durable state — but it needs an `until`, so it is a CLOCK: invariant I7) and a move is
// delivered by two steps: (1) a commit that writes the move document, (2) `Harness.abortTask(decision)`, whose ABORT HANDLER reads the document and commits
// the task's terminal outcome. This is what the library offers as an outside entry into a task; the research (R3) predicted it fails a (two commits) and d (the
// deadline). Built and run so the report says WHERE, with evidence, rather than by assertion.
// To give it every chance, it converges: a repeat of the same key, and every start, re-issue the abort for a record whose decision is not yet terminal.
import { mkdirSync, writeFileSync } from "node:fs";
import { createModels } from "@earendil-works/pi-ai/models";
import { createRegistry, defineExtension, defineTask, Harness, ROOT_CONVERSATION_ID } from "@earendil-works/pi-durable";
import type { TaskId } from "@earendil-works/pi-durable";
import { openNodeSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/node";
import { faultPoint, killPoint } from "../kill.ts";
import { refused, sameMove, validateMove, type GateCompletion, type GateId, type GateState, type Move, type MoveKey, type MoveRecord, type Outcome } from "../port.ts";
import type { KillPoint, StartOptions, Strategy } from "../strategy.ts";
import { ctx, DECISION_KIND, forGate, GATE_KIND, inspect, limitFile, MoveDoc, piFile, readFacts, scanKind, type AnyTaskRecord, type Facts } from "./native-signal.ts";

/** Year 9999 in epoch milliseconds: as far as a clock can be asked to wait. Still a clock (I7), and 10 years of jump never reaches it. */
export const FAR_FUTURE = Date.UTC(9999, 0, 1);

type GateCheckpoint = { phase: "open" } | { phase: "settle"; decisionId: string };
type DecisionCheckpoint = { phase: "wait" };

const Decision = defineTask<{ gateId: string }, DecisionCheckpoint, { key: string }>({
  name: DECISION_KIND,
  version: 1,
  initial: () => ({ phase: "wait" }),
  phases: {
    // parks asleep until the end of time; only an abort mark moves it
    wait: (_task, runtime) => runtime.sleepUntil(FAR_FUTURE, { phase: "wait" }, ctx),
  },
  abort: async (task, runtime) => {
    killPoint("abort-handler-begin");
    await runtime.commit(async (tx) => {
      const doc = await tx.doc(MoveDoc, ROOT_CONVERSATION_ID, task.input.gateId, task.input.gateId);
      return doc.record
        ? { status: "terminal", outcome: { status: "completed", result: { key: doc.record.key } } }
        : { status: "terminal", outcome: { status: "aborted" } };
    }, ctx);
  },
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
      killPoint("gate-wake");
      const [outcome] = await runtime.outcomes([task.state.checkpoint.decisionId as TaskId<{ key: string }>], ctx);
      const key = outcome?.status === "completed" ? outcome.result.key : "";
      await runtime.commit(() => ({ status: "terminal", outcome: { status: "completed", result: { key } } }), ctx);
      killPoint("gate-settled");
    },
  },
  abort: async (_task, runtime) => {
    await runtime.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }), ctx);
  },
});

const spikeAbort = defineExtension({ name: "spike", tasks: [Gate, Decision] });

export const NATIVE_ABORT_KILL_POINTS: KillPoint[] = [
  { name: "idle-before-move", where: "submit entered; nothing read or written yet", phase: "move" },
  { name: "move-received", where: "the owner has read the request line and not yet dispatched it", phase: "move" },
  { name: "record-commit-begin", where: "first line of the commit that writes the move document (commit 1 of 2)", phase: "move" },
  { name: "record-commit-after-write", where: "inside commit 1, after the document is written, before the callback returns (mid-transaction)", phase: "move" },
  { name: "between-record-and-abort", where: "commit 1 has resolved (the move is stored); abortTask has not been called (the window between the two commits)", phase: "move" },
  { name: "abort-marked", where: "abortTask has resolved (the abort mark is stored); the abort handler has not run", phase: "completion" },
  { name: "abort-handler-begin", where: "first line of the decision's abort handler (commit 2 of 2 is about to be made)", phase: "completion" },
  { name: "ack-sent", where: "the acknowledgement has been written to the socket", phase: "completion" },
  { name: "gate-wake", where: "the decision task is terminal; the gate task has woken but not advanced", phase: "completion" },
  { name: "gate-settled", where: "the gate task's own terminal commit has resolved", phase: "completion" },
  { name: "recovery-start", where: "first line of the owner's start after a previous kill, before the store is reopened", phase: "recovery" },
];

async function create(opts: StartOptions): Promise<GateCompletion> {
  mkdirSync(opts.store, { recursive: true });
  const restartLimit = opts.restartLimit ?? (process.env.RESTART_LIMIT !== undefined ? Number(process.env.RESTART_LIMIT) : Infinity);
  writeFileSync(limitFile(opts.store), String(restartLimit));
  const storage = await openNodeSqliteStorage(piFile(opts.store));
  const registry = createRegistry();
  registry.install(spikeAbort);
  const harness = await Harness.open(
    storage,
    {
      models: createModels(),
      registry,
      settings: { restartLimit },
      now: opts.now,
      onReport: (info) => console.error(`pi report: ${info.type}${"task" in info && info.task ? ` ${info.task.kind}` : ""}`),
    },
    ctx,
  );
  const root = await harness.root(ctx);
  harness.resume();

  const find = async (gateId: GateId): Promise<Facts> => readFacts(storage, harness, gateId);

  /** The convergence step: a record whose decision is not terminal gets its abort (idempotent). Returns once the abort mark is stored. */
  const converge = async (facts: Facts): Promise<void> => {
    if (facts.record && facts.decision && facts.decision.state.status !== "terminal") await harness.abortTask(facts.decision.id as TaskId, ctx);
  };

  // recovery: every record whose decision is not terminal is completed now
  for (const d of (await scanKind(storage, DECISION_KIND)).filter((t) => t.state.status !== "terminal")) await converge(await find((d.input as { gateId: string }).gateId));
  const settleDeadline = Date.now() + 5000;
  while (Date.now() < settleDeadline && (await harness.inspect(ctx)).tasks.some((t) => t.state.kind === "ready" || t.state.kind === "running")) await new Promise((r) => setTimeout(r, 20));

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
        const deadline = Date.now() + 3000; // the decision task exists once the gate task has run its first phase
        while (!(await find(gateId)).decision && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
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
        const arrival = await find(gateId);
        if (!arrival.gate || !arrival.decision) return refused(arrival.gate ? "not-ready" : "unknown-gate");
        const known = judge(arrival, key, move, "arrived");
        if (known) {
          await converge(arrival); // a repeat finishes what a killed attempt left half done
          return known;
        }
        // commit 1 of 2: the record. First writer wins inside the commit; the store decides.
        let wrote = false;
        await root.commit(async (tx) => {
          killPoint("record-commit-begin");
          const doc = await tx.doc(MoveDoc, ROOT_CONVERSATION_ID, gateId, gateId);
          if (doc.record !== null) return;
          faultPoint("store-write");
          doc.record = { gate: gateId, key, move: { ...move }, seq: 1 };
          wrote = true;
          killPoint("record-commit-after-write");
        }, ctx);
        killPoint("between-record-and-abort");
        const after = await find(gateId);
        // commit 2 of 2, by way of the abort mark and the abort handler
        await converge(after);
        killPoint("abort-marked");
        if (wrote) return { status: "committed", record: after.record as MoveRecord };
        return judge(after, key, move, "raced") ?? refused("store-error", { detail: "no record after the commit" });
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

export const strategy: Strategy = {
  name: "native-abort",
  native: true,
  killPoints: NATIVE_ABORT_KILL_POINTS,
  caveats: [{ text: "the gate waits on a clock: the decision task sleeps until the year 9999 (a deadline), so the gate is not clock-free", enforceable: false }],
  start: create,
  inspect,
};
