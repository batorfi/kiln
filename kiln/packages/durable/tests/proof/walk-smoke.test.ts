// r14 T052 (US3, DEFAULT tier): four kills on the interface walk, one per phase group — a pin, an opening, the window after a move, the consequence — each restarted on the same store and finished.
// The full matrix (every point × every gate × both walks) is the PROOF tier (`npm run proof`); this smoke keeps the headline assertion in every `npm test`: the killed walk EQUALS the uninterrupted one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWalk } from "./support/walk-harness.ts";
import { baseline, FEATURE, INTERFACE, judge, killRun, PLAIN, RECROSS } from "./support/walk-judge.ts";

const SMOKE: [string, number][] = [
  ["walk.pin-after-write", 1],
  ["walk.gate-opening", 6],
  ["walk.settled-read", 6],
  ["walk.consume-after-write", 6],
];

for (const [point, nth] of SMOKE) {
  test(`killed at ${point} (hit ${nth}), restarted and finished: the walk equals the uninterrupted one`, { timeout: 120_000 }, async () => {
    const base = await baseline("interface", INTERFACE);
    const run = await runWalk({ feature: FEATURE, walk: INTERFACE, killAt: point, killNth: nth });
    try {
      assert.deepEqual(run.fired, [point], "the armed point fired exactly once");
      assert.equal(run.deaths, 1);
      await judge(run, INTERFACE, base);
    } finally {
      run.cleanup();
    }
  });
}

test("the baseline itself: 12 gates, every declared walk point reached at least once", async () => {
  const base = await baseline("interface", INTERFACE);
  assert.equal(base.gates, 12);
  for (const p of ["walk.admit-opened", "walk.admission-read", "walk.pin-begin", "walk.pin-after-write", "walk.pin-committed", "walk.unit-created", "walk.gate-opening", "walk.gate-opened", "walk.settled-read", "walk.consume-after-write", "walk.consume-committed"]) {
    assert.ok((base.hits.get(p) ?? 0) >= 1, `${p} was never reached by the walk — a point the proof cannot hit proves nothing`);
  }
  assert.equal(base.hits.get("walk.gate-opening"), 11, "one opening per feature gate");
  assert.equal(base.hits.get("walk.settled-read"), 11);
});

// a RE-CROSSING is killed too (spec FR-051): Work plan is rejected back to Specification; the owner dies in the consequence of that reject and at the openings and reads around it
for (const [point, nth] of [["walk.consume-after-write", 4], ["walk.settled-read", 4], ["walk.gate-opening", 5], ["walk.consume-committed", 4]] as const) {
  test(`re-crossing walk killed at ${point} (hit ${nth}): the walk equals the uninterrupted re-crossing walk, and no re-crossed gate is carried forward as approved`, { timeout: 120_000 }, async () => {
    await killRun("plain-recross", PLAIN, point, nth, RECROSS);
  });
}
