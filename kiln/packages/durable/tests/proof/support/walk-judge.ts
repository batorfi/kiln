// What a walk proof asserts, in one place (r14 T051): the final store, read by a fresh reader with no owner, must show a walk EQUAL to the uninterrupted one — same entries, same causes, one move per gate —
// with every per-gate invariant (I1–I9) and every walk invariant (W1–W4) clean, nothing parked or left waiting, and no gate settled by anything but a committed move.
import assert from "node:assert/strict";
import { inspectStore } from "#durable/inspect.ts";
import type { WalkInput } from "#durable/walk/input.ts";
import { checkInvariants } from "./oracle.ts";
import { approveAll, runWalk, type Chooser, type WalkRun } from "./walk-harness.ts";
import { checkWalkInvariants, walkGateIds, walkOutcomes } from "./walk-oracle.ts";

export const INTERFACE: WalkInput = { flow: "v2", facts: { paths: ["web/app.tsx"], labels: ["ui"], journeys: ["J1.3"] }, built: { ui_files_changed: true } };
export const PLAIN: WalkInput = { flow: "v2", facts: { paths: ["src/lib/a.ts"], labels: [], journeys: [] } };
export const FEATURE = "f1";

export interface Baseline {
  outcomes: string[];
  hits: Map<string, number>;
  gates: number;
}
const cache = new Map<string, Promise<Baseline>>();
/** The uninterrupted walk of this input (run once per test file and cached): the thing every killed walk must equal. */
export function baseline(name: string, walk: WalkInput, choose: Chooser = approveAll): Promise<Baseline> {
  let p = cache.get(name);
  if (!p) {
    p = (async () => {
      const run = await runWalk({ feature: FEATURE, walk, choose, countHits: true });
      try {
        assert.equal(run.deaths, 0);
        await judge(run, walk, undefined);
        return { outcomes: walkOutcomes(run.inspection, FEATURE), hits: run.hits, gates: run.steps.length };
      } finally {
        run.cleanup();
      }
    })();
    cache.set(name, p);
  }
  return p;
}

export async function judge(run: WalkRun, walk: WalkInput, base: Baseline | undefined, opts: { cap?: number } = {}): Promise<void> {
  const i = run.inspection;
  assert.equal(run.view.status, "done", "the walk ended");
  assert.equal(run.view.openGate, null);
  assert.ok(run.steps.every((s) => s.status === "committed" || s.status === "repeat"), `no move was refused: ${JSON.stringify(run.steps.filter((s) => s.status !== "committed" && s.status !== "repeat"))}`);
  assert.deepEqual(checkWalkInvariants(i, { feature: FEATURE, facts: walk.facts, cap: opts.cap }), [], "walk invariants W1–W4");
  for (const g of walkGateIds(i, FEATURE)) {
    const gi = await inspectStore(run.ts.store, g);
    assert.deepEqual(checkInvariants(gi), [], `gate invariants I1–I9 at ${g}`);
    assert.equal(gi.gate, "settled", `${g} ended settled`);
    assert.equal(gi.records.length, 1, `${g}: exactly one move record`);
  }
  assert.deepEqual(i.tasks.filter((t) => t.status !== "terminal").map((t) => `${t.kind}:${t.status}`), [], "nothing left waiting or parked");
  assert.equal(i.timers.length, 0, "no timer on any gate");
  if (base) assert.deepEqual(walkOutcomes(i, FEATURE), base.outcomes, "walk equality: the killed-and-resumed walk equals the uninterrupted one");
}
