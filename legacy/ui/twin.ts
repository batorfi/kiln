// kiln/ui/twin.ts — T026 (US5) + T014 (US3): the headless print twin (E4, P-V/IX) · r2-extended.
//
// When a surface is absent the SAME content the surfaces draw is PRINTED — and a gate STILL blocks
// (a missing Layer A/B/C hides the view, never the decision). r1's twin printed the HUD + Popup; r2
// extends it so the print ALSO carries the Layer-C roadmap table (one source of truth, the overlay is
// not a second store), and Gate 0 specifically PRINTS the program and `WAIT`s rather than auto-
// advancing (P-V/P-VI, F-GATE0-BLOCK). `disabledUi(...).blocks` reports an open row-gate OR an open
// Gate 0. No server (P-IX): `print` is a pure string build; a `console.log` at most at the call site.

import type { FactoryState } from "../src/types.ts";
import { renderHud } from "./hud.ts";
import { renderPopup } from "./popup.ts";
import { renderOverlay } from "./overlay.ts"; // r2 additive: the Layer-C roadmap table
import { blocksAny } from "./factory-state.ts"; // r2 additive: a row-gate OR an open Gate 0

/**
 * The printed twin of Layer A (HUD) + B (Popup) + C (Roadmap overlay) for a state — what a missing
 * surface set would have shown. It is the identical overlay a present Layer C would render from the
 * one FactoryState (one source of truth, SC-005).
 */
export function printHeadless(state: FactoryState): string {
  return [renderHud(state), renderPopup(state), renderOverlay(state)].join("\n");
}

/**
 * A disabled UI PRINTS the same content and still blocks. `render` is the printed twin; `blocks`
 * reports an open gate so a missing surface can never advance it — including Gate 0, the one gate
 * P-V/P-VI will not silence (a missing Layer C never admits a program headless).
 */
export function disabledUi(state: FactoryState): { render: string; blocks: boolean } {
  return { render: printHeadless(state), blocks: blocksAny(state) };
}
