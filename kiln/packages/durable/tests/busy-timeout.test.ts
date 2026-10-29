// r15 (found by the floor matrix): Node 23.6.0 ignores DatabaseSync's `timeout` option, so a second connection that met the owner mid-commit failed at once with "database is locked" and could poison the
// owner's session. 23.x is therefore outside the supported range (`^22.19.0 || >=24.1.0`). This test is the floor's proof: on every supported Node the owner's connection and every reader's carry the wait the
// library asks for — and it fails by name on a Node that does not apply it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BUSY_TIMEOUT_MS, openReader, openStore } from "#durable/library/open.ts";

test(`the owner's connection and every reader's wait ${BUSY_TIMEOUT_MS} ms for a lock, on every supported Node`, async () => {
  const dir = mkdtempSync(join(tmpdir(), "k15-busy-"));
  try {
    const owner = await openStore({ dir, kinds: [] });
    const reader = await openReader(dir);
    assert.equal(await owner.busyTimeout(), BUSY_TIMEOUT_MS, `owner on Node ${process.versions.node}`);
    assert.equal(await reader.busyTimeout(), BUSY_TIMEOUT_MS, `reader on Node ${process.versions.node}`);
    await reader.close();
    await owner.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
