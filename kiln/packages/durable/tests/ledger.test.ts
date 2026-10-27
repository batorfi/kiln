// r13 T025 — the command ledger (CORE-5, research R4): the effect and the ledger entry are ONE commit; a repeat returns the stored outcome without running the effect again; the same key with
// another request is a conflict; a failed or refused effect leaves no trace (not even the ledger entry).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Refuse } from "#durable/commands.ts";
import { openFactory, type Factory } from "#durable/factory.ts";
import { refused } from "#durable/types.ts";

async function withFactory(run: (f: Factory) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), "k13-ledger-"));
  const f = await openFactory({ store: join(dir, "s") });
  try {
    await f.ready;
    await run(f);
  } finally {
    await f.close().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
}
const scratch = async (f: Factory, key: string) => (await f.inspect()).commands[key];

test("first apply runs the effect and writes the ledger entry in the same commit; an equal repeat returns the stored outcome and does NOT run the effect", () => withFactory(async (f) => {
  let runs = 0;
  const effect = async (tx: Parameters<Parameters<Factory["commands"]["run"]>[3]>[0]) => { runs++; const d = await tx.doc<{ n?: number }>("kiln.lane", "scratch", {}); d.n = 7; return { n: 7 }; };
  const a = await f.commands.run("c1", "test.cmd", { x: 1 }, effect);
  assert.deepEqual(a, { status: "applied", result: { n: 7 } });
  const b = await f.commands.run("c1", "test.cmd", { x: 1 }, effect);
  assert.deepEqual(b, { status: "repeat", result: { n: 7 } });
  assert.equal(runs, 1);
  assert.equal((await scratch(f, "c1")).length, 1);
}));

test("the same key with another request (or another kind) is key-conflict naming the key, and the effect does not run", () => withFactory(async (f) => {
  let runs = 0;
  const effect = async () => { runs++; return { ok: true }; };
  await f.commands.run("c1", "test.cmd", { x: 1 }, effect);
  assert.deepEqual(await f.commands.run("c1", "test.cmd", { x: 2 }, effect), refused("key-conflict", { original: "c1" }));
  assert.deepEqual(await f.commands.run("c1", "other.cmd", { x: 1 }, effect), refused("key-conflict", { original: "c1" }));
  assert.equal(runs, 1);
  assert.equal((await scratch(f, "c1")).length, 1, "one request hash, never two (I9)");
}));

test("key order in the request does not make a different request", () => withFactory(async (f) => {
  const effect = async () => ({ ok: 1 });
  await f.commands.run("c1", "k", { a: 1, b: { c: 2, d: 3 } }, effect);
  assert.equal((await f.commands.run("c1", "k", { b: { d: 3, c: 2 }, a: 1 }, effect)).status, "repeat");
}));

test("an effect that THROWS leaves no trace: not its writes, not the ledger entry — and the same key can be retried", () => withFactory(async (f) => {
  const bad = await f.commands.run("c1", "k", {}, async (tx) => { const d = await tx.doc<{ n?: number }>("kiln.lane", "scratch", {}); d.n = 1; throw new Error("boom"); });
  assert.equal(bad.status, "refused");
  assert.equal((bad as { reason: string }).reason, "store-error");
  assert.equal(await scratch(f, "c1"), undefined, "no ledger entry");
  assert.equal(await f.inspect().then((i) => i.commands.scratch), undefined);
  const ok = await f.commands.run("c1", "k", {}, async () => ({ fine: true }));
  assert.deepEqual(ok, { status: "applied", result: { fine: true } });
}));

test("an effect that REFUSES (Refuse) rolls back and returns that refusal as a value", () => withFactory(async (f) => {
  const r = await f.commands.run("c1", "k", {}, async (tx) => { const d = await tx.doc<{ n?: number }>("kiln.lane", "scratch", {}); d.n = 1; throw new Refuse(refused("unknown-gate")); });
  assert.deepEqual(r, refused("unknown-gate"));
  assert.equal(await scratch(f, "c1"), undefined);
}));

test("a bad key or a request that is not JSON is invalid-move and writes nothing", () => withFactory(async (f) => {
  const effect = async () => ({});
  for (const key of ["", "   ", "x".repeat(201)]) assert.equal((await f.commands.run(key, "k", {}, effect) as { reason: string }).reason, "invalid-move", JSON.stringify(key));
  assert.equal((await f.commands.run("c1", "k", { f: () => 1 } as never, effect) as { reason: string }).reason, "invalid-move");
  assert.equal(await scratch(f, "c1"), undefined);
}));
