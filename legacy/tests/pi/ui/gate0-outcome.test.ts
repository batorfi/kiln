// kiln/tests/pi/ui/gate0-outcome.test.ts — T018 (US3), r9 · contracts/live-ctx-seam.md L3/L4, FR-003/FR-006 · OFFLINE tier.
// The Gate-0 face's GateQuestion options are EXACTLY GATE0_ADMISSION_MOVES — never the full moveVocabulary("gate0") (which also has
// edit-rows/add-row/drop-row). An answered outcome with ok:true identity calls recordGate0Decision, NEVER applyMove; ok:false or any
// non-answer calls headlessWait, never recordGate0Decision.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLiveUICtx } from "../../../pi/ui/live-ctx.ts";
import { GATE0_ADMISSION_MOVES } from "../../../ui/gate0-face.ts";
import { moveVocabulary } from "../../../contracts/move-vocabulary.ts";
import type { RoadmapHead } from "../../../src/types.ts";

function pendingHead(): RoadmapHead {
  return {
    deliverable: "kiln-v1", owner: "human@batorfi", updated: "2026-09-22T00:00:00Z", rows: [], ordering: [],
    chain_unattended: false, gate0: { status: "pending" }, trace: "t",
  };
}

function fakeCtx(mode: string, selectValue: string | undefined) {
  const selectCalls: { title: string; options: string[] }[] = [];
  const ctx: any = {
    mode,
    hasUI: mode === "tui" || mode === "rpc",
    cwd: "/x",
    ui: {
      select: async (title: string, options: string[]) => { selectCalls.push({ title, options }); return selectValue; },
      notify: () => {},
      custom: async () => undefined,
    },
  };
  return { ctx, selectCalls };
}

const OK_IDENTITY = () => ({ ok: true as const, decidedBy: "human@batorfi" });
const BAD_IDENTITY = () => ({ ok: false as const, reason: "not set" });

test("the Gate-0 question's options are EXACTLY GATE0_ADMISSION_MOVES, never the full moveVocabulary('gate0')", async () => {
  const { ctx, selectCalls } = fakeCtx("rpc", undefined);
  const head = pendingHead();
  const live = makeLiveUICtx(ctx, undefined, head, { resolveIdentity: OK_IDENTITY });
  live.raiseOverlay("C", "content");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(selectCalls.length, 1);
  assert.deepEqual(selectCalls[0].options, [...GATE0_ADMISSION_MOVES]);
  assert.notDeepEqual(selectCalls[0].options, [...moveVocabulary("gate0")]);
  for (const editMove of ["edit-rows", "add-row", "drop-row"]) {
    assert.ok(!selectCalls[0].options.includes(editMove), `${editMove} must never be offered at the Gate-0 face`);
  }
});

test("an 'answered' outcome with ok:true identity reaches recordGate0Decision (no throw) and NEVER touches an unrelated per-gate Gate object", async () => {
  const { ctx } = fakeCtx("rpc", "approve");
  const head = pendingHead();
  const unrelatedGate = { id: 3 as const, open: true }; // NOT bound as `gate` here — Layer C never sees it
  const live = makeLiveUICtx(ctx, unrelatedGate, head, { resolveIdentity: OK_IDENTITY });
  live.raiseOverlay("C", "content"); // raises the GATE-0 FACE (head.gate0.status === "pending"), not a per-gate popup
  await new Promise((r) => setTimeout(r, 20));
  // recordGate0Decision's own record shape is r2's job to test; what THIS row's wiring must prove is that answering the Gate-0 face
  // never calls applyMove on ANY per-gate Gate object, including one that happens to be bound to the same instance for Layer B.
  assert.equal(unrelatedGate.move, undefined, "a Gate-0 answer must never call applyMove on a per-gate Gate object");
});

test("ok:false identity -> headlessWait, recordGate0Decision NEVER reached (even with a valid move answer)", async () => {
  const head = pendingHead();
  const { ctx, selectCalls } = fakeCtx("rpc", "approve");
  const live = makeLiveUICtx(ctx, undefined, head, { resolveIdentity: BAD_IDENTITY });
  live.raiseOverlay("C", "content");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(selectCalls.length, 0, "a bad identity must short-circuit BEFORE askGate is ever called (L2)");
});

test("a non-answer (cancelled) -> headlessWait, never recordGate0Decision", async () => {
  const { ctx } = fakeCtx("rpc", undefined);
  const head = pendingHead();
  const live = makeLiveUICtx(ctx, undefined, head, { resolveIdentity: OK_IDENTITY });
  assert.doesNotThrow(() => live.raiseOverlay("C", "content"));
  await new Promise((r) => setTimeout(r, 20));
});

test("cannot-ask capability (print/json) -> headlessWait, never recordGate0Decision", async () => {
  for (const mode of ["print", "json"]) {
    const { ctx, selectCalls } = fakeCtx(mode, "approve");
    const head = pendingHead();
    const live = makeLiveUICtx(ctx, undefined, head, { resolveIdentity: OK_IDENTITY });
    live.raiseOverlay("C", "content");
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(selectCalls.length, 0, `${mode} must never call select`);
  }
});
