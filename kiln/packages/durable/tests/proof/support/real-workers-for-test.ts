// r16 T039 — the REAL residency/lane/workers composition, shaped for owner-main.ts's `LANE_MODULE`/`WORKERS_MODULE` contract
// (`createLane()` with no args; `createWorkersForTest(laneApi)`), so the kill-and-resume proof runs against the real installed
// Ollama, not a scripted stand-in. The one module-level `residency` is shared by both exports — owner-main.ts calls
// `createLane()` first, then `createWorkersForTest(lane)` separately, and the KILN provider's lease/residency guarantees
// only hold if both paths share the same residency bookkeeping, exactly as packages/cli/src/real-workers.ts already does
// for the production CLI.
import { createKilnProvider } from "#lane/kiln-provider.ts";
import { createLane as createRealLane, type LaneModule } from "#lane/lane-task.ts";
import { createResidency } from "#lane/residency.ts";
import { createWorkers } from "#workers/conversation.ts";
import type { LaneApi } from "#durable/types.ts";

const DEFAULT_BUDGET_BYTES = 64 * 1024 * 1024 * 1024;
const residency = createResidency({ budgetBytes: DEFAULT_BUDGET_BYTES });

export function createLane(): LaneModule {
  return createRealLane({ residency, budgetBytes: DEFAULT_BUDGET_BYTES });
}

export function createWorkersForTest(lane: LaneApi) {
  const kilnProvider = createKilnProvider(lane);
  return createWorkers({ kilnProvider, probe: (model) => residency.probe(model) });
}
