# KILN's task kinds — an explainer

> **Type:** explainer — for understanding, not a specification. **Audience:** engineers who will build on KILN's durable core (the walk of r14, workers of r16, the director of r18) and need to know exactly what each kind of durable task *is*, what it stores, how it waits, and what survives a crash.
> **Status tags:** **[built]** exists and is proven in row r13; **[planned]** is named in the code or the roadmap but not built yet.
> **Basis:** the code in `kiln/packages/durable/src/{tasks,gate}/` and `kiln/packages/lane/src/lane-task.ts`, and the proofs in their `tests/`. **Vocabulary:** [docs/vocabulary.md](../../../vocabulary.md). **The runtime underneath:** [Pi Durable tasks](../pi-durable-tasks.md).

## 1. What "a task kind" means here

A **task** is a durable state machine: a record in the factory's store with a *kind*, an *input* (fixed at creation), an *owner*, a *status* and a *checkpoint*. It holds no thread and no memory between steps — only its record — so a process that is killed can be restarted and every task continues from its last committed checkpoint. A **task kind** is the definition: a name, a version, an `initial` checkpoint, a map of **phases** (one handler each), and an `abort` handler that must commit a terminal outcome.

KILN defines kinds with `defineKilnTask` (in `store.ts`), a thin KILN-typed wrapper; only the `library/` directory knows how they map onto the runtime. There are **six** kinds today:

| Kind | One line | Built |
|---|---|---|
| [`kiln.roadmap`](./roadmap.md) | holds the Roadmap gate for a factory; settles only through a person's move | [built] (shell) |
| [`kiln.row`](./row.md) | the shell of one feature; owns and runs its units one after another | [built] (scripted) |
| [`kiln.unit`](./unit.md) | one piece of work by one role, in steps, result committed once | [built] (scripted) |
| [`kiln.gate`](./gate.md) | the task other work waits on; a projection of "a move exists" | [built] |
| [`kiln.decision`](./gate.md) | the gate's waiting step: the move and the completion in one commit | [built] |
| [`kiln.lane`](./lane.md) | the factory's one standing lane task (lease, resident model, swaps) | [built] (scripted) |

"Shell" and "scripted" mean: the *structure* (ownership, waiting, resuming, atomic creation) is the real thing and is proven; the *work* inside is a stand-in that later rows replace.

## 2. How they fit together

```
 factory (owner = "factory")
  ├─ kiln.roadmap ──opens──▶ gate0 ──┐                         one gate = two tasks
  │                                  ▼
  ├─ kiln.row ──creates, one at a time──▶ kiln.unit (owner = the row)
  │      ▲ waits on each unit                │ may need the lane (via the LaneApi port)
  │                                          ▼
  ├─ kiln.gate ──creates──▶ kiln.decision (owner = the gate)       kiln.lane  (standing, one per factory)
  │      ▲ waits on the decision                │ waits for a MOVE (owner-memory slot)
  └─ …
```

* **Ownership forms a tree.** A task is owned by the factory or by another task: `row → units`, `gate → decision`. Ownership is readable from the store by a fresh process (FR-005).
* **Waiting is by task, not by clock.** A parent *parks* `waiting` on its child's id; the runtime wakes it when the child ends. No KILN task sleeps on a timer; the one thing that waits for the outside world is the decision step, and it waits on a *move*.
* **Only a commit moves a task forward.** A phase ends by calling `run.commit(...)`, which writes documents, may create child tasks, and returns the task's **own** next state — a new checkpoint (`running`), a park (`waiting`, `on` some ids) or an end (`terminal`, with an outcome). All in one atomic write.

## 3. The rules every kind obeys

1. **The checkpoint is plain JSON with a `phase`.** It is everything the next invocation knows. Nothing else survives a kill.
2. **A phase's work is redoable.** A kill discards the invocation; the next one re-reads the checkpoint and does the work again. So work must be *pure in its inputs* or committed idempotently (a unit's `scan:2` is the same string however often it is recomputed).
3. **A half-done step commits nothing.** The result of work is committed only together with the checkpoint that says it is done.
4. **Creating a child and parking on it is one commit.** A kill can never leave an orphan child or a parent that forgot it.
5. **`abort` is required and must end the task** with `{status:"aborted"}` in one commit.
6. **No timers.** A kind that needs to "wait for a while" is a design error here; waiting is for a task or a move.
7. **Creation goes through the command ledger.** `tasks.create(key, kind, input, owner)` is keyed: the same key twice makes one task. Gate tasks are created by `gates.open`, the lane task by the lane's `start()`; only roadmap, row and unit can be created from outside (`CREATABLE`).
8. **Inputs are validated by name before anything is written** (`tasks/validate.ts`) — unknown fields, wrong types and a `needsLane` with no lane port are `invalid-move` refusals, not crashes.
9. **Every state change that matters writes its outbox entry in the same commit** (`gate.opened`, `move.committed`, `gate.settled`, `lane.*`).
10. **Kill points are injected, never in the environment.** Kinds call `s.hooks.at("<point>")` at named steps; tests arm them from outside.

## 4. Side by side

| | roadmap | row | unit | gate | decision | lane |
|---|---|---|---|---|---|---|
| **Created by** | `tasks.create` | `tasks.create` | `tasks.create` or a row | `gates.open` | the gate | the lane's `start()` |
| **Owner** | factory (or any) | factory (or any) | factory, or the row | factory | the gate | factory |
| **Input** | `{factory}` | `{feature, script[]}` | `{label, steps, stepMs?, needsLane?, model?, hold?}` | `{gateId}` | `{gateId}` | `{}` |
| **Phases** | `open → decide` | `run ⇄ collect` | `work` (once per step) | `open → settle` | `wait` | `serve` |
| **Waits on** | its gate task | its current unit | — (works; may wait for the lane) | its decision | **a move** (owner memory) | the factory closing |
| **Ends when** | the gate0 move exists | all units completed (or one failed) | last step committed | the decision ended | the move is committed | never (until close) |
| **Result** | `{gateId, moveKind, key}` | `{units, results[]}` | `{label, results[]}` | `{key}` | `{key}` | — |
| **Kill points** | (gate's) | — | `unit.step-begin / -after-work / -committed` | `gate.wake`, `gate.settled` | `wait.*`, `move.*` | `lane.acquire-*`, `lane.release-*` (on the port) |
| **Proof** | `tasks-lifecycle` | `tasks-lifecycle`, `scale` | `units`, `tasks-lifecycle` | `kill-points`, `random-kill`, `storm` | same | `lane-task`, `lane-proof` |

## 5. Adding a new task kind — a checklist

1. **Say what it owns and what it waits on.** If the answer to "what wakes it?" is a clock, redesign. If it is the outside world, copy the decision step's slot pattern and accept `not-ready` after a restart.
2. **Define it with `defineKilnTask`**: `name` (`kiln.<thing>`), `version: 1`, `initial`, one handler per phase, `abort`.
3. **Make each phase end in exactly one commit** that carries any outbox entry for the state it changes.
4. **Validate the input** in `tasks/validate.ts` (or the owning package) and add it to the creatable list if outside callers may make it.
5. **Name its kill points** in `hooks.ts` and call them at the interesting steps; the static test fails until declared and used agree.
6. **Prove it:** a kill/restart test per point, a fresh-reader assertion of what the store shows after the kill, an oracle invariant if there is something to balance, and a never-vacuous guard.
7. **Document it** here, and record any deviation from the plan in the row's `notes.md`.
