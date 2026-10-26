// r13 T042 — the proof is shown able to FAIL (FR-061). A deliberately half-applying gate (the move stored in one commit, the decision completed in a second) must be caught by the oracle at its
// seam and NOWHERE else; and a run that exercised nothing must fail by name. If either of these passed vacuously, every "held" the real gate ever earned would be worthless.
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef } from "#durable/canonical.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { assertAllFired, ProofVacuous } from "./support/guard.ts";
import { makeStore, runOwner } from "./support/harness.ts";

const GATE = "gate:demo:gate0:1";
const BRIEF = { title: "Roadmap" };
const OPEN = { op: "open", key: "o1", spec: { gateId: GATE, gateKey: "gate0", flow: "v2", brief: BRIEF, openedBy: "factory" } };
const MOVE = { op: "submit", gate: GATE, key: "m1", move: { kind: "approve", decidedBy: "person@example", briefRef: briefRef(BRIEF) } };

test("the BROKEN gate killed between its two commits leaves a move on a gate that never settled — the oracle reports I2 and I3", async () => {
  const ts = makeStore();
  try {
    const dying = await runOwner(ts, { script: [OPEN, MOVE], brokenGate: true, killAt: "between-commits", expectDeath: true });
    assert.equal(dying.signal, "SIGKILL", `${dying.stdout()}${dying.stderr()}`);
    assert.deepEqual(ts.killed(), ["between-commits"], "the seam point fired");
    const wreck = await inspectStore(ts.store, GATE);
    assert.equal(wreck.records.length, 1, "the move was stored…");
    assert.equal(wreck.decision, "live", "…and the decision was not completed");
    const v = checkInvariants(wreck);
    assert.ok(v.includes("I2") && v.includes("I3"), `expected I2 and I3, got [${v.join(",")}]`);
  } finally {
    ts.cleanup();
  }
});

test("…and only there: the same broken gate killed at points that are not its seam is clean (so a failure is caused by the seam, not by the harness)", async () => {
  for (const point of ["open.committed", "move.received"]) {
    const ts = makeStore();
    try {
      const dying = await runOwner(ts, { script: [OPEN, MOVE], brokenGate: true, killAt: point, expectDeath: true });
      assert.equal(dying.signal, "SIGKILL", point);
      assert.deepEqual(checkInvariants(await inspectStore(ts.store, GATE)), [], `broken gate, killed at ${point}`);
    } finally {
      ts.cleanup();
    }
  }
});

test("and without any kill the broken gate looks fine — the half-application is visible ONLY to a kill at the seam", async () => {
  const ts = makeStore();
  try {
    await runOwner(ts, { script: [OPEN, MOVE, { op: "sleep", ms: 1200 }], brokenGate: true });
    const i = await inspectStore(ts.store, GATE);
    assert.equal(i.records.length, 1);
    assert.equal(i.decision, "terminal");
    assert.deepEqual(checkInvariants(i), [], "unkilled, the two commits both land: this is exactly why a happy-path test proves nothing");
  } finally {
    ts.cleanup();
  }
});

test("a proof whose declared list is EMPTY fails by name: proof-zero-kill-points", () => {
  assert.throws(() => assertAllFired([], []), (e: unknown) => e instanceof ProofVacuous && e.code === "proof-zero-kill-points");
  assert.throws(() => assertAllFired([], ["x"]), (e: unknown) => e instanceof ProofVacuous && e.code === "proof-zero-kill-points");
});

test("a proof in which NOTHING fired fails by name: proof-no-point-fired", () => {
  assert.throws(() => assertAllFired(["a", "b", "c"], []), (e: unknown) => e instanceof ProofVacuous && e.code === "proof-no-point-fired");
  assert.throws(() => assertAllFired(["a", "b"], ["z"]), (e: unknown) => e instanceof ProofVacuous && e.code === "proof-no-point-fired");
});

test("a proof in which a declared point did NOT fire fails by name, naming it: proof-point-not-fired", () => {
  assert.throws(() => assertAllFired(["a", "b", "c"], ["a", "c"]), (e: unknown) => e instanceof ProofVacuous && e.code === "proof-point-not-fired" && /\bb\b/.test(e.message));
  assert.deepEqual(assertAllFired(["a", "b"], ["b", "a", "extra"]), { exercised: 2, of: 2 });
});

test("a kill point that never fires is not a pass: arming a name the source does not use leaves the kill log empty and the owner alive to the end", async () => {
  const ts = makeStore();
  try {
    const run = await runOwner(ts, { script: [OPEN], killAt: "no.such.point" });
    assert.equal(run.code, 0);
    assert.deepEqual(ts.killed(), [], "nothing fired");
    assert.throws(() => assertAllFired(["no.such.point"], ts.killed()), (e: unknown) => e instanceof ProofVacuous && e.code === "proof-no-point-fired");
  } finally {
    ts.cleanup();
  }
});
