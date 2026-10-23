// kiln/tests/contract/log.test.ts — T008 (US1)
// The JSONL record union validates each record type against the canonical schema.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validate, type Schema } from "../../validate/_core.ts";
import { checkLocalFirst } from "../../validate/log.ts";

const SCHEMA = JSON.parse(readFileSync(new URL("../../schemas/factory-log.schema.json", import.meta.url), "utf8")) as Schema;
const TS = "2026-09-12T00:00:00Z";

function perLine(rec: unknown): boolean {
  return validate(rec, SCHEMA).length === 0;
}

test("R1 transition record validates per-line", () => {
  assert.ok(perLine({ recordType: "transition", ts: TS, seq: 1, transition: { kind: "swap", from: "cold", to: "qwen3-32b" } }));
});
test("R1 gate-completion record (human decider) validates per-line", () => {
  assert.ok(
    perLine({
      recordType: "gate-completion",
      ts: TS,
      seq: 2,
      "gate-completion": { gate: 1, move: "approve", cost: { switches: 0, wallClock: "00:14" }, decidedBy: "human@token" },
     }),
   );
});
test("R1 human-decision record validates per-line", () => {
  assert.ok(perLine({ recordType: "human-decision", ts: TS, seq: 3, "human-decision": { decidedBy: "human@token", move: "approve", gate: "gate0" } }));
});
test("R1 cost record validates per-line", () => {
  assert.ok(perLine({ recordType: "cost", ts: TS, seq: 4, cost: { switches: 1, wallClock: "01:00" } }));
});
test("R1 wait record validates per-line (the only unresolved-gate shape)", () => {
  assert.ok(perLine({ recordType: "wait", ts: TS, seq: 5, wait: { gate: "gate0", token: "g0001", deadline: "2026-09-12T00:30:00Z" } }));
});
test("R1 pre-delegation record validates per-line", () => {
  assert.ok(perLine({ recordType: "pre-delegation", ts: TS, seq: 6 }));
});
test("R1 wait carrying status=approved is rejected (R3 guard in schema)", () => {
  assert.ok(!perLine({ recordType: "wait", ts: TS, seq: 7, wait: { gate: "gate0", token: "g0001", deadline: TS, status: "approved" } }));
});
test("R5 a record with a nested cloud/remote field is flagged (P-VIII)", () => {
  const rec = { recordType: "cost", ts: TS, seq: 1, cost: { switches: 0, wallClock: "00:01", service: { url: "https://example.com/x" } } };
  const failures = checkLocalFirst([rec]);
  assert.ok(failures.length > 0, "expected an R5 failure for the nested url");
});
test("R5 a flagged-unavailable marker is allowed (flag-not-block)", () => {
  const rec = { recordType: "cost", ts: TS, seq: 1, cost: { switches: 0, wallClock: "00:01" }, unavailableResource: "web" };
  assert.equal(checkLocalFirst([rec]).length, 0);
});
