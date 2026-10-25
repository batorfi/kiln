// R2–R4, R7 (r12 T046): the runner's Pi decision as seen by the legacy child. A stub `pi` executable is created at run time (printing a version)
// and KILN_PI_BIN points at it; KILN_LEGACY_RUNNER replaces the frozen runner with a probe that reports its environment and arguments.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RUN = fileURLToPath(new URL("../run.ts", import.meta.url));
const PROBE = fileURLToPath(new URL("./fixtures/legacy-probe.ts", import.meta.url));
const SKIP_LINE = /live-Pi tier skipped: Pi (\S+) installed, measured \[0\.85\.1\]/g;

function stubPi(dir: string, version: string): string {
  const bin = join(dir, "pi");
  writeFileSync(bin, `#!/bin/sh\necho ${version}\n`);
  chmodSync(bin, 0o755);
  return bin;
}

function runner(args: string[], env: Record<string, string | undefined>) {
  const clean: Record<string, string | undefined> = { ...process.env, KILN_PI: undefined, KILN_PI_BIN: undefined, NODE_TEST_CONTEXT: undefined, KILN_LEGACY_RUNNER: PROBE, ...env };
  return spawnSync(process.execPath, [RUN, "--legacy-only", ...args], { encoding: "utf8", env: clean as NodeJS.ProcessEnv });
}
const probe = (stdout: string) => /PROBE KILN_PI=(\S+) ARGS=(\[.*\])/.exec(stdout);

function withDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "kiln-pi-"));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("R2 a stub Pi 1.1.0 → the skip line is printed once and the legacy child starts with KILN_PI=0", () => {
  withDir((dir) => {
    const r = runner([], { KILN_PI_BIN: stubPi(dir, "1.1.0") });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal([...r.stdout.matchAll(SKIP_LINE)].length, 1, "printed exactly once");
    assert.match(r.stdout, /Pi 1\.1\.0 installed/);
    assert.equal(probe(r.stdout)?.[1], "0");
    assert.match(r.stdout, /legacy: 1 tests/);
  });
});

test("R3 a stub Pi 0.85.1 (measured) → nothing is printed and the legacy child's environment is unchanged", () => {
  withDir((dir) => {
    const r = runner([], { KILN_PI_BIN: stubPi(dir, "0.85.1") });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.doesNotMatch(r.stdout, /live-Pi tier skipped/);
    assert.equal(probe(r.stdout)?.[1], "unset");
  });
});

test("R4 --pi with a stub Pi 1.1.0 → the tier is demanded: KILN_PI is NOT switched off and --pi reaches the legacy runner", () => {
  withDir((dir) => {
    const r = runner(["--pi"], { KILN_PI_BIN: stubPi(dir, "1.1.0") });
    assert.doesNotMatch(r.stdout, /live-Pi tier skipped/);
    const p = probe(r.stdout);
    assert.equal(p?.[1], "unset");
    assert.deepEqual(JSON.parse(p![2]), ["--pi"]);
  });
});

test("R4 KILN_PI=1 in the environment is a demand too, whatever the version", () => {
  withDir((dir) => {
    const r = runner([], { KILN_PI_BIN: stubPi(dir, "1.1.0"), KILN_PI: "1" });
    assert.doesNotMatch(r.stdout, /live-Pi tier skipped/);
    assert.equal(probe(r.stdout)?.[1], "1");
  });
});

test("KILN_PI=0 already in the environment → left alone, nothing extra printed", () => {
  withDir((dir) => {
    const r = runner([], { KILN_PI_BIN: stubPi(dir, "1.1.0"), KILN_PI: "0" });
    assert.doesNotMatch(r.stdout, /live-Pi tier skipped/);
    assert.equal(probe(r.stdout)?.[1], "0");
  });
});

test("no Pi at all → left alone (the legacy gate skips with its own reason)", () => {
  const r = runner([], { KILN_PI_BIN: "/definitely/not/a/real/pi" });
  assert.doesNotMatch(r.stdout, /live-Pi tier skipped/);
  assert.equal(probe(r.stdout)?.[1], "unset");
});

test("--live, --cost and --serial are forwarded to the legacy runner unchanged", () => {
  const r = runner(["--live", "--serial"], { KILN_PI_BIN: "/definitely/not/a/real/pi" });
  assert.deepEqual(JSON.parse(probe(r.stdout)![2]), ["--live", "--serial"]);
});

test("R7 a failing legacy suite makes the runner exit non-zero; a legacy suite that ran ZERO tests fails too", () => {
  const failing = runner([], { KILN_PI_BIN: "/definitely/not/a/real/pi", PROBE_MODE: "fail" });
  assert.equal(failing.status, 1);
  const zeroRun = runner([], { KILN_PI_BIN: "/definitely/not/a/real/pi", PROBE_MODE: "zero" });
  assert.equal(zeroRun.status, 1);
  assert.match(zeroRun.stderr, /legacy suite executed ZERO tests/);
});

test("--new-only and --legacy-only exclude each other", () => {
  const r = spawnSync(process.execPath, [RUN, "--new-only", "--legacy-only"], { encoding: "utf8" });
  assert.equal(r.status, 2);
});
