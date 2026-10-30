// The catalog as files (research R1): `kiln/schemas/events/<type>.<n>.json`, one per type and version, generated from the data so a person or a tool outside KILN can read the shapes.
// `kiln check record` keeps the committed files equal to this output; `tests/tools/gen-event-schemas.ts` writes them. Pure: names and text only.
import type { CatalogEntry } from "./builder.ts";

/** JSON with sorted keys and a one-space indent, ending in a newline: the same data always gives the same bytes. */
export function canonicalPretty(v: unknown, indent = ""): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  const next = `${indent} `;
  if (Array.isArray(v)) return v.length === 0 ? "[]" : `[\n${v.map((x) => `${next}${canonicalPretty(x, next)}`).join(",\n")}\n${indent}]`;
  const keys = Object.keys(v).sort();
  return keys.length === 0 ? "{}" : `{\n${keys.map((k) => `${next}${JSON.stringify(k)}: ${canonicalPretty((v as Record<string, unknown>)[k], next)}`).join(",\n")}\n${indent}}`;
}

export function schemaFiles(catalog: ReadonlyMap<string, CatalogEntry>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of catalog.values()) {
    for (const [n, schema] of Object.entries(e.versions)) {
      out[`${e.type}.${n}.json`] = canonicalPretty({ $id: `kiln:event:${e.type}/${n}`, title: `${e.type} (version ${n})`, ...(schema as object) }) + "\n";
    }
  }
  return out;
}
