// r15 T034 (FR-002, SC-001): two clients issue commands at the same moment; the record is still one writer's gap-free order, and each command's event has its own key as cause.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory } from "#durable/factory.ts";
import { checkRecordInvariants } from "../proof/support/record-oracle.ts";

test("400 commands from two clients at once: seq is gap-free, no duplicates, every command has exactly one event keyed to it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "k15-conc-"));
  const store = join(dir, "s");
  const f = await openFactory({ store });
  try {
    await f.ready;
    const client = (name: string) => Promise.all(Array.from({ length: 200 }, (_, i) => f.commands.run(`${name}-${i}`, "test.command", { name, i } as never, async () => ({ n: i }))));
    const [a, b] = await Promise.all([client("a"), client("b")]);
    assert.ok([...a, ...b].every((r) => r.status === "applied"));
    const events = (await f.inspect()).outbox.filter((e) => e.type === "command.accepted");
    assert.equal(events.length, 400);
    assert.equal(new Set(events.map((e) => e.seq)).size, 400, "no two events share a sequence number");
    assert.deepEqual([...events.map((e) => e.cause)].sort(), [...Array.from({ length: 200 }, (_, i) => `a-${i}`), ...Array.from({ length: 200 }, (_, i) => `b-${i}`)].sort(), "each command's event is caused by its own key");
    assert.deepEqual(events.map((e) => e.seq), [...events.map((e) => e.seq)].sort((x, y) => x - y), "committed order is sequence order");
    await f.close();
    assert.deepEqual(await checkRecordInvariants(store), []);
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
});
