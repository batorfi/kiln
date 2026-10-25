// kiln/tests/negative/not-silent.test.ts — T005 (Foundational), r3 · E3 `F-NOT-SILENT`.
//
// The RECORDED `--live`/`--stub` selection is r3's headline guard: the resident a walk drives MUST
// appear in the log (a closed terminal always KNOWS which resident ran — P-V/P-VII). A `--stub` that
// emits NO recorded marker is the UNLOGGED stand-in this row was named to catch — the *precise
// opposite* of P-V's "a missing UI silently approves a gate." The selection rides 001's existing
// `transition`/`cost` union (a `transition.reason` slot) — NO new `recordType` (D2/D8).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  selectResident,
  residentSelectionMarker,
  isResidentSelectionRecorded,
  DEFAULT_LOCAL_MODEL,
} from "../../src/live-resident.ts";

// T005 (P1 half / P-VII · SC-006): the DEFAULT resident is LIVE (NC2) and its selection is RECORDED.
test("F-NOT-SILENT: the default selection is live + names the local model, and is RECORDED", () => {
  const sel = selectResident(); // no mode ⇒ live (NC2 default)
  assert.equal(sel.mode, "live", "the default resident is the LIVE local model (NC2)");
  assert.equal(sel.recorded, true, "the selection is recorded by default — never a silent stand-in");
  assert.ok(sel.resident.model() !== "stub-resident", "the live head is a REAL local model, not the stub");
  assert.match(sel.marker, /resident selection → live model=/, "the marker names WHICH resident + the model");
  assert.match(sel.marker, new RegExp(DEFAULT_LOCAL_MODEL), "the marker records the default local model name");
});

// T005: the `--stub` POSITION — a RECORDED fallback — also writes a marker naming the stub.
test("F-NOT-SILENT: a --stub selection emits a RECORDED fallback marker (never silent)", () => {
  const sel = selectResident({ mode: "stub" });
  assert.equal(sel.mode, "stub", "--stub picks the recorded fallback resident");
  assert.ok(sel.recorded, "even the fallback is recorded — F-NOT-SILENT");
  assert.match(sel.marker, /resident selection → stub/, "the stub marker names the RECORDED fallback");
});

// T005: the marker IS WRITTEN for both positions — the guard that makes an UNLOGGED stand-in catchable.
test("F-NOT-SILENT: both positions record a marker detectable in 001's transition union", () => {
  for (const mode of ["live", "stub"] as const) {
    const sel = selectResident({ mode });
    // The selection rides 001's `transition` record as a `transition.reason` slot (D2/D8: no new type).
    const rec = { recordType: "transition", transition: { kind: "load", from: "cold", to: mode, reason: sel.marker } };
    assert.ok(isResidentSelectionRecorded([rec], mode), `a ${mode} marker is detected in the transition union`);
     // The OPPOSITE position must NOT match the same record (no false "recorded" across modes).
    assert.ok(!isResidentSelectionRecorded([rec], mode === "live" ? "stub" : "live"), "the marker does not cross-match the other position");
       }
});

// T005 (positive guard, the violation's detection): an UNLOGGED stand-in (recordSelection:false) is
// NOT recorded — exactly what `LiveModelReady` FAILs on (`--stub-unlogged`, F-NOT-SILENT, P-V).
test("F-NOT-SILENT: an UNLOGGED stand-in (recordSelection:false) is caught — ready=false, named", () => {
  const sel = selectResident({ mode: "stub", recordSelection: false });
  assert.equal(sel.recorded, false, "recordSelection:false is the unlogged-stand-in position");
  const rec = sel.recorded
     ? { recordType: "transition", transition: { reason: sel.marker } }
        : { recordType: "transition", transition: { reason: "no marker" } };
  assert.ok(!isResidentSelectionRecorded([rec], "stub"), "an unlogged --stub is NOT recorded ⇒ the violation is detectable");
});

// T005 (the marker shape): a bare `transition.reason` carries enough to reconstruct the selection.
test("F-NOT-SILENT: residentSelectionMarker names the mode + (for live) the model", () => {
  assert.equal(residentSelectionMarker("live", DEFAULT_LOCAL_MODEL).includes("resident selection → live"), true);
  assert.equal(residentSelectionMarker("stub").includes("resident selection → stub"), true);
});
