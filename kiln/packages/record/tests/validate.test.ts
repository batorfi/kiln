import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog } from "#contracts/events/catalog/index.ts";
import { validateEvent } from "../src/events/validate.ts";
import { EXAMPLES, eventOf } from "./support/examples.ts";

const codes = (e: unknown): string[] => validateEvent(e).map((f) => f.code);

test("a valid example of every catalog type validates", () => {
  for (const type of catalog.keys()) {
    assert.ok(type in EXAMPLES, `no example for ${type}`);
    assert.deepEqual(validateEvent(eventOf(type, EXAMPLES[type])), [], type);
  }
});
test("event-type-unknown: a type the catalog does not contain", () => assert.deepEqual(codes(eventOf("gate.exploded", {})), ["event-type-unknown"]));
test("event-version-unknown: a version other than the current one", () => {
  assert.deepEqual(codes(eventOf("gate.opened", EXAMPLES["gate.opened"], { schema: "gate.opened/2" })), ["event-version-unknown"]);
  assert.deepEqual(codes(eventOf("gate.opened", EXAMPLES["gate.opened"], { schema: "gate.settled/1" })), ["event-version-unknown"]);
});
test("event-data-invalid: a missing, mistyped or extra field is named with its path", () => {
  const missing = validateEvent(eventOf("gate.settled", { key: "m1", move: "approve" }));
  assert.deepEqual(missing.map((f) => [f.code, f.path]), [["event-data-invalid", "data.decidedBy"]]);
  const wrong = validateEvent(eventOf("walk.fix-round", { ...(EXAMPLES["walk.fix-round"] as object), n: "one" }));
  assert.deepEqual(wrong.map((f) => [f.code, f.path]), [["event-data-invalid", "data.n"]]);
  const extra = validateEvent(eventOf("walk.completed", { approved: [], surprise: 1 }));
  assert.deepEqual(extra.map((f) => [f.code, f.path]), [["event-data-invalid", "data.surprise"]]);
});
test("event-field-forbidden: content and remote keys are refused by name before anything else about the data", () => {
  const note = validateEvent(eventOf("walk.completed", { approved: [], note: "please redo" }));
  assert.deepEqual(note.map((f) => [f.code, f.path]), [["event-field-forbidden", "data.note"]]);
  const url = validateEvent(eventOf("walk.completed", { approved: [{ url: "http://x" }] }));
  assert.equal(url[0].code, "event-field-forbidden");
});
test("event-actor-invalid: no actor, or one outside the grammar", () => {
  assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { actor: "" })), ["event-actor-invalid"]);
  assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { actor: "someone" })), ["event-actor-invalid"]);
});
test("event-cause-missing and event-cause-dangling", () => {
  assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { causation: "" })), ["event-cause-missing"]);
  assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { causation: "k1" })), ["event-cause-missing"]);
  assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { causation: "evt:4" })), []);
  assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { causation: "evt:5" })), ["event-cause-dangling"]);
  assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { causation: "evt:99" })), ["event-cause-dangling"]);
});
test("event-subject-invalid: empty, or outside the gate-id pattern", () => {
  assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { subject: "" })), ["event-subject-invalid"]);
  assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { subject: "Not A Subject" })), ["event-subject-invalid"]);
  assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { subject: "lane" })), []);
});
test("event-time-invalid", () => {
  for (const t of ["", "yesterday", "2026-13-45T00:00:00Z", "2026-10-28 10:00:00"]) assert.deepEqual(codes(eventOf("walk.completed", { approved: [] }, { time: t })), ["event-time-invalid"], t);
});
test("event-shape-invalid: not an object / missing envelope fields", () => {
  assert.deepEqual(codes(null), ["event-shape-invalid"]);
  assert.ok(codes({ type: "walk.completed" }).every((c) => c === "event-shape-invalid"));
});
test("the same event gives the same faults (pure)", () => {
  const e = eventOf("gate.settled", { key: 3 });
  assert.deepEqual(validateEvent(e), validateEvent(e));
});
