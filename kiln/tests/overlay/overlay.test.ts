// kiln/tests/overlay/overlay.test.ts — T005/T006 (US1): the Layer C roadmap overlay (SC-001, SC-005).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderOverlay, LAYERC_REDRAW_TRIGGERS } from "../../ui/overlay.ts";
import type { FactoryState } from "../../src/types.ts";

// A multi-row program with r3 active at gate 3; r1/r2 closed, r4/r5 blocked (SC-001 example, §5.1).
function progState(): FactoryState {
  return {
     resident: { model: "stub", tier: "strongest" },
     running: null,
     queue: [],
     switches: 0,
     wallClock: "13:11",
     roadmap: [
       { id: "r1", short: "core single-lane runtime", deps: [], status: "done", outcome: "@PR#1" },
       { id: "r2", short: "Flow UI — Layer C", deps: ["r1"], status: "done", outcome: "@PR#2" },
       { id: "r3", short: "first live-model smoke walk", deps: ["r1"], status: "active", gate: 3 },
       { id: "r4", short: "publish kiln toolchain", deps: ["r3"], status: "queued" },
       { id: "r5", short: "comprehensive newcomer docs", deps: ["r4"], status: "queued" },
               ],
     current: "r3",
     gate0: { status: "approved", rows: "r1..r5", decided_by: "human@batorfi", at: "2026-09-13T06:54:20Z" } as FactoryState["gate0"],
     gate: null,
      };
}

// T005 — SC-001: every row is listed by id/status/short/deps; exactly ONE in-flight row reads "HERE".
test("US1 SC-001: renderOverlay lists every row; exactly one reads 'at gate — HERE'", () => {
   const s = progState();
  const out = renderOverlay(s);
   for (const id of ["r1", "r2", "r3", "r4", "r5"]) assert.match(out, new RegExp(`\\b${id}\\b`), `${id} is listed`);
   assert.match(out, /core single-lane runtime/, "the short name renders");
   assert.match(out, /@PR#1/, "a closed row shows its outcome");
   assert.match(out, /at gate 3 — HERE/, "the in-flight row is highlighted at its gate");
   assert.match(out, /waits r3/, "a row blocked on r4's deps shows 'waits r3'");
   assert.match(out, /waits r4/, "a row blocked on r5's deps shows 'waits r4'");
    // The §5.1 head: the approved gate0 with rows/decided_by/at, at the top.
   assert.match(out, /Gate 0 APPROVED/m, "the gate0 head shows approved");
   assert.match(out, /decided_by human@batorfi/, "the gate0 head shows the human decider (P-VI)");
    // EXACTLY one "HERE" (SC-001: the zoom-out is unambiguous).
   const hereCount = out.match(/— HERE/g)?.length ?? 0;
   assert.equal(hereCount, 1, "exactly one row reads '— HERE'");
});

// T005 (cont.) — SC-005: a captured identical state ⇒ a byte-identical overlay (one source of truth).
test("US1 SC-005: an identical captured state renders byte-identical (one source of truth)", () => {
   const a = renderOverlay(progState());
  const b = renderOverlay(JSON.parse(JSON.stringify(progState())) as FactoryState);
  assert.equal(a, b, "the same state yields a byte-identical overlay — not a second store");
});

// T005 (cont.) — FR-002/US1 SC-4: Layer C COMPOSES with A/B (a footer composes with all three).
test("US1 FR-002: Layer C composes with Layers A/B (it does not replace a footer/popup)", () => {
   const out = renderOverlay(progState());
   assert.match(out, /composes with Layer A \(footer\) \+ B \(popup\)/, "the overlay composes with A/B, not hides them");
});

// T006 — SC-005 (P-IX testable half): NO timer/socket/server in any ui module; redraw is event-only.
test("US1 SC-005/P-IX: no ui module contains a timer/socket/server", () => {
   const dir = fileURLToPath(new URL("../../ui/", import.meta.url));
   const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
   assert.ok(files.includes("overlay.ts"), "overlay.ts exists (E1)");
   const forbidden = [/\bsetInterval\b/, /\bsetTimeout\b/, /\brequire\(\s*["']net["']\s*\)/, /\brequire\(\s*["']http["']\s*\)/, /\bnew\s+Server\b/, /\bfetch\s*\(/];
   for (const f of files) {
     const src = readFileSync(`${dir}/${f}`, "utf8");
     for (const re of forbidden) assert.ok(!re.test(src), `${f} must not contain a timer/socket/server construct (${re})`);
      }
   // The Layer-C redraw triggers are the ONLY events — a poll cannot exist.
   assert.deepEqual(LAYERC_REDRAW_TRIGGERS, ["gate0_open", "roadmap_row_done"]);
});
