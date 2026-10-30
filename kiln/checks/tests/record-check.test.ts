// r15 T025/T026: `kiln check record` — part 1 (the catalog and the source against it) and its negative suite. The shipped tree passes and says how much it examined; EVERY deliberately broken
// input is refused with its own code and no other; a permissive checker, and one that always says the same thing, fail the suite (it is shown able to fail).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRecord, committedTypes } from "../record.ts";
import { ALL_CODES, NEGATIVE, pristine, runNegativeSuite, type Checker } from "./record-negative.ts";

const real: Checker = (o) => {
  const r = checkRecord(o);
  return { ok: r.ok, codes: r.failures.map((f) => f.code) };
};

test("the shipped tree passes, and says how many types, source files and committed types it examined", () => {
  const r = checkRecord();
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  assert.equal(r.name, "record");
  assert.match(r.notes[0], /^examined: \d+ types, \d+ source files, \d+ committed types$/);
  assert.ok((r.scanned ?? 0) > 50);
});

test("every member of the negative suite is refused with its own code and no noise", () => {
  const res = runNegativeSuite(real);
  assert.deepEqual(res.accepted.map((m) => m.rule), [], "members the check let through");
  assert.deepEqual(res.wrongCode.map((w) => `${w.member.rule} → reported ${w.reported.join(",")}`), [], "members refused without their code");
  assert.deepEqual(res.noise.map((n) => `${n.member.rule} → also ${n.unexpected.join(",")}`), [], "members that also reported an unrelated code");
  assert.ok(NEGATIVE.length >= ALL_CODES.length);
});

test("the unmutated data passes in the same harness (a failure above is the fault's, not the harness's)", () => assert.deepEqual(real(pristine()), { ok: true, codes: [] }));

test("the suite is shown able to FAIL: a checker that accepts everything, and one that always reports the same code", () => {
  const permissive = runNegativeSuite(() => ({ ok: true, codes: [] }));
  assert.equal(permissive.accepted.length, NEGATIVE.length, "a permissive check lets every member through");
  const stuck = runNegativeSuite(() => ({ ok: false, codes: ["record-vacuous"] }));
  assert.ok(stuck.wrongCode.length >= NEGATIVE.filter((m) => m.code !== "record-vacuous").length, "a check that always says one thing is caught on the members built for other codes");
});

test("the source scan finds the types a file commits, and only in files that commit", () => {
  assert.deepEqual(committedTypes('await appendEvent(tx, { type: "gate.opened", subject: "x" }); await appendEvent(tx, {\n  type: "lane.acquired" })'), ["gate.opened", "lane.acquired"]);
  assert.deepEqual(committedTypes('const entry = { type: "kiln.row" };'), [], "a file that never calls appendEvent commits nothing");
  assert.deepEqual(committedTypes('const i: OutboxIntent = { type: "walk.returned", actor: "x" };'), ["walk.returned"]);
});

test("a helper that takes the type as a parameter declares what it may be given, in a union named …EventType", () => {
  assert.deepEqual(committedTypes('export type UnitEventType = "unit.queued" | "unit.settled";\nawait appendEvent(tx, { type, subject: "x" });'), ["unit.queued", "unit.settled"]);
  assert.deepEqual(committedTypes('export type Mode = "a.b" | "c.d";\nawait appendEvent(tx, {});'), [], "a union not named …EventType is not an event type list");
});

test("a name outside the type grammar is not mistaken for an event type", () => {
  assert.deepEqual(committedTypes('appendEvent(tx, { type: "NotAType" }); appendEvent(tx, { type: "a" })'), []);
});
