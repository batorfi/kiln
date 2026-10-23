// kiln/tests/live-inference/affinity.test.ts — T033 (US3), r7 · P-IV / P-II (S8) · GATED live tier.
// Realized switches == the P-IV counter on a REAL walk, and the strongest-model guard holds live.
import { test } from "node:test";
import assert from "node:assert/strict";
import { skipUnlessLive } from "../_live-gate.ts";
import { buildLiveWalk } from "../../src/live-walk.ts";
import { switchCount, bindAll, schedule } from "../../src/scheduler.ts";
import { makeOllamaResident } from "../../src/ollama-resident.ts";
import { DEFAULT_LOCAL_MODEL } from "../../src/live-resident.ts";
import { LINE_OF_DEFENSE, type Role } from "../../src/roles.ts";
import type { WorkUnit } from "../../src/stub-resident.ts";

const MODEL = process.env.KILN_LIVE_MODEL ?? DEFAULT_LOCAL_MODEL;
const W = (id: string, role: Role, tier: WorkUnit["tier"]): WorkUnit => ({ id, role, tier });

test("S8 (live): realized switches == the P-IV switchCount counter on a REAL walk (SC-004)", skipUnlessLive(), async () => {
  const walk = await buildLiveWalk({ mode: "live", resident: makeOllamaResident({ model: MODEL }), location: "loopback", model: MODEL });
  assert.equal(walk.switches, walk.expectedSwitches, "one swap per GENUINE tier boundary — no more, no fewer");
  assert.ok(walk.switches > 0, "the throwaway forces genuine tier changes");
  assert.equal(walk.lines.filter((l) => JSON.parse(l).recordType === "cost").length, walk.switches, "each swap is bracketed by exactly one cost record");
});

test("S8 (live): the four line-of-defense roles bind strongest; a weaker binding THROWS SYNCHRONOUSLY, before any call is made (P-II, D3)", skipUnlessLive(), async () => {
  const resident = makeOllamaResident({ model: MODEL });
  const lod = (LINE_OF_DEFENSE as readonly Role[]).map((r) => W(r, r, "strongest"));
  await assert.doesNotReject(async () => schedule(lod, resident), "a strongest LoD binding is accepted");
  const before = resident.roundTrips();
  for (const weak of lod.map((u) => ({ ...u, tier: "standard" as const }))) {
    assert.throws(() => schedule([weak], resident), /G2|strongest|line-of-defense/i, `${weak.role} on a sub-strongest tier is a config error`);
    assert.throws(() => bindAll([weak]), /G2|strongest/i);
  }
  assert.equal(resident.roundTrips(), before, "the config error fired BEFORE any model call — P-II's 'rejected at schedule time, before anything runs'");
});
