// Shared by the scenarios: the one gate, key and move they use, and two small waits. A scenario owns its own store and its own owners; none of them leaks
// (Store.cleanup kills every process started on it — see harness.ts and the test that proves it).
import type { Move } from "../port.ts";

export const GATE = "g1";
export const KEY = "k1";
export const MOVE: Move = { kind: "approve", decidedBy: "human@spike", briefRef: "brief:spike" };
/** Ten years in milliseconds — the clock jump the no-clock scenarios apply. */
export const TEN_YEARS_MS = 10 * 365 * 24 * 3600 * 1000;

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** The promise's value, or `undefined` if it has not settled within `ms`. */
export async function settle<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<undefined>((resolve) => (timer = setTimeout(() => resolve(undefined), ms)));
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export const unique = <T>(xs: T[]): T[] => [...new Set(xs)];
