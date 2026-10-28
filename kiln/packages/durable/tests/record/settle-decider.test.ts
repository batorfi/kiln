// FR-014 end to end through a real gate: nothing settles a gate without a decider, and an event that would claim otherwise cannot be written.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory } from "#durable/factory.ts";
import { briefRef } from "#durable/canonical.ts";
import type { Refusal } from "#durable/types.ts";

const BRIEF = { kind: "demo" };
test("a move with no decider, or one outside the actor grammar, is refused by name; no move record, no move.committed, the gate keeps waiting; a conforming decider settles it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "k15-settle-"));
  const f = await openFactory({ store: join(dir, "s") });
  try {
    await f.ready;
    const o = await f.gates.open("o1", { gateId: "gate:demo:gate0:1", gateKey: "gate0", flow: "v2", brief: BRIEF as never, openedBy: "factory" });
    assert.equal(o.status, "opened");
    const ref = briefRef(BRIEF as never);
    for (const decidedBy of ["", "   ", "nobody", "p"]) {
      const r = await f.gates.submit("gate:demo:gate0:1", `m-${decidedBy.length}`, { kind: "approve", decidedBy, briefRef: ref });
      assert.equal((r as Refusal).reason, "invalid-move", JSON.stringify(decidedBy));
    }
    assert.deepEqual(await f.gates.state("gate:demo:gate0:1"), { state: "waiting" });
    assert.ok(!(await f.inspect()).outbox.some((e) => e.type === "move.committed" || e.type === "gate.settled"));
    const ok = await f.gates.submit("gate:demo:gate0:1", "m-ok", { kind: "approve", decidedBy: "human@batorfi", briefRef: ref, admit: {} });
    assert.equal(ok.status, "committed");
    await f.walks.state("demo"); // let the gate task settle
    for (let i = 0; i < 100 && !(await f.inspect()).outbox.some((e) => e.type === "gate.settled"); i++) await new Promise((r) => setTimeout(r, 20));
    const events = (await f.inspect()).outbox;
    const settled = events.find((e) => e.type === "gate.settled")!;
    assert.deepEqual(settled.data, { key: "m-ok", move: "approve", decidedBy: "human@batorfi" }, "the settlement names the move and the person, from the stored record");
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
});
