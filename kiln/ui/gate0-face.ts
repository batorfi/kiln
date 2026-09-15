// kiln/ui/gate0-face.ts — T010/T011 (US2): the Gate-0 FACE (E2, P-VI) · a *distinct* Layer-C face.
//
// Gate 0 is the one gate the constitution will not silence (P-VI). It is rendered on a DISTINCT
// Layer-C face (the roadmap program table + the move set) — NEVER Layer B's per-gate card chrome
// (NC2), and it uses the roadmap-level move vocabulary `moveVocabulary("gate0")` =
// [approve, revise, reject, edit-rows, add-row, drop-row] — a per-gate 1–9 move is never accepted here
// (SC-002). A Gate-0 *decision* is recorded ADDITIVELY as a `gate-completion` at `gate:"gate0"` with
// a human `decidedBy` — NO new log record type (NC3/D3), so 001's `kiln/validate/log.ts` accepts it
// unchanged.
//
// F1 (constitution, P-VI): Gate 0 ADMITS NO RECORDED EXCEPTION. A `gate0: approved` rides a HUMAN
// `decidedBy` ONLY — unlike a per-gate Gates 1–9 approval, which P-V/P-VII may ride a distinct
// `pre-delegation`. A pre-delegated gate-0 approval is REFUSED here; the generic R3 "decidedBy OR
// pre-delegation" escape of 001's log.ts does NOT apply at gate0.
//
// No cloud (P-VIII), no server (P-IX); r2 renders/records a HUMAN decision — it never decides it
// (P-I / FR-014), and it never admits its own program (FR-014 / SC-007).

import { moveAllowed, moveVocabulary } from "../contracts/move-vocabulary.ts";
import type { RoadmapHead } from "../src/types.ts";
import type { EmitInput } from "../src/log-writer.ts";

/** The human-facing admission moves (a subset of moveVocabulary("gate0")); the rest are program-EDIT moves. */
export const GATE0_ADMISSION_MOVES = ["approve", "revise", "reject"] as const;

/**
 * Render the distinct Layer-C Gate-0 face over a roadmap head (§5.2): the program table + ONLY the
 * roadmap-level move set. It NEVER draws a per-gate card (NC2); the two faces are disjoint by
 * construction (`gate0 ≠ gate`, G1 / SC-002).
 */
export function renderGate0Face(roadmap: RoadmapHead): string {
  const moves = moveVocabulary("gate0");
  const lines: string[] = [];
  lines.push("=== GATE 0 — ROADMAP (the program gate; human-only, P-VI) — face: Layer C, NOT the per-gate card ===");
  lines.push(`program: ${roadmap.deliverable}`);
  for (const r of roadmap.rows) {
    lines.push(`     ${String(r.id).padEnd(4)} | ${r.short} | deps: ${r.deps.length ? r.deps.join(",") : "—"}`);
    }
  lines.push(
      `gate0 head: ${roadmap.gate0.status}` +
       (roadmap.gate0.rows ? ` · rows ${roadmap.gate0.rows}` : "") +
       (roadmap.gate0.decided_by ? ` · decided_by ${roadmap.gate0.decided_by}` : ""),
    );
  lines.push(
       `moves [${moves.join(", ")}] — admission: [${GATE0_ADMISSION_MOVES.join(", ")}] · veto: a revise/reject HOLDS the program open · headless: PRINTS this table + a WAIT (never auto-advances)`,
    );
  lines.push("distinct from Layer B (per-gate 1–9); the move vocabularies are disjoint (gate0 ≠ gate)");
  return lines.join("\n");
}

/**
 * Record a HUMAN Gate-0 decision additively as a `gate-completion` at `gate:"gate0"` (NC3/D3 — no new
 * record type). REQUIRES: (1) `move ∈ moveVocabulary("gate0")`; and, per F1/P-VI, (2) a NON-EMPTY
 * HUMAN `decidedBy` (`human@…`). A move ∉ the vocabulary, or a missing/non-human decider (incl. a
 * pre-delegation standing in for a human), is REFUSED — the face STAYS OPEN.
 */
export function recordGate0Decision(
    roadmap: RoadmapHead,
    decision: { move: string; decidedBy?: string },
): EmitInput {
    // G3 / SC-002: the move must live in the roadmap-level vocabulary, not a per-gate one.
  if (!moveAllowed("gate0", decision.move)) {
    throw new Error(
          `illegal Gate-0 move "${decision.move}"; not in moveVocabulary("gate0") [${moveVocabulary("gate0").join(", ")}] (gate0 ≠ gate, G1/SC-002)`,
      );
    }
        // F1 / P-VI (the resolved CRITICAL): Gate 0 admits NO recorded exception — a pre-delegation may
     // NOT stand in for a human decider here. A missing or non-`human@…` decider is REFUSED.
  const by = decision.decidedBy;
  if (typeof by !== "string" || by.trim() === "" || !by.startsWith("human@")) {
    throw new Error(
          `F1/P-VI: a Gate-0 decision needs a HUMAN decider (human@…); Gate 0 admits NO recorded exception / pre-delegation — the face stays open`,
      );
    }
   return {
    recordType: "gate-completion",
       "gate-completion": {
      gate: "gate0",
      move: decision.move,
      cost: { switches: 0, wallClock: "00:00" },
      decidedBy: by,
      },
    };
}

/**
 * F1 / P-VI (the falsifiable core of the resolved CRITICAL): only a `human@…` decider admits gate 0;
 * a recorded pre-delegation is REFUSED. A predicate a test can assert on.
 */
export function gate0AdmitMode(by?: string): "human-only" | "refused" {
  return typeof by === "string" && by.startsWith("human@") ? "human-only" : "refused";
}

/** SC-002 / G1: is `move` a per-gate 1–9 move that is therefore rejected at Gate 0 (disjoint vocab). */
export function gate0RejectsPerGateMove(move: string): boolean {
  return !moveAllowed("gate0", move) && moveVocabulary(5).includes(move); // e.g. "split+revise" @ checkpoint 5
}
