// kiln/tests/_live-gate.ts — T003 (Setup), r7 · NC3=A (env-gated, skip-with-record).
//
// The live tier runs ONLY when `KILN_LIVE=1`. The default `node --test` run never requires a model, so
// a newcomer (r5's installer, r6's docs) can clone and test with nothing pulled. A skipped live test is
// NEVER a silent pass: `skipUnlessLive()` returns a node-test `{ skip: <recorded reason> }`, so the
// reason is printed in the test report itself (P-V lifted to the suite). Not a `*.test.ts`, so the
// `kiln/tests/**/*.test.ts` glob does not pick it up as a suite of its own.

export const LIVE_ENV = "KILN_LIVE";

/** True iff the live tier is explicitly enabled (`KILN_LIVE=1`). */
export function liveEnabled(): boolean {
  return process.env[LIVE_ENV] === "1";
}

/** The recorded reason a gated test is skipped (surfaced in the node-test report). */
export const LIVE_SKIP_REASON = `live tier not enabled: set ${LIVE_ENV}=1 (needs a running local Ollama + an installed model)`;

/** The cost test UNLOADS the model, so it is a SEPARATE opt-in (CR-11): `KILN_LIVE_COST=1`, run serially — `npm run switch-cost`. */
export const LIVE_COST_ENV = "KILN_LIVE_COST";
export const LIVE_COST_SKIP_REASON = `cost test not enabled: it UNLOADS the model, so it is a separate opt-in — set ${LIVE_COST_ENV}=1 (with ${LIVE_ENV}=1) and run serially: npm run switch-cost`;
export function skipUnlessLiveCost(): { skip: string | false } {
  if (!liveEnabled()) return { skip: LIVE_SKIP_REASON };
  return { skip: process.env[LIVE_COST_ENV] === "1" ? false : LIVE_COST_SKIP_REASON };
}

/** Spread into a node-test options object: `test("…", skipUnlessLive(), async () => {…})`. */
export function skipUnlessLive(): { skip: string | false } {
  return { skip: liveEnabled() ? false : LIVE_SKIP_REASON };
}
