// r13 T006 — the dependency rules of `kiln check boundaries` (contracts/checks-and-docs.md): exact pins, a seam for every dependency and a dependency for every seam, a lockfile that
// agrees, and the library reachable ONLY through the durable seam — in every spelling of an import. Each case builds a scratch kiln/ and runs the check against the REAL rule file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBoundaries } from "#checks/boundaries.ts";

const rules = JSON.parse(readFileSync(fileURLToPath(new URL("../boundaries.json", import.meta.url)), "utf8"));
const SPECIFIERS: string[] = rules.externals["pi-durable"].specifiers;
const DEPS = { "@earendil-works/chord": "1.4.0", "@earendil-works/pi-ai": "1.4.0", "@earendil-works/pi-durable": "1.4.0" };
const lockFor = (deps: Record<string, string>) => ({ lockfileVersion: 3, packages: { "": { dependencies: deps }, ...Object.fromEntries(Object.entries(deps).map(([n, v]) => [`node_modules/${n}`, { version: v }])) } });
const codes = (r: ReturnType<typeof checkBoundaries>) => [...new Set(r.failures.map((f) => f.code))].sort();

function scratch(files: Record<string, string>, run: (kilnDir: string) => void, opts: { pkg?: unknown; lock?: unknown | null; noPackageJson?: boolean } = {}): void {
  const root = mkdtempSync(join(tmpdir(), "kiln-dep-"));
  try {
    const kiln = join(root, "kiln");
    const put = (p: string, text: string) => { mkdirSync(dirname(join(kiln, p)), { recursive: true }); writeFileSync(join(kiln, p), text); };
    const dirs = new Set<string>(["checks", "packages/contracts", "packages/record", "packages/durable", "packages/workers"]);
    for (const d of dirs) { mkdirSync(join(kiln, d), { recursive: true }); put(`${d}/kiln.json`, JSON.stringify({ name: `@kiln/${d}`, responsibility: "a scratch package" })); }
    put("packages/contracts/src/a.ts", "export const a = 1;\n");
    for (const [p, text] of Object.entries(files)) put(p, text);
    if (!opts.noPackageJson) put("package.json", typeof opts.pkg === "string" ? opts.pkg : JSON.stringify(opts.pkg ?? { name: "kiln", dependencies: DEPS }));
    if (opts.lock !== null && !opts.noPackageJson) put("package-lock.json", JSON.stringify(opts.lock ?? lockFor(DEPS)));
    run(kiln);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("the real tree passes, and its notes say what was checked", () => {
  const r = checkBoundaries();
  assert.deepEqual(r.failures, []);
  assert.ok(r.notes.some((n) => /3 dependencies, exact and locked/.test(n)), r.notes.join("|"));
  assert.ok(r.notes.some((n) => /1 external seam/.test(n)), r.notes.join("|"));
});

test("a scratch tree with the three pins and an agreeing lockfile passes", () => {
  scratch({}, (k) => assert.deepEqual(checkBoundaries({ kilnDir: k, rules }).failures, []));
});

for (const bad of ["^1.4.0", "~1.4.0", "latest", ">=1.4.0", "*", "1.x", "git+https://example.com/x.git", "file:../x", "https://example.com/x.tgz", "1.4"]) {
  test(`a dependency pinned as "${bad}" fails boundary-dependency-unpinned`, () => {
    const deps = { ...DEPS, "@earendil-works/chord": bad };
    scratch({}, (k) => assert.ok(codes(checkBoundaries({ kilnDir: k, rules })).includes("boundary-dependency-unpinned")), { pkg: { name: "kiln", dependencies: deps }, lock: lockFor(deps) });
  });
}

test("a dependency that no external seam names fails boundary-dependency-undeclared", () => {
  const deps = { ...DEPS, "left-pad": "1.3.0" };
  scratch({}, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules });
    assert.deepEqual(codes(r), ["boundary-dependency-undeclared"]);
    assert.match(r.failures[0].detail, /left-pad/);
  }, { pkg: { name: "kiln", dependencies: deps }, lock: lockFor(deps) });
});

test("an external seam that names a package missing from dependencies fails boundary-dependency-undeclared", () => {
  const deps = { "@earendil-works/pi-durable": "1.4.0", "@earendil-works/pi-ai": "1.4.0" };
  scratch({}, (k) => assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules })), ["boundary-dependency-undeclared"]), { pkg: { name: "kiln", dependencies: deps }, lock: lockFor(deps) });
});

test("an opened seam whose package is not a declared dependency fails when it is imported", () => {
  const open = { ...rules, externals: { x: { specifiers: ["left-pad"], onlyIn: ["record"] } } };
  scratch({ "packages/record/src/r.ts": 'import l from "left-pad"; export default l;\n' }, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules: open });
    assert.ok(codes(r).includes("boundary-dependency-undeclared"), codes(r).join(","));
    assert.ok(r.failures.some((f) => f.file === "packages/record/src/r.ts"));
  });
});

test("a missing lockfile fails boundary-lock-mismatch", () => {
  scratch({}, (k) => assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules })), ["boundary-lock-mismatch"]), { lock: null });
});

test("a lockfile that disagrees fails boundary-lock-mismatch — root ask, resolved version, or an extra root entry", () => {
  const wrongRoot = lockFor({ ...DEPS, "@earendil-works/pi-ai": "1.3.0" });
  const wrongResolved = lockFor(DEPS); (wrongResolved.packages as Record<string, { version?: string }>)["node_modules/@earendil-works/chord"] = { version: "1.4.1" };
  const extra = lockFor({ ...DEPS, "left-pad": "1.3.0" });
  for (const lock of [wrongRoot, wrongResolved, extra]) scratch({}, (k) => assert.ok(codes(checkBoundaries({ kilnDir: k, rules })).includes("boundary-lock-mismatch")), { lock });
  scratch({}, (k) => assert.ok(codes(checkBoundaries({ kilnDir: k, rules })).includes("boundary-lock-mismatch")), { lock: "not json {" as unknown as object });
});

test("an unreadable package.json fails boundary-package-json-invalid; no package.json at all applies no dependency rule and says so", () => {
  scratch({}, (k) => assert.ok(codes(checkBoundaries({ kilnDir: k, rules })).includes("boundary-package-json-invalid")), { pkg: "{ nope" });
  scratch({}, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules });
    assert.deepEqual(r.failures, []);
    assert.ok(r.notes.some((n) => /no package\.json/.test(n)), r.notes.join("|"));
  }, { noPackageJson: true });
});

// SC-006: the library is refused outside durable in EVERY spelling the lexer reads, for EACH declared specifier — and admitted inside durable in the same spellings.
const SPELLINGS: Record<string, (s: string) => string> = {
  "default import": (s) => `import x from "${s}"; export default x;\n`,
  "named import": (s) => `import { a as b } from "${s}"; export const c = b;\n`,
  "side-effect import": (s) => `import "${s}";\n`,
  "type import": (s) => `import type { T } from "${s}"; export type U = T;\n`,
  "export-star-from": (s) => `export * from "${s}";\n`,
  "export-named-from": (s) => `export { y } from "${s}";\n`,
  "dynamic import": (s) => `export const m = await import("${s}");\n`,
  "require": (s) => `const r = require("${s}"); export default r;\n`,
  "multi-line import": (s) => `import {\n  a,\n  b,\n} from\n  "${s}";\nexport const c = [a, b];\n`,
  "single-quoted": (s) => `import x from '${s}'; export default x;\n`,
};
for (const spec of SPECIFIERS) {
  for (const [name, spell] of Object.entries(SPELLINGS)) {
    test(`the library (${spec}) in a ${name} is refused in workers and admitted in durable`, () => {
      scratch({ "packages/workers/src/x.ts": spell(spec) }, (k) => {
        const r = checkBoundaries({ kilnDir: k, rules });
        assert.deepEqual(codes(r), ["boundary-bare-specifier"], `workers: ${codes(r).join(",")}`);
        assert.equal(r.failures[0].file, "packages/workers/src/x.ts");
      });
      scratch({ "packages/durable/src/library/x.ts": spell(spec) }, (k) => assert.deepEqual(checkBoundaries({ kilnDir: k, rules }).failures, []));
    });
  }
}
