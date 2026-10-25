// kiln/tests/ollama-ready/skip.test.ts — T029 (US2), r7 · contract R3 (S2) · OFFLINE tier.
// SKIP IS NEVER A PASS: with no endpoint or no model the probe returns `skipped`, `ready:false` and a NON-EMPTY
// `skipReason` — P-V lifted to the suite. These run on a machine with no Ollama at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkOllamaReady } from "../../validate/ollama-ready.ts";
import { failingPreflight, goodResident } from "./_stand-in.ts";

const CLI = fileURLToPath(new URL("../../validate/ollama-ready.ts", import.meta.url));

test("R3: endpoint down ⇒ SKIPPED, ready=false, a NON-EMPTY skipReason naming the endpoint", async () => {
  const r = await checkOllamaReady({ resident: failingPreflight("endpoint-unreachable") });
  assert.equal(r.skipped, true);
  assert.equal(r.ready, false, "a skip is NEVER a pass");
  assert.ok(r.skipReason && r.skipReason.trim().length > 0, "a skip with no recorded reason is itself a violation");
  assert.match(r.skipReason!, /endpoint unreachable/i);
  assert.ok(r.checks.some((c) => /^\(a\)/.test(c.name) && !c.ok), "check (a) names the failure");
});

test("R3: model absent ⇒ SKIPPED, ready=false, the skipReason NAMES the model (the stale default is caught automatically)", async () => {
  const r = await checkOllamaReady({ resident: failingPreflight("model-missing", "llama3.2:3b") });
  assert.equal(r.skipped, true);
  assert.equal(r.ready, false);
  assert.match(r.skipReason ?? "", /model .* is not installed/i);
  assert.ok(r.checks.some((c) => /^\(b\)/.test(c.name) && !c.ok && /not installed/.test(c.detail)), "check (b) names the model");
  assert.ok(r.checks.some((c) => /^\(a\)/.test(c.name) && c.ok), "…and correctly reports the endpoint DID answer");
});

test("R3: the invariant holds for every outcome — skipped ⇒ !ready ∧ a non-empty reason", async () => {
  for (const ov of [{ resident: failingPreflight("endpoint-unreachable") }, { resident: failingPreflight("model-missing") }, { resident: goodResident() }, { resident: goodResident(), forgedLive: true }]) {
    const r = await checkOllamaReady(ov);
    if (r.skipped) assert.ok(!r.ready && (r.skipReason ?? "").trim() !== "", "skipped ⇒ !ready ∧ skipReason");
    else assert.equal(r.skipReason, undefined, "a non-skipped result carries no skipReason");
  }
});

test("S2: --no-endpoint against a CLOSED port (no Ollama needed) ⇒ SKIPPED via the real resident, and the CLI exits NON-ZERO", async () => {
  const r = await checkOllamaReady({ noEndpoint: true });
  assert.equal(r.skipped, true);
  assert.equal(r.ready, false);
  assert.match(r.skipReason ?? "", /unreachable/i);
  const cli = spawnSync(process.execPath, [CLI, "--no-endpoint"], { encoding: "utf8", stdin: "ignore" });
  assert.equal(cli.status, 1, "the CLI exits non-zero — a skip is not a passing command");
  assert.match(cli.stderr, /SKIPPED \(a skip is NEVER a pass\)/, "the reason is printed, not swallowed");
});

test("R4 / P-VI: the probe runs no gate and admits no program", async () => {
  const r = await checkOllamaReady({ resident: goodResident() });
  const all = JSON.stringify(r.checks);
  assert.doesNotMatch(all, /gate0.{0,20}approved|admitted the program/i, "the probe emits no Gate-0 admission");
});
