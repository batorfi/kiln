// The flow API: which gates exist, what moves each allows, what people call them. Pure — no I/O.
import type { FlowVersion, GateId, GateKey, MoveKind } from "../moves.ts";
import { GATE_KEY_OF } from "../moves.ts";
import type { FlowDefinition, GateDefinition } from "./types.ts";
import { v1 } from "./v1.ts";
import { v2 } from "./v2.ts";

// r14: the pure rules over the data (engine, applicability, the glob dialect).
export * from "./engine.ts";
export { applicability, atUiSlot } from "./applies.ts";
export { compileGlob, firstMatch, globProblem, matchGlob } from "./glob.ts";
export type * from "./types.ts";

export const flows: { readonly v1: FlowDefinition; readonly v2: FlowDefinition } = { v1, v2 };
/** The flow all new work uses (constitution v2.1.0). */
export const CURRENT_FLOW = "v2" satisfies FlowVersion;
/** The flow a RECORD that names none was made under (FR-012): history is v1. Never the default of a function — see moveVocabulary. */
export const DEFAULT_RECORD_FLOW = "v1" satisfies FlowVersion;
/** Verification's automatic fix rounds before a person waits (G4). */
export const MITIGATION_CAP_DEFAULT = 2;

export function flowOf(version: FlowVersion): FlowDefinition {
  // Own keys only: a plain-object lookup would accept "toString" or "constructor".
  const f = Object.hasOwn(flows, version) ? (flows as Record<string, FlowDefinition>)[version] : undefined;
  if (!f) throw new Error(`unknown flow: ${String(version)}`);
  return f;
}

function keyOf(gate: GateId): GateKey {
  const key = Object.hasOwn(GATE_KEY_OF, gate) ? GATE_KEY_OF[gate] : undefined;
  if (!key) throw new Error(`unknown gate id: ${String(gate)}`);
  return key;
}

/** False for a gate the flow does not have ("2a" and "6a" under v1); still throws for an id that is no gate at all. */
export function hasGate(gate: GateId, flow: FlowVersion = CURRENT_FLOW): boolean {
  const key = keyOf(gate);
  return flowOf(flow).gates.some((x) => x.key === key);
}

function gateOf(gate: GateId, flow: FlowVersion): GateDefinition {
  const key = keyOf(gate);
  const def = flowOf(flow).gates.find((x) => x.key === key);
  if (!def) throw new Error(`no gate ${key} in flow ${flow}`);
  return def;
}

export function moveVocabulary(gate: GateId, flow: FlowVersion = CURRENT_FLOW): readonly MoveKind[] {
  return gateOf(gate, flow).moves;
}

export function moveAllowed(gate: GateId, move: string, flow: FlowVersion = CURRENT_FLOW): boolean {
  if (!hasGate(gate, flow)) return false;
  return (moveVocabulary(gate, flow) as readonly string[]).includes(move);
}

export function gateName(gate: GateId, flow: FlowVersion = CURRENT_FLOW): string {
  return gateOf(gate, flow).name;
}
