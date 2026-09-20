// kiln/tests/ollama-ready/falsify.test.ts — T030 (US2), r7 · contract R2 (S7) · OFFLINE tier.
// Each falsify hook flips `ready=false` and NAMES ITSELF — and trips ONLY its own check, so the name is
// unambiguous. `--forged-live` is the one that separates r7 from r3: a CLAIMED live run must be
// distinguishable from a PERFORMED one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOllamaReady } from "../../validate/ollama-ready.ts";
import { goodResident, failing } from "./_stand-in.ts";

test("baseline: with a resident that genuinely performs round-trips, EVERY check passes (a–f)", async () => {
  const res = goodResident();
  const r = await checkOllamaReady({ resident: res });
  assert.equal(r.ready, true, `expected ready: ${failing(r).join("; ")}`);
  assert.equal(r.skipped, false);
  for (const tag of ["(a)", "(b)", "(c)", "(d)", "(e)", "(f)"]) assert.ok(r.checks.some((c) => c.name.includes(tag) && c.ok), `check ${tag} present and ok`);
  assert.equal(res.trips, 9, "nine units ⇒ nine PERFORMED round-trips");
  assert.ok(r.live.ready, "the composed r3 LiveModelReady is READY");
});

test("--empty-visible ⇒ FAIL, names (c) EMPTY VISIBLE OUTPUT — and only (c)", async () => {
  const r = await checkOllamaReady({ resident: goodResident(), emptyVisible: true });
  assert.equal(r.ready, false);
  const f = failing(r);
  assert.equal(f.length, 1, `only (c) trips, got: ${f.join(" | ")}`);
  assert.match(f[0], /^\(c\)/);
  assert.match(r.checks.find((c) => !c.ok)!.detail, /EMPTY VISIBLE OUTPUT/);
});

test("--forged-live ⇒ FAIL, names (e) — a CLAIMED live run that PERFORMED nothing (the check r3 could not make)", async () => {
  const res = goodResident();
  const r = await checkOllamaReady({ resident: res, forgedLive: true });
  assert.equal(r.ready, false);
  const f = failing(r);
  assert.equal(f.length, 1, `only (e) trips, got: ${f.join(" | ")}`);
  assert.match(f[0], /^\(e\)/);
  assert.match(r.checks.find((c) => !c.ok)!.detail, /CLAIMED .* performed 0 round-trip/);
  assert.equal(res.trips, 0, "the real resident's counter never moved — the adapter never dialed");
  assert.equal(r.live.ready, true, "…yet r3's LiveModelReady is STILL READY: this is exactly the gap r7 closes");
});

test("--stub-unlogged ⇒ FAIL, names (d) F-NOT-SILENT (and the inherited r3 check)", async () => {
  const r = await checkOllamaReady({ resident: goodResident(), stubUnlogged: true });
  assert.equal(r.ready, false);
  assert.ok(failing(r).some((n) => /^\(d\)/.test(n)), "(d) names the unlogged stand-in");
  assert.ok(failing(r).some((n) => /LiveModelReady/.test(n)), "the composed r3 probe names it too");
});

test("--extra-loopback ⇒ FAIL, names (f) — a SECOND loopback allowlist entry is refused", async () => {
  const r = await checkOllamaReady({ resident: goodResident(), extraLoopback: true });
  assert.equal(r.ready, false);
  const f = failing(r);
  assert.equal(f.length, 1, `only (f) trips, got: ${f.join(" | ")}`);
  assert.match(f[0], /^\(f\)/);
  assert.match(r.checks.find((c) => !c.ok)!.detail, /2 entries .* EXACTLY ONE/);
});

test("the inherited r3 hooks still flip OllamaReady (it composes, it does not replace)", async () => {
  for (const hook of ["brokenDogfood", "brokenRender", "brokenGate0"] as const) {
    const r = await checkOllamaReady({ resident: goodResident(), [hook]: true });
    assert.equal(r.ready, false, `${hook} must flip OllamaReady`);
    assert.ok(failing(r).some((n) => /LiveModelReady/.test(n)), `${hook} is named via the composed probe`);
  }
});
