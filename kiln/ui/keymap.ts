// kiln/ui/keymap.ts — T004 (US1/US2, research §D6 — a low-risk planning spike, NOT an E-entity).
//
// Resolves `ui-layers-deep.md §11#5`: WHICH key raises WHICH layer. Each key raises a DISTINCT
// surface — Layer A (footer) is always-on; Layers B/C are overlays raised by `g`/`M` and are mutually
// exclusive (one overlay up at a time). The exact key/anchor stays a low-risk `implement` tweak; the
// SIZING default (wide full-width overlay, the §5.1 table) is also a pure render choice deferred to
// /speckit.implement. No timer/socket/server (P-IX) — these are only key CONSTANTS, a view choice.

/** §D6: the resolved keymap. Distinct, mutually-exclusive overlay keys. */
export const LAYERC_KEY = "M"; // raise the Roadmap overlay + its Gate-0 face (Layer C, this row)
export const LAYERB_KEY = "g"; // (r1) raise the Flow Popup — Layer B, the per-gate card
export const TOGGLE_KEY = "?"; // toggle the currently-raised overlay off (back to Layer A footer)

/** §D6 sizing default: the wide, full-width §5.1 table. A compact "strip" is a deferred render tweak. */
export const OVERLAY_SIZING = "wide" as const; // "wide" | "strip"

/** All overlay keys are distinct (`M`/`g`/`?` never collide) — a low-risk invariant the implementer may tweak. */
export function keymapIsConsistent(): boolean {
  return new Set([LAYERC_KEY, LAYERB_KEY, TOGGLE_KEY]).size === 3;
}
