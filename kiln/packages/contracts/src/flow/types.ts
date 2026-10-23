// Shapes of a flow definition (data-model §2–3). Types only.
import type { FlowVersion, GateKey, MoveKind } from "../moves.ts";

export interface GateDefinition {
  key: GateKey;
  /** The plain name people read. v1 = the first program's names; v2 = GATE-1's. */
  name: string;
  /** One question per gate (v2 only; v1 carries none). */
  question?: string;
  phase: "program" | "contract" | "build-and-prove" | "release";
  /** The moves a PERSON may make here. */
  moves: readonly MoveKind[];
  /** Automatic kinds the factory may apply before a person decides (Verification: ["mitigate"]). */
  automatic?: readonly MoveKind[];
  /** The judge role for this gate, if any. */
  judge?: string;
  /** Verification only: automatic fix rounds before the gate opens for a person. */
  mitigationCap?: { default: number; min: number; max: number };
}

export interface RoleRoster {
  version: FlowVersion;
  /** Judge roles — strongest model only (P-II). */
  judges: readonly string[];
  /** Known producer roles (informational until roles become files). */
  producers: readonly string[];
}

export interface FlowDefinition {
  version: FlowVersion;
  /** Exactly ten entries, in order: gate0, then 1…9. */
  gates: readonly GateDefinition[];
  roster: RoleRoster;
}
