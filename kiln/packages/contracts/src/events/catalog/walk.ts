// The walk's events (r14, as r15 freezes them). Content (a person's note, a triage reasoning) is a {ref, digest} pair; a rendered sentence is gone (research R6).
import { arrayOf, bool, contentPair, entry, int, nonEmpty, obj, oneOfStr, str, type CatalogEntry } from "./builder.ts";

const WHY = oneOfStr("walk-ended-merged", "walk-ended-left-lane", "walk-ended-not-admitted");

export const walkEntries: CatalogEntry[] = [
  entry("walk.admitted", obj({
    gate: nonEmpty, required: arrayOf(str), cap: int, overrideTriage: bool,
    applicability: { type: "object", additionalProperties: obj({ applies: bool, why: str }) },
    skipped: arrayOf(str),
  })),
  entry("walk.returned", obj({
    from: nonEmpty, round: int, kind: nonEmpty, target: nonEmpty, scope: oneOfStr("feature"), work: str, recross: arrayOf(str), ...contentPair("note"),
  }, ["from", "kind", "target", "recross", "noteRef", "noteDigest"])),
  entry("walk.split", obj({ from: nonEmpty, ...contentPair("remainder") })),
  entry("walk.left-lane", obj({ from: nonEmpty, round: int, ...contentPair("note") })),
  entry("walk.not-admitted", obj({ gate: nonEmpty, round: int, ...contentPair("note") })),
  entry("walk.completed", obj({ approved: arrayOf(str) })),
  entry("walk.move-ignored", obj({ target: nonEmpty, ...contentPair("note"), why: WHY })),
  entry("walk.fix-round", obj({ kind: oneOfStr("mitigate"), n: int, cap: int, verdict: oneOfStr("pass", "fail"), pass: int })),
];
