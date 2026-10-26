// T023 — the status rules (contracts/spike-report.md §2). The point of this file is what it REFUSES to say: a guarantee is `held` only by scenarios that
// RAN and passed, a missing scenario is never a pass, and supporting evidence (random kills) can condemn but never acquit.
import type { Invariant } from "./invariants.ts";
import type { GuaranteeEvidence, GuaranteeStatus, ScenarioResult } from "./evidence-model.ts";

export interface StatusOptions {
  /** How many kill points the strategy declared. 0 ⇒ the guarantees those points would test are `not-proven`. Omit when kill points are not relevant to this run. */
  declaredKillPoints?: number;
}

export function deriveStatus(results: readonly ScenarioResult[], opts: StatusOptions = {}): GuaranteeStatus {
  // evidence of failure outranks missing evidence: a violation that was observed is a fact, an absence is only an absence
  if (results.some((r) => r.ran && !r.passed)) return "not-held";
  if (results.length === 0 || results.some((r) => !r.ran)) return "not-proven";
  if (opts.declaredKillPoints === 0) return "not-proven";
  // random kills cannot prove absence of a bug: at least one non-supporting scenario must stand behind a `held`
  if (!results.some((r) => !r.supporting)) return "not-proven";
  return "held";
}

export function summarizeGuarantee(results: readonly ScenarioResult[], opts: StatusOptions = {}): GuaranteeEvidence {
  const violated = new Set<Invariant>();
  for (const r of results) if (r.ran) for (const v of r.violated) violated.add(v);
  return {
    status: deriveStatus(results, opts),
    scenarios: results.length,
    ran: results.filter((r) => r.ran).length,
    passed: results.filter((r) => r.ran && r.passed).length,
    violated: [...violated].sort() as Invariant[],
  };
}
