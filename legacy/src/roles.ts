// kiln/src/roles.ts — T020 (US3): role classification + the strongest-model guard.
//
// Encodes G2/L1 from kiln/contracts/gate-rail.md: the four line-of-defense roles
// MUST run on the strongest resident model on every substrate (including local,
// per P-II); a weaker binding is a configuration error the factory rejects. Work
// roles may use a cheaper tier only upstream of the gate on their far side.
// It DOES NOT advance a gate — it only declares/inspects bindings (SC-006).

import { MITIGATION_CAP } from "../contracts/move-vocabulary.ts";

export type Tier = "strongest" | "standard" | "cheap" | "per-task";

/** The four line-of-defense roles — strongest, always (P-II / G2). */
export const LINE_OF_DEFENSE = ["architecture-critic", "verifier", "code-reviewer", "docs-synthesizer"] as const;
/** Work roles — a cheaper tier is acceptable upstream of the far gate. */
export const WORK = [
  "researcher",
  "concept-writer",
  "architecture-designer",
  "adr-maker",
  "worker",
  "techwriter",
  "pr-writer",
] as const;
export const TRIAGE = ["feature-size-triage"] as const;

export type Role = (typeof LINE_OF_DEFENSE)[number] | (typeof WORK)[number] | (typeof TRIAGE)[number];
export const ALL_ROLES: Role[] = [...LINE_OF_DEFENSE, ...WORK, ...TRIAGE];

export function isLineOfDefense(role: Role): boolean {
  return (LINE_OF_DEFENSE as readonly string[]).includes(role);
}

/**
 * G2/L1: bind a role to a model tier. A line-of-defense role may only be
 * `strongest`; any weaker tier is thrown as a configuration error.
 */
export function bindRole(role: Role, tier: Tier): Tier {
  if (isLineOfDefense(role) && tier !== "strongest") {
    throw new Error(
     `G2/L1 config error: line-of-defense role "${role}" cannot bind tier "${tier}"; must be "strongest" (P-II)`,
   );
   }
  return tier;
}

/** True when a weaker binding is (correctly) rejected for this role. */
export function weakerBindingRejected(role: Role, weakerTier: Tier): boolean {
  try {
    bindRole(role, weakerTier);
    return false;
    } catch {
      return true;
      }
}

export { MITIGATION_CAP };
