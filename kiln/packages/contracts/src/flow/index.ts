// The flow API: which gates exist, what moves each allows, what people call them. Pure — no I/O.
import type { FlowVersion, GateId, MoveKind } from "../moves.ts";
import { GATE_KEY_OF } from "../moves.ts";
import type { FlowDefinition, GateDefinition } from "./types.ts";
import { v1 } from "./v1.ts";

export const flows: { readonly v1: FlowDefinition } = { v1 };
/** The flow a record or call names nothing for. */
export const DEFAULT_FLOW: FlowVersion = "v1";
/** Verification's automatic fix rounds before a person waits (G4). */
export const MITIGATION_CAP_DEFAULT = 2;

export function flowOf(version: FlowVersion): FlowDefinition {
  const f = (flows as Record<string, FlowDefinition | undefined>)[version];
  if (!f) throw new Error(`unknown flow: ${String(version)}`);
  return f;
}

function gateOf(gate: GateId, flow: FlowVersion): GateDefinition {
  const key = GATE_KEY_OF[gate];
  if (!key) throw new Error(`unknown gate id: ${String(gate)}`);
  const def = flowOf(flow).gates.find((x) => x.key === key);
  if (!def) throw new Error(`no gate ${key} in flow ${flow}`);
  return def;
}

export function moveVocabulary(gate: GateId, flow: FlowVersion = DEFAULT_FLOW): readonly MoveKind[] {
  return gateOf(gate, flow).moves;
}

export function moveAllowed(gate: GateId, move: string, flow: FlowVersion = DEFAULT_FLOW): boolean {
  return (moveVocabulary(gate, flow) as readonly string[]).includes(move);
}

export function gateName(gate: GateId, flow: FlowVersion = DEFAULT_FLOW): string {
  return gateOf(gate, flow).name;
}
