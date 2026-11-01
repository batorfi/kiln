// TEST-ONLY (r16 T026, SC-008): a real `createWorkers()` whose model call never resolves, with a short
// `timeoutMsOverride` so the proof does not wait for a real 120s tier timeout. Proves the step fails by name
// (`GenerationTimeoutError` → the library's own `unit.failed`) without any kill at all.
import type { LaneApi } from "#durable/types.ts";
import { createKilnProvider } from "#lane/kiln-provider.ts";
import { createWorkers, type TurnInput, type TurnResult } from "#workers/conversation.ts";

export function createWorkersForTest(lane: LaneApi): { runTurn(input: TurnInput): Promise<TurnResult> } {
  return createWorkers({
    kilnProvider: createKilnProvider(lane),
    complete: () => new Promise(() => {}), // never settles
    timeoutMsOverride: 500,
  });
}
