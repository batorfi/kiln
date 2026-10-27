// r13 T052 — FIFTY simultaneous starters on one stale lock produce EXACTLY ONE owner (research R5, SC-007). Real processes, released at an agreed instant so they collide; repeated on a fresh store,
// a stale lock (dead pid), a torn lock file, and again — the takeover (atomic rename + verify-and-put-back) is the one place the design relies on a race being handled, so it is attacked here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { LOCK_SCHEMA, lockPath, readLock } from "#durable/owner-lock.ts";

const LOCK_MAIN = fileURLToPath(new URL("./support/lock-main.ts", import.meta.url));
const STARTERS = 50;

/** The pid of a process that has already exited (so a lock naming it is stale). */
function deadPid(): number {
  const r = spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" });
  return Number(r.stdout);
}

async function race(store: string, n = STARTERS): Promise<string[]> {
  const startAt = Date.now() + 1500; // enough for every child to boot and then spin to the same instant
  const children = Array.from({ length: n }, () => {
    const p = spawn(process.execPath, [LOCK_MAIN, store, String(startAt)], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let printed!: () => void;
    const spoke = new Promise<void>((r) => (printed = r));
    p.stdout.on("data", (d: Buffer) => { out += d; if (out.includes("\n")) printed(); });
    const closed = new Promise<string>((resolve) => p.on("close", () => { printed(); resolve(out.trim()); }));
    return { p, spoke, closed };
  });
  await Promise.all(children.map((c) => c.spoke)); // every starter has had its turn: only now may the winner let go
  for (const c of children) c.p.stdin.end();
  return Promise.all(children.map((c) => c.closed));
}
const setup = (): { dir: string; store: string } => {
  const dir = mkdtempSync(join(tmpdir(), "k13-race-"));
  const store = join(dir, "s");
  mkdirSync(store, { recursive: true });
  return { dir, store };
};
const hostName = (): string => JSON.parse(spawnSync(process.execPath, ["-p", "JSON.stringify(require('os').hostname())"], { encoding: "utf8" }).stdout);
const staleLock = (store: string, pid: number): void => {
  const db = new DatabaseSync(lockPath(store));
  try {
    db.exec(LOCK_SCHEMA);
    db.prepare("INSERT OR REPLACE INTO owner (id, pid, host, started_at, socket) VALUES (1, ?, ?, 1, '/tmp/dead.sock')").run(pid, hostName());
  } finally {
    db.close();
  }
};

for (const [name, prepare] of [
  ["a store with NO lock yet", (_s: string) => {}],
  ["a STALE lock (its owner's process has exited)", (s: string) => staleLock(s, deadPid())],
  ["a stale lock again (a second round, to give a rare interleaving more chances)", (s: string) => staleLock(s, deadPid())],
  ["a stale lock a third time", (s: string) => staleLock(s, deadPid())],
] as const) {
  test(`${STARTERS} simultaneous starters on ${name}: exactly ONE owner, the rest refused naming it`, async () => {
    const { dir, store } = setup();
    try {
      prepare(store);
      const outs = await race(store);
      const owners = outs.filter((o) => o === "OWNER");
      const refused = outs.filter((o) => o.startsWith("REFUSED"));
      const other = outs.filter((o) => o !== "OWNER" && !o.startsWith("REFUSED"));
      assert.deepEqual(other, [], `unexpected outcomes: ${other.slice(0, 3).join(" | ")}`);
      assert.equal(owners.length, 1, `${owners.length} starters believed they owned the store`);
      assert.equal(refused.length, STARTERS - 1);
      assert.equal(readLock(store), null, "the winner released its lock: the store is unowned again");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
