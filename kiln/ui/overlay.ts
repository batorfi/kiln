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

/**
 * Column widths for the row set (research D8 — the one declared r1/r2 behaviour change this row makes): computed from the
 * ACTUAL rows before formatting, replacing the old hand-placed literal spaces, so every row's `[deps: …]` column and every
 * row's tail start at the SAME character offset regardless of how long any one row's `short`/`status`/`deps` field is.
 */
interface ColumnWidths {
  id: number;
  status: number;
  short: number;
  deps: number;
}

function computeColumnWidths(rows: readonly FactoryState["roadmap"][number][]): ColumnWidths {
  let id = 0;
  let status = 0;
  let short = 0;
  let deps = 0;
  for (const row of rows) {
    id = Math.max(id, String(row.id).length);
    status = Math.max(status, `(${row.status})`.length);
    short = Math.max(short, row.short.length);
    deps = Math.max(deps, `[deps: ${row.deps.length ? row.deps.join(",") : "—"}]`.length);
  }
  return { id, status, short, deps };
}

/** The §5.1 per-row line: `id (status) short [deps: …] → tail` where the tail is outcome/HERE/waits — column-aligned (D8). */
function rowLine(row: FactoryState["roadmap"][number], current: string, done: Set<string>, widths: ColumnWidths): string {
  const deps = row.deps.length ? row.deps.join(",") : "—";
  let tail: string;
  if (row.id === current && row.status === "active") {
   tail = `→ at gate ${row.gate ?? "?"} — HERE`; // the ONE in-flight row (SC-001)
   } else if (row.status === "done") {
   tail = row.outcome ? `→ ${row.outcome}` : "→ done"; // a closed row shows its @PR#N
   } else if (row.status === "aborted") {
   tail = "→ aborted";
    } else {
   const openDeps = row.deps.filter((d) => !done.has(d)); // only NOT-yet-closed deps actually block

   tail = openDeps.length ? `waits ${openDeps.join(",")}` : "eligible"; // closed deps do not "wait"
     }
  const idCol = String(row.id).padEnd(widths.id);
  const statusCol = `(${row.status})`.padEnd(widths.status);
  const shortCol = row.short.padEnd(widths.short);
  const depsCol = `[deps: ${deps}]`.padEnd(widths.deps);
  return `   ${idCol} ${statusCol} ${shortCol} ${depsCol} ${tail}`;
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
 // SC-004: the already-closed rows (done/aborted are terminal); a queue row "waits" only its
 // deps that are NOT yet closed, so an all-deps-closed queue row reads "eligible" (accurate zoom-out).
const done = new Set(rows.filter((r) => r.status === "done" || r.status === "aborted").map((r) => String(r.id)));
if (rows.length === 0) {
    lines.push("   (no program rows admitted — Gate 0 is the human gate that admits them, P-VI)");
    } else {
    lines.push("   order: " + rows.map((r) => String(r.id)).join(" → "));
    const widths = computeColumnWidths(rows); // D8: computed from THIS row set, not a fixed guess
    for (const row of rows) lines.push(rowLine(row, state.current, done, widths));
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
