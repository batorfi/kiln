// kiln/pi/status.ts — T029, r8 · FR-005 · contracts/pi-extension.md E3 · data-model E5.
//
// READ-ONLY: reads specs/ROADMAP.md under ctx.cwd, parses it with r2's OWN extractHead (never a second parser), and builds the idle
// FactoryState the way a lane that has never started would look. Never throws — a missing or malformed roadmap is a named answer.
// Reports the TRUTH parsed from disk, not a canned string (contract pi-ready.md check e depends on this).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { extractHead } from "../validate/roadmap.ts";
import { nextEligibleRow } from "../ui/factory-state.ts";
import { renderHud } from "../ui/hud.ts";
import type { FactoryState, RoadmapRow } from "../src/types.ts";

export interface StatusReport {
  roadmapFound: boolean;
  rows: { total: number };
  nextEligible: string | null;
  lane: "none";
  state: FactoryState;
  line: string;
}

function idleState(rows: RoadmapRow[], gate0Status: string): FactoryState {
  return {
    resident: null,
    running: null,
    queue: [],
    switches: 0,
    wallClock: new Date(0).toISOString(),
    roadmap: rows,
    current: "",
    gate0: { status: gate0Status },
    gate: null,
  };
}

function named(cwd: string, message: string): StatusReport {
  const state = idleState([], "pending");
  return { roadmapFound: false, rows: { total: 0 }, nextEligible: null, lane: "none", state, line: `KILN status — ${message}` };
}

/** Build the status report by reading `specs/ROADMAP.md` under `cwd`. Never throws. */
export function buildStatus(cwd: string): StatusReport {
  const path = join(cwd, "specs", "ROADMAP.md");
  if (!existsSync(path)) return named(cwd, `no roadmap found in ${cwd}`);

  let md: string;
  try {
    md = readFileSync(path, "utf8");
  } catch (e) {
    return named(cwd, `could not read the roadmap: ${(e as Error).message}`);
  }

  let head: { rows: RoadmapRow[]; gate0?: { status?: string } };
  try {
    head = extractHead(md) as typeof head;
  } catch (e) {
    return named(cwd, `malformed roadmap: ${(e as Error).message}`);
  }

  const rows = head.rows ?? [];
  const state = idleState(rows, head.gate0?.status ?? "pending");
  const nextEligible = nextEligibleRow(rows);
  const line = `KILN status — lane: none · ${rows.length} roadmap row(s) · gate0: ${state.gate0.status} · ` + `${renderHud(state)}` + (nextEligible ? ` · next eligible: ${nextEligible}` : " · no eligible row");
  return { roadmapFound: true, rows: { total: rows.length }, nextEligible, lane: "none", state, line };
}
