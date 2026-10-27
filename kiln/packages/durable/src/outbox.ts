// The outbox: the interim, append-only event stream (FR-019, data-model §2.4). An entry is committed IN THE COMMIT of the state it records and always names an actor and a cause
// (constitution VII). r15 adopts these entries as the first events of the record without migration; the schema is deliberately minimal and not frozen here.
import { plain } from "./canonical.ts";
import type { Tx } from "./store.ts";
import type { OutboxEntry, StoredOutboxEntry } from "./types.ts";

interface OutboxDoc {
  next: number;
  entries: StoredOutboxEntry[];
}

export async function appendOutbox(tx: Tx, entry: OutboxEntry): Promise<StoredOutboxEntry> {
  if (typeof entry.actor !== "string" || entry.actor.trim() === "") throw new Error(`outbox entry ${entry.type} has no actor`);
  if (typeof entry.cause !== "string" || entry.cause.trim() === "") throw new Error(`outbox entry ${entry.type} has no cause`);
  const doc = await tx.doc<OutboxDoc>("kiln.outbox", "main", { next: 1, entries: [] });
  const stored: StoredOutboxEntry = { ...entry, seq: doc.next };
  doc.entries.push(plain(stored)); // a draft takes ownership of what it is given: hand it a copy
  doc.next += 1;
  return stored;
}
