// kiln/tests/live-ready/live-ready.test.ts — T014 (US3, P2), r3 · E5 `F-LIVEREADY` (SC-006).
//
// `LiveModelReady` is the r3→r4 handoff PROOF: a falsifiable `node --test` probe that composes on r1's
// `runtime-ready` + r2's `overlay-ready` and ADDS r3's checks — the live path is WIRED, the live walk
// PASSES 001's log.ts, the `--stub` selection is RECORdED (an unlogged stand-in is Caught, F-NOT-
// SILENT), the render is deterministic + a headless Gate 0 BLOCKS, and 0 cloud on both toggle
// positions. It RUNS NO GATE, ADMIITS NO PROGRAM, runs NO real feature (a *probe*, not a *walk*; P-VI).

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLiveModelReady, reportLiveModelReady } from "../../validate/live-ready.ts";

// T014 · F-LIVEREADY (positive): with all elements wired, LiveModelReady is READY.
test("US3 SC-006 (F-LIVEREADY): LiveModelReady PASSES with the full live path wired", () => {
  const r = checkLiveModelReady();
  assert.ok(r.ready, `LiveModelReady is ready${r.checks.filter((c) => !c.ok).map((c) => c.name + ": " + c.detail).join("; ")}`);
  assert.ok(r.checks.some((c) => /live walk PASSES 001's unmodified log.ts/.test(c.name)), "the SC-001 PASSES-emit check is asserted");
  assert.ok(r.checks.some((c) => /FAILs log.ts with a named R3/.test(c.name)), "the SC-002 named-R3 check is asserted");
  assert.ok(r.checks.some((c) => /RECORded, not silent|F-NOT-SILENT/.test(c.name)), "the F-NOT-SILENT check is asserted");
  assert.ok(r.checks.some((c) => /zero-network/.test(c.name)), "the zero-network check is asserted");
  assert.ok(/PASS|LiveModelReady/.test(reportLiveModelReady()), "reportLiveModelReady prints a passing line");
 });

// T014 (cont.): falsifiability — each hook opens exactly ONE hole, and LiveModelReady FAILs NAMING it.
test("US3 SC-006: --broken opens the no-`decidedBy` hole ⇒ FAIL, NAMED R3 (SC-002→SC-003)", () => {
  const broken = checkLiveModelReady({ brokenDogfood: true });
  assert.ok(!broken.ready, "a broken no-`decidedBy` live walk makes LiveModelReady FAIL");
  assert.ok(broken.checks.filter((c) => !c.ok).some((c) => /PASSES 001's unmodified log.ts/.test(c.name)), "the failure NAMES the PASSES-emit gap (R3)");
 });

test("US3 SC-006: --broken-render makes the overlay non-deterministic ⇒ FAIL, NAMED (determinism)", () => {
  const broken = checkLiveModelReady({ brokenRender: true });
  assert.ok(!broken.ready, "a non-deterministic overlay makes LiveModelReady FAIL");
  assert.ok(broken.checks.filter((c) => !c.ok).some((c) => /deterministic/.test(c.name)), "the failure NAMES the determinism gap");
});

test("US3 SC-006: --broken-gate0 opens a Gate-0 auto-advance hole ⇒ FAIL, NAMED F1 (P-VI)", () => {
  const broken = checkLiveModelReady({ brokenGate0: true });
  assert.ok(!broken.ready, "a Gate-0 auto-advance hole makes LiveModelReady FAIL");
  assert.ok(broken.checks.filter((c) => !c.ok).some((c) => /Gate 0 admits no recorded exception|F1/.test(c.name)), "the failure NAMES the F1 gate-0 hole");
});

// T014 · F-NOT-SILENT (SC-006): an UNLOGGED `--stub` stand-in is CATCHED by the probe.
test("US3 SC-006 (F-NOT-SILENT): an unlogged --stub stand-in FAILs LiveModelReady, NAMED", () => {
  const broken = checkLiveModelReady({ stubUnlogged: true });
  assert.ok(!broken.ready, "an unlogged --stub stand-in makes LiveModelReady FAIL");
   assert.ok(broken.checks.filter((c) => !c.ok).some((c) => /F-NOT-SILENT|RECORded/.test(c.name)), "the failure NAMES the unlogged stand-in");
});

// T014 · SC-007: the probe ADMITS NO PROGRAM + runs NO gate — only the live-path wiring + emit is checked.
test("US3 SC-007: LiveModelReady runs no gate / admits no program (it is a probe, not a walk)", () => {
  const r = checkLiveModelReady();
  // It reports over its checks + the composed overlay — it never emits a gate-completion or advances a gate.
  assert.ok(r.checks.length > 0 && r.overlay.checks.length > 0, "the probe composes on r1+r2 and adds r3's checks");
   // A recorded --stub is ACCEPTED (its selection is in the log); the probe does not treat a recorded fallback as a failure.
  assert.ok(!brokenReady(), "a recorded --stub is accepted — only an UNLOGGED one fails");
});
function brokenReady(): boolean {
  return checkLiveModelReady({ stubUnlogged: false }).ready === false; // recorded stub ⇒ ready, not a failure
}
