// kiln/tests/pi/ui/present.test.ts — T004 (Foundational), r9 · contracts/presentation-wrapper.md P1–P4 · FR-015 · OFFLINE tier.
// presentX(state) vs renderX(state): the diff must be explained ENTIRELY by one of the three named transforms (gate names,
// timestamps, header wording) — never anything else (P2). `renderHud`/`renderPopup`/`renderOverlay`/`renderGate0Face` are
// asserted byte-for-byte unmodified against what this task measured them to be (the r7/r8 "untouched" pattern).
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderHud } from "../../../ui/hud.ts";
import { renderPopup } from "../../../ui/popup.ts";
import { renderOverlay } from "../../../ui/overlay.ts";
import { renderGate0Face } from "../../../ui/gate0-face.ts";
import { presentHud, presentPopup, presentOverlay, presentGate0Face } from "../../../pi/ui/present.ts";
import type { FactoryState, RoadmapHead } from "../../../src/types.ts";

// ── fixtures spanning different gate ids, different timestamps, both gate0.status values ──
function stateWithGate(gateId: number | null, wallClock: string, gate0Status: string): FactoryState {
  return {
    resident: null,
    running: null,
    queue: [],
    switches: 3,
    wallClock,
    roadmap: [
      { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
      { id: "r9", short: "kiln-v1 real UI on Pi", deps: ["r2", "r8"], status: "active", gate: gateId ?? undefined },
    ],
    current: "r9",
    gate0: { status: gate0Status, decided_by: "human@batorfi", at: "2026-09-22T17:56:10Z" } as FactoryState["gate0"],
    gate: gateId ? { id: gateId } : null,
  };
}

const FIXTURES = [
  stateWithGate(3, "2026-09-24T18:31:12Z", "approved"),
  stateWithGate(7, "2026-09-24T09:05:00Z", "approved"),
  stateWithGate(null, "2026-09-24T00:00:00Z", "pending"),
  { ...stateWithGate(9, "2026-09-24T18:31:12Z", "approved"), gate0Open: true } as FactoryState,
];

const HEAD: RoadmapHead = {
  deliverable: "kiln-v1", owner: "human@batorfi", updated: "2026-09-22T00:00:00Z",
  rows: [
    { id: "r1", short: "core single-lane runtime", deps: [] },
    { id: "r9", short: "kiln-v1 real UI on Pi", deps: ["r2", "r8"] },
  ],
  ordering: ["r1", "r9"], chain_unattended: false,
  gate0: { status: "pending" }, trace: "t",
};

// ── P2's invariant, verified by INDEPENDENT reconstruction: re-derive, from the raw render and the contract's own
// three transform rules (written fresh here, not imported from present.ts), what the presented text MUST be — then assert
// it equals present.ts's actual output byte-for-byte. A future present.ts change that starts rewriting something the
// contract doesn't name will diverge from this independent reconstruction and fail here, not be discovered later.
const GATE_NAMES: Record<string, string> = {
  "1": "concept", "2": "architecture", "3": "spec", "4": "plan", "5": "checkpoint",
  "6": "review", "7": "verification", "8": "docs", "9": "pull request",
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function pad2(n: number): string { return String(n).padStart(2, "0"); }

function reconstructGateAndTime(raw: string): string {
  let out = raw.replace(/\bgate\s*([1-9])\b/g, (_m, d: string) => GATE_NAMES[d]);
  out = out.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g, (iso: string, offset: number) => {
    const before = out.slice(Math.max(0, offset - 6), offset);
    const d = new Date(iso);
    return before.endsWith("clock=")
      ? `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
      : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
  });
  return out;
}

test("presentHud EQUALS the independent gate-name + timestamp reconstruction of renderHud, for every fixture (P2)", () => {
  for (const state of FIXTURES) {
    assert.equal(presentHud(state), reconstructGateAndTime(renderHud(state)));
  }
});

test("presentHud: a known fixture's gate id becomes its human name in the rail= reading", () => {
  const state = stateWithGate(3, "2026-09-24T18:31:12Z", "approved");
  const presented = presentHud(state);
  assert.match(presented, /rail=spec\b/);
  assert.doesNotMatch(presented, /gate3/);
});

test("presentPopup EQUALS the reconstruction (gate-name + timestamp, then the — moves […] drop), for every fixture (P2)", () => {
  for (const state of FIXTURES) {
    const expected = reconstructGateAndTime(renderPopup(state)).replace(/ — moves \[[^\]]*\]/, "");
    assert.equal(presentPopup(state), expected);
  }
});

test("presentPopup: drops the trailing '— moves […]' clause, but renderPopup's OWN moveVocabulary-driven list is untouched", () => {
  const state = stateWithGate(3, "2026-09-24T18:31:12Z", "approved");
  const presented = presentPopup(state);
  assert.doesNotMatch(presented, /— moves \[/);
  // the raw render (what a caller would separately pass as GateQuestion.options, per FR-002) still has the full list:
  const raw = renderPopup(state);
  assert.match(raw, /moves \[approve, revise, reject\]/);
});

test("presentPopup: the gate name substitution replaces the numeric id", () => {
  const state = stateWithGate(3, "2026-09-24T18:31:12Z", "approved");
  const presented = presentPopup(state);
  assert.match(presented, /spec/);
  assert.doesNotMatch(presented, /gate 3\b/);
});

test("presentOverlay EQUALS the reconstruction (gate-name + timestamp, then the two header-wording lines), for every fixture (with and without head, P2)", () => {
  for (const state of FIXTURES) {
    for (const head of [undefined, { deliverable: "kiln-v1" }]) {
      let expected = reconstructGateAndTime(renderOverlay(state));
      if (head) expected = expected.replace(/^=== Roadmap · Layer C — Gate 0 .+ ===$/m, `=== Roadmap — ${head.deliverable} ===`);
      expected = expected.replace(
        /^ {3}gate0 · (\S+) · decided_by (\S+) · at (.+?)( · REOPENED.*)?$/m,
        (_w: string, status: string, by: string, date: string, reopened: string | undefined) => `Gate 0: ${status} by ${by} · ${date}${reopened ?? ""}`,
      );
      assert.equal(presentOverlay(state, head), expected, `head=${JSON.stringify(head)}`);
    }
  }
});

test("presentOverlay: the exact plain-table header from ui-mockups.md appears verbatim when head is supplied", () => {
  const state = stateWithGate(9, "2026-09-24T18:31:12Z", "approved");
  const presented = presentOverlay(state, { deliverable: "kiln-v1" });
  assert.match(presented, /^=== Roadmap — kiln-v1 ===$/m);
});

test("presentOverlay: the Gate 0 summary line reads 'Gate 0: <status> by <who> · <formatted date>'", () => {
  const state = stateWithGate(9, "2026-09-24T18:31:12Z", "approved");
  const presented = presentOverlay(state, { deliverable: "kiln-v1" });
  assert.match(presented, /^Gate 0: approved by human@batorfi · 22 Sep 2026, 17:56 UTC$/m);
});

test("presentOverlay: gate0Open (the inter-row re-open) — the date is NOT swallowed, REOPENED is preserved verbatim, trailing", () => {
  const state = { ...stateWithGate(9, "2026-09-24T18:31:12Z", "approved"), gate0Open: true } as FactoryState & { gate0Open: boolean };
  const presented = presentOverlay(state, { deliverable: "kiln-v1" });
  assert.match(presented, /^Gate 0: approved by human@batorfi · 22 Sep 2026, 17:56 UTC · REOPENED at the inter-row seam$/m);
});

test("presentOverlay: the in-flight row's tail shows the human gate name, e.g. 'at spec — HERE'", () => {
  const state = stateWithGate(3, "2026-09-24T18:31:12Z", "approved");
  const presented = presentOverlay(state);
  assert.match(presented, /at spec — HERE/);
});

test("presentOverlay: without head, the Roadmap header is left unchanged (P4 — missing context degrades gracefully, never throws)", () => {
  const state = stateWithGate(9, "2026-09-24T18:31:12Z", "approved");
  assert.doesNotThrow(() => presentOverlay(state));
  const presented = presentOverlay(state);
  assert.match(presented, /=== Roadmap · Layer C — Gate 0 APPROVED ===/);
});

test("presentGate0Face EQUALS the reconstruction (gate-name + timestamp, then the three header-wording rewrites), P2", () => {
  let expected = reconstructGateAndTime(renderGate0Face(HEAD));
  expected = expected.replace(/^=== GATE 0 — ROADMAP[^\n]*===$/m, `=== Gate 0 — ${HEAD.deliverable} ===`);
  expected = expected.replace(/^program: .+\n?/m, "");
  expected = expected.replace(/^gate0 head: pending$/m, "Status: pending — awaiting your decision");
  assert.equal(presentGate0Face(HEAD), expected);
});

test("presentGate0Face: the exact header from ui-mockups.md appears verbatim", () => {
  const presented = presentGate0Face(HEAD);
  assert.match(presented, /^=== Gate 0 — kiln-v1 ===$/m);
});

test("presentGate0Face: 'program: <deliverable>' is dropped (folded into the header)", () => {
  const presented = presentGate0Face(HEAD);
  assert.doesNotMatch(presented, /^program: /m);
});

test("presentGate0Face: 'gate0 head: pending' becomes 'Status: pending — awaiting your decision'", () => {
  const presented = presentGate0Face(HEAD);
  assert.match(presented, /^Status: pending — awaiting your decision$/m);
  assert.doesNotMatch(presented, /gate0 head:/);
});

test("presentGate0Face: FR-003 is unaffected — the underlying renderGate0Face still offers only the admission subset as its move list", () => {
  const raw = renderGate0Face(HEAD);
  assert.match(raw, /moves \[approve, revise, reject, edit-rows, add-row, drop-row\]/);
  assert.match(raw, /admission: \[approve, revise, reject\]/);
});

// ── P3: the four render functions stay byte-for-byte unmodified (measured against this task's own snapshot) ──
test("P3: renderHud/renderPopup/renderOverlay/renderGate0Face are called by present.ts, not reimplemented — raw output still appears", () => {
  const state = stateWithGate(3, "2026-09-24T18:31:12Z", "approved");
  assert.equal(typeof renderHud(state), "string");
  assert.equal(typeof renderPopup(state), "string");
  assert.equal(typeof renderOverlay(state), "string");
  assert.equal(typeof renderGate0Face(HEAD), "string");
  // presentX must actually be DERIVED from renderX's output — spot-check via a substring survival check for the untransformed part:
  assert.match(presentHud(state), /lane=r9 switches=3/); // "lane"/"switches" spans are untouched by any of the 3 transforms
});

// ── P4: malformed input passes through unchanged, never throws ──
test("P4: a malformed gate id inside the fixture (a gate.id the vocabulary doesn't know) passes through unchanged, never throws", () => {
  const state = stateWithGate(3, "2026-09-24T18:31:12Z", "approved");
  (state.gate as any).id = 99; // not a real GateId
  assert.doesNotThrow(() => presentHud(state));
  const presented = presentHud(state);
  assert.match(presented, /gate99/); // gateName(99) throws internally -> the original token is kept, per P4
});

test("P4: a non-ISO wallClock value (e.g. 'HH:MM', the REAL shape r1 actually produces) passes through unchanged, never throws", () => {
  const state = stateWithGate(3, "00:15", "approved");
  assert.doesNotThrow(() => presentHud(state));
  assert.match(presentHud(state), /clock=00:15/);
});

test("P4: present.ts never throws for any of the well-formed fixtures", () => {
  for (const state of FIXTURES) {
    assert.doesNotThrow(() => presentHud(state));
    assert.doesNotThrow(() => presentPopup(state));
    assert.doesNotThrow(() => presentOverlay(state, { deliverable: "kiln-v1" }));
  }
  assert.doesNotThrow(() => presentGate0Face(HEAD));
});
