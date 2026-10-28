// kiln — the command line. r12: `kiln check [name…] [--json]` (contracts/cli-check.md).
import { CHECK_NAMES, runChecks } from "#checks/index.ts";
import { GATE_USAGE } from "./gate-usage.ts";
import type { CheckName, CheckResult } from "#checks/index.ts";
import { PASS } from "#record/report.ts";
import { isEntryPoint } from "#record/entry.ts";

const USAGE = `usage: kiln check [${CHECK_NAMES.join("|")}]… [--json]\n${GATE_USAGE}`;

function render(r: CheckResult): string {
  const count = r.scanned === undefined ? "" : ` — scanned ${r.scanned} files`;
  if (r.ok) return [`${PASS} ${r.name}${count}`, ...r.notes.map((n) => `note: ${n}`)].join("\n");
  const lines = [`FAIL ${r.name} — ${r.failures.length} failure${r.failures.length === 1 ? "" : "s"}${count}`];
  for (const f of r.failures) lines.push(`  ${f.code}${f.file ? ` ${f.file}` : ""}: ${f.detail}`);
  for (const n of r.notes) lines.push(`note: ${n}`);
  return lines.join("\n");
}

export function main(argv: readonly string[]): number | Promise<number> {
  const [command, ...rest] = argv;
  // loaded on demand: `kiln check` must not pull in the durable package (and the library behind it)
  if (command === "owner") return import("./gate-commands.ts").then((m) => m.ownerCommand(rest));
  if (command === "gate") return import("./gate-commands.ts").then((m) => m.gateCommand(rest[0], rest.slice(1)));
  if (command === "feature") return import("./feature-commands.ts").then((m) => m.featureCommand(rest[0], rest.slice(1)));
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

// The entry guard is shared and symlink-safe (see #record/entry.ts); `import.meta.main` is not available on every supported Node.
if (isEntryPoint(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
