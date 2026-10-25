// Ported from the first program's tests/negative/strongest-model.test.ts (5 cases, r12 T054): G2/L1 — a judge cannot bind a weaker tier on ANY
// substrate. The ported cases pass the v1 ROSTER as the new third argument (a changed call site, not a changed expectation). New cases follow:
// the five judges of flow v2 (F7), docs-synthesizer (a judge under v1, not under v2), added-gate judges (F8), and the guard that an invalid
// roster is an error, never a "correct rejection" (code-review finding 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { bindRole, isJudge, TierPolicyError, weakerBindingRejected } from "#contracts/roles.ts";
import type { Tier } from "#contracts/roles.ts";
import { flowOf } from "#contracts/flow/index.ts";

const v1 = flowOf("v1").roster;
const v2 = flowOf("v2").roster;
const LINE_OF_DEFENSE = v1.judges; // the first program's four line-of-defense roles
const WORK = ["researcher", "concept-writer", "architecture-designer", "adr-maker", "worker", "techwriter", "pr-writer"];
const WEAKER: Tier[] = ["standard", "cheap", "per-task"];

// ── the five ported cases (v1 roster) ────────────────────────────────────────────────────────────────────────────────────────────────
test("G2 every line-of-defense role rejects a weaker tier", () => {
  for (const role of LINE_OF_DEFENSE) {
    for (const weaker of WEAKER) {
      assert.ok(weakerBindingRejected(role, weaker, v1), `${role} must reject "${weaker}"`);
    }
  }
});
test("G2 a line-of-defense role binds strongest (the only legal tier)", () => {
  for (const role of LINE_OF_DEFENSE) {
    assert.equal(bindRole(role, "strongest", v1), "strongest", `${role} binds strongest`);
  }
});
test("L1 a weaker binding on ANY LODB role throws a G2/L1 config error", () => {
  assert.throws(() => bindRole("code-reviewer", "cheap", v1), /G2\/L1 config error/);
  assert.throws(() => bindRole("verifier", "standard", v1), /must be "strongest"/);
});
test("L1 a WORK role accepts a cheaper tier upstream of its far gate", () => {
  assert.equal(bindRole("pr-writer", "cheap", v1), "cheap", "work role accepts cheaper upstream");
  assert.equal(bindRole("worker", "per-task", v1), "per-task", "worker runs per-task tier");
});
test("G4 the mitigation cap is exactly 2 rounds", () => {
  assert.deepEqual(flowOf("v1").gates.find((g) => g.key === "7-verification")!.mitigationCap, { default: 2, min: 2, max: 2 });
});

// ── flow v2 (constitution v2.1.0, Principle II) ──────────────────────────────────────────────────────────────────────────────────────
test("F7 each of the five v2 judges is refused every weaker tier, by name, and binds strongest", () => {
  assert.deepEqual([...v2.judges], ["architecture-critic", "design-critic", "code-reviewer", "ui-reviewer", "verifier"]);
  for (const role of v2.judges) {
    for (const weaker of WEAKER) {
      assert.throws(() => bindRole(role, weaker, v2), (e: unknown) => e instanceof TierPolicyError && /G2\/L1 config error/.test(e.message) && /must be "strongest"/.test(e.message) && e.message.includes(role));
      assert.ok(weakerBindingRejected(role, weaker, v2));
    }
    assert.equal(bindRole(role, "strongest", v2), "strongest");
  }
});
test("F7 docs-synthesizer is a judge under v1 and NOT under v2 (constitution v2.0.1: the Documentation gate is unjudged)", () => {
  assert.equal(isJudge("docs-synthesizer", v1), true);
  assert.equal(isJudge("docs-synthesizer", v2), false);
  assert.throws(() => bindRole("docs-synthesizer", "cheap", v1), /G2\/L1 config error/);
  assert.equal(bindRole("docs-synthesizer", "cheap", v2), "cheap", "never refused as a judge violation under v2");
  assert.equal(weakerBindingRejected("docs-synthesizer", "cheap", v2), false);
});
test("F7 design-critic and ui-reviewer are judges under v2 only", () => {
  for (const role of ["design-critic", "ui-reviewer"]) {
    assert.equal(isJudge(role, v1), false);
    assert.equal(isJudge(role, v2), true);
  }
});
test("F7 producers stay free to be cheaper under v2 (ux-designer included)", () => {
  for (const role of [...WORK, "ux-designer", "docs-synthesizer"]) assert.equal(bindRole(role, "cheap", v2), "cheap");
  assert.deepEqual(v2.judges.filter((j) => v2.producers.includes(j)), [], "no role is both judge and producer");
});
test("F8 a judge declared by an added gate (extraJudges) is refused below strongest under either roster", () => {
  for (const roster of [v1, v2]) {
    assert.equal(isJudge("security-judge", roster), false);
    assert.equal(isJudge("security-judge", roster, ["security-judge"]), true);
    assert.throws(() => bindRole("security-judge", "cheap", roster, ["security-judge"]), /G2\/L1 config error/);
    assert.ok(weakerBindingRejected("security-judge", "standard", roster, ["security-judge"]));
    assert.equal(bindRole("security-judge", "strongest", roster, ["security-judge"]), "strongest");
  }
});

// ── code-review finding 2 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("an invalid roster makes weakerBindingRejected THROW instead of reading as a correct rejection (TierPolicyError is the only refusal)", () => {
  const notARoster = flowOf("v1") as never; // a FlowDefinition where its roster belongs: the mistake a refactor would make
  assert.throws(() => weakerBindingRejected("worker", "cheap", notARoster), TypeError);
  assert.throws(() => weakerBindingRejected("verifier", "strongest", notARoster), TypeError);
  assert.equal(weakerBindingRejected("worker", "cheap", v1), false, "a non-judge is not refused");
  assert.equal(weakerBindingRejected("verifier", "strongest", v1), false, "the strongest tier is not refused");
  assert.ok(new TierPolicyError("x") instanceof Error);
});
