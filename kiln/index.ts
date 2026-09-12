// kiln/index.ts — WIRING STUB (T025 / Q1=C)
//
// This is a DELIBERATE, DOCUMENTED stub. Per the 001-kiln-scaffold plan (Q1=C —
// "planning artifacts only") and success criterion SC-006 ("no task fires a lane or
// advances a gate"), the lane *runtime* (the one resident model, the gate rail that
// blocks, the event-driven HUD) is a LATER roadmap row. This file only REIFIES the
// three pre-lane contracts; it wires nothing that advances a gate.
//
// What it references (the contracts this slice delivers):
//   - kiln/schemas/factory-log.schema.json  (JSONL record contract, rules R1–R6)
//   - kiln/schemas/roadmap.schema.json      (ROADMAP head contract, rules M1–M4)
//   - kiln/contracts/gate-rail.md           (Gate 0 + Gate 1–9, roles, G1–G5)
// A later row replaces this stub with the real event→state→HUD wiring.
//
// It MUST NOT: open a lane, load a resident model, advance a gate, or call a cloud.

export const WIRING_STATUS = "not-wired (pre-lane stub; lane runtime is a later row)" as const;

// The three contracts the stub points at, for a future wiring row to import.
export const CONTRACTS = {
  factoryLog: "kiln/schemas/factory-log.schema.json",
  roadmap: "kiln/schemas/roadmap.schema.json",
  gateRail: "kiln/contracts/gate-rail.md",
} as const;

// No lane, no gate advance, no cloud — by construction.
export function laneIsWired(): boolean {
  return false;
}
