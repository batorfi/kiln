// T045 — the completer is a different OS process (`node src/client.ts …`) for every exactly-once case, every kill point and the no-clock case, on the correct
// control and on the native strategy that holds a, d, e. Plus R-6: a second process opening the store file directly while the owner runs — the test asserts only
// that the gate is unharmed and the owner still works; WHAT the second opener saw (SQLite grants it the write lock when the owner is idle) goes to NOTES.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runDifferentProcessScenarios, runSecondOpener } from "../src/scenarios/different-process.ts";
import { loadStrategy } from "../src/strategy.ts";

for (const name of ["control-sqlite", "native-signal"]) {
  test(`DP1 ${name}: every scenario also passes with the completer in a separate process, for every guarantee`, async () => {
    const s = await loadStrategy(name);
    const results = await runDifferentProcessScenarios(s);
    for (const r of results) {
      assert.equal(r.kind, "different-process");
      assert.equal(r.ran, true, `${r.scenario}: ${r.detail}`);
      assert.equal(r.passed, true, `${r.scenario} violated [${r.violated}]: ${r.detail}`);
    }
    assert.deepEqual(new Set(results.map((r) => r.guarantee)), new Set(["a", "b", "c", "d", "e"]), "a different-process result stands behind every guarantee row");
    for (const k of s.killPoints) assert.ok(results.some((r) => r.scenario === `different-process:kill-point:${k.name}`), `kill point ${k.name} was run with the separate-process completer`);
    assert.ok(results.some((r) => r.scenario === "different-process:no-clock"));
  });

  test(`DP2 ${name}: a second process opening the store file leaves the gate unharmed (R-6)`, async () => {
    const [r] = await runSecondOpener(await loadStrategy(name));
    assert.equal(r!.kind, "second-opener");
    assert.equal(r!.ran, true, r!.detail);
    assert.equal(r!.passed, true, r!.detail);
    assert.match(r!.detail ?? "", /saw \{"opened":/, "the observation is recorded");
  });
}

test("DP3 a different-process variant that does not run is never a pass — the broken control is caught by it as well", async () => {
  const results = await runDifferentProcessScenarios(await loadStrategy("broken-two-commit"));
  const seam = results.find((r) => r.scenario === "different-process:kill-point:between-commits" && r.guarantee === "a")!;
  assert.equal(seam.ran, true);
  assert.equal(seam.passed, false);
  assert.ok(seam.violated.includes("I3"));
});
