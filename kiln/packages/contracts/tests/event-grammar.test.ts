import { test } from "node:test";
import assert from "node:assert/strict";
import { correlationOf, findForbiddenKey, isActor, isCausation, parseRef, refString } from "#contracts/events/grammar.ts";

test("every actor form is accepted and near-misses are refused", () => {
  for (const a of ["human@batorfi", "human@r15-script", "person@example", "p@test", "director", "system", "factory", "task:12", "role:judge@gemma4:12b", "delegation:d-1", "script:r14"]) assert.ok(isActor(a), a);
  for (const a of ["", "human", "human@", "@x", "p", "someone-else", "task:", "task:x", "role:judge", "delegation:", "script:", "robot", "human@a b"]) assert.ok(!isActor(a), JSON.stringify(a));
  assert.ok(!isActor(undefined) && !isActor(7));
});
test("causation is a command key or an earlier event", () => {
  for (const c of ["cmd:k1", "cmd:walk:f:open:gate0:1", "evt:1", "evt:48302"]) assert.ok(isCausation(c), c);
  for (const c of ["", "k1", "evt:0", "evt:", "evt:-3", "cmd:"]) assert.ok(!isCausation(c), JSON.stringify(c));
});
test("each forbidden key is found at depth 3, with its path", () => {
  for (const k of ["prompt", "answer", "transcript", "note", "text", "content", "body", "code", "url", "http", "https", "cloud", "remote", "endpoint", "apiBase", "baseUrl", "externalUrl"]) {
    assert.deepEqual(findForbiddenKey({ a: { b: [{ [k]: "x" }] } }), { key: k, path: `data.a.b[0].${k}` }, k);
  }
  assert.equal(findForbiddenKey({ noteRef: "r", noteDigest: "d", reasoningRef: "r", prompts: 1 }), null);
  assert.equal(findForbiddenKey(null), null);
  assert.equal(findForbiddenKey("note"), null);
});
test("a reference round-trips through its locator", () => {
  for (const r of [
    { kind: "move", gateId: "gate:f:3-spec:1" } as const,
    { kind: "feature-move", feature: "f", key: "fm1" } as const,
    { kind: "triage", feature: "f" } as const,
  ]) assert.deepEqual(parseRef(refString(r)), r);
  assert.equal(parseRef("move:x"), null);
  assert.equal(parseRef("nonsense"), null);
});
test("correlation comes from the subject", () => {
  assert.equal(correlationOf("gate:demo:3-spec:2"), "run:demo");
  assert.equal(correlationOf("demo"), "run:demo");
  assert.equal(correlationOf("lane"), null);
  assert.equal(correlationOf("factory"), null);
});
