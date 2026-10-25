// kiln/tests/lane/failure.test.ts — CR-3 (code review), r7 · P-III / P-V / P-VII · OFFLINE tier.
// A failing unit used to leave `lane.running` claimed forever (no try/finally around the awaited call), and the walk's in-memory
// ledger was discarded with the exception, so the failure left NO record. Both are fixed; these tests pin them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { run, makeLane, assertSingleLane, LaneRunError } from "../../src/lane.ts";
import { buildLiveWalk, WalkHaltedError } from "../../src/live-walk.ts";
import { validateLog } from "../../validate/log.ts";
import type { Resident, WorkUnit } from "../../src/stub-resident.ts";

const W = (id: string, tier: WorkUnit["tier"] = "strongest"): WorkUnit => ({ id, role: "worker", tier });
const failing = (failId: string, how: "reject" | "throw" = "reject", code = "timeout"): Resident => ({
  model: () => "m",
  tier: () => "strongest",
  run: (u: WorkUnit) => {
    if (u.id !== failId) return `ok:${u.id}`;
    const err = Object.assign(new Error(`SECRET SERVER TEXT for ${u.id}`), { code });
    if (how === "throw") throw err; // a SYNCHRONOUS throw inside a non-async resident
    return Promise.reject(err);
  },
});

test("CR-3: a failing unit RECLAIMS the lane slot — `lane.running` is null afterwards, and the error carries the partial result", async () => {
  const lane = makeLane();
  const err = await run(lane, [W("a"), W("b"), W("c")], failing("b")).catch((e) => e);
  assert.ok(err instanceof LaneRunError, "a named lane error, not a bare rejection");
  assert.equal(err.unitId, "b");
  assert.equal(lane.running, null, "the slot is NOT left claimed by a unit that will never finish (P-III)");
  assert.deepEqual(err.partial.outputs.map((o) => o.duId), ["a"], "unit a's work product survives; b and c never produced any");
  assert.doesNotThrow(() => assertSingleLane(err.partial.snapshots), "F-SINGLE holds over the partial snapshots — including the failing instant");
  assert.match(err.message, /unit "b" failed/);
});

test("CR-3: a SYNCHRONOUS throw inside the resident is handled identically", async () => {
  const lane = makeLane();
  const err = await run(lane, [W("a"), W("b")], failing("b", "throw")).catch((e) => e);
  assert.ok(err instanceof LaneRunError && err.unitId === "b");
  assert.equal(lane.running, null);
});

test("CR-3: the lane is REUSABLE after a failure — the next walk on the same lane runs normally", async () => {
  const lane = makeLane();
  await run(lane, [W("a"), W("b")], failing("b")).catch(() => undefined);
  const again = await run(lane, [W("c"), W("d")], failing("never"));
  assert.deepEqual(again.outputs.map((o) => o.duId), ["c", "d"]);
  assert.equal(lane.running, null);
});

test("CR-3 (P-VII): a halted live walk RECORDS the failure — a durable `wait` at the gate the unit feeds, and a `hold` naming the unit and CODE", async () => {
  const err = await buildLiveWalk({ mode: "live", resident: failing("review", "reject", "timeout"), location: "loopback" }).catch((e) => e);
  assert.ok(err instanceof WalkHaltedError, "STILL a loud exception — a caller cannot mistake a halted walk for a finished one");
  assert.equal(err.unit, "review");
  assert.equal(err.code, "timeout");
  const w = err.walk;
  assert.deepEqual(w.failure, { unit: "review", code: "timeout" });
  const recs = w.lines.map((l) => JSON.parse(l));
  assert.equal(validateLog(recs, undefined).valid, true, "the partial ledger PASSES 001's unmodified log.ts (R1–R6)");
  const hold = recs.find((r) => r.recordType === "transition" && r.transition.kind === "hold" && /FAILED/.test(r.transition.reason ?? ""));
  assert.ok(hold, "a transition records the failure");
  assert.match(hold.transition.reason, /unit "review" FAILED \(timeout\)/, "names the unit and the failure CODE");
  const wait = recs.find((r) => r.recordType === "wait");
  assert.ok(wait, "a durable WAIT — the lane halts for a human; it does not advance");
  assert.equal(wait.wait.gate, "6", "at the gate `review` feeds");
  assert.match(wait.wait.token, /^g[0-9a-f]+$/, "a resumable token (001's shape)");
  assert.ok(!recs.some((r) => r.recordType === "gate-completion"), "no gate was completed by a failed walk");
  assert.doesNotMatch(w.jsonl, /SECRET SERVER TEXT/, "the error TEXT (which may quote server output) never reaches the ledger — only the code");
  assert.equal(w.outputs.length, 5, "the five units that DID run before the failure are still captured (triage, concept, architecture, spec, plan)");
  assert.doesNotThrow(() => assertSingleLane(w.snapshots));
});

test("CR-3: a failure at the FIRST unit halts at gate 1; an unknown failure code degrades to `error`, never to a crash", async () => {
  const err = await buildLiveWalk({ mode: "live", resident: { model: () => "m", tier: () => "strongest", run: () => Promise.reject(new Error("no code here")) } as Resident, location: "loopback" }).catch((e) => e);
  assert.ok(err instanceof WalkHaltedError);
  assert.equal(err.unit, "triage");
  assert.equal(err.code, "error");
  assert.equal(JSON.parse(err.walk.lines.at(-1)!).wait.gate, "1");
  assert.equal(validateLog(err.walk.lines.map((l) => JSON.parse(l)), undefined).valid, true);
});
