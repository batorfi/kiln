// kiln/ui/factory-state.ts — T024 (US5): the single store + event mutation (E5, P-IX) · F-EVENTONLY.
//
// ONE shared `FactoryState` (001's shape, imported). It mutates ONLY on a fired factory event — no
// timer, no socket, no server (P-IX). `onEvent` is a PURE function over the store: it returns a NEW
// state for a fired event and leaves the input untouched, so a captured identical state yields an
// identical render (one source of truth; SC-005). A `disabled` twin PRINTS the same content instead
// of blocking — a missing surface hides the view, never the decision (the headless contract, P-V).

import type { FactoryState } from "../src/types.ts";

/** The factory events the two surfaces redraw on — never a timer tick, never a socket. */
export type FactoryEvent =
   | { kind: "transition"; to: string }
   | { kind: "gate-open"; gate: string }
   | { kind: "gate-resolve"; gate: string; move: string; by: string }
   | { kind: "cost"; switches: number; wallClock: string }
   | { kind: "wait"; gate: string }
   | { kind: "snapshot" };

function clone(s: FactoryState): FactoryState {
  return JSON.parse(JSON.stringify(s)) as FactoryState;
}

/** Apply a fired event to the store, returning a NEW state (pure over the store; F1 / P-IX). */
export function onEvent(state: FactoryState, ev: FactoryEvent): FactoryState {
  const next = clone(state);
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
    case "snapshot":
       break;
     }
  if (next.switches < 0) next.switches = 0;
  return next;
}

/**
 * The disabled-UI twin (P-V / P-IX): when a surface is absent the SAME content is printed and the
 * gate STILL blocks — `blocksOn` reports whether a gate is open (the twin never auto-resolves it).
 */
export function blocksOn(state: FactoryState): boolean {
  return state.gate != null;
}
