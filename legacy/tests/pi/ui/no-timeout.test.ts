// kiln/tests/pi/ui/no-timeout.test.ts — T014 (US2), r9 · reuses r8's pattern · FR-008/P-IX carried forward · OFFLINE tier.
// A gate waits for a human, not a clock. Neither the `ctx.ui.select` call (via `askGate`, r8's, imported) nor the `ctx.ui.custom` overlay
// built by Layer B/C's flow ever carries a `timeout` — a static check on live-ctx.ts's own source, plus a runtime check on the fake ctx's
// captured call arguments (both `select` and `custom` are called with NO extra options beyond `{overlay: true}`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { makeLiveUICtx } from "../../../pi/ui/live-ctx.ts";
import type { Gate } from "../../../src/gate.ts";

const liveCtxSource = readFileSync(fileURLToPath(new URL("../../../pi/ui/live-ctx.ts", import.meta.url)), "utf8");

test("static: live-ctx.ts's source never uses a `timeout` field/argument anywhere in code (comments may explain the absence)", () => {
  assert.doesNotMatch(liveCtxSource, /\btimeout\s*[:=]/i);
});

test("static: live-ctx.ts calls askGate (r8's, imported) — it does not construct its own select() call with extra arguments", () => {
  assert.match(liveCtxSource, /import\s*\{[^}]*\baskGate\b[^}]*\}\s*from\s*["']\.\.\/outcome\.ts["']/);
  assert.match(liveCtxSource, /askGate\(piCtx, opts\.question\)/);
});

function fakeCtxCapturingArgs(mode: string) {
  const selectCalls: unknown[][] = [];
  const customCalls: unknown[][] = [];
  const ctx: any = {
    mode,
    hasUI: mode === "tui" || mode === "rpc",
    cwd: "/x",
    ui: {
      select: async (...args: unknown[]) => { selectCalls.push(args); return undefined; },
      notify: () => {},
      custom: (...args: unknown[]) => {
        customCalls.push(args);
        const factory = args[0] as (...a: unknown[]) => { handleInput?(d: string): void };
        return new Promise((resolve) => {
          const component = factory({}, {}, {}, (v: unknown) => resolve(v));
          component.handleInput?.("\r"); // a real terminal (tui) dismisses the informational card immediately
        });
      },
    },
  };
  return { ctx, selectCalls, customCalls };
}

test("runtime: the select() call carries EXACTLY (title, options) — no third argument, no timeout", async () => {
  const { ctx, selectCalls } = fakeCtxCapturingArgs("rpc");
  const gate: Gate = { id: 3, open: true };
  const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) });
  live.raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(selectCalls.length, 1);
  assert.equal(selectCalls[0].length, 2, "askGate must call select() with exactly two arguments — no timeout");
});

test("runtime: the custom() call's options never carry a timeout field", async () => {
  const { ctx, customCalls } = fakeCtxCapturingArgs("tui");
  const gate: Gate = { id: 3, open: true };
  const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: true, decidedBy: "human@batorfi" }) });
  live.raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(customCalls.length, 1);
  const opts = customCalls[0][1] as Record<string, unknown> | undefined;
  assert.equal(opts?.timeout, undefined);
  assert.deepEqual(opts, { overlay: true });
});
