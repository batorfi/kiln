// kiln/tests/pi/extension.test.ts — T024, r8 · FR-004 · contracts/pi-extension.md E1/E6 · OFFLINE tier.
// The factory registers EXACTLY two commands and NOTHING else — no events, tools, shortcuts, flags, providers — starts nothing, and holds no
// module-level mutable state (measured D12: Pi re-runs a factory on new_session, and module state survives across that re-run — so any state
// kept there would drift). Safe under /reload: two independent calls must not double-register or share state.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeKilnExtension } from "../../pi/index.ts";

const piDir = fileURLToPath(new URL("../../pi", import.meta.url)).replace(/[\\/]$/, "");

function fakeApi() {
  const calls: { method: string; args: unknown[] }[] = [];
  const api = new Proxy(
    {},
    {
      get(_t, prop: string) {
        return (...args: unknown[]) => { calls.push({ method: prop, args }); };
      },
    },
  ) as Record<string, (...a: unknown[]) => void>;
  return { api, calls };
}

test("E1: registers EXACTLY registerCommand('kiln-status', …) and registerCommand('kiln-selftest', …) — nothing else", () => {
  const { api, calls } = fakeApi();
  makeKilnExtension()(api as any);
  const methods = calls.map((c) => c.method);
  assert.deepEqual(methods, ["registerCommand", "registerCommand"], `factory called: ${methods.join(", ")}`);
  const names = calls.map((c) => c.args[0]);
  assert.deepEqual(new Set(names), new Set(["kiln-status", "kiln-selftest"]));
});

test("E1: each registration carries a description and a handler function", () => {
  const { api, calls } = fakeApi();
  makeKilnExtension()(api as any);
  for (const c of calls) {
    const opts = c.args[1] as { description?: string; handler?: unknown };
    assert.equal(typeof opts.description, "string");
    assert.equal(typeof opts.handler, "function");
  }
});

test("E1: calling makeKilnExtension() TWICE yields two independent, state-free registrations (safe under /reload)", () => {
  const first = fakeApi(); makeKilnExtension()(first.api as any);
  const second = fakeApi(); makeKilnExtension()(second.api as any);
  assert.deepEqual(first.calls.map((c) => c.args[0]), second.calls.map((c) => c.args[0]));
});

test("E1: accepts an `overrides` object without registering anything extra (used only by PiReady's mutant fixtures)", () => {
  const { api, calls } = fakeApi();
  makeKilnExtension({ interpret: () => ({ kind: "no-answer", reason: "cannot-ask" }) })(api as any);
  assert.equal(calls.length, 2);
});

test("E6 (static): kiln/pi/*.ts contains no setTimeout/setInterval/fetch/spawn/createServer, and no module-level let/mutable state", () => {
  for (const f of readdirSync(piDir)) {
    if (!f.endsWith(".ts")) continue;
    const text = readFileSync(join(piDir, f), "utf8");
    for (const bad of [/\bsetTimeout\s*\(/, /\bsetInterval\s*\(/, /\bfetch\s*\(/, /\bspawn\w*\s*\(/, /\bcreateServer\s*\(/]) {
      assert.doesNotMatch(text, bad, `${f} matches forbidden pattern ${bad}`);
    }
    // module-level `let` — a line starting with `let ` at column 0 (not inside a function/block), a cheap but effective proxy here.
    const lines = text.split("\n");
    lines.forEach((line, i) => assert.doesNotMatch(line, /^let\s+\w/, `${f}:${i + 1} has a module-level 'let' (mutable state)`));
  }
});

test("E1 (static): only index.ts CALLS registerCommand — port.ts's type declaration doesn't count as a call", () => {
  for (const f of readdirSync(piDir)) {
    if (!f.endsWith(".ts") || f === "index.ts" || f === "port.ts") continue;
    const text = readFileSync(join(piDir, f), "utf8");
    assert.doesNotMatch(text, /registerCommand/, `${f} must not register a command itself`);
  }
  const port = readFileSync(join(piDir, "port.ts"), "utf8");
  assert.doesNotMatch(port, /\.registerCommand\s*\(/, "port.ts may DECLARE the member but must not CALL it");
});
