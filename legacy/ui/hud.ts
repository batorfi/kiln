// kiln/ui/hud.ts — T025 (US5): Layer A — the Flow HUD (E5, P-IX).
//
// The persistent footer strip: `rail / lane / switches / clock`. A PURE read of the one shared
// FactoryState — identical state ⇒ identical render (one source of truth, SC-005). No timer, no
// socket, no server: it is re-invoked only on a fired event, never scheduled.

import type { FactoryState } from "../src/types.ts";

/** Render the Flow HUD strip from a state (a distilled read, not a second source of truth). */
export function renderHud(state: FactoryState): string {
  const rail = state.gate ? `gate${state.gate.id}` : "—";
  const lane = state.current || "idle";
  const switches = String(state.switches);
  const clock = state.wallClock || "00:00";
  return `rail=${rail} lane=${lane} switches=${switches} clock=${clock}`;
}
