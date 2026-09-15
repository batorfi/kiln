// kiln/src/walk.ts — T028 (US6) · drives the dogfood for US3 too:
// a DETERMINISTIC stub-resident walk that emits a complete, schema-conformant factory-log.
//
// This is the "the kiln fires" stand-in: a stub resident (NC2) moves a small set of work units
// through the single lane, opens/decides gates exactly as `kiln/src/gate.ts` prescribes, and feeds
// every event to a `LogWriter`. The emitted JSONL is REPLAYED through 001's unmodified
// `kiln/validate/log.ts` (D5) — the dogfood that makes SC-003 true. A live-model walk is r3, NOT
// this. No cloud (P-VIII); nothing here advances Gate 0 or a real feature (P-VI / FR-012).

import { LogWriter, type EmitInput } from "./log-writer.ts";
import {
  makeLane,
} from "./lane.ts";
import { makeStubResident, type WorkUnit } from "./stub-resident.ts";
import { makePreDelegation, tokenFor, type Gate } from "./gate.ts";
import { makeClock, type Clock } from "./clock.ts";

export interface StubWalk {
  writer: LogWriter;
  jsonl: string; // the full emitted stream
  lines: string[]; // emitted lines (for truncation / forced-violation tests)
  switches: number;
  gates: Gate[]; // the gates the walk opened/resolved
}

export interface BuildStubWalkOptions {
  clock?: Clock;
  human?: string; // the decider, e.g. "human@batorfi"
  preDelegate?: boolean; // also exercise the unattended-tail auto-approve path (US2 AC-4)
  haltOnVeto?: boolean; // exercise a veto → a durable WAIT (the cruise halts)
}

/**
 * Build a complete stub walk. The emitted stream:
 *   load → hold → yields (same-tier units, zero switches) → a genuine tier change (one swap + a
 *   bracketing `cost`) → a human-decided `gate-completion` (R3 via `decidedBy`) → an unattended-tail
 *   `pre-delegation` + auto `gate-completion` (the DISTINCT ledger entry, R4) → a headless `wait`
 *   (a gate a missing UI may only record, never resolve). Every line stamps seq/ts; the stream
 *   passes 001's `kiln/validate/log.ts`.
 */
export function buildStubWalk(opts: BuildStubWalkOptions = {}): StubWalk {
  const clock = opts.clock ?? makeClock();
  const human = opts.human ?? "human@batorfi";
  const writer = new LogWriter(clock);
  const gates: Gate[] = [];
  const wallClock = clock.wallClock(); // a single "HH:MM" the cost records carry
  let switches = 0;

  const emit = (rec: EmitInput) => writer.write(rec);

  // ---- The lane: load + hold, then yield a same-tier unit (F-AFFINITY: no switch). ----
  const lane = makeLane();
  const resident = makeStubResident({ model: "stub", tier: "strongest" });
  const u1: WorkUnit = { id: "concept", role: "concept-writer", tier: "strongest", out: "concept-ok" };
  const u2: WorkUnit = { id: "spec", role: "worker", tier: "strongest", out: "spec-ok" };
  resident.run(u1);
  resident.run(u2);
  emit({ recordType: "transition", transition: { kind: "load", from: "cold", to: "stub" } });
  emit({ recordType: "transition", transition: { kind: "hold", to: "stub" } });
  emit({ recordType: "transition", transition: { kind: "yield", to: "concept", reason: "run concept-writer on stub" } });
  emit({ recordType: "transition", transition: { kind: "yield", to: "spec", reason: "run worker on stub (affinity, no swap)" } });

   // ---- A GENUINE tier change ⇒ exactly one swap, bracketed by a `cost` (P-IV). ----
  const u3: WorkUnit = { id: "docs", role: "techwriter", tier: "standard", out: "docs-ok" };
  switches = 1;
  emit({ recordType: "transition", transition: { kind: "swap", from: "stub", to: "stub", reason: "tier strongest → standard" } });
  emit({ recordType: "cost", cost: { switches, wallClock } });

   // ---- A human-decided gate-completion (R3 via decidedBy). ----
  const g3: Gate = { id: 3, open: true };
  gates.push(g3);
  emit({ recordType: "human-decision", "human-decision": { gate: "3-spec", decidedBy: human, move: "approve" } });
  g3.move = "approve";
  g3.decidedBy = human;
  g3.open = false;
  emit({ recordType: "gate-completion", "gate-completion": { gate: g3.id, move: "approve", cost: { switches, wallClock }, decidedBy: human } });

   // ---- The unattended tail (US2 AC-4): a DISTINCT pre-delegation authorizes gate 4's approve side. ----
  if (opts.preDelegate ?? true) {
    const g4: Gate = { id: 4, open: true };
    gates.push(g4);
    const pre = makePreDelegation("4", "spec #42 approved T1", clock.now(), "code-reviewer");
    emit({ recordType: "pre-delegation", "pre-delegation": pre });
    g4.preDelegation = pre;
    g4.move = "approve";
    g4.open = false;
    emit({ recordType: "gate-completion", "gate-completion": { gate: g4.id, move: "approve", cost: { switches, wallClock }, preDelegation: pre } });
    }

   // ---- A headless gate: recorded as a WAIT, never resolved (P-V). ----
  const g6: Gate = { id: 6, open: true };
  gates.push(g6);
  const wait = { gate: String(g6.id), token: tokenFor(g6), deadline: clock.now() };
  g6.wait = wait;
  emit({ recordType: "wait", wait });

   // ---- A veto halts the cruise: a WAIT, not a gate-completion (US2 AC-4). ----
  if (opts.haltOnVeto) {
    const g7: Gate = { id: 7, open: true };
    gates.push(g7);
    const wait7 = { gate: String(g7.id), token: tokenFor(g7), deadline: clock.now() };
    g7.wait = wait7;
    emit({ recordType: "wait", wait: wait7 });
  }

  return { writer, jsonl: writer.drain().join("\n"), lines: writer.drain().slice(), switches, gates };
}

// ───────────────────────────────────────────────────────────────────────────────────────────────
// r2 (US4 / E3, T017): a CLOSED-ROW PROGRAM WALK — a closed Row → a re-entered Gate 0 at the seam.
// Emits, through the R3-guarded LogWriter: a row's closing gate-9 `gate-completion` (the @PR#N close),
// a HUMAN gate-0 admission (`gate-completion` at gate:"gate0" with a `human@…` decidedBy — F1), and a
// `wait` at gate0 (Gate 0 RE-ENTERED at the inter-row seam). `brokenAutoApprove` simulates the broken
// path that *would* auto-approve a missing Gate 0 by stripping the human decider → the emitted log
// FAILs 001's log.ts R3 with a named reason (the SC-002→SC-003 negative). No cloud (P-VIII);
// NOTHING here admits its own program — the admission is a RECORDED human move (P-VI / FR-014 / SC-007).
// ───────────────────────────────────────────────────────────────────────────────────────────────

export interface BuildProgramWalkOptions {
  clock?: Clock;
  gate0By?: string; // the human decider, e.g. "human@batorfi" (F1: human-only)
  brokenAutoApprove?: boolean; // if true: strip the gate-0 decider → log FAILs R3 (the SC-003 negative)
}

export interface ProgramWalk {
  lines: string[]; // emitted JSONL lines (for truncation / replay)
  jsonl: string; // the full emitted stream
  broken: boolean; // whether the no-silent-approval hole was opened
}

/**
 * Build a closed-row program walk. The emitted stream (all R1–R6 conformant when `broken` is false):
 *   transition(load) → gate-completion(gate 9, @PR#1, human-decided — a row CLOSED) →
 *    human-decision(gate0) → gate-completion(gate :"gate0", approve, human decider — the ADMISSION,
 *    F1) → wait(gate0) (Gate 0 RE-ENTERED at the seam). The complete stream PASSES 001's log.ts;
 *   with `brokenAutoApprove` the gate-0 decider is stripped and the SAME stream FAILs R3, named.
 */
export function buildProgramWalk(opts: BuildProgramWalkOptions = {}): ProgramWalk {
  const clock = opts.clock ?? makeClock();
  const human = opts.gate0By ?? "human@batorfi";
  const writer = new LogWriter(clock);
  const gates: Gate[] = [];
  const wallClock = clock.wallClock();
  const emit = (rec: EmitInput) => writer.write(rec);

   // ---- context: a cold lane loads a resident (a closed row's tail) ----
  emit({ recordType: "transition", transition: { kind: "load", from: "cold", to: "stub" } });

   // ---- a row CLOSES: gate 9 (the row's PR/approve) → @PR# (R3 via a human decider) ----
  const g9: Gate = { id: 9, open: true };
  gates.push(g9);
  emit({ recordType: "human-decision", "human-decision": { gate: "9-pr", decidedBy: human, move: "approve" } });
  g9.move = "approve";
  g9.decidedBy = human;
  g9.open = false;
  emit({ recordType: "gate-completion", "gate-completion": { gate: 9, move: "approve", cost: { switches: 0, wallClock }, decidedBy: human } });

   // ---- the inter-row seam RE-OPENS Gate 0 for a HUMAN admission (F1: human-only, no exception) ----
  const g0: Gate = { id: "gate0", open: true };
  gates.push(g0);
  emit({ recordType: "human-decision", "human-decision": { gate: "gate0", decidedBy: human, move: "approve" } });
  g0.move = "approve";
  g0.decidedBy = human;
  g0.open = false;
  emit({ recordType: "gate-completion", "gate-completion": { gate: "gate0", move: "approve", cost: { switches: 0, wallClock }, decidedBy: human } });

   // ---- Gate 0 is RE-ENTERED at the seam: recorded as a WAIT (a program gate a missing UI only records) ----
  const g0wait = { gate: String("gate0"), token: tokenFor({ id: "gate0" }), deadline: clock.now() };
  emit({ recordType: "wait", wait: g0wait });

  let lines = writer.drain().slice();
  let broken = false;
  if (opts.brokenAutoApprove) {
     // The BROKEN path that *would* auto-approve a missing Gate 0: strip the human decider from the
     // gate-0 `gate-completion` (and its `human-decision`) → R3 must catch it by NAME when replayed.
    broken = true;
    lines = lines.map((l) => {
      let r: Record<string, unknown> & Record<string, any>;
      try {
        r = JSON.parse(l) as any;
        } catch {
      return l; // leave a non-JSON (never happens) line untouched
          }
      if (r.recordType === "gate-completion" && String(r["gate-completion"]?.gate) === "gate0") {
        delete r["gate-completion"].decidedBy; // the no-silent-approval hole (R3 names this)
         }
      return JSON.stringify(r);
       });
     }
  return { lines, jsonl: lines.join("\n"), broken };
}
