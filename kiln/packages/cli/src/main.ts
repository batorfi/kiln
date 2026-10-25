// kiln — the command line. r12: `kiln check [name…] [--json]` (contracts/cli-check.md).
import { fileURLToPath } from "node:url";
import { CHECK_NAMES, runChecks } from "#checks/index.ts";
import type { CheckName, CheckResult } from "#checks/index.ts";
import { PASS } from "#record/report.ts";

const USAGE = `usage: kiln check [${CHECK_NAMES.join("|")}]… [--json]`;

function render(r: CheckResult): string {
  const count = r.scanned === undefined ? "" : ` — scanned ${r.scanned} files`;
  if (r.ok) return [`${PASS} ${r.name}${count}`, ...r.notes.map((n) => `note: ${n}`)].join("\n");
  const lines = [`FAIL ${r.name} — ${r.failures.length} failure${r.failures.length === 1 ? "" : "s"}${count}`];
  for (const f of r.failures) lines.push(`  ${f.code}${f.file ? ` ${f.file}` : ""}: ${f.detail}`);
  for (const n of r.notes) lines.push(`note: ${n}`);
  return lines.join("\n");
}

export function main(argv: readonly string[]): number {
  const [command, ...rest] = argv;
  if (command !== "check") {
    console.error(command ? `unknown command "${command}"\n${USAGE}` : USAGE);
    return 2;
  }
  const json = rest.includes("--json");
  const words = rest.filter((a) => a !== "--json");
  const flag = words.find((a) => a.startsWith("-"));
  if (flag) {
    console.error(`unknown flag "${flag}"\n${USAGE}`);
    return 2;
  }
  const unknown = words.find((a) => !(CHECK_NAMES as readonly string[]).includes(a));
  if (unknown) {
    console.error(`unknown check "${unknown}"; known: ${CHECK_NAMES.join(", ")}\n${USAGE}`);
    return 2;
  }
  const names = (words.length ? CHECK_NAMES.filter((n) => words.includes(n)) : CHECK_NAMES) as CheckName[];
  const results = runChecks(names);
  console.log(json ? JSON.stringify(results) : results.map(render).join("\n"));
  return results.every((r) => r.ok) ? 0 : 1;
}

// Not `import.meta.main`: it is undefined on Node 23.x and 24.0–24.1, inside the declared engines range, where the command would exit 0 silently.
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
