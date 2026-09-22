// kiln/tests/runner/pi-gate.test.ts — T002, r8 · research D8 · FR-011 · OFFLINE tier (needs no Pi).
// The Pi tier is CHEAP and HERMETIC (offline, no model, a temp config dir), so unlike r7's live tier it is not opt-in:
//   KILN_PI unset → AUTO   run when a `pi` binary is found; SKIP WITH A PRINTED REASON when it is not
//   KILN_PI=1     → DEMAND the tier: it never skips — a missing Pi makes the test FAIL (the F-1 rule)
//   KILN_PI=0     → OFF    skip explicitly, with a printed reason
// This pins all three modes × {Pi present, Pi absent} so the tiering cannot drift into "skip when Pi is missing, even when asked".
import { test } from "node:test";
import assert from "node:assert/strict";
import { piMode, piBinary, skipUnlessPi, demandFailure, PI_OFF_REASON, piAbsentReason } from "../_pi-gate.ts";

const present = () => true;
const absent = () => false;

test("D8: KILN_PI selects the mode — unset → auto, '1' → demand, '0' → off, anything else → auto (never a silent 'demand')", () => {
  assert.equal(piMode({}), "auto");
  assert.equal(piMode({ KILN_PI: "1" }), "demand");
  assert.equal(piMode({ KILN_PI: "0" }), "off");
  for (const odd of ["", "true", "yes", "2", "on"]) assert.equal(piMode({ KILN_PI: odd }), "auto", `KILN_PI=${JSON.stringify(odd)} is not an explicit demand`);
});

test("D8: AUTO — Pi present ⇒ the tests RUN; Pi absent ⇒ they SKIP and the skip carries a printed reason", () => {
  assert.equal(skipUnlessPi({ env: {}, available: present }).skip, false);
  const s = skipUnlessPi({ env: {}, available: absent }).skip;
  assert.equal(typeof s, "string", "a skip is a recorded reason, never a bare `true`");
  assert.ok(String(s).length > 0 && s === piAbsentReason(), "the reason is non-empty and is the documented one");
  assert.match(String(s), /KILN_PI=1/, "the reason says how to demand the tier");
});

test("F-1: DEMAND — the gate NEVER skips, and an absent Pi is a FAILURE the test body must raise (not a skip)", () => {
  assert.equal(skipUnlessPi({ env: { KILN_PI: "1" }, available: present }).skip, false);
  assert.equal(skipUnlessPi({ env: { KILN_PI: "1" }, available: absent }).skip, false, "asking for the tier and getting no Pi must not become a quiet skip");
  assert.equal(demandFailure({ env: { KILN_PI: "1" }, available: present }), null, "Pi present ⇒ nothing to raise");
  const f = demandFailure({ env: { KILN_PI: "1" }, available: absent });
  assert.ok(typeof f === "string" && /KILN_PI=1/.test(f) && /pi/i.test(f), "Pi absent under KILN_PI=1 ⇒ a named failure message");
});

test("D8: DEMAND is the ONLY mode that raises — auto and off never produce a demand failure", () => {
  assert.equal(demandFailure({ env: {}, available: absent }), null);
  assert.equal(demandFailure({ env: { KILN_PI: "0" }, available: absent }), null);
});

test("D8: OFF — skips explicitly with a printed reason, even when Pi is present", () => {
  assert.equal(skipUnlessPi({ env: { KILN_PI: "0" }, available: present }).skip, PI_OFF_REASON);
  assert.equal(skipUnlessPi({ env: { KILN_PI: "0" }, available: absent }).skip, PI_OFF_REASON);
  assert.match(PI_OFF_REASON, /KILN_PI=0/);
});

test("R5: KILN_PI_BIN may point at a different PATH to a `pi`; the default is the bare name 'pi'", () => {
  assert.equal(piBinary({}), "pi");
  assert.equal(piBinary({ KILN_PI_BIN: "/opt/somewhere/pi" }), "/opt/somewhere/pi");
  assert.equal(piBinary({ KILN_PI_BIN: "" }), "pi", "an empty override falls back to the default");
});
