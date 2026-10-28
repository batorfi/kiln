// Consumer cursors (research R8): `kiln.cursor/<name>` = the last event the consumer has FULLY processed. Kept in the store, advanced only after the consumer handled the event
// (transactional: in the same commit; effect: in the commit after delivery).
import type { Reader, Tx } from "../store.ts";

export interface Cursor {
  seq: number;
  version: number;
  /** The consumer stopped at this event: why. `cursor-ahead-of-head` means a restored older store (the consumer never skips forward). */
  failed?: { seq: number; error: string };
}
export const FRESH = (version: number, from = 1): Cursor => ({ seq: from - 1, version });

export async function readCursor(r: Pick<Reader, "snapshot">, name: string): Promise<Cursor | undefined> {
  const c = await r.snapshot<Partial<Cursor>>("kiln.cursor", name);
  return c && c.seq !== undefined ? (c as Cursor) : undefined;
}
/** The cursor document inside a commit (seeded empty). */
export const cursorDoc = (tx: Tx, name: string): Promise<Partial<Cursor>> => tx.doc<Partial<Cursor>>("kiln.cursor", name, {});
