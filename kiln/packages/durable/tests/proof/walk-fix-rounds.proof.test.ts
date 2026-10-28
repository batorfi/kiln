// r14 T078 (US7, PROOF tier): the fix-round walk killed at both fix-round points × every hit, and at every other walk point too. Each time the rounds are recorded exactly once (never lost, never counted twice),
// the cap holds, and the walk equals the uninterrupted one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { WALK_KILL_POINTS } from "#durable/hooks.ts";
import { baseline, FIXING, killRun } from "./support/walk-judge.ts";

test("the fix-round points are reached exactly cap (2) times by the fix-round walk", async () => {
  const base = await baseline("plain-fixing", FIXING);
  assert.equal(base.hits.get("walk.fix-round-begin"), 2);
  assert.equal(base.hits.get("walk.fix-round-committed"), 2);
  assert.equal(base.outcomes.filter((o) => o.startsWith("walk.fix-round|")).length, 2);
});

for (const point of WALK_KILL_POINTS.filter((p) => !p.startsWith("walk.withdraw"))) {
  test(`fix-round walk × ${point}: killed at every hit`, { timeout: 900_000 }, async () => {
    const hits = (await baseline("plain-fixing", FIXING)).hits.get(point) ?? 0;
    assert.ok(hits >= 1, `${point} is never reached by the fix-round walk`);
    for (let n = 1; n <= hits; n++) await killRun("plain-fixing", FIXING, point, n);
  });
}
