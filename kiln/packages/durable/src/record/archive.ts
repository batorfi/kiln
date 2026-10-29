// The feature archive (research R12, contracts/archive.md, CORE-7): what a finished feature leaves the live store as — one checksummed file beside the store, never in git. This module is the FILE:
// what goes in (`exportFeature`, a pure function of the stored state), how it is written (`writeArchive`: temp file, fsync, rename), how it is checked (`verifyArchive`) and read back (`readArchive`).
// The task that runs it, and the tombstones it leaves, are in archive-task.ts.
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "../canonical.ts";
import type { Event } from "#contracts/events/types.ts";
import { parseRef } from "#contracts/events/grammar.ts";
import type { Reader, TaskLite } from "../store.ts";
import type { WalkDoc } from "../walk/doc.ts";
import { collect, fromReader, readRun } from "./read.ts";
import { digestOf, resolveRef } from "./refs.ts";

export const archiveDir = (store: string): string => join(store, "archive");
export const archivePath = (store: string, name: string): string => join(archiveDir(store), name);

export interface ArchiveCounts { docs: number; tasks: number; events: number; texts: number }
export interface ArchiveContent {
  feature: string;
  /** Canonical-JSON lines, the header first, in a fixed order: docs (by name, key), tasks (by id), events (by seq), texts (by ref). */
  lines: string[];
  counts: ArchiveCounts;
  /** The feature-level move keys and the gate move keys the archive carries (FR-062). */
  keys: string[];
}
export interface ArchivedFile { name: string; sha256: string; bytes: number }

const DOC_FAMILIES = ["kiln.gate", "kiln.brief", "kiln.move"] as const;

/** Everything the live store holds for one feature, as lines. A pure function of the stored state: reading it twice (nothing changing) gives the same bytes. */
export async function exportFeature(store: Pick<Reader, "snapshot" | "docs" | "tasks">, feature: string): Promise<ArchiveContent> {
  const docLines: [string, string][] = [];
  const gatePrefix = `gate:${feature}:`;
  const keys = new Set<string>();
  const push = (name: string, key: string, value: unknown): void => void docLines.push([`${name}\0${key}`, canonicalJson({ kind: "doc", name, key, value })]);

  const walk = await store.snapshot<WalkDoc>("kiln.walk", feature);
  if (walk) {
    push("kiln.walk", feature, walk);
    for (const k of Object.keys(walk.moves ?? {})) keys.add(k);
    if (walk.admittedBy) keys.add(walk.admittedBy);
  }
  const gateIds: string[] = [];
  for (const fam of DOC_FAMILIES) {
    for (const d of await store.docs<Record<string, unknown>>(fam)) {
      if (!d.key.startsWith(gatePrefix)) continue;
      push(fam, d.key, d.value);
      if (fam === "kiln.gate") gateIds.push(d.key);
      if (fam === "kiln.move") { const m = d.value as { record?: { key: string } | null; withdrawn?: { key: string } }; if (m.record) keys.add(m.record.key); if (m.withdrawn) keys.add(m.withdrawn.key); }
    }
  }
  for (const c of await store.docs<{ key?: string }>("kiln.command")) if (c.key.startsWith(`walk:${feature}:`) || c.key === walk?.admittedBy) push("kiln.command", c.key, c.value);

  // the feature\'s tasks: its row, what the row owns (units), and the gate and decision tasks of its gates
  const all = await store.tasks();
  const row = all.find((t) => t.kind === "kiln.row" && (t.input as { feature?: string } | null)?.feature === feature);
  const mine = new Map<number, TaskLite>();
  if (row) mine.set(row.id, row);
  for (let grown = true; grown; ) {
    grown = false;
    for (const t of all) if (!mine.has(t.id) && t.owner !== null && mine.has(t.owner)) { mine.set(t.id, t); grown = true; }
  }
  for (const t of all) if ((t.kind === "kiln.gate" || t.kind === "kiln.decision") && gateIds.includes((t.input as { gateId?: string } | null)?.gateId ?? "")) mine.set(t.id, t);
  for (let grown = true; grown; ) { // the decision tasks are owned by their gate tasks
    grown = false;
    for (const t of all) if (!mine.has(t.id) && t.owner !== null && mine.has(t.owner)) { mine.set(t.id, t); grown = true; }
  }
  const taskLines = [...mine.values()].sort((a, b) => a.id - b.id).map((t) => canonicalJson({ kind: "task", id: t.id, taskKind: t.kind, owner: t.owner, status: t.status, input: t.input, checkpoint: t.checkpoint ?? null, outcome: t.outcome ?? null }));

  const events: Event[] = await collect(readRun(fromReader(store), feature));
  const eventLines = events.map((e) => canonicalJson({ kind: "event", event: e }));

  const refs = new Set<string>();
  for (const e of events) for (const [k, v] of Object.entries(e.data as Record<string, unknown>)) if (k.endsWith("Ref") && typeof v === "string" && parseRef(v)) refs.add(v);
  const textLines: string[] = [];
  for (const ref of [...refs].sort()) {
    const text = await resolveRef(store, ref);
    if (text !== undefined) textLines.push(canonicalJson({ kind: "text", ref, digest: digestOf(text), text }));
  }

  docLines.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const counts: ArchiveCounts = { docs: docLines.length, tasks: taskLines.length, events: eventLines.length, texts: textLines.length };
  const header = canonicalJson({ kind: "header", format: 1, feature, headSeq: events.length ? events[events.length - 1].seq : 0, ...counts });
  return { feature, lines: [header, ...docLines.map((d) => d[1]), ...taskLines, ...eventLines, ...textLines], counts, keys: [...keys].sort() };
}

/** Writes the archive so a reader sees nothing, or the whole file. The name carries the first eight hex digits of the checksum. Idempotent: the same content gives the same file. */
export function writeArchive(store: string, content: ArchiveContent): ArchivedFile {
  const text = content.lines.map((l) => `${l}\n`).join("");
  const sha256 = sha256Hex(text);
  const name = `${content.feature.replace(/[^A-Za-z0-9._-]/g, "_")}-${sha256.slice(0, 8)}.kiln-archive`;
  mkdirSync(archiveDir(store), { recursive: true });
  const path = archivePath(store, name);
  const tmp = `${path}.tmp-${process.pid}`;
  const fd = openSync(tmp, "w");
  try {
    writeSync(fd, text);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, path);
  return { name, sha256, bytes: Buffer.byteLength(text, "utf8") };
}

export class ArchiveError extends Error {
  readonly code: "archive-checksum-mismatch" | "archive-missing" | "archive-malformed";
  constructor(code: ArchiveError["code"], message: string) {
    super(`${code}: ${message}`);
    this.name = "ArchiveError";
    this.code = code;
  }
}

/** Re-reads the file and recomputes its checksum and counts; throws by name when anything differs from what was recorded. */
export function verifyArchive(store: string, file: ArchivedFile, counts?: ArchiveCounts): void {
  const path = archivePath(store, file.name);
  if (!existsSync(path)) throw new ArchiveError("archive-missing", `${file.name} does not exist beside the store`);
  const text = readFileSync(path, "utf8");
  const sha = sha256Hex(text);
  if (sha !== file.sha256) throw new ArchiveError("archive-checksum-mismatch", `${file.name} hashes to ${sha.slice(0, 12)}…, recorded ${file.sha256.slice(0, 12)}…`);
  if (Buffer.byteLength(text, "utf8") !== file.bytes) throw new ArchiveError("archive-checksum-mismatch", `${file.name} is ${Buffer.byteLength(text, "utf8")} bytes, recorded ${file.bytes}`);
  if (counts) {
    const got = readArchiveText(text).header;
    for (const k of ["docs", "tasks", "events", "texts"] as const) if (got[k] !== counts[k]) throw new ArchiveError("archive-malformed", `the header says ${got[k]} ${k}, the export held ${counts[k]}`);
  }
}

export interface ArchiveRead { header: Record<string, any>; docs: any[]; tasks: any[]; events: Event[]; texts: { ref: string; digest: string; text: string }[] }
function readArchiveText(text: string): ArchiveRead {
  const out: ArchiveRead = { header: {}, docs: [], tasks: [], events: [], texts: [] };
  for (const line of text.split("\n").filter(Boolean)) {
    const r = JSON.parse(line);
    if (r.kind === "header") out.header = r;
    else if (r.kind === "doc") out.docs.push(r);
    else if (r.kind === "task") out.tasks.push(r);
    else if (r.kind === "event") out.events.push(r.event);
    else if (r.kind === "text") out.texts.push(r);
    else throw new ArchiveError("archive-malformed", `unknown line kind ${JSON.stringify(r.kind)}`);
  }
  return out;
}
export function readArchive(store: string, name: string): ArchiveRead {
  const path = archivePath(store, name);
  if (!existsSync(path)) throw new ArchiveError("archive-missing", `${name} does not exist beside the store`);
  return readArchiveText(readFileSync(path, "utf8"));
}
