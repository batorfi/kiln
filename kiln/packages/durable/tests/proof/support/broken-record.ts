// DELIBERATELY WEAKENED writers of the record, for the tests only — the controls that show the proof can fail (r15 T036). Each one is `appendEvent` with one guarantee removed:
//   appendWithoutValidation   skips the commit-time validation (an invalid event, content included, is stored)
//   seqFromMemory             takes its sequence number from a counter in memory instead of the `head` document in the same commit (a rolled-back commit leaves a hole)
// Nothing under src/ knows this file exists.
import { correlationOf } from "#contracts/events/grammar.ts";
import { uuid7 } from "#contracts/events/id.ts";
import type { Event } from "#contracts/events/types.ts";
import { plain } from "#durable/canonical.ts";
import { CHUNK, type EventChunk, type EventDraft, type RecordHead } from "#durable/record/append.ts";
import type { Tx } from "#durable/store.ts";

async function write(tx: Tx, draft: EventDraft, seq: number, bump: boolean): Promise<Event> {
  const head = await tx.doc<RecordHead>("kiln.record", "head", {});
  if (head.next === undefined) { head.legacyThrough = 0; head.next = 1; }
  const event: Event = {
    id: uuid7(Math.trunc(draft.at), seq), seq, type: draft.type, schema: `${draft.type}/1`, time: new Date(Math.trunc(draft.at)).toISOString(), subject: draft.subject, actor: draft.actor,
    correlation: correlationOf(draft.subject), causation: `cmd:${draft.cause}`, trace: null, privacy: "internal", data: plain(draft.data),
  };
  const chunk = await tx.doc<EventChunk>("kiln.event", String(Math.floor((seq - 1) / CHUNK)), { events: [] });
  chunk.events.push(plain(event));
  if (bump) head.next = seq + 1;
  return event;
}

/** `appendEvent` without `validateEvent`. */
export async function appendWithoutValidation(tx: Tx, draft: EventDraft): Promise<Event> {
  const head = await tx.doc<RecordHead>("kiln.record", "head", {});
  return write(tx, draft, head.next ?? 1, true);
}

/** `appendEvent` whose sequence number comes from memory: call `next()` before the commit, as a careless writer would. */
export function seqFromMemory(): { next(): number; append(tx: Tx, draft: EventDraft, seq: number): Promise<Event> } {
  let n = 0;
  return { next: () => ++n, append: (tx, draft, seq) => write(tx, draft, seq, true) };
}
