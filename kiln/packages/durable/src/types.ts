// The contract's types, in KILN's own terms (specs/011-durable-core-gate-contract/contracts/{gate-contract,seam-api}.md, data-model.md §2–§5).
// NOTHING in this file imports the library or names it: the contract outlives the library's API (CORE-1, SC-010). Types and pure functions only.
import type { FlowVersion, GateKey, MoveKind } from "#contracts/moves.ts";

/** An idempotency key: the identity of ONE submission of a command or a move (≤ 200 chars). */
export type Key = string;
/** A gate id, supplied by the caller and deterministic: `gate:<feature>:<gateKey>:<round>`. */
export type GateId = string;
/** A task's id: opaque to KILN (today the library mints numbers). Never parsed, never built — only stored and passed back. */
export type TaskId = number;
/** JSON only: what documents and checkpoints hold. */
export type JSON = null | boolean | number | string | JSON[] | { [k: string]: JSON };

export const KEY_MAX = 200;
export const GATE_ID_PATTERN = /^[a-z0-9][a-z0-9:._-]{0,159}$/;

// ── a gate ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface GateSpec {
  gateId: GateId;
  gateKey: GateKey;
  flow: FlowVersion;
  /** The brief AS IT WILL BE SHOWN — opaque JSON to this row. */
  brief: JSON;
  /** Who opens it: a task id, or "factory". Becomes the actor of `gate.opened`. */
  openedBy: string;
}
/** The one document written when a gate opens (`kiln.gate`) — never changed afterwards. */
export interface GateDocument {
  gateId: GateId;
  gateKey: GateKey;
  flow: FlowVersion;
  /** The move kinds the flow allows at this gate AS OF OPENING. */
  vocabulary: MoveKind[];
  briefRef: string;
  openedBy: string;
  openedAt: number;
  /** The command key that opened it: a second key for the same gate id is a `key-conflict` naming this one. */
  openKey: Key;
}
export interface Move {
  kind: MoveKind;
  /** Never empty or blank: a move with no decider is refused (constitution V). */
  decidedBy: string;
  /** The brief AS SEEN: must equal the gate's `briefRef`. */
  briefRef: string;
}
export interface MoveRecord {
  gateId: GateId;
  key: Key;
  move: Move;
  decidedAt: number;
  /** Always 1: at most one record per gate (I4). */
  seq: 1;
}

// ── outcomes: the closed vocabulary (spec FR-016; no new refusal code) ───────────────────────────────────────────────────
export type RefusalReason = "lost-race" | "stale" | "key-conflict" | "invalid-move" | "unknown-gate" | "not-ready" | "store-error";
export type Refusal = { status: "refused"; reason: RefusalReason; winner?: Key; original?: Key; detail?: string };
export type Outcome = { status: "committed"; record: MoveRecord } | { status: "repeat"; record: MoveRecord } | Refusal;
export type OpenOutcome = { status: "opened"; gate: GateDocument; taskId: TaskId } | { status: "repeat"; gate: GateDocument; taskId: TaskId } | Refusal;
export type GateState = { state: "unknown" } | { state: "waiting" } | { state: "settled"; record: MoveRecord };

export const refused = (reason: RefusalReason, extra: { winner?: Key; original?: Key; detail?: string } = {}): Refusal => ({ status: "refused", reason, ...extra });

// ── the outbox: the interim event stream (FR-019; r15 adopts it) ─────────────────────────────────────────────────────────
export type OutboxType = "gate.opened" | "move.committed" | "gate.settled" | "lane.acquired" | "lane.released" | "lane.swapped";
export interface OutboxEntry {
  type: OutboxType;
  /** The gate id, or "lane". */
  subject: string;
  at: number;
  /** Who did it. MUST be non-empty. */
  actor: string;
  /** What caused it (a command key, a move key). MUST be non-empty. */
  cause: string;
  data: JSON;
}
export type StoredOutboxEntry = OutboxEntry & { seq: number };

// ── tasks ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type TaskKindName = "kiln.roadmap" | "kiln.row" | "kiln.unit" | "kiln.gate" | "kiln.decision" | "kiln.lane";
export interface TaskSummary {
  id: TaskId;
  kind: string;
  /** The owning task, or "factory". */
  owner: TaskId | "factory";
  status: "pending" | "running" | "waiting" | "sleeping" | "completing" | "terminal";
  /** The outcome of a terminal task, as stored. */
  outcome?: { status: "completed" | "aborted" | "failed"; result?: JSON };
}

// ── the lane port (implemented in packages/lane, injected here: durable cannot import lane) ────────────────────────────────
export interface Lease {
  holder: TaskId;
  since: number;
}
export interface LaneApi {
  acquire(step: TaskId, opts?: { model?: string; hold?: boolean }): Promise<Lease>;
  release(step: TaskId): Promise<void>;
}

// ── inspection: read by a fresh reader with NO owner (data-model §7) ─────────────────────────────────────────────────────
export interface Inspection {
  store: { libraryVersion: string | null; contract: number | null };
  tasks: TaskSummary[];
  gate: "absent" | "waiting" | "settled";
  documents: { gate: boolean; brief: boolean; opened: boolean; moveCommitted: boolean; gateSettled: boolean };
  records: MoveRecord[];
  decision: "absent" | "live" | "terminal";
  /** The gate TASK (a projection that converges after the decision). */
  gateTask: "absent" | "live" | "terminal";
  decisionMatchesRecord: boolean;
  /** Any timer, sleep or deadline found on the gate or its decision (the only acceptable value is empty). */
  timers: string[];
  outbox: StoredOutboxEntry[];
  lane: { holders: number; resident: string | null; hold: boolean; swaps: number };
  /** key → distinct request hashes (I9: at most one each). */
  commands: Record<string, string[]>;
}

// ── errors: the only things that throw across the seam; outcomes are values ───────────────────────────────────────────────
export class StoreOwned extends Error {
  readonly store: string;
  readonly pid: number;
  readonly host: string;
  readonly socket: string;
  constructor(store: string, pid: number, host: string, socket: string, note = "") {
    super(`the store ${store} is owned by pid ${pid} on ${host} (socket ${socket}); a store has exactly one owner${note ? ` — ${note}` : ""}`);
    this.name = "StoreOwned";
    this.store = store;
    this.pid = pid;
    this.host = host;
    this.socket = socket;
  }
}
export class StoreVersionMismatch extends Error {
  readonly store: string;
  readonly recorded: string;
  readonly installed: string;
  constructor(store: string, recorded: string, installed: string) {
    super(`the store ${store} was created under library version ${recorded}; version ${installed} is installed — opening it is refused (an upgrade is a deliberate, recorded change)`);
    this.name = "StoreVersionMismatch";
    this.store = store;
    this.recorded = recorded;
    this.installed = installed;
  }
}
export class BadRequest extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequest";
  }
}
/** A failure to talk to an owner's channel: nothing listening (`unreachable`), no answer to a read (`outcome-unknown`), or a request the owner could not read (`bad-request`). */
export class ChannelError extends Error {
  readonly code: "unreachable" | "outcome-unknown" | "bad-request";
  constructor(code: ChannelError["code"], message: string) {
    super(message);
    this.name = "ChannelError";
    this.code = code;
  }
}
export class ChannelUnsafe extends Error {
  readonly path: string;
  constructor(path: string, problem: string) {
    super(`the channel path ${path} is not safe: ${problem}`);
    this.name = "ChannelUnsafe";
    this.path = path;
  }
}

// ── the factory's APIs (seam-api.md) ────────────────────────────────────────────────────────────────────────────────────
export interface GateApi {
  open(key: Key, spec: GateSpec): Promise<OpenOutcome>;
  submit(gateId: GateId, key: Key, move: Move): Promise<Outcome>;
  state(gateId: GateId): Promise<GateState>;
}
export type CommandOutcome<T> = { status: "applied"; result: T } | { status: "repeat"; result: T } | Refusal;
export interface CommandApi {
  /** CORE-5: run `effect` once for `key`; the effect and the ledger entry are ONE commit. */
  run<T extends JSON>(key: Key, kind: string, request: JSON, effect: (tx: import("./store.ts").Tx) => Promise<T>): Promise<CommandOutcome<T>>;
}
export type TaskCreateOutcome = { status: "created" | "repeat"; id: TaskId } | Refusal;
export interface TaskApi {
  /** Create a task of `kind` through the command ledger (`task.create`). */
  create(key: Key, kind: TaskKindName, input: JSON, owner: import("./store.ts").Owner): Promise<TaskCreateOutcome>;
  list(): Promise<TaskSummary[]>;
}
export interface Channel {
  readonly socketPath: string;
  close(): Promise<void>;
}
