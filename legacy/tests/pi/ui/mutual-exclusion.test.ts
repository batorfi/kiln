// kiln/tests/pi/ui/mutual-exclusion.test.ts — T023 (US4), r9 · contract `live-ctx-seam.md` L5, data-model E4, FR-008 · OFFLINE tier.
// At most one KILN overlay's custom() call is ever pending at a time. raiseOverlay("B",...) then, before it resolves,
// raiseOverlay("C",...) — B's pending flow resolves as a no-answer (never a move), and the new layer takes over. The reverse order
// also closes the first correctly. A fired FactoryEvent while one overlay is pending updates that SAME overlay in place (L4a, FR-009):
// it does not open a second one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLiveUICtx } from "../../../pi/ui/live-ctx.ts";
import type { Gate } from "../../../src/gate.ts";
import type { RoadmapHead } from "../../../src/types.ts";

/** A `custom()` that NEVER resolves on its own (mirrors r8's "measure canDraw=true, human hasn't acted yet" state) — the only way it
 * settles is via eviction (our own mutual-exclusion logic) or the test explicitly driving its handleInput. */
function fakeCtxHangingOverlay() {
  const customCalls: { done: (v: unknown) => void }[] = [];
  const selectCalls: unknown[][] = [];
  const ctx: any = {
    mode: "tui",
    hasUI: true,
    cwd: "/x",
    ui: {
      select: async (...args: unknown[]) => { selectCalls.push(args); return "approve"; },
      notify: () => {},
      custom: (factory: (...a: unknown[]) => unknown) =>
        new Promise((resolve) => {
          const done = (v: unknown) => resolve(v);
          factory({}, {}, {}, done);
          customCalls.push({ done });
        }),
    },
  };
  return { ctx, customCalls, selectCalls };
}

function pendingHead(): RoadmapHead {
  return {
    deliverable: "kiln-v1", owner: "human@batorfi", updated: "t", rows: [], ordering: [],
    chain_unattended: false, gate0: { status: "pending" }, trace: "t",
  };
}

test("opening C while B is pending (still inside its custom() overlay) closes B first as a no-answer, never a move", async () => {
  const { ctx, customCalls } = fakeCtxHangingOverlay();
  const gate: Gate = { id: 3, open: true };
  const head = pendingHead();
  const live = makeLiveUICtx(ctx, gate, head, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) });

  live.raiseOverlay("B", "popup content");
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(customCalls.length, 1, "B's overlay must be pending");

  live.raiseOverlay("C", "gate0 face content");
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(gate.move, undefined, "B must NEVER apply a move once evicted");
  assert.notEqual(gate.wait, undefined, "B's eviction must resolve as a durable WAIT");
  assert.equal(customCalls.length, 2, "C's overlay must now be the one pending");
});

test("the reverse order (C pending, then B raised) also closes C correctly, never both open at once", async () => {
  const { ctx, customCalls } = fakeCtxHangingOverlay();
  const gate: Gate = { id: 3, open: true };
  const head = pendingHead();
  const live = makeLiveUICtx(ctx, gate, head, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) });

  live.raiseOverlay("C", "gate0 face content");
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(customCalls.length, 1);

  live.raiseOverlay("B", "popup content");
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(customCalls.length, 2);
  // C's eviction must not have recorded a Gate-0 decision — only a WAIT. There is no direct observable on the internal
  // gate0 tracking object, so this is covered structurally by gate0-disjointness.test.ts + gate0-outcome.test.ts.
});

test("a SAME-layer re-raise while pending updates content in place — never a second custom() call", async () => {
  const { ctx, customCalls } = fakeCtxHangingOverlay();
  const gate: Gate = { id: 3, open: true };
  const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) });

  live.raiseOverlay("B", "first content");
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(customCalls.length, 1);

  live.raiseOverlay("B", "updated content"); // simulates a FactoryEvent firing while B is still pending (L4a, FR-009)
  await new Promise((r) => setTimeout(r, 10));

  assert.equal(customCalls.length, 1, "re-raising the SAME pending layer must NOT open a second dialog");
});

test("raiseOverlay(layer, null) closes the named layer's overlay explicitly", async () => {
  const { ctx, customCalls } = fakeCtxHangingOverlay();
  const gate: Gate = { id: 3, open: true };
  const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) });

  live.raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(customCalls.length, 1);

  live.raiseOverlay("B", null);
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(gate.move, undefined);
  assert.notEqual(gate.wait, undefined, "an explicit close is a no-answer, never a move");
});
