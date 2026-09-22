// kiln/index.ts — WIRING (T031 r1 + T023 r2).
//
// r1 wired the lane spine in place of 001's not-wired stub. r2 COMPOSES Layer C on top: it also
// exports the Roadmap overlay, the Gate-0 face, the extended twin, and the closed-row program walk.
// Per Principle VI / FR-012 / SC-007, WIRING the overlay does NOT admit a program or advance Gate 0 —
// the admission is the human record in `specs/ROADMAP.md`; this module emits no `gate0` decision.
// No cloud (P-VIII), no server (P-IX) — by construction.

// ── r1: the lane spine (single lane + director-scheduler, gate, writer, affinity, watch, twin) ──
export * from "./src/lane.ts";
export * from "./src/gate.ts";
export * from "./src/log-writer.ts";
export * from "./src/scheduler.ts";
export * from "./src/stub-resident.ts";
export * from "./src/walk.ts"; // r1 stub walk + r2 buildProgramWalk (the closed-row program walk)
export { renderHud } from "./ui/hud.ts"; // Layer A
export { renderPopup } from "./ui/popup.ts"; // Layer B
export { printHeadless, disabledUi } from "./ui/twin.ts"; // headless twin (extended with Layer C, T014)
export { laneIsWired, WIRING_STATUS } from "./src/_wiring.ts";

// ── r2: Layer C — the Roadmap overlay, its Gate-0 face, keymap, and the OverlayCReady probe ──
export { renderOverlay, LAYERC_REDRAW_TRIGGERS } from "./ui/overlay.ts"; // E1
export { renderGate0Face, recordGate0Decision, gate0AdmitMode, GATE0_ADMISSION_MOVES } from "./ui/gate0-face.ts"; // E2
export { LAYERC_KEY, LAYERB_KEY, TOGGLE_KEY, keymapIsConsistent } from "./ui/keymap.ts"; // §D6 spike
export { onEvent, blocksOn, blocksOnGate0, blocksAny, nextEligibleRow } from "./ui/factory-state.ts"; // E3
export { checkOverlayReady, reportOverlayReady } from "./validate/overlay-ready.ts"; // E6 (r2 OverlayCReady)

// ── r3 (004): the first LIVE-model smoke walk — a live resident + the recorded `--live`/`--stub`
// toggle, the live-walk sibling, the live `ctx.ui` smoke of A/B/C, and the LiveModelReady probe. A
// live resident + a live walk + a live TUI COMPOSE on r1's spine + r2's overlay; NOTHING here admits
// a program or advances Gate 0 (P-VI / FR-010 / SC-007 — r3 re-OPENs Gate 0 at its own close), and
// the `--stub` is a RECORDED, never-silent fallback (F-NOT-SILENT, P-V/P-VII).
export { makeLiveResident, selectResident, residentSelectionMarker, isResidentSelectionRecorded, DEFAULT_LOCAL_MODEL, type ResidentMode, type ResidentSelection, type SelectResidentOptions } from "./src/live-resident.ts"; // E1+E3
export { buildLiveWalk, liveWalkRecordsSelection, assertLiveSingleLane, WalkHaltedError, type LiveWalk, type LiveWalkOptions } from "./src/live-walk.ts"; // E2 (+ CR-3: the halted-walk error)
export { renderLive, renderLiveSurfaces, attachLiveTui, liveTuiOrTwin, LIVE_REDRAW_TRIGGERS, type LiveTuiSurfaces, type LiveUICtx, type LiveTuiSurface, type LiveTuiResult } from "./ui/live-tui.ts"; // E4
export { checkLiveModelReady, reportLiveModelReady, type LiveModelReadyOverride } from "./validate/live-ready.ts"; // E5

// ── r7 (006): TRUE live local inference — a real Ollama-backed resident (the first that actually calls a model),
// driven by the SAME lane through an async spine (NC1=B), with the P-VIII loopback exception spent by exactly ONE
// allowlisted module (NC2=A). Wiring it admits no program and advances no gate (P-VI): the human's Gate-0 move is
// the only admission, and r7's own close RE-OPENS Gate 0. It is judged by 001's unmodified `log.ts` plus r1/r2/r3's
// probes; `OllamaReady` (validate/ollama-ready.ts) is the probe that actually dials.
export { makeOllamaResident, promptFor, isLoopbackHost, resolveOllamaBase, OllamaError, OLLAMA_DEFAULT_HOST, type OllamaResident, type OllamaResidentOptions, type OllamaErrorCode } from "./src/ollama-resident.ts";
export { type ResidentLocation } from "./src/live-resident.ts";
export { checkOllamaReady, reportOllamaReady, type OllamaReadyOverride, type OllamaReadyResult } from "./validate/ollama-ready.ts"; // E3 (r7 OllamaReady — the probe that actually dials)

// ── r8 (007): KILN ON PI — the extension foundation. KILN declares its OWN structural view of Pi (`pi/port.ts`) and imports
// nothing from Pi itself (research D1) — the P-VIII scan flags a type-only Pi import as an external dependency. The seam
// (`pi/outcome.ts`) turns whatever Pi's dialogs return into `answered`/`no-answer`; every non-answer becomes r1's OWN
// `headlessWait` — never a second Wait mechanism, never a decision (P-I, P-V, P-VII). `PiReady` (validate/pi-ready.ts) is the
// probe that starts a REAL Pi, hermetically, and dials it both ways (`-e` and the package manifest). `kiln/pi/index.ts` itself
// is NOT re-exported here — it stays behind the `"pi"` manifest in package.json (NC2 = A + B), the way Pi actually loads it.
export {
  detectCapability, type PiMode, type PiCtx, type PiUi, type PiApi, type PiCommand, type PiDialogOptions,
  type Capability, type GateQuestion, type NoAnswerReason, type Outcome,
} from "./pi/port.ts";
export { interpret, askGate, resolveAsk, type AskResult } from "./pi/outcome.ts";
export { checkPiReady, reportPiReady, HOOK_NAMES, type PiReadyOptions, type PiReadyHooks, type PiReadyResult, type PiReadyCheck, type PiReadyFailure } from "./validate/pi-ready.ts";
