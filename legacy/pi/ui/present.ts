// kiln/pi/ui/present.ts — T007 (Foundational), r9 · FR-015 · contracts/presentation-wrapper.md P1–P4 · research D2, D3 · data-model E1, E2.
//
// The presentation wrapper: calls the real r1/r2 render function FIRST, unmodified, then applies EXACTLY three fixed, tested
// substitutions to the resulting STRING — never to the input state, never by re-deriving content the render already decided:
//   1. gate names   — a bare numeric gate id in a gate-referring position (`gate3`, `gate 3`) becomes its human name (`spec`).
//   2. timestamps   — an ISO-8601 substring becomes a time-only `HH:MM:SS` (inside a `clock=` reading) or a full local
//                     date-and-time `D MMM YYYY, HH:MM UTC` (everywhere else, e.g. a `gate0.at`-style record) — always UTC,
//                     never a locale guess, never relative.
//   3. header wording — four exact, hard-coded replacements (verbatim from ui-mockups.md), dropping internal-only tokens.
// `renderHud`/`renderPopup`/`renderOverlay`/`renderGate0Face` stay byte-for-byte unmodified as functions; this module never
// mutates its input and never throws for a well-formed input (P4) — a value the fixed regexes don't match passes through as-is.
//
// `presentOverlay` takes an OPTIONAL second argument (`head`, just the `deliverable` field it needs) for transform 3's Roadmap
// header rewrite — `renderOverlay`'s OWN signature (FactoryState -> string) is untouched (P3); this is present.ts's own
// wrapper signature, which is new code, not one of r1/r2's four render functions P3 pins. Omitting `head` simply skips that one
// substitution (P4's "degrades to less pretty, never throws").
import { renderHud } from "../../ui/hud.ts";
import { renderPopup } from "../../ui/popup.ts";
import { renderOverlay } from "../../ui/overlay.ts";
import { renderGate0Face } from "../../ui/gate0-face.ts";
import { gateName, type GateId } from "../../contracts/move-vocabulary.ts";
import type { FactoryState, RoadmapHead } from "../../src/types.ts";

const ISO_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g;
const GATE_ID_RE = /\bgate\s*([1-9])\b/g;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Transform 2, the `clock=` form: a fixed HH:MM:SS reading, always UTC. */
function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // P4: an unparsable value passes through unchanged
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

/** Transform 2, the record form: a fixed `D MMM YYYY, HH:MM UTC` reading, always UTC, never relative. */
function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // P4
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

/** Transform 1: a bare gate id (`gate3`, `gate 3`) -> its human name. `gate0` never matches (no numeric form to replace, P1). */
function transformGateNames(text: string): string {
  return text.replace(GATE_ID_RE, (whole, idStr: string) => {
    const id = Number(idStr) as GateId;
    try {
      return gateName(id);
    } catch {
      return whole; // P4: an id gateName doesn't recognise passes through unchanged
    }
  });
}

/** Transform 2: an ISO-8601 substring -> time-only (after `clock=`) or a full date (everywhere else). */
function transformTimestamps(text: string): string {
  return text.replace(ISO_RE, (match: string, offset: number) => {
    const before = text.slice(Math.max(0, offset - 6), offset);
    return before.endsWith("clock=") ? formatTimeOnly(match) : formatFullDate(match);
  });
}

/** Transforms 1 then 2, in the order contract P1 declares — shared by all four present* functions. */
function applyCommon(raw: string): string {
  return transformTimestamps(transformGateNames(raw));
}

/** Layer A, presented (FR-001, FR-015). */
export function presentHud(state: FactoryState): string {
  return applyCommon(renderHud(state));
}

/** Layer B, presented (FR-002, FR-015(c)): the trailing `— moves […]` clause is dropped — the same moves are the selectable list. */
export function presentPopup(state: FactoryState): string {
  const text = applyCommon(renderPopup(state));
  return text.replace(/ — moves \[[^\]]*\]/, "");
}

/**
 * Layer C's plain table, presented (FR-003, FR-015(c)). `head` is optional; when supplied, the Roadmap header line is rewritten
 * to the approved plain wording using `head.deliverable` (present.ts's own wrapper signature — renderOverlay's own signature,
 * `FactoryState -> string`, is untouched, P3).
 */
export function presentOverlay(state: FactoryState, head?: Pick<RoadmapHead, "deliverable">): string {
  let text = applyCommon(renderOverlay(state));
  if (head) {
    text = text.replace(/^=== Roadmap · Layer C — Gate 0 .+ ===$/m, `=== Roadmap — ${head.deliverable} ===`);
  }
  // The date group is NON-greedy and a trailing " · REOPENED at the inter-row seam" clause (a real, reachable state — the
  // inter-row seam re-opening Gate 0) is captured separately and preserved verbatim, not swallowed into "formattedDate" —
  // it is not one of FR-015(c)'s four declared header-wording replacements, so P1's "no others" rule keeps it as-is (P4).
  text = text.replace(
    /^ {3}gate0 · (\S+) · decided_by (\S+) · at (.+?)( · REOPENED.*)?$/m,
    (_whole, status: string, by: string, formattedDate: string, reopened: string | undefined) =>
      `Gate 0: ${status} by ${by} · ${formattedDate}${reopened ?? ""}`,
  );
  return text;
}

/** The distinct Gate-0 face, presented (FR-003, FR-015(c)). */
export function presentGate0Face(head: RoadmapHead): string {
  let text = applyCommon(renderGate0Face(head));
  text = text.replace(/^=== GATE 0 — ROADMAP[^\n]*===$/m, `=== Gate 0 — ${head.deliverable} ===`);
  text = text.replace(/^program: .+\n?/m, ""); // dropped — folded into the header above
  text = text.replace(/^gate0 head: pending$/m, "Status: pending — awaiting your decision");
  return text;
}
