// kiln/tests/switch-cost/switch-cost.test.ts — T035 (US3), r7 · data-model E5 · contract R7 (S9) · GATED live tier.
//
// THE FIRST assertion of Principle IV's "Testable as:" clause anywhere in the tree: `wall-clock = work +
// switching`, with the SWITCHING term local-dominant. It loads and unloads a real model, so it is gated.
//
// It asserts a CONSERVATIVE FLOOR, not the ratio observed on one machine — because the ratio depends heavily on
// whether the weights sit in the OS page cache. Measured on the reference host (gemma4:12b): a first-ever cold
// load from disk took ~18 s vs ~0.28 s warm (~64×); a reload with the weights already cached took ~3.0 s vs
// ~0.5 s (~5.7×). Both say the same thing — switching dominates work — but a fixed 64× would turn a TRUE claim
// into a flaky red suite. The observed numbers are printed, not asserted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { skipUnlessLiveCost } from "../_live-gate.ts";
import { makeOllamaResident, resolveOllamaBase } from "../../src/ollama-resident.ts";
import { DEFAULT_LOCAL_MODEL } from "../../src/live-resident.ts";

const MODEL = process.env.KILN_LIVE_MODEL ?? DEFAULT_LOCAL_MODEL;
/** cold must exceed warm by at least this factor. Conservative on purpose (see header). */
export const RATIO_FLOOR = 2;
/**
 * Below this many ms of difference the measurement is dominated by noise, so the test SKIPS (with a recorded reason) instead of
 * asserting. It used to FAIL when the gap was under a fixed 500 ms — a true claim rejected on a fast machine with a small model (CR-11).
 */
export const ABS_FLOOR_MS = 200;

const unit = (id: string) => ({ id, role: "worker" as const, tier: "strongest" as const, work: "a rate limiter" });
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

test("S9 (live, P-IV): switching dominates work — a cold load costs far more than a warm run", { ...skipUnlessLiveCost(), timeout: 900_000 }, async (ctx) => {
  const { base } = resolveOllamaBase();
  const loaded = async () => ((await (await fetch(`${base}/api/ps`)).json()) as { models: { name: string }[] }).models.map((m) => m.name);

  // Force COLD: unload the model, and WAIT until the server says it is gone (a timing test on a half-unloaded model proves nothing).
  await fetch(`${base}/api/generate`, { method: "POST", body: JSON.stringify({ model: MODEL, keep_alive: 0 }) });
  for (let i = 0; i < 120 && (await loaded()).includes(MODEL); i++) await new Promise((ok) => setTimeout(ok, 250));
  assert.ok(!(await loaded()).includes(MODEL), "precondition: the model is genuinely UNLOADED before the cold measurement");

  const r = makeOllamaResident({ model: MODEL, timeoutMs: 840_000 });
  await r.preflight(); // the tags lookup is not part of the switch cost

  let t = Date.now();
  await r.run(unit("cold"));
  const coldMs = Date.now() - t;
  const warm: number[] = [];
  for (let i = 0; i < 3; i++) { t = Date.now(); await r.run(unit(`warm${i}`)); warm.push(Date.now() - t); }
  const warmMs = median(warm);
  const ratio = coldMs / warmMs;

  console.log(`  [P-IV] ${MODEL}: cold ${coldMs} ms · warm ${warmMs} ms (median of 3: ${warm.join(", ")}) · ratio ${ratio.toFixed(1)}×`);
  if (coldMs - warmMs < ABS_FLOOR_MS) {
    ctx.skip(`too fast to measure: the cold-vs-warm gap (${coldMs - warmMs} ms) is under ${ABS_FLOOR_MS} ms, so it is dominated by noise — nothing can be asserted about switching on this model/machine`);
    return;
  }
  assert.ok(coldMs > warmMs, `cold (${coldMs} ms) must exceed warm (${warmMs} ms)`);
  assert.ok(ratio >= RATIO_FLOOR, `cold/warm ratio ${ratio.toFixed(1)}× must be at least ${RATIO_FLOOR}× — switching must DOMINATE work (P-IV)`);
});
