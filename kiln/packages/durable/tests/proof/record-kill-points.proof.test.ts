// r15 T033 (US1, PROOF tier): the owner is SIGKILLed in the middle of an event's commit — after the event is written into its chunk and before the commit returns — at the first, a middle and the last
// such moment of each scripted walk, and at every walk point the r14 matrix already attacks (its judge now includes the record's invariants). After each: a fresh reader finds the record whole
// (E1 gap-free, E2 valid, E3 actor and cause, E7 state ⇔ event), r13/r14's I1–I10 and W1–W4 clean, and the killed-and-resumed walk equals the uninterrupted one — the lost commit lost its state AND its event together.
import { test } from "node:test";
import assert from "node:assert/strict";
import { RECORD_KILL_POINTS } from "#durable/hooks.ts";
import { baseline, INTERFACE, killRun, PLAIN } from "./support/walk-judge.ts";

const POINT = "record.append-after-write";
const picks = (n: number): number[] => [...new Set([1, 2, 3, Math.ceil(n / 4), Math.ceil(n / 2), Math.ceil((3 * n) / 4), n - 1, n])].filter((k) => k >= 1 && k <= n).sort((a, b) => a - b);

test("the record's kill point is declared and the scripted walks reach it many times (the proof cannot be vacuous)", async () => {
  assert.deepEqual(RECORD_KILL_POINTS, [POINT]);
  for (const [name, walk] of [["plain", PLAIN], ["interface", INTERFACE]] as const) {
    const base = await baseline(name, walk);
    assert.ok((base.hits.get(POINT) ?? 0) >= 50, `${name}: ${POINT} reached ${base.hits.get(POINT) ?? 0} times`);
  }
});

for (const [name, walk] of [["plain", PLAIN], ["interface", INTERFACE]] as const) {
  test(`${name} walk killed mid-commit of an event at the first, a middle and the last of its appends: the record is whole and the walk equals the uninterrupted one`, { timeout: 600_000 }, async () => {
    const base = await baseline(name, walk);
    for (const nth of picks(base.hits.get(POINT) ?? 0)) await killRun(name, walk, POINT, nth);
  });
}
