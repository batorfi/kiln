// kiln/fixtures/pi/wrong-status.ts — T033, r8. Deliberately WRONG in exactly one way: kiln-status reports a CANNED row count instead of the
// truth parsed from specs/ROADMAP.md. Used by PiReady's `--wrong-status` falsify hook to prove `round-trip-mismatch` is reported (check e).
// kiln-selftest delegates to the REAL seam (via the real extension) so check (f), which always runs after (e), sees normal behaviour rather
// than a fixture that answers nothing — a no-op handler there made check (f) hang for many seconds waiting on dialogs that never fire.
import { makeKilnExtension } from "../../pi/index.ts";

export default function (pi: any): void {
  pi.registerCommand("kiln-status", {
    description: "fixture: reports a canned, wrong status",
    handler: async (_args: string, ctx: any) => {
      const text = "KILN status — lane: none · 999 roadmap row(s) · gate0: pending · canned, not parsed from disk";
      if (ctx.mode === "tui" || ctx.mode === "rpc") ctx.ui.notify(text, "info");
      else console.log(text);
    },
  });
  const filtered = {
    registerCommand: (name: string, options: unknown) => {
      if (name === "kiln-status") return; // already registered above with the wrong behaviour
      pi.registerCommand(name, options);
    },
  };
  makeKilnExtension()(filtered as any); // registers the REAL kiln-selftest, unmodified
}
