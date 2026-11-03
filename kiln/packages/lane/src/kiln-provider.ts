// `packages/lane/src/kiln-provider.ts` — the KILN provider: the one function every model request goes through
// (r16 T012, research R9, contracts/residency-manager.md "The KILN provider", LANE-3).
//
// `#workers/`'s `runTurn` calls this internally to actually reach `pi-ai`'s `Models.complete`/`stream`, and the
// harness's own housekeeping (compaction) calls it too when it needs a model — there is no second path. It never
// calls `req.call` before the step's lease for the right model is in hand: either the step already holds it (the
// common worker/judge case — `unit.ts` already acquired it before calling `runTurn`, contracts/worker-conversation.md
// "Opening a turn") and it is shared, never re-acquired; or it is acquired here, through the existing, unmodified
// `acquire()` swap path (FR-022/FR-023) — never a bypass.
import type { LaneApi, TaskId } from "#durable/types.ts";

export interface ProviderRequest<T> {
  step: TaskId;
  /** The model this request needs resident. */
  model: string;
  hold?: boolean;
  cause?: string;
  signal?: AbortSignal;
  /** The actual `pi-ai` call. Takes no arguments: the caller already knows which model it asked to be resident. */
  call(): Promise<T>;
}

export interface KilnProvider {
  requestThroughLane<T>(req: ProviderRequest<T>): Promise<T>;
}

export function createKilnProvider(lane: LaneApi): KilnProvider {
  return {
    async requestThroughLane<T>(req: ProviderRequest<T>): Promise<T> {
      if (lane.holds?.(req.step) !== true) {
        // not already held: acquire through the existing, unmodified lease/affinity path — a tier mismatch becomes a
        // recorded swap there (FR-022/FR-023), never a silent substitution. A refusal (the model cannot be made
        // resident) propagates here, before `req.call` ever runs.
        await lane.acquire(req.step, { model: req.model, hold: req.hold, cause: req.cause, signal: req.signal });
      }
      return req.call();
    },
  };
}
