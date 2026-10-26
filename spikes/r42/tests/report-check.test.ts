// The report checker, tested — a checker nobody has seen fail is the thing this spike exists to avoid. (Not a task of its own in tasks.md; added with T028.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkReport, LIBRARY_NAMES, SECTIONS } from "../src/report-check.ts";
import { renderMarkdown } from "../src/table.ts";
import { GUARANTEES, type Evidence, type GuaranteeStatus } from "../src/evidence-model.ts";

const g = (status: GuaranteeStatus) => ({ status, scenarios: 3, ran: 3, passed: 3, violated: [] });
const evidence: Evidence = {
  piDurable: { name: "@earendil-works/pi-durable", version: "1.4.0", integrity: "sha512-x" }, node: "v25.9.0", platform: "darwin", startedAt: "2026-10-26T08:00:00Z", finishedAt: "2026-10-26T08:10:00Z",
  strategies: {
    "native-signal": { name: "native-signal", native: true, testOnly: false, killPoints: [{ name: "p", phase: "move" }], exercised: 1, randomKills: 300, caveats: [{ text: "d needs restartLimit = Infinity", enforceable: true }],
      guarantees: Object.fromEntries(GUARANTEES.map((k) => [k, g("held")])) as any, notes: [] },
    "native-abort": { name: "native-abort", native: true, testOnly: false, killPoints: [{ name: "q", phase: "move" }], exercised: 1, randomKills: 0, caveats: [],
      guarantees: { ...Object.fromEntries(GUARANTEES.map((k) => [k, g("held")])), a: g("not-held") } as any, notes: [] },
  },
};
/** A complete, correct report built from the evidence the way the real one will be (the table is pasted verbatim from renderMarkdown). */
function report(over: { verdict?: string; table?: string; contract?: string; dropSection?: number; placeholder?: number } = {}): string {
  const bodies: Record<number, string> = {
    1: `**Verdict:** \`${over.verdict ?? "go"}\`\n\nThe sentence a person reads first.`,
    2: over.table ?? renderMarkdown(evidence),
    3: "C1, then C2.", 4: "ten points.", 5: over.contract ?? "move, gate, decision, key, outcome, refusal — KILN terms only.", 6: "Node floor.", 7: "Not needed.", 8: "Nothing becomes product code.", 9: "npm ci && npm run evidence", 10: "Nothing.",
  };
  return SECTIONS.map((title, i) => (over.dropSection === i + 1 ? "" : `## ${i + 1}. ${title}\n\n${over.placeholder === i + 1 ? "_To be written in Phase 8._" : bodies[i + 1]}\n`)).join("\n");
}
const codes = (r: string, e: Evidence | null = evidence) => checkReport(r, e).map((f) => f.code);

test("R1 a complete report that equals the evidence passes", () => {
  assert.deepEqual(checkReport(report(), evidence), []);
});

test("R2 a missing evidence file is a named failure (the report is checked against it)", () => {
  assert.ok(codes(report(), null).includes("report-evidence-missing"));
});

test("R3 a missing section, and a section still holding the placeholder, are both report-section-missing", () => {
  assert.ok(codes(report({ dropSection: 4 })).includes("report-section-missing"));
  const f = checkReport(report({ placeholder: 3 }), evidence).find((x) => x.code === "report-section-missing");
  assert.match(f!.detail, /still a placeholder/);
});

test("R4 a status that differs from the evidence is report-status-mismatch, naming strategy and guarantee", () => {
  const wrong = renderMarkdown(evidence).replace(/\| native-abort \| not-held/, "| native-abort | held");
  const f = checkReport(report({ table: wrong }), evidence).filter((x) => x.code === "report-status-mismatch");
  assert.ok(f.length >= 1 && /native-abort, guarantee a/.test(f[0].detail), JSON.stringify(f));
});

test("R5 a strategy missing from the report's table, or invented in it, is a mismatch", () => {
  const without = renderMarkdown(evidence).split("\n").filter((l) => !l.startsWith("| native-abort")).join("\n");
  assert.ok(checkReport(report({ table: without }), evidence).some((f) => f.code === "report-status-mismatch" && /native-abort/.test(f.detail)));
  const invented = renderMarkdown(evidence) + "\n| native-wishful | held | held | held | held | held | 1 of 1 | — |";
  assert.ok(checkReport(report({ table: invented }), evidence).some((f) => f.code === "report-status-mismatch" && /native-wishful/.test(f.detail)));
});

test("R6 the verdict must equal the one the rules derive; a missing verdict line is a failure too", () => {
  assert.ok(codes(report({ verdict: "go-with-fallback" })).includes("report-verdict-mismatch"), "the evidence supports go");
  assert.ok(codes(report({ verdict: "no-go" })).includes("report-verdict-mismatch"));
  assert.ok(codes(report().replace("**Verdict:**", "Result:")).includes("report-verdict-mismatch"));
});

test("R7 the contract section may not name the library — each forbidden name is caught", () => {
  for (const name of LIBRARY_NAMES) assert.ok(codes(report({ contract: `the gate is completed with ${name} somewhere` })).includes("report-contract-names-library"), name);
  assert.ok(!codes(report({ contract: "move, gate, decision" })).includes("report-contract-names-library"));
});

test("R8 the library may be named in the OTHER sections (findings, what was tried) — only the contract is held to KILN's terms", () => {
  assert.deepEqual(checkReport(report().replace("Node floor.", "pi-durable needs Node 22.19 and uses runtime.commit."), evidence), []);
});
