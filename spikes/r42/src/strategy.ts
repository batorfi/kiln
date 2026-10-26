// T013 — what a strategy is. A strategy is one way of implementing the gate-completion port; the scenarios talk only to the port, so every strategy
// is judged by the same tests. `inspect` opens the store WITHOUT an owner (a fresh process after a kill) and returns the facts the oracle needs.
import type { Inspection } from "./invariants.ts";
import type { GateCompletion, GateId } from "./port.ts";

export interface KillPoint {
  name: string;
  /** One sentence: where in the sequence the process dies. */
  where: string;
  phase: "move" | "completion" | "recovery";
}

/**
 * A condition under which a guarantee holds (for example "d holds only with restartLimit = Infinity"). `enforceable` is true only if r13 can
 * guarantee the condition structurally (a setting the seam always sets). A native strategy with a non-enforceable caveat cannot yield `go`.
 */
export interface Caveat {
  text: string;
  enforceable: boolean;
}

export interface StartOptions {
  /** A directory the strategy owns for this scenario. */
  store: string;
  /** The clock a strategy hands to the library, so a test can jump it. */
  now?: () => number;
  restartLimit?: number;
}

export interface Strategy {
  name: string;
  /** Uses Pi Durable's own operations only (no KILN-side decision record). */
  native: boolean;
  /** A control that exists to prove the harness, never a candidate for the verdict. */
  testOnly?: boolean;
  killPoints: KillPoint[];
  caveats: Caveat[];
  start(opts: StartOptions): Promise<GateCompletion>;
  inspect(store: string, gateId: GateId): Promise<Inspection>;
}

export const STRATEGY_NAMES = ["control-sqlite", "broken-two-commit", "native-signal", "native-abort", "native-submission", "fallback-document", "fallback-table"] as const;
export type StrategyName = (typeof STRATEGY_NAMES)[number];

// Lazy and literal: a strategy that does not need the library never loads it, and a strategy that is not built yet fails with a clear message.
const loaders: Record<StrategyName, () => Promise<{ strategy: Strategy }>> = {
  "control-sqlite": () => import("./strategies/control-sqlite.ts"),
  "broken-two-commit": () => import("./strategies/broken-two-commit.ts"),
  "native-signal": () => import("./strategies/native-signal.ts"),
  "native-abort": () => import("./strategies/native-abort.ts"),
  "native-submission": () => import("./strategies/native-submission.ts"),
  "fallback-document": () => import("./strategies/fallback-document.ts"),
  "fallback-table": () => import("./strategies/fallback-table.ts"),
};

export async function loadStrategy(name: string): Promise<Strategy> {
  if (!Object.hasOwn(loaders, name)) throw new Error(`unknown strategy "${name}"; known: ${STRATEGY_NAMES.join(", ")}`);
  try {
    return (await loaders[name as StrategyName]()).strategy;
  } catch (e) {
    throw new Error(`strategy "${name}" is not built yet or failed to load: ${(e as Error).message}`);
  }
}
