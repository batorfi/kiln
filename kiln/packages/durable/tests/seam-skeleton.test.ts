// r13 T023 — the seam's skeleton: a factory opens, closes and reopens through the seam; a second owner is refused; the child-owner harness starts, is killed and restarts; and the STORE-VERSION GUARD
// (FR-047, SC-011): a store created under one library version is refused, naming both, before ANY task resumes, and the store is unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory } from "#durable/factory.ts";
import { inspectStore } from "#durable/inspect.ts";
import { openStore } from "#durable/library/open.ts";
import { checkStoreVersion } from "#durable/store-version.ts";
import { defineKilnTask } from "#durable/store.ts";
import { StoreOwned, StoreVersionMismatch } from "#durable/types.ts";
import { killNow, makeStore, runOwner, startOwner } from "./proof/support/harness.ts";

const withDir = async (run: (store: string) => Promise<void>): Promise<void> => {
  const dir = mkdtempSync(join(tmpdir(), "k13-skel-"));
  try {
    await run(join(dir, "s"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("a factory opens an empty store, reports nothing parked, closes cleanly, and reopens the same store", () => withDir(async (store) => {
  const f = await openFactory({ store });
  await f.ready;
  assert.equal(f.reports.length, 0);
  const i = await f.inspect();
  assert.deepEqual(i.store, { libraryVersion: "1.4.0", contract: 1 });
  await f.close();
  const g = await openFactory({ store });
  await g.ready;
  assert.equal(g.reports.length, 0);
  await g.close();
}));

test("a second openFactory on an owned store throws StoreOwned, and the first owner is unharmed", () => withDir(async (store) => {
  const f = await openFactory({ store });
  await assert.rejects(openFactory({ store }), (e: unknown) => {
    assert.ok(e instanceof StoreOwned);
    assert.equal(e.pid, process.pid);
    assert.match(e.message, new RegExp(store.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    return true;
  });
  await f.ready;
  assert.equal((await f.inspect()).store.libraryVersion, "1.4.0");
  await f.close();
  await (await openFactory({ store })).close(); // closing released the lock
}));

test("the child owner starts, runs an empty script, and is killed and restarted by the harness", async () => {
  const ts = makeStore();
  try {
    const first = await runOwner(ts, { script: [] });
    assert.equal(first.code, 0);
    assert.deepEqual(first.results, [{ reports: 0 }]);
    const live = await startOwner(ts);
    assert.ok(live.pid > 0);
    const died = await killNow(live);
    assert.equal(died.signal, "SIGKILL");
    const again = await runOwner(ts, { script: [{ op: "inspect" }] });
    assert.equal((again.results[0] as { store: { libraryVersion: string } }).store.libraryVersion, "1.4.0");
  } finally {
    ts.cleanup();
  }
});

test("a hook at the start (recover.start) can end the process: a kill during recovery is observable", async () => {
  const ts = makeStore();
  try {
    await runOwner(ts, { script: [] });
    const dying = await runOwner(ts, { script: [], killAt: "recover.start", expectDeath: true });
    assert.equal(dying.signal, "SIGKILL");
    assert.deepEqual(ts.killed(), ["recover.start"]);
  } finally {
    ts.cleanup();
  }
});

// ── FR-047: the store-version guard ────────────────────────────────────────────────────────────────────────────────────────
test("checkStoreVersion (pure): equal passes; ANY difference refuses, a patch included; nothing recorded refuses too", () => {
  checkStoreVersion("s", "1.4.0", "1.4.0");
  for (const [rec, inst] of [["1.4.0", "1.4.1"], ["1.4.0", "9.9.9"], ["1.4.0", "1.4.0-beta"], [undefined, "1.4.0"], [null, "1.4.0"]] as const) {
    assert.throws(() => checkStoreVersion("s", rec, inst), (e: unknown) => {
      assert.ok(e instanceof StoreVersionMismatch);
      assert.equal(e.installed, inst);
      assert.equal(e.recorded, rec ?? "(none recorded)");
      return true;
    }, `${String(rec)} vs ${inst}`);
  }
});

test("a store reopened under another library version is refused BEFORE any task resumes, names both versions, and is left unchanged", () => withDir(async (store) => {
  let ran = 0;
  const Probe = defineKilnTask<{ n: number }, { phase: "go" }, { n: number }>({
    name: "kiln.probe", version: 1, initial: () => ({ phase: "go" }),
    phases: { go: async (t, run) => { ran++; await run.commit(() => ({ status: "terminal", outcome: { status: "completed", result: { n: t.input.n } } })); } },
    abort: async (_t, run) => { await run.commit(() => ({ status: "terminal", outcome: { status: "aborted" } })); },
  });
  // create the store and a PENDING task in it, but never resume: the task stays `pending` in the file
  const s = await openStore({ dir: store, kinds: [Probe] });
  await s.commit((tx) => tx.createTask("kiln.probe", { n: 1 }, { kind: "factory" }));
  await s.close();
  const before = await inspectStore(store);
  assert.equal(before.tasks.length, 1);
  assert.equal(before.tasks[0].status, "pending");

  await assert.rejects(openStore({ dir: store, kinds: [Probe], installedLibraryVersion: "9.9.9" }), (e: unknown) => {
    assert.ok(e instanceof StoreVersionMismatch);
    assert.equal(e.recorded, "1.4.0");
    assert.equal(e.installed, "9.9.9");
    assert.ok(e.message.includes("1.4.0") && e.message.includes("9.9.9"), e.message);
    return true;
  });
  // the same through the factory (a different entry point to the same guard)
  await assert.rejects(openFactory({ store, tasks: [Probe], installedLibraryVersion: "9.9.9" }), StoreVersionMismatch);
  assert.equal(ran, 0, "no task may resume under a mismatched library");
  const after = await inspectStore(store);
  assert.deepEqual(after, before, "the store is unchanged by a refused open");
  // the failed factory open must have released its lock: the real version opens, and now the task runs
  const ok = await openStore({ dir: store, kinds: [Probe] });
  ok.resume();
  for (let i = 0; i < 50 && ran === 0; i++) await new Promise((r) => setTimeout(r, 20));
  assert.equal(ran, 1);
  await ok.close();
}));

test("the diagnosing reader reports the recorded version of a store without comparing it", () => withDir(async (store) => {
  await (await openFactory({ store })).close();
  assert.equal((await inspectStore(store)).store.libraryVersion, "1.4.0");
}));
