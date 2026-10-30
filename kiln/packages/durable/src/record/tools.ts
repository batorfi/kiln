// The record, read from outside (r15, contracts/backbone-and-projection.md §5): what `kiln record …` shows. Every function opens the store with a FRESH READER — no owner, no lock, nothing resumed —
// so it works beside a running owner and on a store whose owner is gone. They are the same functions the proofs use to judge a store.
import type { Event } from "#contracts/events/types.ts";
import { validateEvent } from "#record/events/validate.ts";
import { fileOf, foldRun } from "#record/projections/factory-log.ts";
import { checkStream } from "#record/streams.ts";
import { openReader } from "../library/open.ts";
import { basename, resolve } from "node:path";
import { ArchiveError, readArchive, verifyArchive } from "./archive.ts";
import { collect, fromReader, headOf, readRecord, readRun } from "./read.ts";

async function withReader<T>(store: string, f: (r: Awaited<ReturnType<typeof openReader>>) => Promise<T>): Promise<T> {
  const r = await openReader(store);
  try {
    return await f(r);
  } finally {
    await r.close();
  }
}

export interface ShowRange { run?: string; from?: number; to?: number }
export const showRecord = (store: string, range: ShowRange = {}): Promise<Event[]> =>
  withReader(store, async (r) => (range.run ? (await collect(readRun(fromReader(r), range.run))).filter((e) => e.seq >= (range.from ?? 1) && e.seq <= (range.to ?? Infinity)) : collect(readRecord(fromReader(r), range))));

export interface RecordStatus {
  head: number;
  legacyThrough: number;
  chunks: number;
  consumers: { name: string; seq: number; lag: number; failed?: { seq: number; error: string } }[];
}
export const recordStatus = (store: string): Promise<RecordStatus> =>
  withReader(store, async (r) => {
    const { next, legacyThrough } = await headOf(fromReader(r));
    const head = next - 1;
    const cursors = await r.docs<{ seq?: number; failed?: { seq: number; error: string } }>("kiln.cursor");
    return {
      head, legacyThrough, chunks: head > legacyThrough ? Math.floor((head - 1) / 256) - Math.floor(legacyThrough / 256) + 1 : 0,
      consumers: cursors.map((c) => ({ name: c.key, seq: c.value.seq ?? 0, lag: head - (c.value.seq ?? 0), ...(c.value.failed ? { failed: c.value.failed } : {}) })),
    };
  });

export interface Verification {
  ok: boolean;
  /** Events examined — zero fails (a check that examined nothing proves nothing). */
  examined: number;
  /** The last sequence number read: a verification of a record being written reads a consistent prefix and says where it ended. */
  reached: number;
  faults: string[];
}
export const verifyRecord = (store: string, run?: string): Promise<Verification> =>
  withReader(store, async (r) => {
    const faults: string[] = [];
    let events: Event[] = [];
    try {
      events = run ? await collect(readRun(fromReader(r), run)) : await collect(readRecord(fromReader(r)));
    } catch (e) {
      faults.push(`record-corrupt: ${(e as Error).message}`);
    }
    for (const e of events) for (const f of validateEvent(e)) faults.push(`${f.code}: ${e.type} #${e.seq}${f.path ? ` ${f.path}` : ""} — ${f.message}`);
    const stream = checkStream(events, { whole: !run });
    for (const f of stream.faults) faults.push(`${f.code}${f.seq ? ` #${f.seq}` : ""}: ${f.detail}`);
    return { ok: faults.length === 0 && events.length > 0, examined: events.length, reached: events.length ? events[events.length - 1].seq : 0, faults };
  });

/** One run\'s factory-log, rebuilt from its first event. */
export const rebuildLog = (store: string, run: string): Promise<{ text: string; lines: number; events: number }> =>
  withReader(store, async (r) => {
    const events = await collect(readRun(fromReader(r), run));
    const lines = foldRun(events);
    return { text: fileOf(lines), lines: lines.length, events: events.length };
  });

/**
 * An archive file, read back (r15 US7, contracts/archive.md §4): offline, never re-hydrating the live store. `file` is a name beside the store or a path. With `verify`, the checksum, size and counts
 * are compared with what the record says — the `feature.archived` event that names the file — and any difference throws by name.
 */
export async function showArchive(store: string, file: string, opts: { verify?: boolean; kind?: string } = {}): Promise<{ name: string; verified: boolean; lines: string[] }> {
  const name = basename(file);
  const where = file.includes("/") || file.includes("\\") ? resolve(file) : name; // a bare name is looked up beside the store; a path (a copy taken off the machine) is read where it is
  let verified = false;
  if (opts.verify) {
    const ev = (await showRecord(store)).find((e) => e.type === "feature.archived" && (e.data as { archive: string }).archive === name);
    if (!ev) throw new ArchiveError("archive-missing", `no feature.archived event in the record names ${name}`);
    const d = ev.data as { archive: string; sha256: string; bytes: number; counts: { docs: number; tasks: number; events: number; texts: number } };
    await verifyArchive(store, { name: where, sha256: d.sha256, bytes: d.bytes }, d.counts);
    verified = true;
  }
  const a = readArchive(store, where);
  const all: { kind: string; line: unknown }[] = [
    { kind: "header", line: a.header },
    ...a.docs.map((line) => ({ kind: "doc", line })), ...a.tasks.map((line) => ({ kind: "task", line })),
    ...a.events.map((line) => ({ kind: "event", line })), ...a.texts.map((line) => ({ kind: "text", line })),
  ];
  return { name, verified, lines: all.filter((x) => !opts.kind || x.kind === opts.kind).map((x) => JSON.stringify(x.line)) };
}
