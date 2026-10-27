// One owner per store (FR-041, research R5, amended). Neither the database nor the library stops a second process from opening the store and taking its write lock, so the rule is KILN's: a tiny
// SEPARATE lock database beside the store (`owner.lock`, one row: who owns it). Deciding and claiming is ONE serialized transaction (`BEGIN IMMEDIATE`): the row is read, judged and — if free or stale —
// replaced while no other starter can interleave. This replaced a first design (create-by-link, break-by-rename) whose stress test found two starters both believing they owned a stale lock: any
// "look, then act" on a file has a window, and a transaction does not.
//   · a row whose owner is a LIVE pid on this host → refused, never stolen (a pid that is alive is a live owner);
//   · a row of ANOTHER host → refused, never taken (a store moved between hosts must have been closed cleanly, which empties the row);
//   · a row whose pid is dead → taken over, atomically;
//   · a clean close empties the row.
import { mkdirSync } from "node:fs";
import { hostname } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { StoreOwned } from "./types.ts";

export interface LockInfo {
  pid: number;
  host: string;
  startedAt: number;
  socket: string;
}
export interface OwnerLock {
  readonly info: LockInfo;
  /** Empties the row — and only if it is still ours. Idempotent. */
  release(): void;
}
export interface LockOptions {
  /** Test seams (default: the real thing). */
  host?: string;
  pidAlive?: (pid: number) => boolean;
  /** Does the channel of this recorded owner answer? Used ONLY to make a refusal more useful (a live pid is never overridden). */
  probe?: (info: LockInfo) => Promise<boolean>;
  now?: () => number;
}

export const lockPath = (store: string): string => join(resolve(store), "owner.lock");
export const LOCK_SCHEMA = "CREATE TABLE IF NOT EXISTS owner (id INTEGER PRIMARY KEY CHECK (id = 1), pid INTEGER NOT NULL, host TEXT NOT NULL, started_at INTEGER NOT NULL, socket TEXT NOT NULL)";

export const defaultPidAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM"; // exists, but not ours
  }
};

function open(path: string): DatabaseSync {
  const db = new DatabaseSync(path, { timeout: 10_000 }); // a competing starter holds the write lock only for the few statements of its own decision
  db.exec(LOCK_SCHEMA);
  return db;
}
type Row = { pid: number; host: string; started_at: number; socket: string };
const toInfo = (r: Row): LockInfo => ({ pid: r.pid, host: r.host, startedAt: r.started_at, socket: r.socket });

/** Read the recorded owner without claiming anything (diagnostics, tests). `null` when the store is unowned. */
export function readLock(store: string): LockInfo | null {
  const db = open(lockPath(store));
  try {
    const r = db.prepare("SELECT pid, host, started_at, socket FROM owner WHERE id = 1").get() as Row | undefined;
    return r ? toInfo(r) : null;
  } finally {
    db.close();
  }
}

export async function acquireLock(store: string, socket: string, opts: LockOptions = {}): Promise<OwnerLock> {
  const dir = resolve(store);
  mkdirSync(dir, { recursive: true });
  const path = lockPath(dir);
  const host = opts.host ?? hostname();
  const alive = opts.pidAlive ?? defaultPidAlive;
  const info: LockInfo = { pid: process.pid, host, startedAt: (opts.now ?? Date.now)(), socket };

  let held: LockInfo | null = null; // the live owner that made us refuse, if any
  const db = open(path);
  try {
    db.exec("BEGIN IMMEDIATE"); // from here until COMMIT no other starter can read-then-write: the decision and the claim are one step
    try {
      const row = db.prepare("SELECT pid, host, started_at, socket FROM owner WHERE id = 1").get() as Row | undefined;
      if (row && (row.host !== host || alive(row.pid))) {
        held = toInfo(row); // another host's, or a live pid's: refused, never stolen
        db.exec("ROLLBACK");
      } else {
        db.prepare("INSERT OR REPLACE INTO owner (id, pid, host, started_at, socket) VALUES (1, ?, ?, ?, ?)").run(info.pid, info.host, info.startedAt, info.socket);
        db.exec("COMMIT");
      }
    } catch (e) {
      try { db.exec("ROLLBACK"); } catch { /* no transaction was open */ }
      throw e;
    }
  } finally {
    db.close();
  }
  if (held) {
    // A live pid means a live owner. The probe only makes the refusal more useful: a pid that is alive but whose channel is silent may be an unrelated process that reused a dead owner's number.
    const answering = held.host === host && opts.probe ? await opts.probe(held).catch(() => false) : undefined;
    throw new StoreOwned(dir, held.pid, held.host, held.socket, answering === false ? `its channel did not answer; if pid ${held.pid} is not a KILN owner, empty the lock with: sqlite3 ${path} 'DELETE FROM owner'` : "");
  }
  let released = false;
  return {
    info,
    release: () => {
      if (released) return;
      released = true;
      try {
        const d = open(path);
        try {
          d.prepare("DELETE FROM owner WHERE id = 1 AND pid = ? AND host = ? AND started_at = ?").run(info.pid, info.host, info.startedAt); // only OUR row
        } finally {
          d.close();
        }
      } catch {
        /* the store directory is gone: nothing to release */
      }
    },
  };
}
