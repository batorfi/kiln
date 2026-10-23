// Fixture for pi-flag.test.ts — a `PI-LIVE:` test that is SKIPPED. A skip is not a pass: under TAP it prints `ok N - … # SKIP`, which a naive
// "ok … PI-LIVE:" match would wrongly count.
import { test } from "node:test";
test("PI-LIVE: fixture — skipped", { skip: "deliberately skipped (fixture)" }, () => {});
