// kiln/tests/pi/index-exports.test.ts — T043, r8 · extended T031, r9 · FR-013 · OFFLINE tier.
// r8's additions to kiln/index.ts are ADDITIVE ONLY (plan.md "What changes in existing files"). This pins the pre-r8 export surface — the
// 77 names measured at planning time (research D2, run A) — as a floor that must still be present, and lists exactly what r8 added on top.
// r9 (008-kiln-pi-ui) extends this the same way: PRE_R8_EXPORTS + R8_ADDED_EXPORTS (84 names) is now the pre-r9 floor, and R9_ADDED_EXPORTS
// names exactly its own additions (present.ts, identity.ts, live-ctx.ts, gateName, UiReady) — nothing more, nothing unexpected.
// kiln/pi/index.ts (the Pi entry itself) is deliberately NOT re-exported here — it stays behind the "pi" manifest, the way Pi actually loads it.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as kiln from "../../index.ts";

// The 77 names present in kiln/index.ts BEFORE r8 (measured 2026-09-21 during planning, run A: "77 exports").
const PRE_R8_EXPORTS = [
  "DEFAULT_LOCAL_MODEL", "GATE0_ADMISSION_MOVES", "LAYERB_KEY", "LAYERC_KEY", "LAYERC_REDRAW_TRIGGERS", "LIVE_REDRAW_TRIGGERS",
  "LaneRunError", "LogWriter", "OLLAMA_DEFAULT_HOST", "OllamaError", "TOGGLE_KEY", "WIRING_STATUS", "WalkHaltedError", "applyMove",
  "assertLiveSingleLane", "assertSingleLane", "attachLiveTui", "autoApprove", "bindAll", "blocksAny", "blocksOn", "blocksOnGate0",
  "buildLiveWalk", "buildProgramWalk", "buildStubWalk", "checkLiveModelReady", "checkOllamaReady", "checkOverlayReady", "disabledUi",
  "gate0AdmitMode", "hasSwapTransition", "headlessWait", "hold", "isAutoApprovable", "isLoopbackHost", "isResidentSelectionRecorded",
  "isSilentApproval", "keymapIsConsistent", "laneIsWired", "liveTuiOrTwin", "liveWalkRecordsSelection", "lodUnitsBoundStrongest",
  "makeLane", "makeLiveResident", "makeOllamaResident", "makePreDelegation", "makeStubResident", "moveAllowed", "moveVocabulary",
  "nextEligibleRow", "onEvent", "openGate", "printHeadless", "promptFor", "recordGate0Decision", "renderGate0Face", "renderHud",
  "renderLive", "renderLiveSurfaces", "renderOverlay", "renderPopup", "reportLiveModelReady", "reportOllamaReady", "reportOverlayReady",
  "residentSelectionMarker", "resolveOllamaBase", "resume", "resumeByToken", "run", "schedule", "selectResident", "setLaneClock",
  "switchCount", "toJsonl", "tokenFor", "vetoHalt", "yield_",
] as const;

// The value exports r8 ADDS (research D1/D2; contract pi-seam.md, pi-ready.md). Type-only exports are erased at runtime and don't appear here.
const R8_ADDED_EXPORTS = ["detectCapability", "interpret", "askGate", "resolveAsk", "checkPiReady", "reportPiReady", "HOOK_NAMES"] as const;

// The value exports r9 (008-kiln-pi-ui) ADDS on top of PRE_R8_EXPORTS + R8_ADDED_EXPORTS (T031, tasks.md's own enumeration — exactly
// these nine, nothing more): gateName (move-vocabulary.ts's additive export), resolveIdentity (NC1), the four present* functions
// (FR-015), makeLiveUICtx (NC2 = A), and UiReady's checkUiReady/reportUiReady.
const R9_ADDED_EXPORTS = [
  "gateName", "resolveIdentity", "presentHud", "presentPopup", "presentOverlay", "presentGate0Face",
  "makeLiveUICtx", "checkUiReady", "reportUiReady",
] as const;

const PRE_R9_EXPORTS = [...PRE_R8_EXPORTS, ...R8_ADDED_EXPORTS] as const;

test("FR-013: every pre-r8 export name is still present (nothing existing was removed or renamed)", () => {
  const names = new Set(Object.keys(kiln));
  const missing = PRE_R8_EXPORTS.filter((n) => !names.has(n));
  assert.deepEqual(missing, [], `these pre-r8 exports are gone: ${missing.join(", ")}`);
});

// "Nothing more, nothing unexpected" beyond r8's OWN additions is no longer checked here in isolation — r9 legitimately adds
// nine more exports on top, so that fuller check now lives in "r9 adds EXACTLY its own nine declared exports..." below, which
// checks the export surface against the FULL pre-r9 + r9 set. This test only pins that r8's additions are still present.
test("r8's declared additions are still present (the pre-r9 floor)", () => {
  const missingAdditions = R8_ADDED_EXPORTS.filter((n) => !(Object.keys(kiln) as string[]).includes(n));
  assert.deepEqual(missingAdditions, [], `a declared r8 addition is missing: ${missingAdditions.join(", ")}`);
});

test("kiln/pi/index.ts (the Pi entry) is NOT re-exported from kiln/index.ts — it loads only via the manifest or -e", () => {
  assert.equal("makeKilnExtension" in kiln, false);
});

test("every pre-r9 export name (77 + 7 = 84) is still present (nothing existing was removed or renamed)", () => {
  const names = new Set(Object.keys(kiln));
  const missing = PRE_R9_EXPORTS.filter((n) => !names.has(n));
  assert.deepEqual(missing, [], `these pre-r9 exports are gone: ${missing.join(", ")}`);
});

test("r9 adds EXACTLY its own nine declared exports on top of the pre-r9 floor — nothing more, nothing unexpected", () => {
  const names = new Set(Object.keys(kiln));
  const extra = [...names].filter(
    (n) => !PRE_R9_EXPORTS.includes(n as (typeof PRE_R9_EXPORTS)[number]) && !R9_ADDED_EXPORTS.includes(n as (typeof R9_ADDED_EXPORTS)[number]),
  );
  assert.deepEqual(extra, [], `unexpected export(s) beyond the declared r9 additions: ${extra.join(", ")}`);
  const missingAdditions = R9_ADDED_EXPORTS.filter((n) => !names.has(n));
  assert.deepEqual(missingAdditions, [], `a declared r9 addition is missing: ${missingAdditions.join(", ")}`);
});

test("total export count is exactly 77 (pre-r8) + 7 (r8) + 9 (r9) = 93", () => {
  assert.equal(Object.keys(kiln).length, 93);
});
