// kiln/ui/twin.ts — T026 (US5): the headless print twin (E5, P-V/IX).
//
// When a surface is absent the SAME content the HUD/Popup draw is PRINTED — and a gate STILL blocks
// (a missing Layer A/B hides the view, never the decision). `printHeadless` returns the identical
// string the two surfaces would render from one FactoryState (one source of truth, SC-005). There is
// NO server: `print` is a pure string build, a `console.log` at most at the call site.

import type { FactoryState } from "../src/types.ts";
import { renderHud } from "./hud.ts";
import { renderPopup } from "./popup.ts";
import { blocksOn } from "./factory-state.ts";

/** The printed twin of the HUD + Popup for a state — what a missing surface would have shown. */
export function printHeadless(state: FactoryState): string {
  return [renderHud(state), renderPopup(state)].join("\n");
}

/**
 * A disabled UI PRINTS the same content and still blocks. `render` is the printed twin; `blocks`
 * reports the open gate so a missing surface can never advance it (P-V / P-IX, the watch's twin of
 * the gate's headless contract).
 */
export function disabledUi(state: FactoryState): { render: string; blocks: boolean } {
   return { render: printHeadless(state), blocks: blocksOn(state) };
}
