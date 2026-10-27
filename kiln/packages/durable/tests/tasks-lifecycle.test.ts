// r13 T050 — the task kinds have a life (spec US4, FR-003 … FR-005): each of roadmap, row and unit is CREATED through the seam (keyed), RUN, killed (SIGKILL) in the middle of its life, restarted, and
// finishes with the outcome it would have had without the crash. The roadmap settles only through a person's move on gate0 and has no delegation field. A fresh reader sees every task's kind,
// owner and status (FR-005).
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef } from "#durable/canonical.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./proof/support/oracle.ts";
import { makeStore, runThenKill, spawnOwner, killNow, runOwner, type TestStore } from "./proof/support/harness.ts";

const withStore = async (run: (ts: TestStore) => Promise<void>): Promise<void> => {
  const ts = makeStore();
  try {
    await run(ts);
  } finally {
    ts.cleanup();
  }
};
const create = (key: string, kind: string, input: unknown) => ({ op: "createTask", key, kind, input, owner: { kind: "factory" } });
const finished = async (ts: TestStore, kind: string, ms = 6000) => {
  const end = Date.now() + ms;
  for (;;) {
    const i = await inspectStore(ts.store);
    const t = i.tasks.find((x) => x.kind === kind);
    if (t?.status === "terminal" || Date.now() > end) return { i, t };
    await new Promise((r) => setTimeout(r, 100));
  }
};

test("UNIT: created, killed mid-step, restarted — it finishes with all its results, committed once", () => withStore(async (ts) => {
  const spec = { label: "scan", steps: 3, stepMs: 400 };
  const run = spawnOwner(ts, { script: [create("u1", "kiln.unit", spec), { op: "sleep", ms: 20_000 }] });
  await run.started;
  await new Promise((r) => setTimeout(r, 900)); // inside step 1 or 2
  await killNow(run);
  const mid = await inspectStore(ts.store);
  const unit = mid.tasks.find((t) => t.kind === "kiln.unit");
  assert.ok(unit && unit.status !== "terminal", `the unit must be unfinished when killed: ${JSON.stringify(unit)}`);
  await runThenKill(ts, { script: [{ op: "sleep", ms: 2500 }] });
  const { i, t } = await finished(ts, "kiln.unit");
  assert.equal(t?.status, "terminal");
  assert.deepEqual(t?.outcome, { status: "completed", result: { label: "scan", results: ["scan:0", "scan:1", "scan:2"] } });
  assert.equal(i.tasks.filter((x) => x.kind === "kiln.unit").length, 1, "exactly one unit: the keyed creation was not repeated");
}));

test("ROW: a two-unit script is run across a kill — two units, in order, one row result", () => withStore(async (ts) => {
  const row = { feature: "f1", script: [{ label: "a", steps: 2, stepMs: 300 }, { label: "b", steps: 1, stepMs: 300 }] };
  const run = spawnOwner(ts, { script: [create("r1", "kiln.row", row), { op: "sleep", ms: 20_000 }] });
  await run.started;
  await new Promise((r) => setTimeout(r, 700));
  await killNow(run);
  await runThenKill(ts, { script: [{ op: "sleep", ms: 4000 }] });
  const { i, t } = await finished(ts, "kiln.row", 8000);
  assert.equal(t?.status, "terminal", JSON.stringify(i.tasks.map((x) => [x.kind, x.status])));
  const units = i.tasks.filter((x) => x.kind === "kiln.unit");
  assert.equal(units.length, 2, "one unit per script entry, never a duplicate after the restart");
  assert.ok(units.every((u) => u.status === "terminal" && u.owner === t!.id), "each unit is owned by the row and finished");
  assert.deepEqual((t?.outcome?.result as { units: number }).units, 2);
}));

test("ROADMAP: it opens gate0, waits through restarts, and settles ONLY through a person's committed move", () => withStore(async (ts) => {
  const first = await runThenKill(ts, { script: [create("rm1", "kiln.roadmap", { factory: "demo" }), { op: "sleep", ms: 700 }] });
  assert.equal((first.results[0] as { status: string }).status, "created");
  for (let k = 0; k < 2; k++) await runThenKill(ts, { script: [{ op: "sleep", ms: 400 }] }); // restarts with no move
  const mid = await inspectStore(ts.store);
  const rm = mid.tasks.find((t) => t.kind === "kiln.roadmap")!;
  assert.notEqual(rm.status, "terminal", "no restart settled the Roadmap gate");
  const gate = mid.tasks.find((t) => t.kind === "kiln.gate")!;
  assert.ok(gate && gate.status !== "terminal");
  // find the gate id (the roadmap names it), then decide it
  const gateId = `gate:demo:gate0:${rm.id}`;
  const g0 = await inspectStore(ts.store, gateId);
  assert.equal(g0.gate, "waiting");
  const REF = briefRef({ kind: "roadmap", factory: "demo" });
  const bad = await runThenKill(ts, { script: [{ op: "submit", gate: gateId, key: "x", move: { kind: "approve", decidedBy: "", briefRef: REF } }, { op: "sleep", ms: 200 }] });
  assert.equal((bad.results[0] as { reason: string }).reason, "invalid-move", "a move with no decider never settles the Roadmap gate");
  const ok = await runThenKill(ts, { script: [{ op: "submit", gate: gateId, key: "m1", move: { kind: "approve", decidedBy: "human@example", briefRef: REF } }, { op: "sleep", ms: 2000 }] });
  assert.equal((ok.results[0] as { status: string }).status, "committed");
  const { t } = await finished(ts, "kiln.roadmap");
  assert.equal(t?.status, "terminal");
  assert.deepEqual(t?.outcome?.result, { gateId, moveKind: "approve", key: "m1" });
  assert.deepEqual(checkInvariants(await inspectStore(ts.store, gateId)), []);
}));

test("ROADMAP has no delegation field: any parameter but {factory} is refused by name, and so is a delegation", () => withStore(async (ts) => {
  const run = await runOwner(ts, { script: [
    create("a", "kiln.roadmap", { factory: "demo", delegation: { armed: true } }),
    create("b", "kiln.roadmap", { factory: "demo", autoApprove: true }),
    create("c", "kiln.roadmap", {}),
    create("d", "kiln.roadmap", { factory: "demo" }),
  ] });
  const r = run.results as any[];
  for (const n of [0, 1]) { assert.equal(r[n].reason, "invalid-move"); assert.match(r[n].detail, /accepts no delegation/); }
  assert.equal(r[2].reason, "invalid-move");
  assert.equal(r[3].status, "created");
}));

test("creation is keyed: the same key repeats, another request under the same key conflicts, and a kind or input that is wrong is refused before anything is written", () => withStore(async (ts) => {
  const run = await runOwner(ts, { script: [
    create("k1", "kiln.unit", { label: "x", steps: 1 }),
    create("k1", "kiln.unit", { label: "x", steps: 1 }),
    create("k1", "kiln.unit", { label: "x", steps: 2 }),
    create("k2", "kiln.gate", { gateId: "g" }),            // a gate is not created from outside
    create("k3", "kiln.unit", { label: "x", steps: 0 }),
    create("k4", "kiln.unit", { label: "x", steps: 1, needsLane: true }), // no lane port in this factory
    create("k5", "kiln.row", { feature: "f", script: [{ label: "", steps: 1 }] }),
    { op: "tasks" },
  ] });
  const r = run.results as any[];
  assert.equal(r[0].status, "created");
  assert.deepEqual([r[1].status, r[1].id], ["repeat", r[0].id]);
  assert.deepEqual([r[2].status, r[2].reason, r[2].original], ["refused", "key-conflict", "k1"]);
  for (const n of [3, 4, 5, 6]) assert.equal(r[n].reason, "invalid-move", JSON.stringify(r[n]));
  assert.match(r[5].detail, /needs the lane port/);
  assert.equal((r[7] as any[]).filter((t) => t.kind === "kiln.unit").length, 1, "only the first creation left a task");
}));

test("FR-005: a fresh reader sees every task's kind, owner and status — the live set is the store's, not memory's", () => withStore(async (ts) => {
  await runThenKill(ts, { script: [create("r1", "kiln.row", { feature: "f", script: [{ label: "a", steps: 1, stepMs: 20_000 }] }), { op: "sleep", ms: 800 }] });
  const i = await inspectStore(ts.store);
  const row = i.tasks.find((t) => t.kind === "kiln.row")!;
  const unit = i.tasks.find((t) => t.kind === "kiln.unit")!;
  assert.ok(row && unit);
  assert.equal(row.owner, "factory");
  assert.equal(unit.owner, row.id, "ownership is stored: the unit belongs to its row");
  assert.ok(["waiting", "running"].includes(row.status));
  assert.equal(unit.status, "running");
}));
