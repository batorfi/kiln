// B1–B10 of contracts/boundaries.md (r12 T073), written first. Each case builds a scratch kiln-shaped tree in a temp dir and runs the check against the REAL
// rule file, so the rules in checks/boundaries.json are what is under test. The real packages come first (B1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkBoundaries } from "#checks/boundaries.ts";

const rules = JSON.parse(readFileSync(fileURLToPath(new URL("../boundaries.json", import.meta.url)), "utf8"));
const codes = (r: ReturnType<typeof checkBoundaries>) => r.failures.map((f) => f.code);

/** A scratch kiln/ with the named packages (each with a responsibility) plus extra files; `kiln` is <tmp>/kiln so <tmp>/legacy is its sibling. */
function scratch(files: Record<string, string>, run: (kilnDir: string) => void, opts: { noResponsibility?: string[] } = {}): void {
  const root = mkdtempSync(join(tmpdir(), "kiln-bound-"));
  try {
    const kiln = join(root, "kiln");
    const put = (p: string, text: string) => { mkdirSync(dirname(join(kiln, p)), { recursive: true }); writeFileSync(join(kiln, p), text); };
    const dirs = new Set<string>(["checks"]);
    for (const p of Object.keys(files)) { const m = /^packages\/([^/]+)\//.exec(p); if (m) dirs.add(`packages/${m[1]}`); }
    for (const d of dirs) {
      mkdirSync(join(kiln, d), { recursive: true }); // the directory exists even when it states no responsibility
      if (!opts.noResponsibility?.includes(d)) put(`${d}/kiln.json`, JSON.stringify({ name: `@kiln/${d}`, responsibility: "a scratch package" }));
    }
    for (const [p, text] of Object.entries(files)) put(p, text);
    run(kiln);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const BASE = { "packages/contracts/src/a.ts": "export const a = 1;\n", "packages/record/src/b.ts": 'import { a } from "#contracts/a.ts"; export const b = a;\n' };

test("B1 the real packages pass, and the report names the rules and the number of files checked", () => {
  const r = checkBoundaries();
  assert.deepEqual(r.failures, []);
  assert.equal(r.name, "boundaries");
  assert.ok((r.scanned ?? 0) >= 15, `scanned ${r.scanned}`);
  assert.ok(r.notes.some((n) => /17 layers/.test(n)), r.notes.join("|"));
});

test("B1 a clean scratch tree passes", () => {
  scratch(BASE, (k) => assert.deepEqual(checkBoundaries({ kilnDir: k, rules }).failures, []));
});

test("B2 record importing #lane/… fails boundary-forbidden-import, naming the file", () => {
  scratch({ ...BASE, "packages/lane/src/affinity.ts": "export const x = 1;\n", "packages/record/src/oops.ts": 'import { x } from "#lane/affinity.ts"; export default x;\n' }, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules });
    assert.deepEqual(codes(r), ["boundary-forbidden-import"]);
    assert.equal(r.failures[0].file, "packages/record/src/oops.ts");
    assert.match(r.failures[0].detail, /imports #lane\/affinity\.ts \(record may import: contracts\)/);
  });
});

test("B3 lane importing a sibling (#workers/…) fails boundary-forbidden-import", () => {
  scratch({ ...BASE, "packages/workers/src/w.ts": "export const w = 1;\n", "packages/lane/src/oops.ts": 'import { w } from "#workers/w.ts"; export default w;\n' }, (k) => {
    assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules })), ["boundary-forbidden-import"]);
  });
});

test("B3 a relative import into another package is treated as that package's import (same rule)", () => {
  scratch({ ...BASE, "packages/lane/src/l.ts": "export const l = 1;\n", "packages/record/src/oops.ts": 'import { l } from "../../lane/src/l.ts"; export default l;\n' }, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules });
    assert.deepEqual(codes(r), ["boundary-forbidden-import"]);
    assert.match(r.failures[0].detail, /lane/);
  });
  scratch({ ...BASE, "packages/record/src/ok.ts": 'import { a } from "../../contracts/src/a.ts"; export default a;\n' }, (k) => {
    assert.deepEqual(checkBoundaries({ kilnDir: k, rules }).failures, [], "…and an allowed one passes");
  });
});

test("an import of a package the rules do not declare, and of a package inside itself, are handled by name", () => {
  scratch({ ...BASE, "packages/record/src/oops.ts": 'import x from "#nope/x.ts"; export default x;\n' }, (k) => {
    assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules })), ["boundary-forbidden-import"]);
  });
  scratch({ ...BASE, "packages/record/src/self.ts": 'import { b } from "#record/b.ts"; export default b;\n' }, (k) => {
    assert.deepEqual(checkBoundaries({ kilnDir: k, rules }).failures, [], "a package may import itself through the map");
  });
});

test("B4 contracts importing node:fs fails boundary-contracts-io; record importing node:fs is fine", () => {
  scratch({ ...BASE, "packages/contracts/src/io.ts": 'import { readFileSync } from "node:fs"; export default readFileSync;\n' }, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules });
    assert.deepEqual(codes(r), ["boundary-contracts-io"]);
    assert.equal(r.failures[0].file, "packages/contracts/src/io.ts");
  });
  scratch({ ...BASE, "packages/record/src/io.ts": 'import { readFileSync } from "node:fs"; export default readFileSync;\n' }, (k) => {
    assert.deepEqual(checkBoundaries({ kilnDir: k, rules }).failures, []);
  });
});

test('B5 any package importing "left-pad" fails boundary-bare-specifier; an unprefixed builtin ("fs") is a bare specifier too', () => {
  for (const pkg of ["contracts", "record", "cli"]) {
    scratch({ ...BASE, [`packages/${pkg}/src/oops.ts`]: 'import leftPad from "left-pad"; export default leftPad;\n' }, (k) => {
      const r = checkBoundaries({ kilnDir: k, rules });
      assert.deepEqual(codes(r), ["boundary-bare-specifier"], pkg);
      assert.match(r.failures[0].detail, /"left-pad"/);
    });
  }
  scratch({ ...BASE, "packages/record/src/oops.ts": 'import fs from "fs"; export default fs;\n' }, (k) => assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules })), ["boundary-bare-specifier"]));
});

test("an externals seam opens a bare specifier for the named package only", () => {
  const open = { ...rules, externals: { piDurable: { specifiers: ["left-pad"], onlyIn: ["record"] } } };
  scratch({ ...BASE, "packages/record/src/ok.ts": 'import l from "left-pad"; export default l;\n' }, (k) => assert.deepEqual(checkBoundaries({ kilnDir: k, rules: open }).failures, []));
  scratch({ ...BASE, "packages/lane/src/no.ts": 'import l from "left-pad"; export default l;\n' }, (k) => assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules: open })), ["boundary-bare-specifier"]));
});

test("B6 a file importing ../../../legacy/src/x.ts fails boundary-legacy-import", () => {
  scratch({ ...BASE, "packages/record/src/oops.ts": 'import x from "../../../../legacy/src/x.ts"; export default x;\n' }, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules });
    assert.deepEqual(codes(r), ["boundary-legacy-import"]);
    assert.match(r.failures[0].detail, /legacy/);
  });
  scratch({ ...BASE, "checks/oops.ts": 'export * from "../../legacy/validate/log.ts";\n' }, (k) => assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules })), ["boundary-legacy-import"]));
});

test('B7 "#lane/x.ts" inside a string, a comment or a template is not read as an import', () => {
  const src = [
    '// import x from "#lane/x.ts"',
    '/* const y = require("left-pad") */',
    'export const a = "#lane/x.ts";',
    "export const b = 'import z from \"left-pad\"';",
    "export const c = `import w from \"#workers/y.ts\"`;",
  ].join("\n");
  scratch({ ...BASE, "packages/record/src/prose.ts": src }, (k) => assert.deepEqual(checkBoundaries({ kilnDir: k, rules }).failures, []));
});

test("B8 a packages/ directory the rules do not declare fails boundary-package-undeclared", () => {
  scratch({ ...BASE, "packages/mystery/src/m.ts": "export const m = 1;\n" }, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules });
    assert.ok(codes(r).includes("boundary-package-undeclared"));
    assert.equal(r.failures.find((f) => f.code === "boundary-package-undeclared")!.file, "packages/mystery");
  });
});

test("B9 a package or checks/ without a responsibility fails boundary-responsibility-missing", () => {
  scratch(BASE, (k) => assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules })), ["boundary-responsibility-missing"]), { noResponsibility: ["packages/record"] });
  scratch(BASE, (k) => assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules })), ["boundary-responsibility-missing"]), { noResponsibility: ["checks"] });
  scratch(BASE, (k) => {
    writeFileSync(join(k, "packages", "record", "kiln.json"), JSON.stringify({ name: "@kiln/record", responsibility: "   " }));
    assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules })), ["boundary-responsibility-missing"], "an empty sentence is no sentence");
  });
});

test("B10 an empty scan root fails boundary-zero-files — never vacuous", () => {
  scratch({}, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules });
    assert.equal(r.ok, false);
    assert.ok(codes(r).includes("boundary-zero-files"));
    assert.equal(r.scanned, 0);
  });
});

test("a rule file that is unreadable, not schema 1, names an undeclared layer or contains a cycle fails boundary-rules-invalid", () => {
  scratch(BASE, (k) => {
    assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules: { ...rules, schema: 2 } })), ["boundary-rules-invalid"]);
    assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules: { ...rules, layers: { ...rules.layers, record: { imports: ["ghost"] } } } })), ["boundary-rules-invalid"]);
    assert.deepEqual(codes(checkBoundaries({ kilnDir: k, rules: { ...rules, layers: { ...rules.layers, contracts: { imports: ["record"], builtins: "none" } } } })), ["boundary-rules-invalid"]);
    assert.deepEqual(codes(checkBoundaries({ kilnDir: k })), ["boundary-rules-invalid"], "no rule file in the scratch tree");
  });
});

test("the check reads source only: test files and tests/ directories are not scanned", () => {
  scratch({ ...BASE, "packages/record/tests/x.test.ts": 'import l from "left-pad"; import "#lane/x.ts";\n' }, (k) => {
    const r = checkBoundaries({ kilnDir: k, rules });
    assert.deepEqual(r.failures, []);
    assert.equal(r.scanned, 2);
  });
});
