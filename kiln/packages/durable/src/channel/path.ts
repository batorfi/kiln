// Where the owner's private socket lives (research R6): `<tmp>/kiln-<uid>/<sha1(realpath store)[0..8]>.sock` — short enough for the ~100-character limit of a Unix-domain socket path,
// per-user, and NOT inside the store (a moved store must not carry a dead socket). Pure path arithmetic: this file imports no network module. The safe-directory rule is T053.
import { createHash } from "node:crypto";
import { mkdirSync, realpathSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join, resolve } from "node:path";

export function channelDir(): string {
  return join(tmpdir(), `kiln-${userInfo().uid}`);
}
export function channelSocketPath(store: string): string {
  mkdirSync(resolve(store), { recursive: true });
  const id = createHash("sha1").update(realpathSync(resolve(store))).digest("hex").slice(0, 8);
  return join(channelDir(), `${id}.sock`);
}

// ── the safe-directory rule (owner-channel.md, analysis finding S1) ───────────────────────────────────────────────────────────────────
// A path that someone else pre-created is NEVER trusted: in a shared temporary location another user could plant a directory (or a symlink to one) where the owner is about to put its socket.
// The checks are pure functions over a stat result, so "owned by someone else" is unit-tested without root.
import { chmodSync, lstatSync } from "node:fs";
import { ChannelUnsafe } from "../types.ts";

export interface StatLike {
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  isSocket(): boolean;
  uid: number;
  mode: number;
}
export function directoryProblem(st: StatLike, uid: number): string | null {
  if (st.isSymbolicLink()) return "it is a symbolic link";
  if (!st.isDirectory()) return "it is not a directory";
  if (st.uid !== uid) return `it is owned by uid ${st.uid}, not by the current user (uid ${uid})`;
  if ((st.mode & 0o777) !== 0o700) return `its mode is ${(st.mode & 0o777).toString(8)}, not 700`;
  return null;
}
export function socketProblem(st: StatLike, uid: number): string | null {
  if (st.isSymbolicLink()) return "it is a symbolic link";
  if (!st.isSocket()) return "it is not a socket";
  if (st.uid !== uid) return `it is owned by uid ${st.uid}, not by the current user (uid ${uid})`;
  if ((st.mode & 0o777) !== 0o600) return `its mode is ${(st.mode & 0o777).toString(8)}, not 600`;
  return null;
}
/** Create the channel directory (mode 0700) or, if it exists, REQUIRE it to be a real directory of the current user with mode exactly 0700. Throws `ChannelUnsafe` naming the problem. */
export function ensureSafeChannelDir(dir: string, uid: number = userInfo().uid): void {
  try {
    mkdirSync(dir, { mode: 0o700 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  const problem = directoryProblem(lstatSync(dir), uid);
  if (problem) throw new ChannelUnsafe(dir, problem);
}
/** After the socket is bound: tighten it to 0600 and require it to be ours. */
export function secureSocketFile(path: string, uid: number = userInfo().uid): void {
  chmodSync(path, 0o600);
  const problem = socketProblem(lstatSync(path), uid);
  if (problem) throw new ChannelUnsafe(path, problem);
}
