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
