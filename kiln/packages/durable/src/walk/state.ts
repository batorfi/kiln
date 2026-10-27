// The walk's state and its pure reducers (data-model §3.2, research R3/R9). The WHOLE state of a walk lives in the row's checkpoint, so kill-and-resume is the library's, not a new mechanism.
// Everything here is a function of (flow data, state, inputs): no I/O, no clock — the same inputs give the same next state, which is what lets a restarted row recompute exactly what a killed one was about to do.
import { atUiSlot, order, unitRoles, upstreamOf, type Pins } from "#contracts/flow/index.ts";
import type { Applicability, BuiltFacts, FlowDefinition, Target } from "#contracts/flow/types.ts";
import type { GateKey } from "#contracts/moves.ts";
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
