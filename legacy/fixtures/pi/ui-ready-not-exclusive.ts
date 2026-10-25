// kiln/fixtures/pi/ui-ready-not-exclusive.ts — T027, r9. Deliberately WRONG in exactly one way: Layer B and Layer C each get their
// OWN independent `makeLiveUICtx` instance (no shared `OverlayState`), so raising C never evicts B — simulating what check (f) must
// catch if the mutual-exclusion guard were ever broken. Used by `validate/ui-ready.ts`'s `--overlay-not-exclusive` falsify hook.
import { makeLiveUICtx } from "../../pi/ui/live-ctx.ts";
import { emit } from "../../pi/output.ts";
import type { Gate } from "../../src/gate.ts";
import type { RoadmapHead } from "../../src/types.ts";
import type { PiApi, PiCtx } from "../../pi/port.ts";

const sharedGate: Gate = { id: 3, open: true };
const sharedHead: RoadmapHead = {
  deliverable: "kiln-v1-fixture", owner: "human@ui-ready-fixture", updated: "t", rows: [], ordering: [],
  chain_unattended: false, gate0: { status: "pending" }, trace: "t",
};

export default function (pi: PiApi): void {
  pi.registerCommand("kiln-ui-exclusivity-b", {
    description: "MUTANT fixture: raises Layer B via its OWN independent LiveUICtx (no shared guard)",
    handler: async (_args: string, ctx: PiCtx) => {
      makeLiveUICtx(ctx, sharedGate, sharedHead).raiseOverlay("B", "popup · spec gate OPEN");
      emit(ctx, "UI-EXCLUSIVITY-B raised");
    },
  });
  pi.registerCommand("kiln-ui-exclusivity-c", {
    description: "MUTANT fixture: raises Layer C via its OWN independent LiveUICtx (no shared guard) — never evicts B",
    handler: async (_args: string, ctx: PiCtx) => {
      makeLiveUICtx(ctx, sharedGate, sharedHead).raiseOverlay("C", "=== Gate 0 — kiln-v1-fixture ===");
      emit(ctx, "UI-EXCLUSIVITY-C raised");
    },
  });
  pi.registerCommand("kiln-ui-exclusivity-report", {
    description: "fixture: reports whether the (un-evicted) Layer-B gate silently became a decision",
    handler: async (_args: string, ctx: PiCtx) => {
      await new Promise((r) => setTimeout(r, 50));
      emit(ctx, `UI-EXCLUSIVITY-REPORT gateMove=${sharedGate.move ?? "none"} gateWait=${sharedGate.wait ? "yes" : "no"}`);
    },
  });
}
