// kiln/ui/overlay.ts — T007 (US1): Layer C — the Roadmap overlay (E1, P-IX) · `F-OVERLAY`.
//
// The program-level ZOOM-OUT (`ui-layers-deep.md §5.1`): a PURE render of the ONE shared
// `FactoryState` over its `roadmap / current / gate0 / gate`. It is one surface ABOVE Layers A/B that
// COMPOSES with them (a fired event redraws all three — FR-002); it never replaces or hides them. It
// lists every row as `id / status / short / deps / lane-gate`, highlights the in-flight `current`
// row "at gate N — HERE", marks a blocked row `waits <dep>`, and shows the `gate0` head
// (pending / approved{rows, decided_by, at}) at the top. A captured identical state yields a BYTE-
// IDENTICAL overlay (one source of truth, SC-005). No timer/socket/server (P-IX): it is re-invoked
// only on a fired event (`gate0_open` / `roadmap_row_done`), never scheduled.
//
// r2 renders what a HUMAN decided; it never admits a program (P-VI / FR-014 / SC-007) — the `gate0`
// head it draws is the human record in specs/ROADMAP.md.

import type { FactoryState } from "../src/types.ts";
import type { LayerCState } from "./factory-state.ts";

/** The §5.1 per-row line: `id (status) short [deps: …] → tail` where the tail is outcome/HERE/waits. */
function rowLine(row: FactoryState["roadmap"][number], current: string): string {
  const deps = row.deps.length ? row.deps.join(",") : "—";
  let tail: string;
  if (row.id === current && row.status === "active") {
   tail = `→ at gate ${row.gate ?? "?"} — HERE`; // the ONE in-flight row (SC-001)
   } else if (row.status === "done") {
   tail = row.outcome ? `→ ${row.outcome}` : "→ done"; // a closed row shows its @PR#N
   } else if (row.status === "aborted") {
   tail = "→ aborted";
    } else {
   tail = row.deps.length ? `waits ${deps}` : "eligible"; // a blocked row shows what it waits on
     }
  return `   ${String(row.id).padEnd(4)} (${row.status}) ${row.short}      [deps: ${deps}]   ${tail}`;
}

/** Render Layer C — the program's roadmap — from the one shared `FactoryState` (a pure, additive read). */
export function renderOverlay(state: FactoryState): string {
  const s = state as LayerCState;
  const lines: string[] = [];

   // ── the gate0 head at the top (pending / approved{rows, decided_by, at}) ──
  const g0 = s.gate0 as unknown as Record<string, unknown> | undefined;
  const g0Status = g0?.status;
  if (!g0 || g0Status === undefined || g0Status === "pending") {
    lines.push("=== Roadmap · Layer C — Gate 0 PENDING (awaiting the human program admission) ===");
    lines.push("   gate0 · pending — awaiting a human admission (P-VI)");
    } else {
    lines.push(`=== Roadmap · Layer C — Gate 0 ${String(g0Status).toUpperCase()}${g0.rows ? " · " + String(g0.rows) : ""} ===`);
    lines.push(
        `   gate0 · ${String(g0Status)}${g0.decided_by ? " · decided_by " + String(g0.decided_by) : ""}${
        g0.at ? " · at " + String(g0.at) : ""
        }${s.gate0Open ? " · REOPENED at the inter-row seam" : ""}`,
      );
    }

  const rows = state.roadmap ?? [];
  if (rows.length === 0) {
    lines.push("   (no program rows admitted — Gate 0 is the human gate that admits them, P-VI)");
    } else {
    lines.push("   order: " + rows.map((r) => String(r.id)).join(" → "));
    for (const row of rows) lines.push(rowLine(row, state.current));
    }

   // ── the program-level footer: a distilled read of r1's cost (NOT re-computed), composes with A/B ──
  lines.push(
      `rail=${state.gate ? "gate" + state.gate.id : "—"} lane=${state.current || "idle"} switches=${state.switches} clock=${state.wallClock || "00:00"} · composes with Layer A (footer) + B (popup)`,
    );
  return lines.join("\n");
}

/**
 * (SC-005 / P-IX, testable half) the no-poll assertion: Layer C redraws ONLY on a fired event. The
 * two redraw triggers are the only Layer-C events, so a poll cannot exist.
 */
export const LAYERC_REDRAW_TRIGGERS = ["gate0_open", "roadmap_row_done"] as const;
