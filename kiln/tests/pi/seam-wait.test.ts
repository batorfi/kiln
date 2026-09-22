// kiln/tests/pi/seam-wait.test.ts — T019, r8 · FR-006, FR-009 · contracts/pi-seam.md S5 · P-I, P-VII · OFFLINE tier.
// `no-answer` -> a durable Wait built by r1's OWN `headlessWait` (no second path); `answered` -> returned UNAPPLIED. The seam never calls
// applyMove/autoApprove/resumeByToken/makePreDelegation and imports no log writer — so a scripted reply is STRUCTURALLY unable to become
// `human@…` (r8 writes no gate decision, FR-009).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveAsk } from "../../pi/outcome.ts";
import type { Gate } from "../../src/gate.ts";

const outcomeSrc = readFileSync(fileURLToPath(new URL("../../pi/outcome.ts", import.meta.url)), "utf8");

function freshGate(): Gate {
  return { id: 3 as any, open: true };
}

test("S5: no-answer -> resolveAsk returns r1's real Wait shape, and leaves it set on gate.wait", async () => {
  const gate = freshGate();
  const ctx: any = { mode: "json", hasUI: false, cwd: "/x", ui: { select: async () => undefined } };
  const result = await resolveAsk(ctx, gate, { title: "Gate?", options: ["approve", "reject"] });
  assert.equal((result as any).kind, "wait");
  const wait = (result as any).wait;
  assert.equal(wait.gate, "3");
  assert.match(wait.token, /^g[0-9a-f]+$/, `token must be r1's real token shape, got ${wait.token}`);
  assert.equal(typeof wait.deadline, "string");
  assert.deepEqual(gate.wait, wait, "the gate object itself carries the wait (headlessWait's own contract)");
  assert.equal(gate.open, true, "a wait does not close the gate");
  assert.equal(gate.decidedBy, undefined, "no decidedBy anywhere — not even a placeholder");
  assert.equal(gate.move, undefined);
});

test("S5: answered -> the option is returned UNAPPLIED — the gate object is untouched", async () => {
  const gate = freshGate();
  const ctx: any = { mode: "tui", hasUI: true, cwd: "/x", ui: { select: async () => "approve" } };
  const result = await resolveAsk(ctx, gate, { title: "Gate?", options: ["approve", "reject"] });
  assert.deepEqual(result, { kind: "answered", option: "approve" });
  assert.deepEqual(gate, { id: 3, open: true }, "the gate is byte-for-byte unchanged: no wait, no move, no decidedBy");
});

test("FR-009: a SCRIPTED reply can never carry a decidedBy — resolveAsk's result never has that shape", async () => {
  const gate = freshGate();
  const ctx: any = { mode: "tui", hasUI: true, cwd: "/x", ui: { select: async () => "approve" } };
  const result: any = await resolveAsk(ctx, gate, { title: "Gate?", options: ["approve"] });
  assert.equal("decidedBy" in result, false);
  assert.equal("decidedBy" in (result.wait ?? {}), false);
});

test("FR-009 (static purity): kiln/pi/outcome.ts imports NONE of applyMove, autoApprove, resumeByToken, makePreDelegation, and no log writer", () => {
  for (const forbidden of ["applyMove", "autoApprove", "resumeByToken", "makePreDelegation"]) {
    assert.doesNotMatch(outcomeSrc, new RegExp(`\\b${forbidden}\\b`), `outcome.ts must not reference ${forbidden}`);
  }
  assert.doesNotMatch(outcomeSrc, /log-writer|writeRecord|appendRecord/i, "outcome.ts must not import a log writer");
  assert.match(outcomeSrc, /headlessWait/, "outcome.ts DOES use r1's real headlessWait — no second Wait mechanism is invented");
});

test("FR-009: outcome.ts imports only port.ts and gate.ts (no wider surface to smuggle a decision through)", () => {
  const specifiers = [...outcomeSrc.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  for (const s of specifiers) assert.match(s, /\.\.\/pi\/port\.ts$|\.\/port\.ts$|\.\.\/src\/gate\.ts$/, `unexpected import in outcome.ts: ${s}`);
});
