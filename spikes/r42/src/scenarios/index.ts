// The scenario registry: the strategy-agnostic scenarios the evidence runner runs against every strategy. Phase 4 registers the kill-point, random-kill,
// clock and restart-limit scenarios (guarantees a, d, e); Phase 5 adds the exactly-once and different-process scenarios (b, c). A runner with an EMPTY
// registry fails `evidence-zero-tests`, never prints a table.
import type { Scenario } from "../scenario.ts";
import { runKillPointScenarios } from "./kill-point.ts";
import { runClockScenarios, runRestartLimitScenarios } from "./no-clock.ts";
import { runRandomKillScenarios } from "./random-kill.ts";

export const scenarios: Scenario[] = [
  { id: "kill-point", kind: "kill-point", guarantees: ["a", "e"], run: runKillPointScenarios },
  { id: "random-kill", kind: "random-kill", guarantees: ["a", "e"], run: (s) => runRandomKillScenarios(s) },
  { id: "no-clock", kind: "no-clock", guarantees: ["d"], run: runClockScenarios },
  { id: "restart-limit", kind: "restart-limit", guarantees: ["d", "e"], run: runRestartLimitScenarios },
];
