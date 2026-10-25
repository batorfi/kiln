// kiln/src/log-writer.ts — T016 (US3): the factory-log writer (E3, P-V/VII) · the choke point.
//
// The EMITTER 001's `kiln/validate/log.ts` is the CHECKER for. It fills `seq` (strictly
// increasing, gap-free, R2) and `ts` (non-decreasing, R2) and is the SINGLE CHOSE POINT that
// enforces no-silent-approval AT WRITE TIME (R3/R4, D3): a `gate-completion` is only emitted when it
// carries a human `decidedBy` OR a (distinct) `pre-delegation`; otherwise `write` THROWS and the line
// is never written. A `wait` is the only shape an unresolved gate may take.
//
// No cloud (P-VIII): no record carries a remote field; a missing outside resource is a flagged,
// non-blocking `unavailableResource` marker (001's R5 flag-not-block). No server (P-IX): the writer
// is a pure in-memory accumulator flushed by `drain()`, never a socket.

import { makeClock, type Clock } from "./clock.ts";

// The record types this writer emits (001's factory-log union — the SHAPES are 001's, imported not
// re-declared; see kiln/src/types.ts). A `bare` record is any of these WITHOUT `seq`/`ts`, which the
// writer stamps.
export type EmitInput =
  | { recordType: "transition"; transition: { kind: "load" | "hold" | "yield" | "swap"; from?: string; to?: string; reason?: string } }
  | { recordType: "cost"; cost: { switches: number; wallClock: string } }
  | { recordType: "human-decision"; "human-decision": { gate?: string; decidedBy: string; move: string; note?: string } }
  | { recordType: "pre-delegation"; "pre-delegation": { of: string; by: string; at: string; reviewer?: string; note: "no objections" } }
  | {
      recordType: "gate-completion";
      "gate-completion": {
        gate: "gate0" | number;
        move: string;
        cost: { switches: number; wallClock: string };
        decidedBy?: string;
        preDelegation?: { of: string; by: string; at: string; reviewer?: string; note: "no objections" };
      };
     }
  | { recordType: "wait"; wait: { gate: string; token: string; deadline: string } };

// SC-002: the moves that "advance/approve" a gate — the ones R3/R4 guard.
const APPROVING_MOVES = new Set(["approve", "restart", "merge"]);

/**
 * SC-002 / R3-R4: a `gate-completion` is a SILENT APPROVAL when its moving move
 * (`approve`/`restart`/`merge`), with NO human `decidedBy` AND NO (distinct) `pre-delegation`.
 * `preDelegated` = the set of gate keys a distinct `pre-delegation` record has already authorized.
 */
export function isSilentApproval(rec: EmitInput, preDelegated: Set<string>): boolean {
  if (rec.recordType !== "gate-completion") return false;
  const gc = rec["gate-completion"];
  if (!APPROVING_MOVES.has(gc.move)) return false;
  const hasDecider = typeof gc.decidedBy === "string" && gc.decidedBy.startsWith("human@");
  const hasSelf = gc.preDelegation != null && typeof gc.preDelegation === "object";
  const hasDistinct = preDelegated.has(String(gc.gate));
  return !(hasDecider || hasSelf || hasDistinct);
}

export interface LogWriterSnapshot {
  seq: number; // last emitted seq (0..N-1)
  ts: string; // last emitted ts
}

/**
 * A monotonic, schema-conformant record emitter. `seq` starts at 0 and is strictly increasing /
 * gap-free; `ts` is non-decreasing. `write` stamps `seq`/`ts`, enforces no-silent-approval BEFORE
 * emitting (D3), and accumulates JSONL lines flushed by `drain()` (to `kiln/factory-log/`).
 */
export class LogWriter {
  private seq = 0;
  private readonly clock: Clock;
  private readonly lines: string[] = [];
  private lastTs = "";
  private readonly preDelegated = new Set<string>();

  constructor(clock: Clock = makeClock()) {
    this.clock = clock;
   }

  private enforceNoSilentApprovalOn(rec: EmitInput): void {
    // The writer guard: ANY gate-completion with no decider is refused at write time. This is a safe
    // SUPERSET of SC-002 (which counts the approve/restart/merge moves) and GUARANTEES the emitted
    // log passes 001's log.ts (whose checkDecisions requires a decider on every gate-completion).
    if (rec.recordType !== "gate-completion") return;
    if (isSilentApproval(rec, this.preDelegated)) {
      const gc = rec["gate-completion"];
      throw new Error(
          `R3/R4 no-silent-approval: gate-completion (gate ${String(gc.gate)}, move "${gc.move}") recorded with NO human decidedBy and NO distinct pre-delegation — a gate may not silently approve`,
         );
     }
    }

  write(rec: EmitInput): void {
    this.enforceNoSilentApprovalOn(rec);
      // A distinct pre-delegation record opens the ledger entry for its gate key (R4), so a later
     // gate-completion for that gate is authorized by a DISTINCT entry, not a self one.
    if (rec.recordType === "pre-delegation") {
      const of = String(rec["pre-delegation"].of);
      this.preDelegated.add(of);
     }
    const ts = this.clock.now();
    if (this.lastTs !== "" && ts < this.lastTs) {
       // R2: ts must be non-decreasing; the clock is monotonic so this only trips on a buggy clock.
      throw new Error(`R2: ts ${ts} is earlier than previous ${this.lastTs} (must be non-decreasing)`);
        }
    this.lastTs = ts;
    const stamped = { recordType: rec.recordType, ts, seq: this.seq, ...rec } as Record<string, unknown>;
    this.lines.push(JSON.stringify(stamped));
    this.seq += 1;
     }

   drain(): string[] {
    return this.lines;
   }

   snapshot(): LogWriterSnapshot {
    return { seq: this.seq - 1, ts: this.lastTs };
   }
}

/** The JSONL text `drain()` produces (what lands in `kiln/factory-log/`). */
export function toJsonl(lines: string[]): string {
  return lines.join("\n");
}
