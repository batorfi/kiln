// Test-only consumers for the backbone proofs (r15 T041/T042): one transactional, one effect — each leaves evidence a fresh reader can check against the record.
//   "count"        transactional: `kiln.projection/count` = { applied: [seq…] } — written in the SAME commit as the cursor, so it must equal 1…cursor exactly once each
//   "deliver-log"  effect: appends each delivered seq to <store>/../deliveries.log — at least once, so it must contain every seq up to the cursor (a repeat is allowed and harmless)
// BROKEN (T042): the effect consumer acknowledges before its effect is done (fire-and-forget) — the cursor can pass an event whose effect a kill then loses.
import { appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Consumer } from "#durable/record/consumer.ts";

export const deliveryLog = (store: string): string => join(dirname(store), "deliveries.log");

export function testConsumers(store: string, broken = false): Consumer[] {
  const log = deliveryLog(store);
  return [
    {
      name: "count", version: 1, mode: "transactional",
      async reset(tx) { (await tx.doc<{ applied?: number[] }>("kiln.projection", "count", {})).applied = []; },
      async apply(tx, batch) { const d = await tx.doc<{ applied?: number[] }>("kiln.projection", "count", {}); d.applied = [...(d.applied ?? []), ...batch.map((e) => e.seq)]; },
    },
    {
      name: "deliver-log", version: 1, mode: "effect",
      async deliver(batch) {
        const write = (): void => appendFileSync(log, batch.map((e) => `${e.seq}\n`).join(""));
        if (broken) setTimeout(write, 250); // acknowledges now, does the work later: a kill in between loses it
        else write();
      },
    },
  ];
}
