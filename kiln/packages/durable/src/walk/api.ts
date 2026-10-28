// The walks API of an open factory (walk-contract §7): admit a feature, read where it is, wait for the next gate. `move` (the feature-level reject) joins it in r14's US5.
import type { Services } from "../services.ts";
import type { FeatureMove, FeatureOutcome, TaskApi, TaskCreateOutcome, Key } from "../types.ts";
import { submitFeatureMove } from "./moves.ts";
import type { WalkInput } from "./input.ts";
import { nextWalk, readWalk, type WalkView } from "./view.ts";

export interface WalkApi {
  /** Creates the feature's row through the command ledger: keyed exactly once; the input is validated by name before anything is written. */
  admit(key: Key, feature: string, walk: WalkInput): Promise<TaskCreateOutcome>;
  /** Where the feature is, read from the store. */
  state(feature: string): Promise<WalkView>;
  /** Waits (on an event, never by polling) until the open gate differs from `after`, or the walk has ended; then returns the state. */
  next(feature: string, after?: string, signal?: AbortSignal): Promise<WalkView>;
  /** A reject made on the FEATURE at any time (r14, walk-contract §6): it withdraws the open gate without settling it, or is held for the walk when no gate is open. */
  move(feature: string, key: Key, move: FeatureMove): Promise<FeatureOutcome>;
}

export function makeWalkApi(s: Services, tasks: TaskApi): WalkApi {
  return {
    admit: (key, feature, walk) => tasks.create(key, "kiln.row", { feature, walk } as never, { kind: "factory" }),
    state: (feature) => readWalk(s, feature),
    next: (feature, after, signal) => nextWalk(s, feature, after, signal),
    move: (feature, key, move) => submitFeatureMove(s, feature, key, move),
  };
}
