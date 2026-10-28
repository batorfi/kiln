// A consumer of the record (research R8, data-model §5): something that wants to react to committed events — the factory-log projection first, later the screens, the notifier, the metrics.
import type { Event } from "#contracts/events/types.ts";
import type { Tx } from "../store.ts";

export interface Consumer {
  /** Unique within a factory; names its cursor document. */
  name: string;
  /** A change of version means "my result is out of date": the consumer restarts from `from` (default 1) with a fresh cursor and `reset` runs in the same commit. */
  version: number;
  from?: number;
  /**
   * `transactional`: `apply` runs INSIDE the commit that advances the cursor, so its effect happens exactly once — a repeat after a kill is impossible by construction.
   * `effect`: `deliver` runs, then a commit advances the cursor — at least once; the consumer MUST be idempotent (a repeat changes nothing).
   */
  mode: "transactional" | "effect";
  apply?(tx: Tx, batch: Event[]): Promise<void>;
  /** `signal` aborts when the backbone stops: a consumer that waits on anything should honour it. */
  deliver?(batch: Event[], signal: AbortSignal): Promise<void>;
  /** Transactional only: clears what a previous version built, in the commit that starts the new one. */
  reset?(tx: Tx): Promise<void>;
}
