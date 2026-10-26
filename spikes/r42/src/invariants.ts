// T012 — the oracle: invariants I1–I7 (data-model §2) over an INSPECTION of a reopened store. Pure; no I/O, no library.
// An inspection is built by a strategy from the store alone, by a fresh process with no owner — so the verdict never rests on memory (guarantee e).
//
// Three facts decide almost everything: G (the gate's state as the store derives it), R (how many move records exist) and D (the decision
// task's status). The half-applied move — the thing the spike hunts — is a disagreement between R and D.
import type { MoveRecord } from "./port.ts";

export interface Inspection {
  /** The gate's state as derived from the store. */
  gate: "waiting" | "settled";
  records: MoveRecord[];
  /** `absent`: no decision task exists (yet); `live`: exists and not terminal; `terminal`: completed. */
  decisionTask: "absent" | "live" | "terminal";
  /** When the decision task is terminal: does its recorded outcome equal the recorded move? */
  decisionOutcomeMatches: boolean;
  /** Any timer, sleep or deadline found on the gate or decision task (empty is the only acceptable value). */
  timers: string[];
  /** The gate or decision task is blocked/parked (for example by the library's restart limit). */
  blocked: boolean;
}

export type Invariant = "I1" | "I2" | "I3" | "I4" | "I5" | "I6" | "I7";

/** The invariants a single inspection violates (I5 needs two inspections: see `checkStability`). */
export function checkInvariants(i: Inspection): Invariant[] {
  const v = new Set<Invariant>();
  const r = i.records.length;
  // I1 — waiting ⇔ no move record (this is the "waiting" half; the "settled" half is I2)
  if (i.gate === "waiting" && r > 0) v.add("I1");
  // I2 — settled ⇔ exactly one record AND the decision task is terminal with that move's outcome
  if (i.gate === "settled" && !(r === 1 && i.decisionTask === "terminal" && i.decisionOutcomeMatches)) v.add("I2");
  // I3 — the half-applied move: a record without a completed decision, a completed decision without a record, or a settled gate without a record
  if ((r > 0 && i.decisionTask !== "terminal") || (r === 0 && i.decisionTask === "terminal") || (i.gate === "settled" && r === 0)) v.add("I3");
  // I4 — at most one record per gate, whatever the number of submissions or restarts
  if (r > 1) v.add("I4");
  // I6 — a WAITING gate is never blocked or parked (a settled gate is not required to be unblocked)
  if (i.gate === "waiting" && i.blocked) v.add("I6");
  // I7 — no timer, sleep or deadline on the gate or the decision task
  if (i.timers.length > 0) v.add("I7");
  return [...v].sort() as Invariant[];
}

/**
 * I5 / I6 across a restart: compare two inspections of the same gate taken with NO move submitted between them.
 * A settled gate must stay settled with the same record (I5); a waiting gate must stay waiting and unblocked (I6).
 */
export function checkStability(before: Inspection, after: Inspection): Invariant[] {
  const v = new Set<Invariant>();
  if (before.gate === "settled") {
    if (after.gate !== "settled" || JSON.stringify(before.records[0]) !== JSON.stringify(after.records[0])) v.add("I5");
  } else {
    if (after.gate === "settled" || after.blocked) v.add("I6");
  }
  return [...v].sort() as Invariant[];
}
