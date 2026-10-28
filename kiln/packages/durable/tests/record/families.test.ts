import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "#durable/library/open.ts";
import { DOC_NAMES } from "#durable/store.ts";

test("the record's document families exist and round-trip a value", async () => {
  const dir = mkdtempSync(join(tmpdir(), "k15-fam-"));
  const store = await openStore({ dir, kinds: [] });
  try {
    for (const name of ["kiln.event", "kiln.record", "kiln.cursor", "kiln.projection", "kiln.archive"] as const) {
      assert.ok(DOC_NAMES.includes(name), name);
      await store.commit(async (tx) => {
        const d = await tx.doc<{ v?: number }>(name, "k", {});
        d.v = 42;
      });
      assert.equal((await store.snapshot<{ v: number }>(name, "k"))?.v, 42, name);
    }
    assert.equal(new Set(DOC_NAMES).size, DOC_NAMES.length);
  } finally {
    await store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
