// What a backbone proof asserts about the consumers once the walk is over (r15 T041/T042): a fresh owner lets them catch up, a fresh reader judges them against the record.
import { existsSync, readFileSync } from "node:fs";
import { openFactory } from "#durable/factory.ts";
import { fromReader, headOf } from "#durable/record/read.ts";
import { openReader } from "#durable/library/open.ts";
import { checkConsumerInvariants, checkProjectionInvariants } from "./record-oracle.ts";
import { deliveryLog, testConsumers } from "./test-consumers.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lets the consumers of `store` finish (a fresh owner), then judges them against the record. */
export async function catchUpAndJudge(store: string, broken = false): Promise<string[]> {
  const f = await openFactory({ store, consumers: testConsumers(store, broken) });
  try {
    await f.ready;
    for (let i = 0; i < 400; i++) { if ((await f.backbone.status()).every((s) => s.lag === 0 && !s.failed)) break; await sleep(25); }
    await sleep(broken ? 400 : 0); // the weakened consumer\'s late work
  } finally {
    await f.close();
  }
  const v = [...(await checkConsumerInvariants(store, deliveryLog(store))), ...(await checkProjectionInvariants(store))];
  const r = await openReader(store);
  const head = (await headOf(fromReader(r))).next - 1;
  const applied = (await r.snapshot<{ applied?: number[] }>("kiln.projection", "count"))?.applied ?? [];
  await r.close();
  if (applied.length !== head) v.push(`E5: after catching up the transactional consumer has applied ${applied.length} of ${head} events`);
  const got = new Set((existsSync(deliveryLog(store)) ? readFileSync(deliveryLog(store), "utf8") : "").split("\n").filter(Boolean).map(Number));
  const missing = Array.from({ length: head }, (_, i) => i + 1).filter((n) => !got.has(n));
  if (missing.length) v.push(`E5: after catching up the effect consumer never delivered ${missing.length} of ${head} events (first: ${missing[0]})`);
  return v;
}

