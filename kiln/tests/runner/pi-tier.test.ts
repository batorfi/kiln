// R1 (r12 T043): every row of the Pi decision table returns the stated decision. Pure: no process is spawned.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decidePiTier, installedPiVersion, piBinary } from "../pi-tier.ts";

const measured = ["0.85.1"] as const;
const base = { env: {}, demanded: false, installedVersion: "1.1.0", measured };

test("R1 an unmeasured Pi, tier not demanded → switch off, carrying both versions", () => {
  assert.deepEqual(decidePiTier(base), { action: "switch-off", installed: "1.1.0", measured });
});
test("R1 demanded with --pi → leave (the tests run and fail by name)", () => {
  assert.deepEqual(decidePiTier({ ...base, demanded: true }), { action: "leave" });
});
test("R1 demanded with KILN_PI=1 → leave", () => {
  assert.deepEqual(decidePiTier({ ...base, env: { KILN_PI: "1" } }), { action: "leave" });
});
test("R1 KILN_PI=0 → leave (already off, nothing extra is printed)", () => {
  assert.deepEqual(decidePiTier({ ...base, env: { KILN_PI: "0" } }), { action: "leave" });
});
test("R1 no Pi on the machine → leave (the legacy gate skips with its own reason)", () => {
  assert.deepEqual(decidePiTier({ ...base, installedVersion: null }), { action: "leave" });
});
test("R1 a measured version → leave", () => {
  assert.deepEqual(decidePiTier({ ...base, installedVersion: "0.85.1" }), { action: "leave" });
});
test("R1 any other KILN_PI value behaves as auto (never a silent demand, never a silent off)", () => {
  assert.equal(decidePiTier({ ...base, env: { KILN_PI: "auto" } }).action, "switch-off");
  assert.equal(decidePiTier({ ...base, env: { KILN_PI: "" } }).action, "switch-off");
});
test("the binary is KILN_PI_BIN or pi, and a binary not named pi is never run", () => {
  assert.equal(piBinary({}), "pi");
  assert.equal(piBinary({ KILN_PI_BIN: "/x/pi" }), "/x/pi");
  assert.equal(installedPiVersion("/bin/echo"), null);
  assert.equal(installedPiVersion("/definitely/not/a/real/pi"), null);
});
