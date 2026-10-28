// The walk's phases (walk-contract §2; data-model §3.2). `kiln.row`'s `walk` form is a state machine whose WHOLE state is its checkpoint:
//
//   admit → admission → pin → work ⇄ (units) → open → decide ─(a person's move)─→ work … → … → done
//
// The owner advances it: after a gate's task ends, the row wakes, reads the STORED move record (never memory), applies the consequence the flow data gives, and opens the next gate under a
// deterministic key — so a kill between the move and the next opening is repaired by the same key coming back as a `repeat`. THE ROW NEVER WRITES A MOVE RECORD and has no path that completes a
// gate: `decide` ends only because the gate task ended. The people's moves are r13's gate contract, unchanged.
import { applicability, cap as capOf, flowOf, targetsOf, triage as triageOf, triageProposal } from "#contracts/flow/index.ts";
import type { Applicability, FlowDefinition } from "#contracts/flow/types.ts";
import type { GateKey } from "#contracts/moves.ts";
import { openGate } from "../gate/open.ts";
import type { MoveDocData } from "../gate/documents.ts";
import { appendEvent } from "../record/append.ts";
import { appendUnitEvent } from "../record/unit-events.ts";
import { pairOf } from "../record/refs.ts";
import type { Services } from "../services.ts";
import type { NextState, RunningTask, Runtime } from "../store.ts";
import type { Admit, JSON, TaskId } from "../types.ts";
import { admissionBrief, gateBrief } from "./brief.ts";
import { walkDoc, type WalkDoc } from "./doc.ts";
import type { WalkInput } from "./input.ts";
import { applyFeatureReject, applyMove, pinsOf, queueFor, startState, withRev, type Applied, type OutboxIntent, type PinnedState, type WalkState } from "./state.ts";
import type { Tx } from "../store.ts";

export type WalkCheckpoint =
  | { phase: "admit"; round: number; instruction?: string }
  | { phase: "admission"; round: number; gateId: string }
  | { phase: "pin"; admission: { gateId: string; key: string; decidedBy: string; admit: Admit } }
  | { phase: "work"; w: WalkState; todo: string[]; unitId?: TaskId }
  | { phase: "verify"; w: WalkState }
  | { phase: "open"; w: WalkState }
  | { phase: "decide"; w: WalkState; gateId: string };
export interface WalkResult {
  outcome: "merged" | "not-admitted" | "left-lane";
  approved: string[];
}
type Run = Runtime<any, WalkResult>;
type Task<C extends WalkCheckpoint> = RunningTask<{ feature: string; walk: WalkInput }, C>;
const FLOW = (): FlowDefinition => flowOf("v2");
const done = (r: WalkResult): NextState<any, WalkResult> => ({ status: "terminal", outcome: { status: "completed", result: r } });
const factoryActor = "factory";

/** One of the reducers' intents as an event: its facts, plus a reference and a digest for each text it names. */
async function emit(tx: Tx, s: Services, feature: string, e: OutboxIntent): Promise<void> {
  const refs = Object.assign({}, ...(e.refs ?? []).map((r) => pairOf(r.prefix, r.locator, r.text)));
  await appendEvent(tx, { type: e.type, subject: feature, at: s.now(), actor: e.actor, cause: e.cause, data: { ...e.data, ...refs } });
}

// ── admit ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function admit(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "admit" }>>, run: Run): Promise<void> {
  const { feature, walk } = task.input;
  const { round, instruction } = task.checkpoint;
  const gateId = `gate:${feature}:gate0:${round}`;
  const brief = admissionBrief(FLOW(), feature, round, walk.facts, walk.triage, instruction);
  await s.whenReady; // resumed during start-up: the gate API answers not-ready until the owner has converged
  const opened = await openGate(s, `walk:${feature}:open:gate0:${round}`, { gateId, gateKey: "gate0", flow: "v2", brief, openedBy: `task:${task.id}`, returnsTo: [], walk: { feature } }, { awaitRegistered: false });
  if (opened.status === "refused") throw new Error(`the admission gate could not be opened: ${opened.reason} ${opened.detail ?? ""}`);
  await s.hooks.at("walk.admit-opened");
  await run.commit(() => ({ status: "waiting", checkpoint: { phase: "admission", round, gateId }, on: [opened.taskId] }));
}

// ── admission (woken: the admission gate's task ended) ──────────────────────────────────────────────────────────────────────────────────────
export async function admission(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "admission" }>>, run: Run): Promise<void> {
  const { feature } = task.input;
  const { gateId, round } = task.checkpoint;
  await s.hooks.at("walk.admission-read");
  const rec = (await s.store.snapshot<MoveDocData>("kiln.move", gateId))?.record;
  if (!rec) throw new Error("the admission gate's task ended without a move: nothing settles this gate but a person's committed move");
  const { kind, decidedBy, note, admit } = rec.move;
  await run.commit(async (tx) => {
    const wd = await walkDoc(tx, feature);
    wd.openGateId = null;
    if (kind === "approve") return { status: "running", checkpoint: { phase: "pin", admission: { gateId, key: rec.key, decidedBy, admit: admit ?? {} } } };
    if (kind === "reject") {
      wd.status = "not-admitted";
      await appendEvent(tx, { type: "walk.not-admitted", subject: feature, at: s.now(), actor: decidedBy, cause: rec.key, data: { gate: "gate0", round, ...pairOf("note", { kind: "move", gateId }, note) } });
      return done({ outcome: "not-admitted", approved: [] });
    }
    // revise and the row edits: the proposal is drawn again, with the note as its instruction
    return { status: "running", checkpoint: { phase: "admit", round: round + 1, ...(note ? { instruction: note } : {}) } };
  });
  s.watch.notify(feature);
}

// ── pin: evaluate, ONCE, what the admission decided — and record every outcome in the commit that changes the state ────────────────────────
export async function pin(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "pin" }>>, run: Run): Promise<void> {
  const { feature, walk } = task.input;
  const { admission: adm } = task.checkpoint;
  await s.hooks.at("walk.pin-begin");
  const flow = FLOW();
  const required = (adm.admit.require ?? []) as GateKey[];
  const applic: Partial<Record<GateKey, Applicability>> = {};
  for (const g of flow.gates) if (g.appliesWhen) applic[g.key] = applicability(g, walk.facts, required);
  // triage: the proposal stands unless the person overrode it; the flow's data decides what may be skipped (Concept and Architecture only)
  const requested = walk.triage?.skip && !adm.admit.overrideTriage ? triageProposal(flow) : [];
  const t = triageOf(flow, requested);
  const skip = t.ok ? t.skip : [];
  const skipped: Partial<Record<GateKey, string>> = {};
  for (const k of skip) skipped[k] = walk.triage!.reasoning;
  const c = capOf(flow, adm.admit.fixRounds);
  const pinned: PinnedState = { applicability: applic, skipped, required, cap: capChecked(c), overrideTriage: adm.admit.overrideTriage === true };
  const first = nextAfterGate0(flow, pinned);
  const w = { ...startState(flow, pinned, first), fix: { used: 0, ix: 0, verdicts: [] as ("pass" | "fail")[], personRejected: false } };

  await run.commit(async (tx) => {
    const wd = await walkDoc(tx, feature);
    wd.status = "active";
    await appendEvent(tx, {
      type: "walk.admitted", subject: feature, at: s.now(), actor: adm.decidedBy, cause: adm.key,
      data: { gate: adm.gateId, required, cap: pinned.cap, overrideTriage: pinned.overrideTriage, applicability: Object.fromEntries(Object.entries(applic).map(([k, a]) => [k, { applies: a!.applies, why: a!.why }])), skipped: skip } as unknown as JSON,
    });
    for (const [k, a] of Object.entries(applic) as [GateKey, Applicability][]) {
      if (a.applies) continue;
      await appendEvent(tx, { type: "gate.not-applicable", subject: feature, at: s.now(), actor: factoryActor, cause: `walk:${feature}:pin`, data: { gate: k, reason: (({ text: _t, ...facts }) => facts)(a.reason as unknown as Record<string, unknown>) as unknown as JSON } });
    }
    for (const k of skip) await appendEvent(tx, { type: "gate.skipped", subject: feature, at: s.now(), actor: factoryActor, cause: `walk:${feature}:pin`, data: { gate: k, ...pairOf("reasoning", { kind: "triage", feature }, walk.triage!.reasoning) } });
    await s.hooks.at("walk.pin-after-write");
    return { status: "running", checkpoint: { phase: "work", w, todo: queueFor(flow, w) } };
  });
  await s.hooks.at("walk.pin-committed");
  s.watch.notify(feature);
}
/** The cap the admission carried was judged (0–3) when the move was made; a refusal here means the stored move and the flow disagree, which is a fault, not a default to fall back on. */
function capChecked(c: ReturnType<typeof capOf>): number {
  if (!c.ok) throw new Error(`the admission's fix-round cap is not valid for this flow: ${c.refusal}`);
  return c.cap;
}
function nextAfterGate0(flow: FlowDefinition, pinned: PinnedState): GateKey {
  const p = pinsOf(pinned);
  const dropped = new Set<GateKey>([...p.notApplicable, ...p.skipped]);
  const first = flow.gates.find((g) => g.key !== "gate0" && !dropped.has(g.key));
  if (!first) throw new Error("the flow has no gate to open after the Roadmap gate");
  return first.key;
}

// ── a feature-level move waiting for the walk (recorded while no gate was open, or left by a withdrawn gate): applied BEFORE anything else, and the step that was running is ignored ──────────────
/** If a feature-level move is pending, applies it in ONE commit (clearing it) and returns true; the caller then ends its phase. */
async function consumePending(s: Services, feature: string, w: WalkState, run: Run): Promise<boolean> {
  const peek = await s.store.snapshot<WalkDoc>("kiln.walk", feature);
  if (!peek?.pending) return false;
  const flow = FLOW();
  await run.commit(async (tx) => {
    const wd = await walkDoc(tx, feature);
    const f = wd.pending;
    if (!f) throw new Error("the pending feature-level move vanished: only the row consumes it");
    const out = applyFeatureReject(flow, w, { feature, key: f.key, decidedBy: f.move.decidedBy, target: f.move.target, note: f.move.note, gateId: f.gateId });
    wd.pending = null;
    wd.openGateId = null;
    for (const e of out.outbox) await emit(tx, s, feature, e);
    await s.hooks.at("walk.consume-after-write");
    return { status: "running", checkpoint: { phase: "work", w: out.w, todo: out.todo } };
  });
  await s.hooks.at("walk.consume-committed");
  s.watch.notify(feature);
  return true;
}

// ── work: the scripted units of the cursor gate's next round, one at a time ──────────────────────────────────────────────────────────────────
export async function work(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "work" }>>, run: Run): Promise<void> {
  const { w, todo, unitId } = task.checkpoint;
  if (unitId !== undefined) {
    const [o] = await run.outcomes([unitId]);
    if (o.status !== "completed") {
      await run.commit(() => ({ status: "terminal", outcome: { status: "failed", message: `the unit ${unitId} of gate ${w.cursor} ended ${o.status}` } }));
      return;
    }
  }
  const flow = FLOW();
  // a feature-level move wins over whatever step this was: the finished step's result is ignored (spec FR-023) and the walk goes back
  if (await consumePending(s, task.input.feature, w, run)) return;
  if (todo.length === 0) {
    // Verification runs its bounded automatic fix rounds before the gate opens for a person
    const next = flow.gates.find((g) => g.key === w.cursor)?.mitigationCap ? "verify" : "open";
    await run.commit(() => ({ status: "running", checkpoint: { phase: next, w } }));
    return;
  }
  const [role, ...rest] = todo;
  const round = (w.rounds[w.cursor] ?? 0) + 1;
  const stepMs = task.input.walk.script?.stepMs;
  await run.commit(async (tx) => {
    const label = `${role}:${w.cursor}:${round}`;
    const id = await tx.createTask("kiln.unit", { label, steps: 1, ...(stepMs ? { stepMs } : {}) } as unknown as JSON, { kind: "task", taskId: task.id });
    await appendUnitEvent(tx, s, "unit.queued", { unit: id, label, owner: task.id, actor: `task:${task.id}`, cause: `task:${task.id}`, correlation: `run:${task.input.feature}` });
    return { status: "waiting", checkpoint: { phase: "work", w, todo: rest, unitId: id }, on: [id] };
  });
  await s.hooks.at("walk.unit-created");
}

// ── verify: Verification's automatic fix rounds (GATE-6, spec FR-032) — bounded by the pinned cap, never a person's move, never a settlement ──────────────────────────────────────────────────────
/**
 * The scripted verifier gives its next verdict. While it is `fail` and fewer than `cap` rounds have run — and no person has rejected yet (no more automatic rounds after that) — the factory runs a round: a
 * worker fixes, the same verifier checks again. Each round is ONE entry (`mitigate`, by the factory) in the same commit as the checkpoint that starts it, keyed by its own number: a kill neither loses nor
 * repeats a round. When the verdict is `pass` or the rounds are used up, the gate opens for a person with the cap, the rounds used and the verdicts in its brief.
 */
export async function verify(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "verify" }>>, run: Run): Promise<void> {
  const { feature, walk } = task.input;
  const { w } = task.checkpoint;
  if (await consumePending(s, feature, w, run)) return;
  const verdict = (walk.verifier ?? [])[w.fix.ix] ?? "pass";
  const fix = { ...w.fix, ix: w.fix.ix + 1, verdicts: [...w.fix.verdicts, verdict] };
  if (verdict === "fail" && !w.fix.personRejected && w.fix.used < w.pinned.cap) {
    const n = w.fix.used + 1;
    const pass = (w.rounds[w.cursor] ?? 0) + 1;
    await s.hooks.at("walk.fix-round-begin");
    await run.commit(async (tx) => {
      await appendEvent(tx, { type: "walk.fix-round", subject: feature, at: s.now(), actor: factoryActor, cause: `walk:${feature}:fix:${pass}:${n}`, data: { kind: "mitigate", n, cap: w.pinned.cap, verdict, pass } });
      return { status: "running", checkpoint: { phase: "work", w: { ...w, fix: { ...fix, used: n } }, todo: ["workers", "judge"] } };
    });
    await s.hooks.at("walk.fix-round-committed");
    return;
  }
  await run.commit(() => ({ status: "running", checkpoint: { phase: "open", w: { ...w, fix } } }));
}

// ── open: the cursor gate's next round, bound to the feature, under a deterministic key ──────────────────────────────────────────────────────
export async function open(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "open" }>>, run: Run): Promise<void> {
  const { feature, walk } = task.input;
  const flow = FLOW();
  const base = task.checkpoint.w;
  const gate = base.cursor;
  const round = (base.rounds[gate] ?? 0) + 1;
  const w = { ...withRev(flow, base, gate, round, (walk.script?.sameContent ?? []).includes(gate)), rounds: { ...base.rounds, [gate]: round } };
  const gateId = `gate:${feature}:${gate}:${round}`;
  await s.hooks.at("walk.gate-opening");
  await s.whenReady;
  const opened = await openGate(s, `walk:${feature}:open:${gate}:${round}`, {
    gateId, gateKey: gate, flow: "v2", brief: gateBrief(flow, feature, w, gate, round), openedBy: `task:${task.id}`, returnsTo: targetsOf(flow, gate, pinsOf(w.pinned)), walk: { feature },
  }, { awaitRegistered: false });
  if (opened.status === "refused") {
    // a feature-level move was recorded between the last look and this opening: the opening is refused (no gate), and the walk applies the move instead
    if (opened.reason === "stale" && /feature-moved/.test(opened.detail ?? "") && (await consumePending(s, feature, base, run))) return;
    throw new Error(`gate ${gateId} could not be opened: ${opened.reason} ${opened.detail ?? ""}`);
  }
  await s.hooks.at("walk.gate-opened");
  await run.commit(() => ({ status: "waiting", checkpoint: { phase: "decide", w: { ...w, prelude: [] }, gateId }, on: [opened.taskId] }));
}

// ── decide (woken: the gate's task ended): the STORED record says how — a person's move, or a feature-level withdrawal ─────────────────────────────────────────────────────────────────────────────
export async function decide(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "decide" }>>, run: Run): Promise<void> {
  const { feature, walk } = task.input;
  const { w, gateId } = task.checkpoint;
  const flow = FLOW();
  const doc = await s.store.snapshot<MoveDocData>("kiln.move", gateId);
  const rec = doc?.record ?? null;
  await s.hooks.at("walk.settled-read");
  if (!rec && !doc?.withdrawn) throw new Error(`the gate ${gateId} ended without a move: nothing settles a gate but a person's committed move`);
  const gate = w.cursor;
  const round = w.rounds[gate]!;
  await run.commit(async (tx) => {
    const wd = await walkDoc(tx, feature);
    wd.openGateId = null;
    let out: Applied | null = null;
    if (rec) {
      // what the stored move means for the walk — a pure function of (flow data, state, the record): a restarted row recomputes exactly what a killed one was about to do
      out = applyMove(flow, w, { gate, round, gateId, kind: rec.move.kind, note: rec.move.note, target: rec.move.target, decidedBy: rec.move.decidedBy, key: rec.key }, walk.built, feature);
    }
    const f = wd.pending;
    if (f) {
      // a feature-level move that arrived while this gate's own move was being committed (or that withdrew the gate): applied AFTER the gate's own outcome — unless the walk has just ended
      wd.pending = null;
      if (!out || !out.end) {
        const next = applyFeatureReject(flow, out ? out.w : w, { feature, key: f.key, decidedBy: f.move.decidedBy, target: f.move.target, note: f.move.note, gateId: f.gateId });
        out = out ? { w: next.w, todo: next.todo, outbox: [...out.outbox, ...next.outbox] } : next;
      } else {
        // the person's own move ended the walk, so there is nothing to send back: the feature-level move was accepted but cannot act. Say so in the same commit, never silently.
        await appendEvent(tx, { type: "walk.move-ignored", subject: feature, at: s.now(), actor: f.move.decidedBy, cause: f.key, data: { target: f.move.target, ...pairOf("note", { kind: "feature-move", feature, key: f.key }, f.move.note), why: `walk-ended-${out.end.outcome}` } });
      }
    }
    if (!out) throw new Error(`the gate ${gateId} was withdrawn but no feature-level move is waiting for the walk`);
    for (const e of out.outbox) await emit(tx, s, feature, e);
    if (out.end) {
      wd.status = out.end.status;
      await s.hooks.at("walk.consume-after-write");
      return done({ outcome: out.end.outcome, approved: Object.keys(out.w.approved) });
    }
    await s.hooks.at("walk.consume-after-write");
    return { status: "running", checkpoint: { phase: "work", w: out.w, todo: out.todo } };
  });
  await s.hooks.at("walk.consume-committed");
  s.watch.notify(feature);
}
