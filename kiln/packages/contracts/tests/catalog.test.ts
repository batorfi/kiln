import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog, type JsonSchema } from "#contracts/events/catalog/index.ts";
import { FORBIDDEN_KEYS } from "#contracts/events/grammar.ts";

/** Every object schema reachable from `s`, with its path. */
function objects(s: JsonSchema, path: string, out: { path: string; s: JsonSchema }[] = []): { path: string; s: JsonSchema }[] {
  if (s.type === "object") out.push({ path, s });
  const props = s.properties as Record<string, JsonSchema> | undefined;
  for (const [k, v] of Object.entries(props ?? {})) objects(v, `${path}.${k}`, out);
  if (s.items) objects(s.items as JsonSchema, `${path}[]`, out);
  if (s.additionalProperties && typeof s.additionalProperties === "object") objects(s.additionalProperties as JsonSchema, `${path}.*`, out);
  for (const b of (s.oneOf as JsonSchema[] | undefined) ?? []) objects(b, path, out);
  return out;
}

test("the catalog is not empty and every entry names a current version that has a schema", () => {
  assert.ok(catalog.size >= 20, `${catalog.size} types`);
  for (const [type, e] of catalog) {
    assert.equal(e.type, type);
    assert.ok(Number.isInteger(e.current) && e.current >= 1, type);
    assert.ok(e.versions[e.current], `${type}: no schema for its current version`);
    for (let v = 1; v < e.current; v++) assert.ok(e.upcast?.[v], `${type}: version ${v} has no upcaster`);
  }
});
test("every object schema is closed: an unknown field — content included — is refused (R5)", () => {
  for (const [type, e] of catalog) {
    for (const { path, s } of objects(e.versions[e.current], type)) {
      if (path.endsWith(".applicability")) continue; // a map keyed by gate: its VALUES are closed objects, checked as `.*`
      assert.equal(s.additionalProperties, false, `${path} is open`);
    }
  }
});
test("no schema declares a forbidden key", () => {
  for (const [type, e] of catalog) {
    for (const { path, s } of objects(e.versions[e.current], type)) {
      for (const k of Object.keys((s.properties as object) ?? {})) assert.ok(!FORBIDDEN_KEYS.includes(k), `${path} declares the forbidden key "${k}"`);
    }
  }
});
test("type names are lower-case words joined by '.' and '-'", () => {
  for (const type of catalog.keys()) assert.match(type, /^[a-z]+(\.[a-z]+(-[a-z]+)*)$/, type);
});
