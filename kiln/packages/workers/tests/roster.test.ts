// r16 T006/T008 — the provisional roster: shape, tier binding (constitution II) and tool resolution, all refused before
// any pi-ai call exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { flows } from "#contracts/flow/index.ts";
import {
  PROVISIONAL_ROSTER,
  bindConversationRole,
  resolveTools,
  toolsFor,
  UnknownRoleError,
  UnknownToolError,
} from "#workers/roster.ts";
import { bindRole, TierPolicyError } from "#contracts/roles.ts";
import { PROVISIONAL_JUDGES } from "#workers/roster.ts";

const roster = flows.v1.roster;

test("the judge entry's tier is strongest", () => {
  assert.equal(PROVISIONAL_ROSTER.reviewer.judge, true);
  assert.equal(PROVISIONAL_ROSTER.reviewer.tier, "strongest");
  assert.equal(PROVISIONAL_ROSTER.worker.judge, false);
});

test("the module's own file header states it is provisional and r17 replaces it", () => {
  const src = readFileSync(fileURLToPath(new URL("../src/roster.ts", import.meta.url)), "utf8");
  assert.match(src, /PROVISIONAL/);
  assert.match(src, /r17/);
});

test("the judge tier policy refuses a weaker binding for 'reviewer', before any call exists (constitution II)", () => {
  // the lower-level guard bindConversationRole calls internally: proves a weaker binding is refused for this row's own
  // judge role, independent of what tier the real PROVISIONAL_ROSTER entry happens to declare
  assert.throws(() => bindRole("reviewer", "standard", roster, PROVISIONAL_JUDGES), TierPolicyError);
  assert.doesNotThrow(() => bindRole("reviewer", "strongest", roster, PROVISIONAL_JUDGES));
});

test("bindConversationRole binds the real roster entry for 'reviewer' at strongest", () => {
  const bound = bindConversationRole("reviewer", roster);
  assert.equal(bound.tier, "strongest");
});

test("bindConversationRole accepts a non-judge producer at its roster tier", () => {
  const bound = bindConversationRole("worker", roster);
  assert.equal(bound.tier, "standard");
  assert.ok(bound.timeoutMs > 0);
});

test("an unknown role is refused by name", () => {
  assert.throws(() => bindConversationRole("nonexistent-role", roster), UnknownRoleError);
});

test("toolsFor resolves a role's declared tools against tools.ts's declared set", () => {
  const tools = toolsFor("worker");
  assert.deepEqual(tools.map((t) => t.name).sort(), ["read-file", "write-file"]);
});

test("toolsFor's underlying guard refuses an undeclared tool name here, not mid-generation (PROVISIONAL_ROSTER itself never names one — this proves the guard, not today's roster contents)", () => {
  assert.throws(() => resolveTools(["shell-exec"], "worker"), (e: unknown) => {
    assert.ok(e instanceof UnknownToolError);
    assert.match((e as Error).message, /shell-exec/);
    assert.match((e as Error).message, /worker/);
    return true;
  });
  // the real roster's own tools all resolve cleanly through the same function toolsFor calls
  assert.deepEqual(toolsFor("reviewer").map((t) => t.name), ["read-file"]);
});
