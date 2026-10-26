# Pi Durable tasks — an explainer

> **Type:** explainer — for understanding, not a specification. **Audience:** engineers and architects who will build on, or review, KILN's durable core and want a precise mental model of what a Pi Durable *task* is, what it guarantees, and
> what it cannot do. **Companion:** [Pi Durable flows](./pi-durable-flows.md) (how work moves through tasks).
>
> **Basis.** Pi Durable **`@earendil-works/pi-durable` 1.4.0** (the version pinned for the r42 spike). This explainer was written from its **README, CHANGELOG, `package.json` and type declarations**, read — **not executed**. Anything marked
> **[declared]** is stated by the package; **[KILN]** is KILN's own design or rule; **[open]** is something the r42 spike has yet to establish. The library's normative spec
> (`packages/durable/docs/spec.md` in the upstream repository) is referenced by the README but was not part of the published package and was **not** read; where this document and that spec differ, the spec governs.
>
> Sources: [KILN on Pi Durable](../../concepts/pi-durable.md) · [r42 overview](../../../specs/010-external-completion-spike/overview.md) · [r42 research](../../../specs/010-external-completion-spike/research.md) · PRD **CORE-1…CORE-7**.

## 1. What a task is, in one paragraph

A **task** is a *durable state machine*: a small piece of work whose progress is saved at every step, so a process that dies can be restarted and the task carries on from its last saved point rather than from the beginning, and rather than from nowhere.
Every task has an **owner** (a conversation, or another task), a **kind** (its registered definition), an **input** (fixed at creation) and a **state** (changed only by atomic commits). A task never "runs in the background" in the usual
sense: it runs in short **invocations**, each executing one **phase**, and between invocations it holds no thread, no promise and no memory — only its stored record. That one fact explains most of the behaviour below.

```text
   task record (durable)                       process (volatile)
 ┌──────────────────────────┐              ┌───────────────────────────────┐
 │ id · kind · version      │  reserve →   │ invocation: runs ONE phase    │
 │ input        (immutable) │              │   reads the checkpoint        │
 │ owner · background       │              │   does work                   │
 │ state: status+checkpoint │  ← commit    │   commits: next state / done  │
 │ memos · restarts · marks │              └───────────────────────────────┘
 └──────────────────────────┘                        │ crash here = nothing lost but the invocation
```

## 2. Anatomy of a task definition **[declared]**

A task kind is declared once with `defineTask` and installed into a **registry** (usually inside an *extension*). The definition has six parts:

| Part | Role | Rule worth knowing |
|---|---|---|
| `name` | the kind stored in every record | a record whose kind has no registered definition is **blocked** (`missing_task`), not lost |
| `version` | the definition version stored with live input and checkpoints | lets the code evolve while old records are still live |
| `initial(input)` | the first checkpoint of a newly created task | the checkpoint is a plain JSON object with a `phase` field |
| `phases` | an exhaustive map `phase → handler` | each handler gets the task narrowed to **its** phase; TypeScript enforces the map is complete |
| `abort(...)` | runs in a fresh invocation after an abort mark | **required**, and **must commit a terminal outcome** — every task defines how it undoes its own effects |
| `migrate?(...)` | converts a record stored by an older version | runs at reservation, so a restart after a code change does not strand live tasks |

A **phase handler** has one contract: *it must commit a changed checkpoint or a terminal outcome through `runtime.commit()`*. A handler that returns without durable progress **faults the task** (the runtime-detected contract failure). This is the discipline that makes
the machine resumable: a phase is either a step that ends in a commit, or it is a bug.

The handler receives three things: the **task** (id, input, checkpoint), the **runtime** (the task's operations), and a Chord **context** (cancellation and tracing). Every runtime operation rejects after the invocation ends.

## 3. The state machine **[declared]**

```text
                  ┌──────────────── abort mark ────────────────┐
                  ▼                                            │
 create ──► pending ──reserve──► running ──commit──► pending ... (next phase)
              ▲  ▲                 │  │
              │  │                 │  ├──commit: waiting(on tasks)──► waiting ──all/first of `on` terminal──► pending
              │  │                 │  ├──commit: sleeping(until)────► sleeping ──clock reaches `until`─────► pending
              │  │ restart / close │  └──commit: terminal(outcome)──► (completing) ──owned work done──► terminal
              │  └─────────────────┘
              └─ a task running when its process dies is pending again after reopen
```

| Status | Holds an invocation? | What it means | How it leaves |
|---|---|---|---|
| `pending` | no | eligible to run; its next phase waits for the scheduler | the scheduler reserves it |
| `running` | **yes** | reserved by one in-memory invocation | the phase commits; or the process dies (back to `pending`) |
| `waiting` | no | parked **until the tasks named in `on` are terminal** (`allSettled`: all of them; `failFast`: the first failure aborts the rest) | the awaited tasks settle |
| `sleeping` | no | parked **until the Harness clock reaches `until`** | the clock passes `until`; an abort mark does *not* wait for it |
| `completing` | no | the outcome is decided, but work this task still **owns** is live | the owned work finishes |
| `terminal` | no | permanently settled; the outcome is kept as a receipt | — |

Two things to notice:

1. **There are only two ways for a task to wait: on other tasks, or on the clock.** There is no "wait for an external event" status. Anything outside the task graph that must wake a task has to do so by making a task it waits on terminal, by the clock, or by an abort.
2. **`running` is the only status that costs anything**, and it is the only status in which a crash is counted against the task (section 7).

### Outcomes

A terminal task records one of five outcomes **[declared]**:

| Outcome | Who decides | Meaning |
|---|---|---|
| `completed` (with a result) | the task | normal success |
| `failed` (with an error) | the task | an *expected* domain failure, committed deliberately |
| `aborted` | the task's abort handler | explicitly cancelled and cleaned up |
| `orphaned` | the scheduler | the task cannot resume: its definition or migration is unavailable |
| `faulted` | the runtime | a contract failure: an uncaught throw, or a phase that made no durable progress |

## 4. Commits: why a task is trustworthy

Every change of task state goes through `runtime.commit(change)`. The callback receives a **transaction handle** and the task's current record and may return the task's next state. **[declared]** The commit is atomic: *either all of it is stored or none of it.* In one commit a task can:

- return its next state — a new checkpoint, `waiting`, `sleeping` or `terminal` — **replacing its own state in the same commit**;
- create child tasks (`tx.createTask`);
- write typed documents (`tx.doc`) and append conversation entries;
- place or settle submissions.

What the transaction handle **cannot** do is change *another* task's state. It can read a task (`tx.task(id)`) and create tasks, but there is no operation that completes, wakes or aborts a different task from inside a commit. A task's state is changed by **that task's own
phases** (or by the scheduler and the abort protocol). This is by design — a task owns its state — and it is the single most important limit for KILN: see section 9.

Other properties of a commit **[declared]**:

- It **rejects** if the task is already terminal, the invocation ended, the Harness is closing, or — in a run invocation — the task carries an abort mark. A task cannot commit progress after it has been cancelled.
- A throwing commit callback **rolls back** that commit and faults only that unit.
- Inside the callback, read **only through the transaction handle**; other reads may queue behind the commit and never resolve.
- **A storage error ends the whole Harness**: the failing call rejects, every pending wait rejects, running tasks get their abort signal, and the Harness closes itself. The Harness retries nothing; a custom storage retries its own transient failures.

## 5. Ownership, children and waiting

Every task **names its owner**: its conversation (a top-level task) or another task (a child). **[declared]** Ownership is not decoration:

- **Waiting on children.** A parent commits `{status: "waiting", checkpoint, on: [childIds], policy}` and holds nothing until they finish. `allSettled` resumes when all are done; `failFast` aborts the rest on the first failure. `on` may also name other, non-owned tasks (with
  `allSettled`).
- **Finishing with live children.** A parent that finishes while it still *owns* running work becomes `completing`: its outcome is decided, but it is not terminal — and `waitForTask` does not return — until that work is done. A failed or aborted outcome aborts the owned work first.
- **Aborting is bottom-up.** Aborting a task first aborts everything it owns; its own abort handler starts only once that work is done, so each task undoes only its own effects.
- **Background tasks** (`background: true`, conversation-owned only) are a boundary: they survive their conversation's abort and do not keep it busy.
- **`abandonOnRestart`** marks a task whose creator awaited it only in memory and will not resume after a restart; the next scheduler start aborts it (and what it owns) with reason `restart` before anything runs.

```text
 conversation ──owns──► gate task ──owns──► decision task        (a gate waits on the task it owns)
                          │  status: waiting, on: [decision]
                          └─ runs no code while it waits
```

## 6. Memory a task may keep

| Mechanism | What it is | Use |
|---|---|---|
| **Checkpoint** | the task's own state, replaced on each commit | everything the *next* phase needs — because a phase reruns from its top after a restart |
| **Memo** (`runtime.memo(name, candidate)`) | a small **first-writer-wins** JSON value kept while the task can run; returns the durable winner | "decide once" values: a held answer, an idempotent choice that a rerun must reuse |
| **Task documents** | typed JSON state scoped to a task (or conversation / session) and committed atomically with it | larger or shared state, observed by `documentState()` / `watchDoc()` |
| **Input** | immutable at creation; retained while live | the arguments the task was created with |

Rule of thumb **[declared]**: *a phase reruns from its top after a restart; work after a wait goes in the next phase, and what it needs goes in the checkpoint.* The 1.4.0 changelog **removed** `TaskRuntime.sleep()` for exactly this reason — waiting inside a phase "holds an invocation and, after
a restart, reruns the phase and restarts the wait". A task now ends its phase *asleep* (`sleepUntil`) or *waiting*, and resumes in a different phase.

## 7. Crashes, restarts and the guard against loops

**Restart.** Reopening a storage and calling `harness.resume()` starts the scheduler; submitting or waiting starts it too. **[declared]** Work interrupted by a crash stays `pending`; a task that was `running` shows as `pending` until it runs again. A phase can therefore execute **more than once for the same
checkpoint** (once per interrupted attempt), and must be safe to rerun from its top.

**Closing versus crashing.** An orderly `close()` writes the tasks it stopped back as `pending` *uncounted*; a crash, an eviction or a reset counts against the task. **[declared]**

**The crash-loop guard.** A task cut off by a crash **5 times in a row without committing a new state** is **parked**: blocked with reason `restart_limit`, not active in `wake()`, reported once through `onReport` (`task_parked`). `harness.retryTask(id)` runs it again;
`settings.restartLimit = Infinity` disables parking. A *new committed state* resets the count. **[declared]** This protects against work that deterministically kills its process — and it is a trap for a task that is legitimately `running` and waiting, because a long wait across
many restarts counts as many crashes. A task parked in `waiting` or `sleeping` is not running when the process dies and is not counted.

**Blocked, not lost.** A task that cannot be reserved is shown as *blocked* in the task graph with a reason: `missing_task` (no definition registered), `task_too_old` / `migration_failed` (the definition cannot read its record), or `restart_limit`. Registering the missing definition, or
fixing the migration, unblocks it; `onWake` then reports the Session active.

**Abort handlers can loop too:** an abort handler cut off that many times ends its task `faulted`. **[declared]**

## 8. Seeing what tasks are doing

| Surface | Returns | Notes |
|---|---|---|
| `harness.taskGraph()` / `watchTaskGraph()` | every **live** task with owner edge, status, `background`, blocked reason, owned conversations | a task appears with the commit that creates it and leaves with the commit that makes it terminal; the statuses are the committed ones |
| `harness.inspect()` | live tasks and unsettled submissions; why a pending task is blocked | writes nothing, runs no task code |
| `harness.getTask(id)` / `runtime.getTask(id)` | the committed record | |
| `harness.wake()` / `onWake` | `{active, at}` — whether a process is needed now and the earliest sleep | for hosts that must wake the process themselves (e.g. an evicted Durable Object) |
| `onReport(error, info)` | `task_faulted`, `task_parked`, `task_error`, `migration_failed`, `task_outdated`, … | non-fatal failures; a host can feed `task_faulted` of one kind to its own breaker |
| telemetry | one span per phase, including its decision commit; metrics for phase duration and live tasks | content-free by design |

## 9. How KILN uses tasks, and where the edge is

### 9.1 The mapping **[KILN]** (PRD CORE-2; [KILN on Pi Durable](../../concepts/pi-durable.md) §5)

| KILN concept | Task |
|---|---|
| the Roadmap and the Roadmap gate | a *roadmap task* holding the roadmap document; waits for the human's decision |
| a feature | a *row task* — the director for one feature; its checkpoint is the director's state |
| a step | a *unit task* that creates a conversation, submits the step's input with a deterministic `requestId`, and waits for the run |
| a gate | a *gate task* that opens (committing the gate document and the brief as it will be shown) and **waits** on a decision task |
| the lane | a *lane task* every step must acquire before its first model request |
| a delegation | a document on the feature; covered gate tasks auto-settle on a clean path |

### 9.2 What this buys **[KILN]**

- *A missing person never approves* (constitution V) becomes a property of the substrate: a gate task parked in `waiting` is not touched by a restart, and nothing in it can settle without a commit.
- *Recovery code disappears*: the director is a task graph that resumes itself.
- *Exactly-once* comes from deterministic `requestId`s and memos.

### 9.3 The edge — and why r42 exists **[open]**

KILN needs a person's **move to complete the gate's decision task in the same commit that records the move**. Sections 3–4 give the shape of the problem: the move is made from outside the gate (a server handler, a CLI), a task's state is changed only by its own phases, a transaction cannot complete
another task, and a task can wait only on tasks or the clock. So "complete a waiting task from outside, atomically with the move" is **not an operation the library publishes under that name**. Whether a composition of the operations it *does* publish delivers all five of
KILN's guarantees is what the r42 spike measures, by killing a real process at every step of the sequence ([overview](../../../specs/010-external-completion-spike/overview.md)).

The candidates, in one line each:

| | Idea | Why it might or might not work |
|---|---|---|
| **C1** | the decision task's phase **awaits a signal** the owner raises, then commits the move and its own `terminal` in **one** `runtime.commit` | atomic by construction; but it is a task that is `running` while it waits — section 7's guard and section 6's caution both apply |
| **C2** | the decision task `sleep`s with a far deadline; the move commits a record and calls `abortTask`; the abort handler completes it | two commits, and a far-future deadline is still a clock |
| **Fallback** | the **decision record** is the truth; the task graph is advanced afterwards and re-derives itself after any restart | atomic for the record; the convergence code is KILN's to own |

## 10. Common mistakes (and what the library does about them)

| Mistake | Consequence | Defence |
|---|---|---|
| a phase that does work and returns without committing | the task is `faulted` | the contract: commit progress or finish |
| work *after* a wait in the same phase | it runs again from the top after a restart | put it in the next phase; keep inputs in the checkpoint |
| awaiting an in-memory promise across a long time in a phase | the phase reruns on restart; counts as a crash each time | prefer `waiting` / `sleeping`; if unavoidable, set `restartLimit` deliberately and test it |
| assuming a transaction can complete another task | it cannot | design the wake-up as "make a task it waits on terminal", or restructure |
| reading through other handles inside a commit callback | can deadlock on the commit line | read only through the transaction handle |
| a task kind not registered after an upgrade | the record is blocked (`missing_task`) | register it, or migrate |
| treating a clock as a decision | a `sleeping` task *is* a durable timer | KILN: timers may remind; they never decide (PRD CORE-3) |

## 11. A one-page mental model

1. A task is **a record plus a handful of phases**; the process is only ever a visitor.
2. State changes **only by atomic commits made by the task's own phases** (or by the scheduler and the abort protocol).
3. A task waits on **tasks or the clock**, never on "an event".
4. After any crash it resumes at the **last committed state**, in the **top of the phase** it was in.
5. Owners abort **bottom-up**; owned work holds its owner open.
6. What a task cannot do from the outside is exactly what KILN's gate contract needs — and that is the question row r42 answers.
