// kiln/tests/runner/pi-flag.test.ts — T003, r8 · FR-011 · OFFLINE tier (needs no Pi).
// `--pi` = KILN_PI=1 (DEMAND the Pi tier) AND "refuse a run in which no `PI-LIVE:` test passed". Without the second half, `KILN_PI=1 npm test`
// with the Pi tests excluded, skipped, or misnamed would report success having executed ZERO Pi tests — the same silent pass the runner
// already refuses for "zero tests". A SKIPPED `PI-LIVE:` test is not a pass, on either reporter (TAP prints a skip as `ok N - … # SKIP`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const kiln = fileURLToPath(new URL("../..", import.meta.url)).replace(/[\\/]$/, "");
const runner = join(kiln, "tests", "run.ts");
const spawnRunner = (args: string[], extra: NodeJS.ProcessEnv = {}) => {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra };
  delete env.NODE_TEST_CONTEXT; // a child `node --test` inside a test would otherwise behave like a test FILE of the parent run
  return spawnSync(process.execPath, [runner, ...args], { cwd: kiln, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env });
};
const pkg = JSON.parse(readFileSync(join(kiln, "package.json"), "utf8")) as { scripts: Record<string, string> };

test("FR-011: `--pi` sets KILN_PI=1, and a run in which a PI-LIVE test PASSED succeeds", () => {
  const r = spawnRunner(["--pi", "tests/runner/pi-live-pass.fixture.ts"], { KILN_PI: "" });
  assert.equal(r.status, 0, r.stdout.slice(-500) + r.stderr.slice(-300));
  assert.match(r.stdout, /ENV:pi=1/, "--pi demands the tier");
});

test("FR-011: `--pi` with NO passing PI-LIVE test FAILS — passing ordinary tests do not count", () => {
  const r = spawnRunner(["--pi", "tests/runner/pi-live-none.fixture.ts"]);
  assert.equal(r.status, 1, "the runner refuses a Pi run that executed no Pi test");
  assert.match(r.stderr, /PI-LIVE/, "and says why");
});

test("FR-011: a SKIPPED PI-LIVE test is not a pass — on the reporter this Node uses", () => {
  const r = spawnRunner(["--pi", "tests/runner/pi-live-skip.fixture.ts"]);
  assert.equal(r.status, 1, r.stdout.slice(-500));
  assert.match(r.stderr, /PI-LIVE/);
});

test("FR-011: WITHOUT `--pi` nothing changes — a plain run of a file with no PI-LIVE test still succeeds, and KILN_PI is left as the caller set it", () => {
  const plain = spawnRunner(["tests/runner/pi-live-none.fixture.ts"]);
  assert.equal(plain.status, 0, plain.stdout.slice(-400));
  const pass = spawnRunner(["tests/runner/pi-live-pass.fixture.ts"], { KILN_PI: "0" });
  assert.match(pass.stdout, /ENV:pi=0/, "without --pi the caller's KILN_PI is untouched");
});

test("FR-011: the `test:pi` script exists, points at the runner with --pi, and is not repo-root-relative", () => {
  assert.match(pkg.scripts["test:pi"] ?? "", /^node tests\/run\.ts --pi /);
  assert.match(pkg.scripts["test:pi"], /tests\/pi\//, "restricted to the Pi tests");
});
