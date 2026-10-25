// The closed set of move kinds and the gate ids (constitution v2.0.1, The Flow & The Roadmap).
// Pure: no node: imports (boundaries: contracts is I/O-free).

/** Teams relabel kinds; they never add one. */
export const MOVE_KINDS = [
  "approve", "revise", "reject", "restart", "split+revise", "mitigate", // feature gates
  "edit-rows", "add-row", "drop-row", // the Roadmap gate's row edits
] as const;
export type MoveKind = (typeof MOVE_KINDS)[number];

/** The internal ids are the first program's, unchanged (GATE-1), plus the two interface gates of flow v2 (constitution v2.1.0). */
export type GateKey =
  | "gate0" | "1-concept" | "2-architecture" | "2a-experience" | "3-spec" | "4-plan"
  | "5-checkpoint" | "6-review" | "6a-ui-review" | "7-verification" | "8-docs" | "9-pr";

/** As in the factory-log (G1: gate0 is not one of 1..9). "2a" and "6a" exist in flow v2 only. */
export type GateId = "gate0" | 1 | 2 | "2a" | 3 | 4 | 5 | 6 | "6a" | 7 | 8 | 9;

export const GATE_KEY_OF: Record<GateId, GateKey> = {
  gate0: "gate0",
  1: "1-concept",
  2: "2-architecture",
  "2a": "2a-experience",
  3: "3-spec",
  4: "4-plan",
  5: "5-checkpoint",
  6: "6-review",
  "6a": "6a-ui-review",
  7: "7-verification",
  8: "8-docs",
  9: "9-pr",
};

export type FlowVersion = "v1" | "v2";

/** G1: `gate0` (the Roadmap gate) sits above the lane; it is not one of the feature gates. */
export const PROGRAM_GATE: GateId = "gate0";
export const gateIsProgramGate = (gate: GateId): boolean => gate === PROGRAM_GATE;
