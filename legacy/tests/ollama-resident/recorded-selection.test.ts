// kiln/tests/ollama-resident/recorded-selection.test.ts — T023 (US1), r7 · contract O5/O6 · OFFLINE tier.
//
// The resident's identity + SYMBOLIC location ride r3's existing `transition.reason` slot (research D5): R5
// scans record KEYS, not values, so 001's `log.ts` needs NO amendment. A stand-in resident (no Ollama) proves
// the wiring; the ledger records THAT a unit ran and on WHICH resident — never the prompt or the completion (O6).

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLiveWalk } from "../../src/live-walk.ts";
import { residentSelectionMarker, isResidentSelectionRecorded, DEFAULT_LOCAL_MODEL } from "../../src/live-resident.ts";
import { makeStubResident } from "../../src/stub-resident.ts";
import { validateLog } from "../../validate/log.ts";

const SECRET = "COMPLETION-TEXT-THAT-MUST-NOT-REACH-THE-LEDGER-7f3a";
/** A stand-in for a real model: returns distinctive text so any leak into the ledger is detectable. */
const standIn = () => {
  const r = makeStubResident({ model: "gemma4:12b", tier: "strongest" });
  return { ...r, run: async (u: { id: string }) => `${SECRET}:${u.id}` };
};

test("O5: a loopback resident is recorded SYMBOLICALLY (`@ loopback`) in the selection transition", async () => {
  const walk = await buildLiveWalk({ mode: "live", resident: standIn(), location: "loopback" });
  const first = JSON.parse(walk.lines[0]);
  assert.equal(first.recordType, "transition");
  assert.match(first.transition.reason, /^resident selection → live model=gemma4:12b @ loopback \(NC2-A: local, not cloud\)$/);
  assert.ok(isResidentSelectionRecorded(walk.lines.map((l) => JSON.parse(l)), "live"), "F-NOT-SILENT: the selection is recorded (r3's detector still sees it)");
  assert.doesNotMatch(first.transition.reason, /\d+\.\d+\.\d+\.\d+|:\d{4,5}/, "SYMBOLIC — never a raw address or port");
});

test("O5/D5: the record passes 001's UNMODIFIED log.ts and carries no forbidden R5 KEY", async () => {
  const walk = await buildLiveWalk({ mode: "live", resident: standIn(), location: "loopback" });
  const res = validateLog(walk.lines.map((l) => JSON.parse(l)), undefined);
  assert.equal(res.valid, true, res.failures.join("\n"));
  assert.doesNotMatch(walk.jsonl, /"(?:url|https?|endpoint|baseUrl|apiBase|externalUrl|remote|cloud)"\s*:/i, "R5 scans KEYS: none may appear");
});

test("O6: the model's work product is CAPTURED for the walk but NEVER written to the ledger", async () => {
  const walk = await buildLiveWalk({ mode: "live", resident: standIn(), location: "loopback" });
  assert.equal(walk.outputs.length, 9, "every unit's output is captured (O4 — it used to be discarded at a bare `resident.run(unit)`)");
  assert.ok(walk.outputs.every((o) => String(o.output).startsWith(SECRET)), "the captured output is the resident's");
  assert.equal(walk.jsonl.includes(SECRET), false, "…and none of it reached the factory-log (O6)");
});

test("r3 preserved: WITHOUT a location the marker is byte-identical to r3's (additive, optional)", () => {
  assert.equal(residentSelectionMarker("live", "m"), "resident selection → live model=m (NC2 primary proof)");
  assert.equal(residentSelectionMarker("live", "m", "loopback"), "resident selection → live model=m @ loopback (NC2-A: local, not cloud)");
  assert.equal(residentSelectionMarker("stub"), "resident selection → stub (RECORDED fallback, NC2)", "the stub marker is untouched");
});

test("FR-013: DEFAULT_LOCAL_MODEL is a plain NAME (no URL, no stale provider prefix that no server could resolve)", () => {
  assert.doesNotMatch(DEFAULT_LOCAL_MODEL, /https?:|\/\//);
  assert.notEqual(DEFAULT_LOCAL_MODEL, "ollama/llama3.2:3b", "the old default named a model that was never installed");
});
