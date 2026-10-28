// The gate's documents (data-model §2): `kiln.gate` and `kiln.brief` are written once in the opening commit and never changed; `kiln.move` is written once in the move commit.
// Reads outside a commit go through `store.snapshot`, which never creates a document.
import type { GateDocument, MoveRecord, TaskId } from "../types.ts";

/** What `kiln.gate` holds: a GateDocument plus the move vocabulary AS OF OPENING and the gate task's id. `{}` is the seed of a gate that does not exist. */
export type GateDocData = Partial<GateDocument> & { vocabulary?: string[]; gateTask?: TaskId };
export interface BriefDocData {
  briefRef?: string;
  content?: unknown;
}
export interface MoveDocData {
  record: MoveRecord | null;
  /** r14: the gate ENDED WITHOUT being settled — a feature-level move withdrew it. At most one of `record` and `withdrawn` is ever set. */
  withdrawn?: { key: string; by: string; at: number; target: string; note: string };
}
export const gateExists = (g: GateDocData | undefined): g is GateDocData & Required<Pick<GateDocData, "gateId" | "briefRef" | "vocabulary">> => !!g && g.gateId !== undefined && g.briefRef !== undefined && Array.isArray(g.vocabulary);
