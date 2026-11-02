// `kiln owner`'s real lane and workers (r16 T037, notes.md: found during T004 — nothing in production `src/` ever constructed one before this). ADDITIVE ONLY: a feature with no `role` unit never touches
// this; `createLane()`'s behaviour without a residency is exactly what every r13-r15 caller already uses. Env vars follow this row's own convention (`KILN_LIVE_MODEL`, legacy's shape): a default that
// works out of the box on a dev machine, overridable for anyone who needs to. `cli → lane, workers` are the two new boundary edges this file is why `checks/boundaries.json` now declares.
import { createKilnProvider } from "#lane/kiln-provider.ts";
import { createLane, type LaneModule } from "#lane/lane-task.ts";
import { createResidency } from "#lane/residency.ts";
import { createWorkers } from "#workers/conversation.ts";
import type { WorkersApi } from "#durable/types.ts";

const DEFAULT_BUDGET_BYTES = 64 * 1024 * 1024 * 1024; // 64 GiB — comfortably holds this row's provisional roster's two roles at once on a modern dev machine (research: a 96 GB M-series host measured)

export interface RealWorkers {
  lane: LaneModule;
  workers: WorkersApi;
}

/** Built once per `kiln owner` process; never required — `startOwner`'s `lane`/`tasks`/`workers` options stay optional for every caller that doesn't pass this. */
export function createRealWorkers(): RealWorkers {
  const port = process.env.KILN_OLLAMA_PORT ? Number(process.env.KILN_OLLAMA_PORT) : undefined;
  const budgetBytes = process.env.KILN_MODEL_BUDGET_BYTES ? Number(process.env.KILN_MODEL_BUDGET_BYTES) : DEFAULT_BUDGET_BYTES;
  const residency = createResidency({ port, budgetBytes });
  const lane = createLane({ residency, budgetBytes });
  const kilnProvider = createKilnProvider(lane.api);
  // T033's own note: the readiness-capability guarantee (FR-040/041/042) silently does not hold unless something
  // supplies a real `probe` here — this is that something. `residency.probe` is already fresh-every-call (T033).
  const workers = createWorkers({ kilnProvider, port, probe: (model) => residency.probe(model) });
  return { lane, workers };
}
