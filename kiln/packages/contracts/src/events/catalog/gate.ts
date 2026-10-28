// Gate events (data-model §2). `gate.settled` and `move.committed` REQUIRE a decider (FR-014): there is no way to write a settlement that names nobody.
import { contentPair, entry, hexDigest, int, legacyEntry, legacyGate, nonEmpty, obj, oneOfStr, reasonSchema, str, type CatalogEntry } from "./builder.ts";

const cost = obj({ switches: int, wallClock: str });

export const gateEntries: CatalogEntry[] = [
  entry("gate.opened", obj({ briefRef: nonEmpty, gateKey: nonEmpty, flow: oneOfStr("v1", "v2"), round: int }, ["briefRef", "gateKey"])),
  legacyEntry("gate.waiting", obj({ gate: str, token: str, deadline: str })),
  // the first program's `gate-completion`: unlike gate.settled it MAY lack a decider (the stream the first program kept because it fails) — and for that reason it can never be committed
  legacyEntry("gate.completed", obj({ gate: legacyGate, move: nonEmpty, cost, decidedBy: nonEmpty, preDelegation: obj({ of: nonEmpty, by: nonEmpty, at: nonEmpty, reviewer: str }, ["of", "by", "at"]), flow: oneOfStr("v1", "v2") }, ["gate", "move", "cost"])),
  entry("move.committed", obj({ kind: nonEmpty, decidedBy: nonEmpty, briefRef: str, scope: oneOfStr("feature"), target: str, gate: legacyGate, ...contentPair("note") }, ["kind", "decidedBy"])),
  entry("gate.settled", obj({ key: str, move: nonEmpty, decidedBy: nonEmpty, cost }, ["key", "move", "decidedBy"])),
  entry("gate.withdrawn", obj({ target: nonEmpty, ...contentPair("note") })),
  entry("gate.not-applicable", obj({ gate: nonEmpty, reason: reasonSchema })),
  entry("gate.became-applicable", obj({ gate: nonEmpty, reason: reasonSchema })),
  entry("gate.skipped", obj({ gate: nonEmpty, ...contentPair("reasoning") })),
];
