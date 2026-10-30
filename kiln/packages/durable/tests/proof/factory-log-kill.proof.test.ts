// r15 T047 (US3, PROOF tier): the factory-log stays equal to its rebuild whatever dies, wherever. The owner is SIGKILLed at every walk point (the whole r14 matrix), at the backbone's four points and
// in the middle of an event's commit, with the projection following the walk; the restart finishes the walk, a fresh owner lets the projection catch up, and a fresh reader finds, for the run:
//   E4  the file on disk == the reducer over the record, byte for byte (and the first program's validator accepts it — the walk is decided as human@…)
//   E5  every cursor sane; the test consumers exact; E1–E3, E7 clean; the walk equals the uninterrupted one
// A kill at `backbone.batch-read` is a kill between the commit of the events and the write of their file: the repeat after the restart repairs it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateLog } from "#record/log.ts";
import { BACKBONE_KILL_POINTS, WALK_KILL_POINTS } from "#durable/hooks.ts";
import { logFile } from "#durable/record/consumers/factory-log.ts";
import { runWalk } from "./support/walk-harness.ts";
import { catchUpAndJudge } from "./support/consumer-judge.ts";
import { baseline, FEATURE, judge, PLAIN } from "./support/walk-judge.ts";
import type { Chooser } from "./support/walk-harness.ts";

const HUMAN: Chooser = (g) => ({ kind: "approve", decidedBy: "human@r15-script", ...(g.gateKey === "gate0" ? { admit: {} } : {}) });
const owner = { env: { TEST_CONSUMERS: "1" } };

async function killAndJudge(point: string, nth: number): Promise<void> {
  const base = await baseline("plain+human+consumers", PLAIN, HUMAN, owner);
  const run = await runWalk({ feature: FEATURE, walk: PLAIN, choose: HUMAN, killAt: point, killNth: nth, owner });
  try {
    assert.ok(run.fired.includes(point), `proof-point-not-fired: ${point} (hit ${nth})`);
    await judge(run, PLAIN, base);
    assert.deepEqual(await catchUpAndJudge(run.ts.store), [], `${point} #${nth}`);
    const file = readFileSync(logFile(run.ts.store, FEATURE), "utf8");
    const v = validateLog(file.split("\n").filter(Boolean).map((l) => JSON.parse(l)));
    assert.deepEqual(v.failures, [], "the first program\'s validator accepts the rebuilt-equal file");
  } finally { run.cleanup(); }
}

const WALK_POINTS = WALK_KILL_POINTS.filter((p) => !p.startsWith("walk.fix-round") && !p.startsWith("walk.withdraw"));
for (const point of [...WALK_POINTS, ...BACKBONE_KILL_POINTS, "record.append-after-write"]) {
  test(`killed at ${point}: the factory-log equals its rebuild after the restart and the catch-up (E4), the walk equals the uninterrupted one`, { timeout: 180_000 }, () => killAndJudge(point, point.startsWith("walk.") ? 1 : 3));
}
