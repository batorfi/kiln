// The unit the lane moves through the single lane. Pure types (r12 T028). Copied, not imported, from the
// first program's src/stub-resident.ts: the new code never imports legacy. `role` is a plain string here;
// whether it is a judge is the flow's roster to say (#contracts/roles.ts).
import type { Tier } from "#contracts/roles.ts";

export interface WorkUnit {
  id: string;
  role: string;
  tier: Tier; // the unit's required tier (P-II/IV)
  work?: unknown;
  out?: unknown;
}
