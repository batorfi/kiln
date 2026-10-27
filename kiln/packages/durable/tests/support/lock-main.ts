// A child that tries to take the owner lock at an agreed instant, prints OWNER or REFUSED, holds for a moment, and releases. Used by the lock stress test: a filesystem race can only be exercised by
// REAL processes competing (one process's promises never interleave inside a syscall).
//   node lock-main.ts <store> <startAtEpochMs> <holdMs>
import { acquireLock } from "#durable/owner-lock.ts";
import { StoreOwned } from "#durable/types.ts";

const [store, startAt, holdMs] = process.argv.slice(2);
while (Date.now() < Number(startAt)) { /* spin until the shared start instant: the starters must collide */ }
try {
  const lock = await acquireLock(store, `/tmp/lock-main-${process.pid}.sock`);
  console.log("OWNER");
  await new Promise((r) => setTimeout(r, Number(holdMs)));
  lock.release();
} catch (e) {
  console.log(e instanceof StoreOwned ? `REFUSED ${e.pid}` : `ERROR ${(e as Error).message}`);
}
