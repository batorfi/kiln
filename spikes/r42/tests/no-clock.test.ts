// T033 — no clock, no timeout, no restart settles a gate (guarantee d) and a gate resumes as it was (guarantee e). Four scenarios: a CLOCK JUMP (live, and across a
// restart), REAL TIME passing, MORE consecutive kills than the library's restart limit (default 5), and a SETTLED gate surviving the same. The controls use no
// clock, so they pass trivially — the point here is that the scenario CAN fail, shown with strategies whose inspection reports a timer or a parked gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runNoClockScenarios } from "../src/scenarios/no-clock.ts";
import { loadStrategy, type Strategy } from "../src/strategy.ts";

test("NC1 the correct control: every no-clock and restart-limit result ran and passed, for guarantee d and guarantee e", async () => {
  const s = await loadStrategy("control-sqlite");
  const results = await runNoClockScenarios(s);
  const kinds = new Set(results.map((r) => r.kind));
  assert.ok(kinds.has("no-clock") && kinds.has("restart-limit"), `kinds: ${[...kinds]}`);
  assert.ok(results.some((r) => r.guarantee === "d") && results.some((r) => r.guarantee === "e"));
  for (const r of results) {
    assert.equal(r.ran, true, `${r.scenario}: ${r.detail}`);
    assert.equal(r.passed, true, `${r.scenario} ${r.violated}: ${r.detail}`);
  }
});

test("NC2 the restart-limit scenario kills MORE than 5 consecutive times with no move, and the gate is still waiting and not parked", async () => {
  const s = await loadStrategy("control-sqlite");
  const results = await runNoClockScenarios(s);
  const limit = results.find((r) => r.kind === "restart-limit" && r.guarantee === "d")!;
  assert.ok(limit.counts!.kills > 5, `kills: ${limit.counts!.kills}`);
  assert.equal(limit.passed, true);
});

test("NC3 the clock-jump scenario jumps the clock TEN YEARS, both live and across a restart, and real time passes; the gate stays waiting", async () => {
  const s = await loadStrategy("control-sqlite");
  const jump = (await runNoClockScenarios(s)).filter((r) => r.scenario.startsWith("no-clock:"));
  const ids = jump.map((r) => r.scenario);
  for (const want of ["no-clock:jump-live", "no-clock:jump-across-restart", "no-clock:wall-time"]) assert.ok(ids.includes(want), `${want} missing from ${ids}`);
  assert.ok(jump.every((r) => r.passed));
});

test("NC4 the scenario CAN fail: a strategy whose store reports a timer on the gate task violates I7 (guarantee d)", async () => {
  const real = await loadStrategy("control-sqlite");
  const withTimer: Strategy = { ...real, inspect: async (store, gate) => ({ ...(await real.inspect(store, gate)), timers: ["sleepUntil 253402300799000"] }) };
  const results = await runNoClockScenarios(withTimer);
  const failed = results.filter((r) => !r.passed);
  assert.ok(failed.length > 0);
  assert.ok(failed.every((r) => r.violated.includes("I7")), failed.map((r) => `${r.scenario}:${r.violated}`).join(" "));
  assert.ok(failed.some((r) => r.guarantee === "d"));
});

test("NC5 the scenario CAN fail: a gate that reads BLOCKED (parked by a restart limit) after the restarts violates I6", async () => {
  const real = await loadStrategy("control-sqlite");
  const parking: Strategy = { ...real, inspect: async (store, gate) => ({ ...(await real.inspect(store, gate)), blocked: true }) };
  const results = await runNoClockScenarios(parking);
  assert.ok(results.some((r) => r.kind === "restart-limit" && !r.passed && r.violated.includes("I6")), JSON.stringify(results.map((r) => [r.scenario, r.passed, r.violated])));
});
