// kiln/src/live-walk.ts — T008 (US1), r3 · E2 (the live-walk sibling of r1's `kiln/src/walk.ts`).
//
// r1's `buildStubWalk` proved "a clean walk PASSES 001's log.ts; a broken auto-approve FAILs named
// R3" — but on a *deterministic stub* and a *partial* rail. E2 is the LIVE, FULL-RAIL sibling
// (research D3/D7): it drives the LIVE resident (E1, via the RECORDED `--live`/`--stub` selection,
// E3) through a *full Gates-1–9 lane* over the TRIVIAL THROWAWAY (NC1/§D4), emitting the SAME log
// union r1 emitted — `transition`/`gate-completion`/`human-decision`/`cost`/`wait`/`pre-delegation`
// — with **NO new `recordType`** (D8/NC3). Its emitted JSOnL PASSES 001's UNMODIFIED
// `kiln/validate/log.ts` (SC-001); a no-`decidedBy` broken variant FAILs it, NAMED R3 (SC-002→003).
//
// What E2 ADDS over r1 (so it is genuinely new content, not a re-declaration of the stub walk):
//   (a) a LIVE resident drives the units (E1) — the "kiln fires LIVE" (SC-001);
//   (b) a FULL nine-gate rail (D7): gates 1–9, the unattended-tail `pre-delegation` (FR-011, the
//      approve side pre-authorized and DISTINCT — the *opposite* of a silent approval), and a
//      line-of-defense VETO that HALTS the cruise (a durable `wait`, "the crack in the cool");
//   (c) it returns the per-step SNAPSHOTS so `assertSingleLane` (F-SINGLE / SC-003) and `switchCount`
//      (SC-004) are asserted over the LIVE sequence, not just a hand-built stub;
//   (d) the `roadmap_row_done`/Gate-0 RE-ENTRY at the close — a `wait` at `gate0` — so r3 *re-opens*
//      Gate 0 at its own seam withOUT admitting it (P-VI / FR-010 / SC-007), and records the resident
//      selection (F-NOT-SILENT).
//
// It is a *selector on the same emit sequence*, reusing the ancestors' primitives (LogWriter, the
// lane, the gate helper, the affinity scheduler, the clock) — NOT a second builder that re-declares
// them (D8). No cloud (P-VIII), no server (P-IX): it writes only 001's records to a LogWriter.

import { LogWriter } from "./log-writer.ts";
import { makeLane, run, assertSingleLane, type Lane } from "./lane.ts";
import { makePreDelegation, tokenFor, type Gate } from "./gate.ts";
import { makeClock, type Clock } from "./clock.ts";
import { switchCount } from "./scheduler.ts";
import type { WorkUnit } from "./stub-resident.ts";
import {
   selectResident,
   isResidentSelectionRecorded,
   type ResidentMode,
   type ResidentSelection,
} from "./live-resident.ts";

/**
 * The TRIVIAL THROWAWAY (NC1/§D4): a tiny one-off that walks the FULL rail for nothing else — its
 * nine units exercise every gate AND bind the line-of-defense roles to `strongest` (P-II), forcing a
 * genuine tier change so the walk realizes a `switchCount == 3` affinity tax (SC-004, P-IV). The
 * roles are the canonical rail roles; the tiers force exactly three transitions strongest↔standard.
 */
const THROWAWAY_UNITS: WorkUnit[] = [
  { id: "triage", role: "feature-size-triage", tier: "strongest", work: "r3 throwaway" },
  { id: "concept", role: "concept-writer", tier: "strongest" },
  { id: "architecture", role: "architecture-critic", tier: "strongest" },
  { id: "spec", role: "worker", tier: "strongest" },
  { id: "plan", role: "worker", tier: "standard" }, // tier change → swap #1
  { id: "review", role: "code-reviewer", tier: "strongest" }, // → swap #2
  { id: "verify", role: "verifier", tier: "strongest" },
  { id: "docs", role: "docs-synthesizer", tier: "strongest" },
  { id: "pr", role: "pr-writer", tier: "standard" }, // → swap #3
];

export interface LiveWalkOptions {
   clock?: Clock;
  /** The human decider per gate (default `human@batorfi`) — P-I: a human decides, the model runs. */
  human?: string;
  /** `--live` (DEFAULT, NC2) or `--stub`. */
  mode?: ResidentMode;
   /** The local model head (live position; defaults live-resident's DEFAULT_LOCAL_MODEL). */
  model?: string;
  /** E3/F-NOT-SILENT: RECORd the selection in the log (default `true`). `false` = the UNLOGGED
    *  stand-in `F-NOT-SILENT`/`LiveModelReady` catches — a `--stub` with NO recorded marker. */
  recordSelection?: boolean;
   /** Exercise the unattended tail: gate 4's approve side auto-crosses via a DISTINCT `pre-delegation` (FR-011). */
  preDelegate?: boolean;
   /** Demonstrate a line-of-defense VETO that HALTS the cruise (a durable `wait`, "the crack in the cool", FR-011). */
  haltVeto?: boolean;

  /** FALSIFY (the r1 `run.ts --broken` vector, reused on the live emit): strip one gate's
    *  `decidedBy` so the emitted log FAILs 001's log.ts with a NAMED R3 (SC-002 → SC-003). */
  brokenNoDecider?: boolean;
}

export interface LiveWalk {
   writer: LogWriter;
   lines: string[]; // emitted JSONL lines
   jsonl: string; // the full emitted stream
   snapshots: Lane[]; // per-step FactoryState — `assertSingleLane` (F-SINGLE / SC-003) over these
   switches: number; // realized affinity tax; SHALL == `switchCount(THROWAWAY_UNITS)` (SC-004 / P-IV)
   gates: Gate[]; // the gates the live lane opened/resolved
   mode: ResidentMode;
   resident: ResidentSelection; // E3: the selection (live default; `--stub` RECORDED)
   expectedSwitches: number; // `switchCount(THROWAWAY_UNITS)` — the P-IV counter the tax must equal
   broken: boolean; // whether the no-silent-approval hole was opened
}

/** Build a LIVE, full-rail nine-gate walk over the throwaway (E2, D7). */
export function buildLiveWalk(opts: LiveWalkOptions = {}): LiveWalk {
  const clock = opts.clock ?? makeClock();
  const human = opts.human ?? "human@batorfi";
  const mode = opts.mode ?? "live"; // NC2: live default
  const recordSelection = opts.recordSelection ?? true; // F-NOT-SILENT: RECORd by default
  const preDelegate = opts.preDelegate ?? true;
  const haltVeto = opts.haltVeto ?? true;
  const brokenNoDecider = opts.brokenNoDecider ?? false;

  // ── E1/E3: select the resident and RECORd the selection (F-NOT-SILENT) ──
  const resident = selectResident({
     mode,
    model: opts.model,
    assumeLiveAvailable: true, // NC2: the local head is guaranteed; the fallback is belt-and-suspenders
    recordSelection,
  });

  const writer = new LogWriter(clock);
  const emit = (rec: Parameters<LogWriter["write"]>[0]) => writer.write(rec);
  const gates: Gate[] = [];
  const wallClock = clock.wallClock();
  const expectedSwitches = switchCount(THROWAWAY_UNITS); // P-IV: the tax the walk must realize

  // ── the RECORDED selection rides 001's `transition` union as THE load (F-NOT-SILENT, E3/D2/D8) ──
   if (recordSelection) {
    emit({ recordType: "transition", transition: { kind: "load", from: "cold", to: resident.mode, reason: resident.marker } });
   }

  // ── the live affinity walk: hold the LIVE resident on the cold lane, then run the throwaway — ──
  //   pre-set the resident so run() holds/swaps/yields (no re-declared load) and produces the per-
  //   step SNAPSHOTS (F-SINGLE / SC-003) + the bracketing `cost` per genuine swap (P-IV / SC-004).
  const lane = makeLane({
    resident: { model: resident.resident.model(), tier: THROWAWAY_UNITS[0].tier },
    current: "r3",
    gate0: { status: "approved", rows: "r1..r6", decided_by: "human@batorfi", at: "2026-09-13T06:54:20Z" } as Lane["gate0"],
    roadmap: [
     { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
      { id: "r3", short: "first live-model smoke walk", deps: ["r1"], status: "active", gate: 1 },
     ],
   });
  const res = run(lane, THROWAWAY_UNITS, resident.resident, (ev) => {
   if ("kind" in ev) emit({ recordType: "transition", transition: ev });
       else emit({ recordType: "cost", cost: ev });
   });

  // A human-decided gate-completion (R3 via `decidedBy`) — the LIVE gates a human closes (FR-001/SC-001).
  const decide = (gateId: Gate["id"], move: string) => {
   const g: Gate = { id: gateId, open: true };
    gates.push(g);
   emit({ recordType: "human-decision", "human-decision": { gate: String(gateId), decidedBy: human, move } });
    g.move = move;
  g.decidedBy = human;
  g.open = false;
   emit({ recordType: "gate-completion", "gate-completion": { gate: gateId, move, cost: { switches: res.switches, wallClock }, decidedBy: human } });
   };

  // A line-of-defense VETO HALTS the cruise (FR-011/"the crack in the cool"): a durable `wait`, NO
  // completion — the unattended tail pre-authorizes only the approve side; a veto returns to a human.
  const vetoHaltFor = (gateId: Gate["id"]) => {
   const g: Gate = { id: gateId, open: true };
    gates.push(g);
   const wait = { gate: String(gateId), token: tokenFor(g), deadline: clock.now() };
    g.wait = wait;
   emit({ recordType: "wait", wait });
    };

  // ── gates 1–3: human-decided (concept, 2-architecture holds the lane then approves, spec) ──
  decide(1, "approve");
  decide(2, "approve");
  decide(3, "approve");

  // ── gate 4 (plan): the UNATTENED TAIL — a DISTINCT `pre-delegation` authorizes the approve side ──
  //     (FR-011: the *opposite* of a silent approval — a separate, recorded ledger entry, P-VI).
  if (preDelegate) {
    const g4: Gate = { id: 4, open: true };
   gates.push(g4);
    const pre = makePreDelegation("4", "plan #42 approved T", clock.now(), "code-reviewer");
    emit({ recordType: "pre-delegation", "pre-delegation": pre });
    g4.preDelegation = pre;
   g4.move = "approve";
  g4.open = false;
    emit({ recordType: "gate-completion", "gate-completion": { gate: 4, move: "approve", cost: { switches: res.switches, wallClock }, preDelegation: pre } });
    }

  // ── gate 5 (checkpoint): the "grow" move `split+revise` (G5), human-decided ──
  decide(5, "split+revise");

  // ── gate 6 (review): the code-reviewer (a LoD role on `strongest`, P-II) approves ──
  decide(6, "approve");

  // ── gate 7 (verification): the "crack in the cool" — a verifier VETO HALTS the cruise (a `wait`) ──
  if (haltVeto) {
    vetoHaltFor(7);
    }

  // ── gates 8–9: docs (a LoD role on `strongest`) + the PR, human-decided; gate 9 CLOSES the row ──
  decide(8, "approve");
  decide(9, "approve");

  // ── the inter-row seam: Gate 0 is RE-OPENED for a human — a `wait`, NOT an admission (P-VI/SC-007) ──
  const g0: Gate = { id: "gate0", open: true };
  gates.push(g0);
  const g0wait = { gate: "gate0", token: tokenFor(g0), deadline: clock.now() };
  g0.wait = g0wait;
  emit({ recordType: "wait", wait: g0wait });

  let lines = writer.drain().slice();
  let broken = false;
  if (brokenNoDecider) {
    // FALSIFY (SC-002→SC-003): open the no-silent-approval hole on the LIVE emit — strip gate 3's
    // human `decidedBy` (r1's `run.ts --broken` technique), so log.ts FAILs R3 *by name*.
    broken = true;
    lines = lines.map((l) => {
        let r: Record<string, unknown>;
       try {
       r = JSON.parse(l) as Record<string, unknown>;
          } catch {
       return l;
            }
      const gc = (r["gate-completion"] ?? {}) as Record<string, unknown>;
      if (r.recordType === "gate-completion" && String(gc.gate) === "3") {
         delete gc.decidedBy; // the no-silent-approval hole (R3 names this)
         delete gc.preDelegation;
        }
      return JSON.stringify(r);
        });
     }

  const result: LiveWalk = {
    writer,
    lines,
    jsonl: lines.join("\n"),
    snapshots: res.snapshots,
    switches: res.switches,
    gates,
     mode,
   resident,
   expectedSwitches,
   broken,
    };
  return result;
}

/** F-NOT-SILENT: is the resident selection RECORDED in this walk's emitted records (E3/D2)? */
export function liveWalkRecordsSelection(walk: LiveWalk, mode: ResidentMode = walk.mode): boolean {
  const records = walk.lines.map((l) => JSON.parse(l));
  return isResidentSelectionRecorded(records, mode);
}

/** P-III/SC-003: assert F-SINGLE over a live walk's per-step snapshots (a foundry throws). */
export function assertLiveSingleLane(walk: LiveWalk): void {
  assertSingleLane(walk.snapshots);
}

/** SC-001/SC-003 the dogfood helper: the live walk PASSES 001's `kiln/validate/log.ts` unmodified. */
export function liveWalkJsonl(walk: LiveWalk): string {
  return walk.jsonl;
}
