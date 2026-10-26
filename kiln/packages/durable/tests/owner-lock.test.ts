// r13 T018 — the owner lock (research R5): exactly one owner per store, a stale lock taken over atomically, another host's lock never taken, and a clean close leaves nothing behind.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireLock, lockPath } from "#durable/owner-lock.ts";
import { StoreOwned } from "#durable/types.ts";

function withStore(run: (store: string) => Promise<void> | void): Promise<void> | void {
  const dir = mkdtempSync(join(tmpdir(), "k13-lock-"));
  const done = () => rmSync(dir, { recursive: true, force: true });
  try {
    const r = run(join(dir, "s"));
    return r instanceof Promise ? r.finally(done) : done();
  } catch (e) {
    done();
    throw e;
  }
}

test("a fresh store: the lock is created with its full content, and release removes it", () => withStore(async (store) => {
  const lock = await acquireLock(store, "/tmp/x.sock", { host: "h1" });
  const onDisk = JSON.parse(readFileSync(lockPath(store), "utf8"));
  assert.deepEqual(onDisk, lock.info);
  assert.equal(onDisk.pid, process.pid);
  assert.equal(onDisk.host, "h1");
  assert.equal(onDisk.socket, "/tmp/x.sock");
  lock.release();
  assert.equal(existsSync(lockPath(store)), false);
  lock.release(); // idempotent
}));

test("a live owner on this host is refused, and the message names the store, pid, host and socket", () => withStore(async (store) => {
  const first = await acquireLock(store, "/tmp/first.sock", { host: "h1" });
  await assert.rejects(acquireLock(store, "/tmp/second.sock", { host: "h1" }), (e: unknown) => {
    assert.ok(e instanceof StoreOwned);
    assert.equal(e.pid, process.pid);
    assert.equal(e.host, "h1");
    assert.equal(e.socket, "/tmp/first.sock");
    for (const part of [store, String(process.pid), "h1", "/tmp/first.sock"]) assert.ok(e.message.includes(part), `message lacks ${part}: ${e.message}`);
    return true;
  });
  assert.equal(JSON.parse(readFileSync(lockPath(store), "utf8")).socket, "/tmp/first.sock", "the first owner's lock is untouched");
  first.release();
}));

test("a lock whose owner is dead is stale: taken over on the first attempt", () => withStore(async (store) => {
  const old = await acquireLock(store, "/tmp/old.sock", { host: "h1" });
  const taken = await acquireLock(store, "/tmp/new.sock", { host: "h1", pidAlive: () => false });
  assert.equal(JSON.parse(readFileSync(lockPath(store), "utf8")).socket, "/tmp/new.sock");
  old.release(); // the old holder's release must NOT remove the new owner's lock
  assert.equal(existsSync(lockPath(store)), true);
  taken.release();
  assert.equal(existsSync(lockPath(store)), false);
}));

test("a live pid whose channel does NOT answer is stale too (the probe); one that answers is not", () => withStore(async (store) => {
  const first = await acquireLock(store, "/tmp/a.sock", { host: "h1" });
  await assert.rejects(acquireLock(store, "/tmp/b.sock", { host: "h1", probe: async () => true }), StoreOwned);
  const second = await acquireLock(store, "/tmp/b.sock", { host: "h1", probe: async () => false });
  assert.equal(JSON.parse(readFileSync(lockPath(store), "utf8")).socket, "/tmp/b.sock");
  first.release();
  second.release();
}));

test("a lock from ANOTHER host is never taken — even if its pid looks dead", () => withStore(async (store) => {
  const foreign = await acquireLock(store, "/tmp/f.sock", { host: "other-host" });
  await assert.rejects(acquireLock(store, "/tmp/me.sock", { host: "this-host", pidAlive: () => false }), (e: unknown) => {
    assert.ok(e instanceof StoreOwned);
    assert.equal(e.host, "other-host");
    assert.match(e.message, /other-host/);
    return true;
  });
  assert.equal(JSON.parse(readFileSync(lockPath(store), "utf8")).host, "other-host");
  foreign.release();
}));

test("a torn or garbage lock file is stale by definition", () => withStore(async (store) => {
  const first = await acquireLock(store, "/tmp/a.sock", { host: "h1" });
  first.release();
  writeFileSync(lockPath(store), "{ not json");
  const lock = await acquireLock(store, "/tmp/b.sock", { host: "h1" });
  assert.equal(JSON.parse(readFileSync(lockPath(store), "utf8")).socket, "/tmp/b.sock");
  lock.release();
}));

test("no temporary or tombstone file is left behind by any of the above", () => withStore(async (store) => {
  const a = await acquireLock(store, "/tmp/a.sock", { host: "h1" });
  const b = await acquireLock(store, "/tmp/b.sock", { host: "h1", pidAlive: () => false });
  await assert.rejects(acquireLock(store, "/tmp/c.sock", { host: "h1" }), StoreOwned);
  a.release();
  b.release();
  assert.deepEqual(readdirSync(store).filter((f) => f.startsWith("owner.lock")), []);
}));
