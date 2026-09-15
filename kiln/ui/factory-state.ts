// kiln/ui/factory-state.ts — T024 (US5) + T003/T019 (US3/US4): the single store + event mutation.
//
// ONE shared `FactoryState` (001's shape, imported). It mutates ONLY on a fired factory event — no
// timer, no socket, no server (P-IX). `onEvent` is a PURE function over the store: it returns a NEW
// state for a fired event and leaves the input untouched, so a captured identical state yields an
// identical render (one source of truth; SC-005). A `disabled` twin PRINTS the same content instead
// of blocking — a missing surface hides the view, never the decision (the headless contract, P-V).
//
// r2 EXTENDS r1 additively (NC3/D8): the closed `FactoryEvent` union gains EXACTLY two Layer-C events
// (E3 / D4) — `gate0_open` (raise the overlay / Gate-0 face; the lane HOLDS for a human) and
// `roadmap_row_done` (a row closed: redraw + re-enter Gate 0 at the inter-row seam). These are the
// redraw TRIGGERS P-IX names, so no poll can exist (SC-005). A `roadmap_row_done` advances `current`
// to the next dep-eligible row and re-enters Gate 0, but NEVER re-enters a merged/done row
// (P-VI / FR-009) — inter-feature progression waits on a human.

import type { FactoryState, RoadmapRow } from "../src/types.ts";

/**
 * r2's additive, in-memory-only flag. NOT re-declared in 001's types.ts (the JSON schema validates the
 * LOG RECORDS, not this transient store flag): a `gate0_open` sets `gate0Open`; a road-seam re-enters
 * gate 0 by setting it + flipping the head to `pending`.
 */
export type LayerCState = FactoryState & { gate0Open?: boolean };

/**
 * The factory events the surfaces redraw on — never a timer tick, never a socket. r2 adds exactly two
 * Layer-C events to r1's closed union (E3/D4); a *missing* one cannot exist, so a poll cannot exist.
 */
export type FactoryEvent =
    | { kind: "transition", to: string }
    | { kind: "gate-open", gate: string }
    | { kind: "gate-resolve", gate: string, move: string, by: string }
    | { kind: "cost", switches: number, wallClock: string }
    | { kind: "wait", gate: string }
    | { kind: "snapshot" }
    // ── r2 ADDS (exactly two; the Layer-C redraw triggers, P-IX) ──
    | { kind: "gate0_open" } // raise the overlay / Gate-0 face; the lane HOLDS for a human (no advance)
    | { kind: "roadmap_row_done", rowId: string }; // a row closed: redraw + re-enter Gate 0 at the seam

function clone<T>(s: T): T {
  return JSON.parse(JSON.stringify(s)) as T;
}

/** Apply a fired event to the store, returning a NEW state (pure over the store; F1 / P-IX). */
export function onEvent(state: FactoryState, ev: FactoryEvent): FactoryState {
  const next = clone(state) as LayerCState;
  switch (ev.kind) {
    case "gate-open":
    case "wait":
      next.gate = { id: Number(ev.gate) || 0 };
      break;
    case "gate-resolve":
      if (next.gate && String(next.gate.id) === String(ev.gate)) next.gate = null;
      break;
    case "cost":
      next.switches = ev.switches;
      next.wallClock = ev.wallClock;
      break;
    case "transition":
      next.current = ev.to;
      break;
    case "gate0_open":
      // Raise the overlay / Gate-0 face. The lane HOLDS for a human; Gate 0 is NEVER auto-advanced.
      next.gate0Open = true;
      break;
    case "roadmap_row_done":
      applyRoadmapRowDone(next, ev.rowId);
      break;
    case "snapshot":
      break;
  }
  if (next.switches < 0) next.switches = 0;
  return next;
}

/**
 * r2 / P-VI / FR-009: a `roadmap_row_done` re-enters Gate 0 at the inter-row seam. `current` advances
 * to the next dep-eligible row; the head flips to `pending` (Gate 0 re-opened for a human). A
 * `merged`/`aborted`/`done` row is NEVER re-entered — `nextEligibleRow` skips terminal rows, so a
 * closure of an already-terminal row cannot advance `current` back onto it (SC-004).
 */
function applyRoadmapRowDone(state: LayerCState, _rowId: string): void {
  // The seam always RE-OPENS Gate 0 for a human; it is a re-entry signal, never a re-entry of a terminal row.
  state.gate0Open = true;
  state.gate0 = { ...(state.gate0 ?? {} as Record<string, unknown>), status: "pending" } as FactoryState["gate0"];
  const nextId = nextEligibleRow(state.roadmap); // next row whose deps are all done/aborted AND not yet terminal
  if (nextId) state.current = nextId; // advance only to a non-terminal eligible row (all-terminal ⇒ null ⇒ no advance)
}

/** The next row whose deps are all `done`/`aborted` and which is itself not yet terminal (P-VI dep gate). */
export function nextEligibleRow(roadmap: RoadmapRow[]): string | null {
  const done = new Set(roadmap.filter((r) => r.status === "done" || r.status === "aborted").map((r) => r.id));
  for (const r of roadmap) {
    if (r.status === "done" || r.status === "aborted") continue; // never re-enter a terminal row
    if (r.deps.every((d) => done.has(d))) return r.id; // deps satisfied ⇒ eligible
  }
  return null;
}

/**
 * The disabled-UI twin (P-V / P-IX): when a surface is absent the SAME content is printed and the gate
 * STILL blocks — `blocksOn` reports a row-gate; `blocksOnGate0` reports an open Gate 0 (F-GATE0-BLOCK).
 */
export function blocksOn(state: FactoryState): boolean {
  return state.gate != null;
}

/** r2 / P-VI / F-GATE0-BLOCK: Gate 0 is open when raised (`gate0Open`) or its head is `pending`. */
export function blocksOnGate0(state: FactoryState): boolean {
  const s = state as LayerCState;
  return s.gate0Open === true || s.gate0?.status === "pending";
}

/** The combined headless-block: an open row-gate OR an open Gate 0 (a missing overlay hides the view, never the decision). */
export function blocksAny(state: FactoryState): boolean {
  return blocksOn(state) || blocksOnGate0(state);
}
