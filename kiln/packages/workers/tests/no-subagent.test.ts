// r16 T021 (US1) — WORK-3/FR-003: workers have no subagent tool. Proven by a source-level scan (mirroring
// `checks/boundaries.ts`'s own technique, `lex.ts`'s shared tokenizer) of every tool `tools.ts` declares: none of
// them imports `conversation.ts` (the only place a conversation is opened) or `pi-ai`'s request/provider surface —
// so no tool, however it is called, could ever open another conversation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { moduleSpecifiers, tokenize } from "#checks/lex.ts";
import { TOOLS } from "#workers/tools.ts";

const toolsSrc = readFileSync(fileURLToPath(new URL("../src/tools.ts", import.meta.url)), "utf8");

test("tools.ts declares at least the roster's tools, so this scan is never vacuous", () => {
  assert.ok(Object.keys(TOOLS).length > 0);
});

test("tools.ts imports nothing that could open a conversation: no conversation.ts, no pi-ai, no provider.ts", () => {
  const specifiers = moduleSpecifiers(tokenize(toolsSrc));
  assert.ok(specifiers.length > 0, "the scan must examine at least one real import — a file with none proves nothing");
  for (const spec of specifiers) {
    assert.doesNotMatch(spec, /conversation\.ts$/, `tools.ts must never import conversation.ts (${spec})`);
    assert.doesNotMatch(spec, /^@earendil-works\/pi-ai/, `tools.ts must never import pi-ai's request surface (${spec})`);
    assert.doesNotMatch(spec, /provider\.ts$/, `tools.ts must never import provider.ts (${spec})`);
  }
});

test("every declared tool's run() is a plain async function — not conversation.ts's runTurn or createWorkers, reachable only by name", () => {
  for (const [name, decl] of Object.entries(TOOLS)) {
    assert.equal(typeof decl.run, "function", `${name}'s run must be a function`);
    assert.doesNotMatch(decl.run.name, /runTurn|createWorkers/, `${name}'s run must not be (or alias) the conversation-opening functions`);
  }
});
