// specs/008-kiln-pi-ui/smoke-harness.ts — a THROWAWAY harness for r9's human terminal smoke test (quickstart.md §5).
//
// NOT part of r9's delivered API surface — kiln/pi/ui/* is imported unmodified, nothing here is exported from kiln/index.ts,
// and this file lives outside kiln/'s own scanned tree entirely. It exists only because kiln/pi/index.ts (r8-owned, canonical)
// never actually calls makeLiveUICtx()/registerKeys() — wiring that for real, permanently, into a running lane is r11's job
// (see pi/README.md). This harness does that wiring temporarily, over a FIXTURE Gate/RoadmapHead, so a human can exercise
// Layers A/B/C and the three re-declared shortcuts today, in a real terminal, without waiting for r11.
//
// CORRECTION (found by the human terminal smoke test): shortcuts must be registered at LOAD time (the top-level factory
// call below), not inside a command handler — a dynamically-registered shortcut never fires, confirmed by a diagnostic
// (kiln/pi/ui/keys.ts's own header comment has the full story). The three real shortcuts are now registered unconditionally
// when this extension loads; no init command is needed for them. `/kiln-smoke-init` remains for pushing the initial footer.
//
// Run with:  KILN_HUMAN=human@<your-name> pi -e specs/008-kiln-pi-ui/smoke-harness.ts
// Then type: /kiln-smoke-init      (pushes the footer; the three shortcuts are already live from the moment Pi loaded)
import { makeLiveUICtx } from "../../kiln/pi/ui/live-ctx.ts";
import { registerKeys } from "../../kiln/pi/ui/keys.ts";
import { presentHud, presentPopup, presentGate0Face } from "../../kiln/pi/ui/present.ts";
import { LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY } from "../../kiln/ui/keymap.ts";
import type { Gate } from "../../kiln/src/gate.ts";
import type { FactoryState, RoadmapHead } from "../../kiln/src/types.ts";

const gate: Gate = { id: 3, open: true };

const head: RoadmapHead = {
  deliverable: "kiln-v1-smoke",
  owner: "human@smoke",
  updated: new Date().toISOString(),
  rows: [
    { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
    { id: "r9", short: "kiln-v1 real UI on Pi", deps: ["r2", "r8"], status: "active", gate: 3 },
  ],
  ordering: ["r1", "r9"],
  chain_unattended: false,
  gate0: { status: "pending" },
  trace: "smoke-harness",
};

/** present.ts's timestamp regex (contract presentation-wrapper.md P1) matches whole-second ISO-8601 only — no milliseconds. */
function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function fixtureState(): FactoryState {
  return {
    resident: null,
    running: null,
    queue: [],
    switches: 3,
    wallClock: nowIso(),
    roadmap: [
      { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
      { id: "r9", short: "kiln-v1 real UI on Pi", deps: ["r2", "r8"], status: "active", gate: 3 },
    ],
    current: "r9",
    gate0: { status: "pending" },
    gate: gate.open ? { id: 3 } : null,
  };
}

export default function (pi: any): void {
  // ── the real shortcuts, registered at LOAD time (the fix) ──
  registerKeys(pi, (ctx) => makeLiveUICtx(ctx, gate, head), {
    layerBContent: () => presentPopup(fixtureState()),
    layerCContent: () => (head.gate0.status === "pending" ? presentGate0Face(head) : "(no plain-table content bound in this harness)"),
  });

  // ── DIAGNOSTIC (kept as a reference control) — a single-modifier shortcut, ALSO registered at load time, confirmed to
  // fire. If the real keys above stop firing again in some future Pi version, re-check this one first.
  let diagLoadTimeCount = 0;
  pi.registerShortcut("ctrl+h", {
    description: "DIAGNOSTIC: single-modifier extension shortcut, registered at LOAD time",
    handler: (ctx: any) => {
      diagLoadTimeCount++;
      ctx.ui.notify(`DIAGNOSTIC (load-time registration): ctrl+h FIRED, count=${diagLoadTimeCount}`, "info");
    },
  });
  pi.registerCommand("kiln-smoke-diag-loadtime-check", {
    description: "DIAGNOSTIC: reports how many times the LOAD-TIME-registered ctrl+h fired",
    handler: async (_args: string, ctx: any) => {
      ctx.ui.notify(`DIAGNOSTIC (load-time registration): ctrl+h fired ${diagLoadTimeCount} time(s)`, "info");
    },
  });

  let footerLive: ReturnType<typeof makeLiveUICtx> | null = null;
  pi.registerCommand("kiln-smoke-init", {
    description: `KILN smoke harness: push the footer (the shortcuts ${LAYERB_KEY}/${LAYERC_KEY}/${TOGGLE_KEY} are already live from load time)`,
    handler: async (_args: string, ctx: any) => {
      footerLive ??= makeLiveUICtx(ctx, gate, head);
      footerLive.setStatus(presentHud(fixtureState()));
      ctx.ui.notify(
        `KILN smoke harness ready — ${LAYERB_KEY} raises the gate popup, ${LAYERC_KEY} raises the Gate-0 face, ${TOGGLE_KEY} dismisses. ` +
          "Re-run /kiln-smoke-status any time to refresh the footer.",
        "info",
      );
    },
  });

  pi.registerCommand("kiln-smoke-status", {
    description: "KILN smoke harness: push the footer again (e.g. after answering a gate)",
    handler: async (_args: string, ctx: any) => {
      footerLive ??= makeLiveUICtx(ctx, gate, head);
      footerLive.setStatus(presentHud(fixtureState()));
    },
  });

  pi.registerCommand("kiln-smoke-check", {
    description: "KILN smoke harness: report the fixture gate's current move/wait state",
    handler: async (_args: string, ctx: any) => {
      ctx.ui.notify(
        gate.move !== undefined
          ? `gate 3: APPLIED move=${gate.move} decidedBy=${gate.decidedBy}`
          : gate.wait !== undefined
            ? `gate 3: WAITING (token=${gate.wait.token})`
            : "gate 3: still open, no answer yet",
        "info",
      );
    },
  });
}
