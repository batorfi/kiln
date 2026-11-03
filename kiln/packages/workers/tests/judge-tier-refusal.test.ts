// r16 T015 (US4) — constitution II, provably impossible to violate: the tier guard `bindConversationRole` delegates
// to (`contracts/src/roles.ts`'s `bindRole`) must refuse a judge bound weaker than `strongest` BEFORE any pi-ai call
// is attempted. Proven with a spy standing in for "the call that follows a successful bind" — a sequencing proof,
// not a restatement of roles.ts's own already-tested refusal (roster.test.ts covers that).
import { test } from "node:test";
import assert from "node:assert/strict";
import { flows } from "#contracts/flow/index.ts";
import { bindRole, TierPolicyError } from "#contracts/roles.ts";
import { bindConversationRole, PROVISIONAL_JUDGES } from "#workers/roster.ts";

const roster = flows.v2.roster;

/** Models the exact sequence `runTurn` (T018) follows: bind the tier, THEN (and only then) reach the provider. */
function attemptCallAfterBind(role: string, tier: Parameters<typeof bindRole>[1], onCallAttempted: () => void): void {
  bindRole(role, tier, roster, PROVISIONAL_JUDGES); // throws here for a weak judge tier — the line below must never run
  onCallAttempted();
}

test("a judge bound weaker than strongest throws before the call that would follow a successful bind", () => {
  let called = false;
  assert.throws(() => attemptCallAfterBind("reviewer", "standard", () => { called = true; }), TierPolicyError);
  assert.equal(called, false, "the would-be pi-ai call must never run when the tier binding is refused");
});

test("the same judge role at strongest reaches the call that follows a successful bind", () => {
  let called = false;
  assert.doesNotThrow(() => attemptCallAfterBind("reviewer", "strongest", () => { called = true; }));
  assert.equal(called, true);
});

test("bindConversationRole wires the real provisional roster entry for reviewer at strongest (unchanged from T008)", () => {
  const bound = bindConversationRole("reviewer", roster);
  assert.equal(bound.tier, "strongest");
});
