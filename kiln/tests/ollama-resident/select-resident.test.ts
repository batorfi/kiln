// kiln/tests/ollama-resident/select-resident.test.ts — CR-7 (code review), r7 · F-NOT-SILENT on the API · OFFLINE tier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectResident } from "../../src/live-resident.ts";
import { makeStubResident } from "../../src/stub-resident.ts";

const mine = makeStubResident({ model: "mine", tier: "strongest" });

test("CR-7: a supplied resident with mode 'stub' is REFUSED, not silently dropped", () => {
  assert.throws(() => selectResident({ mode: "stub", resident: mine }), /contradictory options.*resident was supplied.*"stub"/i);
  assert.throws(() => selectResident({ mode: "stub", location: "loopback" }), /contradictory options.*location was supplied/i);
});

test("CR-7: the assumeLiveAvailable:false fallback ALSO refuses to drop a supplied resident — and says why", () => {
  assert.throws(() => selectResident({ mode: "live", assumeLiveAvailable: false, resident: mine }), /assumeLiveAvailable:false forced the stub fallback/);
});

test("CR-7: the legitimate forms are unchanged — live + resident is used and recorded; a plain stub is still a RECORDED fallback", () => {
  const live = selectResident({ mode: "live", resident: mine, location: "loopback" });
  assert.equal(live.resident, mine, "the supplied resident IS the one used");
  assert.match(live.marker, /@ loopback/);
  const stub = selectResident({ mode: "stub" });
  assert.equal(stub.mode, "stub");
  assert.match(stub.marker, /stub \(RECORDED fallback/);
  assert.equal(stub.recorded, true, "F-NOT-SILENT: recorded by default");
  const fallback = selectResident({ mode: "live", assumeLiveAvailable: false });
  assert.equal(fallback.mode, "stub", "belt-and-suspenders fallback with NO supplied resident still works, and is recorded");
  assert.match(fallback.marker, /RECORDED fallback/);
});
