// r14 T065 (US5, PROOF tier): the re-crossing walk (Work plan rejected back to Specification) killed at EVERY walk point × EVERY hit. Each time: the walk equals the uninterrupted re-crossing walk, rounds are
// consecutive, a gate is settled before the next opens, and nothing is carried across the change it did not see.
import { test } from "node:test";
import assert from "node:assert/strict";
import { WALK_KILL_POINTS } from "#durable/hooks.ts";
import { baseline, killRun, PLAIN, RECROSS } from "./support/walk-judge.ts";

for (const point of WALK_KILL_POINTS.filter((p) => !p.startsWith("walk.fix-round") && !p.startsWith("walk.withdraw"))) {
  test(`re-crossing walk × ${point}: killed at every hit`, { timeout: 900_000 }, async () => {
    const hits = (await baseline("plain-recross", PLAIN, RECROSS)).hits.get(point) ?? 0;
    assert.ok(hits >= 1, `${point} is never reached by the re-crossing walk`);
    for (let n = 1; n <= hits; n++) await killRun("plain-recross", PLAIN, point, n, RECROSS);
  });
}
