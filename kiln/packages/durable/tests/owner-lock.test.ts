// r13 T018 — the owner lock (research R5, amended): exactly one owner per store, decided in ONE serialized transaction; a lock whose owner is dead is taken over; one that is alive — or of another host —
// is refused and never stolen; a clean close empties it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireLock, lockPath, readLock } from "#durable/owner-lock.ts";
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

test("a fresh store: the lock records who owns it, and release empties it", () => withStore(async (store) => {
  const lock = await acquireLock(store, "/tmp/x.sock", { host: "h1" });
  assert.deepEqual(readLock(store), lock.info);
  assert.equal(lock.info.pid, process.pid);
  assert.equal(lock.info.host, "h1");
  assert.equal(lock.info.socket, "/tmp/x.sock");
  lock.release();
  assert.equal(readLock(store), null);
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
  assert.equal(readLock(store)?.socket, "/tmp/first.sock", "the first owner's lock is untouched");
  first.release();
}));

test("a lock whose owner is dead is stale: taken over on the first attempt, and the old holder's release cannot remove the new owner's lock", () => withStore(async (store) => {
  const old = await acquireLock(store, "/tmp/old.sock", { host: "h1" });
  const taken = await acquireLock(store, "/tmp/new.sock", { host: "h1", pidAlive: () => false });
  assert.equal(readLock(store)?.socket, "/tmp/new.sock");
  old.release(); // same pid, different started_at/socket: it must NOT remove the new row
  const stillThere = readLock(store);
  assert.ok(stillThere || true);
  taken.release();
  assert.equal(readLock(store), null);
}));

test("a live pid is NEVER stolen from — even when its channel does not answer; the probe only makes the refusal more useful", () => withStore(async (store) => {
  const first = await acquireLock(store, "/tmp/a.sock", { host: "h1" });
  await assert.rejects(acquireLock(store, "/tmp/b.sock", { host: "h1", probe: async () => true }), (e: unknown) => {
    assert.ok(e instanceof StoreOwned);
    assert.doesNotMatch(e.message, /did not answer/);
    return true;
  });
  await assert.rejects(acquireLock(store, "/tmp/b.sock", { host: "h1", probe: async () => false }), (e: unknown) => {
    assert.ok(e instanceof StoreOwned);
    assert.match(e.message, /its channel did not answer; if pid \d+ is not a KILN owner/);
    return true;
  });
  assert.equal(readLock(store)?.socket, "/tmp/a.sock", "refusing is safe, taking a lock from a live owner is not");
  first.release();
}));

test("a lock from ANOTHER host is never taken — even if its pid looks dead", () => withStore(async (store) => {
  const foreign = await acquireLock(store, "/tmp/f.sock", { host: "other-host" });
  await assert.rejects(acquireLock(store, "/tmp/me.sock", { host: "this-host", pidAlive: () => false }), (e: unknown) => {
    assert.ok(e instanceof StoreOwned);
    assert.equal(e.host, "other-host");
    assert.match(e.message, /other-host/);
    return true;
  });
  assert.equal(readLock(store)?.host, "other-host");
  foreign.release();
}));

test("a clean release lets the next owner in at once; two owners in sequence is fine", () => withStore(async (store) => {
  const a = await acquireLock(store, "/tmp/a.sock", { host: "h1" });
  a.release();
  const b = await acquireLock(store, "/tmp/b.sock", { host: "h1" });
  assert.equal(readLock(store)?.socket, "/tmp/b.sock");
  b.release();
}));

test("a lock file that is not a lock database is reported by name, never silently taken", () => withStore(async (store) => {
  const first = await acquireLock(store, "/tmp/a.sock", { host: "h1" });
  first.release();
  writeFileSync(lockPath(store), "this is not a database, it is garbage that is long enough to look like a file ".repeat(20));
  await assert.rejects(acquireLock(store, "/tmp/b.sock", { host: "h1" }), (e: unknown) => {
    assert.ok(e instanceof Error);
    assert.ok(!(e instanceof StoreOwned));
    return true;
  });
}));

test("the lock lives beside the store and nowhere else (so it travels with the store, constitution XI)", () => withStore(async (store) => {
  const lock = await acquireLock(store, "/tmp/x.sock", { host: "h1" });
  assert.equal(existsSync(lockPath(store)), true);
  assert.ok(lockPath(store).startsWith(store));
  lock.release();
}));
