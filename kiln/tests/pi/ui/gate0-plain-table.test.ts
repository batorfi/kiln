// kiln/tests/pi/ui/gate0-plain-table.test.ts — T020 (US3), r9 · contracts/live-ctx-seam.md L4, "the plain table" branch · OFFLINE tier.
// When gate0.status !== "pending", raiseOverlay("C", ...) builds NO GateQuestion at all (no call to askGate/select) — only the given
// content is shown; the overlay's own dismiss (Enter/Esc) still closes it (reuses the component-level handleInput contract).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLiveUICtx } from "../../../pi/ui/live-ctx.ts";
import type { RoadmapHead } from "../../../src/types.ts";

function approvedHead(): RoadmapHead {
  return {
    deliverable: "kiln-v1", owner: "human@batorfi", updated: "2026-09-22T00:00:00Z", rows: [], ordering: [],
    chain_unattended: false, gate0: { status: "approved", decided_by: "human@batorfi", at: "2026-09-22T17:56:10Z" }, trace: "t",
  };
}

function fakeCtxWithRealOverlayContract() {
  const selectCalls: unknown[][] = [];
  const ctx: any = {
    mode: "tui",
    hasUI: true,
    cwd: "/x",
    ui: {
      select: async (...args: unknown[]) => { selectCalls.push(args); return undefined; },
      notify: () => {},
      custom: (factory: (...a: unknown[]) => unknown) =>
        new Promise((resolve) => {
          const done = (result: unknown) => resolve(result);
          const component = factory({}, {}, {}, done) as { handleInput?(data: string): void };
          ctx.ui.__component = component;
        }),
    },
  };
  return { ctx, selectCalls };
}

for (const status of ["approved", "revised", "rejected"] as const) {
  test(`gate0.status === "${status}" -> raiseOverlay("C", ...) builds NO question (askGate/select is NEVER called)`, async () => {
    const { ctx, selectCalls } = fakeCtxWithRealOverlayContract();
    const head = approvedHead();
    head.gate0.status = status;
    makeLiveUICtx(ctx, undefined, head).raiseOverlay("C", "plain table content");
    await new Promise((r) => setTimeout(r, 0));
    ctx.ui.__component?.handleInput("\r"); // dismiss, so the flow settles cleanly
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(selectCalls.length, 0, `${status}: no gate question may ever be built for the plain table`);
  });
}

test("the plain-table overlay's own dismiss (Enter/Esc) still closes it — the component-level handleInput contract is reused", async () => {
  const { ctx } = fakeCtxWithRealOverlayContract();
  const head = approvedHead();
  makeLiveUICtx(ctx, undefined, head).raiseOverlay("C", "plain table content");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(typeof ctx.ui.__component?.handleInput, "function");
  let settled = false;
  const p = new Promise<void>((resolve) => {
    const orig = ctx.ui.__component.handleInput.bind(ctx.ui.__component);
    ctx.ui.__component.handleInput = (d: string) => { orig(d); settled = true; resolve(); };
  });
  ctx.ui.__component.handleInput("\x1b");
  await p;
  assert.equal(settled, true);
});

test("no identity is ever needed for the plain table (no decision to make) — a bad/unset identity does not block showing it", async () => {
  const { ctx, selectCalls } = fakeCtxWithRealOverlayContract();
  const head = approvedHead();
  const live = makeLiveUICtx(ctx, undefined, head, { resolveIdentity: () => ({ ok: false, reason: "unset" }) });
  live.raiseOverlay("C", "plain table content");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(typeof ctx.ui.__component?.handleInput, "function", "the plain table must still be drawable with no identity set");
  ctx.ui.__component.handleInput("\r");
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(selectCalls.length, 0);
});
