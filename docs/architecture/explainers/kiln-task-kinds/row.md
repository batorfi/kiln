# `kiln.row` — the shell of one feature

> **Status:** [built] as a scripted shell (r13); the real walk of the flow is **[planned]** (r14) and the director (r18). **Code:** `tasks/row.ts`. **Proof:** `tests/tasks-lifecycle.test.ts` (ROW), `tests/proof/scale.test.ts`. **See also:** [overview](./README.md) · [vocabulary §3 (row/feature)](../../../vocabulary.md).

## What it is

A **row** is one roadmap item — a feature. `kiln.row` is the durable task that *is* that feature while it is being built. In r13 it runs a **script**: a list of unit specs, one after another, and completes when they have. Its job in this row is to prove the hard structural things — **a task can own tasks, wait for them, and resume in the middle of a list** — before r14 swaps the script for the real twelve-gate walk.

## Input and creation

```ts
tasks.create("r1", "kiln.row", { feature: "f1", script: [ { label: "a", steps: 2 }, { label: "b", steps: 1, needsLane: true } ] }, { kind: "factory" })
```

`feature` is a non-empty string; `script` is a list of **at most 50** unit specs, each checked like a unit's own input (`script[i]: …` in the refusal). A script containing `needsLane` makes the whole row refuse creation if the factory was given no lane port.

## States

```
   phase "run" (index i, unitIds)                       phase "collect" (index i, unitIds)
 ┌─────────────────────────────────────┐   ONE commit   ┌─────────────────────────────────────┐
 │ i ≥ script.length ?                 │ ─────────────▶ │ read the outcome of the last unit   │
 │   yes → terminal, completed         │ create unit i  │  not completed → terminal, failed    │
 │         {units, results[]}          │ + park waiting │  completed     → running, "run",     │
 │   no  → create script[i] as a unit  │ on its id      │                  index i+1           │
 └─────────────────────────────────────┘                └─────────────────────────────────────┘
```

* **`run`** either ends the row (all units done: result `{units, results}`, with each unit's result collected from the store) or, in **one commit**, creates the next unit as a *child owned by this row* and parks the row `waiting` on that child.
* **`collect`** runs when the child ends. A child that did not *complete* (aborted or failed) **fails the row** with `unit <id> ended <status>`. Otherwise the row advances `index` and loops.

The checkpoint holds `index` and the `unitIds` created so far — enough to resume anywhere.

## What survives a kill

| Killed… | After restart |
|---|---|
| before the create-and-park commit | `run` re-runs: the same index, the unit is created (once) |
| after it, while the unit works | the row is `waiting` on the unit; the *unit* resumes from its own checkpoint; the row wakes when it ends |
| between units | `collect` re-runs or `run` re-runs from the committed checkpoint — never a duplicate unit |

The guarantee that makes this safe is rule 4 of the [overview](./README.md#3-the-rules-every-kind-obeys): **creating the child and parking on it is one commit.** A kill cannot leave an orphan unit with no parent waiting for it, nor a parent that believes it created a unit that does not exist. The lifecycle test asserts "two units, in order, one row result" across a SIGKILL, and that the units' `owner` is the row.

## Scale

The scale proof starts 20 live units (owned by the factory) alongside 100 open gates, kills the owner and restarts it: ready in 42 ms. Rows add to the live-task count the same way.

## Not built yet

* Walking the real flow (`gate0 → concept → … → merge`), applying moves (`revise` back to the author, `reject` to an earlier gate, `restart`…), **re-crossing**, the **unattended tail**, triage skips — **[planned]**, r14/r18.
* Opening gates from a row — the row will own its gates the way it owns units; today only the roadmap task opens one.
* The row's `abort` ends the row only (`{status:"aborted"}`); a cascade to its units is the owner-tree rule of the runtime and is not exercised here.
