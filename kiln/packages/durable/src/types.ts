// The contract's types, in KILN's own terms (specs/011-durable-core-gate-contract/contracts/{gate-contract,seam-api}.md, data-model.md §2–§5).
// NOTHING in this file imports the library or names it: the contract outlives the library's API (CORE-1, SC-010). Types and pure functions only.
import type { FlowVersion, GateKey, MoveKind } from "#contracts/moves.ts";
import type { Target } from "#contracts/flow/types.ts";

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
  /** r14: the places a `reject` made at this gate may name besides its own gate (the engine's `targetsOf`, supplied by the walk). Stored once, like the vocabulary. */
  returnsTo?: Target[];
  /** r14: opens the gate AS A GATE OF A WALK — in the same commit the feature's `kiln.walk` document records it as the open gate, and the opening is refused while a feature-level move is pending. */
  walk?: { feature: string };
}
/** The one document written when a gate opens (`kiln.gate`) — never changed afterwards. */
export interface GateDocument {
  gateId: GateId;
  gateKey: GateKey;
  flow: FlowVersion;
  /** The move kinds the flow allows at this gate AS OF OPENING. */
  vocabulary: MoveKind[];
  /** r14: the kinds of that vocabulary that need a note (GATE-5), as of opening. Absent in a gate opened by r13: read as none. */
  noteRequired: MoveKind[];
  /** r14: the targets a reject may name (see GateSpec.returnsTo). Absent in a gate opened by r13: read as none. */
  returnsTo: Target[];
  briefRef: string;
  openedBy: string;
  openedAt: number;
  /** The command key that opened it: a second key for the same gate id is a `key-conflict` naming this one. */
  openKey: Key;
}
/** The Roadmap gate's admission decisions (r14, research R5): carried by an `approve` at gate0 and nowhere else. */
export interface Admit {
  /** Interface gates the person requires even where their rule is false (EXP-3). */
  require?: GateKey[];
  /** True = ignore the triage proposal (Concept and Architecture are crossed). */
  overrideTriage?: boolean;
  /** Verification's automatic fix rounds, 0–3 (GATE-6). Absent = the flow's default. */
  fixRounds?: 0 | 1 | 2 | 3;
}
export interface Move {
  kind: MoveKind;
  /** Never empty or blank: a move with no decider is refused (constitution V). */
  decidedBy: string;
  /** The brief AS SEEN: must equal the gate's `briefRef`. */
  briefRef: string;
  /** r14: required for the corrective kinds (GATE-5); becomes the next step's instruction. */
  note?: string;
  /** r14: a reject's target when it is not the same gate. Must be one the gate was opened to accept. */
  target?: Target;
  /** r14: only on `approve` at gate0. */
  admit?: Admit;
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
export type GateState = { state: "unknown" } | { state: "waiting" } | { state: "settled"; record: MoveRecord } | { state: "withdrawn"; key: Key; by: string };

export const refused = (reason: RefusalReason, extra: { winner?: Key; original?: Key; detail?: string } = {}): Refusal => ({ status: "refused", reason, ...extra });

// ── the outbox: the interim event stream (FR-019; r15 adopts it) ─────────────────────────────────────────────────────────
export type OutboxType =
  | "gate.opened" | "move.committed" | "gate.settled" | "lane.acquired" | "lane.released" | "lane.swapped"
  // r14 (data-model §6): what the walk records, each in the commit of the state it changes
  | "walk.admitted" | "gate.not-applicable" | "gate.became-applicable" | "gate.skipped" | "gate.withdrawn" | "walk.returned" | "walk.fix-round" | "walk.split"
  | "walk.left-lane" | "walk.not-admitted" | "walk.completed";
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

// ── the feature-level move (r14, research R6) ──────────────────────────────────────────────────────────────────────────────────────────────
/** A reject made on the FEATURE, not on a gate: at any time, even when no gate is open. It withdraws an open gate (never settling it) or is held pending for the walk. */
export interface FeatureMove {
  kind: "reject";
  decidedBy: string;
  target: Target;
  note: string;
}
export interface FeatureMoveRecord {
  key: Key;
  move: FeatureMove;
  decidedAt: number;
  /** `withdrew`: a gate was open and ended in the same commit. `recorded`: no gate was open; the move is held for the walk. */
  effect: "withdrew" | "recorded";
  gateId?: GateId;
}
export type FeatureOutcome = { status: "committed"; record: FeatureMoveRecord } | { status: "repeat"; record: FeatureMoveRecord } | Refusal;

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
  /**
   * Called once by `openFactory` after the store is open: makes sure the factory has its ONE lane task, and releases a lease that a generation which died with the previous process still held
   * (FR-032). Requests made before it finishes wait for it. Optional so a factory without a lane is the same factory.
   */
  start?(): Promise<void>;
  /**
   * Take the lane for `step`, waiting its turn (at most one holder). One commit: the lease, the resident model, the hold flag, the swap count and the `lane.*` outbox entries (FR-031). Rejects if
   * `opts.signal` aborts while waiting. `hold` defaults to false; `model` left out keeps the resident one.
   */
  acquire(step: TaskId, opts?: { model?: string; hold?: boolean; signal?: AbortSignal; cause?: string }): Promise<Lease>;
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
