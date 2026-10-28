// r14 T047 (US2/US3, DEFAULT tier): applicability is recorded ONCE with a reproducible reason. The plain walk's owner is killed around the pin commit — inside it (nothing stored) and right after it (stored,
// the row not yet moved on) — restarted, and finished: the two "not applicable" entries exist exactly once each, and their reasons are byte-for-byte the uninterrupted walk's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runWalk } from "./support/walk-harness.ts";
import { baseline, FEATURE, judge, PLAIN } from "./support/walk-judge.ts";

for (const point of ["walk.pin-after-write", "walk.pin-committed"]) {
  test(`plain walk killed at ${point}: two not-applicable entries, once each, with the same reasons as the uninterrupted walk`, { timeout: 60_000 }, async () => {
    const base = await baseline("plain", PLAIN);
    const run = await runWalk({ feature: FEATURE, walk: PLAIN, killAt: point });
    try {
      assert.deepEqual(run.fired, [point]);
      const na = run.inspection.outbox.filter((e) => e.type === "gate.not-applicable");
      assert.deepEqual(na.map((e) => (e.data as { gate: string }).gate), ["2a-experience", "6a-ui-review"], "once each");
      const want = base.outcomes.filter((o) => o.startsWith("gate.not-applicable|"));
      assert.equal(want.length, 2);
      const got = (await import("./support/walk-oracle.ts")).walkOutcomes(run.inspection, FEATURE).filter((o) => o.startsWith("gate.not-applicable|"));
      assert.deepEqual(got, want, "the reason bytes are the uninterrupted walk's");
      await judge(run, PLAIN, base);
    } finally {
      run.cleanup();
    }
  });
}
