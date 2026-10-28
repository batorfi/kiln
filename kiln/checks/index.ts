// The registry `kiln check` runs (contracts/cli-check.md). Each story registers its check here.

import { checkLegacy } from "./legacy-identity.ts";
import { checkFlow } from "./flow.ts";
import { checkBoundaries } from "./boundaries.ts";
import { checkNetwork } from "./network-lint.ts";
import { checkRecord } from "./record.ts";

export type CheckName = "network" | "boundaries" | "legacy" | "flow" | "record";

export interface CheckResult {
  name: CheckName;
  ok: boolean;
  /** Codes are the stable names listed in the contracts. */
  failures: { code: string; file?: string; detail: string }[];
  /** Files examined; 0 is itself a failure for network and boundaries. */
  scanned?: number;
  /** Anything skipped, and why: stated, never silent. */
  notes: string[];
}

/** Run order: the order of this list. */
export const CHECK_NAMES: readonly CheckName[] = ["network", "boundaries", "legacy", "flow", "record"];

export const registry: Partial<Record<CheckName, () => CheckResult>> = {
  network: () => checkNetwork(),
  boundaries: () => checkBoundaries(),
  legacy: () => checkLegacy(),
  flow: () => checkFlow(),
  record: () => checkRecord(),
};

/** Runs every named check, each even when an earlier one fails. */
export function runChecks(names: readonly CheckName[]): CheckResult[] {
  return names.map((name) => {
    const run = registry[name];
    if (!run) {
      return { name, ok: false, failures: [{ code: "check-not-registered", detail: `no check registered for "${name}"` }], notes: [] };
    }
    return run();
  });
}
