// kiln/src/gate.ts — T011/T012 (US2): the gate primitive (E2, P-V) · one channel (NC3).
//
// A gate HOLDS the lane at a frontier head until a human move arrives as an event. The move must be
// a member of the gate's own MoveVocabulary (001's move-vocabulary.ts, G3 — imported, NOT
// re-declared). Headless (`!ui`) the gate NEVER auto-approves: it prints its card, emits ONE durable
// `wait` ({gate, token, deadline} — the only unresolved shape, R3) and HALTS; it never writes a
// `gate-completion`. Resumption is by TOKEN — a `human-decision` event named to the wait's token
// resolves the gate (one channel, NC3). The unattended tail pre-authorizes only the approve side of
// trailing gates via a DISTINCT `pre-delegation` ledger entry (R4); any line-of-defense veto halts
// the cruise and returns the lane to a human. Gate 0 is NEVER auto-cruised (P-VI / FR-012).
//
// Golden rule (P-I): a gate only EMITS a decision; it never DECIDES its own gate — the decider is a
// human (`decidedBy: human@…`) or a recorded pre-delegation. No cloud (P-VIII), no server (P-IX).

import { moveAllowed, moveVocabulary, type GateId } from "../contracts/move-vocabulary.ts";
import type { Cost } from "./types.ts";

export type { GateId };
export { moveAllowed, moveVocabulary };

/** The only unresolved gate shape (R3): a resume token + a deadline. */
export interface Wait {
  gate: string;
  token: string; // matches /^g[0-9a-f]+$/ (001's factory-log.schema.json)
  deadline: string; // ISO-8601
}
/** A DISTINCT auto-approve ledger entry (R4) — a separate record from a human decision. */
export interface PreDelegation {
  of: string; // e.g. "spec #42"
  by: string; // "spec #42 approved T"
  at: string; // ISO-8601
  reviewer?: string;
  note: "no objections";
}
/** A held/resolved gate (E2). Its fields are 001's declared shapes. */
export interface Gate {
  id: GateId;
  open: boolean;
  move?: string; // ∈ MoveVocabulary(id)
  decidedBy?: string; // human@…
  preDelegation?: PreDelegation;
  wait?: Wait;
}
/** A resolved gate's decision the writer (E3) stamps into a `gate-completion` record. */
export interface GateDecision {
  gate: GateId;
  move: string;
  decidedBy?: string;
  preDelegation?: PreDelegation;
  cost: Cost; // a gate-completion carries a cost (001's schema `required`)
}

const DEFAULT_DEADLINE = "2026-09-13T23:59:59Z";

/** Open a gate and hold the lane (returns "held"; the lane resumes only on a move / token). */
export function openGate(gate: Gate): "held" {
  gate.open = true;
  return "held";
}

/** The resume token for a gate: `g` + the gate number (base-16). Matches 001's `/^g[0-9a-f]+$/`. */
export function tokenFor(gate: Gate): string {
  const n = gate.id === "gate0" ? 0 : (gate.id as number);
  return `g${n.toString(16)}`;
}

/**
 * Headless degrade (P-V): print-the-card + emit ONE `wait` and HALT. Never resolves, never writes a
 * `gate-completion` — a headless gate is RECORDED, not RESOLVED.
 */
export function headlessWait(gate: Gate, deadline: string = DEFAULT_DEADLINE): Wait {
  const token = tokenFor(gate);
  const wait: Wait = { gate: String(gate.id), token, deadline };
  gate.wait = wait;
  gate.open = true;
  gate.move = undefined;
  gate.decidedBy = undefined;
  return wait;
}

/** Apply a human move. Illegal (`move ∉ MoveVocabulary(id)`) THROWS — the gate stays open (G3, US2 AC-3). */
export function applyMove(gate: Gate, move: string, decidedBy: string): Gate {
  const v = moveVocabulary(gate.id);
  if (!v.includes(move)) {
    throw new Error(`illegal move "${move}" at gate ${gate.id}; not in MoveVocabulary [${v.join(", ")}]`);
  }
  gate.move = move;
  gate.decidedBy = decidedBy;
  gate.open = false;
  return gate;
}

/**
 * Resume by token (the single channel, NC3): a `human-decision` event named to the open `wait`'s
 * token, with a legal move + a non-empty `decidedBy`, resolves the gate into a `gate-completion`.
 * Returns "still-open" when the token does not match the open wait (a different / already-resolved
 * gate) — resume is strictly by that gate's token.
 */
export function resumeByToken(
  gate: Gate,
  token: string,
  decidedBy: string,
  move = "approve",
  cost: Cost = { switches: 0, wallClock: "00:00" },
): GateDecision | "still-open" {
  if (!gate.wait || gate.wait.token !== token) return "still-open";
  if (!moveAllowed(gate.id, move)) {
    throw new Error(`illegal move "${move}" at gate ${gate.id}; not in MoveVocabulary`);
  }
  if (typeof decidedBy !== "string" || !decidedBy.startsWith("human@")) {
    throw new Error("a token-resumed gate-completion needs a human decider (human@…); it may not auto-approve (P-V)");
  }
  gate.move = move;
  gate.decidedBy = decidedBy;
  gate.open = false;
  gate.wait = undefined;
  return { gate: gate.id, move, decidedBy, cost };
}

/** Build the DISTINCT pre-delegation ledger entry (R4) a trailing gate's approve side runs through. */
export function makePreDelegation(of: string, by: string, at: string, reviewer?: string): PreDelegation {
  return { of, by, at, reviewer, note: "no objections" };
}

/**
 * The unattended tail (US2 AC-4 / constitution two-trim): auto-cross a trailing gate's approve side
 * via a DISTINCT `pre-delegation` record (R4). `approve` is the legal auto-move only for the
 * standard/PR gates; this helper refuses Gate 0 (P-VI / FR-012) and any move that is not `approve`.
 */
export function autoApprove(
  gate: Gate,
  pre: PreDelegation,
  cost: Cost = { switches: 0, wallClock: "00:00" },
): GateDecision {
  if (gate.id === "gate0") {
    throw new Error("P-VI/FR-012: Gate 0 (the program gate) is never auto-cruised; it is human-only");
  }
  if (!moveVocabulary(gate.id).includes("approve")) {
    throw new Error(`gate ${gate.id} has no approve side to pre-delegate; only approve-side gates auto-cross`);
  }
  gate.preDelegation = pre;
  gate.move = "approve";
  gate.open = false;
  gate.wait = undefined;
  return { gate: gate.id, move: "approve", preDelegation: pre, cost };
}

/**
 * A line-of-defense veto in the unattended tail HALTS the cruise and returns the lane to a human
 * (US2 AC-4): the only outcome is a `wait` — NO auto-completion. Auto-proceed NEVER lifts a veto.
 */
export type Veto = "architecture-critic-objection" | "reviewer-restart" | "verifier-reject" | "checkpoint-overflow";
export function vetoHalt(gate: Gate, _reason: Veto, deadline: string = DEFAULT_DEADLINE): Wait {
  // A veto never resolves the gate: it stays open, and the cruise is recorded as a WAIT.
  gate.open = true;
  gate.move = undefined;
  gate.decidedBy = undefined;
  return headlessWait(gate, deadline);
}

/** P-VI / FR-012: the program gate is never auto-authorized; the tail pre-authorizes only 4–9. */
export function isAutoApprovable(gate: Gate): boolean {
  return gate.id !== "gate0" && moveVocabulary(gate.id).includes("approve");
}
