// kiln/tests/pi/ui/keys.test.ts — supports T025, r9 · FR-007 · OFFLINE tier.
// `registerKeys` registers exactly the three re-declared shortcuts, each dispatching to the right `LiveUICtx` call. The fake
// `pi` here mirrors Pi's REAL `registerShortcut(key, { description?, handler })` shape (measured against the bundled
// `preset.ts`/`plan-mode/index.ts` examples) — a code-review finding (T038) found an earlier version of this fake matched
// `keys.ts`'s own (wrong) assumption instead of Pi's real one, the same class of gap `setStatus`'s bug was.
//
// `registerKeys` takes a `makeLive` FACTORY, not a pre-built `LiveUICtx` — found necessary by the human terminal smoke test:
// a shortcut registered dynamically (inside a command handler, needing a real `ctx` to build `LiveUICtx` first) never fires;
// only load-time registration does. The factory is called lazily, on first use, and memoized (these tests assert that too).
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerKeys } from "../../../pi/ui/keys.ts";
import { LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY } from "../../../ui/keymap.ts";

function fakePi() {
  const handlers = new Map<string, (ctx: unknown) => void>();
  const options = new Map<string, { description?: string; handler: (ctx: unknown) => void }>();
  return {
    pi: {
      registerShortcut: (key: string, opts: { description?: string; handler: (ctx: unknown) => void }) => {
        options.set(key, opts);
        handlers.set(key, opts.handler);
      },
    },
    handlers,
    options,
  };
}

function fakeLive() {
  const calls: { layer: string; content: string | null }[] = [];
  const live = { hasUI: true, setStatus: () => {}, raiseOverlay: (layer: "A" | "B" | "C", content?: string | null) => calls.push({ layer, content: content ?? null }) };
  return { live, calls };
}

test("registers exactly the three re-declared keys, each with an options object carrying a handler (Pi's real shape)", () => {
  const { pi, handlers, options } = fakePi();
  const { live } = fakeLive();
  registerKeys(pi, () => live, { layerBContent: () => "b", layerCContent: () => "c" });
  assert.deepEqual([...handlers.keys()].sort(), [LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY].sort());
  for (const key of [LAYERB_KEY, LAYERC_KEY, TOGGLE_KEY]) {
    assert.equal(typeof options.get(key)?.handler, "function", `${key} must be registered with a { handler } options object`);
  }
});

test("registerKeys itself never calls makeLive — it is deferred to the FIRST shortcut press (load-time registration, no ctx needed yet)", () => {
  const { pi } = fakePi();
  let makeLiveCalls = 0;
  registerKeys(pi, () => { makeLiveCalls++; return fakeLive().live; }, { layerBContent: () => "b", layerCContent: () => "c" });
  assert.equal(makeLiveCalls, 0, "registerKeys must not construct LiveUICtx before any shortcut has fired");
});

test("LAYERB_KEY raises Layer B with the given content, and the handler accepts a ctx argument (passed through to makeLive)", () => {
  const { pi, handlers } = fakePi();
  const { live, calls } = fakeLive();
  let receivedCtx: unknown;
  registerKeys(pi, (ctx) => { receivedCtx = ctx; return live; }, { layerBContent: () => "popup content", layerCContent: () => "overlay content" });
  handlers.get(LAYERB_KEY)!({ fakeCtx: true }); // Pi always calls the handler WITH a ctx argument
  assert.deepEqual(calls, [{ layer: "B", content: "popup content" }]);
  assert.deepEqual(receivedCtx, { fakeCtx: true });
});

test("LAYERC_KEY raises Layer C with the given content", () => {
  const { pi, handlers } = fakePi();
  const { live, calls } = fakeLive();
  registerKeys(pi, () => live, { layerBContent: () => "popup content", layerCContent: () => "overlay content" });
  handlers.get(LAYERC_KEY)!({ fakeCtx: true });
  assert.deepEqual(calls, [{ layer: "C", content: "overlay content" }]);
});

test("TOGGLE_KEY dismisses BOTH B and C", () => {
  const { pi, handlers } = fakePi();
  const { live, calls } = fakeLive();
  registerKeys(pi, () => live, { layerBContent: () => "b", layerCContent: () => "c" });
  handlers.get(TOGGLE_KEY)!({ fakeCtx: true });
  assert.deepEqual(calls, [{ layer: "B", content: null }, { layer: "C", content: null }]);
});

test("makeLive is called ONCE and memoized — pressing multiple shortcuts reuses the SAME LiveUICtx instance (required for mutual exclusion to persist)", () => {
  const { pi, handlers } = fakePi();
  let makeLiveCalls = 0;
  const { live } = fakeLive();
  registerKeys(pi, () => { makeLiveCalls++; return live; }, { layerBContent: () => "b", layerCContent: () => "c" });
  handlers.get(LAYERB_KEY)!({ fakeCtx: true });
  handlers.get(LAYERC_KEY)!({ fakeCtx: true });
  handlers.get(TOGGLE_KEY)!({ fakeCtx: true });
  assert.equal(makeLiveCalls, 1, "makeLive must be called exactly once, no matter how many different shortcuts fire");
});
