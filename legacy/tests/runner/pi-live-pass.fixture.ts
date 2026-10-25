// Fixture for pi-flag.test.ts — a run in which a `PI-LIVE:` test PASSES. Prints the KILN_PI it was run with (`--pi` must set it to 1).
import { test } from "node:test";
test("PI-LIVE: fixture — passes", () => { console.log(`ENV:pi=${process.env.KILN_PI ?? "unset"}`); });
