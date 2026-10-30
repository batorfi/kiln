// Replaying the first program's committed walks (r15 US4, research R10): each is stored as the original factory-log, its events, the texts the events name, and how it was made. A replay folds the
// events back into a factory-log and requires: the SAME BYTES as the original, the verdict the first program gave (valid, or R3 for the stream kept because it fails), and events that are exactly
// the conversion of the original. Pure but for reading the fixture directory. NEVER VACUOUS: the caller counts how many walks it replayed and which named rows it could not.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Event } from "#contracts/events/types.ts";
import { validateEvent } from "./events/validate.ts";
import { streamToEvents } from "./legacy-convert.ts";
import { validateLog } from "./log.ts";
import { fileOf, foldRun } from "./projections/factory-log.ts";
import { checkStream } from "./streams.ts";

/** The rows the first program closed and the row text of r15 names. */
export const NAMED_ROWS: readonly string[] = ["r1", "r2", "r3", "r7", "r8"];

export interface WalkMeta {
  name: string;
  row: string;
  walker: string;
  originalSha256: string;
  eventsSha256: string;
  records: number;
  expect: "valid" | "R3";
  note: string;
}
export interface WalkStream {
  meta: WalkMeta;
  /** The original factory-log, as text (lines joined by \n, ending in one). */
  original: string;
  /** The converted events, as text (one JSON envelope per line). */
  eventsText: string;
  refs: Record<string, string>;
}
export interface WalkSet {
  streams: WalkStream[];
  /** Named rows with no stream, each with the reason (MISSING.json). */
  missing: Record<string, string>;
}

const sha = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

export function loadWalks(dir: string): WalkSet {
  const names = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".meta.json")).map((f) => f.slice(0, -".meta.json".length)).sort() : [];
  const streams = names.map((name): WalkStream => ({
    meta: JSON.parse(readFileSync(join(dir, `${name}.meta.json`), "utf8")),
    original: readFileSync(join(dir, `${name}.jsonl`), "utf8"),
    eventsText: readFileSync(join(dir, `${name}.events.jsonl`), "utf8"),
    refs: JSON.parse(readFileSync(join(dir, `${name}.refs.json`), "utf8")),
  }));
  const missingFile = join(dir, "MISSING.json");
  return { streams, missing: existsSync(missingFile) ? JSON.parse(readFileSync(missingFile, "utf8")) : {} };
}

export interface ReplayProblem {
  code: "replay-differs" | "replay-verdict-differs" | "replay-event-invalid" | "replay-fixture-altered";
  detail: string;
}
export interface ReplayResult {
  name: string;
  row: string;
  /** Records in the original and events replayed. */
  records: number;
  events: number;
  problems: ReplayProblem[];
  /** The stream rules' faults on the events (the check reports each with its own code); for a stream that must fail R3 the expected silent approval is NOT listed. */
  streamFaults: { code: string; detail: string }[];
}

const lines = (text: string): string[] => text.split("\n").filter(Boolean);

export function replayStream(w: WalkStream): ReplayResult {
  const { meta } = w;
  const problems: ReplayProblem[] = [];
  const add = (code: ReplayProblem["code"], detail: string): void => void problems.push({ code, detail });
  const original = lines(w.original);
  if (sha(w.original) !== meta.originalSha256) add("replay-fixture-altered", `${meta.name}.jsonl no longer has the SHA-256 recorded when it was captured`);
  if (sha(w.eventsText) !== meta.eventsSha256) add("replay-fixture-altered", `${meta.name}.events.jsonl no longer has the SHA-256 recorded when it was captured`);

  let events: Event[] = [];
  try {
    events = lines(w.eventsText).map((l) => JSON.parse(l) as Event);
  } catch (e) {
    add("replay-differs", `the events do not parse: ${(e as Error).message}`);
    return { name: meta.name, row: meta.row, records: original.length, events: 0, problems, streamFaults: [] };
  }
  events.forEach((e) => { for (const f of validateEvent(e)) add("replay-event-invalid", `${e.type} #${e.seq} ${f.code} ${f.path ?? ""}`.trim()); });

  const fresh = streamToEvents(original, meta.name);
  if (JSON.stringify(fresh) !== JSON.stringify(events)) add("replay-differs", "the committed events are not the conversion of the committed original");
  const resolve = (ref: string): string | undefined => w.refs[ref];
  const rebuilt = fileOf(foldRun(events, resolve));
  if (rebuilt !== w.original) {
    const a = lines(rebuilt);
    const at = original.findIndex((l, i) => l !== a[i]);
    add("replay-differs", `the rebuilt factory-log differs from the original${at >= 0 ? ` at line ${at}` : ` in length (${a.length} against ${original.length} lines)`}`);
  }

  const log = validateLog(lines(rebuilt).map((l) => JSON.parse(l)));
  const stream = checkStream(events, { flow: "v1" });
  if (meta.expect === "valid") {
    if (!log.valid) add("replay-verdict-differs", `the first program\'s validator rejects the rebuilt log: ${log.failures[0]}`);
  } else {
    if (log.valid || !log.failures.some((f) => /R3/.test(f))) add("replay-verdict-differs", "this stream must still fail the first program\'s no-silent-approval rule (R3), and no longer does");
    if (!stream.faults.some((f) => f.code === "stream-silent-approval")) add("replay-verdict-differs", "this stream must still be a silent approval by the stream rules, and no longer is");
  }
  return { name: meta.name, row: meta.row, records: original.length, events: events.length, problems, streamFaults: stream.faults.filter((f) => !(meta.expect === "R3" && f.code === "stream-silent-approval")).map((f) => ({ code: f.code, detail: f.detail })) };
}

export interface ReplaySummary {
  results: ReplayResult[];
  /** Named rows with at least one stream that replayed clean. */
  replayedRows: string[];
  /** Named rows with no stream, with the reason; a named row in neither list is `unexplained`. */
  missingRows: Record<string, string>;
  unexplained: string[];
}
export function replayAll(set: WalkSet): ReplaySummary {
  const results = set.streams.map(replayStream);
  const replayedRows = NAMED_ROWS.filter((r) => results.some((x) => x.row === r && x.problems.length === 0));
  const missingRows = Object.fromEntries(NAMED_ROWS.filter((r) => !replayedRows.includes(r) && set.missing[r]).map((r) => [r, set.missing[r]]));
  const unexplained = NAMED_ROWS.filter((r) => !replayedRows.includes(r) && !results.some((x) => x.row === r) && !set.missing[r]);
  return { results, replayedRows, missingRows, unexplained };
}
