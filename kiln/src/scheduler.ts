// kiln/src/scheduler.ts — T020/T021 (US4): the model-affinity scheduler + Cost (E4, P-IV/P-II).
//
// The director-as-scheduler's COST lever: hold the resident and change it ONLY when the next unit's
// tier differs (P-IV); a same-tier interior boundary swaps 0, a genuine tier change swaps 1. The
// four line-of-defense roles bind `strongest, always` via 001's `kiln/src/roles.ts` bindRole (G2/L1)
// — a weaker binding is REJECTED at schedule time, including on a local substrate (P-II). The Cost a
// walk realizes is the SWITCH count (the dominant local term of `wall-clock = work + switching`),
// not the gate count — bracketed by a `cost` record on every `transition.kind=swap` (greppable from
// the log alone). No cloud (P-VIII), no re-declaration of `roles.ts` (001 is canonical).

import { bindRole, isLineOfDefense, type Role, type Tier } from "./roles.ts";
import type { WorkUnit } from "./stub-resident.ts";
import { makeLane, run, type WalkResult } from "./lane.ts";

/**
 * The realized switch-tax: the number of GENUINE tier boundaries in a unit sequence. An
 * affinity-compatible interior boundary (two adjacent same-tier units) is provably ZERO (F-AFFINITY,
 * SC-004) — the counter is not inflated. This is the counter the lane's `run` also maintains (T021:
 * the two agree), and the number bracketed by each `cost` record.
 */
export function switchCount(units: WorkUnit[]): number {
  let n = 0;
  for (let i = 1; i < units.length; i++) {
    if (units[i].tier !== units[i - 1].tier) n += 1;
   }
  return n;
}

/**
 * Schedule a sequence of work units through the single lane. FIRST bind every role to its tier via
 * 001's bindRole — a line-of-defense role below `strongest` is a CONFIGURATION ERROR rejected here
 * (P-II / G2 / L1), so the rejection happens at schedule time, before anything runs. THEN run the
 * affinity walk (the lane's swaps == switchCount). Returns the lane's WalkResult (switches/costs).
 */
export function schedule(units: WorkUnit[], resident: Parameters<typeof run>[2]): WalkResult {
   // P-II / G2 / L1: reject any weaker line-of-defense binding at schedule time.
  for (const u of units) {
    bindRole(u.role, u.tier); // throws a G2/L1 config error on a sub-strongest LoD tier
    }
  return run(makeLane(), units, resident);
}

/** The four line-of-defense units MUST bind `strongest`; this is the F-AFFINITY + P-II probe. */
export function lodUnitsBoundStrongest(units: WorkUnit[]): boolean {
  return units.filter((u) => isLineOfDefense(u.role as Role)).every((u) => u.tier === "strongest");
}

export type { Role, Tier };
