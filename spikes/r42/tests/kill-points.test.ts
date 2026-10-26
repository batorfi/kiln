// T031 — kill at EVERY declared point (guarantees a and e). The scenario starts an owner with KILL_AT=<point>, drives a move at it, confirms the process died by
// SIGKILL AT THAT POINT, inspects the store the crash left behind (a fresh reader, no owner), restarts a clean owner, inspects again, and lets the oracle judge.
// The harness is judged here on the two controls: the CORRECT one must be clean at every point; the BROKEN one must be caught — at its seam, and only there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runKillPointScenarios } from "../src/scenarios/kill-point.ts";
import { loadStrategy, type Strategy } from "../src/strategy.ts";

const byPoint = (results: Awaited<ReturnType<typeof runKillPointScenarios>>, point: string) => results.filter((r) => r.killPoint === point);

test("KP1 the correct control: every declared point fires, and every result — guarantee a and guarantee e — ran and passed with no violation", async () => {
  const s = await loadStrategy("control-sqlite");
  const results = await runKillPointScenarios(s);
  assert.equal(results.length, s.killPoints.length * 2, "one result for a and one for e, per declared point");
  for (const r of results) {
    assert.equal(r.kind, "kill-point");
    assert.equal(r.ran, true, `${r.scenario}: ${r.detail}`);
    assert.equal(r.passed, true, `${r.scenario} violated ${r.violated.join(",")}: ${r.detail}`);
    assert.deepEqual(r.violated, []);
  }
  assert.deepEqual(new Set(results.map((r) => r.killPoint)), new Set(s.killPoints.map((k) => k.name)), "every declared point is exercised");
  assert.deepEqual(new Set(results.map((r) => r.guarantee)), new Set(["a", "e"]));
});

test("KP2 the BROKEN control is caught at its seam — guarantee a fails with I1 and I3 at `between-commits`, and ONLY there", async () => {
  const s = await loadStrategy("broken-two-commit");
  const results = await runKillPointScenarios(s);
  const seam = byPoint(results, "between-commits").find((r) => r.guarantee === "a")!;
  assert.equal(seam.ran, true);
  assert.equal(seam.passed, false, "a move recorded on a gate that never settled must be reported");
  assert.ok(seam.violated.includes("I3"), `I3 (the half-applied move) expected, got ${seam.violated}`);
  assert.ok(seam.violated.includes("I1"), `I1 (a waiting gate with a record) expected, got ${seam.violated}`);
  for (const r of results.filter((x) => x.killPoint !== "between-commits")) assert.ok(r.passed && r.ran, `${r.scenario} should be clean: ${r.violated} ${r.detail}`);
  // guarantee e at the seam: the restart itself changes nothing — the damage was done by the crash, and the oracle already named it under a
  assert.equal(byPoint(results, "between-commits").find((r) => r.guarantee === "e")!.passed, true);
});

test("KP3 a declared point that NEVER fires is `ran: false`, never a pass — and does not spoil the points that did", async () => {
  const real = await loadStrategy("control-sqlite");
  const withGhost: Strategy = { ...real, killPoints: [...real.killPoints, { name: "never-reached", where: "a point no code path calls", phase: "move" }] };
  const results = await runKillPointScenarios(withGhost);
  const ghost = byPoint(results, "never-reached");
  assert.equal(ghost.length, 2);
  for (const r of ghost) {
    assert.equal(r.ran, false);
    assert.equal(r.passed, false);
    assert.match(r.detail ?? "", /never fired/);
  }
  for (const r of results.filter((x) => x.killPoint !== "never-reached")) assert.ok(r.ran && r.passed, r.scenario);
});

test("KP4 the death is real: each result records that the owner died by SIGKILL at THE point named, not at another", async () => {
  const s = await loadStrategy("control-sqlite");
  const results = await runKillPointScenarios(s);
  for (const r of results) assert.match(r.detail ?? "", new RegExp(`SIGKILL at ${r.killPoint}`), r.scenario);
});
