// kiln/tests/overlay-ready/overlay-ready.test.ts — T020 (US5): the OverlayCReady probe is falsifiable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOverlayReady, reportOverlayReady } from "../../validate/overlay-ready.ts";

// T020 — SC-006 (F-OVERLAYREADY): OverlayCReady PASSES with the full overlay, and FAILs NAMING the element
// when exactly one is broken (a *probe*, not a *walk* — no gate advanced, no program admitted).
test("US5 SC-006: OverlayCReady PASSES with the full overlay present/wired/deterministic/blocking/cloud-free", () => {
   const r = checkOverlayReady();
   assert.ok(r.ready, `the full overlay is ready${r.checks.filter((c) => !c.ok).map((c) => c.name + ": " + c.detail).join("; ")}`);
   assert.ok(r.checks.some((c) => /Gate 0 admits no recorded exception/.test(c.name)), "F1 (human-only gate 0) is asserted as a check");
   assert.ok(r.checks.some((c) => /PASSES 001's log.ts/.test(c.name)), "the dogfood is asserted");
   assert.ok(r.checks.some((c) => /FAILs log.ts with a named R3/.test(c.name)), "the SC-003 negative is asserted");
   assert.ok(/[Oo]verlaycready|PASS/.test(reportOverlayReady()), "the report prints a passing OverlayCReady line");
});

// T020 (cont.) — falsifiability: removing/breaking exactly one element → a SPECIFIC named FAIL.
test("US5 SC-006: OverlayCReady is falsifiable — a broken Gate-0 auto-advance hole FAILs and names it", () => {
   const broken = checkOverlayReady({ brokenGate0: true });
   assert.ok(!broken.ready, "an opened Gate-0 auto-advance hole makes OverlayCReady FAIL");
   const failed = broken.checks.filter((c) => !c.ok);
   assert.ok(failed.length >= 1, "at least one check failed");
   assert.ok(failed.some((c) => /Gate 0 admits no recorded exception/.test(c.name)), "the failure NAMES the F1 gate-0 hole");
});

test("US5 SC-006: a non-deterministic overlay render FAILs and names it (the broken-render hook)", () => {
   const broken = checkOverlayReady({ brokenRender: true });
   assert.ok(!broken.ready, "a non-deterministic overlay makes OverlayCReady FAIL");
   assert.ok(broken.checks.filter((c) => !c.ok).some((c) => /deterministic/.test(c.name)), "the failure names the determinism gap");
});
