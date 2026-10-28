// r14 T052 (US3, PROOF tier): "every gate" at the two most dangerous points — the window after a person's move is read, and the moment before the next gate is opened — for BOTH walks (12 and 10 gates):
// the owner is killed once per gate (n = 1 … gates), restarted, and the walk finished; each time the walk equals the uninterrupted one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseline, INTERFACE, killRun, PLAIN } from "./support/walk-judge.ts";

for (const [name, walk, feature] of [["interface", INTERFACE, 11], ["plain", PLAIN, 9]] as const) {
  for (const point of ["walk.settled-read", "walk.gate-opening"]) {
    test(`${name} walk: killed at ${point} once per gate (${feature} gates), every time the walk equals the uninterrupted one`, { timeout: 900_000 }, async () => {
      const base = await baseline(name, walk);
      assert.equal(base.hits.get(point), feature, `the ${name} walk has ${feature} feature gates, each reached by ${point}`);
      for (let n = 1; n <= feature; n++) await killRun(name, walk, point, n);
    });
  }
}
