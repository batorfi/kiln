// The scenario registry. Empty on purpose until Phase 4 and 5 add the kill-point, no-clock, exactly-once and different-process scenarios:
// a runner with nothing to run must FAIL (`evidence-zero-tests`), never print a table.
import type { Scenario } from "../scenario.ts";

export const scenarios: Scenario[] = [];
