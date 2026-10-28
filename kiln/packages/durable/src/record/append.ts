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

export interface RecordHead { next?: number; legacyThrough?: number }
export interface EventChunk { events: Event[] }
export interface RunIndex { seqs: number[] }

/** What a writer hands over: the r13/r14 outbox shape (`at` in ms, `cause` a command key or `evt:<seq>`), plus optional correlation and privacy. */
export interface EventDraft {
  type: string;
  subject: string;
  at: number;
  actor: string;
  cause: string;
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
  }
  const seq = head.next;
  const entry = catalog.get(draft.type);
  if (!Number.isFinite(draft.at) || draft.at < 0 || draft.at > 0xffffffffffff) throw new EventRejected(draft.type, [{ code: "event-time-invalid", path: "time", message: `${draft.at} is not a millisecond instant` }]);
  const causation = typeof draft.cause === "string" && draft.cause.startsWith("evt:") ? draft.cause : `cmd:${draft.cause}`;
  const event: Event = {
    id: uuid7(Math.trunc(draft.at), seq), seq, type: draft.type, schema: `${draft.type}/${entry?.current ?? 1}`, time: new Date(Math.trunc(draft.at)).toISOString(), subject: draft.subject,
    actor: draft.actor, correlation: draft.correlation !== undefined ? draft.correlation : correlationOf(draft.subject), causation, trace: null, privacy: draft.privacy ?? entry?.privacy ?? "internal", data: plain(draft.data),
  };
  const faults = validateEvent(event);
  if (faults.length) throw new EventRejected(draft.type, faults);

  const chunk = await tx.doc<EventChunk>("kiln.event", String(Math.floor((seq - 1) / CHUNK)), { events: [] });
  chunk.events.push(plain(event));
  head.next = seq + 1;
  if (event.correlation) {
    const run = await tx.doc<RunIndex>("kiln.record", event.correlation, { seqs: [] });
    run.seqs.push(seq);
  }
  return event;
}
