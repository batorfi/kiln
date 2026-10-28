// r14 T051 (US3, PROOF tier): the owner is killed (SIGKILL) at EVERY declared walk kill point on the interface walk, restarted on the same store, and the walk finished. After each: the walk equals the
// uninterrupted one, every per-gate and walk invariant is clean, nothing is parked, and no gate was settled by the restart. And every declared point was actually reached (a point the proof cannot hit
// proves nothing).
import { test } from "node:test";
import assert from "node:assert/strict";
import { WALK_KILL_POINTS } from "#durable/hooks.ts";
import { baseline, INTERFACE, killRun } from "./support/walk-judge.ts";

test("every declared walk kill point is reached by the interface walk (the proof cannot be vacuous)", async () => {
  const base = await baseline("interface", INTERFACE);
  const never = WALK_KILL_POINTS.filter((p) => !(base.hits.get(p) ?? 0));
  // the fix-round points fire only when Verification fails: they are proved in walk-fix-rounds.proof.test.ts, which has its own script
  assert.deepEqual(never.filter((p) => !p.startsWith("walk.fix-round") && !p.startsWith("walk.withdraw")), [], "declared points the approvals-only walk never reaches");
});

for (const point of WALK_KILL_POINTS.filter((p) => !p.startsWith("walk.fix-round") && !p.startsWith("walk.withdraw"))) {
  test(`killed at ${point}, restarted, finished: the walk equals the uninterrupted one`, { timeout: 120_000 }, async () => {
    await killRun("interface", INTERFACE, point, 1);
  });
}
