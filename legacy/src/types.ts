// kiln/src/types.ts — T007 (Foundational)
//
// Convenience TS type mirror of the canonical JSON Schemas in kiln/schemas/
// (research §A: the JSON Schema stays canonical; these types aid a downstream
// runtime row). They describe the factory-log record shapes and the ROADMAP head.

import type { GateId } from "../contracts/move-vocabulary.ts";

// ---- Entity 1: factory-log record (union) ----
export interface Ts {
  ts: string; // ISO-8601
  seq: number;
  recordType: "transition" | "gate-completion" | "human-decision" | "cost" | "wait" | "pre-delegation";
  // R5: no record may carry a cloud/remote field (forbidden keys listed in log.ts).
}
export interface TransitionRecord extends Ts {
  recordType: "transition";
  transition: { kind: "load" | "hold" | "yield" | "swap"; from?: string; to?: string; reason?: string };
}
export interface GateCompletionRecord extends Ts {
  recordType: "gate-completion";
  "gate-completion": GateCompletion;
}
export type GateCompletion = {
   gate: GateId;
  move: string;
  cost: Cost;
  decidedBy?: string; // human@... (keyboard decision)
  preDelegation?: { of: string; by: string; at: string; reviewer?: string; note?: "no objections" }; // R4 distinct
};
export interface HumanDecisionRecord extends Ts {
  recordType: "human-decision";
  "human-decision": { gate?: string; decidedBy: string; move: string; note?: string };
}
export interface CostRecord extends Ts {
  recordType: "cost";
  cost: Cost;
}
export interface WaitRecord extends Ts {
  recordType: "wait";
  wait: { gate: string; token: string; deadline: string }; // must never carry status=approved
}
export interface PreDelegationRecord extends Ts {
  recordType: "pre-delegation";
  preDelegation?: Record<string, unknown>;
}
export type FactoryRecord =
   TransitionRecord | GateCompletionRecord | HumanDecisionRecord | CostRecord | WaitRecord | PreDelegationRecord;

export interface Cost {
  switches: number;
  wallClock: string; // "HH:MM"
}

// ---- Entity 4: FactoryState shape (for the log; NOT implemented as a runtime) ----
export interface FactoryState {
  resident: { model: string; tier: string } | null;
  running: { duId: string; role: string } | null;
  queue: unknown[];
  switches: number;
  wallClock: string;
  roadmap: RoadmapRow[];
  current: string;
  gate0: { status: string };
  gate?: { id: number } | null;
}

// ---- Entity 2/3: ROADMAP head + row ----
export interface RoadmapHead {
  deliverable: string;
  owner: string; // human@...
  updated: string;
  rows: RoadmapRow[];
  ordering: string[];
  chain_unattended: boolean;
  gate0: Gate0;
  trace: string; // FR-009
}
export interface RoadmapRow {
  id: string; // r1, r2, ...
  short: string;
  deps: string[];
  status: "queued" | "active" | "revising" | "done" | "aborted";
  outcome?: string; // @PR#NN, iff status=done
  gate?: number; // 1..9, iff status=active
  spec?: string;
}
export interface Gate0 {
  status: "pending" | "approved" | "revised" | "rejected";
  rows?: string;
  decided_by?: string;
  at?: string;
  note?: string;
}
