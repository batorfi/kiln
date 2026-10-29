// What a walk proof asserts, in one place (r14 T051): the final store, read by a fresh reader with no owner, must show a walk EQUAL to the uninterrupted one — same entries, same causes, one move per gate —
// with every per-gate invariant (I1–I9) and every walk invariant (W1–W4) clean, nothing parked or left waiting, and no gate settled by anything but a committed move.
import assert from "node:assert/strict";
import { inspectStore } from "#durable/inspect.ts";
import type { WalkInput } from "#durable/walk/input.ts";
import { checkInvariants } from "./oracle.ts";
import { approveAll, runWalk, type Chooser, type WalkRun } from "./walk-harness.ts";
import { checkWalkInvariants, walkGateIds, walkOutcomes } from "./walk-oracle.ts";
import { checkRecordInvariants } from "./record-oracle.ts";

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
/** `owner` configures the child owner the baseline runs on (r15: consumers following the walk allocate task ids too, so the baseline must run with the same ones). */
export function baseline(name: string, walk: WalkInput, choose: Chooser = approveAll, owner?: Parameters<typeof runWalk>[0]["owner"]): Promise<Baseline> {
  let p = cache.get(name);
  if (!p) {
    p = (async () => {
      const run = await runWalk({ feature: FEATURE, walk, choose, countHits: true, ...(owner ? { owner } : {}) });
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
  assert.deepEqual(await checkRecordInvariants(run.ts.store), [], "record invariants E1–E3, E7");
  for (const g of walkGateIds(i, FEATURE)) {
    const gi = await inspectStore(run.ts.store, g);
    assert.deepEqual(checkInvariants(gi), [], `gate invariants I1–I9 at ${g}`);
    assert.equal(gi.gate, "settled", `${g} ended settled`);
    assert.equal(gi.records.length, 1, `${g}: exactly one move record`);
  }
  assert.deepEqual(i.tasks.filter((t) => t.status !== "terminal" && t.kind !== "kiln.archive").map((t) => `${t.kind}:${t.status}`), [], "nothing left waiting or parked (the archive task is its own step, judged by E6)");
  assert.equal(i.timers.length, 0, "no timer on any gate");
  if (base) assert.deepEqual(walkOutcomes(i, FEATURE), base.outcomes, "walk equality: the killed-and-resumed walk equals the uninterrupted one");
}

/** Kill the owner at the `nth` time `point` is reached, restart it, finish the walk — and judge it. A kill that never fires FAILS BY NAME (a proof that killed nothing proves nothing). */
export async function killRun(name: string, walk: WalkInput, point: string, nth: number, choose: Chooser = approveAll): Promise<void> {
  const base = await baseline(name, walk, choose);
  const run = await runWalk({ feature: FEATURE, walk, choose, killAt: point, killNth: nth });
  try {
    assert.ok(run.fired.includes(point), `proof-point-not-fired: ${point} (hit ${nth}) never fired in the ${name} walk — it was reached ${base.hits.get(point) ?? 0} time(s)`);
    assert.equal(run.deaths, 1, `${point} #${nth}: exactly one owner died`);
    await judge(run, walk, base);
  } catch (e) {
    (e as Error).message = `[${name} walk, killed at ${point} hit ${nth}] ${(e as Error).message}`;
    throw e;
  } finally {
    run.cleanup();
  }
}

/** A walk with a re-crossing: Work plan is rejected back to Specification, so Specification, Work plan and everything after them are crossed again (FR-051: a re-crossing is killed too). */
export const RECROSS: Chooser = (g, n) => (g.gateKey === "4-plan" && g.round === 1 ? { kind: "reject", note: "wrong order: back to the spec", target: "3-spec" } : approveAll(g, n));

/** A walk whose verifier fails twice before it passes: Verification runs its two automatic fix rounds (the default cap) before the gate opens for a person. */
export const FIXING: WalkInput = { ...PLAIN, verifier: ["fail", "fail", "pass"] };
