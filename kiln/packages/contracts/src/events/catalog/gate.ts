// Gate events (data-model §2). `gate.settled` and `move.committed` REQUIRE a decider (FR-014): there is no way to write a settlement that names nobody.
import { contentPair, entry, int, nonEmpty, obj, oneOfStr, reasonSchema, str, type CatalogEntry } from "./builder.ts";

const cost = obj({ switches: int, wallClock: str });

export const gateEntries: CatalogEntry[] = [
  entry("gate.opened", obj({ briefRef: nonEmpty, gateKey: nonEmpty, flow: oneOfStr("v1", "v2"), round: int }, ["briefRef", "gateKey"])),
  entry("gate.waiting", obj({ gate: str, token: str, deadline: str }), false),
  entry("move.committed", obj({ kind: nonEmpty, decidedBy: nonEmpty, briefRef: str, scope: oneOfStr("feature"), target: str }, ["kind", "decidedBy"])),
  entry("gate.settled", obj({ key: str, move: nonEmpty, decidedBy: nonEmpty, cost }, ["key", "move", "decidedBy"])),
  entry("gate.withdrawn", obj({ target: nonEmpty, ...contentPair("note") })),
  entry("gate.not-applicable", obj({ gate: nonEmpty, reason: reasonSchema })),
  entry("gate.became-applicable", obj({ gate: nonEmpty, reason: reasonSchema })),
  entry("gate.skipped", obj({ gate: nonEmpty, ...contentPair("reasoning") })),
];
