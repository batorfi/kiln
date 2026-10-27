// r13 T067 — the lane under attack (spec US6, SC-008, FR-030 … FR-032): (1) ≥ 100 trials of two steps asking at once — at no instant do two hold it; (2) the owner is killed at each lane point, and
// a fresh reader finds at most one holder, a restart reports NONE until the resumed step asks again, and the resident model, hold flag and swap count are exactly as they were; every `lane.*` entry has
// its lane commit and vice versa (oracle I8).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openFactory } from "#durable/factory.ts";
import { inspectStore } from "#durable/inspect.ts";
import { KILL_POINTS } from "#durable/hooks.ts";
import { checkInvariants } from "../../durable/tests/proof/support/oracle.ts";
import { assertAllFired } from "../../durable/tests/proof/support/guard.ts";
import { makeStore, runOwner, runThenKill } from "../../durable/tests/proof/support/harness.ts";
import { createLane } from "../src/lane-task.ts";

const LANE_MODULE = fileURLToPath(new URL("../src/lane-task.ts", import.meta.url));
const TRIALS = 100;

test(`${TRIALS} trials of two steps asking at once: at no instant do two hold the lane, and the store agrees`, async () => {
  const dir = mkdtempSync(join(tmpdir(), "k13laneproof-"));
  const store = join(dir, "s");
  const lane = createLane();
  const factory = await openFactory({ store, lane: lane.api, tasks: lane.kinds });
  try {
    await factory.ready;
    let running = 0;
    let max = 0;
    let instants = 0;
    const generation = async (step: number, model: string): Promise<void> => {
      await lane.api.acquire(step, { model });
      running += 1; // the generation starts the instant the lane is granted
      max = Math.max(max, running);
      instants += 1;
      await new Promise((r) => setImmediate(r)); // long enough for a second holder, if there were one, to show itself
      running -= 1; // and ends before the lane is given back
      await lane.api.release(step);
    };
    for (let n = 0; n < TRIALS; n++) await Promise.all([generation(2 * n + 1, n % 2 ? "m1" : "m2"), generation(2 * n + 2, n % 3 ? "m1" : "m2")]);
    assert.equal(instants, 2 * TRIALS, "every step got its turn");
    assert.equal(max, 1, "never two generations at once");
    const i = await factory.inspect();
    assert.deepEqual(checkInvariants(i), [], "I8 over the whole history of entries");
    assert.equal(i.outbox.filter((e) => e.type === "lane.acquired").length, 2 * TRIALS);
    assert.equal(i.outbox.filter((e) => e.type === "lane.released").length, 2 * TRIALS);
    assert.equal(i.outbox.filter((e) => e.type === "lane.swapped").length, i.lane.swaps, "every counted swap has its entry, and vice versa");
    assert.ok(i.lane.swaps > 0, "the trials did change the resident model (the swap count is not vacuously 0)");
    assert.equal(i.lane.holders, 0);
  } finally {
    await factory.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

const LANE_POINTS = (KILL_POINTS as readonly string[]).filter((p) => p.startsWith("lane."));
const fired: string[] = [];
const wrecks: Record<string, { holders: number; resident: string | null; swaps: number }> = {};
const A = { label: "gen-a", steps: 2, stepMs: 60, needsLane: true, model: "m1", hold: true };
const B = { label: "gen-b", steps: 2, stepMs: 60, needsLane: true, model: "m2" };
const create = (key: string, input: unknown) => ({ op: "createTask", key, kind: "kiln.unit", input, owner: { kind: "factory" } });

for (const point of LANE_POINTS) {
  test(`killed at ${point}: at most one holder in the wreck, none after the restart until a step asks again, the lane's facts as they were, and every step still finishes`, async () => {
    const ts = makeStore();
    try {
      const dying = await runOwner(ts, { laneModule: LANE_MODULE, script: [create("a", A), create("b", B), { op: "sleep", ms: 20_000 }], killAt: point, killNth: 2, expectDeath: true, timeoutMs: 40_000 });
      assert.equal(dying.signal, "SIGKILL", `the owner must die by SIGKILL at ${point}; code ${dying.code}\n${dying.stdout()}${dying.stderr()}`);
      assert.deepEqual(ts.killed(), [point], `the kill point ${point} must have FIRED (and only it)`);
      fired.push(point);

      const wreck = await inspectStore(ts.store);
      assert.ok(wreck.lane.holders <= 1, `holders in the wreck: ${wreck.lane.holders}`);
      assert.deepEqual(checkInvariants(wreck), [], `the wreckage at ${point}`);
      wrecks[point] = { holders: wreck.lane.holders, resident: wreck.lane.resident, swaps: wreck.lane.swaps };
      console.log(`lane ${point}: wreck holders ${wreck.lane.holders}, resident ${wreck.lane.resident}, hold ${wreck.lane.hold}, swaps ${wreck.lane.swaps}`);
      assert.equal(wreck.tasks.filter((t) => t.kind === "kiln.lane").length, 1, "one lane task");

      // the restart: the resumed units are held back at their step's first moment, so what a reader sees now is the lane as the START left it, before anyone asks again
      const life = await runThenKill(ts, { laneModule: LANE_MODULE, holdAt: "unit.step-begin", holdMs: 1500, script: [{ op: "sleep", ms: 700 }, { op: "inspect" }, { op: "sleep", ms: 6000 }], timeoutMs: 60_000 });
      const restarted = life.results[0] as typeof wreck;
      assert.equal(restarted.lane.holders, 0, "the restart reports no running generation until a resumed step asks");
      assert.deepEqual({ resident: restarted.lane.resident, hold: restarted.lane.hold, swaps: restarted.lane.swaps }, { resident: wreck.lane.resident, hold: wreck.lane.hold, swaps: wreck.lane.swaps }, "resident model, hold flag and swap count are exactly as before the kill");
      assert.deepEqual(checkInvariants(restarted), []);
      if (wreck.lane.holders === 1) assert.ok(restarted.outbox.some((e) => e.type === "lane.released" && e.actor === "factory" && e.cause === "restart"), "the dead generation's lease was released with an entry");

      const done = await inspectStore(ts.store);
      const units = done.tasks.filter((t) => t.kind === "kiln.unit");
      assert.equal(units.length, 2);
      assert.ok(units.every((u) => u.status === "terminal" && u.outcome?.status === "completed"), JSON.stringify(units.map((u) => [u.status, u.outcome?.status])));
      assert.equal(done.lane.holders, 0);
      assert.deepEqual(checkInvariants(done), []);
      assert.equal(done.outbox.filter((e) => e.type === "lane.swapped").length, done.lane.swaps, "every swap counted has its entry");
    } finally {
      ts.cleanup();
    }
  });
}

test("NEVER VACUOUS: every declared lane kill point fired", () => {
  const { exercised, of } = assertAllFired(LANE_POINTS, fired);
  console.log(`lane kill points exercised: ${exercised} of ${of}`);
  assert.equal(wrecks["lane.acquire-committed"]?.holders, 1, "a kill right after an acquire leaves a lease held by a dead generation — the case the restart must clear");
  assert.equal(wrecks["lane.release-committed"]?.holders, 0, "and a kill right after a release leaves the lane free");
  assert.ok(Object.values(wrecks).some((w) => w.resident !== null), "the lane had facts worth preserving when it was killed");
});
