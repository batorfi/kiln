// kiln/tests/dogfood/run-live.ts — T010 (US1), r3: the LIVE dogfood runner (`npm run live-walk`).
//
// Builds the FULL-RAIL LIVE walk, writes its emitted JSOnL to kiln/factory-log/<name>.jsonl, and
// REPLAYS it through 001's UNMODIFIED `kiln/validate/log.ts` (the D3/D7 dogfood — "the kiln fires
// LIVE"). The clean live walk PASSes; `--broken` opens the no-silent-approval hole (a gate with no
// human `decidedBy`) → a named FAIL (SC-001 vs SC-002→SC-003). The `--stub` selection is RECORDED
// in the log (F-NOT-SILENT); a `--stub` run still PASSes but its marker is visible. Runs NO gate,
// admits NO program (P-VI / SC-007). No cloud — the live model is local; `--stub` is a dependency-
// free, *recorded* fallback.
//
// Usage: `node kiln/tests/dogfood/run-live.ts [name] [--live | --stub] [--broken] [--quiet]`

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildLiveWalk, WalkHaltedError } from "../../src/live-walk.ts";
import { validateLog } from "../../validate/log.ts";
import { PASS } from "../../validate/_report.ts";

const args = process.argv.slice(2);
const mode = args.includes("--stub") ? "stub" : "live"; // NC2: live is the DEFAULT
const broken = args.includes("--broken");
const quiet = args.includes("--quiet");
const name = (args.find((a) => !a.startsWith("--")) ?? "r3-live-walk").replace(/\.jsonl$/, "");
const logDir = fileURLToPath(new URL("../../factory-log/", import.meta.url));
const outPath = `${logDir}${name}.jsonl`;

let walk: Awaited<ReturnType<typeof buildLiveWalk>>;
try {
  walk = await buildLiveWalk({
    mode,
    brokenNoDecider: broken,
  });
} catch (e) {
  if (!(e instanceof WalkHaltedError)) throw e;
  // CR-3: a unit FAILED. Persist the PARTIAL ledger — it holds a durable `wait` naming the unit and code — so the failure leaves a record.
  mkdirSync(logDir, { recursive: true });
  writeFileSync(outPath, e.walk.jsonl + "\n");
  const partial = validateLog(e.walk.lines.map((l) => JSON.parse(l)), undefined);
  console.error(`HALTED — live walk [${mode}] stopped at unit "${e.unit}" (${e.code}); a durable wait was recorded (${e.walk.lines.length} records → ${outPath}; log.ts ${partial.valid ? "PASS" : "FAIL"}).`);
  process.exit(1);
}
mkdirSync(logDir, { recursive: true });
writeFileSync(outPath, walk.jsonl + "\n");

const res = validateLog(walk.lines.map((l) => JSON.parse(l)), undefined);
if (res.valid) {
  if (!quiet) {
   console.log(`${PASS} — live walk [${mode}] dogfood: ${walk.lines.length} records, switches=${walk.switches} (== ${walk.expectedSwitches}, SC-004), resident ${walk.resident.mode} ${walk.resident.recorded ? "RECORDED (F-NOT-SILENT)" : "UNLOGGED"} → kiln/validate/log.ts`);
    }
   process.exit(0);
      } else {
  if (!quiet) console.error(res.failures.join("\n"));
   process.exit(1);
      }
