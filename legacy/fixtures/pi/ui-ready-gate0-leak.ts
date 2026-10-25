// kiln/fixtures/pi/ui-ready-gate0-leak.ts — T027, r9. Deliberately WRONG in exactly one way: the Gate-0 question offers the FULL
// `moveVocabulary("gate0")` (which also has `edit-rows`/`add-row`/`drop-row`) instead of `GATE0_ADMISSION_MOVES` — bypassing
// `live-ctx.ts` entirely and calling `askGate` directly with the leaked list, to simulate what check (d) must catch if the real
// guard were ever broken. Used by `validate/ui-ready.ts`'s `--gate0-vocabulary-leak` falsify hook.
import { askGate } from "../../pi/outcome.ts";
import { moveVocabulary } from "../../contracts/move-vocabulary.ts";
import { emit } from "../../pi/output.ts";
import type { PiApi, PiCtx } from "../../pi/port.ts";

export default function (pi: PiApi): void {
  pi.registerCommand("kiln-ui-gate0", {
    description: "MUTANT fixture: the Gate-0 question leaks the full moveVocabulary('gate0'), not just the admission subset",
    handler: async (_args: string, ctx: PiCtx) => {
      await askGate(ctx, { title: "=== Gate 0 — kiln-v1-fixture ===", options: moveVocabulary("gate0") });
      emit(ctx, "UI-GATE0 done");
    },
  });
}
