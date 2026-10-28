// Unit events (r15, research R11): a unit is the smallest piece of scripted or real work. `owner` is "factory" or "task:<id>" of the task that created it.
import { entry, int, nonEmpty, obj, str, type CatalogEntry } from "./builder.ts";

const unit = obj({ unit: int, label: str, owner: nonEmpty });
export const unitEntries: CatalogEntry[] = ["unit.queued", "unit.started", "unit.settled", "unit.failed", "unit.aborted"].map((t) => entry(t, unit, t !== "unit.failed")); // unit.failed is catalogued, not emitted: the library writes a failed unit's end, outside any commit of ours
