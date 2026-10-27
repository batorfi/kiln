// A move holds exactly three fields — kind, decidedBy, briefRef. A field a caller adds is neither stored nor part of what makes a retry "the same move".
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { briefRef } from "#durable/canonical.ts";
import { openFactory } from "#durable/factory.ts";

test("extra fields on a move are not stored, and a retry that differs only in them is a repeat", async () => {
  const dir = mkdtempSync(join(tmpdir(), "k13shape-"));
  const f = await openFactory({ store: join(dir, "s") });
  try {
    await f.ready;
    const brief = { title: "Roadmap" };
    const gateId = "gate:demo:gate0:1";
    const opened = await f.gates.open("o1", { gateId, gateKey: "gate0", flow: "v2", brief, openedBy: "factory" });
    assert.equal(opened.status, "opened");
    const base = { kind: "approve", decidedBy: "person@example", briefRef: briefRef(brief) } as const;
    const first = await f.gates.submit(gateId, "m1", { ...base, note: "extra", nested: { a: 1 } } as never);
    assert.equal(first.status, "committed");
    assert.deepEqual((first as { record: { move: object } }).record.move, base, "only the three fields are stored");
    const again = await f.gates.submit(gateId, "m1", { ...base, note: "different" } as never);
    assert.equal(again.status, "repeat");
    const state = await f.gates.state(gateId);
    assert.deepEqual(state.state === "settled" ? state.record.move : null, base);
  } finally {
    await f.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
