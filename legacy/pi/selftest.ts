// kiln/pi/selftest.ts — T030, r8 · contracts/pi-extension.md E3 · research D7.
//
// READ-ONLY, interactive probe: draws ONE overlay first (only when the capability can draw), then asks ONE gate-shaped question through the
// seam. Writes no log, applies no move, decides nothing (P-I, P-VII). The `timeout` argument is a labelled SHAPE-TEST of Pi's OWN dialog
// timeout behaviour — it is NOT a gate and does not go through `askGate` (which never accepts one, FR-008).
import type { GateQuestion, Outcome, PiCtx, Capability } from "./port.ts";
import { detectCapability } from "./port.ts";
import { askGate, interpret as realInterpret } from "./outcome.ts";

const QUESTION: GateQuestion = { title: "Gate?", options: ["approve", "reject"] };

/**
 * `interpretFn` is injectable so PiReady's mutant fixtures (contract pi-ready.md `--approve-non-answer`) can exercise a BROKEN interpreter
 * end-to-end through real Pi, without ever mutating the real `outcome.ts` module (an ES module namespace object is not writable).
 */
export async function runSelftest(
  ctx: PiCtx,
  args: string,
  interpretFn: (raw: unknown, options: readonly string[], capability: Pick<Capability, "canAsk">) => Outcome = realInterpret,
): Promise<string> {
  const capability = detectCapability(ctx);

  if (capability.canDraw) {
    // FOUND BY THE FR-016 HUMAN SMOKE TEST (2026-09-22): this factory used to return only `{ render, invalidate }`, with no `handleInput`
    // and no call to the `done` callback Pi passes as its 4th factory argument — so Enter/Esc did nothing at all, and the overlay could
    // never close (the promise below never resolved). Pi's `custom()` gives the COMPONENT keyboard focus (`ExtensionContext.custom` docs);
    // it is the component's own job to detect a key and call `done`, the same way every real Pi component (e.g. the bundled examples)
    // does. Raw terminal input: Enter arrives as CR (`\r`); Escape arrives alone as ESC (`\x1b`), not followed by more bytes in the same
    // chunk (an arrow key's `\x1b[A` etc. would fail this exact-match, so a lone Esc is unambiguous here).
    await ctx.ui.custom((...args: unknown[]) => {
      const done = args[3] as (result: undefined) => void;
      return {
        render: () => ["KILN self-test overlay — close with Enter/Esc"],
        invalidate() {},
        handleInput(data: string) {
          if (data === "\r" || data === "\n" || data === "\x1b") done(undefined);
        },
      };
    }, { overlay: true });
  }

  let raw: unknown;
  if (capability.canAsk) {
    if (args.trim() === "timeout") {
      // SHAPE-TEST: observes Pi's OWN timeout behaviour on every run where a human can be asked. Never used by a real gate (askGate never
      // accepts a timeout — FR-008); this is the one labelled exception research D7 calls for.
      raw = await ctx.ui.select(QUESTION.title, [...QUESTION.options], { timeout: 4000 }); // SHAPE-TEST
    } else {
      raw = await askGate(ctx, QUESTION);
    }
  }

  const outcome = interpretFn(raw, QUESTION.options, capability);
  const outcomeText = outcome.kind === "answered" ? `answered:${outcome.option}` : `no-answer:${outcome.reason}`;
  return `SELFTEST mode=${capability.mode} canAsk=${capability.canAsk} canDraw=${capability.canDraw} outcome=${outcomeText}`;
}
