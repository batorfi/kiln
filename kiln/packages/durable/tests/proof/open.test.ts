// r13 T031 — a gate opens WHOLE or not at all (spec US3, I3): the owner is killed (SIGKILL, no cleanup) at each named step of opening; a fresh reader with no owner finds the gate
// absent or complete (document + brief + gate.opened entry), a restarted owner agrees, and opening again with the same key yields exactly one gate and one entry.
// A point that never fires fails by name — never vacuous.
import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectStore } from "#durable/inspect.ts";
import { openReader } from "#durable/library/open.ts";
import { checkInvariants, checkStability } from "./support/oracle.ts";
import { makeStore, runOwner } from "./support/harness.ts";

const GATE = "gate:demo:gate0:1";
const SPEC = { gateId: GATE, gateKey: "gate0", flow: "v2", brief: { title: "Roadmap" }, openedBy: "factory" };
const OPEN = { op: "open", key: "o1", spec: SPEC };

// where the commit stands when the process dies: before it (nothing stored) or after it (everything stored)
const POINTS: [string, "absent" | "whole"][] = [
  ["open.begin", "absent"],
  ["open.after-write", "absent"], // the writes are made inside the commit callback; the commit has not returned — nothing is stored
  ["open.committed", "whole"],
];

for (const [point, expected] of POINTS) {
  test(`killed at ${point}: the gate is ${expected} — never partial — and opening again with the same key yields one gate and one gate.opened`, async () => {
    const ts = makeStore();
    try {
      const dying = await runOwner(ts, { script: [OPEN], killAt: point, expectDeath: true });
      assert.equal(dying.signal, "SIGKILL", `the owner must die by SIGKILL at ${point}; code ${dying.code}\n${dying.stdout()}${dying.stderr()}`);
      assert.deepEqual(ts.killed(), [point], `the kill point ${point} must have FIRED`);

      const wreck = await inspectStore(ts.store, GATE);
      assert.deepEqual(checkInvariants(wreck), [], `the wreckage: ${JSON.stringify(wreck.documents)}`);
      if (expected === "absent") {
        assert.equal(wreck.gate, "absent");
        assert.deepEqual(wreck.documents, { gate: false, brief: false, opened: false, moveCommitted: false, gateSettled: false });
        assert.equal(wreck.outbox.length, 0);
        assert.equal(wreck.tasks.filter((t) => t.kind === "kiln.gate").length, 0, "no gate task without its gate");
      } else {
        assert.equal(wreck.gate, "waiting");
        assert.deepEqual(wreck.documents, { gate: true, brief: true, opened: true, moveCommitted: false, gateSettled: false });
        assert.equal(wreck.outbox.filter((e) => e.type === "gate.opened").length, 1);
      }

      // a clean restart, with the SAME key
      const again = await runOwner(ts, { script: [OPEN, { op: "state", gate: GATE }, { op: "inspect", gate: GATE }] });
      const [opened, state, after] = again.results as [{ status: string }, { state: string }, Awaited<ReturnType<typeof inspectStore>>];
      assert.equal(opened.status, expected === "whole" ? "repeat" : "opened");
      assert.equal(state.state, "waiting");
      assert.equal(after.outbox.filter((e) => e.type === "gate.opened").length, 1, "exactly one gate.opened");
      assert.equal(after.tasks.filter((t) => t.kind === "kiln.gate").length, 1, "exactly one gate task");
      assert.deepEqual(checkInvariants(after), []);
      const final = await inspectStore(ts.store, GATE);
      assert.deepEqual(checkStability(after, final), []);
    } finally {
      ts.cleanup();
    }
  });
}

test("the gate that survived a kill is settled by a move that names the brief it was opened with, and the stored brief hashes to that reference", async () => {
  const ts = makeStore();
  try {
    await runOwner(ts, { script: [OPEN], killAt: "open.committed", expectDeath: true });
    const { briefRef } = await import("#durable/canonical.ts");
    const REF = briefRef(SPEC.brief);
    const run = await runOwner(ts, { script: [OPEN, { op: "submit", gate: GATE, key: "m1", move: { kind: "approve", decidedBy: "person@example", briefRef: REF } }] });
    const [opened, committed] = run.results as [{ status: string; gate: { briefRef: string } }, { status: string; record: { move: { briefRef: string } } }];
    assert.equal(opened.status, "repeat");
    assert.equal(opened.gate.briefRef, REF);
    assert.equal(committed.status, "committed");
    assert.equal(committed.record.move.briefRef, REF, "the move names the brief as seen");
    const reader = await openReader(ts.store);
    try {
      const stored = await reader.snapshot<{ briefRef: string; content: unknown }>("kiln.brief", GATE);
      assert.equal(stored?.briefRef, REF);
      assert.equal(briefRef(stored?.content as never), REF, "the stored brief hashes to the reference: it is what was shown, unchanged since opening");
    } finally {
      await reader.close();
    }
    const i = await inspectStore(ts.store, GATE);
    assert.equal(i.documents.moveCommitted, true);
    assert.deepEqual(checkInvariants(i), []);
  } finally {
    ts.cleanup();
  }
});
