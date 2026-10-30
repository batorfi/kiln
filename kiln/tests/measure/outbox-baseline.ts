// r15 T004 — the "before" half of SC-009: what one append costs when the record is ONE growing document (`kiln.outbox/main`, r13/r14's layout).
// Run on demand: `node tests/measure/outbox-baseline.ts`. Not part of the suite. The figures go to specs/013-the-record/baseline.md.
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "#durable/library/open.ts";

const dir = mkdtempSync(join(tmpdir(), "k15-outbox-"));
const size = (): number => readdirSync(dir).filter((f) => f.startsWith("factory.sqlite")).reduce((n, f) => n + statSync(join(dir, f)).size, 0);
const store = await openStore({ dir, kinds: [] });
const append = (i: number) => store.commit(async (tx) => {
  const d = await tx.doc<any>("kiln.outbox", "main", { next: 1, entries: [] });
  d.entries.push({ type: "x", subject: "s", at: 1, actor: "a", cause: "c", data: { i }, seq: d.next });
  d.next += 1;
});
let total = 0;
for (const target of [100, 1000, 5000]) {
  const n = target - total;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) await append(total + i);
  const avg = (performance.now() - t0) / n;
  total = target;
  const t1 = performance.now();
  await append(total);
  total += 1;
  console.log(JSON.stringify({ entries: total, avgAppendMsOverLastBatch: +avg.toFixed(3), nextSingleAppendMs: +(performance.now() - t1).toFixed(3), storeBytes: size() }));
}
await store.close();
rmSync(dir, { recursive: true, force: true });
process.exit(0);
