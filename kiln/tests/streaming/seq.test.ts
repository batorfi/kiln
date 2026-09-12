// kiln/tests/streaming/seq.test.ts — T010 (US1)
// R2: strictly-increasing, gap-free seq; non-decreasing ts; R1 malformed line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkOrdering, parseJsonl } from "../../validate/log.ts";
import { type Schema } from "../../validate/_core.ts";

const TS = "2026-09-12T00:00:00%sZ";

test("R2 sequential records pass", () => {
  const recs = [1, 2, 3, 4].map((n) => ({ recordType: "cost", ts: "2026-09-12T00:00:00Z", seq: n, cost: { switches: 0, wallClock: "00:00" } }));
  assert.equal(checkOrdering(recs as any).length, 0);
});
test("R2 a gap is named", () => {
  const recs = [1, 3].map((n) => ({ recordType: "cost", ts: TS, seq: n }));
  const f = checkOrdering(recs as any);
  assert.ok(f.length > 0, "gap should fail");
  assert.match(f.join("\n"), /expected 2/);
});
test("R2 a duplicate seq is named", () => {
  const recs = [1, 1].map((n) => ({ recordType: "cost", ts: "2026-09-12T00:00:00Z", seq: n }));
  const f = checkOrdering(recs as any);
  assert.match(f.join("\n"), /expected 2/);
});
test("R2 a non-decreasing ts violation is surfaced", () => {
  const recs = [
    { recordType: "cost", ts: "2026-09-12T00:05:00Z", seq: 1, cost: { switches: 0, wallClock: "00:00" } },
    { recordType: "cost", ts: "2026-09-12T00:00:00Z", seq: 2, cost: { switches: 0, wallClock: "00:00" } },
   ];
  const f = checkOrdering(recs as any);
  assert.ok(f.length > 0 && f.join("\n").includes("non-decreasing"), "ts regression should fail");
});
test("R1 a malformed JSON line is named and recorded", () => {
  const text = `{"recordType":"cost","ts":"${TS.replace("%s", "00")}","seq":1}\n{bad json\n`;
  const res = parseJsonl(text, {} as Schema);
  assert.ok(res.failures.some((f) => f.includes("malformed line 2")), "expected a named malformed-line failure");
});
test("R1 a blank line is ignored (stream hygiene)", () => {
  const text = `{"recordType":"cost","ts":"${TS.replace("%s", "00")}","seq":1,"cost":{"switches":0,"wallClock":"00:00"}}\n\n`;
  const res = parseJsonl(text, JSON.parse(readFileSync(new URL("../../schemas/factory-log.schema.json", import.meta.url), "utf8")) as Schema);
  assert.equal(res.failures.length, 0);
});
