// T011 — the kill hook and its gentle sibling. `killPoint(name)` ends THIS process, abruptly, when the owner was started with KILL_AT=<name>:
// SIGKILL to itself — no `exit` handler, no flush, no close() — which is what a crash looks like to the store. `faultPoint(name)` is the opposite:
// a NON-abrupt failure (it throws) that a strategy must turn into `refused(store-error)` while the process lives on.
// Neither imports the library; with the variables unset both are no-ops, so they cost nothing in a normal run.
import { appendFileSync } from "node:fs";

export function killPointsEnabled(): boolean {
  return Boolean(process.env.KILL_AT);
}

/** Dies by SIGKILL here iff KILL_AT === name. The point is appended to KILL_LOG (if set) first, so a test can see WHICH point fired. */
export function killPoint(name: string): void {
  if (process.env.KILL_AT !== name) return;
  const log = process.env.KILL_LOG;
  if (log) appendFileSync(log, `${name}\n`);
  process.kill(process.pid, "SIGKILL");
  // SIGKILL cannot be caught; if delivery were ever delayed, make sure no code after the point runs in the meantime.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10_000);
}

/** Throws (and the process keeps running) iff FAULT_AT === name — an injected store failure. */
export function faultPoint(name: string): void {
  if (process.env.FAULT_AT === name) throw new Error(`injected store failure: ${name}`);
}
