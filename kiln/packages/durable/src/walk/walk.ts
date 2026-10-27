// The walk's phases (walk-contract §2; data-model §3.2). `kiln.row`'s `walk` form is a state machine whose WHOLE state is its checkpoint:
//
//   admit → admission → pin → work ⇄ (units) → open → decide ─(a person's move)─→ work … → … → done
//
// The owner advances it: after a gate's task ends, the row wakes, reads the STORED move record (never memory), applies the consequence the flow data gives, and opens the next gate under a
// deterministic key — so a kill between the move and the next opening is repaired by the same key coming back as a `repeat`. THE ROW NEVER WRITES A MOVE RECORD and has no path that completes a
// gate: `decide` ends only because the gate task ended. The people's moves are r13's gate contract, unchanged.
import { applicability, cap as capOf, flowOf, gateDef, targetsOf, triage as triageOf, triageProposal } from "#contracts/flow/index.ts";
import type { Applicability, FlowDefinition } from "#contracts/flow/types.ts";
import type { GateKey } from "#contracts/moves.ts";
import { openGate } from "../gate/open.ts";
import type { MoveDocData } from "../gate/documents.ts";
import { appendOutbox } from "../outbox.ts";
import type { Services } from "../services.ts";
import type { NextState, RunningTask, Runtime } from "../store.ts";
import type { Admit, JSON, TaskId } from "../types.ts";
import { admissionBrief, gateBrief } from "./brief.ts";
import { walkDoc } from "./doc.ts";
import type { WalkInput } from "./input.ts";
import { approve, pinsOf, queueFor, startState, withRev, type PinnedState, type WalkState } from "./state.ts";

export type WalkCheckpoint =
  | { phase: "admit"; round: number; instruction?: string }
  | { phase: "admission"; round: number; gateId: string }
  | { phase: "pin"; admission: { gateId: string; key: string; decidedBy: string; admit: Admit } }
  | { phase: "work"; w: WalkState; todo: string[]; unitId?: TaskId }
  | { phase: "open"; w: WalkState }
  | { phase: "decide"; w: WalkState; gateId: string };
export interface WalkResult {
  outcome: "merged" | "not-admitted" | "left-lane";
  approved: string[];
}
type Run<C extends { phase: string }> = Runtime<any, WalkResult>;
type Task<C extends WalkCheckpoint> = RunningTask<{ feature: string; walk: WalkInput }, C>;
const FLOW = (): FlowDefinition => flowOf("v2");
const done = (r: WalkResult): NextState<any, WalkResult> => ({ status: "terminal", outcome: { status: "completed", result: r } });
const factoryActor = "factory";

// ── admit ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function admit(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "admit" }>>, run: Run<any>): Promise<void> {
  const { feature, walk } = task.input;
  const { round, instruction } = task.checkpoint;
  const gateId = `gate:${feature}:gate0:${round}`;
  const brief = admissionBrief(FLOW(), feature, round, walk.facts, walk.triage, instruction);
  const opened = await openGate(s, `walk:${feature}:open:gate0:${round}`, { gateId, gateKey: "gate0", flow: "v2", brief, openedBy: `task:${task.id}`, returnsTo: [], walk: { feature } });
  if (opened.status === "refused") throw new Error(`the admission gate could not be opened: ${opened.reason} ${opened.detail ?? ""}`);
  await s.hooks.at("walk.admit-opened");
  await run.commit(() => ({ status: "waiting", checkpoint: { phase: "admission", round, gateId }, on: [opened.taskId] }));
}

// ── admission (woken: the admission gate's task ended) ──────────────────────────────────────────────────────────────────────────────────────
export async function admission(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "admission" }>>, run: Run<any>): Promise<void> {
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
      await appendOutbox(tx, { type: "walk.not-admitted", subject: feature, at: s.now(), actor: decidedBy, cause: rec.key, data: { gate: "gate0", round, note: note ?? "" } });
      return done({ outcome: "not-admitted", approved: [] });
    }
    // revise and the row edits: the proposal is drawn again, with the note as its instruction
    return { status: "running", checkpoint: { phase: "admit", round: round + 1, ...(note ? { instruction: note } : {}) } };
  });
  s.watch.notify(feature);
}

// ── pin: evaluate, ONCE, what the admission decided — and record every outcome in the commit that changes the state ────────────────────────
export async function pin(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "pin" }>>, run: Run<any>): Promise<void> {
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
  const pinned: PinnedState = { applicability: applic, skipped, required, cap: c.ok ? c.cap : 2, overrideTriage: adm.admit.overrideTriage === true };
  const first = nextAfterGate0(flow, pinned);
  const w = { ...startState(flow, pinned, first), fix: { used: 0, ix: 0, verdicts: [] as ("pass" | "fail")[], personRejected: false } };

  await run.commit(async (tx) => {
    const wd = await walkDoc(tx, feature);
    wd.status = "active";
    await appendOutbox(tx, {
      type: "walk.admitted", subject: feature, at: s.now(), actor: adm.decidedBy, cause: adm.key,
      data: { gate: adm.gateId, required, cap: pinned.cap, overrideTriage: pinned.overrideTriage, applicability: Object.fromEntries(Object.entries(applic).map(([k, a]) => [k, { applies: a!.applies, why: a!.why }])), skipped: skip } as unknown as JSON,
    });
    for (const [k, a] of Object.entries(applic) as [GateKey, Applicability][]) {
      if (a.applies) continue;
      await appendOutbox(tx, { type: "gate.not-applicable", subject: feature, at: s.now(), actor: factoryActor, cause: `walk:${feature}:pin`, data: { gate: k, reason: a.reason as unknown as JSON } });
    }
    for (const k of skip) await appendOutbox(tx, { type: "gate.skipped", subject: feature, at: s.now(), actor: factoryActor, cause: `walk:${feature}:pin`, data: { gate: k, reasoning: walk.triage!.reasoning } });
    await s.hooks.at("walk.pin-after-write");
    return { status: "running", checkpoint: { phase: "work", w, todo: queueFor(flow, w) } };
  });
  await s.hooks.at("walk.pin-committed");
  s.watch.notify(feature);
}
function nextAfterGate0(flow: FlowDefinition, pinned: PinnedState): GateKey {
  const p = pinsOf(pinned);
  const dropped = new Set<GateKey>([...p.notApplicable, ...p.skipped]);
  const first = flow.gates.find((g) => g.key !== "gate0" && !dropped.has(g.key));
  if (!first) throw new Error("the flow has no gate to open after the Roadmap gate");
  return first.key;
}

// ── work: the scripted units of the cursor gate's next round, one at a time ──────────────────────────────────────────────────────────────────
export async function work(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "work" }>>, run: Run<any>): Promise<void> {
  const { w, todo, unitId } = task.checkpoint;
  if (unitId !== undefined) {
    const [o] = await run.outcomes([unitId]);
    if (o.status !== "completed") {
      await run.commit(() => ({ status: "terminal", outcome: { status: "failed", message: `the unit ${unitId} of gate ${w.cursor} ended ${o.status}` } }));
      return;
    }
  }
  const flow = FLOW();
  if (todo.length === 0) {
    await run.commit(() => ({ status: "running", checkpoint: { phase: "open", w } }));
    return;
  }
  const [role, ...rest] = todo;
  const round = (w.rounds[w.cursor] ?? 0) + 1;
  const stepMs = task.input.walk.script?.stepMs;
  void flow;
  await run.commit(async (tx) => {
    const id = await tx.createTask("kiln.unit", { label: `${role}:${w.cursor}:${round}`, steps: 1, ...(stepMs ? { stepMs } : {}) } as unknown as JSON, { kind: "task", taskId: task.id });
    return { status: "waiting", checkpoint: { phase: "work", w, todo: rest, unitId: id }, on: [id] };
  });
  await s.hooks.at("walk.unit-created");
}

// ── open: the cursor gate's next round, bound to the feature, under a deterministic key ──────────────────────────────────────────────────────
export async function open(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "open" }>>, run: Run<any>): Promise<void> {
  const { feature, walk } = task.input;
  const flow = FLOW();
  const base = task.checkpoint.w;
  const gate = base.cursor;
  const round = (base.rounds[gate] ?? 0) + 1;
  const w = { ...withRev(flow, base, gate, round, (walk.script?.sameContent ?? []).includes(gate)), rounds: { ...base.rounds, [gate]: round } };
  const gateId = `gate:${feature}:${gate}:${round}`;
  await s.hooks.at("walk.gate-opening");
  const opened = await openGate(s, `walk:${feature}:open:${gate}:${round}`, {
    gateId, gateKey: gate, flow: "v2", brief: gateBrief(flow, feature, w, gate, round), openedBy: `task:${task.id}`, returnsTo: targetsOf(flow, gate, pinsOf(w.pinned)), walk: { feature },
  });
  if (opened.status === "refused") throw new Error(`gate ${gateId} could not be opened: ${opened.reason} ${opened.detail ?? ""}`);
  await s.hooks.at("walk.gate-opened");
  await run.commit(() => ({ status: "waiting", checkpoint: { phase: "decide", w: { ...w, prelude: [] }, gateId }, on: [opened.taskId] }));
}

// ── decide (woken: the gate's task ended): read the STORED record, apply the consequence ─────────────────────────────────────────────────────
export async function decide(s: Services, task: Task<Extract<WalkCheckpoint, { phase: "decide" }>>, run: Run<any>): Promise<void> {
  const { feature, walk } = task.input;
  const { w, gateId } = task.checkpoint;
  const flow = FLOW();
  const rec = (await s.store.snapshot<MoveDocData>("kiln.move", gateId))?.record;
  await s.hooks.at("walk.settled-read");
  if (!rec) throw new Error(`the gate ${gateId} ended without a move: nothing settles a gate but a person's committed move`);
  const gate = w.cursor;
  const round = w.rounds[gate]!;
  if (rec.move.kind !== "approve") throw new Error(`the move "${rec.move.kind}" at ${gate} is not carried out yet`);
  const adv = approve(flow, w, gate, round, walk.built);
  await run.commit(async (tx) => {
    const wd = await walkDoc(tx, feature);
    wd.openGateId = null;
    if (adv.became) await appendOutbox(tx, { type: "gate.became-applicable", subject: feature, at: s.now(), actor: factoryActor, cause: `walk:${feature}:ui-slot`, data: { gate: adv.next!, reason: adv.became.reason as unknown as JSON } });
    if (adv.next === null) {
      wd.status = "done";
      const approved = Object.keys(adv.w.approved);
      await appendOutbox(tx, { type: "walk.completed", subject: feature, at: s.now(), actor: rec.move.decidedBy, cause: rec.key, data: { approved } });
      await s.hooks.at("walk.consume-after-write");
      return done({ outcome: "merged", approved });
    }
    await s.hooks.at("walk.consume-after-write");
    return { status: "running", checkpoint: { phase: "work", w: adv.w, todo: queueFor(flow, adv.w) } };
  });
  await s.hooks.at("walk.consume-committed");
  s.watch.notify(feature);
  void gateDef;
}
