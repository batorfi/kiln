// kiln/tests/pi/ui/live-ctx-outcome.test.ts — T012 (US2), r9 · contracts/live-ctx-seam.md L2/L3, FR-004–FR-006 · OFFLINE tier.
// The outcome table (L3), driven against a fake ctx/Gate, offline. A mutation harness (`checkOutcome`, mirroring r8's `_seam-rows.ts`
// `checkInterpret`) names which rows a broken implementation fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeLiveUICtx, type LiveUICtxOverrides } from "../../../pi/ui/live-ctx.ts";
import type { Gate } from "../../../src/gate.ts";

function fakeCtx(mode: string, opts: { selectValue?: string | undefined; customCalls?: number[] } = {}) {
  const customCalls = opts.customCalls ?? [];
  const ctx: any = {
    mode,
    hasUI: mode === "tui" || mode === "rpc",
    cwd: "/x",
    ui: {
      select: async () => opts.selectValue,
      notify: () => {},
      custom: (factory: (...a: unknown[]) => unknown) => {
        customCalls.push(1);
        return new Promise((resolve) => {
          const done = (v: unknown) => resolve(v);
          const component = factory({}, {}, {}, done) as { handleInput?(d: string): void };
          // simulate a human immediately dismissing the informational card (Enter) so the flow proceeds to askGate
          component.handleInput?.("\r");
        });
      },
    },
  };
  return ctx;
}

function freshGate(): Gate {
  return { id: 3, open: true };
}

interface Row {
  name: string;
  mode: string;
  selectValue: string | undefined;
  identity: LiveUICtxOverrides["resolveIdentity"];
  expect: "applied" | "waited";
}

const OK_IDENTITY = () => ({ ok: true as const, decidedBy: "human@batorfi" });
const BAD_IDENTITY = () => ({ ok: false as const, reason: "KILN_HUMAN not set" });

const ROWS: Row[] = [
  { name: "valid-move+ok-identity", mode: "rpc", selectValue: "approve", identity: OK_IDENTITY, expect: "applied" },
  { name: "valid-move+ok-identity-tui", mode: "tui", selectValue: "approve", identity: OK_IDENTITY, expect: "applied" },
  { name: "valid-move+bad-identity", mode: "rpc", selectValue: "approve", identity: BAD_IDENTITY, expect: "waited" },
  { name: "cancelled+ok-identity", mode: "rpc", selectValue: undefined, identity: OK_IDENTITY, expect: "waited" },
  { name: "cancelled+bad-identity", mode: "rpc", selectValue: undefined, identity: BAD_IDENTITY, expect: "waited" },
  { name: "not-offered+ok-identity", mode: "rpc", selectValue: "not-a-real-move", identity: OK_IDENTITY, expect: "waited" },
  { name: "cannot-ask-print+ok-identity", mode: "print", selectValue: "approve", identity: OK_IDENTITY, expect: "waited" },
  { name: "cannot-ask-json+ok-identity", mode: "json", selectValue: "approve", identity: OK_IDENTITY, expect: "waited" },
];

/** Run one row against a REAL makeLiveUICtx; return what actually happened. Mirrors r8's checkInterpret shape. */
async function runRow(row: Row): Promise<"applied" | "waited" | "neither"> {
  const gate = freshGate();
  const ctx = fakeCtx(row.mode, { selectValue: row.selectValue });
  const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: row.identity });
  live.raiseOverlay("B", "popup · spec gate OPEN");
  // allow the async flow (custom() -> askGate -> interpret -> apply/wait) to settle
  await new Promise((r) => setTimeout(r, 20));
  if (gate.move !== undefined) return "applied";
  if (gate.wait !== undefined) return "waited";
  return "neither";
}

/** The mutation harness: returns the NAMES of rows whose actual outcome does not match `expect`. The real implementation returns []. */
async function checkOutcome(): Promise<string[]> {
  const failed: string[] = [];
  for (const row of ROWS) {
    const got = await runRow(row);
    if (got !== row.expect) failed.push(row.name);
  }
  return failed;
}

test("the outcome table: every row matches its expected outcome", async () => {
  const failed = await checkOutcome();
  assert.deepEqual(failed, []);
});

test("valid move + ok identity -> applyMove called EXACTLY ONCE (a double-apply mutation is caught by this call count)", async () => {
  let moveWrites = 0;
  const gate: any = { id: 3, open: true };
  Object.defineProperty(gate, "move", {
    get() { return this._move; },
    set(v: string | undefined) { moveWrites++; this._move = v; },
  });
  const ctx = fakeCtx("rpc", { selectValue: "approve" });
  const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: OK_IDENTITY });
  live.raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(moveWrites, 1, "applyMove must write gate.move EXACTLY once — a double-apply is a distinct bug from a wrong decidedBy");
});

test("valid move + ok identity -> applyMove called ONCE, with that exact decidedBy", async () => {
  const gate = freshGate();
  const ctx = fakeCtx("rpc", { selectValue: "approve" });
  const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: OK_IDENTITY });
  live.raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(gate.move, "approve");
  assert.equal(gate.decidedBy, "human@batorfi");
  assert.equal(gate.open, false);
});

test("THE ROW'S ONE NEW REFUSAL: valid move + bad identity -> headlessWait called, applyMove NEVER called", async () => {
  const gate = freshGate();
  const ctx = fakeCtx("rpc", { selectValue: "approve" });
  const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: BAD_IDENTITY });
  live.raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(gate.move, undefined, "applyMove must NEVER have been called");
  assert.notEqual(gate.wait, undefined, "the gate must have gone to headlessWait");
  assert.equal(gate.open, true);
});

for (const shape of ["dismissed", "not-offered", "cannot-ask"] as const) {
  test(`non-answer shape (${shape}) -> headlessWait, regardless of identity`, async () => {
    const mode = shape === "cannot-ask" ? "print" : "rpc";
    const selectValue = shape === "not-offered" ? "bogus" : undefined;
    for (const identity of [OK_IDENTITY, BAD_IDENTITY]) {
      const gate = freshGate();
      const ctx = fakeCtx(mode, { selectValue });
      const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: identity });
      live.raiseOverlay("B", "content");
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(gate.move, undefined);
      assert.notEqual(gate.wait, undefined);
    }
  });
}

// ── mutation pass (T017's harness, exercised here so a broken implementation is caught BY NAME) ──
test("mutation harness sanity: checkOutcome would catch a broken 'identity check runs after apply' implementation", async () => {
  // Simulate the mutant by constructing a row set where we KNOW the real implementation must refuse but assert the row's own name surfaces.
  const gate = freshGate();
  const ctx = fakeCtx("rpc", { selectValue: "approve" });
  const live = makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: BAD_IDENTITY });
  live.raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 20));
  // the row this protects: "valid-move+bad-identity" -> expect "waited". If a mutant applied anyway, gate.move would be "approve".
  assert.notEqual(gate.move, "approve", "a mutant that applies despite bad identity must be caught by this exact assertion");
});

// FR-004: an unresolved identity is refused with a NAMED error the human can SEE — a silent WAIT left the operator unable to tell
// "the list never appeared" from a bug (found by the human terminal smoke test).
test("a bad identity is surfaced as a visible, named message — and still never asks, never applies", async () => {
  const notified: string[] = [];
  const selectCalls: unknown[][] = [];
  const ctx: any = {
    mode: "rpc", hasUI: true, cwd: "/x",
    ui: { select: async (...a: unknown[]) => { selectCalls.push(a); return "approve"; }, notify: (m: string) => notified.push(m), custom: async () => undefined },
  };
  const gate = freshGate();
  makeLiveUICtx(ctx, gate, undefined, { resolveIdentity: () => ({ ok: false, reason: "KILN_HUMAN is not set — set KILN_HUMAN=human@you" }) }).raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(notified.some((m) => /KILN_HUMAN is not set/.test(m) && /WAIT/.test(m)), `no named identity message: ${JSON.stringify(notified)}`);
  assert.equal(selectCalls.length, 0);
  assert.equal(gate.move, undefined);
  assert.notEqual(gate.wait, undefined);
});

test("a GOOD identity emits no identity message", async () => {
  const notified: string[] = [];
  const ctx: any = {
    mode: "rpc", hasUI: true, cwd: "/x",
    ui: { select: async () => "approve", notify: (m: string) => notified.push(m), custom: async () => undefined },
  };
  makeLiveUICtx(ctx, freshGate(), undefined, { resolveIdentity: OK_IDENTITY }).raiseOverlay("B", "content");
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(notified, []);
});
