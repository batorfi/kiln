// kiln/tests/gate/gate.test.ts — T009/T010 (US2): the gate primitive · the headless contract (P-V).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  openGate,
  headlessWait,
  applyMove,
  resumeByToken,
  tokenFor,
  autoApprove,
  makePreDelegation,
  vetoHalt,
  isAutoApprovable,
  moveAllowed,
  type Gate,
} from "../../src/gate.ts";
import { moveVocabulary } from "../../contracts/move-vocabulary.ts";

function gate(id: Gate["id"]): Gate {
  return { id, open: true };
}

test("US2 SC-1 (a): a headless gate-3 emits exactly one WAIT and no gate-completion", () => {
  const g = gate(3);
  openGate(g);
  const wait = headlessWait(g, "2026-09-13T00:30:00Z");
  assert.equal(g.wait, wait, "the wait is the only unresolved shape (R3)");
  assert.match(wait.token, /^g[0-9a-f]+$/, "the token matches 001's factory-log pattern");
  assert.equal(g.decidedBy, undefined, "a headless gate is never decided (no auto-approval, P-V)");
  assert.equal(g.move, undefined, "a headless gate writes no gate-completion move");
  // No gate-completion can emerge: every move the gate now holds is "open/recorded".
  const stillOpen = resumeByToken(g, wait.token + "99", "human@x"); // wrong token ⇒ still open
  assert.equal(stillOpen, "still-open", "only that gate's own token resolves it (one channel, NC3)");
});

test("US2 SC-3 (b): an illegal move is rejected and the gate stays open (G3)", () => {
  const g = gate(6); // review is approve/restart — no `revise`
  openGate(g);
  assert.ok(!moveAllowed(6 as any, "revise"), "`revise` is not in review's MoveVocabulary");
  assert.throws(() => applyMove(g, "revise", "human@x"), /illegal move/, "the illegal move must throw");
  assert.equal(g.open, true, "the gate stays open after a rejected move");
});

test("US2 SC-4 (c): a token-resumed legal move yields a gate-completion with a human decidedBy", () => {
  const g = gate(1);
  openGate(g);
  const wait = headlessWait(g, "2026-09-13T00:30:00Z");
  const decision = resumeByToken(g, wait.token, "human@reviewer", "approve") as { gate: number; move: string; decidedBy: string };
  assert.notEqual(decision, "still-open", "a matching token resolves the gate");
  assert.ok(moveVocabulary(1).includes((decision as any).move), "the move is in MoveVocabulary(gate)");
  assert.match((decision as any).decidedBy, /^human@/, "the decider is a human (R3)");
  assert.equal(g.open, false, "the gate advanced after a legal, human-decided move");
});

test("US2 SC-1 (P-V): a headless gate with no decision and no pre-delegation never approves", () => {
  const g = gate(4); // a standard trailing gate
  openGate(g);
  headlessWait(g, "2026-09-13T00:30:00Z");
  assert.equal(g.open, true, "still open — a missing UI hides the gate, it never auto-approves");
  assert.equal(g.decidedBy, undefined, "no decidedBy was minted (no silent approval)");
});

test("US2 SC-4: a pre-delegation auto-crosses a trailing gate's approve side (distinct ledger, R4)", () => {
  const g = gate(4);
  openGate(g);
  const pre = makePreDelegation("spec #42", "spec #42 approved T", "2026-09-13T00:30:00Z", "reviewer");
  const decision = autoApprove(g, pre) as any;
  assert.equal(decision.move, "approve", "the auto-cross advances on the approve side only");
  assert.deepEqual(decision.preDelegation, pre, "the approval runs through a DISTINCT pre-delegation record");
  assert.equal(g.open, false, "a pre-delegated gate-cross closes the gate");
});

test("US2: Gate 0 is never auto-cruised (P-VI / FR-012)", () => {
  assert.equal(isAutoApprovable(gate("gate0")), false, "the program gate is not auto-approvable");
  assert.throws(
     () => autoApprove(gate("gate0"), makePreDelegation("p", "p T", "2026-09-13T01:00:00Z")),
    /Gate 0/,
    "auto-approving Gate 0 must throw");
});

test("US2 AC-4: a line-of-defense veto HALTS the cruise — no auto-completion (returns a WAIT)", () => {
  for (const veto of ["architecture-critic-objection", "reviewer-restart", "verifier-reject", "checkpoint-overflow"] as const) {
    const g = gate(4);
    openGate(g);
    const wait = vetoHalt(g, veto, "2026-09-13T00:30:00Z");
    assert.equal(g.open, true, `${veto} returns the lane to a human`);
    assert.ok(g.wait === wait, `${veto} records a WAIT, not a gate-completion`);
    assert.equal(g.decidedBy, undefined, `${veto} never auto-approves (no veto is lifted, P-I)`);
   }
});
