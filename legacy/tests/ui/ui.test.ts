// kiln/tests/ui/ui.test.ts — T022/T023 (US5): the watch is event-driven, no timer/socket/server.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { onEvent, blocksOn, type FactoryEvent } from "../../ui/factory-state.ts";
import { renderHud } from "../../ui/hud.ts";
import { renderPopup } from "../../ui/popup.ts";
import { printHeadless, disabledUi } from "../../ui/twin.ts";
import type { FactoryState } from "../../src/types.ts";

const base: FactoryState = {
  resident: { model: "stub", tier: "strongest" },
  running: null,
  queue: [],
  switches: 0,
  wallClock: "00:14",
  roadmap: [],
  current: "r1",
  gate0: { status: "approved" },
  gate: null,
};

test("US5 SC-005: identical state ⇒ identical render (one source of truth, deterministic read)", () => {
  const a = renderHud(base);
  const b = renderHud(JSON.parse(JSON.stringify(base)));
  assert.equal(a, b, "the same state renders identically (a distilled read, not a second store)");
  const p = renderPopup({ ...base } as FactoryState);
  const p2 = renderPopup(JSON.parse(JSON.stringify({ ...base }) as FactoryState));
  assert.equal(p, p2, "the popup is a pure read of state");
});

test("US5 SC-001: a fired event updates the shared FactoryState; the surfaces recompute", () => {
  const open: FactoryState = onEvent(base, { kind: "gate-open", gate: "3"} as FactoryEvent);
  const cost: FactoryState = onEvent(open, { kind: "cost", switches: 1, wallClock: "00:20" } as FactoryEvent);
  assert.deepEqual(renderHud(open), "rail=gate3 lane=r1 switches=0 clock=00:14", "the HUD redraws on the open event");
  assert.equal(cost.switches, 1, "the cost event advanced the shared store");
  assert.match(renderPopup(open), /gate 3 OPEN/, "the popup draws the open gate's card");
  // input untouched (pure over the store):
  assert.equal(base.gate, null, "onEvent did not mutate the input state");
});

test("US5 (P-V/IX): a disabled UI prints the same content AND a gate still blocks", () => {
  const open: FactoryState = onEvent(base, { kind: "gate-open", gate: "6" } as FactoryEvent);
  const twin = disabledUi(open);
  assert.ok(twin.render.includes(renderHud(open)), "the headless twin prints the HUD content");
  assert.ok(twin.render.includes(renderPopup(open)), "the headless twin prints the POPUP content");
  assert.ok(twin.blocks, "a disabled UI still blocks on the open gate — it hides the view, not the decision");
  assert.ok(blocksOn(open), "the gate is open; nothing in the watch may auto-advance it");
});

test("US5 (P-IX): no surface blocks on a timer or a socket; there is no server", () => {
  const dir = fileURLToPath(new URL("../../ui/", import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  assert.ok(files.length >= 4, "the UI modules exist (factory-state, hud, popup, twin)");
   const forbidden = [/\bsetInterval\b/, /\bsetTimeout\b/, /\brequire\(\s*["']net["']\s*\)/, /\brequire\(\s*["']http["']\s*\)/, /\bnew\s+Server\b/, /\bfetch\s*\(/];
  for (const f of files) {
    const src = readFileSync(`${dir}/${f}`, "utf8");
    for (const re of forbidden) {
      assert.ok(!re.test(src), `${f} must not contain a timer/socket/server construct (${re})`);
     }
   }
});
