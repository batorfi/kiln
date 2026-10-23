// kiln/tests/pi/selftest.test.ts — T027, r8 · contracts/pi-extension.md E3 · research D7 · OFFLINE tier.
// kiln-selftest exercises the seam against a fake ctx: draws an overlay FIRST when canDraw, then asks one gate-shaped question, and prints one
// line. It writes nothing and decides nothing (P-I, P-VII). The `timeout` argument is a labelled SHAPE-TEST of Pi's own dialog, never a gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runSelftest } from "../../pi/selftest.ts";

function fakeCtx(mode: string, opts: { selectValue?: string | undefined; customCalls?: unknown[] } = {}) {
  const customCalls = opts.customCalls ?? [];
  const notified: { message: string; level?: string }[] = [];
  const selectCalls: unknown[][] = [];
  const ctx: any = {
    mode,
    hasUI: mode === "tui" || mode === "rpc",
    cwd: "/x",
    ui: {
      select: (...args: unknown[]) => { selectCalls.push(args); return Promise.resolve(opts.selectValue); },
      notify: (m: string, l?: string) => notified.push({ message: m, level: l }),
      custom: (...args: unknown[]) => { customCalls.push(args); return Promise.resolve(undefined); },
    },
  };
  return { ctx, notified, selectCalls, customCalls };
}

/**
 * A `custom()` fake that behaves like REAL Pi's TUI contract (found missing by the FR-016 human smoke test, 2026-09-22): it calls the
 * factory with `(tui, theme, keybindings, done)`, keeps the returned component, and resolves the `custom()` promise ONLY when the
 * component itself calls `done(...)` — exactly like the docs' own examples (e.g. `overlay-test.ts`'s `handleInput`). The old fake
 * (`fakeCtx`, above) resolved `undefined` immediately regardless of what the factory returned, which is why this bug shipped once already.
 */
function fakeCtxWithRealOverlayContract(selectValue: string | undefined) {
  const ctx: any = {
    mode: "tui",
    hasUI: true,
    cwd: "/x",
    ui: {
      select: async () => selectValue,
      notify: () => {},
      custom: (factory: (...a: unknown[]) => unknown) =>
        new Promise((resolve) => {
          const done = (result: unknown) => resolve(result);
          const component = factory({}, {}, {}, done) as { handleInput?(data: string): void };
          ctx.ui.__component = component; // exposed so a test can drive handleInput directly
        }),
    },
  };
  return ctx;
}

test("D7: tui (canDraw) — draws ONE overlay FIRST, then asks; both happen in that order", async () => {
  const order: string[] = [];
  const { ctx } = fakeCtx("tui", { selectValue: "approve" });
  ctx.ui.custom = (...a: unknown[]) => { order.push("custom"); return Promise.resolve(undefined); };
  const origSelect = ctx.ui.select;
  ctx.ui.select = (...a: unknown[]) => { order.push("select"); return origSelect(...a); };
  await runSelftest(ctx, "");
  assert.deepEqual(order, ["custom", "select"]);
});

test("D7: rpc (canAsk, NOT canDraw) — SKIPS the overlay call entirely (does not fail) and still asks", async () => {
  const { ctx, customCalls, selectCalls } = fakeCtx("rpc", { selectValue: "approve" });
  const line = await runSelftest(ctx, "");
  assert.equal(customCalls.length, 0, "rpc must not attempt an overlay it cannot draw");
  assert.equal(selectCalls.length, 1);
  assert.match(line, /outcome=answered:approve/);
});

for (const mode of ["print", "json"]) {
  test(`D7: ${mode} (cannot ask) — NEVER calls select, and canAsk/canDraw both report false`, async () => {
    const { ctx, selectCalls } = fakeCtx(mode);
    const line = await runSelftest(ctx, "");
    assert.equal(selectCalls.length, 0, `${mode} must never call select`);
    assert.match(line, /canAsk=false canDraw=false/);
    assert.match(line, /outcome=no-answer:cannot-ask/);
  });
}

test("E3: the output line is EXACTLY the specified shape", async () => {
  const { ctx } = fakeCtx("tui", { selectValue: "approve" });
  const line = await runSelftest(ctx, "");
  assert.match(line, /^SELFTEST mode=tui canAsk=true canDraw=true outcome=answered:approve$/);
});

test("E3: an Esc / cancelled select reports no-answer:dismissed, not answered", async () => {
  const { ctx } = fakeCtx("tui", { selectValue: undefined });
  const line = await runSelftest(ctx, "");
  assert.match(line, /outcome=no-answer:dismissed$/);
});

test("research D7: the `timeout` argument runs the SAME question WITH a Pi timeout — on the // SHAPE-TEST line only, and it is not a gate", async () => {
  const { ctx, selectCalls } = fakeCtx("rpc", { selectValue: undefined });
  await runSelftest(ctx, "timeout");
  assert.equal(selectCalls.length, 1);
  const opts = selectCalls[0][2] as { timeout?: number } | undefined;
  assert.equal(typeof opts?.timeout, "number", "the shape-test call must carry a timeout");
});

test("without the `timeout` argument, no timeout is ever passed to select", async () => {
  const { ctx, selectCalls } = fakeCtx("tui", { selectValue: "approve" });
  await runSelftest(ctx, "");
  assert.equal(selectCalls[0].length, 2, "a normal self-test question is a real gate question: exactly two arguments");
});

test("P-I/P-VII: runSelftest writes nothing and decides nothing — it returns a string, no side channel", async () => {
  const { ctx } = fakeCtx("tui", { selectValue: "approve" });
  const result = await runSelftest(ctx, "");
  assert.equal(typeof result, "string");
});

// FOUND BY THE FR-016 HUMAN SMOKE TEST (2026-09-22): the overlay factory returned only { render, invalidate } — no `handleInput`, no call
// to the `done` callback Pi passes as its 4th argument — so the overlay could NEVER close, and every earlier test here missed it because
// the old fake `custom()` resolved immediately regardless of what the factory returned. `fakeCtxWithRealOverlayContract` behaves like real
// Pi: it only resolves when the component calls `done`.
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
}

test("D7 (regression): the overlay component IMPLEMENTS handleInput — without it, Enter/Esc can never close the overlay", () => {
  const ctx = fakeCtxWithRealOverlayContract("approve");
  void runSelftest(ctx, ""); // runs synchronously up to the pending custom() promise, which sets ctx.ui.__component
  assert.equal(typeof ctx.ui.__component?.handleInput, "function", "the overlay component must implement handleInput to ever close");
});

test("D7 (regression): pressing ENTER (\\r) on the overlay calls done() and lets the self-test proceed to the question", async () => {
  const ctx = fakeCtxWithRealOverlayContract("approve");
  const resultPromise = runSelftest(ctx, "");
  ctx.ui.__component.handleInput("\r");
  const line = await withTimeout(resultPromise, 500, "runSelftest never resolved after Enter — the overlay is stuck (the original bug)");
  assert.match(line, /outcome=answered:approve/);
});

test("D7 (regression): pressing ESCAPE (\\x1b) on the overlay ALSO calls done() and closes it", async () => {
  const ctx = fakeCtxWithRealOverlayContract(undefined);
  const resultPromise = runSelftest(ctx, "");
  ctx.ui.__component.handleInput("\x1b");
  const line = await withTimeout(resultPromise, 500, "runSelftest never resolved after Esc — the overlay is stuck (the original bug)");
  assert.match(line, /outcome=no-answer:dismissed/);
});

test("D7: an UNRELATED key does NOT close the overlay (only Enter/Esc do)", async () => {
  const ctx = fakeCtxWithRealOverlayContract("approve");
  const resultPromise = runSelftest(ctx, "");
  ctx.ui.__component.handleInput("a");
  let settled = false;
  resultPromise.then(() => { settled = true; });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(settled, false, "an unrelated keypress must not close the overlay");
  ctx.ui.__component.handleInput("\r"); // clean up so the test doesn't leave a dangling promise
  await resultPromise;
});
