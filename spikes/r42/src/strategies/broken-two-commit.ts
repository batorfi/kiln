// T015 — a DELIBERATELY BROKEN strategy, test-only. It records the move in one transaction and marks the gate settled in a second, with a kill point
// between them. A kill there leaves a move on a gate that never settled (the half-applied move, invariant I3). The harness must catch it; if it does not,
// the oracle cannot fail and every "held" it ever prints is worthless.
import { faultPoint, killPoint } from "../kill.ts";
import { refused, sameMove, validateMove, type GateCompletion, type GateId, type Move, type MoveKey, type Outcome } from "../port.ts";
import type { KillPoint, StartOptions, Strategy } from "../strategy.ts";
import { baseOperations, CONTROL_KILL_POINTS, inspectStore, openDb, readGate, rowToRecord } from "./control-sqlite.ts";
import type { DatabaseSync } from "node:sqlite";

const BETWEEN: KillPoint = { name: "between-commits", where: "the move is committed; the gate's settlement is not yet (the two commits of this broken design)", phase: "move" };

function createBrokenGate(db: DatabaseSync): GateCompletion {
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
          db.exec("ROLLBACK");
          const record = rowToRecord(g.row);
          if (g.row.key !== key) return refused("stale", { winner: g.row.key });
          return sameMove(record.move, move) ? { status: "repeat", record } : refused("key-conflict", { original: key });
        }
        faultPoint("store-write");
        db.prepare("INSERT INTO move (gate, key, kind, decided_by, brief_ref) VALUES (?, ?, ?, ?, ?)").run(gateId, key, move.kind, move.decidedBy, move.briefRef);
        killPoint("tx-after-write");
        db.exec("COMMIT"); // ← commit 1: the move is durable
        killPoint("between-commits");
        db.prepare("UPDATE gate SET state = 'settled' WHERE id = ?").run(gateId); // ← commit 2: the settlement (autocommit)
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
  name: "broken-two-commit",
  native: false,
  testOnly: true,
  killPoints: [...CONTROL_KILL_POINTS.slice(0, 4), BETWEEN, ...CONTROL_KILL_POINTS.slice(4)],
  caveats: [],
  async start(opts: StartOptions) {
    return createBrokenGate(openDb(opts.store));
  },
  async inspect(store: string, gateId: GateId) {
    return inspectStore(store, gateId);
  },
};
