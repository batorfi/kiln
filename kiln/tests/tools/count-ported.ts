// The ported-test census (r12 T083; spec SC-002, FR-015): lists each ported test file with its case count on both sides and compares them with the
// census in specs/009-kiln-foundations-reset/research.md R13 — 54 ported, plus 19 that wait in legacy/ (each listed in checks/legacy-copies.json
// with the row that ports it). Exits 1 on any mismatch. Lives under tests/ because it is a tool, not a check.
//   node tests/tools/count-ported.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const kilnDir = fileURLToPath(new URL("../..", import.meta.url));
const legacyDir = join(kilnDir, "..", "legacy");

/** Research R13, by legacy file (relative to legacy/): [cases in the first program, disposition]. */
const CENSUS: Record<string, [number, "port" | "wait"]> = {
  "tests/contract/gate-rail.test.ts": [6, "port"], "tests/contract/log.test.ts": [9, "port"], "tests/contract/roadmap.test.ts": [3, "port"],
  "tests/negative/no-silent-approval.test.ts": [4, "port"], "tests/negative/roadmap-m3.test.ts": [7, "port"], "tests/negative/strongest-model.test.ts": [5, "port"],
  "tests/netscan/bypass.test.ts": [7, "port"], "tests/netscan/hardened.test.ts": [7, "port"], "tests/netscan/strictly-stronger.test.ts": [3, "port"], "tests/netscan/untouched.test.ts": [3, "port"],
  "tests/negative/async-await.test.ts": [4, "wait"], "tests/negative/not-silent.test.ts": [5, "wait"], "tests/netscan/allowlist.test.ts": [6, "wait"],
  "tests/scheduler/scheduler.test.ts": [3, "wait"], "tests/switch-cost/switch-cost.test.ts": [1, "wait"],
};

const cases = (path: string): number => (readFileSync(path, "utf8").match(/^\s*(?:test|it)\(/gm) ?? []).length;
const copies = JSON.parse(readFileSync(join(kilnDir, "checks", "legacy-copies.json"), "utf8")) as { records: { kind: string; legacy: string; ported?: string; portedBy?: string; cases?: number }[] };

const problems: string[] = [];
let ported = 0;
let waiting = 0;
const rows: string[] = [];
for (const [file, [expected, disposition]] of Object.entries(CENSUS)) {
  const legacyPath = join(legacyDir, file);
  const legacyCases = existsSync(legacyPath) ? cases(legacyPath) : -1;
  if (legacyCases !== expected) problems.push(`${file}: the census says ${expected} cases, legacy has ${legacyCases}`);
  if (disposition === "port") {
    const rec = copies.records.find((r) => r.kind === "ported" && r.legacy === file);
    const newPath = rec?.ported ? join(kilnDir, rec.ported) : undefined;
    const newCases = newPath && existsSync(newPath) ? cases(newPath) : -1;
    if (!rec) problems.push(`${file}: no ported record in checks/legacy-copies.json`);
    else if (newCases < expected) problems.push(`${rec.ported}: ${newCases} cases, fewer than the ${expected} it ports — a ported case was dropped`);
    ported += Math.min(Math.max(newCases, 0), expected);
    rows.push(`ported  ${file.padEnd(46)} ${String(expected).padStart(2)} → ${String(newCases).padStart(2)}  ${rec?.ported ?? "(missing)"}${newCases > expected ? `  (+${newCases - expected} new)` : ""}`);
  } else {
    const rec = copies.records.find((r) => r.kind === "wait" && r.legacy === file);
    if (!rec?.portedBy) problems.push(`${file}: no wait record with portedBy`);
    if (rec && rec.cases !== expected) problems.push(`${file}: the wait record holds ${rec.cases} cases, the census ${expected}`);
    waiting += legacyCases > 0 ? legacyCases : 0;
    rows.push(`waits   ${file.padEnd(46)} ${String(expected).padStart(2)}    stays in legacy/ until ${rec?.portedBy ?? "(missing)"}`);
  }
}
console.log(rows.join("\n"));
console.log(`\nported: ${ported} of 54 · waiting in legacy: ${waiting} of 19 · total accounted for: ${ported + waiting} of 73`);
if (ported !== 54) problems.push(`ported ${ported}, the census says 54`);
if (waiting !== 19) problems.push(`waiting ${waiting}, the census says 19`);
if (problems.length > 0) {
  console.error(`\nFAIL — ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("PASS — every census case is accounted for; none was dropped.");
