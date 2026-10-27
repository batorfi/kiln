// The package's public surface (seam-api.md). Everything the rest of kiln/ may use from the durable core is exported here — in KILN's terms, with no name of the library.
export { openFactory } from "./factory.ts";
export type { Factory, FactoryOptions } from "./factory.ts";
export { inspectStore } from "./inspect.ts";
export { KILL_POINTS, FAULT_POINTS, NO_HOOKS } from "./hooks.ts";
export type { Hooks, KillPoint, FaultPoint } from "./hooks.ts";
export { defineKilnTask } from "./store.ts";
export type { TaskKind, Tx, Runtime, RunningTask, NextState, OutcomeOf, Owner, Store, Reader } from "./store.ts";
export { StoreOwned, StoreVersionMismatch, ChannelUnsafe, BadRequest, refused } from "./types.ts";
export type {
  GateSpec, GateDocument, Move, MoveRecord, Outcome, OpenOutcome, GateState, Refusal, RefusalReason, Inspection, TaskSummary, TaskKindName, LaneApi, Lease,
  GateApi, CommandApi, TaskApi, Channel, OutboxEntry, StoredOutboxEntry, Key, GateId, TaskId, JSON, CommandOutcome, TaskCreateOutcome,
} from "./types.ts";
