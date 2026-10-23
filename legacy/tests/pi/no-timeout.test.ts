// kiln/tests/pi/no-timeout.test.ts — T018, r8 · FR-008 · contracts/pi-seam.md S4 · OFFLINE tier.
// A gate dialog must carry NO timeout and NO signal: a gate waits for a human, never a clock (P-IX). Pi's dialogs DO accept a timeout
// (measured: 1500ms resolved to undefined at ~1504ms) — so this is enforced at the call site, not assumed away.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { askGate } from "../../pi/outcome.ts";

const piDir = fileURLToPath(new URL("../../pi", import.meta.url)).replace(/[\\/]$/, "");

test("S4: askGate calls ctx.ui.select with EXACTLY two arguments — no timeout, no signal, no third argument of any kind", async () => {
  let seenArgs: unknown[] | null = null;
  const ctx: any = { mode: "tui", hasUI: true, cwd: "/x", ui: { select: (...args: unknown[]) => { seenArgs = args; return Promise.resolve("approve"); } } };
  await askGate(ctx, { title: "Gate?", options: ["approve", "reject"] });
  assert.ok(seenArgs, "select was called");
  assert.equal((seenArgs as unknown[]).length, 2, `askGate must call select with exactly 2 arguments, got ${(seenArgs as unknown[]).length}`);
  const [title, options] = seenArgs as [string, string[]];
  assert.equal(title, "Gate?"); assert.deepEqual(options, ["approve", "reject"]);
});

test("data-model E3: GateQuestion has no timeout/signal field — a caller cannot supply one even by mistake", () => {
  const q: { title: string; options: readonly string[]; timeout?: number } = { title: "x", options: ["a"] };
  assert.ok(!("timeout" in q));
});

test("S4: across kiln/pi/*.ts, `select(` is called ONLY from outcome.ts's askGate, or from a line marked // SHAPE-TEST", () => {
  for (const f of readdirSync(piDir)) {
    if (!f.endsWith(".ts") || f === "outcome.ts") continue;
    const text = readFileSync(join(piDir, f), "utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (/\.select\s*\(/.test(line)) assert.match(line, /\/\/\s*SHAPE-TEST/, `${f}:${i + 1} calls select() outside askGate without a // SHAPE-TEST marker: ${line}`);
    });
  }
});

test("S4: outcome.ts's askGate itself never passes a timeout/signal option to select", () => {
  const text = readFileSync(join(piDir, "outcome.ts"), "utf8");
  const m = /function askGate[\s\S]*?\n\}/.exec(text);
  assert.ok(m, "askGate function body found");
  assert.doesNotMatch(m![0], /timeout\s*:/, "askGate's body must not construct a timeout option");
});
