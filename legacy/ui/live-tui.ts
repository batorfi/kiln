// kiln/ui/live-tui.ts — T013 (US2), r3 · E4 (the live TUI smoke of Layers A/B/C, research D5/NC3).
//
// r1 rendered A/B headlessly (`renderHud`/`renderPopup` + a print twin); r2 rendered C headlessly
// (`renderOverlay` + the blocking Gate-0 face) — BOTH NC1-deferred the *live* TUI to r3. E4 clears
// that debt: the SAME pure renders (composeds, never re-declared — D8/NC3), plus the LIVE `ctx.ui`
// path that REDRAWS on the walk's FIRED EVENTS only (P-IX — a fired `FactoryEvent`; no timed loop,
// no socket, no server), over ONE shared `FactoryState`, DEGRADING to r2's
// printed twin when the UI is absent. A disabled UI still BLOCKS an open Gate 0 (`F-GATE0-BLOCK`,
// P-V/P-VI) — a missing surface hides the view, never the decision.
//
// The one `ui-layers-deep.md §10`-flagged live surface (`ctx.ui.custom` / `handoff.ts` /
// `ctx.ui.confirm` wiring) is a LOW-RISK `implement` tweak (D5): r3 *smokes* the event-only +
// headless-degrade net over an abstract `LiveUICtx`; the exact key/anchor stays a later polish.
// No cloud (P-VIII), no server (P-IX): nothing here schedules a timer or opens a socket.

import type { FactoryState } from "../src/types.ts";
import { renderHud } from "./hud.ts";
import { renderPopup } from "./popup.ts";
import { renderOverlay, LAYERC_REDRAW_TRIGGERS } from "./overlay.ts";
import { disabledUi } from "./twin.ts";
import { onEvent, blocksAny, type FactoryEvent } from "./factory-state.ts";

// ── the three layers are A PURE read of ONE FactoryState (one source of truth, SC-005) ──

/** The live surface SET: A (HUD footer, r1) + B (per-gate popup, r1) + C (roadmap overlay, r2). */
export interface LiveTuiSurfaces {
   layerA: string;
   layerB: string;
   layerC: string;
}

/** Render the full live surface set from ONE `FactoryState` (a pure, additive read over r1/r2). */
export function renderLiveSurfaces(state: FactoryState): LiveTuiSurfaces {
   return {
    layerA: renderHud(state), // r1 · Layer A
    layerB: renderPopup(state), // r1 · Layer B
    layerC: renderOverlay(state), // r2 · Layer C
     };
}

/** The single flattened overlay a live TUI would show — COMPOSES A+B+C; byte-identical on identical state. */
export function renderLive(state: FactoryState): string {
  const { layerA, layerB, layerC } = renderLiveSurfaces(state);
  return [layerA, layerB, layerC].join("\n");
}

// ── the live `ctx.ui` path: REDRAW on a fired event only (P-IX) ──

/**
 * An abstract pi `ctx.ui` surface (the §10 primitive). The live path draws A/B/C through it; a
 * MISSING UI (`hasUI: false`) is what triggers the headless degrade. It is an *interface* the tests
 * drive — a real harness `ctx.ui` would satisfy it; nothing here schedules a refresh (P-IX).
 */
export interface LiveUICtx {
   hasUI: boolean;
   /** Layer A · the persistent footer (`ctx.ui.setStatus`). */
  setStatus(footer: string): void;
   /** Layers B/C · a raised overlay (`ctx.ui.custom`); `null`/absent collapses back to Layer A. */
  raiseOverlay(layer: "A" | "B" | "C", content?: string | null): void;
}

export interface LiveTuiSurface {
   ctx: LiveUICtx;
   /** Recompute + push A/B/C to the live `ctx.ui` from ONE `FactoryState` (a pure read, SC-005). */
  redraw(state: FactoryState): LiveTuiSurfaces;
   /** The event-driven redraw: apply a fired `FactoryEvent` to the store, then redraw A/B/C. */
  onEvent(state: FactoryState, ev: FactoryEvent): { next: FactoryState; surfaces?: LiveTuiSurfaces };
}

/**
 * Wire the live `ctx.ui` path over r1/r2's renders. It redrews ONLY on a call (a fired event) — no
 * timer, no socket, no server (P-IX); `LAYERC_REDRAW_TRIGGERS` are the ONLY Layer-C redraw triggers,
 * so a poll cannot exist (the no-poll test greps this module clean).
 */
export function attachLiveTui(ctx: LiveUICtx): LiveTuiSurface {
  return {
    ctx,
    redraw(state: FactoryState): LiveTuiSurfaces {
       const s = renderLiveSurfaces(state); // one source of truth
      ctx.setStatus(s.layerA);
       if (state.gate != null && state.gate.id !== 0) ctx.raiseOverlay("B", s.layerB);
        else ctx.raiseOverlay("B", null);
       if ((state as any).gate0Open === true || state.gate0?.status === "pending") ctx.raiseOverlay("C", s.layerC);
        else ctx.raiseOverlay("C", null);
      return s;
        },
    onEvent(state: FactoryState, ev: FactoryEvent): { next: FactoryState; surfaces?: LiveTuiSurfaces } {
       // P-IX: the store mutates ONLY on a fired event (r1's onEvent), then we redraw — a fired-event
       // redraw, NEVER a scheduled refresh. gate0_open / roadmap_row_done are the Layer-C triggers.
      const next = onEvent(state, ev);
      // A redraw is triggered by the event set A/B/C compose on; LAYERC_REDRAW_TRIGGERS name the C ones.
      const layers = LAYERC_REDRAW_TRIGGERS.includes(ev.kind)
       ? renderLiveSurfaces(next)
    : ev.kind === "gate-open" || ev.kind === "gate-resolve"
          ? renderLiveSurfaces(next)
           : undefined;
    return { next, surfaces: layers };
         },
       };
}

// ── the headless degrade (F-GATE0-BLOCK): a missing UI PRINTS the program + a blocking WAIT ──

export interface LiveTuiResult {
   render: string;
   blocks: boolean; // an open Gate 0 (or row-gate) still blocks — a missing UI hides the view, never the decision
   degraded: boolean; // true when the live UI is absent (the print twin ran)
}

/**
 * Run the live TUI when the UI is PRESENT (E4, D5), else DEGRADE to r2's print twin. Either way a
 * `Gate 0`-open / row-gate-open state `blocks` (never auto-advances: P-V/P-VI, `F-GATE0-BLOCK`).
 * A byte-identical captured state yields a byte-identical render (one source of truth, SC-005).
 */
export function liveTuiOrTwin(state: FactoryState, ctx: LiveUICtx): LiveTuiResult {
  if (ctx.hasUI) {
    attachLiveTui(ctx).redraw(state); // the live path: A/B/C pushed to ctx.ui
    return { render: renderLive(state), blocks: blocksAny(state), degraded: false };
     }
   // The UI is abSENT → the SAME content is PRINTED and the gate STILL blocks (r2's disabledUi twin).
  const twin = disabledUi(state);
  return { render: twin.render, blocks: twin.blocks, degraded: true };
}

/**
 * The no-poll assertion surface (P-IX / SC-005): the ONLY redraw triggers are a fired `gate-open` /
 * `gate-resolve` / `gate0_open` / `roadmap_row_done` event. An event-timed redraw loop / a socket /
 * a server elsewhere would make this set a lie — the `kiln/tests/live-tui` grep asserts this module
 * is free of any scheduled refresh.
 */
export const LIVE_REDRAW_TRIGGERS = [
   "gate-open",
   "gate-resolve",
  ...LAYERC_REDRAW_TRIGGERS, // r2's two Layer-C triggers, re-exported (P-IX)
] as const;
