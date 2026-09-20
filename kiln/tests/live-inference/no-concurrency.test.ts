// kiln/tests/live-inference/no-concurrency.test.ts — T034 (US3), r7 · FR-015a / contract A4 · P-III.
// The async spine (NC1=B) must NOT become concurrency: exactly ONE unit in flight at every awaited instant.
// Three angles — a static scan (offline), a dynamic in-flight measurement (offline, stand-in), and the same
// measurement against the REAL resident (gated).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { skipUnlessLive } from "../_live-gate.ts";
import { buildLiveWalk } from "../../src/live-walk.ts";
import { makeOllamaResident } from "../../src/ollama-resident.ts";
import { makeStubResident, type Resident, type WorkUnit } from "../../src/stub-resident.ts";
import { DEFAULT_LOCAL_MODEL } from "../../src/live-resident.ts";
import { run, makeLane } from "../../src/lane.ts";

/** Wrap a resident so the maximum number of units IN FLIGHT AT ONCE is measured. */
function measured(inner: Resident, delayMs = 0) {
  const s = { inFlight: 0, max: 0, calls: 0 };
  const r: Resident = {
    model: () => inner.model(),
    tier: () => inner.tier(),
    run: async (u: WorkUnit) => {
      s.calls++; s.inFlight++; s.max = Math.max(s.max, s.inFlight);
      try { if (delayMs) await new Promise((ok) => setTimeout(ok, delayMs)); return await inner.run(u); } finally { s.inFlight--; }
    },
  };
  return { r, s };
}

test("A4 (static): no `Promise.all` / `race` / `any` / `allSettled` in kiln/src — nothing can start units together", () => {
  const dir = fileURLToPath(new URL("../../src", import.meta.url));
  const offenders: string[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
    const code = readFileSync(`${dir}/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
    if (/\bPromise\s*\.\s*(?:all|race|any|allSettled)\s*\(/.test(code)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], `concurrency primitives found in: ${offenders.join(", ")}`);
});

test("A4 (dynamic, offline): the lane keeps AT MOST ONE unit in flight even when every call is slow and async", async () => {
  const { r, s } = measured(makeStubResident({ model: "stand-in", tier: "strongest" }), 15);
  const units: WorkUnit[] = ["a", "b", "c", "d", "e"].map((id, i) => ({ id, role: "worker", tier: i % 2 ? "standard" : "strongest" }));
  await run(makeLane(), units, r);
  assert.equal(s.calls, 5, "every unit ran");
  assert.equal(s.max, 1, "…but never two at once (P-III / FR-015a)");
});

test("A4 (dynamic, offline): a whole nine-unit walk keeps at most one unit in flight", async () => {
  const { r, s } = measured(makeStubResident({ model: "stand-in", tier: "strongest" }), 5);
  await buildLiveWalk({ mode: "live", resident: r });
  assert.equal(s.calls, 9);
  assert.equal(s.max, 1);
});

test("A4 (live): against the REAL resident a nine-unit walk keeps exactly one unit in flight", skipUnlessLive(), async () => {
  const { r, s } = measured(makeOllamaResident({ model: process.env.KILN_LIVE_MODEL ?? DEFAULT_LOCAL_MODEL }));
  await buildLiveWalk({ mode: "live", resident: r, location: "loopback" });
  assert.equal(s.calls, 9);
  assert.equal(s.max, 1, "one lane, one unit — even with a real model behind it");
});
