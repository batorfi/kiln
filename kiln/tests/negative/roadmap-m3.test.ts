// kiln/tests/negative/roadmap-m3.test.ts — T014 (US2)
// M1/M3/M4: a committed program is rejected; only the empty blank admits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRoadmap, checkM1, checkM3, checkM4 } from "../../validate/roadmap.ts";
import { readFileSync } from "node:fs";
import { type Schema } from "../../validate/_core.ts";

const schema = JSON.parse(readFileSync(new URL("../../schemas/roadmap.schema.json", import.meta.url), "utf8")) as Schema;
function md(head: any): string {
  return `# roadmap\n\`\`\`json\n${JSON.stringify(head, null, 2)}\n\`\`\`\n`;
}

// A minimal valid pending blank to mutate from.
const BLANK = {
  deliverable: "kiln-v1-empty",
  owner: "human@token",
  updated: "2026-09-12T00:00:00Z",
  rows: [] as any[],
  ordering: [] as string[],
  chain_unattended: false,
  gate0: { status: "pending" },
  trace: "P-VI",
};

test("M3 an approved gate0 with NO human-decided fields is REJECTED", () => {
  const head = { ...BLANK, gate0: { status: "approved" } };
  const res = validateRoadmap(md(head), schema);
  assert.equal(res.valid, false, "approved w/o record must fail");
  assert.ok(res.failures.some((f) => f.includes("M3")), "must be an M3 failure");
});
test("M1 ordering referencing an unknown row is REJECTED", () => {
  const head = { ...BLANK, ordering: ["r1"] };
  const f = checkM1(head);
  assert.ok(f.some((x) => x.includes('unknown row id "r1"')), "ordering r1 must be unresolved");
});
test("M1 a row whose deps reference an unknown row is REJECTED", () => {
  const head = { ...BLANK, rows: [{ id: "r1", short: "x", deps: ["r999"], status: "queued" }] };
  const f = checkM1(head);
  assert.ok(f.some((x) => x.includes('unknown row id "r999"')), "dep r999 must be unresolved");
});
test("M1 a cyclic dep graph is REJECTED", () => {
  const head = {
     ...BLANK,
    rows: [
      { id: "r1", short: "a", deps: ["r2"], status: "queued" },
      { id: "r2", short: "b", deps: ["r1"], status: "queued" },
      ],
    };
  assert.ok(checkM1(head).some((x) => x.includes("cycle")), "a cycle must be detected");
});
test("M4 status=active without a gate (1..9) is REJECTED", () => {
  const head = { ...BLANK, rows: [{ id: "r1", short: "x", deps: [], status: "active" }] };
  assert.ok(checkM4(head).some((x) => x.includes('requires gate in 1..9')), "active needs a gate");
});
test("M4 status=done without a @PR#NN outcome is REJECTED", () => {
  const head = { ...BLANK, rows: [{ id: "r1", short: "x", deps: [], status: "done" }] };
  assert.ok(checkM4(head).some((x) => x.includes("@PR#")), "done needs an outcome");
});
test("a FULLY human-decided approved program PASSES (Gate 0 admission shape)", () => {
  const head = {
     ...BLANK,
    rows: [
      { id: "r1", short: "core lane", deps: [], status: "done", outcome: "@PR#11" },
      { id: "r2", short: "gate rail", deps: ["r1"], status: "queued" },
      ],
    ordering: ["r1", "r2"],
    gate0: { status: "approved", rows: "r1..r2", decided_by: "human@token", at: "2026-09-12T10:00:00Z" },
    };
  const res = validateRoadmap(md(head), schema);
  assert.equal(res.valid, true, res.failures.join("\n"), "a proper Gate-0 admission must pass");
});
