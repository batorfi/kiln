// The negative suite of `kiln check record` (contracts/check-record.md §3). Each member is a deliberately broken catalog, source set or schema-file set, built by mutating a CLONE of the shipped
// data, and must be refused with the code it was built for and no other. A permissive stub check must FAIL the suite — the suite is shown able to fail.
import { catalog as shipped, schemaFiles, type CatalogEntry } from "#contracts/events/catalog/index.ts";
import { shippedSources, type RecordCheckOptions, type SourceFile } from "../record.ts";

export type Catalog = Map<string, CatalogEntry>;
/** A deep copy of the shipped catalog (schemas cloned through JSON; upcasters kept by reference). */
export const cloneCatalog = (): Catalog => new Map([...shipped].map(([k, e]) => [k, { ...e, versions: JSON.parse(JSON.stringify(e.versions)) }]));
export const pristine = (): RecordCheckOptions => ({ catalog: cloneCatalog(), sources: shippedSources(), files: schemaFiles(shipped) });

export interface Member {
  code: string;
  rule: string;
  /** Builds the options for the check; the pristine options are the starting point. */
  break: (o: RecordCheckOptions) => RecordCheckOptions;
}
/** Mutates one type of the catalog and skips the schema-file comparison, so only the mutation's own code can be reported. */
const withType = (o: RecordCheckOptions, type: string, f: (e: CatalogEntry) => void): RecordCheckOptions => {
  f((o.catalog as Catalog).get(type)!);
  return { ...o, files: null };
};

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
      const unexpected = [...new Set(r.codes)].filter((c) => c !== m.code);
      if (unexpected.length) res.noise.push({ member: m, unexpected });
    }
  }
  return res;
}
