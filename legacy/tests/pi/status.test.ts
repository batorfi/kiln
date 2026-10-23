// kiln/tests/pi/status.test.ts — T025, r8 · FR-005 · contracts/pi-extension.md E3 · data-model E5 · OFFLINE tier.
// kiln-status is READ-ONLY: it reads specs/ROADMAP.md under ctx.cwd, reports the TRUTH (not a canned string), and never throws — a missing or
// malformed roadmap is a named answer, never an unhandled error.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, statSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildStatus } from "../../pi/status.ts";
import { extractHead } from "../../validate/roadmap.ts";
import { nextEligibleRow } from "../../ui/factory-state.ts";

const REAL_ROADMAP = join(fileURLToPath(new URL("../../..", import.meta.url)).replace(/[\\/]$/, ""), "specs", "ROADMAP.md");
function fileURLToPath(u: URL) { return new URL(u).pathname; }

function tempRepo(roadmapMd?: string) {
  const root = mkdtempSync(join(tmpdir(), "kiln-status-"));
  mkdirSync(join(root, "specs"), { recursive: true });
  if (roadmapMd !== undefined) writeFileSync(join(root, "specs", "ROADMAP.md"), roadmapMd);
  return root;
}

test("E5: against the REAL repo roadmap, row count and nextEligible match the truth parsed by extractHead/nextEligibleRow", () => {
  const md = readFileSync(REAL_ROADMAP, "utf8");
  const head = extractHead(md) as { rows: { status: string }[] };
  const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
  const report = buildStatus(repoRoot);
  assert.equal(report.roadmapFound, true);
  assert.equal(report.rows.total, head.rows.length);
  assert.equal(report.nextEligible, nextEligibleRow(head.rows as any));
  assert.equal(report.lane, "none");
});

test("E5: the idle FactoryState fields are exactly as specified — resident/running/gate null, queue empty, switches 0, current empty", () => {
  const root = tempRepo('```json\n{"rows":[{"id":"r1","short":"x","deps":[],"status":"done"}],"ordering":["r1"],"gate0":{"status":"approved"}}\n```\n');
  try {
    const report = buildStatus(root);
    assert.equal(report.state.resident, null); assert.equal(report.state.running, null);
    assert.deepEqual(report.state.queue, []); assert.equal(report.state.switches, 0);
    assert.equal(report.state.current, ""); assert.equal(report.state.gate, null);
    assert.deepEqual(report.state.gate0, { status: "approved" });
    assert.equal(report.state.roadmap.length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("E5: a MISSING roadmap answers a named message — never throws", () => {
  const root = tempRepo(undefined);
  try {
    const report = buildStatus(root);
    assert.equal(report.roadmapFound, false);
    assert.match(report.line, new RegExp(`no roadmap found in ${root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("E5: a MALFORMED roadmap (no ```json block) answers a named message — never throws", () => {
  const root = tempRepo("# not a roadmap, no json block here\n");
  try {
    const report = buildStatus(root);
    assert.equal(report.roadmapFound, false);
    assert.match(report.line, /roadmap head not found|malformed/i);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("E5: buildStatus is READ-ONLY — the roadmap directory's file listing is unchanged after the call", () => {
  const root = tempRepo('```json\n{"rows":[],"ordering":[],"gate0":{"status":"approved"}}\n```\n');
  try {
    const before = readdirSync(join(root, "specs")).sort();
    buildStatus(root);
    assert.deepEqual(readdirSync(join(root, "specs")).sort(), before);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("E5: report.line includes the row count and the next eligible row id", () => {
  const root = tempRepo('```json\n{"rows":[{"id":"r1","short":"x","deps":[],"status":"queued"}],"ordering":["r1"],"gate0":{"status":"approved"}}\n```\n');
  try {
    const report = buildStatus(root);
    assert.match(report.line, /KILN status/);
    assert.match(report.line, /r1/);
    assert.equal(report.nextEligible, "r1");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// T045 mutation sweep: `report.rows.total` alone doesn't prove the PRINTED line is honest — a canned line count could ride alongside a
// correct structured field. Parse the number out of the line itself and compare it to the true count, at TWO different sizes so a fixed
// canned number cannot coincidentally match both.
test("E5 (T045): the row count PRINTED IN THE LINE — not just report.rows.total — matches the truth, at more than one row count", () => {
  for (const n of [1, 3]) {
    const rows = Array.from({ length: n }, (_, i) => ({ id: `r${i + 1}`, short: "x", deps: [], status: "queued" }));
    const root = tempRepo(`\`\`\`json\n${JSON.stringify({ rows, ordering: rows.map((r) => r.id), gate0: { status: "approved" } })}\n\`\`\`\n`);
    try {
      const report = buildStatus(root);
      const m = /(\d+)\s+roadmap row/.exec(report.line);
      assert.ok(m, `line has no row count: "${report.line}"`);
      assert.equal(Number(m![1]), n, `line says ${m![1]} rows but the truth is ${n}: "${report.line}"`);
      assert.equal(report.rows.total, n);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});
