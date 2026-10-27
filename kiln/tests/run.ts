// kiln/tests/run.ts — the ONE way scripts and people run the suite (r12 T031, T045; contracts/runner.md).
// It resolves everything from ITS OWN location, so it works from any working directory, and it REFUSES a run that executed nothing —
// `node --test` exits 0 when no file matches, a silent pass in a project whose central rule is "never silently approve".
//
//   node tests/run.ts                          the new suite, then the first program's suite (frozen, in legacy/)
//   node tests/run.ts --new-only               only the new suite
//   node tests/run.ts --legacy-only            only the legacy suite
//   node tests/run.ts [--live] [--cost] [--serial] [--pi]   forwarded to the legacy runner unchanged
//   node tests/run.ts <path>…                  restrict the NEW suite to these files or directories, RELATIVE TO kiln/
//
// The live-Pi tier: before the legacy suite starts, the installed Pi (KILN_PI_BIN or `pi`) is compared with the measured list. On an unmeasured
// Pi that nobody demanded, KILN_PI=0 is set for the legacy child — the legacy gate's own off switch, which prints its reason per test — and the
// two versions are printed once. A demanded tier (`--pi`, KILN_PI=1) is never switched off: its tests run and fail by name.
// Pure glue: no network, no gate advanced, no legacy file touched.

import { spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, resolve, sep } from "node:path";
import { MEASURED_PI_VERSIONS } from "./measured-pi.ts";
import { decidePiTier, installedPiVersion, piBinary } from "./pi-tier.ts";

const kilnDir = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const NEW_FLAGS = new Set(["--new-only", "--legacy-only", "--proof"]);
const FORWARDED = new Set(["--live", "--cost", "--serial", "--pi"]);
const badFlag = args.find((a) => a.startsWith("--") && !NEW_FLAGS.has(a) && !FORWARDED.has(a));
if (badFlag) {
  console.error(`unknown flag "${badFlag}"\nusage: node tests/run.ts [--new-only | --legacy-only] [--proof] [--live] [--cost] [--serial] [--pi] [path…]`);
  process.exit(2);
}
if (args.includes("--new-only") && args.includes("--legacy-only")) {
  console.error("--new-only and --legacy-only exclude each other");
  process.exit(2);
}
const newOnly = args.includes("--new-only");
const legacyOnly = args.includes("--legacy-only");
// The two tiers (r14, research R16): the DEFAULT tier runs every *.test.ts except the proof files; the PROOF tier (`--proof`, `npm run proof`) runs ONLY the files named *.proof.test.ts —
// the long kill matrices. A proof file named explicitly on the command line always runs. The runner says which tier ran and how many proof files the default tier left out: never silent.
const proofTier = args.includes("--proof");
if (proofTier && legacyOnly) {
  console.error("--proof and --legacy-only exclude each other");
  process.exit(2);
}
const isProofFile = (f: string): boolean => f.endsWith(".proof.test.ts");
const forwarded = args.filter((a) => FORWARDED.has(a));
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
      if (statSync(abs).isDirectory()) testFilesUnder(abs).filter((f) => isProofFile(f) === proofTier).forEach((f) => found.add(f));
      else if (abs.endsWith(".test.ts")) found.add(relative(kilnDir, abs));
    }
    return [...found].sort();
  }
  const roots = [join(kilnDir, "tests"), join(kilnDir, "checks", "tests")];
  const packages = join(kilnDir, "packages");
  if (existsSync(packages)) {
    for (const p of readdirSync(packages, { withFileTypes: true })) if (p.isDirectory()) roots.push(join(packages, p.name, "tests"));
  }
  return [...new Set(roots.flatMap(testFilesUnder))].filter((f) => isProofFile(f) === proofTier).sort();
}

/** How many proof files exist (for the default tier's one-line statement). */
function proofFileCount(): number {
  const roots = [join(kilnDir, "tests"), join(kilnDir, "checks", "tests")];
  const packages = join(kilnDir, "packages");
  if (existsSync(packages)) for (const p of readdirSync(packages, { withFileTypes: true })) if (p.isDirectory()) roots.push(join(packages, p.name, "tests"));
  return new Set(roots.flatMap(testFilesUnder).filter(isProofFile)).size;
}

// A runner started from inside a test (the runner's own tests do) inherits NODE_TEST_CONTEXT, which makes a nested `node --test` emit machine
// output and no summary — it would read as "zero tests". Strip it: every run started here is a fresh top-level run.
function cleanEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env = { ...process.env, ...extra };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

interface RunResult { code: number; ran: number; skipped: number }

/** Runs a child, passes its output through, and returns its exit code and how many tests (and how many of those skipped) its summary reported. */
function runChild(cmdArgs: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<RunResult> {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, cmdArgs, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d: Buffer) => { out += d; process.stdout.write(d); });
    child.stderr.on("data", (d: Buffer) => process.stderr.write(d));
    child.on("error", (e) => { console.error(`FAIL — could not start ${cmdArgs[0]}: ${e.message}`); resolveRun({ code: 1, ran: 0, skipped: 0 }); });
    child.on("close", (code) => {
      const m = /(?:ℹ |# )tests (\d+)/.exec(out);
      const k = /(?:ℹ |# )skipped (\d+)/.exec(out);
      resolveRun({ code: code ?? 1, ran: m ? Number(m[1]) : 0, skipped: k ? Number(k[1]) : 0 });
    });
  });
}

const zero = (what: string) => `FAIL — the ${what} suite executed ZERO tests. A run that ran nothing proves nothing.`;

async function runNew(): Promise<RunResult> {
  const files = discover();
  const where = paths.length ? paths.join(" ") : "packages/*/tests, checks/tests, tests";
  if (files.length === 0) {
    console.error(`FAIL — the run executed ZERO tests (paths: ${where}, relative to ${kilnDir}). A run that ran nothing proves nothing.`);
    return { code: 1, ran: 0, skipped: 0 };
  }
  console.log(proofTier ? `tier: proof (${files.filter(isProofFile).length} proof files)` : `tier: default (${proofFileCount()} proof files not run; npm run proof runs them)`);
  const r = await runChild(["--test", ...files], kilnDir, cleanEnv());
  if (r.code === 0 && r.ran === 0) {
    console.error(`FAIL — the run executed ZERO tests (paths: ${where}, relative to ${kilnDir}). A run that ran nothing proves nothing.`);
    return { code: 1, ran: 0, skipped: 0 };
  }
  return r;
}

async function runLegacy(): Promise<RunResult> {
  const legacyDir = join(kilnDir, "..", "legacy");
  // KILN_LEGACY_RUNNER replaces the frozen runner with a probe — for the runner's own tests only.
  const runner = process.env.KILN_LEGACY_RUNNER ?? join(legacyDir, "tests", "run.ts");
  const extra: Record<string, string> = {};
  const decision = decidePiTier({
    env: process.env,
    demanded: forwarded.includes("--pi"),
    installedVersion: installedPiVersion(piBinary(process.env)),
    measured: MEASURED_PI_VERSIONS,
  });
  if (decision.action === "switch-off") {
    extra.KILN_PI = "0";
    console.log(`live-Pi tier skipped: Pi ${decision.installed} installed, measured [${decision.measured.join(", ")}]`);
  }
  const r = await runChild([runner, ...forwarded], legacyDir, cleanEnv(extra));
  if (r.code === 0 && r.ran === 0) {
    console.error(zero("legacy"));
    return { code: 1, ran: 0, skipped: 0 };
  }
  return r;
}

// "170 tests" counts skipped tests too; a skip is shown beside the count, never hidden in it (a shallow clone skips the git cross-checks).
const tally = (name: string, r: RunResult) => `${name}: ${r.ran} tests${r.skipped > 0 ? ` (${r.skipped} skipped)` : ""}`;
const results: string[] = [];
let failed = false;
if (!legacyOnly) {
  const r = await runNew();
  results.push(tally(proofTier ? "proof" : "new", r));
  if (r.code !== 0) failed = true;
}
if (!newOnly && !proofTier) {
  const r = await runLegacy();
  results.push(tally("legacy", r));
  if (r.code !== 0) failed = true;
}
console.log(results.join(" · "));
process.exit(failed ? 1 : 0);
