// kiln/tests/runner/scripts.test.ts — CR-1 / CR-8 / CR-11 (code review), r7 · OFFLINE tier.
// The bug class: `npm run` executes scripts with `kiln/` as the working directory, but the scripts used repo-root-relative paths, so
// `npm run test:live` resolved to `kiln/kiln/…`, ran ZERO tests, and exited 0. Nothing tested the scripts themselves, so nothing noticed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const kiln = fileURLToPath(new URL("../..", import.meta.url)).replace(/[\\/]$/, "");
const repo = join(kiln, "..");
const runner = join(kiln, "tests", "run.ts");
const pkg = JSON.parse(readFileSync(join(kiln, "package.json"), "utf8")) as { scripts: Record<string, string>; dependencies: Record<string, string> };
const sh = (cmd: string, args: string[], cwd: string, extra: NodeJS.ProcessEnv = {}) => {
  // A child `node --test` spawned from INSIDE a test inherits NODE_TEST_CONTEXT and then behaves like a test FILE of the parent run
  // (machine-readable output, no human summary). Scrub it so the child is a real, top-level test run.
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
  delete env.NODE_TEST_CONTEXT;
  return spawnSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env });
};
const haveNpm = spawnSync("npm", ["--version"], { stdio: "ignore" }).status === 0;

test("CR-1: every npm script's target EXISTS when resolved from kiln/ — npm's working directory — and none is repo-root-relative", () => {
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    const m = /^node\s+(?:--\S+\s+)*(\S+)/.exec(cmd);
    assert.ok(m, `script "${name}" must be a plain node command: ${cmd}`);
    assert.ok(existsSync(join(kiln, m[1])), `script "${name}" → "${m[1]}" does not exist relative to kiln/`);
    assert.doesNotMatch(cmd, /(^|\s)kiln\//, `script "${name}" uses a repo-root-relative path: ${cmd}`);
  }
});

test("CR-8: no script needs a POSIX-only `VAR=value cmd` prefix (it breaks cmd.exe/PowerShell) — env flags are set by the runner", () => {
  for (const [name, cmd] of Object.entries(pkg.scripts)) assert.doesNotMatch(cmd, /^\s*[A-Za-z_][A-Za-z0-9_]*=/, `script "${name}": ${cmd}`);
});

test("CR-1: the runner works from ANY working directory — kiln/, the repo root, and an unrelated one", () => {
  for (const cwd of [kiln, repo, tmpdir()]) {
    const r = sh(process.execPath, [runner, "tests/negative/async-await.test.ts"], cwd);
    assert.equal(r.status, 0, `cwd=${cwd}\n${r.stdout.slice(-400)}${r.stderr.slice(-400)}`);
    assert.match(r.stdout, /(?:ℹ |# )tests [1-9]\d*/, `cwd=${cwd}: tests actually ran`);
  }
});

test("CR-1: a run that executes ZERO tests FAILS — `node --test` alone exits 0 on 'tests 0', a silent pass", () => {
  const bare = sh(process.execPath, ["--test", "tests/__none__/*.test.ts"], kiln);
  assert.equal(bare.status, 0, "precondition: plain `node --test` really does exit 0 when nothing matched (the hazard)");
  assert.match(bare.stdout, /(?:ℹ |# )tests 0/); // older Node prints TAP (`# tests 0`); newer prints the spec reporter (`ℹ tests 0`)
  const guarded = sh(process.execPath, [runner, "tests/__none__/*.test.ts"], kiln);
  assert.equal(guarded.status, 1, "the runner refuses it");
  assert.match(guarded.stderr, /ZERO tests/);
});

test("CR-11: `--live` sets KILN_LIVE; `--cost` is a SEPARATE opt-in that implies live; neither leaks into a plain run's contract", () => {
  const probe = "tests/runner/env-probe.fixture.ts";
  const live = sh(process.execPath, [runner, "--live", probe], kiln, { KILN_LIVE: "", KILN_LIVE_COST: "" });
  assert.match(live.stdout, /ENV:live=1:cost=(?:unset)?\s/, "--live sets KILN_LIVE but NOT the cost opt-in");
  const cost = sh(process.execPath, [runner, "--cost", probe], kiln, { KILN_LIVE: "", KILN_LIVE_COST: "" });
  assert.match(cost.stdout, /ENV:live=1:cost=1/, "--cost enables both");
});

test("CR-1 (the real path): the scripts work when run through `npm run`, exactly as a user runs them", { skip: haveNpm ? false : "npm is not installed" }, () => {
  const roadmap = sh("npm", ["run", "validate:roadmap", "--", "../specs/ROADMAP.md"], kiln);
  assert.equal(roadmap.status, 0, roadmap.stdout + roadmap.stderr);
  assert.match(roadmap.stdout, /PASS/);
  const suite = sh("npm", ["test", "--", "tests/negative/async-await.test.ts"], kiln);
  assert.equal(suite.status, 0, suite.stdout.slice(-600) + suite.stderr.slice(-300));
  assert.match(suite.stdout, /(?:ℹ |# )tests [1-9]\d*/, "`npm test` ran real tests");
  const none = sh("npm", ["run", "test:live", "--", "tests/__none__/*.test.ts"], kiln);
  assert.equal(none.status, 1, "`npm run test:live` can no longer pass with zero tests");
});

test("engines.node is the MEASURED floor — `^22.18.0 || >=23.6.0`, not the earlier guess of `>=22.6`", () => {
  // Measured 2026-09-21 by running `node kiln/tests/run.ts` (the documented command) under each Node: 22.6.0 ✗ (even with the flag, one test
  // file fails to load on a non-null `!`), 22.12.0/22.17.1 ✗ as documented (need --experimental-strip-types), 22.18.0 ✓, 23.5.0 ✗ as documented,
  // 23.6.0 ✓, 24.21.0 ✓, 25.9.0 ✓, 26.8.2 ✓. Type-stripping is unflagged from 22.18.0 and 23.6.0. Change this only with new measurements
  // (see specs/006-kiln-live-inference/verification-report.md §10).
  assert.equal((pkg as unknown as { engines: { node: string } }).engines.node, "^22.18.0 || >=23.6.0");
});

test("dependencies stay empty (P-VIII) — the runner is Node's own child_process, not a package", () => {
  assert.deepEqual(pkg.dependencies, {});
});
