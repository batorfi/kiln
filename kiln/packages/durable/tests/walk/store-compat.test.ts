// r14 T011: the new document family `kiln.walk` and the extended gate shape do not disturb a store r13 made. A store whose gate was opened and settled the r13 way (no `noteRequired`, no `returnsTo`,
// no `kiln.walk`) opens under the new owner, resumes, answers `state`, is read by a fresh reader — and a `kiln.walk` document can be created in it and read back by one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { briefRef } from "#durable/canonical.ts";
import { openFactory } from "#durable/factory.ts";
import { openReader } from "#durable/library/open.ts";
import { DOC_NAMES } from "#durable/store.ts";
import { checkInvariants } from "../proof/support/oracle.ts";

const GATE = "gate:old:gate0:1";
const BRIEF = { title: "an r13 brief" };

test("kiln.walk is a declared document family", () => {
  assert.ok(DOC_NAMES.includes("kiln.walk"));
  assert.equal(new Set(DOC_NAMES).size, DOC_NAMES.length);
});

test("a store made the r13 way reopens under the new owner, keeps its settled gate, and can hold a kiln.walk document", async () => {
  const dir = mkdtempSync(join(tmpdir(), "k14-compat-"));
  const store = join(dir, "s");
  try {
    let f = await openFactory({ store });
    await f.ready;
    const opened = await f.gates.open("o1", { gateId: GATE, gateKey: "gate0", flow: "v2", brief: BRIEF, openedBy: "factory" });
    assert.equal(opened.status, "opened");
    const moved = await f.gates.submit(GATE, "m1", { kind: "approve", decidedBy: "human@test", briefRef: briefRef(BRIEF) });
    assert.equal(moved.status, "committed");
    await f.close();

    f = await openFactory({ store });
    await f.ready;
    const state = await f.gates.state(GATE);
    assert.equal(state.state, "settled", "the settled gate survives the reopen");
    const created = await f.commands.run("w1", "walk.probe", { feature: "f" }, async (tx) => {
      const w = await tx.doc<{ feature?: string; status?: string }>("kiln.walk", "f", {});
      w.feature = "f";
      w.status = "admitting";
      return { ok: true };
    });
    assert.equal(created.status, "applied");
    const i = await f.inspect(GATE);
    assert.deepEqual(checkInvariants(i), [], "r13's invariants still hold on the reopened store");
    await f.close();

    const reader = await openReader(store);
    try {
      const w = await reader.snapshot<{ feature: string; status: string }>("kiln.walk", "f");
      assert.deepEqual(w && { feature: w.feature, status: w.status }, { feature: "f", status: "admitting" });
      assert.equal(await reader.snapshot("kiln.walk", "no-such-feature"), undefined, "a read never creates a document");
    } finally {
      await reader.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
