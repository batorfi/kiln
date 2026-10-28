// A pre-delegation (constitution VI/VII): its own event, never a person's move. Behaviour belongs to r21; the first program's streams carry it (the constant note of its record is not a field).
import { entry, nonEmpty, obj, str, type CatalogEntry } from "./builder.ts";

export const delegationEntries: CatalogEntry[] = [entry("delegation.armed", obj({ of: nonEmpty, by: nonEmpty, at: nonEmpty, reviewer: str }, ["of", "by", "at"]), false)];
