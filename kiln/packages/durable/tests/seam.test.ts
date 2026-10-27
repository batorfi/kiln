// r13 T044 — one seam (spec US4, FR-001, FR-002, SC-006, SC-010): (a) the library is named ONLY under packages/durable/src/library/ — in source AND in tests; (b) the package's exported
// declarations contain none of its names; (c) the models object has no provider and nothing in the tree can make a model request. The boundary check enforces (a) at package level; this test
// tightens it to the directory.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { moduleLoads, tokenize } from "#checks/lex.ts";

const KILN = fileURLToPath(new URL("../../..", import.meta.url));
const PACKAGES = join(KILN, "packages");
const DURABLE_SRC = join(PACKAGES, "durable", "src");
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (f === "node_modules" ? [] : statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith(".ts") ? [join(d, f)] : []));
const rel = (f: string) => relative(KILN, f).split(sep).join("/");
const LIBRARY = /^@earendil-works\//;

test("(a) the library is imported ONLY from packages/durable/src/library/ — every package, source and tests", () => {
  const all = walk(PACKAGES);
  assert.ok(all.length > 60, `scanned ${all.length} files`);
  const offenders: string[] = [];
  let inLibrary = 0;
  for (const f of all) {
    const named = moduleLoads(tokenize(readFileSync(f, "utf8"))).filter((l) => l.specifier && LIBRARY.test(l.specifier));
    if (named.length === 0) continue;
    if (rel(f).startsWith("packages/durable/src/library/")) inLibrary++;
    else offenders.push(`${rel(f)} imports ${named.map((l) => l.specifier).join(", ")}`);
  }
  assert.deepEqual(offenders, [], "the seam is the only door");
  assert.ok(inLibrary >= 4, `expected the library to be used by the façade (found ${inLibrary} files)`);
});

test("(b) the package's exported declarations contain NO name of the library (SC-010)", () => {
  const FORBIDDEN = /@earendil-works|pi-durable|pi-ai\b|\bHarness\b|\bdefineTask\b|\bdefineExtension\b|\bdefineDocFamily\b|sleepUntil|abortTask|waitForTask|runtime\.commit|createModels|openNodeSqliteStorage/;
  // every file outside library/ is part of the public face; library/ is the only place allowed to know
  const faces = walk(DURABLE_SRC).filter((f) => !rel(f).startsWith("packages/durable/src/library/"));
  assert.ok(faces.length >= 20, `scanned ${faces.length} files`);
  for (const f of faces) assert.doesNotMatch(tokenize(readFileSync(f, "utf8")).code, FORBIDDEN, `${rel(f)} names the library`);
  // and the barrel exports something real
  assert.match(readFileSync(join(DURABLE_SRC, "index.ts"), "utf8"), /export \{ openFactory \}/);
});

test("(c) no provider is ever registered, and nothing under the tree can make a model request", () => {
  const open = tokenize(readFileSync(join(DURABLE_SRC, "library", "open.ts"), "utf8")).code;
  assert.match(open, /createModels\(\)/, "the models object is built with no argument");
  for (const f of walk(PACKAGES)) {
    const code = tokenize(readFileSync(f, "utf8")).code;
    if (rel(f).includes("/tests/") && /seam\.test\.ts$/.test(f)) continue; // this file names the patterns
    assert.doesNotMatch(code, /\.setProvider\s*\(|\bregisterProvider\s*\(|pi-ai\/providers|\bopenaiProvider\b|\banthropicProvider\b|\bcomplete\s*\(\s*model/, `${rel(f)} registers a provider or requests a model`);
    for (const l of moduleLoads(tokenize(readFileSync(f, "utf8")))) if (l.specifier && /^@earendil-works\/pi-ai/.test(l.specifier)) assert.equal(l.specifier, "@earendil-works/pi-ai/models", `${rel(f)} imports ${l.specifier}`);
  }
});

test("the layer rules hold in the code that exists: durable imports only contracts and record (never lane), and nothing outside durable imports its library directory", () => {
  for (const f of walk(DURABLE_SRC)) for (const l of moduleLoads(tokenize(readFileSync(f, "utf8")))) {
    assert.doesNotMatch(l.specifier ?? "", /^#(lane|workers|director|server|cli)\//, `${rel(f)} imports upward: ${l.specifier}`);
  }
  for (const f of walk(PACKAGES)) {
    if (rel(f).startsWith("packages/durable/")) continue;
    for (const l of moduleLoads(tokenize(readFileSync(f, "utf8")))) assert.doesNotMatch(l.specifier ?? "", /^#durable\/library\//, `${rel(f)} reaches into the façade: ${l.specifier}`);
  }
});
