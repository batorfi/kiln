// kiln/tests/netscan/bypass.test.ts — CR-4 (code review), r7 · OFFLINE tier.
// The P-VIII scan is a LINT, not a sandbox — but it must at least not be fooled by ordinary code shapes. Each case
// below evaded the first version of the scan (reproduced in the code-review report): a `//` or `/*` inside a string
// made the comment-stripper delete a LATER network call, and subdirectories / non-`.ts` files were never visited.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanText, zeroNetworkScan, tokenize } from "../../validate/_netscan.ts";

const P = "/x/kiln/src/planted.ts";
const caught = (src: string, path = P) => scanText(src, path).length >= 1;

test("CR-4 A–C: a `//` or `/*` INSIDE A STRING no longer hides a later network call", () => {
  assert.ok(caught('const p = "a//b"; export const go = () => fetch(u);'), "A: // inside a double-quoted string");
  assert.ok(caught("const p = 'a//b'; export const go = () => fetch(u);"), "A': // inside a single-quoted string");
  assert.ok(caught('const a = "/*"; export const go = () => fetch(u); const b = "*/";'), "B: /* … */ split across two strings");
  assert.ok(caught("const t = `x//y`; export const go = () => fetch(u);"), "C: // inside a template literal");
  assert.ok(caught("const t = `${fetch(u)}`;"), "a call INSIDE a template expression is code, so it is caught");
  assert.ok(caught("const r = /[\"']/; export const go = () => fetch(u);"), "a regex literal containing quotes must not swallow the rest of the line");
  assert.ok(caught("const q = a / b; export const go = () => fetch(u); // c"), "division is not a regex");
});

test("CR-4 D–E: the cheap evasions are flagged — aliasing, and computed access to the global object", () => {
  assert.ok(caught("const f = globalThis.fetch; export const go = () => f(u);"), "E: fetch aliased first");
  assert.ok(caught("const { fetch } = globalThis; export const go = () => fetch;"), "E': destructured out of the global");
  assert.ok(caught('export const go = () => (globalThis as any)["fe" + "tch"](u);'), "D: computed property access on the global object");
  assert.ok(caught("const m = await import(name);"), "a COMPUTED dynamic import can load anything");
  assert.ok(caught("const m = require(name);"), "a COMPUTED require can load anything");
});

test("CR-4: prose and data are still not code — no false positives from comments, strings or regex literals", () => {
  for (const src of [
    "// fetch(u) is forbidden here",
    "/* http.request(o) */ export const a = 1;",
    'export const msg = "never call fetch(url) or http.request(opts)";',
    "export const re = /\\bfetch\\s*\\(/;",
    "export const t = `we do not fetch(x) at ${1 + 1}`;",
    "export const url = new URL('../src', import.meta.url);",
  ]) assert.deepEqual(scanText(src, P), [], `must be clean: ${src}`);
});

test("CR-4: the tokenizer keeps strings in `code` (for specifiers/URLs) and blanks them in `blanked` (for call detection)", () => {
  const t = tokenize('const s = "fetch(x)"; // c\nfetch(y);');
  assert.match(t.code, /"fetch\(x\)"/, "string content is preserved in `code`");
  assert.doesNotMatch(t.blanked, /fetch\(x\)/, "…and blanked for call detection");
  assert.match(t.blanked, /fetch\(y\)/, "real code survives");
  assert.doesNotMatch(t.code, /\/\/ c/, "comments are gone");
});

test("CR-4 F: the scan recurses into SUBDIRECTORIES and covers .js/.mjs/.cjs — a new folder is not a blind spot", (t) => {
  const root = mkdtempSync(join(tmpdir(), "kiln-netscan-rec-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "src", "adapters", "deep"), { recursive: true });
  writeFileSync(join(root, "src", "ok.ts"), "export const a = 1;\n");
  writeFileSync(join(root, "src", "adapters", "planted.ts"), 'export const go = () => fetch("https://api.example.com");\n');
  writeFileSync(join(root, "src", "adapters", "deep", "planted.js"), 'export const go = () => fetch("https://api.example.com");\n');
  writeFileSync(join(root, "src", "plant.mjs"), 'import http from "node:http"; export default http;\n');
  writeFileSync(join(root, "src", "plant.cjs"), 'const s = require("node:net"); module.exports = s;\n');
  const r = zeroNetworkScan([join(root, "src")], "ok");
  assert.equal(r.ok, false);
  assert.equal(r.filesScanned, 5, "every file at every depth was examined");
  for (const f of ["adapters/planted.ts", "adapters/deep/planted.js", "plant.mjs", "plant.cjs"]) assert.match(r.detail, new RegExp(f.replace(/[./]/g, "\\$&")), `${f} named`);
});

test("CR-4: the allowlist key is the path RELATIVE TO THE SCAN ROOT — a same-named file elsewhere never inherits it", (t) => {
  const root = mkdtempSync(join(tmpdir(), "kiln-netscan-key-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const RES = "export const go = (h: string) => fetch(`http://${h}/api/chat`);\n";
  for (const d of ["src", "ui/src", "src/sub"]) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, "src", "ollama-resident.ts"), RES); // the ONE allowed path
  const only = zeroNetworkScan([join(root, "src")], "ok");
  assert.equal(only.ok, true, `the allowlisted path passes: ${only.detail}`);
  writeFileSync(join(root, "src", "sub", "ollama-resident.ts"), RES); // same basename, nested
  assert.equal(zeroNetworkScan([join(root, "src")], "ok").ok, false, "src/sub/ollama-resident.ts must NOT inherit the exemption");
  rmSync(join(root, "src", "sub"), { recursive: true });
  writeFileSync(join(root, "ui", "src", "ollama-resident.ts"), RES); // a `src` directory nested under another root
  assert.equal(zeroNetworkScan([join(root, "ui")], "ok").ok, false, "ui/src/ollama-resident.ts must NOT inherit it either");
});

test("CR-8: Windows-style paths do not break the allowlist", () => {
  const RES = "export const go = (h: string) => fetch(`http://${h}/api`);";
  assert.deepEqual(scanText(RES, "C:\\repo\\kiln\\src\\ollama-resident.ts"), [], "backslash separators");
  assert.deepEqual(scanText(RES, "C:\\repo\\kiln\\src/ollama-resident.ts"), [], "mixed separators (a joined path)");
  assert.ok(scanText(RES, "C:\\repo\\kiln\\ui\\ollama-resident.ts").length >= 1, "…while a different directory is still flagged");
});
