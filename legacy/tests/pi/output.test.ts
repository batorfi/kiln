// kiln/tests/pi/output.test.ts — T026, r8 · contracts/pi-extension.md E4 · SQ11 (measured: rpc/json/print all land on stderr via console.log,
// notify prints nothing there) · OFFLINE tier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emit } from "../../pi/output.ts";

function captureConsole() {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...a: unknown[]) => lines.push(a.map(String).join(" "));
  return { lines, restore: () => { console.log = orig; } };
}

function fakeCtx(mode: string | undefined) {
  const notified: { message: string; level?: string }[] = [];
  return { ctx: { mode, hasUI: mode === "tui" || mode === "rpc", cwd: "/x", ui: { notify: (m: string, l?: string) => notified.push({ message: m, level: l }) } } as any, notified };
}

for (const mode of ["tui", "rpc"]) {
  test(`E4: mode=${mode} -> emit uses ctx.ui.notify`, () => {
    const { ctx, notified } = fakeCtx(mode);
    const cap = captureConsole();
    try { emit(ctx, "KILN status hello"); } finally { cap.restore(); }
    assert.deepEqual(notified, [{ message: "KILN status hello", level: "info" }]);
    assert.deepEqual(cap.lines, [], `${mode} must not also print to console`);
  });
}

for (const mode of ["print", "json"]) {
  test(`E4: mode=${mode} -> emit uses console.log (measured: this is where it reaches, ends up on stderr in real Pi)`, () => {
    const { ctx, notified } = fakeCtx(mode);
    const cap = captureConsole();
    try { emit(ctx, "KILN status hello"); } finally { cap.restore(); }
    assert.deepEqual(cap.lines, ["KILN status hello"]);
    assert.deepEqual(notified, [], `${mode} must not call notify (measured: it prints nothing there)`);
  });
}

test("E4: an unknown mode falls back to console.log (fail-safe: something reaches a human)", () => {
  const { ctx } = fakeCtx("web-thing-from-the-future");
  const cap = captureConsole();
  try { emit(ctx, "KILN status hello"); } finally { cap.restore(); }
  assert.deepEqual(cap.lines, ["KILN status hello"]);
});

test("E4: emit is a plain pass-through — it neither strips nor adds bytes (ASCII-only formatting is the CALLER's contract, verified in status.test.ts)", () => {
  const { ctx } = fakeCtx("print");
  const cap = captureConsole();
  const escapeByte = String.fromCharCode(27);
  const withEscape = "KILN status " + escapeByte + "[31mred" + escapeByte + "[0m";
  try { emit(ctx, withEscape); } finally { cap.restore(); }
  assert.equal(cap.lines[0], withEscape);
});
