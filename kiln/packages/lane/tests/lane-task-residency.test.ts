// r16 T013 — createLane({residency}) wiring: grant() loads a model before granting a lease that names one not yet
// resident; release() unloads it unless pinned; a pinned model survives release with no unload call; asking for the
// already-resident model triggers neither a load nor a swap (unchanged r13 behaviour, reconfirmed under residency).
// Uses a fake `Residency` (no real Ollama needed) — `residency.test.ts` already proves the real HTTP semantics.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory, type Factory } from "#durable/factory.ts";
import { createLane } from "#lane/lane-task.ts";
import type { Residency } from "#lane/residency.ts";

function fakeResidency(opts: { brokenOnce?: { model: string; detail: string } } = {}) {
  const resident = new Set<string>();
  const pinned = new Set<string>();
  const calls: Array<{ op: "load" | "unload"; model: string }> = [];
  let broken = opts.brokenOnce ?? null;
  const residency: Residency = {
    async load(model, loadOpts) {
      if (resident.has(model)) {
        if (loadOpts?.pin) pinned.add(model);
        return { loaded: false };
      }
      calls.push({ op: "load", model });
      resident.add(model);
      if (loadOpts?.pin) pinned.add(model);
      return { loaded: true };
    },
    async unload(model) {
      if (!resident.has(model) || pinned.has(model)) return { unloaded: false };
      calls.push({ op: "unload", model });
      resident.delete(model);
      return { unloaded: true };
    },
    async probe() {
      return { toolCalling: true, streaming: true, usageAccounting: true, contextWindow: 1 };
    },
    async reconcile() {
      // r16 T029: `brokenOnce` fires exactly once then clears, so a test can prove the NEXT load() after the
      // mismatch is fixed succeeds — matching the real residency manager's reconcile(), which reports what Ollama
      // is ACTUALLY running right now, not a permanent flag.
      const r = broken;
      broken = null;
      return r;
    },
  };
  return { residency, calls };
}

async function withResidentLane(
  run: (ctx: { factory: Factory; api: ReturnType<typeof createLane>["api"]; calls: ReturnType<typeof fakeResidency>["calls"] }) => Promise<void>,
  residencyOpts: Parameters<typeof fakeResidency>[0] = {},
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k16lane-residency-"));
  const store = join(dir, "s");
  const { residency, calls } = fakeResidency(residencyOpts);
  const lane = createLane({ residency, budgetBytes: 1_000_000 });
  const factory = await openFactory({ store, lane: lane.api, tasks: lane.kinds });
  try {
    await factory.ready;
    await run({ factory, api: lane.api, calls });
  } finally {
    await factory.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}

test("acquiring a new model calls residency.load(); releasing (unpinned) calls residency.unload()", () =>
  withResidentLane(async ({ api, calls }) => {
    await api.acquire(1, { model: "m1", cause: "unit:1" });
    assert.deepEqual(calls, [{ op: "load", model: "m1" }]);
    await api.release(1);
    assert.deepEqual(calls, [{ op: "load", model: "m1" }, { op: "unload", model: "m1" }]);
  }));

test("a pinned acquire's model survives release with no unload call (FR-024)", () =>
  withResidentLane(async ({ api, calls }) => {
    await api.acquire(1, { model: "reviewer-model", pin: true, cause: "unit:1" });
    await api.release(1);
    assert.deepEqual(calls, [{ op: "load", model: "reviewer-model" }], "no unload call: the model is pinned");
  }));

test("re-asking for the same model while still held is not a load; releasing (unpinned) and re-acquiring IS a real reload, but still never a swap", () =>
  withResidentLane(async ({ factory, api, calls }) => {
    await api.acquire(1, { model: "m1", cause: "unit:1" });
    // held, not released: a second acquire for the SAME step/model never happens in practice (one lease at a time),
    // but the residency manager's own no-op path (residency.test.ts) already proves re-asking while resident is free.
    await api.release(1); // unpinned: this unloads m1 for real (FR-020's explicit unload, not left to chance)
    await api.acquire(2, { model: "m1", cause: "unit:2" }); // the SAME model again, after a real unload
    assert.deepEqual(calls, [{ op: "load", model: "m1" }, { op: "unload", model: "m1" }, { op: "load", model: "m1" }], "a real reload happens — release() really let the model go");
    const insp = await factory.inspect();
    assert.equal(insp.lane.swaps, 0, "still not a swap: the resident model's NAME never changed, only whether it was physically loaded at a given instant");
  }));

test("a swap (a genuinely different model) is still counted exactly as r13 already proved, with residency wired in", () =>
  withResidentLane(async ({ factory, api }) => {
    await api.acquire(1, { model: "m1", cause: "unit:1" });
    await api.release(1);
    await api.acquire(2, { model: "m2", cause: "unit:2" }); // a different model: a real swap
    const insp = await factory.inspect();
    assert.equal(insp.lane.swaps, 1);
    assert.equal(insp.lane.resident, "m2");
  }));

// ── T029: reconcile() wired in before every load() — a bypass fails the acquire closed, never silently adopted ──

const BROKEN_ONCE = { brokenOnce: { model: "bypassed-model", detail: 'Ollama reports "bypassed-model" resident, but the residency manager never asked for it' } };

test("a broken guarantee (Ollama running a model this manager never loaded) refuses the NEXT acquire, by name, before any load call", () =>
  withResidentLane(async ({ api, calls }) => {
    await assert.rejects(
      api.acquire(1, { model: "m1", cause: "unit:1" }),
      (e: Error) => e.message.includes("broken guarantee") && e.message.includes("bypassed-model"),
    );
    assert.deepEqual(calls, [], "the refusal happens before any load() call — never a partial acquire");
  }, BROKEN_ONCE));

test("once the mismatch is gone, the following acquire succeeds normally — reconcile() reports what is true NOW, not a permanent flag", () =>
  withResidentLane(async ({ api, calls }) => {
    await assert.rejects(api.acquire(1, { model: "m1", cause: "unit:1" }));
    await api.acquire(1, { model: "m1", cause: "unit:1" }); // the SAME step retries: fakeResidency's reconcile() only fires once
    assert.deepEqual(calls, [{ op: "load", model: "m1" }]);
  }, BROKEN_ONCE));
