import { test } from "node:test";
import assert from "node:assert/strict";
import { uuid7 } from "#contracts/events/id.ts";

const SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("an event id has the shape of a UUIDv7", () => {
  for (const [t, s] of [[0, 0], [1, 1], [Date.UTC(2026, 9, 28), 48388], [0xffffffffffff, 2 ** 44 - 1]] as const) assert.match(uuid7(t, s), SHAPE);
});
test("the same (time, seq) gives the same id — no randomness", () => {
  assert.equal(uuid7(1_788_000_000_000, 77), uuid7(1_788_000_000_000, 77));
});
test("ids sort by (time, seq)", () => {
  const ids = [[5, 9], [5, 10], [6, 1], [6, 2 ** 33], [7, 0]].map(([t, s]) => uuid7(t, s));
  assert.deepEqual([...ids].sort(), ids);
});
test("100 000 consecutive sequence numbers at one instant are all different", () => {
  const seen = new Set<string>();
  for (let s = 1; s <= 100_000; s++) seen.add(uuid7(1_788_000_000_000, s));
  assert.equal(seen.size, 100_000);
});
test("a time or a seq outside the fields is refused by name", () => {
  assert.throws(() => uuid7(-1, 1), /uuid7: time/);
  assert.throws(() => uuid7(0.5, 1), /uuid7: time/);
  assert.throws(() => uuid7(1, -1), /uuid7: seq/);
  assert.throws(() => uuid7(1, 2 ** 44), /uuid7: seq/);
});
