// kiln/tests/contract/roadmap.test.ts — T013 (US2)
// The shipped empty ROADMAP.md validates against the schema and is a Q2=A blank.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateRoadmap } from "../../validate/roadmap.ts";

const MD = readFileSync(new URL("../../ROADMAP.md", import.meta.url), "utf8");

test("the shipped empty roadmap PASSES validation (Q2=A blank)", () => {
  const res = validateRoadmap(MD);
  assert.equal(res.valid, true, res.failures.join("\n"));
});
test("the empty roadmap has gate0.status=pending, no rows, no committed ordering", () => {
  const res = validateRoadmap(MD);
  const head = res.head as any;
  assert.equal(head.gate0.status, "pending");
  assert.equal(head.rows.length, 0);
  assert.equal(head.ordering.length, 0);
});
test("the empty roadmap carries a trace note (FR-009 / Principle VI)", () => {
  const res = validateRoadmap(MD);
  assert.match(String((res.head as any).trace), /P-VI/);
});
