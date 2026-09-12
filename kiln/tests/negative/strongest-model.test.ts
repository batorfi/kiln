// kiln/tests/negative/strongest-model.test.ts — T019 (US3)
// G2/L1: a line-of-defense role cannot bind a weaker tier on ANY substrate.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bindRole,
  LINE_OF_DEFENSE,
  WORK,
  weakerBindingRejected,
  MITIGATION_CAP,
} from "../../src/roles.ts";

test("G2 every line-of-defense role rejects a weaker tier", () => {
  for (const role of LINE_OF_DEFENSE) {
    for (const weaker of ["standard", "cheap", "per-task"] as const) {
      assert.ok(weakerBindingRejected(role, weaker), `${role} must reject "${weaker}"`);
      }
    }
});
test("G2 a line-of-defense role binds strongest (the only legal tier)", () => {
  for (const role of LINE_OF_DEFENSE) {
    assert.equal(bindRole(role, "strongest"), "strongest", `${role} binds strongest`);
   }
});
test("L1 a weaker binding on ANY LODB role throws a G2/L1 config error", () => {
  assert.throws(() => bindRole("code-reviewer", "cheap"), /G2\/L1 config error/);
  assert.throws(() => bindRole("verifier", "standard"), /must be "strongest"/);
});
test("L1 a WORK role accepts a cheaper tier upstream of its far gate", () => {
  assert.equal(bindRole("pr-writer", "cheap"), "cheap", "work role accepts cheaper upstream");
  assert.equal(bindRole("worker", "per-task"), "per-task", "worker runs per-task tier");
});
test("G4 the mitigation cap is exactly 2 rounds", () => {
  assert.equal(MITIGATION_CAP, 2);
});
