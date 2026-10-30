// r15 T067 — how long an in-process interface walk (12 gates, scripted steps) takes, on whichever tree this file is run from. Run it on r14's tree (`main` before r15) and on this branch to read the record's overhead:
//   node tests/measure/walk-time.ts [runs]
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFactory } from "#durable/factory.ts";
import { drive, INTERFACE } from "../../packages/durable/tests/walk/support.ts";

const runs = Number(process.argv[2] ?? 7);
const times: number[] = [];
for (let i = 0; i < runs; i++) {
  const dir = mkdtempSync(join(tmpdir(), "k15-walktime-"));
  const f = await openFactory({ store: join(dir, "s") });
  await f.ready;
  const t0 = performance.now();
  await f.walks.admit("k1", "w", INTERFACE);
  const d = await drive(f, "w", (g) => ({ kind: "approve", decidedBy: "human@r15-script", ...(g.gateKey === "gate0" ? { admit: {} } : {}) }));
  times.push(performance.now() - t0);
  if (d.last.status !== "done") throw new Error(`the walk ended ${d.last.status}`);
  await f.close();
  rmSync(dir, { recursive: true, force: true });
}
times.sort((a, b) => a - b);
console.log(JSON.stringify({ gates: 12, runs, medianMs: Math.round(times[Math.floor(runs / 2)]), minMs: Math.round(times[0]), maxMs: Math.round(times[runs - 1]) }));
process.exit(0);
