// T008 — the kill hook is ABRUPT and the fault hook is not. A kill point must end the process with SIGKILL before any exit handler runs
// (a graceful stop would prove nothing about crash safety); with the variable unset or naming another point it does nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { faultPoint, killPoint, killPointsEnabled } from "../src/kill.ts";

const KILL_MODULE = fileURLToPath(new URL("../src/kill.ts", import.meta.url));

/** Runs a child that arms exit handlers writing a sentinel, then reaches killPoint("x") and, if it survives, writes "survived". */
function child(env: Record<string, string | undefined>): { signal: string | null; status: number | null; sentinel: boolean; survived: boolean; log: string } {
  const dir = mkdtempSync(join(tmpdir(), "r42-kill-"));
  try {
    const sentinel = join(dir, "exit-handler-ran");
    const marker = join(dir, "survived");
    const killLog = join(dir, "kill.log");
    const code = `
      import { writeFileSync } from "node:fs";
      import { killPoint } from ${JSON.stringify(KILL_MODULE)};
      process.on("exit", () => writeFileSync(${JSON.stringify(sentinel)}, "exit"));
      process.on("beforeExit", () => writeFileSync(${JSON.stringify(sentinel)}, "beforeExit"));
      killPoint("x");
      writeFileSync(${JSON.stringify(marker)}, "yes");
    `;
    const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
      env: { ...process.env, KILL_AT: undefined, KILL_LOG: killLog, ...env },
      encoding: "utf8",
    });
    return { signal: r.signal, status: r.status, sentinel: existsSync(sentinel), survived: existsSync(marker), log: existsSync(killLog) ? readFileSync(killLog, "utf8") : "" };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("K1 with KILL_AT unset, killPoint is a no-op", () => {
  const r = child({});
  assert.equal(r.signal, null);
  assert.equal(r.status, 0);
  assert.equal(r.survived, true);
  assert.equal(r.log, "", "nothing is logged when nothing fires");
});

test("K2 with KILL_AT naming another point, killPoint does nothing", () => {
  const r = child({ KILL_AT: "y" });
  assert.equal(r.signal, null);
  assert.equal(r.survived, true);
});

test("K3 with KILL_AT=x the process dies by SIGKILL at x — no exit handler runs, nothing after the point runs", () => {
  const r = child({ KILL_AT: "x" });
  assert.equal(r.signal, "SIGKILL");
  assert.equal(r.status, null, "killed by a signal, not an exit code");
  assert.equal(r.sentinel, false, "an abrupt kill must not run exit/beforeExit handlers");
  assert.equal(r.survived, false, "code after the kill point must not run");
});

test("K4 the point that fired is logged to KILL_LOG before dying, so a test can see which one it was", () => {
  const r = child({ KILL_AT: "x" });
  assert.equal(r.log.trim(), "x");
});

test("K5 killPointsEnabled reflects whether a kill is armed", () => {
  const was = process.env.KILL_AT;
  try {
    delete process.env.KILL_AT;
    assert.equal(killPointsEnabled(), false);
    process.env.KILL_AT = "anything";
    assert.equal(killPointsEnabled(), true);
  } finally {
    if (was === undefined) delete process.env.KILL_AT;
    else process.env.KILL_AT = was;
  }
  // and killPoint, unarmed for this name, returns here (the test process is still alive to assert it)
  killPoint("not-armed-here");
});

test("F1 faultPoint is a no-op unless FAULT_AT names it; when it does, it THROWS and the process keeps running", () => {
  const was = process.env.FAULT_AT;
  try {
    delete process.env.FAULT_AT;
    assert.doesNotThrow(() => faultPoint("store-write"));
    process.env.FAULT_AT = "store-write";
    assert.throws(() => faultPoint("store-write"), /injected store failure: store-write/);
    assert.doesNotThrow(() => faultPoint("another-point"), "only the named point fails");
  } finally {
    if (was === undefined) delete process.env.FAULT_AT;
    else process.env.FAULT_AT = was;
  }
});
