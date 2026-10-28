// `record.unknown`: what a reader presents for a stored entry whose type it does not know (FR-021). Read-only: nothing commits it.
import { entry, hexDigest, nonEmpty, obj, type CatalogEntry } from "./builder.ts";

export const recordEntries: CatalogEntry[] = [entry("record.unknown", obj({ originalType: nonEmpty, digest: hexDigest }), false)];
