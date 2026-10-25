// Shapes of a flow definition (data-model §2–3). Types only.
import type { FlowVersion, GateKey, MoveKind } from "../moves.ts";

/** Deterministic predicates only — never an LLM. Shape from docs/concepts/ui-flow.md §4.1, §5.1. */
export interface AppliesWhen {
  paths?: readonly string[];
  labels?: readonly string[];
  /** Experience design: the row cites a charter journey step. */
  journeys?: "any";
  /** UI review: ui_files_changed, tokens_changed, routes_changed. */
  diff?: readonly string[];
}

export interface GateDefinition {
  key: GateKey;
  /** The plain name people read. v1 = the first program's names; v2 = GATE-1's. */
  name: string;
  /** One question per gate (v2 only; v1 carries none). */
  question?: string;
  /** Declared, never evaluated here: when the gate applies (flow v2's two interface gates). Evaluation is r14's. */
  appliesWhen?: AppliesWhen;
  /** A deterministic evidence role that is not a model (UI review: "ui-checker"). */
  check?: string;
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
  /** v1: exactly ten entries (gate0, then 1…9). v2: twelve, in order: gate0, 1, 2, 2a, 3, 4, 5, 6, 6a, 7, 8, 9. */
  gates: readonly GateDefinition[];
  roster: RoleRoster;
}
