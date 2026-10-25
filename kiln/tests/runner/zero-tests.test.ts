// Runner case R5 (r12 T032): a run that executes nothing fails, with the zero-tests message — from any working directory.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const RUN = fileURLToPath(new URL("../run.ts", import.meta.url));
const run = (args: string[], cwd?: string) => spawnSync(process.execPath, [RUN, ...args], { cwd, encoding: "utf8" });

test("R5 a path matching no test makes the runner exit non-zero with the zero-tests message", () => {
  const r = run(["--new-only", "packages/no-such-package/tests"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /executed ZERO tests/);
});

test("R5 an existing directory with no test file in it fails the same way", () => {
  const r = run(["--new-only", "packages/cli/src"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /executed ZERO tests/);
});

test("R5 an unknown flag is a usage error, never silently ignored", () => {
  const r = run(["--no-such-flag"]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown flag "--no-such-flag"/);
});

test("the runner works from any working directory and reports its count", () => {
  const r = run(["--new-only", "packages/lane/tests"], tmpdir());
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /new: \d+ tests/);
});
