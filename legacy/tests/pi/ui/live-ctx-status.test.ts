// kiln/tests/pi/ui/live-ctx-status.test.ts — T010 (US1), r9 · FR-001 · contracts/live-ctx-seam.md L1 · research D9 · OFFLINE tier.
// Layer A's live path: `setStatus` is a PURE PASSTHROUGH to Pi's real `ctx.ui.setStatus(key, text)` — a genuine, distinct
// fire-and-forget method (`docs/rpc.md` "setStatus"), NOT `ctx.ui.notify` (a one-off message). It does NOT re-derive the
// presentation transform (`present.ts`'s output is the CALLER's responsibility to have already applied, NC2 = A). Where
// `ctx.hasUI` is false (print/json), falls back to `emit()` — the same mode-aware channel `kiln-status` already uses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLiveUICtx } from "../../../pi/ui/live-ctx.ts";

function fakeCtx(mode: string) {
  const statusCalls: { key: string; text: string | undefined }[] = [];
  const notified: { message: string; level?: string }[] = [];
  const ctx: any = {
    mode,
    hasUI: mode === "tui" || mode === "rpc",
    cwd: "/x",
    ui: {
      select: async () => undefined,
      notify: (m: string, l?: string) => notified.push({ message: m, level: l }),
      setStatus: (key: string, text: string | undefined) => statusCalls.push({ key, text }),
      custom: async () => undefined,
    },
  };
  return { ctx, statusCalls, notified };
}

test("tui: setStatus(footer) calls ctx.ui.setStatus with EXACTLY footer as the text", () => {
  const { ctx, statusCalls } = fakeCtx("tui");
  const live = makeLiveUICtx(ctx);
  live.setStatus("rail=spec lane=r9 switches=3 clock=18:31:12");
  assert.equal(statusCalls.length, 1);
  assert.equal(statusCalls[0].text, "rail=spec lane=r9 switches=3 clock=18:31:12");
  assert.equal(typeof statusCalls[0].key, "string");
  assert.notEqual(statusCalls[0].key.length, 0);
});

test("rpc: setStatus(footer) ALSO calls ctx.ui.setStatus (it works in both tui and rpc, per docs/rpc.md)", () => {
  const { ctx, statusCalls } = fakeCtx("rpc");
  const live = makeLiveUICtx(ctx);
  live.setStatus("rail=spec lane=r9 switches=3 clock=18:31:12");
  assert.equal(statusCalls.length, 1);
  assert.equal(statusCalls[0].text, "rail=spec lane=r9 switches=3 clock=18:31:12");
});

test("tui/rpc: setStatus never calls ctx.ui.notify — a footer update is not a one-off message", () => {
  for (const mode of ["tui", "rpc"]) {
    const { ctx, notified } = fakeCtx(mode);
    makeLiveUICtx(ctx).setStatus("footer text");
    assert.equal(notified.length, 0, `${mode} must not call ctx.ui.notify for a footer update`);
  }
});

test("print/json: setStatus falls back to the headless channel (setStatus reaches no one there either)", () => {
  for (const mode of ["print", "json"]) {
    const { ctx, statusCalls } = fakeCtx(mode);
    const originalLog = console.log;
    let logged = "";
    console.log = (s: string) => { logged = s; };
    try {
      const live = makeLiveUICtx(ctx);
      live.setStatus("rail=spec lane=r9 switches=3 clock=18:31:12");
      assert.equal(statusCalls.length, 0, `${mode} must not call ctx.ui.setStatus`);
      assert.equal(logged, "rail=spec lane=r9 switches=3 clock=18:31:12");
    } finally {
      console.log = originalLog;
    }
  }
});

test("setStatus does NOT re-derive the transform — a raw, un-presented string passes through byte-for-byte too (the caller's job, not setStatus's)", () => {
  const { ctx, statusCalls } = fakeCtx("tui");
  const live = makeLiveUICtx(ctx);
  live.setStatus("rail=gate3 lane=r9 switches=3 clock=2026-09-24T18:31:12Z"); // deliberately NOT presented
  assert.equal(statusCalls[0].text, "rail=gate3 lane=r9 switches=3 clock=2026-09-24T18:31:12Z");
});

test("P-IX: a SECOND call with unchanged content is still passed through (no memoization/diffing added)", () => {
  const { ctx, statusCalls } = fakeCtx("tui");
  const live = makeLiveUICtx(ctx);
  live.setStatus("same text");
  live.setStatus("same text");
  assert.equal(statusCalls.length, 2);
});

test("every setStatus call uses the SAME status key (one persistent footer entry, not a new one each time)", () => {
  const { ctx, statusCalls } = fakeCtx("tui");
  const live = makeLiveUICtx(ctx);
  live.setStatus("first");
  live.setStatus("second");
  assert.equal(statusCalls[0].key, statusCalls[1].key);
});

test("hasUI mirrors the real ctx's hasUI", () => {
  const { ctx: tuiCtx } = fakeCtx("tui");
  const { ctx: jsonCtx } = fakeCtx("json");
  assert.equal(makeLiveUICtx(tuiCtx).hasUI, true);
  assert.equal(makeLiveUICtx(jsonCtx).hasUI, false);
});
