// r14 T065 (US5b, DEFAULT tier): the owner is killed at each of the three points of a withdrawal while a gate is open. After the restart the gate is EITHER still waiting with no feature move recorded, OR withdrawn with
// exactly one record — never between — the oracle's I10 is clean, and a caller who did not get the answer retries the SAME key safely and gets the one outcome. The walk then goes back and finishes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { connect, type ChannelClient } from "#durable/channel/client.ts";
import { channelSocketPath } from "#durable/channel/path.ts";
import { inspectStore } from "#durable/inspect.ts";
import { checkInvariants } from "./support/oracle.ts";
import { checkWalkInvariants } from "./support/walk-oracle.ts";
import { killNow, makeStore, startOwner, type OwnerRun } from "./support/harness.ts";
import { DECIDER } from "./support/walk-harness.ts";
import { PLAIN } from "./support/walk-judge.ts";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

for (const [point, expectWithdrawnBeforeRetry] of [["walk.withdraw-received", false], ["walk.withdraw-after-write", false], ["walk.withdraw-committed", true]] as const) {
  test(`killed at ${point}: the gate is ${expectWithdrawnBeforeRetry ? "withdrawn once" : "still waiting with nothing recorded"} after the restart, the SAME key then gives the one outcome, and the walk finishes`, { timeout: 120_000 }, async () => {
    const ts = makeStore();
    try {
      const sock = channelSocketPath(ts.store);
      let owner: OwnerRun = await startOwner(ts, { serve: true, killAt: point });
      const withClient = async <T>(fn: (c: ChannelClient) => Promise<T>): Promise<T> => {
        for (let attempt = 0; ; attempt++) {
          let c: ChannelClient | undefined;
          try {
            c = await connect(sock, { timeoutMs: 4000 });
            return await fn(c);
          } catch (e) {
            if (attempt > 300) throw e;
            await sleep(30);
          } finally {
            c?.close();
          }
        }
      };
      const restart = async (): Promise<void> => {
        await owner.exited;
        owner = await startOwner(ts, { serve: true });
        await withClient(async (c) => { for (let i = 0; i < 400 && !(await c.ready()); i++) await sleep(25); });
      };

      await withClient((c) => c.admit("a1", "f1", PLAIN));
      // walk to Specification
      let after: string | undefined;
      let gate;
      for (;;) {
        const v = await withClient((c) => c.featureNext("f1", after));
        gate = v.openGate!;
        if (gate.gateKey === "3-spec") break;
        const r = await withClient((c) => c.submit(gate.gateId, `m:${gate.gateId}`, { kind: "approve", decidedBy: DECIDER, briefRef: gate.briefRef, ...(gate.gateKey === "gate0" ? { admit: {} } : {}) }));
        assert.equal(r.status, "committed");
        after = gate.gateId;
      }

      // the feature-level move: the owner dies at the armed point
      const move = { kind: "reject" as const, decidedBy: DECIDER, target: "1-concept" as const, note: "back to the concept" };
      const first = await withClient((c) => c.featureMove("f1", "fm1", move));
      assert.ok(first.status === "refused" && first.reason === "store-error", `the caller does not get an answer: ${JSON.stringify(first)}`);
      await restart();

      const wreck = await inspectStore(ts.store, gate.gateId);
      assert.deepEqual(checkInvariants(wreck), [], "the wreck is whole (I1–I10)");
      if (expectWithdrawnBeforeRetry) {
        assert.equal(wreck.gate, "withdrawn");
        assert.equal(wreck.outbox.filter((e) => e.type === "gate.withdrawn").length, 1);
      } else {
        assert.equal(wreck.gate, "waiting", "nothing was recorded");
        assert.equal(wreck.outbox.filter((e) => e.type === "gate.withdrawn").length, 0);
        assert.equal(wreck.withdrawal, null);
      }

      // the caller did not know: it retries the SAME key and gets the one outcome
      const again = await withClient((c) => c.featureMove("f1", "fm1", move));
      assert.ok(again.status === (expectWithdrawnBeforeRetry ? "repeat" : "committed"), `retry: ${JSON.stringify(again)}`);
      assert.equal((await withClient((c) => c.featureMove("f1", "fm1", move))).status, "repeat");

      const back = await withClient((c) => c.featureNext("f1", gate.gateId));
      assert.deepEqual([back.openGate!.gateKey, back.openGate!.round], ["1-concept", 2]);
      // finish the walk
      after = back.openGate!.gateId;
      let g2 = back.openGate!;
      for (;;) {
        const r = await withClient((c) => c.submit(g2.gateId, `m2:${g2.gateId}`, { kind: "approve", decidedBy: DECIDER, briefRef: g2.briefRef }));
        assert.equal(r.status, "committed");
        const v = await withClient((c) => c.featureNext("f1", g2.gateId));
        if (!v.openGate) { assert.equal(v.status, "done"); break; }
        g2 = v.openGate;
      }
      await killNow(owner);
      const i = await inspectStore(ts.store, gate.gateId);
      assert.equal(i.gate, "withdrawn");
      assert.deepEqual(checkInvariants(i), []);
      assert.equal(i.outbox.filter((e) => e.type === "gate.withdrawn").length, 1, "withdrawn exactly once");
      const all = await inspectStore(ts.store);
      assert.deepEqual(checkWalkInvariants(all, { feature: "f1", facts: PLAIN.facts }), []);
      assert.deepEqual(all.tasks.filter((t) => t.status !== "terminal"), [], "nothing left waiting or parked");
    } finally {
      ts.cleanup();
    }
  });
}
