// `kiln.unit` — one step of a feature (CORE-2). A SHELL with scripted work (research R8): each invocation does the next scripted step, then commits its checkpoint; the RESULT is committed once, at the
// end. A kill mid-step re-runs that step from the last checkpoint, and because nothing but the checkpoint and the final result is ever stored, a half-done step never commits its result (CORE-4).
// The step's duration (`stepMs`) is WORK a kill can interrupt — it is not a durable timer and settles nothing.
import type { Services } from "../services.ts";
import { defineKilnTask, type TaskKind } from "../store.ts";
import type { UnitSpec } from "./validate.ts";

type UnitCheckpoint = { phase: "work"; done: number; results: string[] };
type UnitResult = { label: string; results: string[] };

export function unitKind(s: Services): TaskKind<UnitSpec, UnitCheckpoint, UnitResult> {
  return defineKilnTask<UnitSpec, UnitCheckpoint, UnitResult>({
    name: "kiln.unit",
    version: 1,
    initial: () => ({ phase: "work", done: 0, results: [] }),
    phases: {
      work: async (task, run) => {
        const { label, steps, stepMs, needsLane, model, hold } = task.input;
        const i = task.checkpoint.done;
        await s.hooks.at("unit.step-begin");
        if (needsLane) {
          // the scripted generation runs only while the unit holds the lane; a lease the previous process left behind was released at start, so a redone step simply asks again
          try {
            await s.lane!.acquire(task.id, { model, hold, signal: run.signal, cause: `task:${task.id}/step:${i}` });
          } catch (e) {
            if (run.signal.aborted) return; // the factory is closing while this step waited: nothing is committed
            throw e;
          }
        }
        let held = needsLane === true;
        try {
          // the scripted work of step i — pure in its inputs, so redoing it after a kill gives the same answer
          if (stepMs) await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, stepMs);
            run.signal.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
          });
          if (run.signal.aborted) return; // the factory is closing: nothing is committed
          await s.hooks.at("unit.step-after-work"); // the work is done and NOT yet recorded: a kill here redoes it
          const results = [...task.checkpoint.results, `${label}:${i}`];
          await run.commit(() =>
            i + 1 >= steps
              ? { status: "terminal", outcome: { status: "completed", result: { label, results } } }
              : { status: "running", checkpoint: { phase: "work", done: i + 1, results } },
          );
          await s.hooks.at("unit.step-committed");
          if (held) {
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
    abort: async (_task, run) => {
      await run.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }));
    },
  });
}
