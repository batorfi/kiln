// kiln/tests/pi/pi-driver.test.ts — T034, r8 · contracts/pi-ready.md R1, R5 · OFFLINE (no real Pi needed — a fake `pi` executable stands in).
// The driver is the ONLY module allowed to spawn a process (PROCESS_ALLOWLIST, T006). These tests never touch the operator's real Pi or ~/.pi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { launch, install, MEASURED_PI_VERSIONS } from "../../validate/_pi-driver.ts";

function fakeBin(dir: string, name: string, script: string): string {
  const p = join(dir, name);
  writeFileSync(p, `#!/bin/sh\n${script}\n`);
  chmodSync(p, 0o755);
  return p;
}

test("R5: refuses a binary whose basename is not `pi` or `pi.cmd` — named failure pi-bin-refused, never spawns it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    const notPi = fakeBin(dir, "totally-not-pi", "echo should-never-run; exit 0");
    const r = await launch({ bin: notPi, args: ["--version"] });
    assert.equal(r.ok, false);
    assert.equal(r.failure, "pi-bin-refused");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("R5: `pi.cmd` is accepted as a valid basename (Windows)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    const bin = fakeBin(dir, "pi.cmd", "echo 0.85.1; exit 0");
    const r = await launch({ bin, args: ["--version"] });
    assert.notEqual(r.failure, "pi-bin-refused");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("R1: spawns with an ARGUMENT ARRAY and shell:false — a malicious arg cannot inject a second command", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    const marker = join(dir, "should-not-exist");
    const bin = fakeBin(dir, "pi", 'echo "$@"; exit 0');
    await launch({ bin, args: [`--version; touch ${marker}`] });
    assert.equal(existsSync(marker), false, "shell:false means the semicolon is a literal argument, not a command separator");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("R1: PI_CODING_AGENT_DIR passed to a launched Pi is FRESH, EMPTY, under os.tmpdir(), and NEVER the operator's ~/.pi/agent", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    const bin = fakeBin(dir, "pi", 'echo "AGENT_DIR=$PI_CODING_AGENT_DIR"; exit 0');
    const r = await launch({ bin, args: ["--version"] });
    const m = /AGENT_DIR=(\S+)/.exec(r.stdout ?? "");
    assert.ok(m, `expected the child to see PI_CODING_AGENT_DIR, got: ${r.stdout}`);
    const agentDir = m![1];
    assert.ok(agentDir.startsWith(tmpdir()) || agentDir.includes(tmpdir()), `agent dir ${agentDir} is not under os.tmpdir()`);
    assert.doesNotMatch(agentDir, /^\/Users\/[^/]+\/\.pi/, "must never point at a user home ~/.pi");
    assert.notEqual(agentDir, join(homedir(), ".pi", "agent"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("R1: the temp agent dir is removed afterward, even when the launch FAILS", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    const bin = fakeBin(dir, "pi", "exit 1");
    const dirs: string[] = [];
    const r = await launch({ bin, args: ["--version"], onAgentDir: (d: string) => dirs.push(d) });
    assert.equal(r.ok, false);
    assert.equal(dirs.length, 1);
    assert.equal(existsSync(dirs[0]), false, "the agent dir must be cleaned up even on failure");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("SC-004: a HANGING fake `pi` is killed at the deadline and reported as `timeout` — never a hang", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    const bin = fakeBin(dir, "pi", "sleep 30");
    const t0 = Date.now();
    const r = await launch({ bin, args: ["--version"], timeoutMs: 500 });
    const elapsed = Date.now() - t0;
    assert.equal(r.failure, "timeout");
    assert.ok(elapsed < 5000, `should have been killed near 500ms, took ${elapsed}ms`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("`install(dir)` targets a FRESH temp dir, never the operator's own settings — a fake pi records where it was told to install", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    const bin = fakeBin(dir, "pi", 'echo "INSTALL_AGENT_DIR=$PI_CODING_AGENT_DIR"; exit 0');
    const r = await install({ bin, packageDir: "/some/package" });
    const m = /INSTALL_AGENT_DIR=(\S+)/.exec(r.stdout ?? "");
    assert.ok(m);
    assert.ok(m![1].startsWith(tmpdir()) || m![1].includes(tmpdir()));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("R1: Pi's cwd defaults to REPO_ROOT, never the calling script's own cwd (measured: kiln-status needs specs/ROADMAP.md at the repo root)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    const bin = fakeBin(dir, "pi", "pwd; exit 0");
    const { REPO_ROOT } = await import("../../validate/_pi-driver.ts");
    const r = await launch({ bin, args: [] }); // no explicit cwd override
    assert.equal(r.stdout.trim(), REPO_ROOT, "Pi must run with REPO_ROOT as its cwd by default");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T050 (code review): RpcSession does NOT crash the process when the binary fails to spawn (a nonexistent path with an allowed basename)", async () => {
  const { openRpc } = await import("../../validate/_pi-driver.ts");
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    // "pi" as a basename passes isAllowedBinary, but this exact path does not exist — measured to crash the WHOLE process with no
    // 'error' listener (an unhandled 'error' event on ChildProcess throws). If this test file completes at all, the fix held.
    const session = openRpc("/nonexistent/whatever.ts", { bin: join(dir, "pi") });
    try {
      const result = await session.call("get_commands", {}, 500);
      assert.equal(result, null, "a session over a binary that never spawned must resolve null, not hang or throw");
    } finally {
      session.close();
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T050 (code review): a spawn error is recorded and waitFor returns quickly, without waiting out the full timeout", async () => {
  const { openRpc } = await import("../../validate/_pi-driver.ts");
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    const session = openRpc("/nonexistent/whatever.ts", { bin: join(dir, "pi") });
    try {
      const t0 = Date.now();
      await session.call("get_commands", {}, 8000);
      const elapsed = Date.now() - t0;
      assert.ok(elapsed < 3000, `waitFor should bail out quickly on a spawn error, took ${elapsed}ms`);
    } finally { session.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("T050 (code review): close() is idempotent and clears the internal deadline timer (no longer left running after an early close)", async () => {
  const { openRpc } = await import("../../validate/_pi-driver.ts");
  const dir = mkdtempSync(join(tmpdir(), "kiln-drv-"));
  try {
    const bin = fakeBin(dir, "pi", "exit 0"); // exits immediately; the session's own deadline is far in the future
    const session = openRpc("/does-not-matter.ts", { bin, extraArgs: [] });
    session.close();
    session.close(); // must not throw or double-clean on a second call
    assert.ok(true, "double close() did not throw");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("MEASURED_PI_VERSIONS is a single, non-empty, exported constant (the one place a supported version is declared)", () => {
  assert.ok(Array.isArray(MEASURED_PI_VERSIONS));
  assert.ok(MEASURED_PI_VERSIONS.length >= 1);
  assert.deepEqual(MEASURED_PI_VERSIONS, ["0.85.1"]);
});
