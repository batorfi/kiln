// kiln/tests/pi/ui/live-ctx-vocabulary.test.ts — T013 (US2), r9 · contracts/live-ctx-seam.md L4, FR-002 · OFFLINE tier.
// The GateQuestion built for a per-gate popup has EXACTLY moveVocabulary(gate.id) as its options, for every gate id 1–9 — never a
// hand-written list. Checked at least two DIFFERENT gate ids produce DIFFERENT option sets (catches a hard-coded single list).
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLiveUICtx } from "../../../pi/ui/live-ctx.ts";
import { moveVocabulary, type GateId } from "../../../contracts/move-vocabulary.ts";
import type { Gate } from "../../../src/gate.ts";

function fakeCtxCapturingSelect() {
  const selectCalls: { title: string; options: string[] }[] = [];
  const ctx: any = {
    mode: "rpc",
    hasUI: true,
    cwd: "/x",
    ui: {
      select: async (title: string, options: string[]) => {
        selectCalls.push({ title, options });
        return undefined; // cancel — this test only cares about what was OFFERED, not the outcome
      },
      notify: () => {},
      custom: async () => undefined,
    },
  };
  return { ctx, selectCalls };
}

const ALL_PER_GATE_IDS: GateId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

for (const id of ALL_PER_GATE_IDS) {
  test(`gate ${id}: the built question's options are EXACTLY moveVocabulary(${id})`, async () => {
    const { ctx, selectCalls } = fakeCtxCapturingSelect();
    const gate: Gate = { id, open: true };
    const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) });
    live.raiseOverlay("B", "content");
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(selectCalls.length, 1);
    assert.deepEqual(selectCalls[0].options, [...moveVocabulary(id)]);
  });
}

test("two DIFFERENT gate ids produce DIFFERENT option sets (a hard-coded single list would fail this)", async () => {
  const { ctx: ctxA, selectCalls: callsA } = fakeCtxCapturingSelect();
  const gateA: Gate = { id: 5, open: true }; // checkpoint: ["approve", "split+revise"]
  const liveA = makeLiveUICtx(ctxA, gateA, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) });
  liveA.raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 20));

  const { ctx: ctxB, selectCalls: callsB } = fakeCtxCapturingSelect();
  const gateB: Gate = { id: 6, open: true }; // review: ["approve", "restart"]
  const liveB = makeLiveUICtx(ctxB, gateB, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) });
  liveB.raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 20));

  assert.notDeepEqual(callsA[0].options, callsB[0].options);
});
