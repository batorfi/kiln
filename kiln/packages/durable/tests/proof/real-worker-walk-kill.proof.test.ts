// r16 T039 (US2's guarantee, inside the full-walk context rather than a unit in isolation): the owner is killed mid-generation
// during the REAL small-interface walk (not a scripted one), restarted on the same store, and the walk still reaches Merge.
// T026/27 already proved replay discipline for one real-role unit in isolation; this proves the SAME kill point, with the
// SAME real machinery, composes correctly inside a full multi-gate walk — a kill here can ripple through the walk's own row
// and gate tasks, not just the one unit task T026/27 already covered. Live-model tier (T005): skips by name when Ollama or
// the pinned model is unreachable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkInvariants } from "./support/oracle.ts";
import { checkWalkInvariants, walkGateIds } from "./support/walk-oracle.ts";
import { approveAll, runWalk } from "./support/walk-harness.ts";
import { inspectStore } from "#durable/inspect.ts";
import type { WalkInput } from "#durable/walk/input.ts";
import { probeLiveModel, skipOption } from "../../../../tests/live-gate.ts";

const LANE_MODULE = fileURLToPath(new URL("./support/real-workers-for-test.ts", import.meta.url));
const fxPath = fileURLToPath(new URL("../../../../fixtures/walk-real-worker.json", import.meta.url));

test("killed mid-generation during the real small-interface walk (not a unit in isolation), restarted, the walk still reaches Merge", { timeout: 10 * 60_000 }, async (t) => {
  const status = await probeLiveModel();
  const skip = skipOption(status).skip;
  if (skip) { t.skip(skip); return; }

  const fixture = JSON.parse(readFileSync(fxPath, "utf8")) as WalkInput;
  const workspace = mkdtempSync(join(tmpdir(), "k16-walk-kill-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  fixture.script!.real!.workspace = workspace;

  const run = await runWalk({
    feature: "real-kill-f1",
    walk: fixture,
    choose: approveAll,
    owner: { env: { LANE_MODULE, WORKERS_MODULE: LANE_MODULE } },
    killAt: "unit.pre-result-commit",
    maxMs: 9 * 60_000,
  });
  try {
    assert.ok(run.fired.includes("unit.pre-result-commit"), "the kill point never fired — a kill mid-unit-generation never happened, this proves nothing");
    assert.equal(run.deaths, 1, "exactly one owner died");
    assert.equal(run.view.status, "done", `the walk did not reach done after the kill and restart: ${JSON.stringify(run.view)}`);
    assert.equal(run.view.openGate, null, "nothing opens after Merge");
    assert.deepEqual(checkWalkInvariants(run.inspection, { feature: "real-kill-f1", facts: fixture.facts }), [], "walk invariants W1-W4 after a real-generation kill and resume");
    for (const g of walkGateIds(run.inspection, "real-kill-f1")) {
      const gi = await inspectStore(run.ts.store, g);
      assert.deepEqual(checkInvariants(gi), [], `gate invariants at ${g}`);
    }
  } finally {
    run.cleanup();
  }
});
