// A finished feature's archive (CORE-7, research R12) and the Operator's age-out of it (r17 sets the policy; only the type is catalogued here).
import { entry, hexDigest, int, nonEmpty, obj, type CatalogEntry } from "./builder.ts";

export const featureEntries: CatalogEntry[] = [
  entry("feature.archived", obj({ archive: nonEmpty, sha256: hexDigest, bytes: int, counts: obj({ docs: int, tasks: int, events: int, texts: int }) }), false), // flips to true with T060
  entry("transcript.aged-out", obj({ archive: nonEmpty }), false),
];
