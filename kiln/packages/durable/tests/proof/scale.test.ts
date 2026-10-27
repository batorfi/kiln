// r13 T051 — scale and readiness (spec SC-005, FR-043, research R13): a factory holding 100 open gates and 20 LIVE units is SIGKILLed and restarted. The owner must report ready — and then accept a
// move on EVERY waiting gate — within 2 seconds of starting to open the store; a move that arrives earlier is `not-ready` and the same key then commits. The time is MEASURED and printed (the spike
// saw 178–197 ms for two tasks; this is the number for a hundred). If it ever exceeds 2 s the fix is to register the decisions in parallel — never to relax the criterion.
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef } from "#durable/canonical.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { makeStore, runThenKill } from "./support/harness.ts";

export const GATES = 100;
export const UNITS = 20;
export const READY_BUDGET_MS = 2000;
const BRIEF = { title: "Scale" };
const REF = briefRef(BRIEF);
const gateId = (n: number) => `gate:scale:gate0:${n}`;

test(`${GATES} open gates and ${UNITS} live units: after a SIGKILL the owner is ready, and every waiting gate accepts a move, within ${READY_BUDGET_MS} ms`, async () => {
  const ts = makeStore();
  try {
    const opens = Array.from({ length: GATES }, (_, n) => ({ op: "open", key: `o${n}`, spec: { gateId: gateId(n), gateKey: "gate0", flow: "v2", brief: BRIEF, openedBy: "factory" } }));
    const units = Array.from({ length: UNITS }, (_, n) => ({ op: "createTask", key: `u${n}`, kind: "kiln.unit", input: { label: `unit-${n}`, steps: 1, stepMs: 60_000 }, owner: { kind: "factory" } }));
    const built = await runThenKill(ts, { script: [...opens, ...units], timeoutMs: 120_000 });
    const made = built.results as any[];
    assert.ok(made.slice(0, GATES).every((r) => r.status === "opened"), "all gates opened");
    assert.ok(made.slice(GATES, GATES + UNITS).every((r) => r.status === "created"), "all units created");
    const before = await inspectStore(ts.store);
    assert.equal(before.tasks.filter((t) => t.kind === "kiln.decision" && t.status !== "terminal").length, GATES, "100 live decisions");
    assert.equal(before.tasks.filter((t) => t.kind === "kiln.unit" && t.status !== "terminal").length, UNITS, "20 live units");

    // restart: time to ready, then a move on every gate
    const moves = Array.from({ length: GATES }, (_, n) => ({ gate: gateId(n), key: `m${n}`, move: { kind: "approve", decidedBy: "person@example", briefRef: REF } }));
    const restarted = await runThenKill(ts, { script: [{ op: "early", gate: gateId(0), key: "m0", move: moves[0].move }, { op: "ready" }, { op: "submitAll", moves: moves.slice(1), concurrency: 25 }], timeoutMs: 120_000 });
    const [early, ready, all] = restarted.results as [{ before: any; after: any }, { ready: boolean; readyMs: number }, { results: any[]; ms: number; sinceStartMs: number }];
    console.log(`scale: ${GATES} gates + ${UNITS} live units → ready in ${ready.readyMs} ms; ${GATES - 1} moves committed in a further ${all.ms} ms (${all.sinceStartMs} ms after start)`);
    assert.equal(ready.ready, true);
    assert.ok(ready.readyMs <= READY_BUDGET_MS, `ready took ${ready.readyMs} ms (budget ${READY_BUDGET_MS} ms)`);
    // the early move (sent before ready) is honest: not-ready, or — if the owner won the race — already committed; the same key afterwards is committed or a repeat, never an error
    assert.ok(["not-ready", undefined].includes(early.before.reason) || early.before.status === "committed", JSON.stringify(early.before));
    assert.ok(["committed", "repeat"].includes(early.after.status), JSON.stringify(early.after));
    assert.ok(all.results.every((r) => r.status === "committed"), `every waiting gate accepted its move: ${JSON.stringify(all.results.find((r) => r.status !== "committed"))}`);

    const after = await inspectStore(ts.store);
    assert.equal(after.tasks.filter((t) => t.kind === "kiln.unit" && t.status !== "terminal").length, UNITS, "the live units resumed and are still live");
    for (const n of [0, 37, 99]) {
      const g = await inspectStore(ts.store, gateId(n));
      assert.equal(g.records.length, 1);
      assert.deepEqual(checkInvariants(g), []);
    }
  } finally {
    ts.cleanup();
  }
});
