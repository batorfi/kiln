import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { digestOf, pairOf, resolveChecked, resolveRef } from "#durable/record/refs.ts";
import { withStore } from "./support.ts";

const sha = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

test("a note kept in a move record resolves from its locator, and matches its digest", () => withStore(async (s) => {
  await s.commit(async (tx) => { (await tx.doc<any>("kiln.move", "gate:f:3-spec:1", { record: null })).record = { gateId: "gate:f:3-spec:1", key: "m1", move: { kind: "revise", decidedBy: "human@x", briefRef: "b", note: "FR-3 is not testable" }, decidedAt: 1, seq: 1 }; });
  const pair = pairOf("note", { kind: "move", gateId: "gate:f:3-spec:1" }, "FR-3 is not testable");
  assert.deepEqual(pair, { noteRef: "move:gate:f:3-spec:1#note", noteDigest: sha("FR-3 is not testable") });
  assert.equal(await resolveRef(s, pair.noteRef), "FR-3 is not testable");
  assert.deepEqual(await resolveChecked(s, pair.noteRef, pair.noteDigest), { text: "FR-3 is not testable", matches: true });
  assert.equal((await resolveChecked(s, pair.noteRef, sha("other")))?.matches, false, "a text that does not match the digest is reported, not hidden");
}));

test("a feature-level move's note resolves from the walk document", () => withStore(async (s) => {
  await s.commit(async (tx) => { (await tx.doc<any>("kiln.walk", "f", {})).moves = { fm1: { key: "fm1", move: { kind: "reject", decidedBy: "human@x", target: "2-architecture", note: "wrong structure" }, decidedAt: 1, effect: "recorded" } }; });
  assert.equal(await resolveRef(s, "walk:f/moves/fm1#note"), "wrong structure");
  assert.equal(await resolveRef(s, "walk:f/moves/nope#note"), undefined);
}));

test("a triage reasoning resolves from the row's input", async () => {
  const reader = { snapshot: async () => undefined, tasks: async () => [{ kind: "kiln.row", input: { feature: "f", walk: { triage: { skip: true, reasoning: "a one-line change" } } } }] } as never;
  assert.equal(await resolveRef(reader, "row:f#triage.reasoning"), "a one-line change");
  assert.equal(await resolveRef(reader, "row:other#triage.reasoning"), undefined);
});

test("an unknown or malformed locator, or text no longer in the live store, resolves to undefined — never a guess", () => withStore(async (s) => {
  assert.equal(await resolveRef(s, "nonsense"), undefined);
  assert.equal(await resolveRef(s, "move:gate:f:3-spec:9#note"), undefined);
  assert.equal(digestOf(""), sha(""), "a missing note is the empty text");
  assert.deepEqual(pairOf("note", { kind: "triage", feature: "f" }, undefined), { noteRef: "row:f#triage.reasoning", noteDigest: sha("") });
}));
