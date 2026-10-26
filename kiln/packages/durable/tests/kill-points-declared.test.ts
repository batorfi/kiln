// r13 T037 — the declared kill points are the points the source uses, no more and no fewer (research R7): a point cannot be forgotten, and one cannot be invented in the source without being
// declared (and so being proven). Also: no environment variable is read anywhere under src/ — nothing in the product can kill or fault a factory.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FAULT_POINTS, KILL_POINTS } from "#durable/hooks.ts";
import { moduleLoads, tokenize } from "#checks/lex.ts";

const SRC = fileURLToPath(new URL("../src", import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith(".ts") ? [join(d, f)] : []));
const files = walk(SRC);
const strip = (t: string): string => tokenize(t).code; // comments removed, strings kept

test("the set of names passed to hooks.at / hooks.fault in src/ EQUALS the declared lists", () => {
  const used = new Set<string>();
  for (const f of files) for (const m of strip(readFileSync(f, "utf8")).matchAll(/\bhooks\s*\.\s*(?:at|fault)\s*\(\s*["'`]([^"'`]+)["'`]/g)) used.add(m[1]);
  const declared = new Set<string>([...KILL_POINTS, ...FAULT_POINTS]);
  const unused = [...declared].filter((p) => !used.has(p));
  const undeclared = [...used].filter((p) => !declared.has(p));
  assert.deepEqual(undeclared, [], `points used in the source but not declared (they would never be proven): ${undeclared.join(", ")}`);
  assert.deepEqual(unused, [], `points declared but not used anywhere in the source: ${unused.join(", ")}`);
  assert.ok(used.size >= 14, `scanned ${files.length} files and found only ${used.size} points`);
});

test("no hook is called with a computed name (every point is a literal the scan can see)", () => {
  for (const f of files) assert.doesNotMatch(strip(readFileSync(f, "utf8")), /\bhooks\s*\.\s*(?:at|fault)\s*\(\s*(?!["'`])/, f);
});

test("no environment variable is read anywhere under src/ — the product has no kill switch", () => {
  assert.ok(files.length >= 15);
  for (const f of files) assert.doesNotMatch(strip(readFileSync(f, "utf8")), /\bprocess\s*\.\s*env\b|\bimport\.meta\.env\b/, `${f} reads the environment`);
});

test("the declared lists have no duplicates", () => {
  assert.equal(new Set(KILL_POINTS).size, KILL_POINTS.length);
  assert.equal(new Set(FAULT_POINTS).size, FAULT_POINTS.length);
  void moduleLoads; // (imported for the lexer's side: keeps this file's dependency on the shared tokenizer explicit)
});
