// A child that tries to take the owner lock at an agreed instant, prints OWNER or REFUSED, and — if it won — HOLDS the lock until its stdin closes (the test closes it once every starter has had its turn;
// a safety limit releases it after 30 s), then releases. Holding until everyone has tried is what makes "exactly one owner" a fair claim however slowly a loaded machine boots the starters. Used by the lock stress test: a filesystem race can only be exercised by
// REAL processes competing (one process's promises never interleave inside a syscall).
//   node lock-main.ts <store> <startAtEpochMs>
import { acquireLock } from "#durable/owner-lock.ts";
import { StoreOwned } from "#durable/types.ts";

const [store, startAt] = process.argv.slice(2);
while (Date.now() < Number(startAt)) { /* spin until the shared start instant: the starters must collide */ }
try {
  const lock = await acquireLock(store, `/tmp/lock-main-${process.pid}.sock`);
  console.log("OWNER");
  await new Promise<void>((resolve) => {
    process.stdin.on("end", resolve).resume();
    setTimeout(resolve, 30_000).unref();
  });
  lock.release();
} catch (e) {
  console.log(e instanceof StoreOwned ? `REFUSED ${e.pid}` : `ERROR ${(e as Error).message}`);
}
