// Reading the record (contracts/event-catalog.md §3, research R13): one function serves the backbone, the walk's view, the inspector and the tools.
// It merges what r13/r14 wrote (version 0 entries in `kiln.outbox/main`, up to `legacyThrough`) with the chunks, presents EVERY event at the catalog's current version, and never writes.
import { upcastEntry, upcastStored } from "#contracts/events/upcast.ts";
import type { Ctx, Entry0, Event } from "#contracts/events/types.ts";
import type { DocName, Reader } from "../store.ts";
import { CHUNK, type EventChunk, type RecordHead, type RunIndex } from "./append.ts";
import { digestOf } from "./refs.ts";

/** Where documents are read from: a store, or a fresh reader with no owner. */
export interface DocSource {
  get<T extends object>(name: DocName, key: string): Promise<T | undefined>;
}
export const fromReader = (r: Pick<Reader, "snapshot">): DocSource => ({ get: (name, key) => r.snapshot(name, key) });

/** The event with this sequence number inside its chunk. Chunk n spans 256n+1…256n+256, but the first chunk of a store with version 0 entries starts after `legacyThrough`. */
function inChunk(chunk: EventChunk | undefined, n: number, legacyThrough: number, seq: number): Event | undefined {
  const first = Math.max(n * CHUNK + 1, legacyThrough + 1);
  const e = chunk?.events[seq - first];
  return e && e.seq === seq ? e : undefined;
}

/** How far back a range read looks for the siblings a version 0 entry needs (a `gate.settled` needs its `move.committed`, always within a few entries). */
const SIBLING_WINDOW = 512;

interface LegacyDoc { next: number; entries: Entry0[] }

export async function headOf(src: DocSource): Promise<{ next: number; legacyThrough: number }> {
  const head = await src.get<RecordHead>("kiln.record", "head");
  const legacy = await src.get<LegacyDoc>("kiln.outbox", "main");
  const legacyThrough = head?.legacyThrough ?? (legacy ? legacy.next - 1 : 0);
  return { next: head?.next ?? legacyThrough + 1, legacyThrough };
}

/** Current-version events from `from` to `to` (inclusive; default the whole record), in sequence order. */
export async function* readRecord(src: DocSource, range: { from?: number; to?: number } = {}): AsyncGenerator<Event> {
  const { next, legacyThrough } = await headOf(src);
  const from = Math.max(1, range.from ?? 1);
  const to = Math.min(next - 1, range.to ?? next - 1);
  if (to < from) return;
  const legacy = legacyThrough > 0 ? await src.get<LegacyDoc>("kiln.outbox", "main") : undefined;
  const window: Event[] = [];
  const ctx: Ctx = { digest: digestOf, siblings: (seq, key) => window.filter((e) => e.seq < seq && e.causation === `cmd:${key}`) };
  let chunkNo = -1;
  let chunk: EventChunk | undefined;
  for (let seq = from <= legacyThrough ? Math.max(1, from - SIBLING_WINDOW) : from; seq <= to; seq++) {
    let event: Event;
    if (seq <= legacyThrough) {
      const entry = legacy?.entries[seq - 1];
      if (!entry || entry.seq !== seq) throw new Error(`record-corrupt: kiln.outbox/main has no entry ${seq} at position ${seq - 1} (legacyThrough ${legacyThrough})`);
      event = upcastEntry(entry, ctx);
    } else {
      const n = Math.floor((seq - 1) / CHUNK);
      if (n !== chunkNo) {
        chunk = await src.get<EventChunk>("kiln.event", String(n));
        chunkNo = n;
      }
      const stored = inChunk(chunk, n, legacyThrough, seq);
      if (!stored) throw new Error(`record-corrupt: chunk ${n} has no event ${seq}`);
      event = upcastStored(stored, ctx);
    }
    window.push(event);
    if (window.length > SIBLING_WINDOW) window.shift();
    if (seq >= from) yield event;
  }
}

/** One feature run's events, in order: the run's version 0 entries (found by subject) and its indexed chunks. */
export async function* readRun(src: DocSource, feature: string): AsyncGenerator<Event> {
  const correlation = `run:${feature}`;
  const { legacyThrough } = await headOf(src);
  if (legacyThrough > 0) for await (const e of readRecord(src, { to: legacyThrough })) if (e.correlation === correlation) yield e;
  const index = await src.get<RunIndex>("kiln.record", correlation);
  const seqs = (index?.seqs ?? []).filter((s) => s > legacyThrough);
  let chunkNo = -1;
  let chunk: EventChunk | undefined;
  const ctx: Ctx = { digest: digestOf, siblings: () => [] };
  for (const seq of seqs) {
    const n = Math.floor((seq - 1) / CHUNK);
    if (n !== chunkNo) {
      chunk = await src.get<EventChunk>("kiln.event", String(n));
      chunkNo = n;
    }
    const stored = inChunk(chunk, n, legacyThrough, seq);
    if (!stored) throw new Error(`record-corrupt: the index of ${correlation} names ${seq}, which chunk ${n} does not hold`);
    yield upcastStored(stored, ctx);
  }
}

/** All events of a run or of the whole record, collected. */
export async function collect(it: AsyncIterable<Event>): Promise<Event[]> {
  const out: Event[] = [];
  for await (const e of it) out.push(e);
  return out;
}

/** The shape r13/r14 tests and views read (`Inspection.outbox`, `WalkView.history`): the event, flattened. */
export interface InterimView { type: string; subject: string; at: number; actor: string; cause: string; data: unknown; seq: number; correlation: string | null }
export const interimView = (e: Event): InterimView => ({ type: e.type, subject: e.subject, at: Date.parse(e.time), actor: e.actor, cause: e.causation.replace(/^cmd:/, ""), data: e.data, seq: e.seq, correlation: e.correlation });

