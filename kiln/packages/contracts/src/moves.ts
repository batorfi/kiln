// The closed set of move kinds and the gate ids (constitution v2.0.1, The Flow & The Roadmap).
// Pure: no node: imports (boundaries: contracts is I/O-free).

/** Teams relabel kinds; they never add one. */
export const MOVE_KINDS = [
  "approve", "revise", "reject", "restart", "split+revise", "mitigate", // feature gates
  "edit-rows", "add-row", "drop-row", // the Roadmap gate's row edits
] as const;
export type MoveKind = (typeof MOVE_KINDS)[number];

/** The internal ids are the first program's, unchanged (GATE-1). */
export type GateKey =
  | "gate0" | "1-concept" | "2-architecture" | "3-spec" | "4-plan"
  | "5-checkpoint" | "6-review" | "7-verification" | "8-docs" | "9-pr";

/** As in the factory-log (G1: gate0 is not one of 1..9). */
export type GateId = "gate0" | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const GATE_KEY_OF: Record<GateId, GateKey> = {
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

export type FlowVersion = "v1" | "v2";
