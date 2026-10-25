// Code-review findings 1 and 3 (r12): the specifier scan reads every ordinary spelling of an import, and the scan roots leave no hole. Each case below passed
// `kiln check network` or `kiln check boundaries` in silence before the fix (reproduced through the CLI on a scratch tree). The lint is still a LINT — a
// determined attempt to hide a call is out of its reach (see network-lint.ts) — but the cheap shapes, the ones a formatter or a minifier produces, are not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkNetwork, scanTextDetailed } from "#checks/network-lint.ts";
import { checkBoundaries } from "#checks/boundaries.ts";
import { moduleLoads, moduleSpecifiers, tokenize } from "#checks/lex.ts";

const rules = JSON.parse(readFileSync(fileURLToPath(new URL("../boundaries.json", import.meta.url)), "utf8"));
const NONE = { schema: 1 as const, entries: [] };
const lintCodes = (src: string) => scanTextDetailed(src, "x.ts", [], "packages/lane/src/x.ts").map((o) => o.code);
const specs = (src: string) => moduleSpecifiers(tokenize(src));

/** A scratch kiln/ (with <tmp>/legacy beside it), every package carrying a responsibility. */
function scratch(files: Record<string, string>, run: (kilnDir: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "kiln-spell-"));
  try {
    const kiln = join(root, "kiln");
    const put = (p: string, text: string) => { mkdirSync(dirname(join(kiln, p)), { recursive: true }); writeFileSync(join(kiln, p), text); };
    const dirs = new Set<string>(["checks"]);
    for (const p of Object.keys(files)) { const m = /^packages\/([^/]+)\//.exec(p); if (m) dirs.add(`packages/${m[1]}`); }
    for (const d of dirs) put(`${d}/kiln.json`, JSON.stringify({ responsibility: "a scratch package" }));
    for (const [p, text] of Object.entries(files)) put(p, text);
    run(kiln);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const BASE = { "packages/contracts/src/a.ts": "export const a = 1;\n", "packages/lane/src/ok.ts": "export const ok = 1;\n" };

// ── the specifier scan ────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("S1 a literal specifier is read in every spelling the grammar allows", () => {
  const cases: [string, string][] = [
    ['import http from "node:http";', "node:http"],
    ['import{request}from"node:http";', "node:http"],
    ['export{request}from"node:http";', "node:http"],
    ['export * from"node:http";', "node:http"],
    ['const a = 1;import http from "node:http";', "node:http"],
    ['function f(){}import http from "node:http";', "node:http"],
    ['const m = await import ("node:http");', "node:http"],
    ['const m = await import\n(\n"node:http"\n);', "node:http"],
    ['const h = require ("http");', "http"],
    ["const m = await import(`node:http`);", "node:http"],
    ['const m = await import("node:http", { with: { type: "json" } });', "node:http"],
    ['import {\n a,\n b\n} from\n"left-pad";', "left-pad"],
    ['import type { A } from "left-pad";', "left-pad"],
    ['import"node:http";', "node:http"],
  ];
  for (const [src, want] of cases) assert.deepEqual(specs(src), [want], src);
});

test("S2 each spelling is refused by name: a network module is network-import, a package is network-external-dependency", () => {
  assert.deepEqual(lintCodes('import{request}from"node:http";'), ["network-import"]);
  assert.deepEqual(lintCodes('const m = await import ("node:http");'), ["network-import"]);
  assert.deepEqual(lintCodes('const h = require ("http");'), ["network-import"]);
  assert.deepEqual(lintCodes("const m = await import(`node:net`);"), ["network-import"]);
  assert.deepEqual(lintCodes('a();import http from "node:http";'), ["network-import"]);
  assert.deepEqual(lintCodes('import{x}from"left-pad";'), ["network-external-dependency"]);
});

test("S3 a load whose target is BUILT is network-computed, whatever it starts with", () => {
  for (const src of [
    'const m = await import("node:" + "http");',
    'const m = require("ht" + "tp");',
    'const m = await import("node:" + name);',
    "const m = await import(`node:${name}`);",
    "const m = await import(name);",
    "const m = require(name);",
    'const m = await import(cond ? "a" : "b");',
    'const m = require("./x".concat(y));',
  ]) assert.deepEqual(lintCodes(src), ["network-computed"], src);
});

test("S4 loads that are plain are NOT computed, and prose that looks like imports is still not code", () => {
  for (const src of [
    'const m = await import("./a.ts");',
    "const m = await import(`./a.ts`);",
    'const m = require("node:fs");',
    'const m = await import("./a.ts", { with: { type: "json" } });',
    "export const url = import.meta.url;",
    "export const o = { from: 1 }; export const p = Array.from([1]);",
    "export const from = 1;",
    "export const f = () => Array.from(xs);",
    "// import http from 'node:http'\n/* import('node:http') */ export const a = 1;",
    'export const s = "import http from \\"node:http\\"; import(\\"node:net\\")";',
    "export const t = `import x from 'node:http' ${1} import('node:net')`;",
  ]) assert.deepEqual(lintCodes(src), [], src);
});

test("S5 moduleLoads reports a computed load as null, in order, with the literal ones around it", () => {
  const loads = moduleLoads(tokenize('import a from "./a.ts";\nconst x = await import(name);\nconst y = require("./y.ts");\n'));
  assert.deepEqual(loads.map((l) => l.specifier), ["./a.ts", null, "./y.ts"]);
});

// ── the checks, end to end on a scratch tree ─────────────────────────────────────────────────────────────────────────────────────

test("S6 kiln check boundaries sees a forbidden import written without spaces", () => {
  scratch({ ...BASE, "packages/record/src/oops.ts": 'import{a}from"#lane/ok.ts";export const z=a;\n' }, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules });
    assert.deepEqual(r.failures.map((f) => f.code), ["boundary-forbidden-import"]);
    assert.equal(r.failures[0].file, "packages/record/src/oops.ts");
  });
});

test("S7 kiln check network sees import (\"node:http\") and a concatenated specifier, naming the file", () => {
  scratch({ ...BASE, "packages/lane/src/oops.ts": 'export const m = () => import ("node:http");\n' }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: NONE });
    assert.deepEqual(r.failures.map((f) => [f.code, f.file]), [["network-import", "packages/lane/src/oops.ts"]]);
  });
  scratch({ ...BASE, "packages/lane/src/oops.ts": 'export const m = () => import("node:" + "http");\n' }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: NONE });
    assert.deepEqual(r.failures.map((f) => [f.code, f.file]), [["network-computed", "packages/lane/src/oops.ts"]]);
  });
});

// ── the scan roots ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("S8 checks/ is scanned at any depth", () => {
  scratch({ ...BASE, "checks/lib/net.ts": 'export const x = () => fetch("http://example.com");\n' }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: NONE });
    assert.deepEqual(r.failures.map((f) => [f.code, f.file]), [["network-call", "checks/lib/net.ts"]]);
    assert.equal(r.scanned, 3);
  });
});

test("S9 a package's code outside src/, and inside a hidden directory, is scanned", () => {
  scratch({ ...BASE, "packages/lane/extra.ts": "fetch(u);\n" }, (k) => assert.equal(checkNetwork({ kilnDir: k, allowlist: NONE }).failures[0]?.file, "packages/lane/extra.ts"));
  scratch({ ...BASE, "packages/lane/src/.hidden/evil.ts": "fetch(u);\n" }, (k) => assert.equal(checkNetwork({ kilnDir: k, allowlist: NONE }).failures[0]?.file, "packages/lane/src/.hidden/evil.ts"));
});

test("S10 tests/ directories, test files, node_modules and .git are still not scanned", () => {
  scratch({
    ...BASE,
    "packages/lane/tests/x.test.ts": "fetch(u);\n", "packages/lane/src/y.test.ts": "fetch(u);\n", "checks/tests/z.ts": "fetch(u);\n",
    "packages/lane/node_modules/m/index.ts": "fetch(u);\n", "packages/lane/.git/hook.ts": "fetch(u);\n",
  }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: NONE });
    assert.deepEqual(r.failures, []);
    assert.equal(r.scanned, 2);
  });
});

test("S11 source importing from kiln/tests/ or kiln/fixtures/ is boundary-forbidden-import", () => {
  for (const target of ["../../../tests/pi-tier.ts", "../../../fixtures/walk.ts", "../../../package.json"]) {
    scratch({ ...BASE, "packages/lane/src/oops.ts": `import "${target}";\nexport const z = 1;\n` }, (k) => {
      const r = checkBoundaries({ kilnDir: k, rules });
      assert.deepEqual(r.failures.map((f) => f.code), ["boundary-forbidden-import"], target);
      assert.equal(r.failures[0].file, "packages/lane/src/oops.ts");
    });
  }
});

test("S12 a relative import inside its own package, or into an allowed package, still passes", () => {
  scratch({ ...BASE, "packages/lane/src/deep/b.ts": 'import { ok } from "../ok.ts"; import { a } from "../../../contracts/src/a.ts"; export const z = [ok, a];\n' }, (k) => {
    assert.deepEqual(checkBoundaries({ kilnDir: k, rules }).failures, []);
  });
});
