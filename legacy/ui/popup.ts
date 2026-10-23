// kiln/ui/popup.ts — T025 (US5): Layer B — the Flow Popup (E5, P-IX).
//
// The on-demand gate card, drawn when a gate opens. A PURE read of the one shared FactoryState,
// listing the gate's OWN MoveVocabulary (001's move-vocabulary.ts, imported — not re-declared). No
// timer/socket/server; it is shown by a fired `gate-open` event, not scheduled.

import type { FactoryState } from "../src/types.ts";
import { moveVocabulary } from "../contracts/move-vocabulary.ts";

/** Render the Flow Popup gate card from a state (the same content a headless twin would print). */
export function renderPopup(state: FactoryState): string {
  const gate = state.gate;
  if (!gate || gate.id === 0) return "popup: no gate open";
  const moves = moveVocabulary(gate.id as any);
  return `popup · gate ${gate.id} OPEN — moves [${moves.join(", ")}] — awaiting a human move (or a WAIT)`;
}
