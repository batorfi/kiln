# Pi Durable flows — an explainer

> **Type:** explainer — for understanding, not a specification. **Audience:** engineers and architects who want to follow, step by step, what happens inside Pi Durable when work is submitted, interrupted, resumed, aborted and observed — and how KILN's own flow
> (steps, gates, moves) rides on top. **Companion:** [Pi Durable tasks](./pi-durable-tasks.md) — read it first if "task", "phase", "checkpoint" or "commit" are unfamiliar.
>
> **"Flow" has two meanings in this project, and this explainer covers both.** Sections 2–8 are *execution flows through the library* — the sequences of commits and tasks that a submission, a tool call or a crash sets off. Section 9 is *KILN's flow* — the Roadmap gate and the
> feature gates — and how a step and a gate are realised as those execution flows. The twelve-gate flow itself is defined in the [constitution](../../../.specify/memory/constitution.md) and [explained here](./kiln-constitution.md); this document does not restate it.
>
> **Basis.** Pi Durable **`@earendil-works/pi-durable` 1.4.0**, written from its **README, CHANGELOG and type declarations**, read — **not executed**. **[declared]** = stated by the package; **[KILN]** = KILN's own design or rule; **[open]** = to be established by the
> r42 spike. The library's normative spec (upstream `packages/durable/docs/spec.md`) was not part of the published package and was not read; where this document and that spec differ, the spec governs.
>
> Sources: [KILN on Pi Durable](../../concepts/pi-durable.md) · [r42 overview](../../../specs/010-external-completion-spike/overview.md) · PRD **CORE-3…CORE-5**.

## 1. The one idea behind every flow

Every flow below is the same move repeated: **a piece of work commits a small, atomic change, and everything else is derived from what was committed.** Nothing is shown before its commit is stored; nothing survives a crash except commits; a restart reads the commits
and continues. If you hold on to one picture, hold on to this:

```text
   intent ──commit──► state on disk ──(crash or not)──► scheduler reads state ──► next invocation ──commit──► …
              ▲ atomic: all of it, or none                    ▲ the process is only ever a visitor
```

## 2. Opening and resuming **[declared]**

```text
 process starts
   │  openNodeSqliteStorage(file)             one process owns the file; no cross-process lock
   │  Harness.open(storage, {models, registry, …})
   │  harness.root(context)                   the same root conversation as last time
   │  harness.resume()                        starts the task scheduler
   ▼
 scheduler reads every live task:
   · pending            → eligible to run
   · running (stale)    → shown pending; runs again from the top of its phase
   · waiting / sleeping → stay parked (no invocation) until their condition holds
   · blocked            → missing definition, migration failure, or restart limit; reported, not run
```

- `resume()` is idempotent; submitting a message, waiting for a submission, or calling `waitForTask` also starts scheduling. Read-only viewers never do.
- A host that **cannot keep a timer alive** (an evictable runtime such as a Durable Object) passes `onWake`: the Harness then arms no timers, and tells the host whenever `wake()` changes — `active` while some task can run, `at` for the earliest sleep — so the host sets its own alarm
  and calls `resume()` when it fires.
- **One owner at a time.** There is no cross-process locking. A second process must reach the first (or wait for it to close) rather than open the same file. KILN turns this into a feature: moving a factory is "close the store, transfer it, reopen on the new host".

## 3. One input, answered **[declared]**

The simplest flow in the library, and the template for the rest:

```text
 submit({type:"input", content, requestId})          ← requestId makes this exactly-once
   │  commit: a submission record + a pi.user entry (placed, or queued if the conversation is busy)
   ▼
 pi.generation (task)                                 one model response per turn
   │  commit: pi.system entry (only if prompt or tools changed)
   │  model request … partial answer committed at most every ~100 ms
   │  commit: pi.assistant entry (with tool calls)
   ├──► pi.tool × n  (child tasks owned by the generation)   each tool call is a durable task
   │        commit: intent BEFORE execute() · output while running · pi.tool-result when done
   │    generation WAITS on them (waiting, allSettled), then …
   ▼
 pi.generation (next turn) … → pi.assistant (final answer) → submission settles `done`
```

Key properties:

- **Deterministic `requestId`.** Resubmitting the same `requestId` returns the *same* submission. After a restart, `harness.submission(id)` reattaches a waiter. This is what lets KILN say "a restart can never start the same step twice".
- **Everything visible is committed first.** A UI never shows a partial that is not stored; a crash loses at most the progress window (about 100 ms of streamed output by default; `settings.progress` changes it).
- **The generation is a task like any other**: it checkpoints, owns the tool tasks it spawns, and waits on them without holding an invocation.

### What a kill does at each point **[declared]**

| Killed while… | On reopen |
|---|---|
| the model request is in flight | the request is **resent**; the partial answer is kept and marked aborted |
| a **replay-safe** tool is running | the tool **reruns** |
| a tool **not** declared `replay: "safe"` is running | it does **not** rerun; the model receives an `interrupted` result with the output committed so far and decides how to continue |
| the generation is waiting on its tools | it stays `waiting` and resumes when they are terminal |
| between two commits of a phase | the phase reruns from its top; the earlier commit stands |

## 4. A conversation that is busy **[declared]**

A conversation is *busy* while a run works on an input. A new submission is routed by `whenBusy`:

| `whenBusy` | Placed | Typical use |
|---|---|---|
| `followUp` (default) | when the run answers; starts the next run | "also run the tests" |
| `steer` | after the current tool round, joining the running work | "use pnpm, not npm" |
| `reject` | not at all — throws `ConversationBusy` | "only if idle" |
| a **write** (`type: "write"`) | appended without asking the model; a plain `kind`+`data` write is placed at once, even mid-run | recording that something happened |

`submission.abort()` withdraws a queued item. If a run fails, queued items stay in the inbox until the next input places them (configurable with `settings.afterFailedRun`).
[KILN] uses `steer` for work steps only, never for judges (author/judge separation); a *revise* is a follow-up to the **same** conversation, a *restart* a **new** one.

## 5. Tools, replay and nested calls **[declared]**

```text
 beforeTool hook ──► (block | rewrite args) ──► intent committed ──► execute(args, api) ──► afterTool hook ──► result committed
        ▲                                              │ crash here ⇒ replay policy decides
        └─ also sees `call.parent` for nested calls    └─ replay "safe": rerun · otherwise: `interrupted` result
```

- **Each call is its own durable task**, owned by the generation that issued it. Its intent is committed **before** `execute()` runs.
- **Three result channels**: `output` (for the model), `structuredOutput` (for programs that call the tool), `details` (for UIs).
- **Nested calls** (`api.executeTool`) are tasks owned by the caller; each has a *key* (its position, or one you pass). A replay-safe caller that reruns after a crash and calls in the same order, or with the same keys, **gets back the nested calls it already made** instead of starting them again.
  Nested results live only until the caller settles.
- **Hooks** run around calls: `beforeTool` (block or rewrite), `afterTool` (replace the result), and for generations `beforeRequest`, `afterResponse`, `onYield`, `afterTools`. `api.memo` stores a decision so a rerun reuses it — the basis of "ask a person once".
- [KILN] **replay discipline**: read-only tools are `replay: "safe"`; anything that writes or runs commands is not.

## 6. Waiting for time **[declared]**

```text
 phase A: runtime.sleepUntil(until, {phase:"B"})   ← commits `sleeping` and ENDS the phase
          … the task holds no invocation; the process may exit …
 clock reaches `until` (any process that opens the store, on the same clock) → phase B runs
```

- There is **no sleep in the middle of a phase** (the 1.4.0 changelog removed `TaskRuntime.sleep()`); sleeping is a *state*, committed, that survives restarts.
- Sleep deadlines are stored on the Harness clock (`now`); **every process that opens one storage must use the same clock**. For tests, pass `now` and `setTimer` to run on a fake clock.
- `runtime.setTimer` exists only for pacing work *inside* a phase (e.g. throttled progress commits); it is not durable and is disarmed when the invocation ends.
- [KILN] **A clock never decides.** Durable timers may remind; they never settle a gate (PRD CORE-3). A `sleeping` task is a durable timer, so it is used for reminders only.

## 7. Abort and subagents **[declared]**

```text
 abortTask(id) / conversation.abort()
   │  commit the abort mark          (a durable flag; a `running` task's next runtime.commit rejects)
   │  signal the active invocation   (its `runtime.signal` is aborted)
   ▼
 owned work is aborted FIRST (bottom-up), then this task's `abort` handler runs in a fresh invocation
   and must commit a terminal outcome  → `aborted` (or `failed`, `orphaned`, `faulted`)
```

- A **subagent** is a child conversation owned by a tool task; aborting the call aborts the child, and the parent is idle only once the child is. A **background** boundary (`background: true`) lets owned work survive its parent's abort.
- Abort is **crash-safe**: the mark is a durable flag, so an abort interrupted by a crash is still pending on restart; an abort handler cut off repeatedly ends its task `faulted`.
- [KILN] Only the **director** creates conversations; workers get no subagent tool. That is how author/judge separation and strongest-model judges stay enforced by construction.

## 8. Failure flows, side by side **[declared]**

| What goes wrong | What the library does | What it does *not* do |
|---|---|---|
| process killed / machine crash | tasks reopen `pending`; interrupted model requests are resent; replay policy decides tools | retry a non-replay-safe tool |
| a phase throws | that task is `faulted`; reported (`task_faulted`) | stop other tasks |
| a phase returns without committing | the task is `faulted` (no durable progress) | silently loop |
| a commit callback throws | that commit rolls back; that unit faults | write partial state |
| the same task crashes the process repeatedly | after `restartLimit` (default 5) it is **parked**, reported once (`task_parked`); `retryTask` re-runs it | keep crashing forever (unless `restartLimit = Infinity`) |
| a task's definition is missing after an upgrade | the task is **blocked** (`missing_task`, `task_too_old`, `migration_failed`) and shown in the graph | lose or orphan it until `orphaned` is the only option |
| **storage error** | the call rejects with it; every pending wait rejects with `SessionFailed`; running tasks are signalled; the **Harness closes itself** (`closed` settles with `reason: "failed"`) | retry built-in storage; continue |
| a listener / host callback throws | reported (`listener_error`, `host_error`); others still run | fail the Harness |
| **host power loss** (SQLite) | WAL with `synchronous = NORMAL`: process crashes are safe; **the newest commit may be lost** | guarantee the last commit survives power failure |

A host's response to `closed` is a restart: `harness.closed.then(end => end.reason === "failed" && reopen())`.

## 9. KILN's flow, realised as these flows **[KILN]**

### 9.1 A step ([KILN on Pi Durable](../../concepts/pi-durable.md) §6)

```text
 row task ──► creates a UNIT task
 unit task ──► acquires the LANE (one running generation per factory)
           ──► commit: a conversation (role instructions, tier's model, permitted tools) + `unit.started`
           ──► submit(step input, requestId = feature·gate·step·attempt)          ← section 3
           ──► model works; each turn and tool call committed before shown         ← sections 3, 5
           ── CRASH ── reopen: interrupted request resent · read-only tool reruns · a write is NOT repeated
           ──► run settles → unit task records the artifact, releases the lane, commits `unit.settled`
 row task wakes → opens the next gate
```

Nothing here needed KILN-specific recovery code. The deterministic `requestId` guarantees a restart cannot start the same step twice.

### 9.2 A gate

```text
 OPEN     row task creates the GATE task. Its first commit holds, atomically:
            the gate document · the brief as it will be shown · `gate.opened`
 WAIT     the gate task waits on a DECISION task. No code, no model, no timer.
          hours pass · the browser closes · the machine reboots → still waiting
 MOVE     a person decides. The server must, in ONE commit:
            record the move (+ decided_by, the brief seen, the idempotency key)
            COMPLETE the decision task                                           ← the open question (9.3)
 SETTLE   the gate task wakes, validates the move against the gate's vocabulary, settles;
          the row task applies it. A repeat of the same key returns the original outcome;
          a stale or losing move is refused and commits nothing.
```

What must hold at every instant a process can die (constitution V; PRD CORE-3/4/5) — the same oracle the r42 spike applies:

| After a kill at any point, the store shows… | and never… |
|---|---|
| **waiting, with no move recorded**, or | a move recorded on a still-waiting gate |
| **settled, with exactly one move recorded** | a settled gate with no move; two moves; a gate settled by a restart or a clock |

### 9.3 The step the library does not publish under its own name **[open]**

The **MOVE** step asks something of Pi Durable that its published surface does not offer directly: a transaction that records the move **and completes a different, waiting task**. A transaction can read and create tasks but not change another task's state; a task waits only on tasks or the
clock; the only external entry points are `abortTask` and `retryTask`. So the gate's decision has to be completed by one of the compositions below, or by KILN itself. r42 is the experiment that decides which.

```text
 C1  signal in-process ──► the decision task's own phase wakes ──► ONE runtime.commit: move + terminal
        outside process ──socket──► OWNER process (owns the store) ──► signal ──┘
 C2  commit move record ──► abortTask(decision) ──► abort handler commits terminal          (two commits)
 FB  commit decision RECORD (truth) ──► advance the task graph afterwards ──► converge on restart
```

Why the **owner process** appears in every variant: one process owns a storage, with no cross-process locking, so "from outside" means "through the owner". The CLI and the server worker in later rows reach the owner over a local channel, never the file.

### 9.4 Other KILN flows and what they reduce to

| KILN flow | Realisation |
|---|---|
| **revise** (corrective move) | the human's note as a follow-up submission to the **same** conversation |
| **restart / reject** | a **new** conversation for the next attempt; the old one kept for the record |
| **split + revise** | a **fork** of the work at the approved restorable point into two continuations |
| **automatic fix rounds** (Verification) | new submissions with their own `requestId`s; the round count lives in the row task's checkpoint |
| **risky action held for a person** | a `beforeTool` hook holds the call; the answer is kept with `api.memo`, so it is never asked twice after a restart |
| **delegation (unattended tail)** | a document on the feature; covered gate tasks auto-settle on a clean path and wait for a person on any objection |
| **domain event** | an outbox entry committed in the **same** commit as the change it describes |
| **moving a factory** | close the store, transfer it, reopen on the new host and resume — the one-owner rule *is* the handover protocol |

## 10. Observation flow **[declared]**

A UI never polls a task. It subscribes to committed state.

```text
 commit ─► conversation view updated ─► viewState() subscribers · watch() frames (exact Chord operations)
        └► task graph updated        ─► taskGraph() / watchTaskGraph()
 a late or reconnecting client starts from the CURRENT view; nothing is replayed
 a slow watch keeps at most 100 pending frames, then receives one frame with the whole newest view
```

[KILN] The web front door is driven only by these committed views, so a browser can come and go (constitution IX).

## 11. Reading the flows as guarantees — and their limits

| Guarantee a flow gives | Rests on | Limit |
|---|---|---|
| work survives a crash at the granularity of a commit | checkpoints + atomic commits | the newest commit can be lost on **host power failure** (WAL, `synchronous = NORMAL`) |
| a submission applies once | `requestId` and first-writer-wins memos | uniqueness is per conversation; the key must be chosen deterministically |
| a waiting task stays waiting across restarts | `waiting` and `sleeping` hold no invocation | a task that is `running` while it waits is counted against `restartLimit` |
| tools are not replayed unsafely | the `replay` declaration | KILN must declare it correctly; a "safe" tool with external effects still needs its own idempotency |
| the factory is isolated | one store, one owning process | no cross-process lock: handover must be explicit |
| a gate is settled only by a committed move | the gate contract **[KILN]** | depends on the primitive in 9.3 **[open]** |

## 12. A one-page mental model

1. Work is a chain of **atomic commits**; a process is a visitor that makes the next one.
2. A **submission** is exactly-once by its `requestId`; a **tool call** is a task whose intent is committed before it runs.
3. After a crash the scheduler reopens every live task at its **last committed state**; replay policy decides what reruns.
4. **Waiting** is a stored status (on tasks, or on the clock) that costs nothing; **aborting** is a stored mark that unwinds bottom-up.
5. Observers read **committed views**, never the process.
6. KILN's gates are waiting tasks completed by a committed move — and *how* an outside move completes one, atomically, is the single thing r42 must prove.
