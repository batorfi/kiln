// T014 — the CORRECT reference strategy. It uses only Node's built-in SQLite (no Pi Durable): the move record and the gate's settlement are
// written in ONE transaction, with a primary key giving exactly-once and first-wins. Its job is to prove the harness can say "held": if the
// harness reports anything else for this design, the harness is wrong, and nothing built on it can be trusted.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Inspection } from "../invariants.ts";
import { faultPoint, killPoint } from "../kill.ts";
import { refused, sameMove, validateMove, type GateCompletion, type GateId, type GateState, type Move, type MoveKey, type MoveRecord, type Outcome } from "../port.ts";
import type { KillPoint, StartOptions, Strategy } from "../strategy.ts";

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS gate (id TEXT PRIMARY KEY, state TEXT NOT NULL CHECK (state IN ('waiting','settled')));
  CREATE TABLE IF NOT EXISTS move (gate TEXT PRIMARY KEY REFERENCES gate(id), key TEXT NOT NULL, kind TEXT NOT NULL, decided_by TEXT NOT NULL, brief_ref TEXT NOT NULL);
`;

export interface MoveRow { gate: string; key: string; kind: string; decided_by: string; brief_ref: string }

/** WAL with synchronous = NORMAL: the same durability setting as the library's SQLite storage, so a SIGKILL means the same thing to both. */
export function openDb(store: string): DatabaseSync {
  mkdirSync(store, { recursive: true });
  const db = new DatabaseSync(join(store, "control.sqlite"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 2000;");
  db.exec(SCHEMA);
  return db;
}

export const rowToRecord = (r: MoveRow): MoveRecord => ({ gateId: r.gate, key: r.key, move: { kind: r.kind as Move["kind"], decidedBy: r.decided_by, briefRef: r.brief_ref }, seq: 1 });

export function readGate(db: DatabaseSync, gateId: GateId): { exists: boolean; settled: boolean; row?: MoveRow } {
  const g = db.prepare("SELECT state FROM gate WHERE id = ?").get(gateId) as { state: string } | undefined;
  if (!g) return { exists: false, settled: false };
  const row = db.prepare("SELECT * FROM move WHERE gate = ?").get(gateId) as MoveRow | undefined;
  return { exists: true, settled: g.state === "settled", row };
}

/** The parts of the port that do not decide anything, shared with the broken control so the two differ ONLY in `submit`. */
export function baseOperations(db: DatabaseSync): Pick<GateCompletion, "open" | "state" | "close"> {
  return {
    async open(gateId) {
      try {
        db.prepare("INSERT OR IGNORE INTO gate (id, state) VALUES (?, 'waiting')").run(gateId);
        return { status: "opened" };
      } catch (e) {
        return { status: "refused", reason: "store-error", detail: (e as Error).message };
      }
    },
    async state(gateId): Promise<GateState> {
      const g = readGate(db, gateId);
      if (!g.exists) return { state: "unknown" };
      return g.settled && g.row ? { state: "settled", record: rowToRecord(g.row) } : { state: "waiting" };
    },
    async close() {
      db.close();
    },
  };
}

/** Read the store the way the oracle needs it. Used by a fresh process with no owner; it only SELECTs. */
export function inspectStore(store: string, gateId: GateId): Inspection {
  const db = openDb(store);
  try {
    const g = readGate(db, gateId);
    const records = g.row ? [rowToRecord(g.row)] : [];
    // In these controls the "decision task" IS the gate row: it is terminal exactly when the gate row says settled.
    return {
      gate: g.settled ? "settled" : "waiting",
      records,
      decisionTask: !g.exists ? "absent" : g.settled ? "terminal" : "live",
      decisionOutcomeMatches: g.settled ? Boolean(g.row) : true,
      timers: [],
      blocked: false,
    };
  } finally {
    db.close();
  }
}

export const CONTROL_KILL_POINTS: KillPoint[] = [
  { name: "idle-before-move", where: "submit entered; nothing read or written yet", phase: "move" },
  { name: "move-received", where: "the owner has read the request line and not yet dispatched it", phase: "move" },
  { name: "tx-begin", where: "inside the transaction, before any read or write", phase: "move" },
  { name: "tx-after-write", where: "inside the transaction, after the move and the settlement are written, before COMMIT (mid-transaction)", phase: "move" },
  { name: "tx-committed-before-ack", where: "after COMMIT returned, before the acknowledgement is sent", phase: "completion" },
  { name: "ack-sent", where: "the acknowledgement has been written to the socket", phase: "completion" },
];

function createGate(db: DatabaseSync): GateCompletion {
  return {
    ...baseOperations(db),
    async submit(gateId: GateId, key: MoveKey, move: Move): Promise<Outcome> {
      killPoint("idle-before-move");
      const bad = validateMove(move);
      if (bad) return refused("invalid-move", { detail: bad });
      try {
        db.exec("BEGIN IMMEDIATE");
        killPoint("tx-begin");
        const g = readGate(db, gateId);
        if (!g.exists) {
          db.exec("ROLLBACK");
          return refused("unknown-gate");
        }
        if (g.row) {
          db.exec("ROLLBACK"); // nothing to write: a repeat, a conflict, or a stale move
          const record = rowToRecord(g.row);
          if (g.row.key !== key) return refused("stale", { winner: g.row.key });
          return sameMove(record.move, move) ? { status: "repeat", record } : refused("key-conflict", { original: key });
        }
        faultPoint("store-write");
        db.prepare("INSERT INTO move (gate, key, kind, decided_by, brief_ref) VALUES (?, ?, ?, ?, ?)").run(gateId, key, move.kind, move.decidedBy, move.briefRef);
        db.prepare("UPDATE gate SET state = 'settled' WHERE id = ?").run(gateId);
        killPoint("tx-after-write");
        db.exec("COMMIT");
        killPoint("tx-committed-before-ack");
        return { status: "committed", record: { gateId, key, move, seq: 1 } };
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch {
          /* no transaction was open */
        }
        return refused("store-error", { detail: (e as Error).message });
      }
    },
  };
}

export const strategy: Strategy = {
  name: "control-sqlite",
  native: false,
  testOnly: true,
  killPoints: CONTROL_KILL_POINTS,
  caveats: [],
  async start(opts: StartOptions) {
    return createGate(openDb(opts.store));
  },
  async inspect(store: string, gateId: GateId) {
    return inspectStore(store, gateId);
  },
};
