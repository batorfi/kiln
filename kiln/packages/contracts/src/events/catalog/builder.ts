// Small builders so a catalog entry reads like the table in data-model §2. Every object schema is closed (`additionalProperties: false`) — an unknown field, content included, is refused (R5).
export type JsonSchema = Record<string, unknown>;

export const str: JsonSchema = { type: "string" };
export const nonEmpty: JsonSchema = { type: "string", minLength: 1 };
export const int: JsonSchema = { type: "integer" };
export const bool: JsonSchema = { type: "boolean" };
export const strOrNull: JsonSchema = { oneOf: [{ type: "string" }, { type: "null" }] };
export const hexDigest: JsonSchema = { type: "string", pattern: "^[0-9a-f]{64}$" };
export const arrayOf = (items: JsonSchema): JsonSchema => ({ type: "array", items });
export const oneOfStr = (...values: string[]): JsonSchema => ({ type: "string", enum: values });

/** A closed object. `required` lists the keys that must be present; every other key in `props` is optional. */
export function obj(props: Record<string, JsonSchema>, required: string[] = Object.keys(props)): JsonSchema {
  return { type: "object", additionalProperties: false, properties: props, required };
}
/** The only way text is mentioned (FR-006): a locator and the SHA-256 of what it names. `prefix` names the pair, e.g. "note" → noteRef + noteDigest. */
export function contentPair(prefix: string): Record<string, JsonSchema> {
  return { [`${prefix}Ref`]: nonEmpty, [`${prefix}Digest`]: hexDigest };
}

export interface CatalogEntry {
  type: string;
  current: number;
  versions: Record<number, JsonSchema>;
  privacy: "public" | "internal" | "sensitive";
  /** True when some code in `kiln/packages` commits it. S (schema only) and L (legacy stream) types are false. */
  emitted: boolean;
  /** Upcasters from a numbered version (≥ 1) to the next. Version 0 → 1 is in upcast.ts. */
  upcast?: Record<number, (e: import("../types.ts").Event, ctx: import("../types.ts").Ctx) => import("../types.ts").Event>;
}
export const entry = (type: string, schema: JsonSchema, emitted = true, privacy: CatalogEntry["privacy"] = "internal"): CatalogEntry => ({ type, current: 1, versions: { 1: schema }, privacy, emitted });

/** The structured reason an interface gate does / does not apply (contracts/src/flow/applies.ts) — facts only; the sentence is re-rendered by whoever wants it. */
export const reasonSchema: JsonSchema = obj({
  rule: obj({ paths: arrayOf(str), labels: arrayOf(str), journeys: str, diff: arrayOf(str) }, []),
  evaluated: obj({ paths: oneOfStr("match", "no-match", "absent"), labels: oneOfStr("match", "no-match", "absent"), journeys: oneOfStr("match", "no-match", "absent"), diff: oneOfStr("match", "no-match", "absent") }, []),
  verdict: bool,
});
