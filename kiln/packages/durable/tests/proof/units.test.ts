// r13 T060 — a unit's step is killed at each of its named points, for each step index (spec US5, FR-020, SC-001): the owner dies by SIGKILL AT that point, a fresh reader sees a unit that is not
// finished and carries NO result, and a restarted owner resumes from the last checkpoint and finishes with exactly the result an uninterrupted unit has — committed once, never half-recorded. The work of a
// step that was cut off is redone, so its result appears once, not twice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { UNIT_KILL_POINTS } from "#durable/hooks.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { assertAllFired } from "./support/guard.ts";
import { makeStore, runOwner, runThenKill } from "./support/harness.ts";

const STEPS = 3;
const SPEC = { label: "scan", steps: STEPS, stepMs: 60 };
const EXPECTED = Array.from({ length: STEPS }, (_, i) => `scan:${i}`);
const CREATE = { op: "createTask", key: "u1", kind: "kiln.unit", input: SPEC, owner: { kind: "factory" } };
const fired = new Set<string>();

for (const point of UNIT_KILL_POINTS) {
  for (let step = 0; step < STEPS; step++) {
    test(`killed at ${point} in step ${step}: no result is visible before the last commit, and the restart finishes with one complete result`, async () => {
      const ts = makeStore();
      try {
        const dying = await runOwner(ts, { script: [CREATE, { op: "sleep", ms: 15_000 }], killAt: point, killNth: step + 1, expectDeath: true, timeoutMs: 30_000 });
        assert.equal(dying.signal, "SIGKILL", `the owner must die by SIGKILL at ${point}; code ${dying.code}\n${dying.stdout()}${dying.stderr()}`);
        assert.deepEqual(ts.killed(), [point], `the kill point ${point} must have FIRED (and only it)`);
        fired.add(`${point}#${step}`);

        const wreck = await inspectStore(ts.store);
        const unit = wreck.tasks.filter((t) => t.kind === "kiln.unit");
        assert.equal(unit.length, 1, "exactly one unit: the keyed creation happened once");
        assert.equal(unit[0].owner, "factory");
        const lastCommit = point === "unit.step-committed" && step === STEPS - 1; // the final commit has been made: the unit is whole and finished
        if (lastCommit) {
          assert.equal(unit[0].status, "terminal");
          assert.deepEqual(unit[0].outcome, { status: "completed", result: { label: "scan", results: EXPECTED } });
        } else {
          assert.notEqual(unit[0].status, "terminal", `a unit killed at ${point} in step ${step} is not finished`);
          assert.equal(unit[0].outcome, undefined, "and shows no result: a result appears only with the last commit");
        }
        assert.deepEqual(checkInvariants(wreck), []);

        await runThenKill(ts, { script: [{ op: "sleep", ms: 2500 }] });
        const done = await inspectStore(ts.store);
        const after = done.tasks.filter((t) => t.kind === "kiln.unit");
        assert.equal(after.length, 1);
        assert.equal(after[0].status, "terminal");
        assert.deepEqual(after[0].outcome, { status: "completed", result: { label: "scan", results: EXPECTED } }, "the result an uninterrupted unit has — each step's output once");
        assert.deepEqual(checkInvariants(done), []);
      } finally {
        ts.cleanup();
      }
    });
  }
}

test("NEVER VACUOUS: every unit kill point fired in every step, and the run says how many", () => {
  const cases = UNIT_KILL_POINTS.flatMap((p) => Array.from({ length: STEPS }, (_, s) => `${p}#${s}`));
  const missing = cases.filter((c) => !fired.has(c));
  assert.deepEqual(missing, [], `declared but never fired: ${missing.join(", ")}`);
  const { exercised, of } = assertAllFired(UNIT_KILL_POINTS, [...fired].map((c) => c.split("#")[0]));
  console.log(`unit kill points exercised: ${exercised} of ${of} × ${STEPS} steps = ${fired.size} cases`);
});

test("a unit that is never killed ends with the same result (the control the kills are compared with)", async () => {
  const ts = makeStore();
  try {
    await runThenKill(ts, { script: [CREATE, { op: "sleep", ms: 1500 }] });
    const i = await inspectStore(ts.store);
    assert.deepEqual(i.tasks.find((t) => t.kind === "kiln.unit")?.outcome, { status: "completed", result: { label: "scan", results: EXPECTED } });
  } finally {
    ts.cleanup();
  }
});
