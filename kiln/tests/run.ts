// kiln/tests/run.ts — the ONE way scripts and people run the suite (r12 T031; contracts/runner.md).
// Ported in spirit from the first program's runner (legacy/tests/run.ts): it resolves everything from ITS OWN location, so it works from any
// working directory, and it REFUSES a run that executed nothing — `node --test` exits 0 when no file matches, a silent pass in a project whose
// central rule is "never silently approve".
//
//   node tests/run.ts                 the new suite
//   node tests/run.ts --new-only      the same (the legacy suite joins in T045)
//   node tests/run.ts <path>…         restrict to these files or directories, RELATIVE TO kiln/
//
// Discovery: packages/*/tests/**/*.test.ts, checks/tests/**/*.test.ts and tests/**/*.test.ts, except tests/runner/fixtures/ and tests/tools/.
// Pure glue: no network, no gate advanced.

import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, resolve, sep } from "node:path";

const kilnDir = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const KNOWN_FLAGS = new Set(["--new-only"]);
const badFlag = args.find((a) => a.startsWith("--") && !KNOWN_FLAGS.has(a));
if (badFlag) {
  console.error(`unknown flag "${badFlag}"\nusage: node tests/run.ts [--new-only] [path…]`);
  process.exit(2);
}
const paths = args.filter((a) => !a.startsWith("--"));

const EXCLUDED = [join("tests", "runner", "fixtures") + sep, join("tests", "tools") + sep];

/** Every *.test.ts under `dir`, sorted, as paths relative to kiln/. */
function testFilesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".test.ts")) continue;
    const rel = relative(kilnDir, join(entry.parentPath, entry.name));
    if (rel.split(sep).includes("node_modules") || EXCLUDED.some((x) => rel.startsWith(x))) continue;
    out.push(rel);
  }
  return out;
}

function discover(): string[] {
  if (paths.length > 0) {
    const found = new Set<string>();
    for (const p of paths) {
      const abs = resolve(kilnDir, p);
      if (!existsSync(abs)) continue;
      if (statSync(abs).isDirectory()) testFilesUnder(abs).forEach((f) => found.add(f));
      else if (abs.endsWith(".test.ts")) found.add(relative(kilnDir, abs));
    }
    return [...found].sort();
  }
  const roots = [join(kilnDir, "tests"), join(kilnDir, "checks", "tests")];
  const packages = join(kilnDir, "packages");
  if (existsSync(packages)) {
    for (const p of readdirSync(packages, { withFileTypes: true })) if (p.isDirectory()) roots.push(join(packages, p.name, "tests"));
  }
  return [...new Set(roots.flatMap(testFilesUnder))].sort();
}

const files = discover();
const where = paths.length ? paths.join(" ") : "packages/*/tests, checks/tests, tests";
const ZERO = `FAIL — the run executed ZERO tests (paths: ${where}, relative to ${kilnDir}). A run that ran nothing proves nothing.`;

if (files.length === 0) {
  console.error(ZERO);
  process.exit(1);
}

// A runner started from inside a test (the runner's own tests do) inherits NODE_TEST_CONTEXT, which makes a nested `node --test` emit
// machine output and no summary — it would then read as "zero tests". Strip it: this run is a fresh top-level run.
const env = { ...process.env };
delete env.NODE_TEST_CONTEXT;
const child = spawn(process.execPath, ["--test", ...files], { cwd: kilnDir, env, stdio: ["ignore", "pipe", "pipe"] });
let out = "";
child.stdout.on("data", (d: Buffer) => { out += d; process.stdout.write(d); });
child.stderr.on("data", (d: Buffer) => process.stderr.write(d));

child.on("close", (code) => {
  const m = /(?:ℹ |# )tests (\d+)/.exec(out);
  const ran = m ? Number(m[1]) : 0;
  if (code === 0 && ran === 0) {
    console.error(ZERO);
    process.exit(1);
  }
  console.log(`new: ${ran} tests`);
  process.exit(code ?? 1);
});
