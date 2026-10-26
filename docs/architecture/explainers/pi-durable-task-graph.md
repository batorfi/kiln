# The durable task graph — an explainer

> **Type:** explainer — for understanding, not a specification. **Audience:** engineers and architects who need to read, build or reason about the *shape* of KILN's running factory: which tasks exist, who owns and waits on whom, and what that shape promises.
> **Companions:** [Pi Durable tasks](./pi-durable-tasks.md) (the unit) and [Pi Durable flows](./pi-durable-flows.md) (the movement). Read the tasks explainer first if "owner", "waiting" or "checkpoint" are unfamiliar.
>
> **Two things are called "the durable task graph", and this explainer keeps them apart.** The **library's graph** (`harness.taskGraph()`) is a *live view* of every unfinished task and its edges. **KILN's graph** is a *design*: the factory is organised as a tree of roadmap, row, unit, gate and lane tasks, so that
> the shape of the running factory *is* the shape of its work. The first is an observation tool; the second is why the observation is useful.
>
> **Basis.** Pi Durable **`@earendil-works/pi-durable` 1.4.0**, from its README, CHANGELOG and type declarations (`harness/task-graph.d.ts`, `types.d.ts`), read — **not executed**. **[declared]** = stated by the package; **[KILN]** = KILN's own design (from the concept documents); **[open]** = not yet established
> (the r42 spike, or a later row); **[inference]** = my reading of how the pieces must fit, not stated anywhere. The library's normative spec (upstream `docs/spec.md`, which the types cite as "spec §9.5") was not part of the published package and was not read; it governs where this document differs.
>
> Sources: [KILN on Pi Durable](../../concepts/pi-durable.md) · [the web front door §5](../../concepts/web-front-door.md) · [architecture explainer §5.1](./kiln-architecture.md) · [r42 overview](../../../specs/010-external-completion-spike/overview.md) · PRD **CORE-2**.

## 1. In one paragraph

Every unfinished task in a Pi Durable store is a **node**; every relationship between tasks is an **edge**. Together they form the *task graph*. It is not a separate database: it is a projection of the tasks' own committed records, rebuilt from the same commits that change them, so it can never disagree with the tasks it describes.
KILN leans on that: a feature is a tree of tasks, an open gate **is** a waiting node, a restart changes nothing about the shape, and a dashboard reads the factory's structure from the graph instead of from a bookkeeping table KILN would otherwise have to keep consistent by hand.

## 2. The library's graph **[declared]**

### 2.1 What a node carries

`harness.taskGraph()` returns `{ tasks: { [id]: node } }`. Each node:

| Field | Meaning |
|---|---|
| `id`, `kind` | the task and its registered kind (`pi.generation`, `pi.tool`, or an extension's, such as `spike.gate`) |
| `conversationId` | the conversation the task lives in |
| `owner` | the **owner task**, or absent for a task its conversation owns |
| `state` | `{status, phase}` plus status-specific fields: `waiting` → `on[]` and `policy`; `sleeping` → `until`; `completing` → the held outcome's status |
| `background` | whether this conversation-owned task is outside ordinary idle waits and aborts |
| `abortRequested` | whether a durable abort mark is set |
| `blocked?` | why it cannot run here: `missing_task`, `task_too_old`, `migration_failed`, `restart_limit` |
| `conversations` | the conversations **this task owns**, in id order |

What a node deliberately does **not** carry: the checkpoint payload, the outcome payload, the input. The graph is a *map*, not a copy. To read a task's content you use `getTask(id)`; to ask what the scheduler would do with it you use `inspect()`.

### 2.2 Three kinds of edge

```text
 ownership      task ──owns──► child task            tree edge (owner field); aborts and idle-waits follow it
 wait-for       task ──waits on──► tasks in `on`     only while status = waiting; may name tasks it does NOT own
 conversation   task ──owns──► conversation(s)       a subagent is a conversation owned by a tool task
```

- **Ownership is a forest.** A task has at most one owner; a task with no owner is owned by its conversation. Following `owner` upwards always ends at a conversation-owned root. Ownership decides *abort order* (bottom-up), *when an owner is idle* (only once what it owns is done) and *when an owner can become terminal* (not
  while it owns live work: it stays `completing`).
- **Waiting is a separate edge set.** A parent normally waits on children it owns, but `on` "may name other tasks too" (with `allSettled`). So the wait-for edges are not guaranteed to follow the ownership tree. **[inference]** A wait-for cycle between tasks would be a deadlock the graph would show as two `waiting`
  nodes pointing at each other; I found no statement in the README, changelog or types that the library detects or prevents one, so a design should not rely on that.
- **Conversation edges** connect the task world to the transcript world: the graph shows which conversations a task owns, and a conversation's record links back to its owner task.

### 2.3 Lifetime: live tasks only

> *A task appears with the commit that creates it and leaves with the commit that makes it terminal.* — README, "Task Graph"

So the graph is a picture of **now**. A task that has finished is gone from it (its small receipt remains on its record, and in KILN's event record, see section 7). A task that has *decided* its outcome but still owns live work stays visible as `completing`. A subagent whose owner task has ended is
shown as a top-level node, and the conversation record's owner link tells you where it came from.

### 2.4 How it is kept up to date

- The view is **built on the Session line by the first observer and dropped with the last**; while mounted it advances from the Session's commit publications, which are durable. **[declared]** There is nothing to poll and nothing to refresh by hand.
- You get it two ways: `taskGraph()` — a disposable, read-only Chord state you subscribe to — or `watchTaskGraph()` — a serialized *exact-frame* watch, like a conversation's `watch()`. A late or reconnecting client starts from the current graph; nothing is replayed. **[declared]**
- After a restart, tasks that were `running` appear as `pending` until they run again. The statuses shown are the **committed** ones, never an in-memory guess.
- *Blocked* is derived from the registry and the settings (`restartLimit`, installed definitions, migrations) and **follows registry changes**: installing the missing definition makes the node stop being blocked without any commit.

> **Note on the README.** The README still says that whether a pending task is blocked "is not part of the graph; `harness.inspect()` reports that". The 1.4.0 **CHANGELOG** and the **types** say otherwise — `TaskGraphNode.blocked` exists. The types govern; the README sentence predates the change.

### 2.5 Three views of the same tasks

| View | Use it to… | Cost / scope |
|---|---|---|
| `taskGraph()` / `watchTaskGraph()` | see the **structure** (owners, waits, conversations) and live statuses, continuously | live tasks only; no payloads |
| `inspect()` | ask what the **scheduler would do** with each live task right now (`running`, `ready`, `waiting`, `sleeping`, `completing`, `blocked` + reason) and list unsettled submissions | a point-in-time read; writes nothing, runs no task code |
| `getTask(id)` | read one task's **committed record**, including checkpoint and (if terminal) outcome | by id; works for terminal tasks too |

## 3. How the graph moves

```text
 commit creates task T (child of P)         ──► node T appears, pending, edge P→T
 scheduler reserves T                        ──► T running
 T commits {waiting, on:[A,B]}               ──► T waiting, wait-for edges T→A, T→B (no invocation held)
 A and B terminal (allSettled)               ──► T pending again, resumes at its checkpoint
 T commits {terminal}                        ──► if T still owns live work: completing; else the node disappears
 abort requested on P                        ──► owned work is aborted FIRST (leaves first); P's own abort handler starts only when it has drained
 process dies                                ──► nothing is removed; running nodes read pending; waiting/sleeping stay
```

Reading these as rules about the *picture*:

1. **Edges are created only by commits** (a task is created inside a commit; a `waiting` state is committed). So the graph cannot show a relationship that is not durable.
2. **A node never moves between owners.** Ownership is immutable; a different parent means a different task.
3. **A restart does not redraw the graph.** It changes `running` to `pending` and, when tasks run again, back; the structure and every waiting or sleeping node are untouched.
4. **A terminal child unblocks its waiter and then vanishes**; the waiter's next phase reads the child's outcome from the record (`outcomes([...])`), not from the graph.

## 4. Reading a graph — three snapshots

### 4.1 One input being answered **[declared]**

```text
 conversation (root)
  └─ pi.generation            running · phase: tools
      ├─ pi.tool  (read)      running
      ├─ pi.tool  (bash)      pending
      └─ (generation is waiting on both; shown `waiting`, on: [read, bash], allSettled)
```

The generation owns its tool tasks and waits on them. When the model's next turn is needed it wakes, and a new generation (or the same task's next phase) continues.

### 4.2 A gate waiting for a person **[KILN]**

```text
 conversation (factory)          (kind names below are illustrative)
  └─ kiln.row (feature F)                       waiting · on: [gate-6]
      └─ kiln.gate  (Code review)               waiting · on: [decision-6]     ← an OPEN GATE
          └─ kiln.decision                      waiting or running* · no timer
 * which it is depends on the strategy the r42 spike selects [open]
```

Everything above the decision task is `waiting` and holds no invocation. A dashboard asking "which gates need a person?" can read it straight off the graph: a gate node whose status is `waiting`.

### 4.3 After a power-cycle

The same picture, with any previously `running` node shown `pending` until the scheduler runs it again. No gate has changed state; no node has appeared or disappeared except those a task committed before the process died.

## 5. KILN's graph — the factory as a tree **[KILN]**

### 5.1 The shape

```text
 roadmap task                    holds the Roadmap gate; admits ONE feature at a time
  └─ row task                    the director for one feature; its checkpoint IS the director's state
      ├─ unit task ──► conversation   a step: researcher, designer, critic, worker, …
      ├─ gate task                    Concept gate        ─ waits on a decision task it owns
      ├─ unit task ──► conversation
      ├─ gate task                    Architecture gate
      │   …
      └─ gate task                    Merge gate
 lane task                       the factory's single lane: holder, resident model, hold flag, swap count
```

*(After the amendment of 2026-10-25 there are twelve gates in the default flow; two of them — Experience design and UI review — apply only to interface work and are recorded as not applicable otherwise. How a not-applicable gate appears in the tree is for r14/r15 to decide.)*

### 5.2 Who creates, owns, and waits on whom

| Node | Created by | Owned by | Waits on | Its checkpoint holds | Lives until |
|---|---|---|---|---|---|
| **roadmap task** | factory start-up † | the factory conversation † | the human's roadmap decision | the roadmap document reference | the factory's lifetime (the gate re-opens after every merged or abandoned feature) |
| **row task** | the roadmap task, on `approve` of a row it admitted | the roadmap task | **one** unit or gate task at a time | which gate is next, attempt counts, the mitigation round, the approved work plan | the feature merges or is abandoned |
| **unit task** | the row task | the row task | its conversation's run | the step's request id, the artifact reference | the step settles |
| **gate task** | the row task | the row task | **a decision task** it owns | the gate document reference, the brief-as-shown reference | the move settles it |
| **decision task** | the gate task | the gate task | *(it is what is waited for)* | — | a committed move completes it |
| **lane task** | factory start-up † | the factory conversation † | — | holder, resident model, hold flag, swap count | the factory stops |

† The concept documents do not say who creates the roadmap and lane tasks or who owns them; the table shows the only arrangement consistent with the rest of the design **[inference]**. The rows for row, unit, gate and decision tasks follow the documents directly.

Design consequences:

- **One at a time.** The row task creates one unit or gate and waits on it before deciding the next step. The graph for a feature therefore has, at any instant, a **single active branch** under its row — easy to read, and a deliberate match to the constitution's *one lane, sequential inside it*.
- **The row task's checkpoint is the director.** Where the work is, how many attempts a gate has taken, which mitigation round Verification is on — all of it is in one checkpoint that resumes with the task. There is no separate recovery code for orchestration.
- **Only the director creates conversations.** Unit tasks create the step's conversation; workers get no subagent tool. In graph terms: *conversation edges appear only under unit tasks created by the row task* — the crew cannot grow the graph.
- **Gates never take the lane.** Waiting for a human holds no model, so a gate node never competes with a unit for the lane.

### 5.3 What the graph lets KILN read for free

| Question | Read it as | Why it is trustworthy |
|---|---|---|
| Which gates need a person? | gate nodes in `waiting` ("Needs you") | a waiting gate task *is* the open gate; there is no separate "pending approvals" table |
| What is the factory doing now? | the active branch under each row, with each node's `phase` | statuses are committed, not guessed |
| Is anything stuck? | nodes with `blocked`, `abortRequested`, or `completing` for long | the library derives them; KILN does not infer |
| Is the lane honest? | at most one `running` generation across the factory | the lane task enforces it; the graph lets a health check *verify* it |
| Did a restart lose structure? | compare the graph before and after | it should differ only in `running`↔`pending` |
| Is anything waiting on a clock? | any `sleeping` node under a gate | KILN allows durable timers to *remind*, never to decide; a `sleeping` gate or decision node would be a broken-guarantee signal |

### 5.4 What the graph is *not*

- **Not the record.** The graph holds only live tasks and no payloads; once a task is terminal it leaves. KILN's history — who decided what, on which evidence, caused by what — lives in the **event record** committed with each change (constitution VII), from which the factory-log and every audit view are projections.
  The graph answers "what is happening", the record answers "what happened".
- **Not a scheduler.** The graph reports the scheduler's world; it does not drive it. Only commits and the abort protocol change tasks.
- **Not the transcript.** What a model said lives in conversations; the graph links to them by owner and by `conversations`.

## 6. Where tasks must touch tasks — the open edge **[open · inference]**

Every task owns its state, and a commit's transaction handle can read and create tasks but not change another one's state ([tasks explainer](./pi-durable-tasks.md) §4). That is a clean rule for a graph — and it makes **every cross-branch interaction** a design question. KILN's concept documents have at least three such interactions:

| Interaction | What has to happen | Status |
|---|---|---|
| **A move completes a waiting gate** | an outside actor (the server) records the move *and* completes the decision task, in one commit | **the r42 spike** tests the compositions; the verdict decides the gate contract |
| **A unit acquires and releases the lane** | the lane task's checkpoint records the holder; a unit must become the holder before its first model request | **[inference]** The concept documents say the lane task's checkpoint "holds the resident model, the holder, the hold flag and the swap count" and that units "acquire" it, but do not say how a *unit* changes the *lane task's* checkpoint. Under the rule above, that is the same shape of problem as the move. The lane is r16's, and the r42 answer will constrain it; it is worth deciding whether the lane is a task at all or a KILN-owned record the unit tasks consult. |
| **The roadmap task admits a row** | on `approve`, the roadmap task creates the row task | **no problem** — creating a task is something a commit *can* do; the roadmap task does it in its own phase |

The pattern to carry away: **creating a child is always possible; reaching into another task's state is not.** A graph built from "owners create children and wait for them to finish" is natural in this library; a graph that needs a *third party* to wake a waiter has to route through the one external door (the owner process and a signal, an abort, or a KILN-owned record).

## 7. The graph, the record, and the screens

```text
        commits (atomic, one line)
   ┌───────────────┬───────────────────────────┐
   ▼               ▼                           ▼
 task records   conversation entries     domain events (outbox, in the SAME commit)
   │               │                           │
   ▼               ▼                           ▼
 taskGraph()    viewState()/watch()      the record → factory-log, read models, health
 "structure"    "live conversation"      "what happened and why"
```

The web front door reads **committed state only, never polls**: the read models and events for "what happened", `viewState()`/`watchEvents()` for the running conversation, and `taskGraph()` for **the factory's live structure** — roadmap, row, unit, gate and lane tasks with owner edges and statuses. **[KILN]** The graph is the screen's skeleton; the record is its memory.

## 8. Failure and recovery, seen on the graph

| Event | What the graph shows | What the operator can do |
|---|---|---|
| process killed | same structure; `running` nodes read `pending` | nothing — resume and watch them run again |
| a task keeps crashing the process | after the limit (default 5) the node reads `blocked: restart_limit` and is not active | `retryTask(id)` after fixing the cause; or `abortTask` |
| a definition is not registered after an upgrade | `blocked: missing_task` (or `task_too_old` / `migration_failed`) | install or migrate; the node unblocks by itself |
| an abort is requested | `abortRequested` on the subtree; leaves terminate first; owners go `completing` until their owned work drains | wait; owners finish bottom-up |
| a task decides its outcome but owns live work | `completing`, with the held outcome's status | none — it becomes terminal when the work drains |
| a gate waits for days | `waiting` all the way up the branch; no invocation, no model | nothing — *that is the gate working* |
| **an abort handler is cut off too often** | the task ends `faulted` | investigate the cause; an abort handler is rerun from its top, so keep it safe to repeat |

## 9. Design cautions

1. **Don't let wait-for edges diverge from ownership without a reason.** `on` can name unowned tasks; do it deliberately and document it, because the graph's tree will no longer tell the whole story.
2. **Keep gates shallow.** A gate is a task plus one decision task; do not hang unrelated work under it — "which gates need a person" should stay a one-line read.
3. **Don't read history from the graph.** Terminal tasks leave; use the record.
4. **Treat `sleeping` under a gate as an alarm.** KILN's rule is that no clock settles a gate; a sleeping gate or decision node is exactly what the rule forbids.
5. **A task that is `running` while it effectively waits** (for example awaiting an in-memory signal) looks like work in the graph and is counted against the restart limit. Prefer `waiting` or `sleeping` whenever the wait is on tasks or the clock.
6. **Mind the nesting.** Nothing bounds how deeply tasks nest (a tool may even call itself); restrict who may call what, and keep KILN's own tree to the five kinds above.

## 10. A one-page mental model

1. The **task graph is a live map** of unfinished tasks: owners (a forest), wait-for edges, owned conversations. It is derived from the same commits as the tasks, so it cannot lie about them.
2. **Nodes appear when created and vanish when terminal.** Structure is durable across restarts; only `running` becomes `pending`.
3. **Creating children is free; waking a stranger is not.** That one asymmetry shapes every cross-branch design in KILN.
4. **KILN's graph is a tree on purpose:** roadmap → row → one unit or gate at a time, plus a lane. An open gate is a waiting node; "Needs you" is a query over the graph.
5. **The graph says what is happening; the record says what happened.** Keep them apart.
6. The two places the tree must reach across branches — a move completing a gate, and a unit taking the lane — are the open design questions the durable core (r13, r16) inherits from r42.
