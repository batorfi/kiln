// The oracle: invariants I1–I9 (data-model §2.6) over an INSPECTION read by a fresh process with no owner — so the verdict never rests on memory. Pure: no I/O, no library.
// Re-created from r42's oracle (not imported) and extended for r13: opening is atomic (I3), events are committed with their state (I3), the lane (I8), the command ledger (I9).
import type { Inspection } from "#durable/types.ts";

export type Invariant = "I1" | "I2" | "I3" | "I4" | "I5" | "I6" | "I7" | "I8" | "I9" | "I10";

export interface OracleContext {
  /** A task the library reported parked or faulted (the owner's `reports` was not empty). */
  blocked?: boolean;
}

/** The invariants ONE inspection violates (I5 needs two inspections: see `checkStability`). */
export function checkInvariants(i: Inspection, ctx: OracleContext = {}): Invariant[] {
  const v = new Set<Invariant>();
  const r = i.records.length;
  const d = i.documents;
  // I1 — waiting ⇔ no move record (the "waiting" half; the "settled" half is I2)
  if (i.gate === "waiting" && r > 0) v.add("I1");
  // I2 — settled ⇔ exactly one record AND the decision task terminal with that record's key
  if (i.gate === "settled" && !(r === 1 && i.decision === "terminal" && i.decisionMatchesRecord)) v.add("I2");
  // I3 — no half-applied state: a move without its completion (or the reverse); an opening without its brief or its `gate.opened`; an event without its state (or the reverse)
  const withdrawn = i.gate === "withdrawn";
  if ((r > 0 && i.decision !== "terminal") || (r === 0 && i.decision === "terminal" && !withdrawn) || (i.gate === "settled" && r === 0)) v.add("I3");
  if ((d.gate && (!d.brief || !d.opened)) || ((d.brief || d.opened) && !d.gate)) v.add("I3");
  if ((r > 0 && !d.moveCommitted) || (d.moveCommitted && r === 0 && !withdrawn)) v.add("I3");
  if ((i.gateTask === "terminal" && !d.gateSettled && !withdrawn) || (d.gateSettled && i.gateTask !== "terminal")) v.add("I3");
  // I10 (r14) — a WITHDRAWN gate: a withdrawal on its document ⇔ the gate is withdrawn; it has NO move record, its decision is terminal with that withdrawal's key, `gate.withdrawn` and the feature move's
  // `move.committed` are in the record, and it was never `gate.settled`. A gate is never both settled and withdrawn.
  const wd = i.withdrawal ?? null;
  if ((wd !== null) !== withdrawn) v.add("I10");
  if (withdrawn && !(r === 0 && i.decision === "terminal" && i.decisionMatchesRecord && d.gateWithdrawn === true && d.moveCommitted && !d.gateSettled)) v.add("I10");
  if (!withdrawn && d.gateWithdrawn === true) v.add("I10");
  // every entry names an actor and a cause (constitution VII)
  if (i.outbox.some((e) => !e.actor || !e.cause)) v.add("I3");
  // I4 — at most one record per gate
  if (r > 1) v.add("I4");
  // I6 — a WAITING gate is never blocked or parked
  if (i.gate === "waiting" && ctx.blocked) v.add("I6");
  // I7 — no timer, sleep or deadline on the gate or its decision
  if (i.timers.length > 0) v.add("I7");
  // I8 — the lane never records two holders, and its entries balance with its lease
  const acq = i.outbox.filter((e) => e.type === "lane.acquired").length;
  const rel = i.outbox.filter((e) => e.type === "lane.released").length;
  const balance = acq - rel;
  let held = 0; // walking the entries in order: at NO instant do they record two holders (or a release of nothing)
  for (const e of [...i.outbox].sort((a, b) => a.seq - b.seq)) {
    if (e.type === "lane.acquired") held += 1;
    else if (e.type === "lane.released") held -= 1;
    if (held < 0 || held > 1) v.add("I8");
  }
  if (i.lane.holders > 1 || balance < 0 || balance > 1 || (acq + rel > 0 && balance !== i.lane.holders)) v.add("I8");
  // I9 — every command key maps to exactly one request hash
  if (Object.values(i.commands).some((h) => new Set(h).size > 1)) v.add("I9");
  return [...v].sort() as Invariant[];
}

/**
 * I5 / I6 across a restart: compare two inspections of the same gate taken with NO move submitted between them.
 * A settled gate must stay settled with the same record (I5); a waiting gate must stay waiting (and, with the owner's reports empty, unparked) (I6).
 */
export function checkStability(before: Inspection, after: Inspection, ctx: OracleContext = {}): Invariant[] {
  const v = new Set<Invariant>();
  if (before.gate === "settled") {
    if (after.gate !== "settled" || JSON.stringify(before.records[0]) !== JSON.stringify(after.records[0])) v.add("I5");
  } else if (before.gate === "waiting") {
    if (after.gate === "settled" || ctx.blocked) v.add("I6");
  }
  return [...v].sort() as Invariant[];
}
