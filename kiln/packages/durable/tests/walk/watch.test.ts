// r14 T035: the notifier behind `feature next --after`. It holds NO timer, it is never the source of truth (the answer is re-read from the store), a stale `after` answers at once, and an owner that
// closes releases every waiter with an error.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Watch } from "#durable/walk/watch.ts";
import { INTERFACE, withFactory } from "./support.ts";

test("Watch: a waiter settles on notify; disarm and close leave nothing behind", async () => {
  const w = new Watch();
  const a = w.arm("f");
  assert.equal(w.size, 1);
  w.notify("other");
  assert.equal(w.size, 1, "another feature's change does not wake it");
  w.notify("f");
  await a.promise;
  assert.equal(w.size, 0);
  const b = w.arm("f");
  b.disarm();
  assert.equal(w.size, 0);
  const c = w.arm("f");
  w.close();
  await assert.rejects(c.promise, /the owner is closing/);
  await assert.rejects(w.arm("f").promise, /closing/, "arming after close is refused too");
});

test("feature next: with a stale `after` it answers at once; with the current gate it waits for an event and wakes when the next gate opens; no timer is held", () => withFactory(async (f) => {
  await f.walks.admit("k1", "f", INTERFACE);
  const first = await f.walks.next("f");
  assert.equal(first.openGate?.gateKey, "gate0");
  const stale = await f.walks.next("f", "gate:f:gate0:0");
  assert.equal(stale.openGate?.gateId, "gate:f:gate0:1", "a different `after` is answered immediately");

  let woke = false;
  const waiting = f.walks.next("f", first.openGate!.gateId).then((v) => ((woke = true), v));
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(woke, false, "nothing changed: the request is still waiting");
  const i = await f.inspect();
  assert.deepEqual(i.timers, [], "no timer on any gate or decision");

  const g = first.openGate!;
  const m = await f.gates.submit(g.gateId, "m1", { kind: "approve", decidedBy: "script:r14", briefRef: g.briefRef, admit: {} });
  assert.equal(m.status, "committed");
  const v = await waiting;
  assert.equal(v.openGate?.gateKey, "1-concept", "the next gate opened and the waiter woke");
}));

test("closing the owner releases a waiting `next` with an error (the client sees a lost connection and retries)", async () => {
  let pending!: Promise<unknown>;
  await withFactory(async (f) => {
    await f.walks.admit("k1", "f", INTERFACE);
    const first = await f.walks.next("f");
    pending = f.walks.next("f", first.openGate!.gateId);
    pending.catch(() => {});
    await new Promise((r) => setTimeout(r, 50));
  });
  await assert.rejects(pending, /the owner is closing/);
});
