// Role tier policy: a judge binds only to the strongest model (G2/L1, constitution II).
// Source: legacy/src/roles.ts; the roster is now data (the flow's) instead of a constant.
import type { RoleRoster } from "./flow/types.ts";

export type Tier = "strongest" | "standard" | "cheap" | "per-task";

/** The one error a refused binding throws; anything else thrown near a binding is a bug, not a refusal. */
export class TierPolicyError extends Error {
  override name = "TierPolicyError";
}

export function isJudge(role: string, roster: RoleRoster, extraJudges: readonly string[] = []): boolean {
  return roster.judges.includes(role) || extraJudges.includes(role);
}

/** A judge may only be `strongest`; any weaker tier is a configuration error. */
export function bindRole(role: string, tier: Tier, roster: RoleRoster, extraJudges: readonly string[] = []): Tier {
  if (isJudge(role, roster, extraJudges) && tier !== "strongest") {
    throw new TierPolicyError(`G2/L1 config error: judge role "${role}" cannot bind tier "${tier}"; must be "strongest" (P-II)`);
  }
  return tier;
}

/** True when a weaker binding is (correctly) refused for this role. */
export function weakerBindingRejected(role: string, weaker: Tier, roster: RoleRoster, extraJudges: readonly string[] = []): boolean {
  try {
    bindRole(role, weaker, roster, extraJudges);
    return false;
  } catch (e) {
    if (e instanceof TierPolicyError) return true;
    throw e;
  }
}
