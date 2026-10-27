// The brief the walk attaches to a gate (walk-contract §4): the small, deterministic set of facts r14 OWNS. To the store a brief is opaque JSON; the full ten-part brief is r20's.
// Pure: it reads the flow data and the walk state and builds plain JSON, so the same state gives the same bytes (and the same briefRef).
import { applicability, gateDef } from "#contracts/flow/index.ts";
import type { AdmissionFacts, FlowDefinition } from "#contracts/flow/types.ts";
import type { GateKey } from "#contracts/moves.ts";
import type { JSON } from "../types.ts";
import { vectorOf, type WalkState } from "./state.ts";

const CONDITIONAL_GATES = (flow: FlowDefinition): GateKey[] => flow.gates.filter((g) => g.appliesWhen).map((g) => g.key);

/** The brief of the admission crossing: what the person is asked to admit, with the proposals the walk will pin when they approve (they may require a gate or override triage in their move). */
export function admissionBrief(flow: FlowDefinition, feature: string, round: number, facts: AdmissionFacts, triage: { skip: boolean; reasoning: string } | undefined, instruction: string | undefined): JSON {
  const proposal: Record<string, JSON> = {};
  for (const key of CONDITIONAL_GATES(flow)) {
    const a = applicability(gateDef(flow, key), facts, []);
    proposal[key] = { applies: a.applies, why: a.why, ...(a.reason ? { reason: a.reason as unknown as JSON } : {}) };
  }
  const cap = flow.gates.find((g) => g.mitigationCap)?.mitigationCap;
  return {
    kind: "admission", feature, round,
    ...(instruction ? { instruction } : {}),
    facts: facts as unknown as JSON,
    interfaceGates: proposal,
    triage: triage ? { proposed: triage.skip, reasoning: triage.reasoning } : { proposed: false },
    fixRounds: { default: cap?.default ?? 2, min: cap?.min ?? 0, max: cap?.max ?? 3 },
  };
}

export function gateBrief(flow: FlowDefinition, feature: string, w: WalkState, gate: GateKey, round: number): JSON {
  const approved = w.approved[gate];
  let recross: JSON = null;
  if (w.recross && w.recross.gates.includes(gate)) {
    const now = vectorOf(flow, w, gate);
    const was = approved?.upstream ?? {};
    const changedSince = Object.keys(now).filter((k) => was[k] !== now[k]).map((k) => ({ gate: k, from: was[k] ?? null, to: now[k] }));
    const isTarget = w.recross.target === gate;
    recross = { target: w.recross.target, isTarget, changedSince: approved ? changedSince : [], unchanged: !isTarget && approved !== undefined && changedSince.length === 0 };
  }
  const applic: Record<string, JSON> = {};
  for (const [k, a] of Object.entries(w.pinned.applicability)) applic[k] = { applies: a!.applies, why: a!.why };
  const skipped = Object.keys(w.pinned.skipped);
  const g = gateDef(flow, gate);
  return {
    kind: "gate", feature, gate, round,
    instruction: w.instruction ? { from: w.instruction.from, note: w.instruction.note } : null,
    recross,
    triage: skipped.length ? { skipped, reasoning: Object.values(w.pinned.skipped)[0] ?? "" } : null,
    applicability: applic,
    fix: g.mitigationCap ? { cap: w.pinned.cap, used: w.fix.used, verdicts: w.fix.verdicts } : null,
  };
}
