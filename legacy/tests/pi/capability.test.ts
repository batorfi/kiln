// kiln/tests/pi/capability.test.ts — T016, r8 · FR-007 · contracts/pi-seam.md S2 · OFFLINE tier.
// Capability is decided from MODE and measured behaviour, never from `ctx.hasUI` alone (M5: rpc reports hasUI=true yet cannot draw).
// A capability is granted ONLY by an affirmative row; the default is "cannot ask, cannot draw" — a fail-safe for a Pi mode this was never run on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectCapability } from "../../pi/port.ts";

const ctx = (mode: string | undefined, hasUI: boolean) => ({ mode, hasUI, cwd: "/x", ui: {} as any });

test("S2: tui + hasUI:true → canAsk AND canDraw", () => {
  const c = detectCapability(ctx("tui", true));
  assert.equal(c.mode, "tui"); assert.equal(c.canAsk, true); assert.equal(c.canDraw, true); assert.ok(c.why.length > 0);
});

test("S2 (M5, measured): rpc + hasUI:true → canAsk, but NOT canDraw — hasUI alone is not sufficient", () => {
  const c = detectCapability(ctx("rpc", true));
  assert.equal(c.mode, "rpc"); assert.equal(c.canAsk, true); assert.equal(c.canDraw, false);
});

test("S2 (M6, measured): json + hasUI:false → neither", () => {
  const c = detectCapability(ctx("json", false));
  assert.equal(c.canAsk, false); assert.equal(c.canDraw, false);
});

test("S2 (M6, measured): print + hasUI:false → neither", () => {
  const c = detectCapability(ctx("print", false));
  assert.equal(c.canAsk, false); assert.equal(c.canDraw, false);
});

test("S2: an unknown / absent mode → neither, even if hasUI claims true (fail-safe for a Pi newer than measured)", () => {
  assert.deepEqual(detectCapability(ctx(undefined, true)), { mode: "unknown", canAsk: false, canDraw: false, why: detectCapability(ctx(undefined, true)).why });
  const c = detectCapability(ctx("web" as any, true));
  assert.equal(c.mode, "unknown"); assert.equal(c.canAsk, false); assert.equal(c.canDraw, false);
});

test("S2: tui or rpc reported with hasUI:false is a contradiction → fail-safe (neither)", () => {
  for (const mode of ["tui", "rpc"] as const) {
    const c = detectCapability(ctx(mode, false));
    assert.equal(c.canAsk, false, mode); assert.equal(c.canDraw, false, mode);
  }
});

test("S2: nothing is inferred from hasUI alone — canAsk requires an AFFIRMATIVE mode row, not just hasUI:true", () => {
  // a mode this test suite has never seen, with hasUI:true, must NOT be granted canAsk just because hasUI says so
  const c = detectCapability(ctx("holographic" as any, true));
  assert.equal(c.canAsk, false, "capability is granted only by an affirmative row (S2), not inferred from hasUI");
});

test("S2: `why` names the deciding rule (not empty, differs across rows)", () => {
  const whys = new Set([detectCapability(ctx("tui", true)).why, detectCapability(ctx("rpc", true)).why, detectCapability(ctx("json", false)).why, detectCapability(ctx(undefined, true)).why]);
  assert.ok(whys.size >= 3, "distinct rows should carry distinct reasons");
});
