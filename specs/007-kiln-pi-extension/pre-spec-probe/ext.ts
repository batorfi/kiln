// THROWAWAY pre-spec probe (r8 / spec 007). Not part of the KILN toolchain and not scanned or shipped.
// It loads two real KILN modules (`.ts` specifiers, no build step) from inside a real Pi extension, and reports what the
// Pi `ctx` actually offers. r8's own lane runs the spike properly; this only grounds the spec in measured facts.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { makeClock } from "../../../kiln/src/clock.ts";
import { renderHud } from "../../../kiln/ui/hud.ts";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("kiln-probe", {
    description: "spike: report ctx facts, ask a select (timeout 4 s), then try ctx.ui.custom",
    handler: async (_args, ctx) => {
      const facts = {
        mode: ctx.mode, hasUI: ctx.hasUI,
        uiHeadless: typeof (ctx.ui as any).headless, // ui-layers-deep.md §10 lists this as "confirmed"
        uiRaiseOverlay: typeof (ctx.ui as any).raiseOverlay,
        kilnClock: typeof makeClock, kilnHud: typeof renderHud,
        uiKeys: Object.keys(ctx.ui).sort().join(","),
      };
      ctx.ui.notify("FACTS " + JSON.stringify(facts), "info");
      const v = await ctx.ui.select("Gate 3 — approve the spec?", ["approve", "reject", "defer"], { timeout: 4000 });
      ctx.ui.notify("SELECT_RESULT " + JSON.stringify(v ?? null), "info");
      const c = await ctx.ui.custom(() => ({ render: () => ["x"], invalidate() {} }), { overlay: true });
      ctx.ui.notify("CUSTOM_RESULT " + JSON.stringify(c ?? null), "info");
    },
  });
}
