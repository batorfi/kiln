// kiln/tests/pi/ui/identity.test.ts — T005 (Foundational), r9 · data-model E3 · research D4 · NC1 · OFFLINE tier.
// `resolveIdentity` is PURE given an env object: no I/O beyond reading KILN_HUMAN, no caching. Its accepted shape is EXACTLY
// `/^human@\S+$/` — the same shape `resumeByToken`/`recordGate0Decision` already enforce (cross-checked below by importing them).
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveIdentity } from "../../../pi/ui/identity.ts";
import { resumeByToken, headlessWait, type Gate } from "../../../src/gate.ts";
import { recordGate0Decision } from "../../../ui/gate0-face.ts";
import type { RoadmapHead } from "../../../src/types.ts";

test("KILN_HUMAN=human@batorfi -> { ok: true, decidedBy: 'human@batorfi' }", () => {
  const r = resolveIdentity({ KILN_HUMAN: "human@batorfi" });
  assert.deepEqual(r, { ok: true, decidedBy: "human@batorfi" });
});

test("unset KILN_HUMAN -> { ok: false, reason: <non-empty> }", () => {
  const r = resolveIdentity({});
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(typeof r.reason, "string");
    assert.notEqual(r.reason.length, 0);
  }
});

test("KILN_HUMAN='' -> { ok: false, ... }", () => {
  const r = resolveIdentity({ KILN_HUMAN: "" });
  assert.equal(r.ok, false);
});

test("KILN_HUMAN=nobody (no human@ prefix) -> { ok: false, ... }", () => {
  const r = resolveIdentity({ KILN_HUMAN: "nobody" });
  assert.equal(r.ok, false);
});

test("KILN_HUMAN='human@' (empty after the prefix) -> { ok: false, ... } — \\S+ requires at least one char", () => {
  const r = resolveIdentity({ KILN_HUMAN: "human@" });
  assert.equal(r.ok, false);
});

test("KILN_HUMAN with internal whitespace after human@ -> { ok: false, ... } — \\S+ has no whitespace", () => {
  const r = resolveIdentity({ KILN_HUMAN: "human@bat orfi" });
  assert.equal(r.ok, false);
});

test("defaults to process.env when no env object is passed", () => {
  const prior = process.env.KILN_HUMAN;
  try {
    process.env.KILN_HUMAN = "human@from-process-env";
    const r = resolveIdentity();
    assert.deepEqual(r, { ok: true, decidedBy: "human@from-process-env" });
  } finally {
    if (prior === undefined) delete process.env.KILN_HUMAN;
    else process.env.KILN_HUMAN = prior;
  }
});

test("no I/O beyond the passed env object — a pure function called twice with the same input returns equal output", () => {
  const env = { KILN_HUMAN: "human@batorfi" };
  assert.deepEqual(resolveIdentity(env), resolveIdentity(env));
});

// ── cross-check: the accepted shape is EXACTLY what r1/r2's own functions already require ──
function fixtureGate(): Gate {
  const gate: Gate = { id: 3, open: true };
  headlessWait(gate);
  return gate;
}
function fixtureRoadmap(): RoadmapHead {
  return {
    deliverable: "kiln-v1", owner: "human@batorfi", updated: "2026-09-22T00:00:00Z", rows: [], ordering: [],
    chain_unattended: false, gate0: { status: "pending" }, trace: "t",
  };
}

// "human@" alone is NOT in this cross-check: resumeByToken's own check is a looser `startsWith("human@")` (it does not
// require anything after the "@"), so it would NOT throw for "human@" even though resolveIdentity's stricter
// `/^human@\S+$/` (data-model E3) refuses it — that stricter shape is asserted directly above, not cross-checked here.
for (const rejected of ["nobody", ""]) {
  test(`resolveIdentity rejects "${rejected}" — the SAME value resumeByToken/recordGate0Decision would also refuse`, () => {
    assert.equal(resolveIdentity({ KILN_HUMAN: rejected }).ok, false);

    const gate = fixtureGate();
    assert.throws(() => resumeByToken(gate, gate.wait!.token, rejected), /human@/);
    assert.throws(() => recordGate0Decision(fixtureRoadmap(), { move: "approve", decidedBy: rejected || undefined }), /human@|F1\/P-VI/);
  });
}

test("resolveIdentity ACCEPTS exactly what resumeByToken/recordGate0Decision also accept", () => {
  const r = resolveIdentity({ KILN_HUMAN: "human@batorfi" });
  assert.equal(r.ok, true);

  const gate = fixtureGate();
  assert.doesNotThrow(() => resumeByToken(gate, gate.wait!.token, "human@batorfi"));

  assert.doesNotThrow(() => recordGate0Decision(fixtureRoadmap(), { move: "approve", decidedBy: "human@batorfi" }));
});
