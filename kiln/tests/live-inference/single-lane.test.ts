// kiln/tests/live-inference/single-lane.test.ts — T032 (US3), r7 · P-III / F-SINGLE (S8) · GATED live tier.
// F-SINGLE over snapshots captured from a REAL walk — these assertions are independent of model output, so they
// run live without flakiness. A forged two-running snapshot must still throw.
import { test } from "node:test";
import assert from "node:assert/strict";
import { skipUnlessLive } from "../_live-gate.ts";
import { buildLiveWalk, assertLiveSingleLane } from "../../src/live-walk.ts";
import { assertSingleLane, type Lane } from "../../src/lane.ts";
import { makeOllamaResident } from "../../src/ollama-resident.ts";
import { DEFAULT_LOCAL_MODEL } from "../../src/live-resident.ts";

const MODEL = process.env.KILN_LIVE_MODEL ?? DEFAULT_LOCAL_MODEL;
const live = async () => await buildLiveWalk({ mode: "live", resident: makeOllamaResident({ model: MODEL }), location: "loopback", model: MODEL });

test("S8 (live): F-SINGLE holds over the per-step snapshots of a REAL walk", skipUnlessLive(), async () => {
  const walk = await live();
  assert.ok(walk.snapshots.length >= 9, "a snapshot per step was captured");
  assert.doesNotThrow(() => assertLiveSingleLane(walk), "never two units live at once");
  const running = walk.snapshots.filter((s) => s.running).length;
  assert.ok(running >= 9, `each of the 9 units was captured LIVE (exactly one running unit at that instant); saw ${running}`);
  for (const s of walk.snapshots) assert.ok((s.running ? 1 : 0) <= 1 && (s.resident ? 1 : 0) <= 1, "at most ONE resident and ONE running unit in any snapshot");
});

test("S8 (live): a forged two-running-at-once sequence STILL throws — the check is real, live or not", skipUnlessLive(), async () => {
  const walk = await live();
  const forged: Lane[] = [
    { ...walk.snapshots[1], running: { duId: "a", role: "worker" } },
    { ...walk.snapshots[1], running: { duId: "b", role: "worker" } }, // a DIFFERENT unit, no reclaim between
  ];
  assert.throws(() => assertSingleLane(forged), /foundry|two/i);
});
