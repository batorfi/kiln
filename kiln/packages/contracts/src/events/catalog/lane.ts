// Lane events (r13). `holder` is the task id of the step that holds the lane.
import { bool, entry, int, obj, str, strOrNull, type CatalogEntry } from "./builder.ts";

export const laneEntries: CatalogEntry[] = [
  entry("lane.acquired", obj({ holder: int, model: strOrNull, hold: bool })),
  entry("lane.swapped", obj({ from: strOrNull, to: strOrNull, swaps: int })),
  entry("lane.released", obj({ holder: int, reason: str }, ["holder"])),
  entry("lane.held", obj({ holder: int, reason: str }, ["holder"]), false),
  entry("lane.cost-recorded", obj({ switches: int, wallClock: str }), false),
];
