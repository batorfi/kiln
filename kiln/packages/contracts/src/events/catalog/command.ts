// Commands (r15, research R11): an accepted command is a state change (a ledger entry); a refused one leaves none and is catalogued, not emitted.
import { entry, nonEmpty, obj, str, type CatalogEntry } from "./builder.ts";

export const commandEntries: CatalogEntry[] = [
  entry("command.accepted", obj({ kind: nonEmpty, requestHash: nonEmpty }), false), // flips to true with T029
  entry("command.refused", obj({ kind: nonEmpty, reason: str }), false),
];
