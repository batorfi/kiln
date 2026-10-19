// kiln/fixtures/pi/ui-ready-ext.ts — T026, r9 · contract `ui-ready.md` U1/U2. The extension `validate/ui-ready.ts` drives over RPC.
//
// A FIXTURE extension (mirrors r8's `fixtures/pi/*.ts` pattern) — never the repository's own `specs/ROADMAP.md`, per U1: a fixture
// `Gate`/`RoadmapHead` is used throughout. Registers one command per `ui-ready.md` U2 check, each reporting its outcome via
// `ctx.ui.notify` (r8's `emit()`), so the RPC harness can observe it the same way `pi-ready.ts`'s own probe does. No log write, no
// real roadmap admitted (P-VI) — this fixture only proves the WIRING.
import { makeLiveUICtx } from "../../pi/ui/live-ctx.ts";
import { presentHud } from "../../pi/ui/present.ts";
import { emit } from "../../pi/output.ts";
import type { Gate } from "../../src/gate.ts";
import type { FactoryState, RoadmapHead } from "../../src/types.ts";
import type { LiveUICtx } from "../../ui/live-tui.ts";
import type { PiApi, PiCtx } from "../../pi/port.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fixtureState(): FactoryState {
  return {
    resident: null, running: null, queue: [], switches: 2, wallClock: "2026-09-24T18:31:12Z",
    roadmap: [], current: "r9", gate0: { status: "approved" }, gate: { id: 3 },
  };
}

function pendingHead(): RoadmapHead {
  return {
    deliverable: "kiln-v1-fixture", owner: "human@ui-ready-fixture", updated: "2026-09-22T00:00:00Z",
    rows: [], ordering: [], chain_unattended: false, gate0: { status: "pending" }, trace: "t",
  };
}

/** Poll a Gate until it settles (a move applied, or a Wait recorded) — mirrors the offline tests' own pattern. */
async function untilSettled(gate: Pick<Gate, "move" | "wait">, timeoutMs = 8000): Promise<void> {
  const end = Date.now() + timeoutMs;
  while (gate.move === undefined && gate.wait === undefined && Date.now() < end) await sleep(20);
}

export default function (pi: PiApi): void {
  // ── check (a): Layer A's setStatus carries present.ts's output ──
  pi.registerCommand("kiln-ui-status", {
    description: "fixture: pushes presentHud's output through a real LiveUICtx.setStatus",
    handler: async (_args: string, ctx: PiCtx) => {
      const live = makeLiveUICtx(ctx);
      live.setStatus(presentHud(fixtureState()));
    },
  });

  // ── checks (b), (c), (e), (g): a per-gate (id=3) Layer B question ──
  pi.registerCommand("kiln-ui-gate", {
    description: "fixture: raises Layer B for a fixture gate id=3",
    handler: async (_args: string, ctx: PiCtx) => {
      const gate: Gate = { id: 3, open: true };
      const live = makeLiveUICtx(ctx, gate);
      live.raiseOverlay("B", "popup · spec gate OPEN");
      await untilSettled(gate);
      const outcome = gate.move !== undefined ? `applied:${gate.move}:${gate.decidedBy}` : `waited:${gate.wait?.token ?? "?"}`;
      emit(ctx, `UI-GATE outcome=${outcome}`);
    },
  });

  // ── check (d): the Gate-0 question offers ONLY GATE0_ADMISSION_MOVES ──
  pi.registerCommand("kiln-ui-gate0", {
    description: "fixture: raises Layer C's Gate-0 face for a fixture pending head",
    handler: async (_args: string, ctx: PiCtx) => {
      const head = pendingHead();
      const gate0Marker: { move?: string; wait?: unknown } = {};
      const live = makeLiveUICtx(ctx, undefined, head);
      live.raiseOverlay("C", "=== Gate 0 — kiln-v1-fixture ===");
      // no per-gate Gate object is exposed here to poll — settle by a short, generous wait instead (RPC-only, hermetic).
      await sleep(300);
      void gate0Marker;
      emit(ctx, "UI-GATE0 done");
    },
  });

  // ── check (f): overlay exclusivity — two commands sharing one `live`/`gate`, driven from the harness in sequence ──
  let sharedLive: LiveUICtx | null = null;
  const sharedGate: Gate = { id: 3, open: true };
  const sharedHead: RoadmapHead = pendingHead();
  pi.registerCommand("kiln-ui-exclusivity-b", {
    description: "fixture: raises Layer B without waiting for it to settle",
    handler: async (_args: string, ctx: PiCtx) => {
      sharedLive ??= makeLiveUICtx(ctx, sharedGate, sharedHead);
      sharedLive.raiseOverlay("B", "popup · spec gate OPEN");
      emit(ctx, "UI-EXCLUSIVITY-B raised");
    },
  });
  pi.registerCommand("kiln-ui-exclusivity-c", {
    description: "fixture: raises Layer C without waiting for it to settle",
    handler: async (_args: string, ctx: PiCtx) => {
      sharedLive ??= makeLiveUICtx(ctx, sharedGate, sharedHead);
      sharedLive.raiseOverlay("C", "=== Gate 0 — kiln-v1-fixture ===");
      emit(ctx, "UI-EXCLUSIVITY-C raised");
    },
  });
  pi.registerCommand("kiln-ui-exclusivity-report", {
    description: "fixture: reports whether the evicted Layer-B gate ever silently became a decision",
    handler: async (_args: string, ctx: PiCtx) => {
      await sleep(50);
      emit(ctx, `UI-EXCLUSIVITY-REPORT gateMove=${sharedGate.move ?? "none"} gateWait=${sharedGate.wait ? "yes" : "no"}`);
    },
  });

  // ── check (c): the SAME per-gate command, run with KILN_HUMAN unset by the harness's own env control ──
  // (no separate command needed — kiln-ui-gate's outcome line already distinguishes applied vs waited)
}
