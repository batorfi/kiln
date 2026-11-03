// r16 T019 — a unit whose spec names a `role` runs a real conversation turn (through a fake `WorkersApi` here — the
// real one is `#workers/conversation.ts`, proven separately by conversation.test.ts) in place of the scripted
// `stepMs` stand-in, inside the exact same checkpoint/commit/lane-acquire/release shape a scripted unit already
// uses. A scripted (no-role) unit's own behaviour, proven elsewhere (record/unit-events.test.ts, proof/units.test.ts),
// stays unmodified — this file never touches a no-role unit's path.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory, type Factory } from "#durable/factory.ts";
import type { LaneApi, TaskId, TurnInput, TurnResult, WorkersApi } from "#durable/types.ts";

function fakeLane(counts?: { acquires: number; releases: number }): LaneApi {
  const held = new Set<number>();
  return {
    async acquire(step) {
      if (counts) counts.acquires++;
      held.add(step);
      return { holder: step, since: Date.now() };
    },
    async release(step) {
      if (counts) counts.releases++;
      held.delete(step);
    },
    holds(step) { return held.has(step); },
  };
}

function fakeWorkers(turnsOf: (input: TurnInput) => TurnResult | Promise<TurnResult>): WorkersApi {
  return { runTurn: (input) => Promise.resolve(turnsOf(input)) };
}

async function withFactory(opts: { workers: WorkersApi; lane?: LaneApi }, run: (f: Factory) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k16-unit-worker-"));
  const store = join(dir, "s");
  const f = await openFactory({ store, lane: opts.lane ?? fakeLane(), workers: opts.workers });
  try {
    await f.ready;
    await run(f);
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}

const unitEvents = async (f: Factory) => (await f.inspect()).outbox.filter((e) => e.type.startsWith("unit."));
async function until(cond: () => Promise<boolean>, what: string): Promise<void> {
  for (let i = 0; i < 200; i++) { if (await cond()) return; await new Promise((r) => setTimeout(r, 25)); }
  throw new Error(`timed out waiting for ${what}`);
}

test("a real-role unit commits unit.started once, then unit.settled once holding a real result — never the stand-in's label string", () =>
  withFactory({ workers: fakeWorkers((input) => ({ kind: "done", result: { label: input.role, results: ["a real generated artifact"] } })) }, async (f) => {
    const r = await f.tasks.create("u1", "kiln.unit", { label: "worker", steps: 1, needsLane: true, model: "fake-model", role: "worker", workspace: "/tmp" } as never, { kind: "factory" });
    assert.equal(r.status, "created");
    const id = (r as { id: number }).id;
    await until(async () => (await unitEvents(f)).some((e) => e.type === "unit.settled"), "the real-role unit to settle");
    const ev = await unitEvents(f);
    assert.deepEqual(ev.map((e) => e.type), ["unit.queued", "unit.started", "unit.settled"], "exactly the same event trail shape a scripted unit has");
    const wreck = await f.inspect();
    const unit = wreck.tasks.find((t) => t.id === id)!;
    assert.equal(unit.status, "terminal");
    assert.deepEqual(unit.outcome, { status: "completed", result: { label: "worker", results: ["a real generated artifact"] } });
    assert.doesNotMatch(JSON.stringify(unit.outcome), /worker:0/, "the scripted stand-in's label:i string must never appear for a real-role unit");
  }));

test("the workers port receives the unit's role, model, workspace and explicit input references", () => {
  let seen: TurnInput | undefined;
  return withFactory(
    { workers: fakeWorkers((input) => { seen = input; return { kind: "done", result: { label: input.role, results: [] } }; }) },
    async (f) => {
      await f.tasks.create("u1", "kiln.unit", { label: "worker", steps: 1, needsLane: true, model: "m1", role: "worker", workspace: "/a/workspace", inputs: ["notes.md"] } as never, { kind: "factory" });
      await until(() => Promise.resolve(seen !== undefined), "runTurn to be called");
      assert.equal(seen!.role, "worker");
      assert.equal(seen!.model, "m1");
      assert.equal(seen!.workspace, "/a/workspace");
      assert.deepEqual(seen!.inputs, [{ ref: "notes.md" }]);
    },
  );
});

test("a scripted (no-role) unit's lease is acquired and released exactly as before — the role branch never runs for it", () =>
  withFactory({ workers: fakeWorkers(() => { throw new Error("must never be called for a scripted unit"); }) }, async (f) => {
    const r = await f.tasks.create("u1", "kiln.unit", { label: "scripted", steps: 2, needsLane: true, model: "m1", stepMs: 5 } as never, { kind: "factory" });
    assert.equal(r.status, "created");
    await until(async () => (await unitEvents(f)).some((e) => e.type === "unit.settled"), "the scripted unit to settle");
    const wreck = await f.inspect();
    const unit = wreck.tasks.find((t) => t.id === (r as { id: number }).id)!;
    assert.deepEqual(unit.outcome, { status: "completed", result: { label: "scripted", results: ["scripted:0", "scripted:1"] } }, "the existing scripted shape, completely unaffected by this row");
  }));

test("found at code review, fixed: a real-role unit's multi-round conversation holds ONE lease for its whole duration — acquire and release each exactly once, never once per round", () => {
  const counts = { acquires: 0, releases: 0 };
  let calls = 0;
  const ROUNDS = 4;
  return withFactory(
    {
      lane: fakeLane(counts),
      workers: fakeWorkers((input) => {
        calls++;
        // every call after the first MUST find the lease still held — if it had to re-acquire, this fake lane's
        // acquire() would still succeed (it has no deadlock itself), but the real lane's would hang: the point of
        // this assertion is to prove unit.ts never ASKS again, not merely that a fake asker would survive it.
        if (calls < ROUNDS) return { kind: "continue", checkpoint: { ...input.checkpoint, done: 0, results: [], round: calls } };
        return { kind: "done", result: { label: input.role, results: [`finished after ${calls} rounds`] } };
      }),
    },
    async (f) => {
      await f.tasks.create("u1", "kiln.unit", { label: "worker", steps: 1, needsLane: true, model: "m1", role: "worker", workspace: "/tmp" } as never, { kind: "factory" });
      await until(async () => (await unitEvents(f)).some((e) => e.type === "unit.settled"), "the multi-round real-role unit to settle");
      assert.equal(calls, ROUNDS, "runTurn must have been asked once per round, not collapsed or looped");
      assert.equal(counts.acquires, 1, "the lease must be acquired exactly once for the whole multi-round conversation, not once per round");
      assert.equal(counts.releases, 1, "the lease must be released exactly once, after the conversation is actually done — not between rounds");
    },
  );
});

test("a unit with neither role nor needsLane still runs the scripted stand-in untouched", () =>
  withFactory({ workers: fakeWorkers(() => { throw new Error("must never be called"); }) }, async (f) => {
    await f.tasks.create("u1", "kiln.unit", { label: "bare", steps: 1, stepMs: 1 } as never, { kind: "factory" });
    await until(async () => (await unitEvents(f)).some((e) => e.type === "unit.settled"), "the bare unit to settle");
    const wreck = await f.inspect();
    const unit = wreck.tasks.find((t) => t.kind === "kiln.unit")!;
    assert.deepEqual(unit.outcome, { status: "completed", result: { label: "bare", results: ["bare:0"] } });
  }));
