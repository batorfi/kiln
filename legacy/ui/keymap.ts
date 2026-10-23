// kiln/ui/keymap.ts — T004 (US1/US2, research §D6 — a low-risk planning spike, NOT an E-entity).
//
// Resolves `ui-layers-deep.md §11#5`: WHICH key raises WHICH layer. Each key raises a DISTINCT
// surface — Layer A (footer) is always-on; Layers B/C are overlays and are mutually exclusive
// (one overlay up at a time). No timer/socket/server (P-IX) — these are only key CONSTANTS, a view choice.

// r9 (008-kiln-pi-ui), FR-007/research D10: real Pi `modifier+key` shortcut strings (docs/keybindings.md's Key Format), checked
// against Pi's COMPLETE documented default-binding list for zero conflicts (baseline.md T002; `ctrl+alt+]` is the only
// `ctrl+alt` default, a different key). The old bare-letter values (`M`/`g`/`?`) are corrected, not kept alongside a second set.
//
// WHAT THE HUMAN SMOKE TEST ACTUALLY FOUND (research D10 has the full account): five different key choices in a row "never
// fired", and each got a plausible-sounding encoding theory. The real cause was none of them — the smoke harness registered
// the shortcuts INSIDE a command handler, and Pi only honours `registerShortcut` calls made synchronously at extension LOAD
// time (see `pi/ui/keys.ts`). Once registered at load time, `ctrl+alt+r` and `ctrl+alt+m` fired in the human's terminal
// (cmux) on the first try; `ctrl+alt+t` is registered the same way and not yet confirmed by a human. The earlier encoding
// theories (Ctrl+Shift collapsing to Ctrl, function-key modifier loss, …) were never actually tested and are NOT claims this
// file makes. One of those observations is independently real: bare `alt+<letter>` types a composed character (`⌥g` → `©`)
// in macOS terminals regardless of registration, so `ctrl+alt+` was kept over bare `alt+`.
/** §D6/research D10: the resolved keymap. Distinct, mutually-exclusive overlay keys. */
export const LAYERC_KEY = "ctrl+alt+m"; // raise the Roadmap overlay + its Gate-0 face (Layer C) — fired in a real terminal
export const LAYERB_KEY = "ctrl+alt+r"; // raise the Flow Popup — Layer B, the per-gate card — fired in a real terminal
export const TOGGLE_KEY = "ctrl+alt+t"; // toggle the currently-raised overlay off (back to Layer A footer) — not yet human-confirmed

/** §D6 sizing default: the wide, full-width §5.1 table. A compact "strip" is a deferred render tweak. */
export const OVERLAY_SIZING = "wide" as const; // "wide" | "strip"

/** All overlay keys are distinct — a low-risk invariant the implementer may tweak. */
export function keymapIsConsistent(): boolean {
  return new Set([LAYERC_KEY, LAYERB_KEY, TOGGLE_KEY]).size === 3;
}
