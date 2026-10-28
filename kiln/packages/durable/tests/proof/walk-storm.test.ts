// r14 T054 (US3, DEFAULT tier): a restart storm on a WALK gate. The owner is killed and restarted seven times in a row — more than the library's crash-loop limit of five — with nobody having decided: the
// admission gate is still the same open gate, still waiting, never parked or blocked, nothing has advanced; and then the next valid move commits and the walk goes on to its next gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { connect } from "#durable/channel/client.ts";
import { channelSocketPath } from "#durable/channel/path.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { killNow, makeStore, startOwner, type OwnerRun } from "./support/harness.ts";
import { DECIDER } from "./support/walk-harness.ts";
import { INTERFACE } from "./support/walk-judge.ts";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

test("seven kills in a row with no move: the same gate stays open and waiting, nothing is parked, and the next valid move commits", { timeout: 120_000 }, async () => {
  const ts = makeStore();
  try {
    const sock = channelSocketPath(ts.store);
    let owner: OwnerRun = await startOwner(ts, { serve: true });
    const withClient = async <T>(fn: (c: Awaited<ReturnType<typeof connect>>) => Promise<T>): Promise<T> => {
      for (let attempt = 0; ; attempt++) {
        try {
          const c = await connect(sock, { timeoutMs: 3000 });
          try {
            return await fn(c);
          } finally {
            c.close();
          }
        } catch (e) {
          if (attempt > 200) throw e;
          await sleep(30);
        }
      }
    };
    const ready = async (): Promise<void> => void (await withClient(async (c) => { for (let i = 0; i < 400 && !(await c.ready()); i++) await sleep(25); }));
    await ready();
    assert.equal((await withClient((c) => c.admit("admit:f1", "f1", INTERFACE))).status, "created");
    const first = await withClient((c) => c.featureNext("f1"));
    const gate = first.openGate!;
    assert.equal(gate.gateKey, "gate0");

    for (let k = 1; k <= 7; k++) {
      await killNow(owner);
      owner = await startOwner(ts, { serve: true });
      await ready();
      const v = await withClient((c) => c.featureNext("f1"));
      assert.equal(v.openGate?.gateId, gate.gateId, `after kill ${k} the same gate is open`);
      assert.equal(v.status, "admitting", "nothing advanced");
      const i = await inspectStore(ts.store, gate.gateId);
      assert.equal(i.gate, "waiting", `kill ${k}: waiting`);
      assert.deepEqual(i.records, []);
      assert.deepEqual(checkInvariants(i), [], `kill ${k}: invariants`);
      assert.deepEqual(i.timers, []);
      assert.deepEqual(i.tasks.filter((t) => t.status === "terminal"), [], "no task ended: a restart settles nothing");
    }

    const moved = await withClient((c) => c.submit(gate.gateId, "m1", { kind: "approve", decidedBy: DECIDER, briefRef: gate.briefRef, admit: {} }));
    assert.equal(moved.status, "committed");
    const next = await withClient((c) => c.featureNext("f1", gate.gateId));
    assert.equal(next.openGate?.gateKey, "1-concept", "the walk went on after the storm");
  } finally {
    ts.cleanup();
  }
});
