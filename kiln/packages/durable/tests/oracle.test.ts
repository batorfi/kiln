// r13 T021 — the oracle is shown able to FAIL before anything is judged by it: for each invariant a hand-built inspection that violates only it is reported with that code, and clean ones report none.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInvariants, checkStability, type Invariant } from "./proof/support/oracle.ts";
import type { Inspection, MoveRecord, StoredOutboxEntry } from "#durable/types.ts";

const move: MoveRecord = { gateId: "g", key: "k", move: { kind: "approve", decidedBy: "p", briefRef: "b" }, decidedAt: 1, seq: 1 };
const entry = (type: StoredOutboxEntry["type"], seq: number, over: Partial<StoredOutboxEntry> = {}): StoredOutboxEntry => ({ seq, type, subject: "g", at: 1, actor: "a", cause: "c", data: null, ...over });
const base = (): Inspection => ({
  store: { libraryVersion: "1.4.0", contract: 1 }, tasks: [], gate: "absent",
  documents: { gate: false, brief: false, opened: false, moveCommitted: false, gateSettled: false },
  records: [], decision: "absent", gateTask: "absent", decisionMatchesRecord: true, timers: [], outbox: [],
  lane: { holders: 0, resident: null, hold: false, swaps: 0 }, commands: {},
});
const waiting = (): Inspection => ({ ...base(), gate: "waiting", documents: { gate: true, brief: true, opened: true, moveCommitted: false, gateSettled: false }, decision: "live", gateTask: "live", outbox: [entry("gate.opened", 1)] });
const settled = (): Inspection => ({ ...waiting(), gate: "settled", documents: { gate: true, brief: true, opened: true, moveCommitted: true, gateSettled: true }, records: [move], decision: "terminal", gateTask: "terminal", outbox: [entry("gate.opened", 1), entry("move.committed", 2), entry("gate.settled", 3)] });

test("clean inspections report nothing: absent, waiting, settled, and a settled gate whose gate task has not yet converged", () => {
  assert.deepEqual(checkInvariants(base()), []);
  assert.deepEqual(checkInvariants(waiting()), []);
  assert.deepEqual(checkInvariants(settled()), []);
  const lagging: Inspection = { ...settled(), gateTask: "live", documents: { ...settled().documents, gateSettled: false }, outbox: settled().outbox.slice(0, 2) };
  assert.deepEqual(checkInvariants(lagging), [], "the convergence window is legitimate");
});

const cases: [Invariant, string, Inspection, { blocked?: boolean }?][] = [
  ["I1", "a record beside a waiting gate", { ...waiting(), records: [move] }],
  ["I2", "a settled gate whose decision is not terminal", { ...settled(), decision: "live" }],
  ["I2", "a settled gate whose decision does not match the record", { ...settled(), decisionMatchesRecord: false }],
  ["I3", "a move without its completion (the half-applied move)", { ...waiting(), records: [move], documents: { ...waiting().documents, moveCommitted: true } }],
  ["I3", "a completed decision without a record", { ...waiting(), decision: "terminal" }],
  ["I3", "a gate document without its brief", { ...waiting(), documents: { ...waiting().documents, brief: false } }],
  ["I3", "a gate document without its gate.opened entry", { ...waiting(), documents: { ...waiting().documents, opened: false } }],
  ["I3", "a brief without a gate document", { ...base(), documents: { gate: false, brief: true, opened: false, moveCommitted: false, gateSettled: false } }],
  ["I3", "a move record without its move.committed entry", { ...settled(), documents: { ...settled().documents, moveCommitted: false } }],
  ["I3", "a terminal gate task without its gate.settled entry", { ...settled(), documents: { ...settled().documents, gateSettled: false } }],
  ["I3", "an outbox entry without an actor", { ...waiting(), outbox: [entry("gate.opened", 1, { actor: "" })] }],
  ["I3", "an outbox entry without a cause", { ...waiting(), outbox: [entry("gate.opened", 1, { cause: "" })] }],
  ["I4", "two move records", { ...settled(), records: [move, move] }],
  ["I6", "a waiting gate the library parked", waiting(), { blocked: true }],
  ["I7", "a sleep on the decision", { ...waiting(), timers: ["kiln.decision sleeping"] }],
  ["I8", "two lane holders", { ...base(), lane: { holders: 2, resident: null, hold: false, swaps: 0 } }],
  ["I8", "a lane lease with no acquired entry balance", { ...base(), lane: { holders: 1, resident: null, hold: false, swaps: 0 }, outbox: [entry("lane.acquired", 1, { subject: "lane" }), entry("lane.released", 2, { subject: "lane" })] }],
  ["I9", "one command key with two request hashes", { ...base(), commands: { k: ["h1", "h2"] } }],
];
for (const [inv, what, insp, ctx] of cases) {
  test(`${inv}: ${what}`, () => {
    const got = checkInvariants(insp, ctx);
    assert.ok(got.includes(inv), `expected ${inv}, got [${got.join(",")}]`);
  });
}

test("each violation is named by ITS invariant and not blamed on the unrelated ones (a few spot checks)", () => {
  assert.deepEqual(checkInvariants({ ...waiting(), timers: ["x"] }), ["I7"]);
  assert.deepEqual(checkInvariants({ ...base(), commands: { k: ["a", "b"] } }), ["I9"]);
  assert.deepEqual(checkInvariants({ ...settled(), records: [move, move] }), ["I2", "I4"]); // two records break "exactly one" (I2) and "at most one" (I4)
});

test("stability: a settled gate must stay settled with the same record (I5); a waiting gate must not settle on its own, nor be blocked (I6)", () => {
  assert.deepEqual(checkStability(settled(), settled()), []);
  assert.deepEqual(checkStability(waiting(), waiting()), []);
  assert.deepEqual(checkStability(settled(), waiting()), ["I5"]);
  assert.deepEqual(checkStability(settled(), { ...settled(), records: [{ ...move, key: "other" }] }), ["I5"]);
  assert.deepEqual(checkStability(waiting(), settled()), ["I6"]);
  assert.deepEqual(checkStability(waiting(), waiting(), { blocked: true }), ["I6"]);
});
