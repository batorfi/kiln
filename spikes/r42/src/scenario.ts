// What a scenario is. A scenario talks to a strategy through the port only (never to the library), so the SAME scenario runs against every strategy.
// It returns one result per (guarantee, specific case): for example one per declared kill point.
import type { Guarantee, ScenarioKind, ScenarioResult } from "./evidence-model.ts";
import type { Strategy } from "./strategy.ts";

export interface Scenario {
  id: string;
  kind: ScenarioKind;
  /** The guarantees this scenario can speak for. */
  guarantees: Guarantee[];
  run(strategy: Strategy): Promise<ScenarioResult[]>;
}
