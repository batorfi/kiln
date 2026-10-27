// A gate's state, read from the store and never from memory (FR-018): `unknown` for a gate never opened, `waiting` for an open gate with no move record, `settled` with the one record.
// "Settled" means a move record exists: the gate TASK is a projection that converges after the decision (research R2).
import type { Services } from "../services.ts";
import type { GateId, GateState } from "../types.ts";
import { gateExists, type GateDocData, type MoveDocData } from "./documents.ts";

export async function gateState(s: Services, gateId: GateId): Promise<GateState> {
  const g = await s.store.snapshot<GateDocData>("kiln.gate", gateId);
  if (!gateExists(g)) return { state: "unknown" };
  const m = await s.store.snapshot<MoveDocData>("kiln.move", gateId);
  return m?.record ? { state: "settled", record: m.record } : { state: "waiting" };
}
