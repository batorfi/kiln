// kiln/tests/pi/ui/overlay-columns.test.ts — T029, r9 · research D8 · the ONE declared r1/r2 behaviour change this row makes.
// renderOverlay's rowLine computes column widths from the row set BEFORE formatting, replacing the current hand-placed literal
// spaces — every row's `[deps: …]` column starts at the SAME character offset, and every row's tail does too, for several fixtures
// with deliberately different `short`-field lengths (including the exact ui-mockups.md fixture). A one-row roadmap still renders.
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderOverlay } from "../../../ui/overlay.ts";
import type { FactoryState, RoadmapRow } from "../../../src/types.ts";

function state(roadmap: RoadmapRow[], current = ""): FactoryState {
  return { resident: null, running: null, queue: [], switches: 0, wallClock: "00:00", roadmap, current, gate0: { status: "approved" }, gate: null };
}

/** Extract the data rows (skip the header/footer lines) from renderOverlay's output. */
function dataRows(output: string): string[] {
  return output.split("\n").filter((l) => /^\s+\S+\s+\(/.test(l));
}

function columnOffset(line: string, marker: string): number {
  const i = line.indexOf(marker);
  assert.notEqual(i, -1, `marker "${marker}" not found in "${line}"`);
  return i;
}

test("the [deps: …] column starts at the SAME offset for every row, across several varying short-field lengths", () => {
  const output = renderOverlay(state([
    { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
    { id: "r7", short: "true live local inference", deps: ["r3"], status: "done", outcome: "@PR#4" },
    { id: "r8", short: "the Pi extension foundation", deps: ["r7"], status: "done", outcome: "@PR#5" },
    { id: "r9", short: "kiln-v1 real UI on Pi", deps: ["r2", "r8"], status: "active", gate: 3 },
    { id: "r10", short: "role agents and model tiers", deps: ["r8"], status: "queued" },
  ], "r9"));
  const rows = dataRows(output);
  assert.equal(rows.length, 5);
  const offsets = rows.map((r) => columnOffset(r, "[deps:"));
  assert.equal(new Set(offsets).size, 1, `[deps: …] column not aligned: offsets=${JSON.stringify(offsets)}\n${output}`);
});

test("the tail column (→/eligible/waits) starts at the SAME offset for every row too", () => {
  const output = renderOverlay(state([
    { id: "r1", short: "a very much longer description than the rest", deps: [], status: "done", outcome: "@PR#1" },
    { id: "r2", short: "short", deps: ["r1"], status: "queued" },
    { id: "r3", short: "medium length one", deps: ["r1", "r2"], status: "aborted" },
  ]));
  const rows = dataRows(output);
  // find where the tail starts: right after the closing "]" of the [deps: …] column, plus its own padding — locate via the
  // known tail markers themselves (→, "eligible", "waits", "aborted"'s own tail is "→ aborted").
  const tailStarts = rows.map((r) => {
    const depsEnd = r.indexOf("]") + 1;
    const rest = r.slice(depsEnd);
    const m = /\S/.exec(rest);
    return depsEnd + (m ? m.index : 0);
  });
  assert.equal(new Set(tailStarts).size, 1, `tail column not aligned: starts=${JSON.stringify(tailStarts)}\n${output}`);
});

test("a ONE-row roadmap (no alignment needed) still renders correctly", () => {
  const output = renderOverlay(state([{ id: "r1", short: "solo row", deps: [], status: "done", outcome: "@PR#1" }]));
  const rows = dataRows(output);
  assert.equal(rows.length, 1);
  assert.match(rows[0], /r1/);
  assert.match(rows[0], /\[deps: —\]/);
  assert.match(rows[0], /→ @PR#1/);
});

test("the exact ui-mockups.md fixture (5 rows) aligns, and the visible content matches (ids, statuses, deps, tails)", () => {
  const output = renderOverlay(state([
    { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
    { id: "r7", short: "true live local inference", deps: ["r3"], status: "done", outcome: "@PR#4" },
    { id: "r8", short: "the Pi extension foundation", deps: ["r7"], status: "done", outcome: "@PR#5" },
    { id: "r9", short: "kiln-v1 real UI on Pi", deps: ["r2", "r8"], status: "active", gate: 3 },
    { id: "r10", short: "role agents and model tiers", deps: ["r8"], status: "queued" },
  ], "r9"));
  assert.match(output, /r1\s+\(done\)\s+core single-lane runtime\s+\[deps: —\]\s+→ @PR#1/);
  assert.match(output, /r9\s+\(active\)\s+kiln-v1 real UI on Pi\s+\[deps: r2,r8\]\s+→ at gate 3 — HERE/);
  assert.match(output, /r10\s+\(queued\)\s+role agents and model tiers\s+\[deps: r8\]\s+eligible/);
});

test("r2's own existing overlay fixture-shape assertions still hold (a regression gate, not re-derived)", () => {
  // mirrors the existing tests/overlay/overlay.test.ts style assertions on content, not just alignment.
  const output = renderOverlay(state([
    { id: "r1", short: "row one", deps: [], status: "queued" },
    { id: "r2", short: "row two", deps: ["r1"], status: "queued" },
  ]));
  assert.match(output, /eligible/); // r1 has no deps -> eligible
  assert.match(output, /waits r1/); // r2 waits on r1
});
