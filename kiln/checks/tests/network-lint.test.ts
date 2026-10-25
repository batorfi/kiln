// The network lint's own behaviour (r12 T062), written first: each violation fails by its OWN NAME (contracts/cli-check.md), naming the file and
// the construct. Violations are planted in a temporary kiln-shaped tree — the real tree is never touched. Also the tokenizer's shared helpers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkNetwork } from "#checks/network-lint.ts";
import { moduleSpecifiers, tokenize } from "#checks/lex.ts";

/** A temporary kiln-shaped tree: `files` are paths relative to kiln/. */
function tree(files: Record<string, string>, run: (kilnDir: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "kiln-netlint-"));
  try {
    for (const [p, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, p)), { recursive: true });
      writeFileSync(join(root, p), text);
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const OK = { "packages/contracts/src/ok.ts": "export const ok = 1;\n" };
const codes = (r: ReturnType<typeof checkNetwork>) => r.failures.map((f) => f.code);
const NONE = { schema: 1 as const, entries: [] };

test("a clean tree passes, and reports how many files it scanned and the allowlist size", () => {
  tree(OK, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: NONE });
    assert.deepEqual(r.failures, []);
    assert.equal(r.name, "network");
    assert.equal(r.scanned, 1);
    assert.ok(r.notes.some((n) => /allowlist: 0 entries/.test(n)));
  });
});

test("fetch( fails network-call, naming the file and the construct", () => {
  tree({ ...OK, "packages/lane/src/oops.ts": 'export const go = () => fetch("https://example.com");\n' }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: NONE });
    assert.equal(r.ok, false);
    assert.deepEqual(codes(r), ["network-call"]);
    assert.equal(r.failures[0].file, "packages/lane/src/oops.ts");
    assert.match(r.failures[0].detail, /network CALL/);
  });
});

test("importing a network or process module fails network-import", () => {
  for (const spec of ["node:http", "node:https", "node:net", "node:child_process", "dns"]) {
    tree({ ...OK, "packages/record/src/x.ts": `import m from "${spec}"; export default m;\n` }, (k) => {
      const r = checkNetwork({ kilnDir: k, allowlist: NONE });
      assert.deepEqual(codes(r), ["network-import"], spec);
      assert.match(r.failures[0].detail, new RegExp(spec.replace(/[:.]/g, "\\$&")));
    });
  }
});

test("aliasing fetch fails network-alias", () => {
  for (const src of ["const f = globalThis.fetch; export const go = () => f(1);\n", "const { fetch } = globalThis; export const go = () => fetch;\n"]) {
    tree({ ...OK, "packages/workers/src/x.ts": src }, (k) => assert.deepEqual(codes(checkNetwork({ kilnDir: k, allowlist: NONE })), ["network-alias"], src));
  }
});

test('globalThis["fe" + "tch"] fails network-computed, and so does a computed import()', () => {
  tree({ ...OK, "packages/lane/src/x.ts": 'export const go = () => (globalThis as any)["fe" + "tch"](1);\n' }, (k) => {
    assert.deepEqual(codes(checkNetwork({ kilnDir: k, allowlist: NONE })), ["network-computed"]);
  });
  tree({ ...OK, "packages/lane/src/y.ts": "export const m = (name: string) => import(name);\n" }, (k) => {
    assert.deepEqual(codes(checkNetwork({ kilnDir: k, allowlist: NONE })), ["network-computed"]);
  });
});

test("an external (bare) dependency fails network-external-dependency", () => {
  tree({ ...OK, "packages/record/src/x.ts": 'import leftPad from "left-pad"; export default leftPad;\n' }, (k) => {
    assert.deepEqual(codes(checkNetwork({ kilnDir: k, allowlist: NONE })), ["network-external-dependency"]);
  });
});

test("a socket/server primitive fails network-call", () => {
  tree({ ...OK, "packages/lane/src/x.ts": "export const s = new WebSocket(u);\n" }, (k) => {
    assert.deepEqual(codes(checkNetwork({ kilnDir: k, allowlist: NONE })), ["network-call"]);
  });
});

test("a scan root with no source fails network-zero-files — never vacuous", () => {
  tree({ "packages/lane/README.md": "nothing to scan\n" }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: NONE });
    assert.equal(r.ok, false);
    assert.ok(codes(r).includes("network-zero-files"));
    assert.equal(r.scanned, 0);
  });
  tree({}, (k) => assert.ok(codes(checkNetwork({ kilnDir: k, allowlist: NONE })).includes("network-zero-files")));
});

test("fetch( inside a string, a comment, a template or a regex is not a violation", () => {
  const src = [
    "// never call fetch(url) or http.request(o)",
    "/* fetch(x) */",
    'export const msg = "do not fetch(url)";',
    "export const t = `we do not fetch(x) at ${1 + 1}`;",
    "export const re = /\\bfetch\\s*\\(/;",
  ].join("\n");
  tree({ ...OK, "packages/lane/src/prose.ts": src }, (k) => assert.deepEqual(checkNetwork({ kilnDir: k, allowlist: NONE }).failures, []));
});

test("test files and tests/ directories are not scanned (the lint reads source, not the tests that spawn git)", () => {
  tree({ ...OK, "packages/lane/tests/x.test.ts": "import { spawn } from 'node:child_process'; fetch(u);\n", "checks/tests/y.test.ts": "fetch(u);\n" }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: NONE });
    assert.deepEqual(r.failures, []);
    assert.equal(r.scanned, 1);
  });
});

test("checks/*.ts is scanned too (one level), packages/*/src recursively", () => {
  tree({ ...OK, "checks/oops.ts": "fetch(u);\n" }, (k) => assert.equal(checkNetwork({ kilnDir: k, allowlist: NONE }).failures[0]?.file, "checks/oops.ts"));
  tree({ ...OK, "packages/lane/src/deep/deeper/oops.mjs": "fetch(u);\n" }, (k) => assert.equal(checkNetwork({ kilnDir: k, allowlist: NONE }).failures[0]?.file, "packages/lane/src/deep/deeper/oops.mjs"));
});

// ── the allowlist: path-keyed, never a bare name ────────────────────────────────────────────────────────────────────────────────────
const RESIDENCY = "export const go = (h: string) => fetch(`http://${h}/api/chat`);\n";
const entry = (path: string) => ({ path, reason: "the residency module", loopbackOnly: true as const });

test("an allowlist entry that is a bare name fails allowlist-bare-name", () => {
  tree({ ...OK, "packages/lane/src/residency.ts": RESIDENCY }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: { schema: 1, entries: [entry("residency.ts")] } });
    assert.ok(codes(r).includes("allowlist-bare-name"));
  });
});

test("an allowlist entry naming a missing file fails allowlist-missing-file", () => {
  tree(OK, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: { schema: 1, entries: [entry("packages/lane/src/nope.ts")] } });
    assert.deepEqual(codes(r), ["allowlist-missing-file"]);
    assert.match(r.failures[0].detail, /nope\.ts/);
  });
});

test("an allowlisted path may call the local endpoint; a same-named file elsewhere never inherits it; a remote URL literal is refused", () => {
  const allow = { schema: 1 as const, entries: [entry("packages/lane/src/residency.ts")] };
  tree({ ...OK, "packages/lane/src/residency.ts": RESIDENCY }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: allow });
    assert.deepEqual(r.failures, []);
    assert.ok(r.notes.some((n) => /allowlist: 1 entr/.test(n)));
  });
  tree({ ...OK, "packages/lane/src/residency.ts": RESIDENCY, "packages/lane/src/sub/residency.ts": RESIDENCY }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: allow });
    assert.deepEqual(r.failures.map((f) => f.file), ["packages/lane/src/sub/residency.ts"]);
  });
  tree({ ...OK, "packages/lane/src/residency.ts": 'export const go = () => fetch("https://api.example.com/v1");\n' }, (k) => {
    assert.deepEqual(codes(checkNetwork({ kilnDir: k, allowlist: allow })), ["network-nonloopback-url"]);
  });
});

test("a malformed allowlist fails network-allowlist-invalid instead of throwing", () => {
  tree(OK, (k) => assert.deepEqual(codes(checkNetwork({ kilnDir: k, allowlist: { schema: 2, entries: [] } as never })), ["network-allowlist-invalid"]));
  tree({ ...OK, "checks/network-allowlist.json": "{ not json" }, (k) => assert.deepEqual(codes(checkNetwork({ kilnDir: k })), ["network-allowlist-invalid"]));
});

test("the REAL tree passes, scans a non-trivial number of files, and the allowlist is empty", () => {
  const r = checkNetwork();
  assert.deepEqual(r.failures, []);
  assert.ok((r.scanned ?? 0) >= 15, `scanned ${r.scanned}`);
  assert.ok(r.notes.some((n) => /allowlist: 0 entries/.test(n)));
});

// ── lex.ts: what the boundary check shares ──────────────────────────────────────────────────────────────────────────────────────────
test("moduleSpecifiers finds import, export-from, require and dynamic import() with a literal", () => {
  const t = tokenize('import a from "./a.ts"; export * from "#record/x.ts"; const r = require("node:fs"); const d = await import("left-pad"); import type { T } from "../t.ts";');
  assert.deepEqual(moduleSpecifiers(t), ["./a.ts", "#record/x.ts", "node:fs", "left-pad", "../t.ts"]);
});

test("moduleSpecifiers ignores specifier-looking text in comments and strings, even a whole import statement inside a string", () => {
  const src = [
    '// import x from "left-pad"',
    '/* const y = require("node:http") */',
    'export const a = "#lane/x.ts";',
    'export const b = \'import z from "left-pad"\';',
    "export const c = `import w from \"#lane/y.ts\"`;",
    'import real from "./real.ts";',
  ].join("\n");
  assert.deepEqual(moduleSpecifiers(tokenize(src)), ["./real.ts"]);
});

test("tokenize: `masked` keeps every offset of `code` (string text is filled, not removed)", () => {
  const t = tokenize('const s = "fetch(x)"; /* c */ const u = `a${1}b`; import q from "./q.ts";');
  assert.equal(t.masked.length, t.code.length);
  assert.doesNotMatch(t.masked, /fetch/);
  assert.match(t.code, /"fetch\(x\)"/);
});
