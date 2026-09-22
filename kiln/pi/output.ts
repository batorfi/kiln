// kiln/pi/output.ts — T028, r8 · contracts/pi-extension.md E4 · research D4, SQ11.
//
// Measured (spike sq07_sq11.py, 2026-09-21): in `print`, `json` AND `rpc`, an extension's `console.log`/`process.stdout.write` lands on
// Pi's STDERR (stdout stays protocol-clean); `ctx.ui.notify` prints NOTHING in `print`/`json`, but IS delivered as an `extension_ui_request`
// in `tui`/`rpc`. So: where a human can be reached via the UI, use it; everywhere else, `console.log` — which real Pi routes to stderr for us —
// is the only channel that reaches anyone at all. Imports only port.ts.
import type { PiCtx } from "./port.ts";

/** Emit ONE line of KILN output, on whichever channel the mode can show it. Imports nothing but port.ts; starts nothing. */
export function emit(ctx: Pick<PiCtx, "mode" | "ui">, text: string): void {
  if (ctx.mode === "tui" || ctx.mode === "rpc") {
    ctx.ui.notify(text, "info");
    return;
  }
  // print, json, or an unknown/absent mode: notify prints nothing there (measured) — console.log is the only channel a human (via stderr) or
  // a script (via 2>&1) can see. Fail-safe: an unrecognised future mode still gets SOMETHING.
  console.log(text);
}
