// kiln/pi/index.ts — T031, r8 · FR-003, FR-004 · contracts/pi-extension.md E1, E6.
//
// The KILN Pi extension entry. Registers TWO read-only commands and NOTHING else: no event handlers, no tools, no shortcuts, no flags, no
// providers, no module-level mutable state (measured D12: a factory can be re-run by Pi across a session change, and module state SURVIVES
// that re-run — so keeping any here would drift). Safe under `/reload`: `makeKilnExtension()` is a pure factory; two calls are independent.
//
// Loaded by `pi -e kiln/pi/index.ts` (development) or via the package manifest in kiln/package.json (NC2 = A + B) — see kiln/pi/README.md.
import type { Capability, Outcome, PiApi, PiCtx } from "./port.ts";
import { buildStatus } from "./status.ts";
import { runSelftest } from "./selftest.ts";
import { emit } from "./output.ts";

export interface KilnExtensionOverrides {
  /** Replace the seam's `interpret` for `kiln-selftest` only — used ONLY by PiReady's mutant fixtures (contract pi-ready.md, `--approve-non-answer`). */
  interpret?: (raw: unknown, options: readonly string[], capability: Pick<Capability, "canAsk">) => Outcome;
}

/** The default export is `makeKilnExtension()` — see below. `overrides` is for test fixtures only; nothing in normal operation supplies it. */
export function makeKilnExtension(overrides: KilnExtensionOverrides = {}) {
  return function kilnExtension(pi: PiApi): void {
    pi.registerCommand("kiln-status", {
      description: "Show the current KILN factory state (read-only; no lane, no gate, no log write)",
      handler: async (_args: string, ctx: PiCtx) => {
        const report = buildStatus(ctx.cwd);
        emit(ctx, report.line);
      },
    });

    pi.registerCommand("kiln-selftest", {
      description: "Exercise the Pi seam: draws one overlay (if possible), asks one gate-shaped question, reports the outcome",
      handler: async (args: string, ctx: PiCtx) => {
        const line = overrides.interpret ? await runSelftest(ctx, args, overrides.interpret) : await runSelftest(ctx, args);
        emit(ctx, line);
      },
    });
  };
}

export default makeKilnExtension();
