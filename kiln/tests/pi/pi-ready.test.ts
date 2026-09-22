// kiln/tests/pi/pi-ready.test.ts — T036, r8 · contracts/pi-ready.md R2, R3, R4, R6 · OFFLINE parts (a fake `pi` stands in; live parts are
// in pi-live.test.ts, gated by _pi-gate.ts). Skip is never a pass; each named failure is exactly the one the triggering condition should cause.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkPiReady, evaluateShapes } from "../../validate/pi-ready.ts";

function fakePiDir(script: string): { dir: string; bin: string } {
  const dir = mkdtempSync(join(tmpdir(), "kiln-piready-"));
  const bin = join(dir, "pi");
  writeFileSync(bin, `#!/bin/sh\n${script}\n`);
  chmodSync(bin, 0o755);
  return { dir, bin };
}

test("R3: no Pi found, KILN_PI unset -> skipped:true implies ready:false AND a non-empty skipReason", async () => {
  const r = await checkPiReady({ bin: "/definitely/not/a/real/pi/binary", env: {} });
  assert.equal(r.skipped, true);
  assert.equal(r.ready, false);
  assert.ok(r.skipReason && r.skipReason.length > 0);
});

test("F-1: no Pi found, KILN_PI=1 (DEMAND) -> FAILS as pi-missing, never skips", async () => {
  const r = await checkPiReady({ bin: "/definitely/not/a/real/pi/binary", env: { KILN_PI: "1" } });
  assert.equal(r.skipped, false);
  assert.equal(r.ready, false);
  assert.ok(r.failures.some((f) => f.code === "pi-missing"), JSON.stringify(r.failures));
});

test("check a: --no-pi (the CLI hook's shape) also reports pi-missing", async () => {
  const r = await checkPiReady({ bin: "/definitely/not/a/real/pi/binary", env: { KILN_PI: "1" }, hooks: { noPi: true } });
  assert.ok(r.failures.some((f) => f.code === "pi-missing"));
});

test("check b: --old-version reports pi-version-unmeasured and short-circuits before starting an extension", async () => {
  const { bin } = fakePiDir('if [ "$1" = "--version" ]; then echo 0.0.0; exit 0; fi; echo should-not-run-past-version-check; exit 1');
  const r = await checkPiReady({ bin, env: { KILN_PI: "1" } });
  assert.ok(r.failures.some((f) => f.code === "pi-version-unmeasured"), JSON.stringify(r.failures));
  assert.equal(r.piVersion, "0.0.0");
});

test("check h: --plant-autoload reports autoload-present", async () => {
  const r = await checkPiReady({ bin: "pi", env: {}, hooks: { plantAutoload: true } });
  assert.ok(r.failures.some((f) => f.code === "autoload-present"), JSON.stringify(r.failures));
});

test("check i: --extra-process reports allowlist-not-single", async () => {
  const r = await checkPiReady({ bin: "pi", env: {}, hooks: { extraProcess: true } });
  assert.ok(r.failures.some((f) => f.code === "allowlist-not-single"), JSON.stringify(r.failures));
});

test("check i: --extra-loopback ALSO reports allowlist-not-single", async () => {
  const r = await checkPiReady({ bin: "pi", env: {}, hooks: { extraLoopback: true } });
  assert.ok(r.failures.some((f) => f.code === "allowlist-not-single"), JSON.stringify(r.failures));
});

test("R6: the CLI hook names are exactly the documented set", async () => {
  const { HOOK_NAMES } = await import("../../validate/pi-ready.ts");
  assert.deepEqual(new Set(HOOK_NAMES), new Set([
    "no-pi", "old-version", "bad-entry", "throw-on-load", "no-command", "wrong-status",
    "approve-non-answer", "bad-manifest", "plant-autoload", "extra-process", "extra-loopback",
  ]));
});

test("check f (R2.1): a control that ANSWERS and non-control shapes that all REFUSE is ok", () => {
  const r = evaluateShapes({ control: "answered:approve", nonControl: ["no-answer:dismissed", "no-answer:cannot-ask"] });
  assert.deepEqual(r, { ok: true });
});

test('check f: a CONTROL that never answers fails — "a probe that can never say answered proves nothing" (found by the T045 mutation sweep: no prior test protected this)', () => {
  const r = evaluateShapes({ control: "no-answer:cannot-ask", nonControl: ["no-answer:dismissed", "no-answer:dismissed"] });
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /CONTROL case did not answer/);
});

test("check f: a non-control shape that answers fails, even when the control also answers", () => {
  const r = evaluateShapes({ control: "answered:approve", nonControl: ["no-answer:dismissed", "answered:approve"] });
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /non-answer shape was reported as answered/);
});

test("check f: the two failure reasons are DISTINCT strings — a mutation collapsing them together would be visible in the detail", () => {
  const a = evaluateShapes({ control: "no-answer:cannot-ask", nonControl: [] }).reason;
  const b = evaluateShapes({ control: "answered:approve", nonControl: ["answered:approve"] }).reason;
  assert.notEqual(a, b);
});

test("R4: reports the version it ran (or attempted) whenever a `pi` binary was found at all", async () => {
  const { bin } = fakePiDir('if [ "$1" = "--version" ]; then echo 9.9.9; exit 0; fi; exit 1');
  const r = await checkPiReady({ bin, env: { KILN_PI: "1" } });
  assert.equal(r.piVersion, "9.9.9");
});
