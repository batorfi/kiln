// T038–T041 — the two native strategies, pinned to what the evidence showed (so a change in either strategy, or in the library, is noticed here and not only in
// a full evidence run). C1 `native-signal`: every declared point fires and none violates a or e. C2 `native-abort`: the two-commit window is caught by I2/I3.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runKillPointScenarios } from "../src/scenarios/kill-point.ts";
import { runRestartLimitScenarios } from "../src/scenarios/no-clock.ts";
import { loadStrategy } from "../src/strategy.ts";

test("N1 native-signal: every declared kill point fires, and guarantees a and e hold at every one", async () => {
  const s = await loadStrategy("native-signal");
  const results = await runKillPointScenarios(s);
  assert.equal(results.length, s.killPoints.length * 2);
  for (const r of results) {
    assert.equal(r.ran, true, `${r.scenario}: ${r.detail}`);
    assert.deepEqual(r.violated, [], `${r.scenario}: ${r.detail}`);
  }
});

test("N2 native-signal: with the library's default restartLimit of 5 the gate is parked after 7 kills (I6) — the declared caveat is real; with Infinity it is not", async () => {
  const s = await loadStrategy("native-signal");
  const saved = process.env.RESTART_LIMIT;
  try {
    process.env.RESTART_LIMIT = "5";
    const parked = await runRestartLimitScenarios(s);
    assert.ok(parked.some((r) => r.violated.includes("I6")), "the default limit must park the gate: " + JSON.stringify(parked.map((r) => [r.scenario, r.violated])));
    delete process.env.RESTART_LIMIT;
    const free = await runRestartLimitScenarios(s);
    for (const r of free) assert.deepEqual(r.violated, [], `${r.scenario}: ${r.detail}`);
  } finally {
    if (saved === undefined) delete process.env.RESTART_LIMIT;
    else process.env.RESTART_LIMIT = saved;
  }
});

test("N3 native-abort: the window between the two commits is caught — I2 and I3 at `between-record-and-abort`; a kill before the record commit leaves no half-applied move", async () => {
  const s = await loadStrategy("native-abort");
  const results = (await runKillPointScenarios(s)).filter((r) => r.guarantee === "a");
  const seam = results.find((r) => r.killPoint === "between-record-and-abort")!;
  assert.equal(seam.ran, true, seam.detail);
  assert.ok(seam.violated.includes("I3") && seam.violated.includes("I2"), `expected I2 and I3, got ${seam.violated.join(",")}`);
  const before = results.find((r) => r.killPoint === "record-commit-after-write")!;
  assert.equal(before.ran, true, before.detail);
  assert.ok(!before.violated.includes("I2") && !before.violated.includes("I3"), "a kill mid-way through commit 1 leaves nothing: " + before.violated.join(","));
});
