# `kiln.unit` — one step of work

> **Status:** [built] as a scripted shell (r13); real role conversations on models are **[planned]** (r16). **Code:** `tasks/unit.ts`, input check in `tasks/validate.ts`. **Proof:** `tests/proof/units.test.ts` (9 kill cases), `tests/tasks-lifecycle.test.ts`, `packages/lane/tests/lane-task.test.ts`. **See also:** [overview](./README.md) · [lane](./lane.md) · [vocabulary §5 (step/unit)](../../../vocabulary.md).

## What it is

A **unit** is the smallest piece of work KILN schedules: *one piece of work by one role*, in a number of **steps**. (User-facing docs say "step"; in code a step of the factory is a `kiln.unit` task.) Its contract is the one that matters most for agents: **a half-done step never commits its result.** If the process dies mid-step, the work is redone from the last checkpoint and the result is committed once.

## Input and creation

```ts
tasks.create("u1", "kiln.unit", { label: "scan", steps: 3, stepMs: 60 }, { kind: "factory" })
tasks.create("u2", "kiln.unit", { label: "gen", steps: 2, needsLane: true, model: "m1", hold: true }, { kind: "factory" })
```

| Field | Meaning | Rule |
|---|---|---|
| `label` | what the unit is | non-empty string |
| `steps` | how many steps | integer 1–100 |
| `stepMs` | scripted duration of each step (the **work a kill can interrupt**) | integer 0–60 000; *not* a durable timer — it settles nothing |
| `needsLane` | the step runs a generation and must hold the lane | boolean; creation is **refused by name** if the factory has no lane port |
| `model`, `hold` | with `needsLane`: the model the generation needs resident, and whether the lane must keep it | only valid with `needsLane: true` |

## One step, in order

```
 phase "work"  — checkpoint { done: i, results: [...] }
   hook  unit.step-begin
   [needsLane] await lane.acquire(task, {model, hold, cause "task:<id>/step:<i>"})     ← may wait its turn
   the scripted work of step i (stepMs, interruptible by the factory closing)
   hook  unit.step-after-work                    ← work done, NOT recorded: a kill here redoes it
   ONE commit:  last step ? terminal(completed, {label, results+[label:i]})
                         : running, checkpoint { done: i+1, results+[label:i] }
   hook  unit.step-committed                     ← recorded; the lane (if held) not yet released
   [needsLane] lane.release(task)
```

The work of step *i* is **pure in its inputs** (`"<label>:<i>"`), so redoing it after a kill gives the same string. The unit's **result** — `{ label, results: ["scan:0","scan:1","scan:2"] }` — is committed exactly once, in the last step's commit; until then a fresh reader sees the unit unfinished and **no result at all**.

## What survives a kill (proven at every point, for every step)

| Killed at | The store shows | After restart |
|---|---|---|
| `unit.step-begin` | previous checkpoint, no result | step redone from scratch |
| `unit.step-after-work` | previous checkpoint — the work left **no trace** | step redone |
| `unit.step-committed` | the step recorded (or, for the last step, the whole result) | resume at the next step, or already finished |

`units.test.ts` kills at each of the three points in each of three steps (9 cases), reads the wreck with a fresh reader, restarts, and asserts the result equals an uninterrupted unit's — each step's output **once**. A never-vacuous test fails by name if a case did not fire.

## The lane

A unit with `needsLane: true` brackets its work with `lane.acquire` / `lane.release` on the **`LaneApi` port** (the durable package cannot import the lane package, so the port is injected). If the process dies while the lease is held, nothing is running any more; the restarted owner **releases the dead lease at start** (`lane.released`, actor `factory`, cause `restart`) and the resumed step simply asks again — see [`kiln.lane`](./lane.md). If the factory is closing while a step waits for the lane, the unit returns without committing anything.

## Failure and abort

`abort` ends the unit `{status:"aborted"}` in one commit. Repeated *process crashes* never park a unit: the runtime is opened with `restartLimit = Infinity` (see [Pi Durable tasks](../pi-durable-tasks.md) for how the runtime treats errors thrown from a phase). A **row** that owns the unit treats any non-`completed` end as its own failure.

## Not built yet

Real work — a role conversation on a model with tools, streaming into the record, cost and token events — is r16. What r13 fixes is the *shape* real work must obey: checkpoint, redo, commit once.
