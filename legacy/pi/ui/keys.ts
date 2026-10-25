// kiln/pi/ui/keys.ts — T025 (US4), r9 · FR-007 · research D10.
//
// Registers the three re-declared shortcuts (`kiln/ui/keymap.ts`) against a Pi extension API, dispatching to a real `LiveUICtx`'s
// raise/dismiss calls. Deliberately NOT wired into `kiln/pi/index.ts` by this row — that file is r8-owned and canonical
// (untouched, per tasks.md's list); `pi/README.md`'s own table names `kiln/pi/commands/` (r11) as where a real command/shortcut
// registration actually happens. This module is the complete, tested unit r11 will call.
//
// `registerShortcut`'s real shape (measured: Pi's bundled `preset.ts`/`plan-mode/index.ts` examples) is
// `registerShortcut(key, { description?, handler: (ctx) => void | Promise<void> })` — an OPTIONS OBJECT as the second argument,
// not a bare callback (a code-review finding, T038: `ShortcutApi`'s first draft modelled the wrong shape, and its own test's
// fake `pi` mirrored that same wrong shape instead of catching it — the identical class of gap `setStatus`'s bug was).
//
// CORRECTION (found by the human terminal smoke test, after FIVE keymap re-picks that all turned out to be a red herring):
// `registerShortcut` calls made DYNAMICALLY (from inside a command handler, after the extension has already loaded) never
// actually take effect in the measured Pi version — registration reports no error either way, but only a shortcut registered
// SYNCHRONOUSLY at extension LOAD time (the top-level factory call) ever fires. `registerKeys` therefore no longer takes a
// pre-built `LiveUICtx` (which would force the caller to construct it inside a handler, since that is the only place a real
// `ctx` exists) — it takes a FACTORY, and builds the `LiveUICtx` lazily, on the FIRST shortcut press, memoized thereafter so
// all three shortcuts share the SAME instance (required for L5's mutual-exclusion state to persist across presses).
import { LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY } from "../../ui/keymap.ts";
import type { LiveUICtx } from "../../ui/live-tui.ts";
import type { PiCtx } from "../port.ts";

/** The minimal shortcut-registration surface this module needs — kept LOCAL, never added to `port.ts`'s canonical `PiApi`. */
export interface ShortcutApi {
  registerShortcut(key: string, options: { description?: string; handler: (ctx: PiCtx) => void | Promise<void> }): void;
}

export interface RegisterKeysOptions {
  /** What each raise call shows — the CALLER's job to have already applied `present.ts` (mirrors `setStatus`'s own contract). */
  layerBContent: () => string;
  layerCContent: () => string;
}

/**
 * Register Layer B's raise key, Layer C's raise key, and the dismiss-all toggle against a real Pi shortcut API. Call this at
 * extension LOAD time (the top-level factory function), not inside a command handler — dynamic registration does not fire.
 * `makeLive(ctx)` is called ONCE, lazily, on whichever shortcut fires first; the resulting `LiveUICtx` is reused for all three,
 * so `OverlayState`'s mutual-exclusion tracking persists across presses instead of resetting on every single one.
 */
export function registerKeys(pi: ShortcutApi, makeLive: (ctx: PiCtx) => LiveUICtx, opts: RegisterKeysOptions): void {
  let live: LiveUICtx | null = null;
  const getLive = (ctx: PiCtx): LiveUICtx => {
    live ??= makeLive(ctx);
    return live;
  };

  pi.registerShortcut(LAYERB_KEY, {
    description: "KILN: raise the gate popup (Layer B)",
    handler: (ctx: PiCtx) => getLive(ctx).raiseOverlay("B", opts.layerBContent()),
  });
  pi.registerShortcut(LAYERC_KEY, {
    description: "KILN: raise the roadmap overlay / Gate-0 face (Layer C)",
    handler: (ctx: PiCtx) => getLive(ctx).raiseOverlay("C", opts.layerCContent()),
  });
  pi.registerShortcut(TOGGLE_KEY, {
    description: "KILN: dismiss the open overlay (back to Layer A)",
    handler: (ctx: PiCtx) => {
      const l = getLive(ctx);
      l.raiseOverlay("B", null);
      l.raiseOverlay("C", null);
    },
  });
}
