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
export { checkOverlayReady, reportOverlayReady } from "./validate/overlay-ready.ts"; // E6
