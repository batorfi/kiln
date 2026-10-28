// The bridge between a gate KEY (as the factory-log writes it: "gate0", "3-spec") and r12's flow data, which is addressed by gate ID. Pure.
import { GATE_KEY_OF, type FlowVersion, type GateId as FlowGateId, type MoveKind } from "#contracts/moves.ts";
import { flowOf, hasGate, moveVocabulary, noteRequired } from "#contracts/flow/index.ts";

/** The move kinds the flow allows at this gate, or `undefined` when the key names no gate of that flow (an unknown key, or a gate the flow does not have: "2a" under v1). */
export function vocabularyOf(gateKey: string, flow: string): MoveKind[] | undefined {
  if (flow !== "v1" && flow !== "v2") return undefined;
  const id = (Object.keys(GATE_KEY_OF) as unknown as string[]).map((k) => (k === "gate0" ? "gate0" : /^\d+$/.test(k) ? Number(k) : k) as FlowGateId).find((g) => GATE_KEY_OF[g] === gateKey);
  if (id === undefined || !hasGate(id, flow as FlowVersion)) return undefined;
  return [...moveVocabulary(id, flow as FlowVersion)];
}

/** The kinds of this gate that need a note (GATE-5), or `undefined` when the key names no gate of that flow. v1 carries no rules, so it needs none (r14 changes nothing for it). */
export function noteRequiredOf(gateKey: string, flow: string): MoveKind[] | undefined {
  if (vocabularyOf(gateKey, flow) === undefined) return undefined;
  return noteRequired(flowOf(flow as FlowVersion), gateKey as never);
}
