// r14 T054 (US3, PROOF tier): the whole matrix — EVERY walk kill point × EVERY time it is reached × BOTH walks. How far to go for each point is MEASURED from the uninterrupted walk (a hit log written by the
// test-only owner), not guessed. A walk with a re-crossing is in walk-recross.proof.test.ts; fix rounds in walk-fix-rounds.proof.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { WALK_KILL_POINTS } from "#durable/hooks.ts";
import { baseline, INTERFACE, killRun, PLAIN } from "./support/walk-judge.ts";

const IN_APPROVALS = WALK_KILL_POINTS.filter((p) => !p.startsWith("walk.fix-round") && !p.startsWith("walk.withdraw"));

for (const [name, walk] of [["interface", INTERFACE], ["plain", PLAIN]] as const) {
  for (const point of IN_APPROVALS) {
    test(`${name} walk × ${point}: killed at every hit`, { timeout: 1_800_000 }, async () => {
      const hits = (await baseline(name, walk)).hits.get(point) ?? 0;
      assert.ok(hits >= 1, `${point} is never reached by the ${name} walk`);
      for (let n = 1; n <= hits; n++) await killRun(name, walk, point, n);
    });
  }
}
