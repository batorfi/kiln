// The scenario registry: the strategy-agnostic scenarios the evidence runner runs against every strategy. Phase 4 registers the kill-point, random-kill,
// clock and restart-limit scenarios (guarantees a, d, e); Phase 5 adds the exactly-once and different-process scenarios (b, c). A runner with an EMPTY
// registry fails `evidence-zero-tests`, never prints a table.
import type { Scenario } from "../scenario.ts";
import { runKillPointScenarios } from "./kill-point.ts";
import { runClockScenarios, runRestartLimitScenarios } from "./no-clock.ts";
import { runRandomKillScenarios } from "./random-kill.ts";
import { runExactlyOnce } from "./exactly-once.ts";
import { inProcess } from "../completer.ts";
import { runDifferentProcessScenarios, runSecondOpener } from "./different-process.ts";

export const scenarios: Scenario[] = [
  { id: "kill-point", kind: "kill-point", guarantees: ["a", "e"], run: runKillPointScenarios },
  { id: "random-kill", kind: "random-kill", guarantees: ["a", "e"], run: (s) => runRandomKillScenarios(s) },
  { id: "no-clock", kind: "no-clock", guarantees: ["d"], run: runClockScenarios },
  { id: "repeat", kind: "repeat", guarantees: ["b"], run: (s) => runExactlyOnce(s, inProcess, false, ["repeat"]) },
  { id: "race", kind: "race", guarantees: ["c"], run: (s) => runExactlyOnce(s, inProcess, false, ["race"]) },
  { id: "conflict", kind: "conflict", guarantees: ["b", "c"], run: (s) => runExactlyOnce(s, inProcess, false, ["conflict"]) },
  { id: "store-error", kind: "store-error", guarantees: ["c"], run: (s) => runExactlyOnce(s, inProcess, false, ["store-error"]) },
  { id: "different-process", kind: "different-process", guarantees: ["a", "b", "c", "d", "e"], run: runDifferentProcessScenarios },
  { id: "second-opener", kind: "second-opener", guarantees: [], run: runSecondOpener },
  { id: "restart-limit", kind: "restart-limit", guarantees: ["d", "e"], run: runRestartLimitScenarios },
];
