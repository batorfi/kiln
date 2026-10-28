// r14 T027 (US1): an interface feature walks the Roadmap gate and all eleven feature gates, in the flow's order, each settled by exactly one move — driven here in-process; the CLI proof is feature-cli.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInvariants } from "../proof/support/oracle.ts";
import { drive, INTERFACE, rowOf, withFactory, DECIDER } from "./support.ts";

const ORDER = ["gate0", "1-concept", "2-architecture", "2a-experience", "3-spec", "4-plan", "5-checkpoint", "6-review", "6a-ui-review", "7-verification", "8-docs", "9-pr"];

test("an interface feature walks 12 gates in the flow's order, each by one committed move, and the row ends merged", () => withFactory(async (f) => {
  const t0 = performance.now();
  const admitted = await f.walks.admit("k1", "f-ui", INTERFACE);
  assert.equal(admitted.status, "created");
  const d = await drive(f, "f-ui");
  assert.deepEqual(d.steps.map((s) => s.gateKey), ORDER);
  assert.ok(d.steps.every((s) => s.outcome.status === "committed" && s.round === 1), "one move per gate, all first rounds");
  assert.equal(d.last.status, "done");
  assert.equal(d.last.openGate, null, "nothing opens after Merge");

  const row = await rowOf(f);
  // the row's terminal step may land a moment after the last gate's outcome converged; the walk view above already waited for `done`
  assert.equal(row?.status, "terminal");
  assert.deepEqual(row?.outcome, { status: "completed", result: { outcome: "merged", approved: ORDER.slice(1) } });

  const i = await f.inspect();
  const types = i.outbox.map((e) => e.type);
  assert.equal(types.filter((t) => t === "gate.opened").length, 12);
  assert.equal(types.filter((t) => t === "move.committed").length, 12);
  assert.equal(types.filter((t) => t === "gate.settled").length, 12);
  const walkTypes = types.filter((t) => t.startsWith("walk."));
  assert.deepEqual([walkTypes[0], walkTypes.at(-1)], ["walk.admitted", "walk.completed"]);
  assert.ok(i.outbox.every((e) => e.actor && e.cause), "every entry names an actor and a cause");
  assert.ok(i.outbox.filter((e) => e.type === "move.committed").every((e) => e.actor === DECIDER));
  assert.equal(types.filter((t) => t === "gate.not-applicable").length, 0, "an interface feature has both interface gates");
  for (const g of d.steps) assert.deepEqual(checkInvariants(await f.inspect(g.gateId)), [], g.gateId);
  assert.ok(performance.now() - t0 < 3000 * 3, "the 12-gate in-process walk is quick (scripted steps, stepMs 0)");
}));

test("a second walk of the same input on a second store has an identical outcome list", async () => {
  const run = async (): Promise<string[]> => {
    let out: string[] = [];
    await withFactory(async (f) => {
      await f.walks.admit("k1", "f-ui", INTERFACE);
      const d = await drive(f, "f-ui");
      out = d.steps.map((s) => `${s.gateKey}:${s.round}:${s.kind}:${s.outcome.status}`);
      const v = await f.walks.state("f-ui");
      out.push(...v.history.map((h) => `${h.type}|${h.actor}|${h.cause}`));
    });
    return out;
  };
  const a = await run();
  const b = await run();
  assert.ok(a.length > 40);
  assert.deepEqual(a, b);
});
