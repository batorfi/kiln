// The walk's invariants W1–W4 and the walk-equality view (r14 T048; data-model §7). Pure: they read an INSPECTION made by a fresh reader with no owner — never the owner's memory — and the flow data.
//   W1  a walk's gates open in the flow's order over the pinned applicable gates; rounds are consecutive from 1; a gate is settled (its move committed) before the NEXT one opens; no round has two moves;
//       a gate pinned away is never opened (unless UI review turned on, recorded before its opening)
//   W2  each not-applicable / skipped / became-applicable outcome is recorded exactly once, and a not-applicable reason equals the engine's recomputation from the facts
//   W3  every decision entry names a decider that is not the factory, a task, a clock or a restart
//   W4  automatic fix rounds never exceed the pinned cap; each is `mitigate` by the factory
import { applicability, flowOf, gateDef, order } from "#contracts/flow/index.ts";
import type { AdmissionFacts } from "#contracts/flow/types.ts";
import type { GateKey } from "#contracts/moves.ts";
import { canonicalJson } from "#durable/canonical.ts";
import type { Inspection, StoredOutboxEntry } from "#durable/types.ts";

export type WalkInvariant = "W1" | "W2" | "W3" | "W4";
export interface WalkExpectation {
  feature: string;
  facts: AdmissionFacts;
  required?: GateKey[];
  /** The pinned cap, when the test knows it (default 2). */
  cap?: number;
}

const DECISIONS = ["move.committed", "gate.withdrawn", "walk.admitted", "walk.not-admitted", "walk.returned", "walk.split", "walk.left-lane", "walk.completed"];
const NOT_A_DECIDER = /^(factory|task:.*|clock|restart|timeout|owner|gate)$/;
const parse = (subject: string): { feature: string; key: string; round: number } | null => {
  const m = /^gate:([^:]+):([^:]+):(\d+)$/.exec(subject);
  return m ? { feature: m[1], key: m[2], round: Number(m[3]) } : null;
};

export function checkWalkInvariants(i: Inspection, o: WalkExpectation): WalkInvariant[] {
  const v = new Set<WalkInvariant>();
  const flow = flowOf("v2");
  const entries = [...i.outbox].sort((a, b) => a.seq - b.seq);
  const mine = (e: StoredOutboxEntry): boolean => e.subject === o.feature || parse(e.subject)?.feature === o.feature;
  const es = entries.filter(mine);

  // ── W1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const opened = es.filter((e) => e.type === "gate.opened");
  const movedSeq = new Map<string, number>();
  for (const e of es.filter((x) => x.type === "move.committed")) {
    if (movedSeq.has(e.subject)) v.add("W1"); // a round with two moves
    movedSeq.set(e.subject, e.seq);
  }
  opened.forEach((e, k) => {
    const next = opened[k + 1];
    if (next && !(movedSeq.has(e.subject) && movedSeq.get(e.subject)! < next.seq)) v.add("W1"); // the next gate opened with this one unsettled
  });
  const lastRound = new Map<string, number>();
  const firstIndex: number[] = [];
  const keys = order(flow);
  const naAt = new Map<string, number>();
  for (const e of es) if (e.type === "gate.not-applicable" || e.type === "gate.skipped") naAt.set((e.data as { gate: string }).gate, e.seq);
  const becameAt = new Map<string, number>();
  for (const e of es) if (e.type === "gate.became-applicable") becameAt.set((e.data as { gate: string }).gate, e.seq);
  for (const e of opened) {
    const p = parse(e.subject);
    if (!p) continue;
    if (p.round !== (lastRound.get(p.key) ?? 0) + 1) v.add("W1"); // rounds consecutive from 1
    if (p.round === 1) firstIndex.push(keys.indexOf(p.key as GateKey));
    lastRound.set(p.key, p.round);
    if (naAt.has(p.key) && !(becameAt.has(p.key) && becameAt.get(p.key)! < e.seq)) v.add("W1"); // a gate pinned away was opened
  }
  // first openings follow the flow's order (re-crossings reopen LATER rounds, never reorder the first crossing)
  for (let k = 1; k < firstIndex.length; k++) if (firstIndex[k] < firstIndex[k - 1]) v.add("W1");

  // ── W2 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const seen = new Map<string, number>();
  for (const e of es.filter((x) => ["gate.not-applicable", "gate.skipped", "gate.became-applicable"].includes(x.type))) {
    const id = `${e.type}|${(e.data as { gate: string }).gate}`;
    seen.set(id, (seen.get(id) ?? 0) + 1);
    if (e.type === "gate.not-applicable") {
      const want = applicability(gateDef(flow, (e.data as { gate: GateKey }).gate), o.facts, o.required ?? []).reason;
      // r15: the record carries the reason's facts (rule, evaluated, verdict), not its rendered sentence
      const { text: _sentence, ...facts } = (want ?? {}) as unknown as Record<string, unknown>;
      if (canonicalJson((e.data as { reason: unknown }).reason) !== canonicalJson(facts)) v.add("W2");
    }
  }
  if ([...seen.values()].some((n) => n > 1)) v.add("W2");

  // ── W3 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  for (const e of es.filter((x) => DECISIONS.includes(x.type))) if (!e.actor || NOT_A_DECIDER.test(e.actor) || !e.cause) v.add("W3");

  // ── W4 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const rounds = es.filter((x) => x.type === "walk.fix-round");
  if (rounds.length > 0) {
    const perPass = new Map<string, number>();
    for (const e of rounds) {
      const d = e.data as { kind?: string; pass?: number };
      if (e.actor !== "factory" || d.kind !== "mitigate") v.add("W4");
      perPass.set(String(d.pass ?? 0), (perPass.get(String(d.pass ?? 0)) ?? 0) + 1);
    }
    if ([...perPass.values()].some((n) => n > (o.cap ?? 2))) v.add("W4");
  }
  return [...v].sort() as WalkInvariant[];
}

/** The walk, as the record has it, WITHOUT the clock and the sequence numbers: two runs of the same walk — one killed and resumed, one not — must give the same list (walk equality). */
export function walkOutcomes(i: Inspection, feature: string): string[] {
  return [...i.outbox]
    .sort((a, b) => a.seq - b.seq)
    .filter((e) => e.subject === feature || parse(e.subject)?.feature === feature)
    .filter((e) => e.type !== "feature.archived") // the archive is a step of its own, judged by E6; its checksum depends on the run's clock and ids, and it may not have finished when a walk is inspected
    .map((e) => `${e.type}|${e.subject}|${e.actor}|${e.cause}|${canonicalJson(e.data)}`);
}

/** Every gate id the walk opened, in order (for running the per-gate oracle I1–I9 on each). */
export const walkGateIds = (i: Inspection, feature: string): string[] => [...i.outbox].sort((a, b) => a.seq - b.seq).filter((e) => e.type === "gate.opened" && parse(e.subject)?.feature === feature).map((e) => e.subject);
