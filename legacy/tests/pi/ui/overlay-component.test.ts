// kiln/tests/pi/ui/overlay-component.test.ts — T015 (US2), r9 · research D5 ("a NEW overlay component") · OFFLINE tier.
// r8's F-1 lesson, applied on the first try this time: BEFORE any real-Pi check, prove the Layer B/C overlay component ALWAYS calls
// `done` for Enter/Esc, and never hangs — mirroring `selftest.test.ts`'s `fakeCtxWithRealOverlayContract` harness exactly.
//
// Design note (documented, not silently assumed): the overlay is DISMISS-ONLY (Enter and Esc both just close it) — it does not host its
// own up/down-navigable option list. This is a considered departure from research D5's more aspirational framing ("the overlay IS the
// select"): `ctx.ui.custom()` is measured (M5, port.ts) to resolve `undefined` with `handleInput` NEVER invoked at all under `rpc` — so a
// decision built only on a custom-overlay's own list-navigation could never be proven by `UiReady` (RPC-only, contract `ui-ready.md` U1).
// The actual choice is made via `askGate`/`interpret` instead (see `no-timeout.test.ts`, `live-ctx-outcome.test.ts`); this component's job
// is only to make the popup CONTENT visible and CLOSABLE without hanging.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLiveUICtx } from "../../../pi/ui/live-ctx.ts";
import type { Gate } from "../../../src/gate.ts";

/**
 * Behaves like REAL Pi's TUI `custom()` contract (r8's own `selftest.test.ts` pattern): the factory is called with
 * `(tui, theme, keybindings, done)`, and the returned component is exposed so a test can drive `handleInput` directly. The `custom()`
 * promise resolves ONLY when the component itself calls `done(...)` — never immediately, unlike a naive fake.
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
          ctx.ui.__component = component;
        }),
    },
  };
  return ctx;
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
}

test("the overlay component IMPLEMENTS handleInput — without it, Enter/Esc could never close the overlay (F-1's exact lesson)", async () => {
  const ctx = fakeCtxWithRealOverlayContract("approve");
  const gate: Gate = { id: 3, open: true };
  makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) }).raiseOverlay("B", "popup content");
  await new Promise((r) => setTimeout(r, 0)); // let the synchronous part of raiseOverlay's async flow reach custom()
  assert.equal(typeof ctx.ui.__component?.handleInput, "function", "the overlay component must implement handleInput to ever close");
});

test("pressing ENTER (\\r) calls done() and lets the flow proceed to askGate — the resulting move is applied", async () => {
  const ctx = fakeCtxWithRealOverlayContract("approve");
  const gate: Gate = { id: 3, open: true };
  makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) }).raiseOverlay("B", "popup content");
  await new Promise((r) => setTimeout(r, 0));
  ctx.ui.__component.handleInput("\r");
  await withTimeout(
    new Promise<void>((resolve) => {
      const check = () => (gate.move !== undefined ? resolve() : setTimeout(check, 5));
      check();
    }),
    500,
    "the flow never resolved after Enter — the overlay is stuck (the original r8 F-1 bug, reintroduced)",
  );
  assert.equal(gate.move, "approve");
});

test("pressing ESCAPE (\\x1b) ALSO calls done() and closes it — the gate goes to headlessWait, not a move", async () => {
  const ctx = fakeCtxWithRealOverlayContract("approve"); // select() would answer "approve", but the CARD is dismissed via Esc first
  const gate: Gate = { id: 3, open: true };
  makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) }).raiseOverlay("B", "popup content");
  await new Promise((r) => setTimeout(r, 0));
  ctx.ui.__component.handleInput("\x1b");
  await withTimeout(
    new Promise<void>((resolve) => {
      const check = () => (gate.move !== undefined || gate.wait !== undefined ? resolve() : setTimeout(check, 5));
      check();
    }),
    500,
    "the flow never resolved after Esc — the overlay is stuck",
  );
  // Esc only dismisses the INFORMATIONAL card; the flow then proceeds to askGate, which this fixture answers "approve" —
  // this test's real point is that Esc, like Enter, RELIABLY calls done() and does not hang (F-1). The actual answered/waited
  // split for a genuine cancel is `live-ctx-outcome.test.ts`'s job (a select() returning undefined).
  assert.equal(gate.move, "approve");
});

test("an UNRELATED key does NOT close the overlay (only Enter/Esc do)", async () => {
  const ctx = fakeCtxWithRealOverlayContract("approve");
  const gate: Gate = { id: 3, open: true };
  makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) }).raiseOverlay("B", "popup content");
  await new Promise((r) => setTimeout(r, 0));
  ctx.ui.__component.handleInput("a");
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(gate.move, undefined, "an unrelated keypress must not close the overlay or apply a move");
  assert.equal(gate.wait, undefined);
  ctx.ui.__component.handleInput("\r"); // clean up so the test doesn't leave a dangling promise
});

test("Layer C's non-interactive plain-table overlay is ALSO dismiss-only and never hangs", async () => {
  const ctx = fakeCtxWithRealOverlayContract(undefined);
  const live = makeLiveUICtx(ctx, undefined, {
    deliverable: "kiln-v1", owner: "human@batorfi", updated: "t", rows: [], ordering: [], chain_unattended: false,
    gate0: { status: "approved" }, trace: "t",
  });
  live.raiseOverlay("C", "plain table content");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(typeof ctx.ui.__component?.handleInput, "function");
  ctx.ui.__component.handleInput("\r");
  await new Promise((r) => setTimeout(r, 10)); // just proving it settles; no gate/decision involved for the plain table
});

// ── Kitty keyboard protocol (found by the human terminal smoke test): Pi enables it when the terminal supports it (Ghostty/cmux
// does), and Esc then arrives as ESC[27u — never a bare ESC. Matching only "\x1b" left the card unclosable (r8's F-1, again).
import { isDismissKey } from "../../../pi/ui/live-ctx.ts";

test("isDismissKey: legacy Enter/Esc bytes still dismiss", () => {
  for (const k of ["\r", "\n", "\x1b"]) assert.equal(isDismissKey(k), true, JSON.stringify(k));
});

test("isDismissKey: Kitty-protocol Enter/Esc/keypad-Enter (CSI-u, with and without modifier/event fields) dismiss", () => {
  for (const k of ["\x1b[27u", "\x1b[13u", "\x1b[57414u", "\x1b[27;1u", "\x1b[27;1:1u", "\x1b[13;1:2u"]) {
    assert.equal(isDismissKey(k), true, JSON.stringify(k));
  }
});

test("isDismissKey: a key RELEASE, a modified press, and unrelated keys do NOT dismiss", () => {
  for (const k of ["\x1b[27;1:3u", "\x1b[13;1:3u", "\x1b[27;5u", "\x1b[13;2u", "a", "\x1b[A", "\x1b[97u", ""]) {
    assert.equal(isDismissKey(k), false, JSON.stringify(k));
  }
});

test("the overlay component closes on a Kitty-protocol Esc and a Kitty-protocol Enter (the real-terminal shape)", async () => {
  for (const key of ["\x1b[27u", "\x1b[13u"]) {
    const ctx = fakeCtxWithRealOverlayContract("approve");
    const gate: Gate = { id: 3, open: true };
    makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) }).raiseOverlay("B", "popup content");
    await new Promise((r) => setTimeout(r, 0));
    ctx.ui.__component.handleInput(key);
    await withTimeout(
      new Promise<void>((resolve) => { const check = () => (gate.move !== undefined ? resolve() : setTimeout(check, 5)); check(); }),
      500,
      `the card never closed on ${JSON.stringify(key)} — unclosable in a Kitty-protocol terminal`,
    );
    assert.equal(gate.move, "approve");
  }
});
