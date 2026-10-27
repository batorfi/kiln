// The `kiln.walk/<feature>` document (data-model §3.3): the cross-task facts that the opening commit and a completer's command must READ — which gate is open, which feature moves exist, whether one is pending.
// Everything else about a walk is in the row's checkpoint. The helpers work inside a transaction; the seed is the document of a walk that has not started.
import type { Tx } from "../store.ts";
import type { FeatureMoveRecord, GateId, Key } from "../types.ts";

export type WalkStatus = "admitting" | "active" | "left-lane" | "not-admitted" | "done";
export interface WalkDoc {
  feature?: string;
  status?: WalkStatus;
  /** Set in the SAME commit that opens a walk gate; cleared when the gate ends. */
  openGateId?: GateId | null;
  /** Every feature-level move ever made, by key: exactly once. */
  moves?: Record<Key, FeatureMoveRecord>;
  /** Recorded, not yet consumed by the row. */
  pending?: FeatureMoveRecord | null;
}
export const WALK_SEED = (feature: string): WalkDoc => ({ feature, status: "admitting", openGateId: null, moves: {}, pending: null });
export const ENDED: readonly WalkStatus[] = ["left-lane", "not-admitted", "done"];

/** The walk document inside a commit, created from its seed if the feature has none. */
export const walkDoc = (tx: Tx, feature: string): Promise<WalkDoc> => tx.doc<WalkDoc>("kiln.walk", feature, WALK_SEED(feature));
export const walkExists = (d: WalkDoc | undefined): d is WalkDoc & { feature: string; status: WalkStatus } => !!d && d.feature !== undefined && d.status !== undefined;
