// `kiln check record` (r15, contracts/check-record.md): the record's catalog and the code that commits to it. Part 1 (this story): the catalog itself and the source against it. Later parts add the
// committed walks' replay. NEVER VACUOUS: a catalog with no types, or a tree with no source files, fails, and every run says how much it examined. It imports `contracts` and `record` only —
// it never loads `durable` or the library.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { catalog as shipped, schemaFiles, type CatalogEntry } from "#contracts/events/catalog/index.ts";
import { FORBIDDEN_KEYS } from "#contracts/events/grammar.ts";
import { loadWalks, replayAll, NAMED_ROWS, type WalkSet } from "#record/replay.ts";
import type { CheckResult } from "./index.ts";

export interface SourceFile {
  file: string;
  text: string;
}
export interface RecordCheckOptions {
  /** The catalog to check (default: the shipped one). Tests hand in mutated copies. */
  catalog?: ReadonlyMap<string, CatalogEntry>;
  /** The source files to scan for event types being committed (default: every package's src directory). */
  sources?: SourceFile[];
  /** The committed `schemas/events/*.json` by file name (default: read from disk); `null` skips the comparison. */
  files?: Record<string, string> | null;
  /** The committed walks to replay (default: `kiln/fixtures/walks`); `null` skips the replay. */
  walks?: WalkSet | null;
}

const KILN_DIR = fileURLToPath(new URL("..", import.meta.url));
const TYPE = String.raw`[a-z]+(?:-[a-z]+)*\.[a-z]+(?:-[a-z]+)*`;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".ts")) out.push(p);
  }
  return out;
}
export function shippedSources(): SourceFile[] {
  const root = join(KILN_DIR, "packages");
  return readdirSync(root)
    .map((p) => join(root, p, "src"))
    .filter((d) => existsSync(d))
    .flatMap((d) => walk(d))
    .map((f) => ({ file: relative(KILN_DIR, f), text: readFileSync(f, "utf8") }));
}
function shippedFiles(): Record<string, string> {
  const dir = join(KILN_DIR, "schemas", "events");
  return existsSync(dir) ? Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => [f, readFileSync(join(dir, f), "utf8")])) : {};
}

/**
 * Event types a file commits: every `type: "<group>.<verb>"` in a file that calls `appendEvent(` or builds an `OutboxIntent`, and every literal of a union named `…EventType`
 * (`type UnitEventType = "unit.queued" | …`) in such a file — a helper that takes the type as a parameter declares what it may be given.
 */
export function committedTypes(text: string): string[] {
  if (!/appendEvent\(|OutboxIntent/.test(text)) return [];
  const direct = [...text.matchAll(new RegExp(String.raw`\btype: "(${TYPE})"`, "g"))].map((m) => m[1]);
  const unions = [...text.matchAll(/\btype\s+\w*EventType\s*=\s*((?:\s*\|?\s*"[^"]+")+)/g)].flatMap((m) => [...m[1].matchAll(new RegExp(String.raw`"(${TYPE})"`, "g"))].map((x) => x[1]));
  return [...direct, ...unions];
}

function objectSchemas(s: Record<string, unknown>, path: string, out: { path: string; s: Record<string, unknown> }[] = []): { path: string; s: Record<string, unknown> }[] {
  if (s.type === "object") out.push({ path, s });
  for (const [k, v] of Object.entries((s.properties as Record<string, Record<string, unknown>>) ?? {})) objectSchemas(v, `${path}.${k}`, out);
  if (s.items) objectSchemas(s.items as Record<string, unknown>, `${path}[]`, out);
  if (s.additionalProperties && typeof s.additionalProperties === "object") objectSchemas(s.additionalProperties as Record<string, unknown>, `${path}.*`, out);
  for (const b of (s.oneOf as Record<string, unknown>[] | undefined) ?? []) objectSchemas(b, path, out);
  return out;
}

const WALKS_DIR = join(KILN_DIR, "fixtures", "walks");
const streamCode = (c: string): string => (c.startsWith("stream-") || c === "causation-chain-broken" || c === "record-vacuous" ? c : `stream-${c}`);

export function checkRecord(opts: RecordCheckOptions = {}): CheckResult {
  const catalog = opts.catalog ?? shipped;
  const sources = opts.sources ?? shippedSources();
  const files = opts.files === undefined ? shippedFiles() : opts.files;
  const walks = opts.walks === undefined ? loadWalks(WALKS_DIR) : opts.walks;
  const failures: CheckResult["failures"] = [];
  const fail = (code: string, detail: string, file?: string): void => void failures.push({ code, detail, ...(file ? { file } : {}) });

  if (catalog.size === 0) fail("record-vacuous", "the catalog has no event types: a check that examined nothing proves nothing");
  if (sources.length === 0) fail("record-vacuous", "there are no source files to scan: a check that examined nothing proves nothing");

  for (const [type, e] of catalog) {
    if (!e.versions[e.current]) fail("catalog-schema-missing", `${type}: no schema for its current version ${e.current}`);
    for (let v = 1; v < e.current; v++) if (!e.upcast?.[v]) fail("catalog-upcaster-missing", `${type}: version ${v} has no upcaster to ${v + 1}`);
    for (const [n, schema] of Object.entries(e.versions)) {
      for (const { path, s } of objectSchemas(schema as Record<string, unknown>, `${type}/${n}`)) {
        if (path.endsWith(".applicability") && typeof s.additionalProperties === "object") continue; // a map keyed by gate: its values are the closed objects, checked as `.*`
        if (s.additionalProperties !== false) fail("catalog-schema-open", `${path}: an object schema must be closed (additionalProperties: false) so a content field cannot slip in`);
        for (const k of Object.keys((s.properties as object) ?? {})) if (FORBIDDEN_KEYS.includes(k)) fail("catalog-forbidden-key", `${path} declares the forbidden key "${k}": facts and references only`);
      }
    }
  }

  const committed = new Map<string, string[]>();
  for (const f of sources) for (const t of committedTypes(f.text)) committed.set(t, [...(committed.get(t) ?? []), f.file]);
  for (const [t, where] of committed) if (!catalog.has(t)) fail("catalog-unknown-emitted", `${t} is committed but is not in the catalog`, where[0]);
  for (const [type, e] of catalog) if (e.emitted && !committed.has(type)) fail("catalog-dead-type", `${type} is marked emitted but no source file commits it`);

  if (files !== null) {
    const want = schemaFiles(catalog);
    for (const name of new Set([...Object.keys(want), ...Object.keys(files)])) {
      if (want[name] !== files[name]) fail("catalog-schemas-stale", `schemas/events/${name} ${name in files ? (name in want ? "differs from" : "has no type in") : "is missing from"} the catalog (run node tests/tools/gen-event-schemas.ts)`);
    }
  }

  // ── part 2: the first program's committed walks, replayed ──
  const notes = [`examined: ${catalog.size} types, ${sources.length} source files, ${committed.size} committed types`];
  if (walks !== null) {
    const summary = replayAll(walks);
    if (walks.streams.length === 0) fail("record-vacuous", "there are no committed walks to replay: a replay of no walks proves nothing");
    for (const r of summary.results) {
      for (const p of r.problems) fail(p.code, `${r.name}: ${p.detail}`);
      for (const f of r.streamFaults) fail(streamCode(f.code), `${r.name}: ${f.detail}`);
    }
    for (const row of summary.unexplained) fail("walk-missing-unexplained", `the row text names ${row}, but no stream of it is committed and MISSING.json gives no reason`);
    const missing = Object.entries(summary.missingRows).map(([r, why]) => `${r} (${why.split(":")[0]})`);
    const events = summary.results.reduce((n, r) => n + r.events, 0);
    notes.push(`walks: ${summary.replayedRows.length} of ${NAMED_ROWS.length} named rows replayed (${summary.replayedRows.join(", ") || "none"}), ${summary.results.length} streams, ${events} events${missing.length ? `; missing: ${missing.join(", ")}` : ""}`);
  }

  return {
    name: "record",
    ok: failures.length === 0,
    failures,
    scanned: sources.length,
    notes,
  };
}
