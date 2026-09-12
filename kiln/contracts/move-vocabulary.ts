// kiln/contracts/move-vocabulary.ts — T005 (Foundational)
//
// Machine-readable MoveVocabulary(gate) from the gate-rail contract
// (kiln/contracts/gate-rail.md, rules G1–G5). The human-readable contract is
// the source of truth; this map lets kiln/validate/log.ts check G3 (a
// gate-completion's `move` must be a member of MoveVocabulary(gate)) and
// kiln/tests/contract/gate-rail.test.ts assert the per-gate move sets.
//
// G1: `gate0` (program gate) is DISTINCT from a row's live Gates 1..9.
// G5: checkpoint carries `split+revise` (+ `approve`), NO `reject`.
//      review carries `approve`/`restart`, NO `revise`.
//      verification carries `approve`/`reject` with mitigation cap = 2.

/** A gate id: the program gate `gate0`, or one row's live Gates 1..9. */
export type GateId = "gate0" | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const MITIGATION_CAP = 2; // G4: verification auto-mitigation rounds, then human WAIT.

export const GATE_RAIL = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
/** gate0 sits ABOVE the lane; it is not one of Gates 1..9. */
export const PROGRAM_GATE: GateId = "gate0";

/** MoveVocabulary(gate) — the canonical move set per gate (G3). */
export const MOVE_VOCABULARY: Record<string, readonly string[]> = {
  gate0: ["approve", "revise", "reject", "edit-rows", "add-row", "drop-row"],
  "1-concept": ["approve", "revise", "reject"],
  "2-architecture": ["approve", "revise", "reject"],
  "3-spec": ["approve", "revise", "reject"],
  "4-plan": ["approve", "revise", "reject"],
  // G5: checkpoint is the one "grow" move; NO reject (a restorable base, not "done wrong").
  "5-checkpoint": ["approve", "split+revise"],
  // G5: reviewer judges, never authors → no `revise`; corrective move is `restart`.
  "6-review": ["approve", "restart"],
  // G4/G5: verdict approve/reject; reject auto-mitigates ≤ 2 rounds (see MITIGATION_CAP).
  "7-verification": ["approve", "reject"],
  "8-docs": ["approve", "revise", "reject"],
  "9-pr": ["approve", "reject"],
};

const GATE_TO_KEY: Record<GateId, string> = {
  gate0: "gate0",
  1: "1-concept",
  2: "2-architecture",
  3: "3-spec",
  4: "4-plan",
  5: "5-checkpoint",
  6: "6-review",
  7: "7-verification",
  8: "8-docs",
  9: "9-pr",
};

/** MoveVocabulary(gateId) for a gate id (gate0 or 1..9). */
export function moveVocabulary(gate: GateId): readonly string[] {
  const key = GATE_TO_KEY[gate];
  if (!key) throw new Error(`unknown gate id: ${String(gate)}`);
  const moves = MOVE_VOCABULARY[key];
  if (!moves) throw new Error(`no move vocabulary for gate id: ${String(gate)}`);
  return moves;
}

/** G3: is `move` permitted at `gate`? */
export function moveAllowed(gate: GateId, move: string): boolean {
  return moveVocabulary(gate).includes(move);
}

/** G1: `gate0` is distinct from any live Gates 1..9 gate. */
export function gateIsProgramGate(gate: GateId): boolean {
  return gate === PROGRAM_GATE;
}

/** G5: which gate carries the special `split+revise` grow move. */
export const CHECKPOINT_GATE: GateId = 5;
/** G5: which gate carries `restart` (judges-but-does-not-author). */
export const REVIEW_GATE: GateId = 6;
/** G5/G4: which gate has the bounded mitigation loop. */
export const VERIFICATION_GATE: GateId = 7;
