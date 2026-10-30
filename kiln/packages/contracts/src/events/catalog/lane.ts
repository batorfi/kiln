// Lane events (r13). `holder` is the task id of the step that holds the lane.
import { bool, entry, int, legacyEntry, obj, oneOfStr, str, strOrNull, type CatalogEntry } from "./builder.ts";

export const laneEntries: CatalogEntry[] = [
  entry("lane.acquired", obj({ holder: int, model: strOrNull, hold: bool })),
  entry("lane.swapped", obj({ from: strOrNull, to: strOrNull, swaps: int })),
  entry("lane.released", obj({ holder: int, reason: str }, ["holder"])),
  // the first program's residency changes and costs: read-only, they exist so its streams can be replayed
  legacyEntry("lane.transition", obj({ kind: oneOfStr("load", "hold", "yield", "swap"), from: str, to: str, reason: str }, ["kind"])),
  legacyEntry("lane.cost-recorded", obj({ switches: int, wallClock: str })),
];
