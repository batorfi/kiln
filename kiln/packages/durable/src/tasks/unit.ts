// `kiln.unit` — one step of a feature (CORE-2). A SHELL with scripted work (research R8): each invocation does the next scripted step, then commits its checkpoint; the RESULT is committed once, at the
// end. A kill mid-step re-runs that step from the last checkpoint, and because nothing but the checkpoint and the final result is ever stored, a half-done step never commits its result (CORE-4).
// The step's duration (`stepMs`) is WORK a kill can interrupt — it is not a durable timer and settles nothing.
//
// r16 T019: a unit whose spec names a `role` replaces the `stepMs` stand-in with a real conversation turn, through
// the workers port (`s.workers`, `#durable/types.ts`'s `WorkersApi` — durable cannot import workers, the same
// inversion as the lane). Everything AROUND that call — the commit/checkpoint shape, the lane acquire/hold/release,
// the kill-point hooks, the release-on-error below — is exactly what a scripted unit already uses, unchanged.
//
// r16 T023: `runTurn` now returns `{kind:"continue"}` after EACH tool call (never the whole conversation at once), so
// the commit below happens once per tool call, exactly as it already does once per scripted step — a kill between
// two tool calls can only lose work that was never committed (CORE-4, now proven for a real generation too).
//
// Found at code review, fixed: a real role's lane lease is held ACROSS every round of its own conversation, not
// re-acquired and released per round. Releasing on `turn.kind === "continue"` (as a scripted step always does, by
// design — r13) would fire a REAL `residency.unload()` after every single tool call and a REAL `residency.load()`
// before the next, since release()'s unload is no longer free once a residency manager is wired in (T013): a
// multi-round conversation would pay a full model unload/reload cycle between every round for no reason, and was
// the dominant, confirmed cause of this row's own extreme live-walk timings. `acquire()` has NO self-reacquire
// guard — a task calling it while it already holds the lease (`s.lane!.holds(task.id)`) would queue behind itself
// and deadlock, since nothing ever sets `holder` back to null to let the queue drain. So BOTH sides changed
// together: skip `acquire()` when already held, and skip `release()` while a real conversation is still mid-way
// (`turn.kind === "continue"`) — the lease is acquired once per unit, held for the unit's own whole conversation,
// and released exactly once, when it is actually done or errors. The scripted path is completely untouched: it
// never holds a role's checkpoint shape, so `holds()` is never true for it, and its per-step acquire/release stays
// exactly as r13 built it.
//
// r16 T025: a generation that exceeds its tier's timeout rejects `runTurn`'s promise with `GenerationTimeoutError`
// (research R6) — `run.signal.aborted` is still false for this (it is a SEPARATE signal from the factory's own close
// signal), so the existing `catch` block below already takes the right path with no special case: the lane is
// released (held && !aborted) and the error propagates uncaught, which is exactly how the pinned library turns an
// uncaught phase error into the task's own `unit.failed` outcome (unit-events.ts) — never a gate, never a clock
// (constitution V, FR-008): only this ONE step fails, and the gate it belonged to is left exactly as any other
// failed step leaves it, waiting for a person.
import { appendUnitEvent } from "../record/unit-events.ts";
import type { Services } from "../services.ts";
import { defineKilnTask, type TaskKind } from "../store.ts";
import type { ArtifactRef, UnitCheckpoint, UnitResult } from "../types.ts";
import type { UnitSpec } from "./validate.ts";

export function unitKind(s: Services): TaskKind<UnitSpec, UnitCheckpoint, UnitResult> {
  return defineKilnTask<UnitSpec, UnitCheckpoint, UnitResult>({
    name: "kiln.unit",
    version: 1,
    initial: () => ({ phase: "work", done: 0, results: [] }),
    phases: {
      work: async (task, run) => {
        const { label, steps, stepMs, needsLane, model, hold, role, workspace, inputs } = task.input;
        const i = task.checkpoint.done;
        if (task.checkpoint.started !== true) {
          // r15: the unit's first step is recorded in its own commit (the event and the flag together), before any work: a kill re-enters here and finds the flag or the event, never one without the other
          await run.commit(async (tx) => {
            await appendUnitEvent(tx, s, "unit.started", { unit: task.id, label, owner: (await tx.task(task.id))?.owner ?? null, actor: `task:${task.id}`, cause: `task:${task.id}` });
            return { status: "running", checkpoint: { ...task.checkpoint, started: true } };
          });
          return;
        }
        await s.hooks.at("unit.step-begin");
        const alreadyHeld = needsLane === true && s.lane!.holds?.(task.id) === true;
        if (needsLane && !alreadyHeld) {
          // the generation (scripted or, with a role, real) runs only while the unit holds the lane; a lease the previous process left behind was released at start, so a redone step simply asks again.
          // A real role's unit may already hold the lease from a prior round (we no longer release between rounds, below) — asking again would queue behind itself and deadlock, since nothing would ever
          // free the lane to grant its own repeated request.
          try {
            await s.lane!.acquire(task.id, { model, hold, signal: run.signal, cause: `task:${task.id}/step:${i}` });
          } catch (e) {
            if (run.signal.aborted) return; // the factory is closing while this step waited: nothing is committed
            throw e;
          }
        }
        let held = needsLane === true;
        try {
          let releaseNow = true;
          if (role) {
            // the real generation and any tool calls it makes — all of it, this row's own scope (T018/T019): a
            // kill mid-generation redoing this whole call is exactly the gap US2 (T023-T027) closes next
            const turn = await s.workers!.runTurn({
              unit: task.id, role, model: model!, workspace: workspace!,
              inputs: (inputs ?? []).map((ref): ArtifactRef => ({ ref })),
              checkpoint: task.checkpoint, signal: run.signal,
            });
            if (run.signal.aborted) return; // the factory is closing: nothing is committed
            await s.hooks.at("unit.step-after-work"); // the work is done and NOT yet recorded: a kill here redoes it
            if (turn.kind === "done") await s.hooks.at("unit.pre-result-commit"); // r16 T026: the generation is finished, its result not yet committed
            await run.commit(async (tx) => {
              if (turn.kind === "continue") return { status: "running", checkpoint: turn.checkpoint };
              await appendUnitEvent(tx, s, "unit.settled", { unit: task.id, label, owner: (await tx.task(task.id))?.owner ?? null, actor: `task:${task.id}`, cause: `task:${task.id}` });
              return { status: "terminal", outcome: { status: "completed", result: turn.result } };
            });
            if (turn.kind === "continue") {
              await s.hooks.at("unit.tool-call-committed"); // r16 T026: this one tool call's result just committed, before the model's next turn
              releaseNow = false; // hold the lease for the next round of this SAME unit's conversation — see the file header
            }
          } else {
            // the scripted work of step i — pure in its inputs, so redoing it after a kill gives the same answer
            if (stepMs) await new Promise<void>((resolve) => {
              const t = setTimeout(resolve, stepMs);
              run.signal.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
            });
            if (run.signal.aborted) return; // the factory is closing: nothing is committed
            await s.hooks.at("unit.step-after-work"); // the work is done and NOT yet recorded: a kill here redoes it
            const results = [...task.checkpoint.results, `${label}:${i}`];
            await run.commit(async (tx) => {
              if (i + 1 < steps) return { status: "running", checkpoint: { phase: "work", done: i + 1, results, started: true } };
              await appendUnitEvent(tx, s, "unit.settled", { unit: task.id, label, owner: (await tx.task(task.id))?.owner ?? null, actor: `task:${task.id}`, cause: `task:${task.id}` });
              return { status: "terminal", outcome: { status: "completed", result: { label, results } } };
            });
          }
          await s.hooks.at("unit.step-committed");
          if (held && releaseNow) {
            await s.lane!.release(task.id);
            held = false;
          }
        } catch (e) {
          // a step that fails while it holds the lane gives it back: otherwise the lease would stay recorded for a task that is no longer running, and every later step would wait for it
          if (held && !run.signal.aborted) await s.lane!.release(task.id).catch(() => {});
          throw e;
        }
      },
    },
    abort: async (task, run) => {
      await run.commit(async (tx) => {
        await appendUnitEvent(tx, s, "unit.aborted", { unit: task.id, label: task.input.label, owner: (await tx.task(task.id))?.owner ?? null, actor: `task:${task.id}`, cause: `task:${task.id}` });
        return { status: "terminal", outcome: { status: "aborted" } };
      });
    },
  });
}
