// T028 — does the WRITTEN report agree with the EVIDENCE? The report is the product of the row, so its numbers must be the runner's numbers, not
// a person's recollection of them. `npm run report-check` fails by name when: the evidence is missing · a required section is missing or still a
// placeholder · a status in the report's table differs from out/evidence.json · the verdict differs from the one the rules derive · the contract
// section (5) names the library (SC-009: the contract must outlive the API). Exit 0 only when none of those holds.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isEntryPoint } from "./entry.ts";
import { GUARANTEES, type Evidence } from "./evidence-model.ts";
import { deriveVerdict } from "./verdict.ts";

const SPIKE_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const DEFAULT_REPORT = join(SPIKE_ROOT, "..", "..", "specs", "010-external-completion-spike", "spike-report.md");
export const DEFAULT_EVIDENCE = join(SPIKE_ROOT, "out", "evidence.json");

/** The ten sections of contracts/spike-report.md §1, in order. */
export const SECTIONS = ["Verdict", "The five guarantees", "What was tried", "Kill points", "The contract for r13", "Findings for r13", "Upstream proposal", "Fate of the code", "Reproduce", "Unproven"] as const;
/** Names that must not appear in the contract section: the contract is stated in KILN's terms only. */
export const LIBRARY_NAMES = ["pi-durable", "@earendil-works", "Harness", "runtime.commit", "defineTask", "sleepUntil", "abortTask", "waitForTask"] as const;
const PLACEHOLDER = /_To be written/;

export interface CheckFailure {
  code: "report-evidence-missing" | "report-section-missing" | "report-status-mismatch" | "report-verdict-mismatch" | "report-contract-names-library";
  detail: string;
}

/** The text of section `n` (1-based): from its `## n.` heading to the next `## ` heading, or null. */
function section(report: string, n: number): string | null {
  const parts = report.split(/^## /m).slice(1);
  const mine = parts.find((p) => new RegExp(`^${n}\\.\\s`).test(p));
  return mine ?? null;
}

const clean = (cell: string): string => cell.replace(/`/g, "").replace(/†.*$/, "").replace(/\(control\)/, "").trim();

export function checkReport(report: string, evidence: Evidence | null): CheckFailure[] {
  const failures: CheckFailure[] = [];
  const fail = (code: CheckFailure["code"], detail: string): void => void failures.push({ code, detail });

  SECTIONS.forEach((title, i) => {
    const s = section(report, i + 1);
    if (s === null || !s.toLowerCase().startsWith(`${i + 1}. ${title.toLowerCase()}`)) fail("report-section-missing", `section ${i + 1} "${title}" is missing`);
    else if (PLACEHOLDER.test(s)) fail("report-section-missing", `section ${i + 1} "${title}" is still a placeholder`);
  });

  if (!evidence) {
    fail("report-evidence-missing", "out/evidence.json is missing: run `npm run evidence` first — the report is checked against it");
  } else {
    // the status table (section 2)
    const s2 = section(report, 2) ?? "";
    const seen = new Set<string>();
    for (const line of s2.split("\n")) {
      if (!line.startsWith("|") || /^\|\s*-/.test(line) || /^\|\s*Strategy\s*\|/i.test(line)) continue;
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length < 6) continue;
      const name = clean(cells[0]);
      const e = evidence.strategies[name];
      if (!e) {
        fail("report-status-mismatch", `the report's table has strategy "${name}", which is not in the evidence`);
        continue;
      }
      seen.add(name);
      GUARANTEES.forEach((g, i) => {
        const written = cells[1 + i];
        if (written !== e.guarantees[g].status) fail("report-status-mismatch", `${name}, guarantee ${g}: the report says "${written}", the evidence says "${e.guarantees[g].status}"`);
      });
    }
    for (const name of Object.keys(evidence.strategies)) if (!seen.has(name)) fail("report-status-mismatch", `strategy "${name}" is in the evidence but not in the report's status table (section 2)`);

    // the verdict (section 1)
    const s1 = section(report, 1) ?? "";
    const m = /\*\*Verdict:\*\*\s*`?(go-with-fallback|go|no-go)`?/.exec(s1);
    const derived = deriveVerdict(evidence).verdict;
    if (!m) fail("report-verdict-mismatch", "section 1 has no `**Verdict:** …` line");
    else if (m[1] !== derived) fail("report-verdict-mismatch", `the report says "${m[1]}", the rules derive "${derived}" from the evidence`);
  }

  // the contract names no library (section 5)
  const s5 = section(report, 5);
  if (s5 !== null) {
    const hits = LIBRARY_NAMES.filter((n) => s5.includes(n));
    if (hits.length) fail("report-contract-names-library", `section 5 (the contract for r13) names the library: ${hits.join(", ")}`);
  }
  return failures;
}

function main(argv: string[]): number {
  const at = (flag: string): string | undefined => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  const reportPath = at("--report") ?? DEFAULT_REPORT;
  const evidencePath = at("--evidence") ?? DEFAULT_EVIDENCE;
  if (!existsSync(reportPath)) {
    console.error(`FAIL report-section-missing — there is no report at ${reportPath}`);
    return 1;
  }
  const evidence = existsSync(evidencePath) ? (JSON.parse(readFileSync(evidencePath, "utf8")) as Evidence) : null;
  const failures = checkReport(readFileSync(reportPath, "utf8"), evidence);
  if (failures.length === 0) {
    console.log("PASS report-check — every status and the verdict in the report equal the evidence; the contract names no library");
    return 0;
  }
  for (const f of failures) console.log(`FAIL ${f.code} — ${f.detail}`);
  return 1;
}

if (isEntryPoint(import.meta.url)) process.exitCode = main(process.argv.slice(2));
