// kiln/src/lane.ts — T007/T008 (US1): the single lane + director-as-scheduler (E1, P-III).
//
// The runtime of Principle III "the thesis of the whole system": ONE chamber, EXACTLY one resident
// model and ONE running unit at any instant. The director IS the scheduler (no separate abstraction)
// — it HOLDS the lane on a resident, YIELDS the running slot to a work unit, RECLAIMS it when the
// unit returns, and runs the next affinity-compatible unit with NO swap; it swaps the resident only
// on a genuine tier change (P-IV; the full counter is US4's `scheduler.switchCount`).
//
// The single-lane invariant `F-SINGLE` (SC-001) is asserted over FACTORY-STATE SNAPSHOTS captured
// at each step — not merely the final state — so "at any instant" is provable, not just a final
// check. The lane is decoupled from the writer: it emits transition/cost *events* through an
// optional sink `(ev) => void` rather than taking a LogWriter (no cross-story coupling; D1).
//
// No cloud (P-VIII), no gate advance (P-VI), no server (P-IX) — a stub resident drives it.

import type { Cost, FactoryState } from "./types.ts";
import type { Resident, WorkUnit } from "./stub-resident.ts";
import { makeClock, type Clock } from "./clock.ts";

export type { WorkUnit, Resident } from "./stub-resident.ts";

/** The single lane IS the single-resident `FactoryState` (E1); no parallel structure. */
export type Lane = FactoryState;

/** A transition event the walk emits; the writer (E3) turns these into seq/ts-stamped records. */
export interface TransitionEvent {
  kind: "load" | "hold" | "yield" | "swap";
  from?: string;
  to?: string;
  reason?: string;
}
/** A cost bracketing a swap transition (P-IV; one `cost` per genuine tier boundary). */
export type CostEvent = Cost;

/** The outcome of a walk: the final state, the snapshots (for F-SINGLE), and the emitted events. */
export interface WalkResult {
  state: Lane;
  snapshots: Lane[]; // FactoryState captured at each step (F-SINGLE asserted over these)
  transitions: TransitionEvent[];
  costs: CostEvent[]; // one per `transition.kind=swap`, bracketing it
  switches: number; // the realized switch-tax (# genuine tier boundaries)
  wallClock: string; // "HH:MM"
  resident: { model: string; tier: string } | null;
}

/** A fresh single-lane state: resident null, running null, empty queue, switches 0. */
export function makeLane(state?: Partial<FactoryState>): Lane {
  return {
    resident: null,
    running: null,
    queue: [],
    switches: 0,
    wallClock: "00:00",
    roadmap: [],
    current: "",
    gate0: { status: "pending" },
    gate: null,
     ...state,
   };
}

// A fresh snapshot (a plain copy of the single-resident store) — F-SINGLE is asserted over copies so
// a later mutation never back-dates an earlier "instant".
function snap(lane: Lane): Lane {
  return JSON.parse(JSON.stringify(lane)) as Lane;
}

// A deterministic lane clock (shared by run + snapshots): "HH:MM", advancing per read. P-IX: this is
// a pure function of a tick counter, never a setTimeout/setInterval refresh loop.
let clock: Clock = makeClock();
/** (test hook) pin a fixed lane wall-clock without a real timer (P-IX: no setTimeout). */
export function setLaneClock(c: Clock): void {
  clock = c;
}

/**
 * Hold the lane on its resident. On a cold lane it loads the first unit's tier into a fresh
 * resident (a `load` transition); otherwise it simply holds the resident. Returns the pre-step
 * snapshot.
 */
export function hold(lane: Lane, resident: Resident, first?: WorkUnit, out: TransitionEvent[] = []): Lane {
  const s = snap(lane);
  if (lane.resident === null) {
    lane.resident = { model: resident.model(), tier: first ? first.tier : resident.tier() };
    out.push({ kind: "load", from: "cold", to: resident.model(), reason: "hold a resident on a cold lane" });
     }
  out.push({ kind: "hold", to: resident.model() });
  return s;
     }

/**
 * Yield the running slot to exactly one unit and run it (P-III). Returns the post-yield snapshot,
 * in which EXACTLY one unit is live — the instant F-SINGLE must hold. The slot is NOT reclaimed
 * here; that is `resume` (so a snapshot can capture the live unit).
 */
export function yield_(lane: Lane, unit: WorkUnit, resident: Resident, out: TransitionEvent[] = []): Lane {
  lane.running = { duId: unit.id, role: unit.role };
  out.push({ kind: "yield", to: unit.id, reason: `run ${unit.role} on ${resident.model()}` });
  const s = snap(lane); // the live instant: one resident + one running unit
  resident.run(unit); // the stub returns a fixed output (NC2 deterministic)
  return s;
}

/** Reclaim the running slot after a unit returns (P-III): the next affinity-compatible unit may run. */
export function resume(lane: Lane, out: TransitionEvent[] = []): Lane {
  const s = snap(lane);
  lane.running = null;
  return s;
}

/**
 * Drive a walk of work units through the single lane. The director holds the lane on a resident,
 * yields to each unit, reclaims, and — ONLY on a genuine tier change — swaps the resident (P-IV),
 * bracketing that swap with a `cost` record. Emits each transition (and a bracketing cost per swap)
 * through `sink` if provided. Same-tier units incur ZERO switches (F-AFFINITY preview; SC-004).
 */
export function run(
  lane: Lane,
  units: WorkUnit[],
  resident: Resident,
  sink?: (ev: TransitionEvent | CostEvent) => void,
): WalkResult {
  const snapshots: Lane[] = [];
  const transitions: TransitionEvent[] = [];
  const costs: CostEvent[] = [];
  let residentTier = resident.tier();

  for (const unit of units) {
    const cold = lane.resident === null;
     // P-IV: swap the resident ONLY when this unit's required tier differs from the resident's.
    if (cold) {
      residentTier = unit.tier;
      hold(lane, resident, unit, transitions);
       } else if (unit.tier !== residentTier) {
      lane.switches += 1;
      const to = resident.model();
      transitions.push({ kind: "swap", from: to, to, reason: `tier ${residentTier} → ${unit.tier}` });
      sink?.({ kind: "swap", from: to, to, reason: `tier ${residentTier} → ${unit.tier}` });
      const cost: CostEvent = { switches: lane.switches, wallClock: lane.wallClock };
      costs.push(cost);
      sink?.(cost);
      residentTier = unit.tier;
      hold(lane, resident, undefined, transitions);
      } else {
      hold(lane, resident, undefined, transitions);
      }
    snapshots.push(snap(lane));

     // P-III: yield to exactly one unit, then reclaim it — the next unit never starts before the
    // current one is reclaimed (F-SINGLE).
    yield_(lane, unit, resident, transitions);
    snapshots.push(snap(lane)); // the LIVE instant captured: exactly one running unit
    resume(lane, transitions); // reclaim the slot
    snapshots.push(snap(lane));
    }

  lane.wallClock = clock.wallClock();
  return {
    state: lane,
    snapshots,
    transitions,
    costs,
    switches: lane.switches,
    wallClock: lane.wallClock,
    resident: lane.resident,
   };
}

/**
 * Assert the single-lane invariant F-SINGLE (= SC-001 / P-III) over a sequence of FactoryState
 * snapshots: at NO two adjacent captured instants are two DIFFERENT running units live at once (a
 * "foundry" is illegal), and no snapshot ever carries two live units. Throws on a forged
 * two-running-at-once sequence (the negative test), proving the check is real.
 */
export function assertSingleLane(snapshots: Lane[]): void {
  for (let i = 0; i < snapshots.length; i++) {
    const s = snapshots[i];
    if ((s.running ? 1 : 0) > 1 || (s.resident ? 1 : 0) > 1) throw new Error(`F-SINGLE: snap ${i} carries two live units`);
    if (i > 0) {
      const prev = snapshots[i - 1];
      if (prev.running && s.running && prev.running.duId !== s.running.duId && !reclaimedBetween(snapshots, i - 1, i)) {
          throw new Error(`F-SINGLE: two different running units (${prev.running.duId} then ${s.running.duId}) live without a reclaim — a foundry`);
      }
    }
   }
}

function reclaimedBetween(snapshots: Lane[], from: number, to: number): boolean {
  for (let i = from + 1; i < to; i++) if (snapshots[i].running === null) return true;
  return false;
}

/** (US1 test aid) does the walk's transition list carry a `swap`? */
export function hasSwapTransition(transitions: TransitionEvent[]): boolean {
  return transitions.some((t) => t.kind === "swap");
}
