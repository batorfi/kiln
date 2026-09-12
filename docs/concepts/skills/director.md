> Status: ground-up concept
> Type: skill — Director (orchestrator + scheduler)
> Companion docs: `20260911-concept.md` (vision), `20260911-process-flow.md`
>
> Grounding: the "skill" framing and role definitions follow `pipeline-template`'s director role; the
> KILN-specific deltas (single-lane scheduler, lane hold-yield, model-affinity queue, lane/switch
> accounting) are ground-up KILN ideas not present in `pipeline-template`.

# KILN — Director (the orchestrator *and* the scheduler)

## 0. KILN vs pipeline framing

In `pipeline-template` the director **orestrates** a team of panes and a separate scheduler
handles concurrency. In KILN there is **no separate scheduler**: one lane, one model, strictly
sequential — and the director *is* both orchestrator **and** the single-lane scheduler. This is
the central idea, so it is repeated deliberately: the director **holds the lane, then yields it to
a worker**, and on the worker returning it becomes the *scheduler* again, picking the next
affinity-compatible unit.

The name is the thesis — a kiln *holds heat and runs one at a time*. The director runs the kiln.

## 1. Purpose

Orchestrate **one feature's** walk along the **single lane** through its gates, and — because the
lane is the only executor — **own the model-affinity ordering** of work and quality units.

In a one-lane world the orchestration work and the scheduler work are the same work.

## 2. Inputs

- The **raw idea** at kickoff, plus the **feature size** from triage (standard / small-triage).
- **`context.md`** from the researcher.
- The gate outcomes — **the human's verdicts**, surfaced as events.
- The **lane state** — which model is resident, how many switches so far, the elapsed wall-clock.

## 3. Output

The **running feature** itself: each gate's verdict applied, the **next gate opened**, and the
**cost/switch ledger updated**. Concretely the director emits a stream of **events** that the UI
layer redraws on, and it appends to the **factory log** — now with explicit **lane** and
**switch** and **wall-clock** fields.

## 4. What must NOT happen

The director's discipline is the same as the pipeline's, plus the lane discipline:

- **Never write code, test, or docs** — it *dispatches* work to workers.
- **Never decide its own gate** — a gate is blocked until a human verdict arrives *as an event*.
- **Never auto-approve when no UI is present** — a missing UI may *hide* a gate, never *silently
  approve* one.
- **Don't switch the resident model for convenience** — a switch is a swap, the expensive
  operation; it happens *only when the next unit's required tier differs*.

## 5. The lane (execution model)

The lane holds **one resident model at a time**. The director:
1. **Hand** the current unit to a worker.
2. **Yield the lane** — the lane is the worker's now, the director waits.
3. On **completion**, the worker **returns and yields back**, and the director resumes.

The director runs the next **affinity-compatible** unit on the *current* resident model and swaps
in a new model **only when the next unit's required tier differs**. This model-affinity queue is
the single biggest cost lever — it keeps the lane resident and the swap count low. In KILN's
one-lane world this is **the director's job, not a separate scheduler's** (the 14th abstraction
from `pipeline-template` is collapsed in here).

## 6. Cost accounting = the lane

`wall-clock = (work) + (switching)`, with the second term local-dominant. Keeping the lane
resident **minimizes switching**. The director tracks switch count and wall-clock on the lane
itself; the factory log gains a **`switch`** event and a **lane** field. The cost model is plain
arithmetic — no token metering, no queue depth — because the lane is the resource.

## 7. Gate handling

The nine gates are **gated moves drawn from a three-move vocabulary**: **Approve / Revise /
Reject** (small-triage features skip Concept & Architecture). Each gate is a **human** decision;
the director **waits**, never decides. Gate detail — rationale, move table, headless contract —
lives in `20260911-gates-why-how-what.md`.

## 8. Grounding

`pipeline-template/skills/director/SKILL.md` — *"the central orchestrator, not a worker. It routes
work, never writes code, test, or docs. It never decides its own gates."* KILN deltas (single
lane, `wall-clock=(work)+(switching)`, one-model lane, no auto-approve, lane/switch accounting, no
separate scheduler) are ground-up.

*The director is the kiln: it holds the lane, yields it to the worker, and runs the next job
without swapping the chamber unless the job demands a different temperature.*
