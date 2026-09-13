// kiln/tests/dogfood/run.ts — T017 (US3): the dogfood CLI runner.
//
// Builds a stub walk, writes its emitted JSOnL to kiln/factory-log/<name>.jsonl, and replays it
// through 001's UNMODIFIED `kiln/validate/log.ts` (validateLogFile). Prints PASS or a named FAIL.
// `--broken` opens the no-silent-approval hole (a gate-completion with no decider) → a FAIL.
//
// Usage: `node kiln/tests/dogfood/run.ts [name] [--broken]`

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildStubWalk } from "../../src/walk.ts";
import { validateLogFile } from "../../validate/log.ts";
import { PASS } from "../../validate/_report.ts";

const args = process.argv.slice(2);
const broken = args.includes("--broken");
const name = args.find((a) => !a.startsWith("--")) ?? "stub-walk";
const outPath = `${fileURLToPath(new URL("../../factory-log/", import.meta.url))}${name}.jsonl`;

const walk = buildStubWalk({ preDelegate: true, haltOnVeto: !broken });
const lines = walk.lines.slice();

if (broken) {
  // Open the no-silent-approval hole: a gate-3 completion with no decidedBy → 001's R3 must catch it.
  const idx = lines.findIndex((l) => {
    let r: any;
    try {
      r = JSON.parse(l);
       } catch {
    return false;
       }
    return r.recordType === "gate-completion" && String(r["gate-completion"]?.gate) === "3";
     });
  if (idx >= 0) {
    const rec: any = JSON.parse(lines[idx]);
    delete rec["gate-completion"].decidedBy;
    lines[idx] = JSON.stringify(rec);
     }
  writeFileSync(outPath, lines.join("\n"));
   } else {
  writeFileSync(outPath, walk.jsonl);
}

const res = validateLogFile(outPath);
if (res.valid) {
  console.log(`${PASS} — dogfood: ${lines.length} records, switches=${walk.switches} → kiln/validate/log.ts`);
   process.exit(0);
} else {
  console.error(res.failures.join("\n"));
  process.exit(1);
}
