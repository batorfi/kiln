// r13 T069/T071 — the recorded decision stays true (FR-050, FR-053): every dependency in package.json appears in DEPENDENCIES.md with the same version and the integrity the lockfile holds; one that is missing
// or differs fails BY NAME. The statements that kiln/ has "no dependency" or "nothing to install" are gone from the live files. The comparison is a pure function so the failures are themselves tested.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const KILN = fileURLToPath(new URL("../../..", import.meta.url));
const read = (p: string): string => readFileSync(join(KILN, p), "utf8");
const readme = (): string => readFileSync(join(KILN, "..", "README.md"), "utf8");

export interface Recorded { version: string; integrity: string }
export function parseRecord(md: string): Map<string, Recorded> {
  const out = new Map<string, Recorded>();
  for (const block of md.split(/^### /m).slice(1)) {
    const name = block.split("\n")[0].replace(/`/g, "").trim();
    const version = /\*\*Version:\*\*\s*`([^`]+)`/.exec(block)?.[1];
    const integrity = /\*\*Integrity:\*\*\s*`([^`]+)`/.exec(block)?.[1];
    if (version && integrity) out.set(name, { version, integrity });
  }
  return out;
}
/** Problems, each naming the dependency. */
export function compare(deps: Record<string, string>, lock: Record<string, { version: string; integrity?: string }>, record: Map<string, Recorded>): string[] {
  const problems: string[] = [];
  for (const [name, version] of Object.entries(deps)) {
    const r = record.get(name);
    const l = lock[`node_modules/${name}`];
    if (!r) { problems.push(`${name}: not in DEPENDENCIES.md`); continue; }
    if (r.version !== version) problems.push(`${name}: DEPENDENCIES.md says ${r.version}, package.json says ${version}`);
    if (!l) problems.push(`${name}: not in package-lock.json`);
    else {
      if (l.version !== version) problems.push(`${name}: package-lock.json holds ${l.version}, package.json says ${version}`);
      if (l.integrity !== r.integrity) problems.push(`${name}: DEPENDENCIES.md integrity differs from the lock's`);
    }
  }
  for (const name of record.keys()) if (!(name in deps)) problems.push(`${name}: in DEPENDENCIES.md but not a dependency in package.json`);
  return problems;
}

const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json")).packages as Record<string, { version: string; integrity?: string }>;
const record = parseRecord(read("DEPENDENCIES.md"));

test("DEPENDENCIES.md equals package.json and the lock: every dependency, its exact version and its integrity", () => {
  assert.ok(Object.keys(pkg.dependencies).length >= 3, "the scan saw the three dependencies (not vacuous)");
  assert.deepEqual(compare(pkg.dependencies, lock, record), []);
});

test("the lock's own engines.node equals package.json's, and the README, DEPENDENCIES.md and the quickstart quote the same range", () => {
  const rootLock = JSON.parse(read("package-lock.json")).packages[""] as { engines: { node: string } };
  assert.equal(rootLock.engines.node, pkg.engines.node);
  const range = pkg.engines.node as string;
  assert.ok(readme().includes(range), "README.md quotes engines.node");
  assert.ok(read("DEPENDENCIES.md").includes(range), "DEPENDENCIES.md quotes engines.node");
  const quickstart = readFileSync(join(KILN, "..", "specs", "013-the-record", "quickstart.md"), "utf8");
  assert.ok(quickstart.includes(range), "the r15 quickstart quotes engines.node");
});

test("a dependency missing from the record, a version that differs and an integrity that differs each fail by name", () => {
  const deps = { a: "1.0.0", b: "2.0.0" };
  const lk = { "node_modules/a": { version: "1.0.0", integrity: "sha512-A" }, "node_modules/b": { version: "2.0.0", integrity: "sha512-B" } };
  const ok = new Map([["a", { version: "1.0.0", integrity: "sha512-A" }], ["b", { version: "2.0.0", integrity: "sha512-B" }]]);
  assert.deepEqual(compare(deps, lk, ok), []);
  assert.deepEqual(compare(deps, lk, new Map([["a", ok.get("a")!]])), ["b: not in DEPENDENCIES.md"]);
  assert.deepEqual(compare(deps, lk, new Map([["a", { version: "1.0.1", integrity: "sha512-A" }], ["b", ok.get("b")!]])), ["a: DEPENDENCIES.md says 1.0.1, package.json says 1.0.0"]);
  assert.deepEqual(compare(deps, lk, new Map([["a", ok.get("a")!], ["b", { version: "2.0.0", integrity: "sha512-X" }]])), ["b: DEPENDENCIES.md integrity differs from the lock's"]);
  assert.deepEqual(compare(deps, lk, new Map([...ok, ["c", { version: "3", integrity: "x" }]])), ["c: in DEPENDENCIES.md but not a dependency in package.json"]);
  assert.deepEqual(compare({ a: "1.0.0" }, {}, new Map([["a", ok.get("a")!]])), ["a: not in package-lock.json"]);
});

test("every dependency is an exact version (no range, no tag) and the record names the upgrade rule and the install line", () => {
  for (const [name, v] of Object.entries(pkg.dependencies as Record<string, string>)) assert.match(v, /^\d+\.\d+\.\d+$/, `${name} is "${v}"`);
  const md = read("DEPENDENCIES.md");
  assert.match(md, /no upgrade path/);
  assert.match(md, /cd kiln && npm ci/);
  assert.match(md, /node:sqlite/);
});

test("the statements that kiln/ has no dependency or nothing to install are gone from the live files (FR-053)", () => {
  const old = /nothing to install|nothing to `npm install`|no runtime dependenc|zero runtime dependenc|no dependency/i;
  for (const [file, text] of [["package.json", read("package.json")], ["README.md", readme()]] as const) {
    assert.doesNotMatch(text, old, `${file} still says kiln/ has nothing to install`);
  }
  assert.match(pkg.description, /three pinned dependencies/i);
  assert.match(readme(), /\^22\.19\.0 \|\| >=24\.1\.0/);
});
