// kiln/index.ts — WIRING (T031) — r1 wires the lane spine in place of 001's not-wired stub.
//
// 001's `kiln/index.ts` was a DELIBERATE not-wired STUB (Q1=C: planning artifacts only). r1 is the
// runtime row (the "kiln starts firing" row): it EXPORTS the lane spine — the single lane +
// director-scheduler, the gate primitive, the factory-log writer, the affinity scheduler, the watch,
// the stub resident, and the dogfood walk — so a later row can import it. Per Principle VI / FR-012,
// WIRING the spine does NOT admit a program or advance Gate 0: the admission is the human record in
// `specs/ROADMAP.md` (gate0.status: approved); this module emits no `gate0` decision. No cloud
// (P-VIII), no server (P-IX) — by construction.

export * from "./src/lane.ts";
export * from "./src/gate.ts";
export * from "./src/log-writer.ts";
export * from "./src/scheduler.ts";
export * from "./src/stub-resident.ts";
export * from "./src/walk.ts";
export { renderHud } from "./ui/hud.ts";
export { renderPopup } from "./ui/popup.ts";
export { printHeadless, disabledUi } from "./ui/twin.ts";
export { laneIsWired, WIRING_STATUS } from "./src/_wiring.ts";
