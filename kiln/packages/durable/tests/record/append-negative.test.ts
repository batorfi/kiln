// The commit-time negative suite (contracts/event-catalog.md §1): one member per refusal code, each run INSIDE a real commit that also writes a document. Each asserts the named rejection AND that
// nothing the commit would have recorded exists afterwards — the document, the head and the chunk are unchanged (FR-013, constitution VII).
import { test } from "node:test";
import assert from "node:assert/strict";
import { appendEvent, EventRejected, type EventDraft } from "#durable/record/append.ts";
import type { Store } from "#durable/store.ts";
import { draft, withStore } from "./support.ts";

const snapshotOf = async (s: Store): Promise<string> => JSON.stringify([await s.snapshot("kiln.record", "head"), await s.snapshot("kiln.event", "0"), await s.snapshot("kiln.record", "run:f"), await s.snapshot("kiln.gate", "g")]);

async function refuses(s: Store, bad: EventDraft, code: string, path?: string): Promise<void> {
  await s.commit((tx) => appendEvent(tx, draft())); // a record that is not empty
  const before = await snapshotOf(s);
  await assert.rejects(
    s.commit(async (tx) => {
      (await tx.doc<{ v?: number }>("kiln.gate", "g", {})).v = 1; // the state the event would have recorded
      await appendEvent(tx, bad);
    }),
    (e: unknown) => e instanceof EventRejected && e.code === code && (path === undefined || e.faults[0].path === path),
    `${code}${path ? ` at ${path}` : ""}`,
  );
  assert.equal(await snapshotOf(s), before, `${code}: the state did not change`);
}

const CASES: [string, Partial<EventDraft>, string, string?][] = [
  ["event-type-unknown", { type: "gate.exploded" }, "event-type-unknown"],
  ["event-data-invalid: a missing field", { type: "gate.settled", subject: "gate:f:3-spec:1", data: { key: "m1", move: "approve" } }, "event-data-invalid", "data.decidedBy"],
  ["event-data-invalid: a mistyped field", { data: { approved: "all" } }, "event-data-invalid", "data.approved"],
  ["event-data-invalid: an extra field", { data: { approved: [], surprise: 1 } }, "event-data-invalid", "data.surprise"],
  ["event-field-forbidden: a note", { data: { approved: [], note: "please redo" } }, "event-field-forbidden", "data.note"],
  ["event-field-forbidden: a url", { data: { approved: [{ url: "http://x" }] } }, "event-field-forbidden"],
  ["event-field-forbidden: a prompt, deep", { type: "walk.admitted", data: { gate: "g", required: [], cap: 2, overrideTriage: false, applicability: { x: { applies: true, why: "rule", prompt: "p" } }, skipped: [] } }, "event-field-forbidden"],
  ["event-actor-invalid: none", { actor: "" }, "event-actor-invalid"],
  ["event-actor-invalid: not an actor", { actor: "somebody" }, "event-actor-invalid"],
  ["event-cause-missing", { cause: "" }, "event-cause-missing"],
  ["event-cause-dangling", { cause: "", causeEvent: 99 }, "event-cause-dangling"],
  ["event-subject-invalid", { subject: "Not A Subject" }, "event-subject-invalid"],
  ["event-time-invalid: not a number", { at: Number.NaN }, "event-time-invalid"],
  ["event-time-invalid: before 1970", { at: -5 }, "event-time-invalid"],
];

for (const [name, over, code, path] of CASES) test(`${name} — refused by name, the state unchanged`, () => withStore((s) => refuses(s, draft(over), code, path)));

test("an event for the gate settle with no decider cannot be written (FR-014)", () => withStore((s) => refuses(s, draft({ type: "gate.settled", subject: "gate:f:3-spec:1", data: { key: "m1", move: "approve", decidedBy: "" } }), "event-data-invalid", "data.decidedBy")));

test("the refusal names the rule, the type and the path in its message", () => withStore(async (s) => {
  await assert.rejects(s.commit((tx) => appendEvent(tx, draft({ data: { approved: [], note: "x" } }))), /event-field-forbidden: walk\.completed data\.note — "note" may never appear/);
}));

test("a command key that looks like an event reference is a command key: \"evt:1\" is recorded as cmd:evt:1, never as a cause that points at event 1", () => withStore(async (s) => {
  await s.commit((tx) => appendEvent(tx, draft())); // event 1
  const e = await s.commit((tx) => appendEvent(tx, draft({ cause: "evt:1" })));
  assert.equal(e.causation, "cmd:evt:1");
  const earlier = await s.commit((tx) => appendEvent(tx, draft({ cause: "", causeEvent: 1 })));
  assert.equal(earlier.causation, "evt:1", "an earlier event as the cause is said with causeEvent");
}));

test("the record's time never goes backwards: an event handed an earlier instant than the one before it is stamped with that one's", () => withStore(async (s) => {
  const a = await s.commit((tx) => appendEvent(tx, draft({ at: 2_000_000_000_000 })));
  const b = await s.commit((tx) => appendEvent(tx, draft({ at: 1_000_000_000_000 }))); // a writer that read the clock before another commit, or a wall clock that stepped back
  assert.equal(b.time, a.time);
  assert.ok(b.id > a.id, "ids still sort by (time, seq)");
  const c = await s.commit((tx) => appendEvent(tx, draft({ at: 2_000_000_000_500 })));
  assert.equal(Date.parse(c.time), 2_000_000_000_500, "a later instant is kept as it is");
}));
