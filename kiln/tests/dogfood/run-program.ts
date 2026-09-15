// kiln/tests/dogfood/run-program.ts — T018 (US4): the closed-row PROGRAM-WALK dogfood runner.
//
// r2's add to r1's `run.ts` dogfood family. Builds a closed-row program walk (a row closing → Gate 0
// re-entered at the seam), writes its emitted JSONL to kiln/factory-log/<name>.jsonl, and replays it
// through 001's UNMODIFIED `kiln/validate/log.ts` (validateLogFile). `--broken` opens the no-silent-
// approval hole (a gate-0 `gate-completion` with NO human decider) → 001's R3 must catch it by NAME
// (the SC-002→SC-003 negative that F1's human-only gate-0 makes provable).
//
// Usage: `node kiln/tests/dogfood/run-program.ts [name] [--broken]`

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildProgramWalk } from "../../src/walk.ts";
import { validateLogFile } from "../../validate/log.ts";
import { PASS } from "../../validate/_report.ts";

const args = process.argv.slice(2);
const broken = args.includes("--broken");
const name = args.find((a) => !a.startsWith("--")) ?? "program-walk";
const outPath = `${fileURLToPath(new URL("../../factory-log/", import.meta.url))}${name}.jsonl`;

const walk = buildProgramWalk({ gate0By: "human@batorfi", brokenAutoApprove: broken });
writeFileSync(outPath, walk.jsonl);

const res = validateLogFile(outPath);
if (res.valid) {
  console.log(`${PASS} — program-walk: ${walk.lines.length} records, gate-0 admitted by a human (gate0.re-entered) → kiln/validate/log.ts`);
   process.exit(0);
} else {
  console.error(res.failures.join("\n"));
  console.error("FAIL — a broken auto-approve of a missing Gate 0 was caught by R3 (the SC-003 negative; F1 human-only).");
   process.exit(1);
}
