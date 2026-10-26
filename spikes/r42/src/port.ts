// T010 — the gate-completion port, in KILN's own terms (contracts/gate-completion-port.md). Types and pure functions only:
// nothing here imports the library, a runtime module, or anything from kiln/ or legacy/. Every strategy implements `GateCompletion`,
// and the same scenarios run against each — that is how the contract outlives the library's API.

export type GateId = string;

/** A small closed stand-in for the real move vocabulary (that set is r13's); the spike needs several distinct kinds to tell moves apart. */
export const MOVE_KINDS = ["approve", "revise", "reject"] as const;
export type MoveKind = (typeof MOVE_KINDS)[number];

export interface Move {
  kind: MoveKind;
  /** Who decided — never empty: a move with no decider is refused (constitution V, "a missing person never approves"). */
  decidedBy: string;
  /** The brief the decision was made on ("recorded as seen"). */
  briefRef: string;
}

/** The identity of one SUBMISSION: the same key with an equal move is a repeat; with a different move, a conflict. */
export type MoveKey = string;

/** What a committed move leaves behind. At most one per gate (invariant I4). */
export interface MoveRecord {
  gateId: GateId;
  key: MoveKey;
  move: Move;
  seq: 1;
}

export type RefusalReason =
  | "lost-race" // the gate was settled by another key between arrival and commit
  | "stale" // the gate was already settled, by another key, when the submission arrived
  | "key-conflict" // this key was already committed with a DIFFERENT move
  | "invalid-move"
  | "unknown-gate"
  | "not-ready" // the owner is up but cannot accept yet (a restart in progress)
  | "store-error"; // the store failed when the move was written; nothing was recorded

export type Outcome =
  | { status: "committed"; record: MoveRecord }
  | { status: "repeat"; record: MoveRecord }
  | {
      status: "refused";
      reason: RefusalReason;
      /** For `lost-race` and `stale`: the key of the move that settled the gate. */
      winner?: MoveKey;
      /** For `key-conflict`: the key that was already committed (this very key). */
      original?: MoveKey;
      detail?: string;
    };

export type OpenResult = { status: "opened" } | { status: "refused"; reason: "unknown-gate" | "store-error"; detail?: string };

/** Read from the store, never from memory. `unknown` is a gate that was never opened. */
export type GateState = { state: "waiting" } | { state: "settled"; record: MoveRecord } | { state: "unknown" };

export interface GateCompletion {
  /** Creates the gate in `waiting`. Idempotent: opening an open gate changes nothing. */
  open(gateId: GateId): Promise<OpenResult>;
  /** The ONLY operation that can settle a gate, and it is ONE atomic step: the move is recorded and the gate settled, or nothing at all is written. */
  submit(gateId: GateId, key: MoveKey, move: Move): Promise<Outcome>;
  state(gateId: GateId): Promise<GateState>;
  close(): Promise<void>;
}

/** `null` when valid; otherwise the detail for `refused(invalid-move)`. */
export function validateMove(move: unknown): string | null {
  if (typeof move !== "object" || move === null) return "the move is not an object";
  const m = move as Partial<Move>;
  if (typeof m.kind !== "string" || !(MOVE_KINDS as readonly string[]).includes(m.kind)) return `kind must be one of ${MOVE_KINDS.join(", ")}`;
  if (typeof m.decidedBy !== "string" || m.decidedBy.trim() === "") return "decidedBy is empty: a move with no decider is refused";
  if (typeof m.briefRef !== "string") return "briefRef must be a string";
  return null;
}

export const sameMove = (a: Move, b: Move): boolean => a.kind === b.kind && a.decidedBy === b.decidedBy && a.briefRef === b.briefRef;

export const refused = (reason: RefusalReason, extra: { winner?: MoveKey; original?: MoveKey; detail?: string } = {}): Outcome => ({ status: "refused", reason, ...extra });
