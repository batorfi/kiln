// `appendEvent`: the one way an event is written (contracts/event-catalog.md §1, research R2–R5). It runs INSIDE the caller's commit, so the event exists exactly when the state it records does.
// It validates before writing and throws `EventRejected` on any fault: the throw rolls the commit back and the state does not change (FR-013).
// Storage is chunked: `kiln.record/head` {next, legacyThrough}, `kiln.event/<n>` holds events 256n+1…256n+256, `kiln.record/run:<feature>` indexes one run. Entries r13/r14 wrote stay in
// `kiln.outbox/main`, never touched again; `legacyThrough` is the last sequence number held there, taken from it in the first append under this owner.
import { catalog } from "#contracts/events/catalog/index.ts";
import { correlationOf } from "#contracts/events/grammar.ts";
import { uuid7 } from "#contracts/events/id.ts";
import type { Event, Privacy } from "#contracts/events/types.ts";
import { validateEvent, type EventFault } from "#record/events/validate.ts";
import { plain } from "../canonical.ts";
import type { Tx } from "../store.ts";

export const CHUNK = 256;

/** `lastAt`: the time (ms) of the newest event, so a later event is never stamped earlier than it (see `appendEvent`). */
export interface RecordHead { next?: number; legacyThrough?: number; lastAt?: number }
export interface EventChunk { events: Event[] }
export interface RunIndex { seqs: number[] }

/** What a writer hands over: the r13/r14 outbox shape (`at` in ms, `cause` a command key), plus optional correlation and privacy. A cause that is an EARLIER EVENT goes in `causeEvent`, never in `cause`: a caller-chosen key may look like anything, "evt:3" included. */
export interface EventDraft {
  type: string;
  subject: string;
  at: number;
  actor: string;
  cause: string;
  /** The sequence number of the earlier event that caused this one (then `cause` is ignored). */
  causeEvent?: number;
  data: unknown;
  correlation?: string | null;
  privacy?: Privacy;
}

export class EventRejected extends Error {
  readonly faults: EventFault[];
  readonly code: EventFault["code"];
  constructor(type: string, faults: EventFault[]) {
    super(`${faults[0].code}: ${type}${faults[0].path ? ` ${faults[0].path}` : ""} — ${faults[0].message}`);
    this.name = "EventRejected";
    this.faults = faults;
    this.code = faults[0].code;
  }
}

export async function appendEvent(tx: Tx, draft: EventDraft): Promise<Event> {
  const head = await tx.doc<RecordHead>("kiln.record", "head", {});
  if (head.next === undefined) {
    // the first append under this owner: events r13/r14 wrote stay in kiln.outbox/main; numbering continues after them
    const legacy = await tx.doc<{ next: number }>("kiln.outbox", "main", { next: 1 } as never);
    head.legacyThrough = legacy.next - 1;
    head.next = legacy.next;
    head.lastAt = (legacy as { entries?: { at?: number }[] }).entries?.at(-1)?.at ?? 0;
  }
  const seq = head.next;
  const entry = catalog.get(draft.type);
  if (entry?.legacy) throw new EventRejected(draft.type, [{ code: "event-type-read-only", path: "type", message: `${draft.type} represents the first program's streams: it can be read and replayed, never committed` }]);
  if (!Number.isFinite(draft.at) || draft.at < 0 || draft.at > 0xffffffffffff) throw new EventRejected(draft.type, [{ code: "event-time-invalid", path: "time", message: `${draft.at} is not a millisecond instant` }]);
  // A writer reads the clock before its commit (or two commits interleave, or the wall clock steps back): the record's time never goes backwards, so an event is never stamped earlier than the one before it.
  const at = Math.max(Math.trunc(draft.at), head.lastAt ?? 0);
  head.lastAt = at;
  const causation = draft.causeEvent !== undefined ? `evt:${draft.causeEvent}` : `cmd:${draft.cause}`;
  const event: Event = {
    id: uuid7(at, seq), seq, type: draft.type, schema: `${draft.type}/${entry?.current ?? 1}`, time: new Date(at).toISOString(), subject: draft.subject,
    actor: draft.actor, correlation: draft.correlation !== undefined ? draft.correlation : correlationOf(draft.subject), causation, trace: null, privacy: draft.privacy ?? entry?.privacy ?? "internal", data: plain(draft.data),
  };
  const faults = validateEvent(event);
  if (faults.length) throw new EventRejected(draft.type, faults);

  const chunk = await tx.doc<EventChunk>("kiln.event", String(Math.floor((seq - 1) / CHUNK)), { events: [] });
  chunk.events.push(plain(event));
  head.next = seq + 1;
  if (tx.hooks) await tx.hooks.at("record.append-after-write"); // mid-commit: the chunk is written in the callback, nothing is stored yet
  if (event.correlation) {
    const run = await tx.doc<RunIndex>("kiln.record", event.correlation, { seqs: [] });
    run.seqs.push(seq);
  }
  return event;
}
