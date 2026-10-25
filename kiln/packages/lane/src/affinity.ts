// The pure part of the first program's scheduler (r12 T029; legacy src/scheduler.ts): the swap rule, the
// swap counter and the schedule-time strongest-binding guard. `schedule` itself calls the lane runtime
// (`run`, `makeLane`), so it stays in legacy until the lane task arrives (r13/r16).
//
// Hold the resident and change it ONLY when the next unit's tier differs (P-IV): a same-tier boundary
// swaps 0, a genuine tier change swaps 1. Judges bind `strongest`, always (P-II / G2 / L1).
import { bindRole, isJudge } from "#contracts/roles.ts";
import type { RoleRoster } from "#contracts/flow/types.ts";
import type { WorkUnit } from "./types.ts";

/** The realized switch-tax: the number of genuine tier boundaries in a unit sequence. */
export function switchCount(units: readonly WorkUnit[]): number {
  let n = 0;
  for (let i = 1; i < units.length; i++) {
    if (units[i].tier !== units[i - 1].tier) n += 1;
  }
  return n;
}

/**
 * Bind every unit's role to its tier under the flow's roster. A judge below `strongest` is a configuration
 * error and THROWS SYNCHRONOUSLY: this is a plain function, never `async`, because a throw inside an async
 * function becomes a rejected promise and a "does not throw" assertion would pass vacuously on it.
 */
export function bindAll(units: readonly WorkUnit[], roster: RoleRoster, extraJudges: readonly string[] = []): void {
  for (const u of units) bindRole(u.role, u.tier, roster, extraJudges);
}

/** Every judge unit is bound `strongest` (the F-AFFINITY + P-II probe). */
export function judgeUnitsBoundStrongest(units: readonly WorkUnit[], roster: RoleRoster, extraJudges: readonly string[] = []): boolean {
  return units.filter((u) => isJudge(u.role, roster, extraJudges)).every((u) => u.tier === "strongest");
}
