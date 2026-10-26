// r13 T014 — canonical JSON and the hashes: key order and whitespace never change a hash; different content always does; anything that is not plain JSON is refused.
import { test } from "node:test";
import assert from "node:assert/strict";
import { briefRef, canonicalJson, requestHash, sha256Hex } from "#durable/canonical.ts";

test("key order and nesting order never change the canonical text or the hash", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: [1, 2], c: null } }), canonicalJson({ a: { c: null, d: [1, 2] }, b: 1 }));
  assert.equal(briefRef({ x: 1, y: 2 }), briefRef({ y: 2, x: 1 }));
});

test("array order DOES matter, and so does every value", () => {
  assert.notEqual(briefRef([1, 2]), briefRef([2, 1]));
  assert.notEqual(briefRef({ a: 1 }), briefRef({ a: 2 }));
  assert.notEqual(briefRef({ a: "1" }), briefRef({ a: 1 }));
  assert.notEqual(briefRef(null), briefRef("null"));
});

test("the hash is sha-256 of the canonical text, in lower-case hex", () => {
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.match(briefRef({ a: 1 }), /^[0-9a-f]{64}$/);
});

test("a request hash depends on the kind AND the request", () => {
  assert.notEqual(requestHash("gate.open", { a: 1 }), requestHash("gate.move", { a: 1 }));
  assert.notEqual(requestHash("gate.open", { a: 1 }), requestHash("gate.open", { a: 2 }));
  assert.equal(requestHash("gate.open", { a: 1, b: 2 }), requestHash("gate.open", { b: 2, a: 1 }));
});

test("anything that is not plain JSON is refused", () => {
  for (const bad of [undefined, () => 1, Symbol("s"), 10n, NaN, Infinity, new Date(0), new Map(), { a: undefined }]) assert.throws(() => canonicalJson(bad), TypeError, String(bad));
  const cyc: Record<string, unknown> = {}; cyc.self = cyc;
  assert.throws(() => canonicalJson(cyc), /cycle/);
});

test("a shared (non-cyclic) reference is fine", () => {
  const shared = { z: 1 };
  assert.equal(canonicalJson({ a: shared, b: shared }), '{"a":{"z":1},"b":{"z":1}}');
});
