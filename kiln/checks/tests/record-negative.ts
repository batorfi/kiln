// The negative suite of `kiln check record` (contracts/check-record.md §3). Each member is a deliberately broken catalog, source set or schema-file set, built by mutating a CLONE of the shipped
// data, and must be refused with the code it was built for and no other. A permissive stub check must FAIL the suite — the suite is shown able to fail.
import { catalog as shipped, schemaFiles, type CatalogEntry } from "#contracts/events/catalog/index.ts";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { Event } from "#contracts/events/types.ts";
import { loadWalks, type WalkSet, type WalkStream } from "#record/replay.ts";
import { shippedSources, type RecordCheckOptions, type SourceFile } from "../record.ts";

export type Catalog = Map<string, CatalogEntry>;
/** A deep copy of the shipped catalog (schemas cloned through JSON; upcasters kept by reference). */
export const cloneCatalog = (): Catalog => new Map([...shipped].map(([k, e]) => [k, { ...e, versions: JSON.parse(JSON.stringify(e.versions)) }]));
const WALKS = fileURLToPath(new URL("../../fixtures/walks", import.meta.url));
export const pristine = (): RecordCheckOptions => ({ catalog: cloneCatalog(), sources: shippedSources(), files: schemaFiles(shipped), walks: loadWalks(WALKS) });

export interface Member {
  code: string;
  /** Every code the member is built to produce (default: just `code`): a broken stream often breaks the replay too. Anything outside the set is noise and fails the suite. */
  codes?: string[];
  rule: string;
  /** Builds the options for the check; the pristine options are the starting point. */
  break: (o: RecordCheckOptions) => RecordCheckOptions;
}
/** Mutates one type of the catalog and skips the schema-file comparison, so only the mutation's own code can be reported. */
const withType = (o: RecordCheckOptions, type: string, f: (e: CatalogEntry) => void): RecordCheckOptions => {
  f((o.catalog as Catalog).get(type)!);
  return { ...o, files: null };
};


// ── members about the committed walks (part 2): each edits a CLONE of the loaded streams and keeps the stream's own hashes consistent, so only the intended fault is in the data ──
const sha = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");
/** Replaces one stream of the set with `edit` applied to its events (parsed), re-serialised and re-hashed. */
function restream(o: RecordCheckOptions, name: string, edit: (events: Event[]) => Event[]): RecordCheckOptions {
  const walks = o.walks as WalkSet;
  const streams = walks.streams.map((w): WalkStream => {
    if (w.meta.name !== name) return w;
    const eventsText = edit(w.eventsText.split("\n").filter(Boolean).map((l) => JSON.parse(l))).map((e) => `${JSON.stringify(e)}\n`).join("");
    return { ...w, eventsText, meta: { ...w.meta, eventsSha256: sha(eventsText) } };
  });
  return { ...o, walks: { ...walks, streams } };
}
const mapEvent = (i: number, f: (e: Event) => Event) => (events: Event[]): Event[] => events.map((e, k) => (k === i ? f(e) : e));

function walkMembers(): Member[] {
  const R7 = "r7-live-inference";
  return [
    { code: "record-vacuous", rule: "no committed walks to replay", break: (o) => ({ ...o, walks: { streams: [], missing: Object.fromEntries(["r1", "r2", "r3", "r7", "r8"].map((r) => [r, "none captured"])) } }) },
    { code: "walk-missing-unexplained", rule: "a named row neither replayed nor listed missing", break: (o) => { const w = o.walks as WalkSet; const missing = { ...w.missing }; delete missing.r8; return { ...o, walks: { ...w, missing } }; } },
    { code: "replay-differs", rule: "a converted stream altered by one value", break: (o) => restream(o, R7, mapEvent(0, (e) => ({ ...e, data: { ...(e.data as object), reason: "a different reason" } }))) },
    {
      code: "replay-verdict-differs", codes: ["replay-verdict-differs", "stream-silent-approval"], rule: "the stream kept because it fails, claimed valid",
      break: (o) => ({ ...o, walks: { ...(o.walks as WalkSet), streams: (o.walks as WalkSet).streams.map((w) => (w.meta.name === "r7-live-broken" ? { ...w, meta: { ...w.meta, expect: "valid" as const } } : w)) } }),
    },
    { code: "stream-gap", codes: ["stream-gap", "replay-differs"], rule: "sequence numbers 1,2,4…", break: (o) => restream(o, R7, (events) => events.filter((_, i) => i !== 3)) },
    { code: "stream-time-backwards", codes: ["stream-time-backwards", "replay-differs", "replay-verdict-differs"], rule: "an event earlier than its predecessor", break: (o) => restream(o, R7, mapEvent(4, (e) => ({ ...e, time: "2026-09-13T00:00:30.000Z" }))) },
    {
      code: "stream-silent-approval", codes: ["stream-silent-approval", "replay-differs", "replay-verdict-differs"], rule: "a gate completion with no human and no delegation",
      break: (o) => restream(o, "r3-program-walk", mapEvent(4, (e) => { const { decidedBy: _d, ...rest } = e.data as Record<string, unknown>; return { ...e, data: rest }; })),
    },
    { code: "stream-delegation-merged", codes: ["stream-delegation-merged", "replay-differs"], rule: "a delegation decided as a person's move", break: (o) => restream(o, R7, mapEvent(7, (e) => ({ ...e, actor: "delegation:d1" }))) },
    { code: "stream-content-key", codes: ["stream-content-key", "replay-event-invalid", "replay-differs"], rule: "a note in an event's data", break: (o) => restream(o, R7, mapEvent(7, (e) => ({ ...e, data: { ...(e.data as object), note: "redo" } }))) },
    { code: "causation-chain-broken", codes: ["causation-chain-broken", "replay-event-invalid", "replay-differs"], rule: "a cause that is not an earlier event", break: (o) => restream(o, R7, mapEvent(5, (e) => ({ ...e, causation: "evt:99" }))) },
  ];
}

export const NEGATIVE: Member[] = [
  { code: "record-vacuous", rule: "an empty catalog", break: (o) => ({ ...o, catalog: new Map(), sources: [{ file: "x.ts", text: "// commits nothing" }], files: null }) },
  { code: "record-vacuous", rule: "no source files to scan", break: (o) => { for (const e of (o.catalog as Catalog).values()) e.emitted = false; return { ...o, sources: [], files: null }; } },
  { code: "catalog-schema-open", rule: "a schema that allows additional properties", break: (o) => withType(o, "walk.completed", (e) => { (e.versions[1] as any).additionalProperties = true; }) },
  { code: "catalog-forbidden-key", rule: "a schema that declares a `note` field", break: (o) => withType(o, "walk.completed", (e) => { (e.versions[1] as any).properties.note = { type: "string" }; }) },
  { code: "catalog-forbidden-key", rule: "a schema that declares a `url` field", break: (o) => withType(o, "gate.opened", (e) => { (e.versions[1] as any).properties.url = { type: "string" }; }) },
  { code: "catalog-upcaster-missing", rule: "a version 2 with no upcaster from version 1", break: (o) => withType(o, "walk.completed", (e) => { e.current = 2; e.versions[2] = e.versions[1]; }) },
  { code: "catalog-schema-missing", rule: "a current version with no schema", break: (o) => withType(o, "walk.completed", (e) => { e.current = 3; e.upcast = { 1: (x) => x, 2: (x) => x }; }) },
  {
    code: "catalog-unknown-emitted",
    rule: "source commits a type the catalog does not have",
    break: (o) => ({ ...o, sources: [...(o.sources as SourceFile[]), { file: "packages/durable/src/rogue.ts", text: 'await appendEvent(tx, { type: "gate.exploded", subject: "f", at: 1, actor: "system", cause: "k", data: {} });' }] }),
  },
  { code: "catalog-dead-type", rule: "a type marked emitted that no file commits", break: (o) => { (o.catalog as Catalog).set("gate.orphaned", { ...(o.catalog as Catalog).get("gate.opened")!, type: "gate.orphaned" }); return { ...o, files: null }; } },
  { code: "catalog-schemas-stale", rule: "a committed schema file that differs from the catalog", break: (o) => { const f = { ...(o.files as Record<string, string>) }; f["gate.opened.1.json"] = f["gate.opened.1.json"].replace('"briefRef"', '"briefReference"'); return { ...o, files: f }; } },
  ...walkMembers(),
  { code: "catalog-schemas-stale", rule: "a catalog type with no committed schema file", break: (o) => { const f = { ...(o.files as Record<string, string>) }; delete f["walk.completed.1.json"]; return { ...o, files: f }; } },
];

/** What a checker answers about one set of options: pass/fail and the codes it reported. */
export type Checker = (o: RecordCheckOptions) => { ok: boolean; codes: string[] };

export interface SuiteResult {
  accepted: Member[];
  wrongCode: { member: Member; reported: string[] }[];
  noise: { member: Member; unexpected: string[] }[];
  missed: string[];
}
export const ALL_CODES = [...new Set(NEGATIVE.map((m) => m.code))];

export function runNegativeSuite(check: Checker): SuiteResult {
  const res: SuiteResult = { accepted: [], wrongCode: [], noise: [], missed: [] };
  for (const m of NEGATIVE) {
    const r = check(m.break(pristine()));
    if (r.ok) res.accepted.push(m);
    else if (!r.codes.includes(m.code)) res.wrongCode.push({ member: m, reported: r.codes });
    else {
      const allowed = new Set(m.codes ?? [m.code]);
      const unexpected = [...new Set(r.codes)].filter((c) => !allowed.has(c));
      if (unexpected.length) res.noise.push({ member: m, unexpected });
    }
  }
  return res;
}
