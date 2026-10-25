// kiln/fixtures/pi/ui-ready-no-identity.ts — T027, r9. Deliberately WRONG in exactly one way: `kiln-ui-gate`'s identity is ALWAYS
// resolved `ok:true`, regardless of `KILN_HUMAN` — via `makeLiveUICtx`'s own test-injection hook (`overrides.resolveIdentity`, the
// same mechanism `tests/pi/ui/live-ctx-outcome.test.ts` uses offline). Used by `validate/ui-ready.ts`'s `--no-identity` falsify hook
// to prove check (c) reports `non-answer-approved` when a valid move would otherwise be applied without a real identity.
import { makeLiveUICtx } from "../../pi/ui/live-ctx.ts";
import { emit } from "../../pi/output.ts";
import type { Gate } from "../../src/gate.ts";
import type { PiApi, PiCtx } from "../../pi/port.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function untilSettled(gate: Pick<Gate, "move" | "wait">, timeoutMs = 8000): Promise<void> {
  const end = Date.now() + timeoutMs;
  while (gate.move === undefined && gate.wait === undefined && Date.now() < end) await sleep(20);
}

export default function (pi: PiApi): void {
  pi.registerCommand("kiln-ui-gate", {
    description: "MUTANT fixture: identity is ALWAYS ok:true, regardless of KILN_HUMAN",
    handler: async (_args: string, ctx: PiCtx) => {
      const gate: Gate = { id: 3, open: true };
      const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@mutant-always-ok" }) });
      live.raiseOverlay("B", "popup · spec gate OPEN");
      await untilSettled(gate);
      const outcome = gate.move !== undefined ? `applied:${gate.move}:${gate.decidedBy}` : `waited:${gate.wait?.token ?? "?"}`;
      emit(ctx, `UI-GATE outcome=${outcome}`);
    },
  });
}
