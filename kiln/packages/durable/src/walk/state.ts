// The walk's state and its pure reducers (data-model §3.2, research R3/R9). The WHOLE state of a walk lives in the row's checkpoint, so kill-and-resume is the library's, not a new mechanism.
// Everything here is a function of (flow data, state, inputs): no I/O, no clock — the same inputs give the same next state, which is what lets a restarted row recompute exactly what a killed one was about to do.
import { atUiSlot, consequence, featureReject, order, unitRoles, upstreamOf, type Pins } from "#contracts/flow/index.ts";
import type { Applicability, BuiltFacts, FlowDefinition, Target } from "#contracts/flow/types.ts";
import type { GateKey, MoveKind } from "#contracts/moves.ts";
import { canonicalJson, sha256Hex } from "../canonical.ts";

/** What admission decided, once, for the life of the feature (spec FR-011, FR-016, FR-032). */
export interface PinnedState {
  /** The conditional (interface) gates only. */
  applicability: Partial<Record<GateKey, Applicability>>;
  /** Skipped by triage, with the reasoning. */
  skipped: Partial<Record<GateKey, string>>;
  /** Gates a person required at the Roadmap gate. */
  required: GateKey[];
  /** Verification's automatic fix rounds (0–3). */
  cap: number;
  overrideTriage: boolean;
}
export interface Approval {
  round: number;
  /** The artifact revisions this gate judged when it was approved: a re-crossed gate says what changed against THIS. */
  upstream: Record<string, string>;
}
export interface Recross {
  target: Target;
  /** The gates still to be crossed again. */
  gates: GateKey[];
}
export interface WalkState {
  pinned: PinnedState;
  /** The gate being worked on or waited on. */
  cursor: GateKey;
  /** The last round opened per gate. */
  rounds: Partial<Record<GateKey, number>>;
  approved: Partial<Record<GateKey, Approval>>;
  /** The current artifact revision per gate (and `@build`, the code). */
  revs: Record<string, string>;
  /** The previous move's note: the next step's instruction (GATE-5). */
  instruction?: { from: string; note: string };
  recross: Recross | null;
  /** Verification's automatic rounds: used so far, the verdict index, the verdicts consumed, and whether a person has rejected (no more automatic rounds after that). */
  fix: { used: number; ix: number; verdicts: ("pass" | "fail")[]; personRejected: boolean };
  /** Units to run before the cursor's own (the build step after a reject or restart). */
  prelude: string[];
}

export const pinsOf = (p: PinnedState): Pins => ({
  notApplicable: (Object.entries(p.applicability) as [GateKey, Applicability][]).filter(([, a]) => !a.applies).map(([k]) => k),
  skipped: Object.keys(p.skipped) as GateKey[],
});

export const artifactRev = (gate: string, label: string, upstream: Record<string, string>, note: string): string => sha256Hex(canonicalJson({ gate, label, upstream, note })).slice(0, 16);

/** The revisions this gate judges right now: every upstream artifact, in flow order. */
export function vectorOf(flow: FlowDefinition, w: WalkState, gate: GateKey): Record<string, string> {
  const v: Record<string, string> = {};
  for (const k of upstreamOf(flow, gate, pinsOf(w.pinned))) v[k] = w.revs[k] ?? "";
  return v;
}

export function startState(flow: FlowDefinition, pinned: PinnedState, first: GateKey): WalkState {
  void flow;
  return { pinned, cursor: first, rounds: {}, approved: {}, revs: { "@build": "build#0" }, recross: null, fix: { used: 0, ix: 0, verdicts: [], personRejected: false }, prelude: [] };
}

/** The scripted units of the cursor gate's next round, in order (the build step, if any, then author · check · judge). */
export const queueFor = (flow: FlowDefinition, w: WalkState): string[] => [...w.prelude, ...unitRoles(flow, w.cursor)];

/** Records the artifact revision of the round about to open. `sameContent` makes a fresh author yield identical content (research R9). */
export function withRev(flow: FlowDefinition, w: WalkState, gate: GateKey, round: number, sameContent: boolean): WalkState {
  const note = sameContent ? "" : w.instruction?.note ?? "";
  const label = sameContent ? "same" : `${gate}#${round}`;
  return { ...w, revs: { ...w.revs, [gate]: artifactRev(gate, label, vectorOf(flow, w, gate), note) } };
}

export interface Advance {
  w: WalkState;
  /** The next gate to open, or `null` after Merge. */
  next: GateKey | null;
  /** UI review turned on at its slot (recorded by the caller in the same commit). */
  became: Applicability | null;
}

/** A person's `approve` of the cursor gate: record the approval with what it judged, then find the next gate — and let UI review turn on at its slot if the changed files say so. */
export function approve(flow: FlowDefinition, w: WalkState, gate: GateKey, round: number, built: BuiltFacts | undefined): Advance {
  const left = w.recross ? w.recross.gates.filter((g) => g !== gate) : [];
  let w2: WalkState = {
    ...w,
    approved: { ...w.approved, [gate]: { round, upstream: vectorOf(flow, w, gate) } },
    recross: w.recross && left.length > 0 ? { ...w.recross, gates: left } : null,
    instruction: undefined,
    prelude: [],
  };
  const keys = order(flow);
  const dropped = new Set<GateKey>([...pinsOf(w2.pinned).notApplicable, ...pinsOf(w2.pinned).skipped]);
  let became: Applicability | null = null;
  for (let i = keys.indexOf(gate) + 1; i < keys.length; i++) {
    const k = keys[i];
    if (!dropped.has(k)) return { w: { ...w2, cursor: k }, next: k, became };
    const def = flow.gates.find((g) => g.key === k)!;
    const pinned = w2.pinned.applicability[k];
    const turn = pinned ? atUiSlot(def, pinned, built) : null;
    if (turn) {
      became = turn;
      w2 = { ...w2, pinned: { ...w2.pinned, applicability: { ...w2.pinned.applicability, [k]: turn } } };
      return { w: { ...w2, cursor: k }, next: k, became };
    }
  }
  return { w: w2, next: null, became };
}

// ── applying a person's move to the walk (r14 US5): a PURE function of (flow, state, the stored move) — so a restarted row recomputes exactly what a killed one was about to do ─────────────────
export interface MoveFact {
  gate: GateKey;
  round: number;
  gateId: string;
  kind: MoveKind;
  note?: string;
  target?: Target;
  decidedBy: string;
  /** The move's key: the cause of everything this move makes the walk record. */
  key: string;
}
export interface OutboxIntent {
  type: "walk.returned" | "walk.split" | "walk.left-lane" | "walk.completed" | "gate.became-applicable";
  actor: string;
  cause: string;
  data: Record<string, unknown>;
}
export interface Applied {
  w: WalkState;
  /** The units to run before the next gate opens (empty when the walk ends). */
  todo: string[];
  outbox: OutboxIntent[];
  /** The walk ended: merged, or left the lane. */
  end?: { status: "done" | "left-lane"; outcome: "merged" | "left-lane" };
}

export function applyMove(flow: FlowDefinition, w: WalkState, m: MoveFact, built: BuiltFacts | undefined, feature: string): Applied {
  const pins = pinsOf(w.pinned);
  if (m.kind === "approve") {
    const adv = approve(flow, w, m.gate, m.round, built);
    const outbox: OutboxIntent[] = [];
    if (adv.became) outbox.push({ type: "gate.became-applicable", actor: "factory", cause: `walk:${feature}:ui-slot`, data: { gate: adv.next, reason: adv.became.reason } });
    if (adv.next === null) {
      outbox.push({ type: "walk.completed", actor: m.decidedBy, cause: m.key, data: { approved: Object.keys(adv.w.approved) } });
      return { w: adv.w, todo: [], outbox, end: { status: "done", outcome: "merged" } };
    }
    return { w: adv.w, todo: queueFor(flow, adv.w), outbox };
  }

  const c = consequence(flow, m.gate, m.kind, m.target, pins);
  const note = m.note ?? "";
  const personRejected = m.kind === "reject" && flow.gates.find((g) => g.key === m.gate)?.mitigationCap !== undefined;
  const base: WalkState = { ...w, instruction: { from: m.gateId, note }, prelude: [], fix: personRejected ? { ...w.fix, personRejected: true } : w.fix };

  if (c.leaves) {
    return { w: base, todo: [], outbox: [{ type: "walk.left-lane", actor: m.decidedBy, cause: m.key, data: { from: m.gate, round: m.round, note } }], end: { status: "left-lane", outcome: "left-lane" } };
  }
  const label = (m.target ?? flow.gates.find((g) => g.key === m.gate)?.rules?.[m.kind]?.targets?.default ?? "same-gate") as string;
  const outbox: OutboxIntent[] = [];
  let w2: WalkState;
  if (c.goto === "@build") {
    // the code itself is redone (rework on the current code, or a rebuild from the restore point) and every gate after it is crossed again
    const first = c.recross[0];
    if (!first) throw new Error(`${m.gate}: nothing is judged after the build, so there is nothing to return to`);
    const rev = artifactRev("@build", `${c.work}#${(w.rounds[m.gate] ?? 0) + 1}`, { prev: w.revs["@build"] ?? "" }, note);
    w2 = { ...base, cursor: first, recross: { target: "@build", gates: c.recross }, prelude: [c.work], revs: { ...w.revs, "@build": rev } };
    outbox.push({ type: "walk.returned", actor: m.decidedBy, cause: m.key, data: { from: m.gate, round: m.round, kind: m.kind, target: "@build", work: c.work, recross: c.recross, note } });
  } else if (c.goto === m.gate) {
    // a fresh author (or the workers) at the same gate: nothing is re-crossed
    w2 = { ...base, cursor: m.gate, prelude: c.work === "workers" ? ["workers"] : [] };
  } else {
    const to = c.goto as GateKey;
    w2 = { ...base, cursor: to, recross: { target: to, gates: c.recross } };
    outbox.push({ type: "walk.returned", actor: m.decidedBy, cause: m.key, data: { from: m.gate, round: m.round, kind: m.kind, target: label, recross: c.recross, note } });
    if (c.records === "split") outbox.push({ type: "walk.split", actor: m.decidedBy, cause: m.key, data: { from: m.gate, remainder: note } });
  }
  return { w: w2, todo: queueFor(flow, w2), outbox };
}

// ── applying a FEATURE-LEVEL reject (a person sent the feature back at any time) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface FeatureRejectFact {
  key: string;
  decidedBy: string;
  target: Target;
  note: string;
  /** The gate that was withdrawn, if one was open. */
  gateId?: string;
}
export function applyFeatureReject(flow: FlowDefinition, w: WalkState, f: FeatureRejectFact): Applied {
  const pins = pinsOf(w.pinned);
  const c = featureReject(flow, f.target, pins);
  const personRejected = flow.gates.find((g) => g.key === w.cursor)?.mitigationCap !== undefined;
  const base: WalkState = { ...w, instruction: { from: f.gateId ?? `feature-move:${f.key}`, note: f.note }, prelude: [], fix: personRejected ? { ...w.fix, personRejected: true } : w.fix };
  const outbox: OutboxIntent[] = [{ type: "walk.returned", actor: f.decidedBy, cause: f.key, data: { from: w.cursor, kind: "reject", scope: "feature", target: f.target, recross: c.recross, note: f.note } }];
  let w2: WalkState;
  if (c.goto === "@build") {
    const first = c.recross[0];
    if (!first) throw new Error("nothing is judged after the build, so there is nothing to return to");
    const rev = artifactRev("@build", `workers#${w.rounds[w.cursor] ?? 0}`, { prev: w.revs["@build"] ?? "" }, f.note);
    w2 = { ...base, cursor: first, recross: { target: "@build", gates: c.recross }, prelude: ["workers"], revs: { ...w.revs, "@build": rev } };
  } else {
    w2 = { ...base, cursor: c.goto as GateKey, recross: { target: c.goto as GateKey, gates: c.recross } };
  }
  return { w: w2, todo: queueFor(flow, w2), outbox };
}
