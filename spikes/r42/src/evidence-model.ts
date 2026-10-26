// The shared shapes of the evidence (data-model §3). Types only — no behaviour — so the status rules, the verdict rules, the runner, the table and the
// report checker all speak about the same things. Nothing here imports the library.
import type { Invariant } from "./invariants.ts";
import type { Caveat } from "./strategy.ts";

export const GUARANTEES = ["a", "b", "c", "d", "e"] as const;
export type Guarantee = (typeof GUARANTEES)[number];

export const SCENARIO_KINDS = ["kill-point", "random-kill", "repeat", "race", "conflict", "store-error", "different-process", "no-clock", "restart-limit", "second-opener"] as const;
export type ScenarioKind = (typeof SCENARIO_KINDS)[number];

/** held: every targeting scenario ran and passed. not-held: one ran and violated an invariant. not-proven: one did not run, there was none, or time ran out. */
export type GuaranteeStatus = "held" | "not-held" | "not-proven";
export type Verdict = "go" | "go-with-fallback" | "no-go";

export interface ScenarioResult {
  /** A specific id, for example `kill-point:tx-begin`. */
  scenario: string;
  kind: ScenarioKind;
  guarantee: Guarantee;
  strategy: string;
  /** False when the scenario was cut (time box), could not run, or its owner would not start. A scenario that did not run is never a pass. */
  ran: boolean;
  passed: boolean;
  violated: Invariant[];
  /** For kill-point scenarios: the declared point this result is about. */
  killPoint?: string;
  /** Supporting evidence (the randomised kills): it can show a violation, but it can never be what makes a guarantee `held`. */
  supporting?: boolean;
  detail?: string;
  counts?: Record<string, number>;
}

export interface GuaranteeEvidence {
  status: GuaranteeStatus;
  /** How many results target this guarantee, how many ran, how many passed. */
  scenarios: number;
  ran: number;
  passed: number;
  violated: Invariant[];
}

export interface StrategyEvidence {
  name: string;
  native: boolean;
  /** A control that proves the harness; never a candidate for the verdict. */
  testOnly: boolean;
  /** The kill points it declared, with their phase. */
  killPoints: { name: string; phase: string }[];
  /** How many of the declared points were actually exercised. */
  exercised: number;
  randomKills: number;
  caveats: Caveat[];
  guarantees: Record<Guarantee, GuaranteeEvidence>;
  notes: string[];
}

export interface Evidence {
  piDurable: { name: string; version: string; integrity: string };
  node: string;
  platform: string;
  startedAt: string;
  finishedAt: string;
  strategies: Record<string, StrategyEvidence>;
}
