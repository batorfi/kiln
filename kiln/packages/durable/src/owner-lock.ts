// One owner per store (FR-041, research R5). Neither the database nor the library stops a second process from opening the file and taking its write lock, so the rule is KILN's:
// a lock file beside the store, created ATOMICALLY WITH ITS CONTENT (a temp file linked into place — `link` fails if the name exists), recording who owns it. A stale lock (its owner is
// gone) is taken over by an atomic rename with verify-and-put-back; a lock of another HOST is never taken (a store moved between hosts must have been closed cleanly, which removes it).
import { hostname } from "node:os";
import { linkSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { StoreOwned } from "./types.ts";

export interface LockInfo {
  pid: number;
  host: string;
  startedAt: number;
  socket: string;
}
export interface OwnerLock {
  readonly info: LockInfo;
  /** Removes the lock (and only if it is still ours). Idempotent. */
  release(): void;
}
export interface LockOptions {
  /** Test seams (default: the real thing). */
  host?: string;
  pidAlive?: (pid: number) => boolean;
  /** Does the channel of this recorded owner answer? Added when the channel exists (T055). Default: assume yes when the pid is alive. */
  probe?: (info: LockInfo) => Promise<boolean>;
  now?: () => number;
}

export const lockPath = (store: string): string => join(resolve(store), "owner.lock");

export const defaultPidAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM"; // exists, but not ours
  }
};

const unreadable = (e: unknown): boolean => (e as NodeJS.ErrnoException).code === "ENOENT";

export async function acquireLock(store: string, socket: string, opts: LockOptions = {}): Promise<OwnerLock> {
  const dir = resolve(store);
  mkdirSync(dir, { recursive: true });
  const path = lockPath(dir);
  const host = opts.host ?? hostname();
  const alive = opts.pidAlive ?? defaultPidAlive;
  const info: LockInfo = { pid: process.pid, host, startedAt: (opts.now ?? Date.now)(), socket };
  const mine = JSON.stringify(info);
  const tmp = `${path}.new.${process.pid}.${Math.random().toString(36).slice(2)}`;
  writeFileSync(tmp, mine, { mode: 0o600 });
  const release = (): void => {
    try {
      if (readFileSync(path, "utf8") === mine) unlinkSync(path);
    } catch {
      /* already gone */
    }
  };
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        linkSync(tmp, path); // atomic: the lock exists with its full content, or not at all
        return { info, release };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      }
      let text: string;
      try {
        text = readFileSync(path, "utf8");
      } catch (e) {
        if (unreadable(e)) continue; // it vanished between our attempt and our read: try again
        throw e;
      }
      let held: LockInfo;
      try {
        held = JSON.parse(text) as LockInfo;
      } catch {
        held = { pid: -1, host, startedAt: 0, socket: "" }; // a torn or foreign file: it is stale by definition (nothing live writes it any other way)
      }
      if (held.host !== host) throw new StoreOwned(dir, held.pid, held.host, held.socket); // never take another host's lock
      if (held.pid !== -1 && alive(held.pid) && (opts.probe ? await opts.probe(held) : true)) throw new StoreOwned(dir, held.pid, held.host, held.socket);
      // stale: take it over by renaming THAT file away, then verifying it is the one we judged
      const tomb = `${path}.stale.${process.pid}.${Math.random().toString(36).slice(2)}`;
      try {
        renameSync(path, tomb);
      } catch (e) {
        if (unreadable(e)) continue; // someone else already took it
        throw e;
      }
      let moved = "";
      try {
        moved = readFileSync(tomb, "utf8");
      } catch {
        /* treat as different */
      }
      if (moved === text) {
        try { unlinkSync(tomb); } catch { /* ignore */ }
        continue; // we removed exactly the stale lock: now race to create ours
      }
      // we moved a DIFFERENT (fresh) lock — put it back and let its owner be
      try { linkSync(tomb, path); } catch { /* someone created a newer one; fine */ }
      try { unlinkSync(tomb); } catch { /* ignore */ }
      try {
        const now = JSON.parse(moved) as LockInfo;
        throw new StoreOwned(dir, now.pid, now.host, now.socket);
      } catch (inner) {
        if (inner instanceof StoreOwned) throw inner;
        continue;
      }
    }
    throw new StoreOwned(dir, -1, host, "(the lock kept changing under us)");
  } finally {
    try { unlinkSync(tmp); } catch { /* ignore */ }
  }
}
