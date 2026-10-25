// kiln/tests/ollama-ready/ready.test.ts — T031 (US2), r7 · S5 · GATED live tier (`KILN_LIVE=1`).
// Against the REAL local Ollama: every check a–f passes with a per-check trace, and the walk really performs
// nine round-trips. Skipped WITH a recorded reason unless KILN_LIVE=1 (NC3=A).
import { test } from "node:test";
import assert from "node:assert/strict";
import { skipUnlessLive } from "../_live-gate.ts";
import { checkOllamaReady } from "../../validate/ollama-ready.ts";
import { failing } from "./_stand-in.ts";

test("S5 (live): OllamaReady is READY against the real endpoint, with a per-check trace covering (a)–(f)", skipUnlessLive(), async () => {
  const r = await checkOllamaReady();
  assert.equal(r.ready, true, `not ready: ${failing(r).join("; ")}${r.skipReason ? " — SKIPPED: " + r.skipReason : ""}`);
  for (const tag of ["(a)", "(b)", "(c)", "(d)", "(e)", "(f)"]) assert.ok(r.checks.some((c) => c.name.includes(tag) && c.ok), `check ${tag} present and ok`);
  assert.match(r.checks.find((c) => c.name.includes("(e)"))!.detail, /9 round-trip\(s\) performed for 9 unit\(s\)/, "nine REAL round-trips for nine units");
  assert.ok(r.live.ready, "the composed r3 LiveModelReady is READY");
});

test("S7 (live): --no-model against the real server ⇒ SKIPPED naming the model (the stale default would be caught here)", skipUnlessLive(), async () => {
  const r = await checkOllamaReady({ noModel: true });
  assert.equal(r.skipped, true);
  assert.equal(r.ready, false);
  assert.match(r.skipReason ?? "", /kiln-no-such-model:0b/);
});
