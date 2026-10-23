// kiln/tests/live-tui/live-tui.test.ts — T011/T012 (US2, P1), r3 · E4 `F-LIVE-TUI` + `F-GATE0-BLOCK`.
//
// The deferred live-TUI smoke of Layers A/B/C (the r1/r2 NC1 debt r3 clears, NC3): the SAME pure
// renders r1/r2 expose, redrawn on the walk's FIRED EVENTS only (P-IX: a fired `FactoryEvent`; no
// timed loop / socket / server), over ONE `FactoryState` (one source of truth, SC-005), and DEGRADING
// to r2's printed twin when the UI is absent — which still BLOCKS an open Gate 0 (`F-GATE0-BLOCK`,
// P-V/P-VI: a missing surface hides the view, never the decision).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderLive, renderLiveSurfaces, attachLiveTui, liveTuiOrTwin, LIVE_REDRAW_TRIGGERS } from "../../ui/live-tui.ts";
import { onEvent, blocksOn, blocksOnGate0, type FactoryEvent } from "../../ui/factory-state.ts";
import type { FactoryState } from "../../src/types.ts";

// A minimal, open-row + open-Gate-0 base state (one source of truth the surfaces read).
const base: FactoryState = {
  resident: { model: "ollama/llama3.2:3b", tier: "strongest" },
  running: { duId: "spec", role: "worker" },
  queue: [],
  switches: 0,
  wallClock: "00:00",
  roadmap: [{ id: "r3", short: "live smoke", deps: ["r1"], status: "active", gate: 1 }],
  current: "r3",
  gate0: { status: "pending" },
  gate: { id: 3 },
};

// T011 · SC-005: the surface set is a PURE read of ONE state ⇒ a captured identical state renders
// BYTE-IDENTICAL (one source of truth; no second render path diverges).
test("US2 SC-005 (F-LIVE-TUI): an identical captured state ⇒ a byte-identical live render", () => {
  const a = renderLive(base);
  const b = renderLive({ ...base } as FactoryState);
  assert.equal(a, b, "renderLive is a pure function of the shared FactoryState (byte-identical)");
  const surfs = renderLiveSurfaces(base);
  assert.ok(surfs.layerA && surfs.layerB && surfs.layerC, "A+B+C are all drawn from one state");
 });

// T011 · P-IX: the live surface set redraws ONLY on a fired event — not on a poll. The forbidden
// timer/socket/server constructs are absent from every UI module (incl. the live one).
test("US2 (P-IX): the live TUI redraws on fired events only (no timer/socket/server in kiln/ui/*.ts)", () => {
  const dir = fileURLToPath(new URL("../../ui/", import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  assert.ok(files.length >= 5, "the UI + live-TUI modules exist");
   const forbidden = [/\bsetInterval\b/, /\bsetTimeout\b/, /\brequire\(\s*["']net["']\s*\)/, /\brequire\(\s*["']http["']\s*\)/, /\bnew\s+Server\b/, /\bfetch\s*\(/];
  for (const f of files) {
    const src = readFileSync(`${dir}/${f}`, "utf8");
    for (const re of forbidden) {
      assert.ok(!re.test(src), `${f} must not contain a timer/socket/server construct (${re}) — P-IX no-poll`);
       }
     }
 });

// T011 · P-IX: redraw surfaces only fire on the trigger event set; a non-triggering event yields none.
test("US2 (P-IX): attachLiveTui redrews surfaces only on a FIRING event, over one shared state", () => {
  const ctx = {
    hasUI: true,
      setStatus() {},
      raiseOverlay() {},
   };
  const tui = attachLiveTui(ctx);
    // A gate-open event redraws A/B/C from the updated store.
  const r1 = tui.onEvent(base, { kind: "gate-open", gate: "7" } as FactoryEvent);
  assert.ok(r1.surfaces, "a firing gate-open event triggers a redraw of A/B/C");
    // A snapshot event is a no-op redraw (NOT in the trigger set) ⇒ no surfaces recomputed.
  const r2 = tui.onEvent(base, { kind: "snapshot" } as FactoryEvent);
  assert.equal(r2.surfaces, undefined, "a non-triggering event does not redraw (no poll, P-IX)");
    // LIVE_REDRAW_TRIGGERS are exactly the Layer-C + r1 row-gate triggers.
  assert.ok(LIVE_REDRAW_TRIGGERS.includes("gate0_open") && LIVE_REDRAW_TRIGGERS.includes("roadmap_row_done"), "Layer-C triggers are in the redraw set");
});

// T011 · P-VI: onEvent is PURE over the store — it never mutates the input state.
test("US2 (P-VI): a fired event never mutates the input FactoryState (pure over the store)", () => {
  const frozen: FactoryState = { ...base, gate: { ...base.gate } };
  onEvent(frozen, { kind: "gate-resolve", gate: "3", move: "approve", by: "human@batorfi" } as FactoryEvent);
  assert.deepEqual(frozen.gate, { id: 3 }, "onEvent returns a NEW state; the input is untouched (P-VI)");
  assert.ok(!blocksOn({ ...frozen, gate: null }), "a cleared row-gate no longer blocks");
});

// T012 · F-GATE0-BLOCK (US2 AC-2): with the UI ABSENT, the twin PRINTS the program + STILL blocks an
// open Gate 0; a missing surface hides the view, never the decision.
test("US2 (F-GATE0-BLOCK): a disabled UI prints + a blocked Gate 0 never auto-advances", () => {
  const noUi = { hasUI: false, setStatus() {}, raiseOverlay() {} };
  const twin = liveTuiOrTwin(base, noUi as any);
  assert.ok(twin.degraded, "the absence of the live UI degrades to r2's print twin");
  assert.ok(twin.blocks, "a missing UI still BLOCKS — it hides the view, never the decision");
  assert.ok(blocksOnGate0(base), "an open Gate 0 blocks on its own (F-GATE0-BLOCK, P-V/P-VI)");
 });

// T012 · F-LIVE-TUI: a PRESENT live UI does NOT degrade, and a blocked Gate 0 still holds.
test("US2 (F-LIVE-TUI + block): a present live UI does not degrade, and a blocked Gate 0 still holds", () => {
  const ui = { hasUI: true, setStatus() {}, raiseOverlay() {} };
  const live = liveTuiOrTwin(base, ui);
  assert.equal(live.degraded, false, "a present UI uses the live path, not the twin");
  assert.ok(live.blocks, "even live, an open Gate 0 blocks (never auto-advances)");
 });

// T012 · SC-005 (cont.): twin + live path are byte-identical over a captured identical state.
test("US2 SC-005: the twin and the live render are byte-identical over a captured identical state", () => {
  const cap = { ...base } as FactoryState;
  const twin1 = liveTuiOrTwin({ ...cap } as FactoryState, { hasUI: false, setStatus() {}, raiseOverlay() {} } as any).render;
  const twin2 = liveTuiOrTwin({ ...cap } as FactoryState, { hasUI: false, setStatus() {}, raiseOverlay() {} } as any).render;
  assert.equal(twin1, twin2, "the headless twin is byte-identical across identical captured states");
  const live1 = liveTuiOrTwin({ ...cap } as FactoryState, { hasUI: true, setStatus() {}, raiseOverlay() {} }).render;
  const live2 = liveTuiOrTwin({ ...cap } as FactoryState, { hasUI: true, setStatus() {}, raiseOverlay() {} }).render;
  assert.equal(live1, live2, "the live path is byte-identical across identical captured states (SC-005)");
 });
