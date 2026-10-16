// kiln/tests/pi/ui/ui-ready.test.ts — T026, r9 · contract `ui-ready.md` U2, U3 · gated by `kiln/tests/_pi-gate.ts` (r8's D8 pattern).
// Every test here is named `PI-LIVE: …` so `--pi` (FR-011) can require at least one to PASS. Runs against a REAL, installed Pi;
// hermetic (fresh temp config, --offline, no model), against `fixtures/pi/ui-ready-ext.ts` (never the repo's own ROADMAP.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { skipUnlessPi, demandFailure } from "../../_pi-gate.ts";
import { checkUiReady, UI_READY_HOOK_NAMES } from "../../../validate/ui-ready.ts";

const gate = skipUnlessPi();

function assertNotDemandBlocked() {
  const failure = demandFailure();
  assert.equal(failure, null, failure ?? undefined);
}

test("PI-LIVE: UiReady is READY end-to-end — the presentation wrapper, the applied decision, the Gate-0 face, all wired over real Pi RPC", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkUiReady();
  assert.equal(r.ready, true, JSON.stringify(r.failures, null, 2));
  for (const c of r.checks) assert.equal(c.ok, true, `${c.name}: ${c.detail}`);
}, { timeout: 60_000 });

test("PI-LIVE: --no-identity -> non-answer-approved (a valid move, no real identity, must not apply)", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkUiReady({ hooks: { noIdentity: true } });
  assert.equal(r.ready, false);
  assert.ok(r.failures.some((f) => f.code === "non-answer-approved"), JSON.stringify(r.failures));
}, { timeout: 60_000 });

test("PI-LIVE: --gate0-vocabulary-leak -> gate0-vocabulary-leak", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkUiReady({ hooks: { gate0VocabularyLeak: true } });
  assert.equal(r.ready, false);
  assert.ok(r.failures.some((f) => f.code === "gate0-vocabulary-leak"), JSON.stringify(r.failures));
}, { timeout: 60_000 });

test("PI-LIVE: --overlay-not-exclusive -> overlay-not-exclusive", gate, async () => {
  assertNotDemandBlocked();
  const r = await checkUiReady({ hooks: { overlayNotExclusive: true } });
  assert.equal(r.ready, false);
  assert.ok(r.failures.some((f) => f.code === "overlay-not-exclusive"), JSON.stringify(r.failures));
}, { timeout: 60_000 });

test("the CLI hook names are exactly the documented set", () => {
  assert.deepEqual(new Set(UI_READY_HOOK_NAMES), new Set(["no-identity", "gate0-vocabulary-leak", "overlay-not-exclusive"]));
});
