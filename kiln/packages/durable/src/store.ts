// The seam's internal contract, in KILN's own terms: what the rest of the durable package (and the lane) may do to a store, WITHOUT naming the library.
// `library/` implements these interfaces; nothing outside it can see how. No import of the library here, no library name (SC-010).
import type { JSON, OutboxEntry, StoredOutboxEntry, TaskId } from "./types.ts";

export type DocName = "kiln.store" | "kiln.gate" | "kiln.brief" | "kiln.move" | "kiln.command" | "kiln.lane" | "kiln.outbox";
export const DOC_NAMES: readonly DocName[] = ["kiln.store", "kiln.gate", "kiln.brief", "kiln.move", "kiln.command", "kiln.lane", "kiln.outbox"];

/** Who owns a task: the factory itself, or another task. */
export type Owner = { kind: "factory" } | { kind: "task"; taskId: TaskId };

export type TaskStatus = "pending" | "running" | "waiting" | "sleeping" | "completing" | "terminal";
export type OutcomeOf<R> = { status: "completed"; result: R } | { status: "aborted"; reason?: string } | { status: "failed"; message: string };
/** A task as read from the store (never from memory). */
export interface TaskLite {
  id: TaskId;
  kind: string;
  owner: TaskId | null;
  input: JSON;
  status: TaskStatus;
  checkpoint?: JSON;
  outcome?: OutcomeOf<JSON>;
  restarts: number;
}
/** What the scheduler says about a live task right now. */
export interface LiveTask {
  id: TaskId;
  kind: string;
  state: "running" | "ready" | "waiting" | "sleeping" | "completing" | "blocked";
}
/** Something the library reported that must stay empty (a task parked or faulted). */
export interface Report {
  type: string;
  task?: { id: TaskId; kind: string };
  reason?: string;
}

/** A transaction inside one commit. It can read and write documents and create tasks — and nothing else: no clock, no sleep, no transition of another task. */
export interface Tx {
  /** The document `name`/`key`, created from `seed` if absent; the returned object is a draft: mutate it and the change is part of this commit. */
  doc<T extends object>(name: DocName, key: string, seed: T): Promise<T>;
  createTask(kind: string, input: JSON, owner: Owner): Promise<TaskId>;
  task(id: TaskId): Promise<TaskLite | undefined>;
}

// ── task kinds ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export type NextState<C, R> =
  | { status: "running"; checkpoint: C }
  | { status: "waiting"; checkpoint: C; on: TaskId[] }
  | { status: "terminal"; outcome: OutcomeOf<R> };
export interface RunningTask<I, C> {
  id: TaskId;
  input: I;
  checkpoint: C;
}
export interface Runtime<C, R> {
  readonly taskId: TaskId;
  /** Aborted when the factory closes. */
  readonly signal: AbortSignal;
  /** One atomic commit. May write documents, create tasks, and return this task's OWN next state (a checkpoint, a wait on tasks, or terminal). */
  commit(change: (tx: Tx) => NextState<C, R> | undefined | void | Promise<NextState<C, R> | undefined | void>): Promise<void>;
  /** The outcomes of tasks that are terminal; rejects when one is not. */
  outcomes(ids: TaskId[]): Promise<OutcomeOf<JSON>[]>;
}
export interface TaskKind<I, C extends { phase: string }, R> {
  name: string;
  version: number;
  initial(input: I): C;
  phases: { [P in C["phase"]]: (task: RunningTask<I, Extract<C, { phase: P }>>, run: Runtime<C, R>) => Promise<void> };
  /** Required: how this task ends when it is aborted. Must commit a terminal outcome. */
  abort(task: RunningTask<I, C>, run: Runtime<C, R>): Promise<void>;
}
export const defineKilnTask = <I, C extends { phase: string }, R>(kind: TaskKind<I, C, R>): TaskKind<I, C, R> => kind;

// ── a reader (no owner) and an open store ──────────────────────────────────────────────────────────────────────────────────
/** What a fresh process can do to a store file WITHOUT owning it: read. It never resumes anything and never writes. */
export interface Reader {
  /** A committed read; `undefined` when the document does not exist (a read never creates one). */
  snapshot<T extends object>(name: DocName, key: string): Promise<T | undefined>;
  /** Every member of a document family, as committed. */
  docs<T extends object>(name: DocName): Promise<{ key: string; value: T }[]>;
  /** Tasks as stored, optionally of one kind. */
  tasks(filter?: { kind?: string }): Promise<TaskLite[]>;
  close(): Promise<void>;
}

// ── an open store ────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Store extends Reader {
  readonly reports: readonly Report[];
  /** One atomic commit in the factory's root; reads and writes go through `tx`. */
  commit<T>(change: (tx: Tx) => Promise<T> | T): Promise<T>;
  /** The scheduler's view of live tasks. */
  live(): Promise<LiveTask[]>;
  /** Start scheduling (idempotent). */
  resume(): void;
}
export interface OpenStoreOptions {
  dir: string;
  now?: () => number;
  kinds: TaskKind<never, never, never>[] | TaskKind<any, any, any>[];
  /** TESTS ONLY: the installed library version the store guard compares with (FR-047). Default: the installed package's own version. */
  installedLibraryVersion?: string;
}
export type { OutboxEntry, StoredOutboxEntry };
