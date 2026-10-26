// T044 — exactly once, first move wins, refusals change nothing (guarantees b and c), judged on the CORRECT control and on the native strategy that holds a, d, e.
// The numbers are the contract: REPEATS and RACERS are at least 100, and the counts below are exact. The scenarios themselves were shown able to FAIL by
// mutating the correct control (recorded in NOTES.md): key-conflict reported as a repeat, the existing-record check removed, the winner dropped from `stale`,
// the injected store failure swallowed — each fails exactly the cases that should.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RACERS, REPEATS, runExactlyOnce } from "../src/scenarios/exactly-once.ts";
import { loadStrategy } from "../src/strategy.ts";

test("EO0 the counts are not toy counts", () => {
  assert.ok(REPEATS >= 100 && RACERS >= 100);
});

for (const name of ["control-sqlite", "native-signal"]) {
  test(`EO1 ${name}: every exactly-once case ran and passed, with the exact counts`, async () => {
    const results = await runExactlyOnce(await loadStrategy(name));
    const by = (id: string) => results.find((r) => r.scenario === id);
    for (const r of results) {
      assert.equal(r.ran, true, `${r.scenario}: ${r.detail}`);
      assert.equal(r.passed, true, `${r.scenario} violated [${r.violated}]: ${r.detail}`);
    }
    assert.deepEqual(results.map((r) => r.scenario).sort(), ["conflict:invalid-move", "conflict:key", "conflict:not-ready", "conflict:stale", "conflict:unknown-gate", "race:distinct-keys", "repeat:after-restart", "repeat:concurrent", "store-error:store-write"]);
    assert.deepEqual(by("repeat:concurrent")!.counts, { requests: REPEATS, committed: 1, repeat: REPEATS - 1, refused: 0, records: 1 });
    assert.deepEqual(by("repeat:after-restart")!.counts, { requests: REPEATS, committed: 0, repeat: REPEATS, refused: 0, records: 1 });
    assert.deepEqual(by("race:distinct-keys")!.counts, { requests: RACERS, committed: 1, refused: RACERS - 1, records: 1 });
    assert.deepEqual(by("store-error:store-write")!.counts, { recordsAfterFault: 0, recordsFinal: 1 });
    assert.deepEqual(new Set(results.map((r) => r.guarantee)), new Set(["b", "c"]));
  });
}

test("EO2 `only` limits the run to the kinds asked for (the registry runs --only race on its own)", async () => {
  const results = await runExactlyOnce(await loadStrategy("control-sqlite"), undefined, false, ["race"]);
  assert.deepEqual(results.map((r) => r.scenario), ["race:distinct-keys"]);
});
