> Status: exploratory concept (proposal, rev 14, 2026-10-18) — **not admitted**
> Type: concept
>
> Scope note: this doc describes a *scenario* — KILN with a locally hosted webapp as its front door, its
> workers running as **Pi Durable** agents, its **gates as durable tasks**, an **event-based
> observability architecture**, **several flows on one host** (§12), and **non-local models when
> configured** (§13). It is the idea and its
> consequences, not a UX design and not a spec. Adopting it needs a **Roadmap gate** amendment of the roadmap and
> a **MAJOR** constitution amendment (Principles III, VII, VIII and IX); until both happen, `concept.md` and the
> constitution govern unchanged.
>
> Decisions taken by the human for this revision (2026-10-16):
>   - **New runtime dependencies are approved** (Pi Durable, `pi-ai`, `chord`).
>   - **The experimental status of Pi Durable is accepted**: KILN evolves with it as it stabilizes.
>   - **Gates are durable tasks.**
>   - **Observability is event-based**, not a single log file (rev 4, §6).
>   - **A large local host may run several KILN flows** (rev 5, §12).
>   - **"Gate 0" is renamed the Roadmap gate** (rev 6). It is the human's approval of the roadmap — the
>     rows, their order and dependencies — before a lane starts, re-opened at every boundary between rows.
>     The nine lane gates keep their numbers (Gates 1–9). The existing code's identifier `gate0`
>     (`move-vocabulary.ts`, the log schema, validators, the committed replay) is unchanged by this doc;
>     the new event catalog (§6.4) uses the new name.
>   - **Every gate has a plain name** (rev 7, §3.1): Concept · Design · Specification · Work plan ·
>     Implementation · Code review · Verification · Documentation · Merge.
>   - **KILN may use non-local models when configured** (rev 9, §13): local by default; egress only by a
>     configured, recorded, policy-checked choice.
>   - **Every factory keeps an LLM-maintained wiki, curated by Curators** (rev 10, §14; full concept in
>     `factory-wiki.md`). Rev 11: the LLM writes directly as in Karpathy's pattern; Curators may edit; a workshop wiki
>     anyone can edit sits alongside the factory wikis.
>   - **Factories can run anywhere** (rev 12, §15; full concept in `factories-anywhere.md`): one workshop, many hosts.
>   - **Teams work in personal workshops joined by a team space** (rev 13, §16; full concept in `team-space.md`).
>   - **The bench** — notebook, research steps and spikes (rev 14, §17; full concept in `the-bench.md`).
>
> Pi facts below come from Earendil's published material and the `@earendil-works/pi-durable` README
> (1.3.0). API names are quoted as published and are expected to move; the concept depends on the
> *primitives* (commits, tasks, waiting, documents, resume), not on exact signatures.
>
> Sources: `https://earendil.com/posts/pi-1-0/`, `https://earendil.com/posts/pi-durable/`,
> `https://pi.dev/changelog`, the `@earendil-works/pi-durable` README (npm, 1.3.0).
>
> Companion docs:
>   - The base concept:                `concept.md`
>   - UI layers & headless contract:   `ui-layers-deep.md`
>   - Human gates — why & how & what:  `gates-why-how-what.md`
>   - How KILN uses Pi Durable:        `pi-durable.md`
>   - The factory wiki:                `factory-wiki.md`
>   - Factories anywhere:              `factories-anywhere.md`
>   - Teams and the team space:        `team-space.md`
>   - The bench:                       `the-bench.md`
>   - The record (in depth):           `the-record.md`
>   - The director and Needs you:      `the-director.md`
>   - Configuration:                   `configuration.md`
>   - An extensible flow:              `extensible-flow.md`
>   - Insights:                        `insights.md`
>   - First run:                       `first-run.md`
>   - The flow, gate by gate:          `the-flow.md`
>   - In an existing codebase:          `brownfield.md`
>   - In a new codebase:                `greenfield.md`
>   - Health:                          `health.md`

# KILN — the web front door, on durable agents and durable gates

## 1. Pitch

Today KILN is **hosted by Pi**: it loads as a Pi extension (r8), draws its three layers on Pi's `ctx.ui`
(r9), and the human works inside Pi's terminal. This scenario **inverts the host relationship** and moves
the whole factory onto a durable substrate:

- **KILN is the application.** A local KILN server embeds a **Pi Durable harness** and serves a webapp on
  loopback.
- **The browser is the human's surface** for the whole process: the roadmap and its Roadmap gate, the lane walking
  its nine gates from Concept to Merge, every gate decision, the live work of each unit, and the ledger.
- **Every worker is a durable agent.** Each execution unit is a durable conversation whose model turns and
  tool calls are committed to local storage before anything is shown.
- **Every gate is a durable task.** A gate is a checkpointed state machine that waits — across crashes,
  restarts and closed browsers — until a human's move completes it.
- **The director is a durable task graph.** A row's walk from the Concept gate to the Merge gate is a tree of durable tasks; a
  restarted server resumes the factory exactly where it stopped.

The thesis does not change — one chamber, one batch, held heat, a human at every gate. What changes is
*where the human stands* (a browser, not a terminal) and *what a firing survives* (a process death, at any
point, including mid-gate).

## 2. Pi 1.0 and Pi Durable

**Pi 1.0** (2026-10-01; **1.3.0** installed here) declares the coding agent stable. KILN's r8/r9 work was
built against 0.85.1–0.87.0 through the extension API; this scenario no longer depends on that API.

**Pi Durable** (`@earendil-works/pi-durable`, experimental, built on `pi-ai` and `chord`) is a substrate for
long-running agentic applications. The primitives KILN uses:

| Durable primitive | What it gives KILN |
|---|---|
| **Harness** over one **storage** (SQLite) | one owning process (the KILN server); every change is one atomic **commit**; nothing is shown before it is stored |
| **Conversation** | one per unit: a transcript with its own agent (model, tools, instructions, working directory); **forkable** from any entry |
| **Task** (`defineTask`) | a durable state machine that **checkpoints every step**, can **own child tasks** and **wait** on them (`allSettled` / `failFast`), and resumes after a restart |
| **Document** (`defineDoc`) | typed JSON state committed atomically with transcripts and task changes |
| **Submission** with `requestId` | exactly-once admission; a retry returns the original |
| **`api.memo`** | a decision stored once (first write wins), reused on rerun |
| **Resume** | `Harness.open(...)` + `harness.resume()`; interrupted model requests resent; interrupted tools rerun only if `replay: "safe"` |
| **Observation** | `viewState()`, `watchEvents()` (late-joiner safe), `harness.taskGraph()` (every live task and its owner edges), `harness.usage()` |
| **Hooks** | `beforeTool` / `afterTool` to block or rewrite a tool call |
| **Models** via `pi-ai` | local and remote providers, including Ollama on loopback (OpenAI-compatible) |

## 3. What stays exactly the same

- **The gate rail** (the Roadmap gate + Gates 1–9), the **move vocabulary** (`kiln/contracts/move-vocabulary.ts`),
  the mitigation cap, triage routing, the unattended tail and its "vetoes survive" rule.
- **The single lane** and the **model-affinity scheduler**: one resident model, swaps only when a tier
  demands it, lane-hold for line-of-defense gates.
- **Author/judge separation**: no model approves its own work; judges run on the strongest model.
- **Headless never silently approves**; **the Roadmap gate is human-only**.
- **Local by default**: Ollama on loopback, no cloud round-trip — unless a human configures otherwise (§13).
- **The factory-log's schema and validators** — the log becomes one projection of the event stream (§6),
  not a primary record; what it says does not change.

### 3.1 The gates, by name — the default flow

*These ten gates are the **default flow**. Teams may add gates of their own between the built-in ones; the Roadmap gate
stays first, the Merge gate last, and no built-in gate can be removed — see `extensible-flow.md`. The full flow — what runs
between gates, each gate in depth, and where every move leads — is in `the-flow.md`.*

Every gate has a **name a human understands without the manual**, and each name answers one question.
Numbers stay only as the *order* along a row (Gates 1–9) and as the identifiers in existing code; in prose,
the name comes first. Three gates get new names because their old ones described a mechanism, not a
decision: **architecture → Design**, **checkpoint → Implementation**, **PR → Merge**. **Plan** becomes **Work plan**
so it is never confused with the roadmap.

The ten gates fall into three phases:

- **Program** — the Roadmap gate decides *what the factory will work on*.
- **Contract** (Gates 1–4) — decide *what to build*, before any code exists.
- **Build and prove** (Gates 5–7) — make it, and prove it is right.
- **Release** (Gates 8–9) — describe it, and ship it.

| # | Gate | The human's question | Artifact judged | Produced by | Judge (line of defense) | Moves |
|---|---|---|---|---|---|---|
| — | **Roadmap gate** | *Which features do we build, in what order?* | the roadmap (rows, order, dependencies) | the director's planner | — (program-level, human only) | approve · revise · reject · edit-rows · add-row · drop-row |
| 1 | **Concept gate** | *Is this worth building, on these premises?* | concept | concept writer (after researcher) | — | approve · revise · reject |
| 2 | **Design gate** | *Is this the right structure?* | architecture design | architecture designer | architecture critic · holds the lane | approve · revise · reject |
| 3 | **Specification gate** | *What exactly counts as done?* | specification | spec writer | — | approve · revise · reject |
| 4 | **Work plan gate** | *In what pieces, and in what order, will it be built?* | work plan (tasks and their order) | the director's planner | — | approve · revise · reject |
| 5 | **Implementation gate** | *Do we start building — from a safe, restorable point — and is this still one feature?* | a restorable commit | the director | — | approve · split+revise |
| 6 | **Code review gate** | *Is the code right, measured against the specification?* | the diff and review notes | worker(s) | code reviewer · holds the lane | approve · restart |
| 7 | **Verification gate** | *Does it actually work as specified?* | verification report | worker(s) | verifier · holds the lane | approve · reject (≤ 2 automatic fix rounds first) |
| 8 | **Documentation gate** | *Do the docs describe what was actually built?* | documentation changes | techwriter / docs synthesizer | — | approve · revise · reject |
| 9 | **Merge gate** | *Do we ship this feature?* | the pull request | PR writer | — | approve (= merge) · reject |

**Definitions.**

- **Roadmap gate.** The human admits the program before any lane starts, and re-checks it at every boundary
  between rows. Never automatic, never delegated, per flow. *(Formerly "Gate 0".)*
- **Concept gate.** The cheapest place to stop a wrong idea: scope, intent and premises are judged before any
  design exists. Skipped for small features by triage, together with the Design gate.
- **Design gate.** The structure — module boundaries, data flow, abstractions — is judged by the architecture
  critic on the strongest model, then decided by the human. Catches a build that would work but have the
  wrong shape. *(Formerly "architecture".)*
- **Specification gate.** Fixes the contract that the work plan, the code review and the verification all
  measure against. The point where the unattended tail can be armed.
- **Work plan gate.** Fixes how the work is cut into tasks and in what order — which also fixes the model
  order the lane will follow, and so its switching cost. *(Formerly "plan".)*
- **Implementation gate.** The go-ahead to start writing code. A control gate, not a content gate: it
  confirms a clean, restorable commit to build from, and is the one chance to say "this is really two
  features" (`split+revise`). It has no reject — a feature about to be built is not "done wrong". It opens
  *before* implementation; the implemented code is judged later, at the Code review gate. *(Formerly "checkpoint".)*
- **Code review gate.** An independent reviewer on the strongest model judges the diff against the
  specification. The reviewer never edits: `revise` sends its findings to the **workers** on the current code,
  and `restart` rebuilds from the restorable commit confirmed at the Implementation gate (decided 2026-10-21,
  `the-flow.md` §12).
- **Verification gate.** An independent verifier on the strongest model proves the feature meets the
  specification. A failure first triggers up to two automatic fix rounds; only then does the gate stop for
  the human.
- **Documentation gate.** The documentation is brought in line with what was actually built, not with the
  original intent.
- **Merge gate.** The final human sign-off: approve means merge. Under the unattended tail it stops at a
  ready-to-merge pull request unless the human also delegated the merge. *(Formerly "PR".)*

**Naming rules used in this doc.** Renaming the checkpoint gate to *Implementation* also frees the word
*checkpoint* for its durable meaning: in this doc a checkpoint is always a durable task's saved step.
Write the name, not the number ("the Design gate", not "Gate 2"); use the
number only when order matters ("Gates 4–9"). The three **judged gates** — Design, Code review,
Verification — are the ones with a line-of-defense judge and a held lane. Existing code keeps its keys
(`gate0`, `1-concept` … `9-pr` in `move-vocabulary.ts`); the new event catalog (§6.4) carries both, as
`gate: { order: 2, key: "design" }`.

## 4. The shape

```
 Browser (loopback)
      ▲  read models · live events (push)     │  moves & commands (request)
      │                                       ▼
 ┌──────────────────────────── KILN server (Node) ─────────────────────────────┐
 │  HTTP + session security · move & command intake                            │
 │                                                                             │
 │  Pi Durable harness ──► durable store (SQLite)   ◄── the single authority   │
 │    KILN extension:                                                          │
 │      tasks:  roadmap · row · unit · gate · lane                             │
 │      docs:   roadmap · row plan · gate · delegation · lane · outbox         │
 │      tools:  per-role tool sets, replay-declared                            │
 │    conversations: one per unit (role instructions · tier model)             │
 │                         │ outbox, in commit order                           │
 │                         ▼                                                   │
 │  Event backbone (in-process, one writer, total order)                       │
 │    ├─ factory-log projector ──► factory-log (JSONL, validated)              │
 │    ├─ state projector ────────► read models                                 │
 │    ├─ live push ──────────────► browser                                     │
 │    ├─ metrics · analytics · health · notifier                               │
 │    └─ exporter (opt-in) ──────► OTLP collector on 127.0.0.1                 │
 └──────────────────────────────────┬──────────────────────────────────────────┘
                                    │ loopback                    ┆ only if configured (§13)
                                 Ollama            private / remote providers
```

**One authority.** With gates as durable tasks, every decision is a durable commit, and every commit that
changes factory state carries its **domain events** in the same commit (§6.2). The durable store is the
**single source of truth**; the ordered event stream inside it is the factory's record; everything else —
the factory-log included — is a rebuildable projection. There is no second ledger to drift.

The KILN server is the store's **single owner**, matching Pi Durable's rule (one owning process, others
attach). The browser attaches through the server and is never a source of truth. This section describes one
flow; on a host running several, each flow has its own process and store under a shared workshop (§12).

## 5. The factory as a durable task graph

### 5.1 The tree

```
roadmap task (holds the Roadmap gate)
 └─ row task (one per admitted roadmap row)
     ├─ unit task  → conversation (triage / researcher / concept writer …)
     ├─ gate task  (Concept gate)
     ├─ unit task  → conversation (architecture designer)
     ├─ unit task  → conversation (architecture critic)      ← lane: hold
     ├─ gate task  (Design gate)
     │   …
     └─ gate task  (Merge gate)
```

- **Roadmap task** — holds the Roadmap gate. Waits for the human's roadmap decision; on approve, creates the
  next row task.
  It never creates a row the human did not admit (Principle VI), and the unattended tail never reaches it.
- **Row task** — the director for one row. Its checkpoint *is* the director's state: which gate is next,
  attempt counts, mitigation round, the work plan the human approved at the Work plan gate. It creates unit and gate tasks
  **one at a time**, waits on each, reads its outcome and decides the next step.
- **Unit task** — creates its unit's conversation, submits the input with a deterministic `requestId`
  (row, gate, unit, attempt), waits for the run to settle, and returns the artifact reference.
- **Gate task** — §5.2.
- **Lane task** — §5.4.

Because each task checkpoints every step, **the director needs no separate recovery logic**: a restarted
server re-installs the KILN extension and calls resume; each task continues from its last checkpoint.

### 5.2 Gates are durable tasks

A gate task is a state machine with a small, fixed set of steps:

1. **Open.** Commit, in one commit: the gate document (gate id, row, the artifact under judgment, the
   producing unit and model, the gate's move vocabulary) and the gate's opening event.
2. **Wait for the decision.** The gate task commits a `waiting` state on a **decision task** it owns. The
   decision task's only job is to hold until a human move for *this gate instance* is committed.
3. **Decide.** On wake, read the committed move, validate it against the gate's vocabulary and the gate's
   state, and settle with the move as the gate's outcome.
4. **Hand back.** The row task wakes, reads the outcome, and applies it (§5.5).

How a human move reaches a waiting gate:

- The server's move intake receives the move (gate instance id, move, note, the state version it was made
  against, an idempotency key) from an authenticated session.
- It commits, in **one commit**, a `kiln.move` record carrying the move and `decided_by` (taken from the
  session, never the request), and completes the decision task with that move. The idempotency key is the
  commit's `requestId`, so a retried move is admitted once.
- A move against a gate that is no longer open, or against a stale state version, is refused and nothing is
  committed.

The decision itself is guarded with `api.memo` keyed by gate instance: **the first committed move wins**, and
a rerun after a crash reads that move instead of waiting again. If the exact Pi Durable primitive for
completing a waiting task from outside changes as the library evolves, the contract does not: *the move and
the gate's completion are one atomic commit, keyed exactly-once, first move wins.*

What follows directly:

- **A missing surface never approves.** A gate task with no move simply stays `waiting`. That *is* the
  headless `WAIT` — no separate WAIT mechanism exists. The **resume token is the gate task's id**.
- **A restart never approves.** A `waiting` task resumes as `waiting`. A task that was mid-step resumes
  from its checkpoint; the only path to a settled gate is a committed move.
- **No clock decides.** Gate and decision tasks use **no durable timers**. A deadline may exist as a
  reminder elsewhere; it can never complete a gate.
- **The Roadmap gate's print-and-WAIT** becomes the roadmap task's open step: the roadmap table is committed as the
  gate document, and the task waits like any other gate.

### 5.3 Move vocabularies per gate

The gate task enforces `MOVE_VOCABULARY` on step 3, not the client. Gate-specific behaviour lives in the
gate task's steps:

| Gate | Moves | Gate-task specifics |
|---|---|---|
| Roadmap gate | approve · revise · reject · edit-rows · add-row · drop-row | owned by the roadmap task; roadmap edits committed with the move |
| Concept · Design · Specification · Work plan · Documentation | approve · revise · reject | corrective moves require a note |
| Implementation | approve · split+revise | no reject; split carries the split definition |
| Code review | approve · revise · restart | revise goes to the workers, never the reviewer; every review round is a fresh reviewer conversation |
| Verification | approve · reject | on reject, the row task runs up to **2** auto-mitigation rounds before this gate opens again for a human; the round count lives in the row task's checkpoint |
| Merge | approve · reject | under unattended delegation, approve = "ready to merge" unless merge was delegated too |

### 5.4 The single lane on a parallel harness

Pi Durable runs many tasks and conversations in parallel; KILN's lane is strictly sequential. The **lane
task** is the factory's only gate on model work:

- every unit task **acquires the lane** before its conversation's first model request, and releases it when
  its run settles;
- the lane task's checkpoint holds the resident model, the holder, the hold flag (the judged gates: Design, Code review, Verification) and the
  swap count — so affinity and hold survive a restart;
- the affinity scheduler decides which waiting unit gets the lane next; a swap is a committed lane event.

Since the row task creates units one at a time, contention is rare; the lane task makes "one running
generation in the factory" an enforced invariant instead of an emergent one. Gate tasks never take the lane —
waiting for a human holds no model.

### 5.5 Applying a move

| Move | What the row task does next |
|---|---|
| `approve` | close the unit's conversation; create the next unit or gate task |
| `revise` (note) | submit the note as a follow-up to the **same** conversation; re-open the gate when it settles |
| `reject` | end the conversation (kept for the record); a fresh conversation for the next attempt |
| `revise` (Code review) | submit the findings and the note to the **workers**, on the current code; then a fresh reviewer conversation |
| `restart` (Code review) | fresh worker conversations rebuild from the restorable commit, with the findings; then a fresh reviewer conversation — a judge never revises its verdict in place |
| `reject` to an earlier gate (any time) | stop the running step at its checkpoint; re-open the target gate's author; every gate after the target re-opens |
| `split+revise` (Implementation gate) | **fork** the row's work at the approved restorable commit into two continuations, each with its own gates |
| Roadmap gate `approve` | the roadmap task creates the admitted row task; nothing else is chained |

### 5.6 Unattended tail as durable state

Arming the tail after the Specification gate commits a **delegation document** on the row: which gates
(Work plan through Merge, Gates 4–9) are
pre-authorized, whether merge is included, who armed it and when. A gate task covered by delegation, on its
open step, checks two things: the delegation document, and the judge's verdict for the work under the gate.

- **Clean path** — the gate task settles with an **auto-approve** move whose `decided_by` names the
  delegation (spec approved by whom, when), never a human, and whose record says "no objections raised".
- **Any veto** (critic objection, reviewer `restart`, verifier `reject`, an Implementation-gate split) — the gate
  task ignores the delegation and waits for a human like any other gate.

The record therefore distinguishes a human's pre-delegated approve from a human's live approve at the level
of the commit itself.

## 6. Events and observability

*The record is described in depth in `the-record.md`; this section is its summary.*

Rev 3 kept the factory-log as one exported file. That is an audit trail, not observability: it answers
"what was decided" but not "where is the time going", "which gate keeps bouncing", "why is this unit slow",
or "what was the factory doing at 03:12 when the server died". This section replaces the single file with an
**event-based architecture**: every meaningful change produces a typed **domain event**; events flow
through one ordered **event backbone**; any number of **consumers** build their own views from it — the
factory-log being one of them. Alongside, a separate **telemetry** channel carries high-volume signals
(traces, metrics, token streams) that are useful for operating the factory but are not part of its record.

### 6.1 Three kinds of signal, kept apart

| Signal | Examples | Volume | Durability | Authority |
|---|---|---|---|---|
| **Domain events** | `gate.opened`, `move.committed`, `unit.started`, `lane.swapped`, `row.closed` | low (hundreds per row) | durable, ordered, never dropped | **the factory's record** |
| **Telemetry** | spans (row → gate → unit → model request → tool call), metrics (wait times, tokens/s, load times) | high | best-effort, can be sampled or aged out | none — operational insight |
| **Agent streams** | Pi Durable's `watchEvents()` deltas: text and thinking appends, tool output | very high | already durable in the store as transcripts | none beyond the store |

The separation is the point. Domain events are few, meaningful and permanent; they can be audited, replayed
and projected. Telemetry is plentiful and disposable; losing a span never loses a decision. Agent streams
stay in Pi Durable, where they already live; they are surfaced live and never copied into domain events.

### 6.2 Where domain events come from: the transactional outbox

A domain event must never claim something that did not happen, and nothing that happened may lack its event.
So events are written **in the same atomic commit as the state change they describe**:

- every KILN task step that changes factory state (a gate opens, a move is committed, a unit starts, the lane
  swaps) appends its event(s) to a KILN **outbox** in the store, in the same commit;
- if the commit fails, neither the change nor the event exists; if it succeeds, both do;
- a **dispatcher** reads the outbox in commit order, assigns each event its **global sequence number**, and
  publishes it on the backbone.

Because the KILN server is the store's single owner, there is exactly **one writer**, and therefore one total
order of events across the whole factory — no clock skew, no merge, no partial ordering to reason about.

### 6.3 The event envelope

Every domain event shares one envelope (CloudEvents-shaped, so standard tooling can read it):

| Field | Meaning |
|---|---|
| `id` | UUIDv7 — unique and time-sortable |
| `seq` | global, gap-free sequence number assigned by the dispatcher |
| `type` | e.g. `kiln.gate.opened` |
| `schema` | type version, e.g. `kiln.gate.opened/1` |
| `time` | commit time |
| `subject` | what it is about: `row:r10/gate:3`, `row:r10/unit:7`, `lane` |
| `actor` | who caused it: `human:<id>`, `director`, `role:<name>@<model>`, `delegation:<ref>`, `system` |
| `correlation` | the row run it belongs to (one id per admitted row) |
| `causation` | the `id` of the event that caused this one (a move causes a unit start causes a lane swap) |
| `trace` | W3C trace context, linking the event to telemetry spans (§6.7) |
| `privacy` | `public` · `internal` · `sensitive` — governs which consumers and exports may see it |
| `data` | the type-specific payload — **never prompts, answers or transcript content** |

`correlation` and `causation` make every event explainable: from any event one can walk back to the human
move or director decision that started the chain.

### 6.4 The event catalog

Grouped by subject. Each type has a JSON schema under `kiln/schemas/events/`, versioned, validated on
publish (an invalid event is a bug and fails the commit, not the consumer).

| Group | Event types |
|---|---|
| **Roadmap** | `roadmap_gate.opened` · `roadmap_gate.decided` · `roadmap.amended` · `row.admitted` |
| **Row** | `row.started` · `row.triaged` (with skip decision) · `row.paused` · `row.resumed` · `row.closed` (outcome) |
| **Gate** | `gate.opened` (artifact ref, producing role/model) · `gate.waiting` · `move.committed` (move, note ref, `decided_by`) · `move.refused` (stale / invalid / not open) · `gate.auto_approved` (delegation ref, judge verdict) · `gate.vetoed` (judge, reason ref) · `gate.settled` |
| **Unit** | `unit.queued` · `unit.started` · `unit.steered` · `unit.settled` (artifact ref) · `unit.failed` · `unit.aborted` · `unit.resumed_after_crash` |
| **Lane** | `lane.acquired` · `lane.released` · `lane.held` · `lane.swap_started` · `lane.swapped` (from → to, load time) |
| **Delegation** | `delegation.armed` (scope) · `delegation.interdicted` (veto) · `delegation.expired` (row closed) |
| **Mitigation** | `mitigation.round_started` (n of 2) · `mitigation.exhausted` |
| **Tool approval** | `tool_approval.requested` · `tool_approval.decided` |
| **Command** | `command.accepted` · `command.refused` |
| **Wiki** | `wiki.ingest_started` · `wiki.ingest_completed` (pages changed) · `wiki.page_edited` (by whom, where) · `wiki.reverted` · `wiki.query_answered` · `wiki.answer_filed` · `wiki.lint_finding` · `wiki.finding_resolved` · `wiki.schema_changed` · `wiki.digest_proposed` · `wiki.conformance_failed` · `wiki.workshop_updated` · `wiki.digest_added` · `wiki.learning_recorded` · `wiki.page_drifted` |
| **Host** | `host.joined` · `host.revoked` · `host.online` · `host.offline` · `host.suspended` · `host.resumed` · `factory.placed` · `factory.move_requested` · `factory.moved` (from, to) · `factory.move_failed` · `move.applying_on_wake` |
| **Team** | `team.subscribed` · `team.published` · `team.claim_made` · `team.claim_refined` · `team.claim_released` · `team.claim_expired` · `team.overlap_detected` · `team.request_sent` · `team.request_received` · `team.response_signed` · `team.roadmap_vote` · `team.roadmap_changed` · `team.rules_changed` · `team.member_joined` · `team.key_revoked` |
| **Bench** | `bench.note_captured` · `bench.note_promoted` · `bench.research_requested` · `bench.research_completed` · `bench.spike_started` · `bench.spike_extended` · `bench.spike_concluded` · `bench.spike_abandoned` · `bench.spike_proposed_as_feature` · `bench.shared` · `bench.candidate_proposed` · `bench.candidate_evidenced` · `bench.candidate_closed` · `bench.research_suggested` · `roadmap.correction_flagged` — never note content |
| **Configuration** | `config.changed` (file, who, before, after) · `config.check_failed` · `host.measured` · `model.checked` · `agent.version_changed` · `agent.try_run` |
| **Flow** | `flow.changed` · `gate.defined` · `flow.check_failed` · `flow.chosen` (per feature, with reasons) · `flow.gate_added_in_flight` · `gate.try_run` — gate events carry flow and gate versions |
| **System** | `server.started` · `server.recovered` (resumed tasks, waiting gates) · `store.migrated` · `dependency.upgraded` |

The catalog is a contract: adding a type is MINOR, changing a payload's meaning is a new schema version, and
removing a type needs the same care as removing a log field today.

### 6.5 The backbone and its consumers

The backbone is **in-process**: the dispatcher hands each event, in order, to every registered consumer. No
broker, no network, no extra process — the same reasoning as the single lane: one machine, one writer, one
order. Each consumer is independent:

- it keeps a **durable cursor** (the last `seq` it processed) in the store;
- it processes events **at least once** and is **idempotent** by `seq`, so delivery is effectively once;
- on start it **catches up** from its cursor; a new consumer can start from `seq` 0 and rebuild its view
  from the whole history;
- a slow or failing consumer **never blocks the factory** — it falls behind, reports its lag, and catches up.

The planned consumers:

| Consumer | Builds |
|---|---|
| **Factory-log projector** | the existing factory-log JSONL, in the existing schema; the existing validators keep running on it (r7's rule stands: no transcript content) |
| **State projector** | `FactoryState` and the read models the web surface needs (roadmap, lane, open gates) |
| **Live push** | the browser's event stream; a reconnecting browser gets a snapshot plus events since its last `seq` |
| **Metrics** | counters and histograms derived from events (§6.6) |
| **Process analytics** | per-row and per-gate flow history: lead times, loops, rework (§6.8) |
| **Notifier** | "a gate is waiting for you", "a unit failed", "recovered after crash" — **notifications only, never decisions** |
| **Health watcher** | stuck-task and anomaly detection (§6.9) |
| **Exporter (optional)** | events and telemetry to a **loopback** observability stack (§6.7) |

Every view is **rebuildable**: dropping a consumer's view and replaying from `seq` 0 must produce the same
result. The factory-log's byte-identical rebuild check from rev 3 becomes the general rule for all
projections.

### 6.6 Metrics: the questions KILN should be able to answer

*Insights — measures, definitions, and the rules that keep them honest — are detailed in `insights.md`.*

Derived from domain events (not from scraping logs), labelled by row, gate, role, model and tier:

- **Human loop** — time a gate waits for a human; decision latency per gate; revise / reject / restart rate per
  gate; how often a delegated tail is interdicted, and by which judge.
- **Quality** — veto rate per line-of-defense role; mitigation rounds per verification; Implementation-gate split rate;
  rework loops per row (gate re-opened after a corrective move).
- **Cost (KILN's real unit)** — swaps per row; time spent loading models versus generating; lane utilisation
  (held by work vs idle while a human decides); wall-clock per gate and per row.
- **Throughput** — row lead time from admission at the Roadmap gate to the Merge gate; time in each gate; units per row.
- **Model behaviour** — tokens per second, time to first token, context compactions, failed or interrupted
  requests, crash resumes — per local model.

These turn KILN's design claims into measured facts: "affinity keeps switching cheap" becomes swap-time
share; "the line of defense holds under weak models" becomes veto and escape rates over time.

### 6.7 Tracing: one trace per row

Telemetry follows **OpenTelemetry** conventions so it can be read by standard tools:

- a **trace per admitted row**; spans nest as `row → gate → unit → model request → tool call`, plus
  `lane.swap` spans and a long `gate.wait` span covering the human's think time;
- every domain event carries the trace context of the span that produced it, so an event links to its
  trace and a span to its events;
- model and tool spans come from Pi Durable's own events (`watchEvents()`, task graph), annotated with
  durations and token counts — **never content**.

The **built-in** path needs nothing extra: spans and metrics are kept locally by KILN and served to the web
surface. The **optional** path exports OTLP to a collector on **127.0.0.1** (for example a local Grafana /
Tempo / Prometheus or Jaeger stack). Export is opt-in, loopback-only, filtered by the `privacy` field, and
covered by the network scan like the Ollama endpoint.

### 6.8 Replay, time travel and analytics

Because the event stream is complete and ordered:

- **Time travel** — any projection can be rebuilt "as of" any `seq`, so the factory's state at any past
  moment can be reconstructed exactly.
- **Incident reconstruction** — after a crash, `server.recovered` plus the events before it say what was in
  flight, what resumed and which gates were waiting.
- **Process mining** — the gate and move events of all rows form an event log in the classic process-mining
  sense: which paths rows actually take, where they loop, which gate is the real bottleneck.
- **Committed replays** — today's committed nine-gate replay log becomes a committed **event stream**;
  replaying it through the consumers reproduces every view offline, which is also the strongest test of
  the projections.

### 6.9 Health without decisions

The health watcher detects conditions a human should know about:

- a task `running` with no progress events beyond a threshold; a unit resumed more than once;
- the lane idle while units are queued; a swap that took far longer than that model's usual load;
- a consumer lagging; the outbox growing faster than it drains; the store approaching its size budget;
- a gate waiting longer than its reminder interval.

It **raises signals** — notifier events, health metrics, a `system.health` read model. It never acts on a
gate, never aborts a unit, never moves the lane. Detection is observation; every corrective action stays a
human command or a director rule. *Health in full — domains, signal anatomy, severity, baselines, broken guarantees,
watching the watcher — is detailed in `health.md`.*

### 6.10 What this changes in KILN's record

- The **event stream** (the outbox, in order) is the factory's primary record; the durable store is where it
  lives, and the same commits hold the state it describes.
- The **factory-log** is one projection of that stream, kept for continuity and for its validators.
- **Audit** is "replay the stream through the validators"; compliance evidence is the stream plus its
  rebuildable projections.

## 7. Workers as durable conversations

Each unit task's conversation is configured with:

- the role's `agents/*.md` as its instructions;
- the model bound to the unit's role and tier (local Ollama by default, or a configured non-local model —
  §13 — through `pi-ai`);
- the feature's workspace as its working directory;
- only the tools that role may use (judges get read-only tools; workers get edit and bash);
- a KILN document linking it to its row, gate and unit.

Rules:

- **No model spawns a model.** Workers get no subagent tool. Every conversation is created by a unit task,
  which only the row task creates — which is how author/judge separation and line-of-defense tiers stay
  enforced.
- **Replay discipline.** Read-only tools are `replay: "safe"`; tools that write the workspace or run commands
  are not, so after a crash the model is told the call was interrupted rather than the write being repeated.
- **Resume re-establishes affinity first.** A resumed unit re-acquires the lane; if the resident model
  changed, the reload is a committed swap before the model request is resent.

## 8. Human in the loop beyond gates

Pi Durable opens two more ways into running work. Neither is a gate, and both are recorded.

- **Steering a work unit.** A human message submitted with `whenBusy: "steer"` reaches the running author
  after its current tool calls. Allowed **only into work units**, never into a line-of-defense judge
  mid-judgment.
- **Tool approvals.** A `beforeTool` hook holds a dangerous tool call (outside the workspace, destructive,
  unknown commands) until a human answers; the answer is kept with `api.memo`. A tool approval is committed
  as its own record kind, never as a move, and can never settle a gate task.

## 9. Working with the orchestrator

*The director, the planner, asking the director and Needs you are described in depth in `the-director.md`.*

The director *is* the row and roadmap tasks — deterministic code, durable by construction. The human
interacts with it through **commands**: start an admitted row, arm the unattended tail, pause after the
current unit, abort a unit, accept or reject a proposed unit split.

- **Commands never move a gate.** Only a move, committed against a waiting gate task, settles a gate.
- **Commands are commits too**, with idempotency keys, so a retried command applies once.
- **The director must not break the single lane.** It stays deterministic code; any LLM-assisted proposal is
  a unit of its own, scheduled through the lane task like any other work.

## 10. What the web surface reads

The webapp reads only committed state, through the server, and never polls:

- **Read models** from the state projector (§6.5) — roadmap, lane, open gates, row history — updated by
  domain events pushed to the browser with their `seq`; a reconnecting browser resumes from its last `seq`.
- **The factory's live structure** — `harness.taskGraph()`: roadmap, row, unit, gate and lane tasks with their
  owner edges and statuses. A waiting gate task *is* an open gate.
- **Live unit work** — Pi Durable's `viewState()` / `watchEvents()` for the running conversation.
- **Metrics, traces and health** — from the consumers in §6.6–§6.9.

## 11. Constitution impact

> **Enacted 2026-10-21 as [constitution v2.0.0](../../.specify/memory/constitution.md)**, including the three MINOR
> principles below (X knowledge is context, XI a factory is portable, XII workshops are sovereign) and the dependency
> stance. Where this table and the constitution differ, the constitution governs.

| Principle | Impact |
|---|---|
| I. Author/judge separation | Unchanged; enforced structurally — only the row task creates conversations (§7). |
| II. Lines of defense on the strongest | Strengthened: the row task binds tiers when it creates judge units; the strongest model may be a configured remote one, and a flow may require judges from a different model family than the author (§13.3). A judge is never silently downgraded (§13.6). On multi-flow hosts the strongest local model may be pinned resident for all flows (§12.4). |
| III. Single lane | **Redefined (MAJOR) for multi-flow hosts**: one lane per flow, strictly sequential inside the flow (enforced by the lane task, §5.4); how many lanes may hold how many resident models is a host-level memory budget enforced by the model pool (§12.4). On a one-flow host the principle reads exactly as today. |
| IV. Affinity is the only cost lever | Scoped and extended: affinity is the cost lever for **local** models, host-wide across flows (§12.5); remote spend is governed by budgets (§13.5). Lane state is durable; resume re-establishes affinity first. |
| V. Headless never silently approves | Unchanged; a `WAIT` *is* a waiting gate task, and only a committed move settles it (§5.2). |
| VI. Gate 0 human-only | Unchanged in substance; **renamed** to "the Roadmap gate is human-only" (a PATCH-level wording amendment). The roadmap task accepts no delegated move. The Roadmap gate is per flow; starting a flow is a recorded human command, and delegation never crosses flows (§12.6). |
| VII. Everything recorded | **Redefined (MAJOR)**: the ordered domain-event stream, committed atomically with state in the durable store, is the primary record; the factory-log and every other view are rebuildable projections of it (§6). |
| VIII. Local-first | **Redefined (MAJOR)**: "local by default; egress only by a configured, recorded, policy-checked choice" (§13). Under the default `local-only` profile it holds exactly as today. Clarifications kept: a loopback-only listener is not an outbound dependency; the optional OTLP exporter is loopback-only. The network scan becomes a check of the per-flow allowlist. Extended for factories anywhere (§15): every host and every host–workshop connection is configured, authenticated, encrypted and recorded; each host's allowlist is checked. |
| IX. No dashboard, no server | **Redefined (MAJOR)**: "one committed state, surfaces driven by domain events (never polling), a loopback server that is never a source of truth". The "event-driven, never polling" half of IX is kept and strengthened. A workshop reachable over a network (§15) requires real authentication. |

Also proposed (MINOR): **workshops are sovereign** — no act from a team space or another workshop settles a gate; only
the owning workshop's deciders, or a person it explicitly names, do (§16).

Also proposed (MINOR): a new rule that **knowledge is context, never authority** — every wiki claim traceable to a
source, and no wiki content settles a gate (§14).

Also superseded: the **zero-runtime-dependency** stance (Pi Durable, `pi-ai`, `chord` approved), and
`concept.md` §1 / §7 ("Pi-native UI", "no website") — marked with correction banners per P-VII, not rewritten.

## 12. Many kilns on one machine

Everything above describes **one flow**: one roadmap, one lane, one human deciding. KILN's single-lane
thesis came from a constraint — a local machine can hold one useful model at a time, and loading another
is the expensive move. A machine with a large unified memory (a Mac Studio-class host with 128 GB, for
example) relaxes that constraint: it can keep **several models resident at once**, and serve **several
requests concurrently** from one loaded model. This section describes how the concept supports **several
KILN flows on one host** without giving up what makes a single flow trustworthy.

### 12.1 The principle: many kilns, one workshop

A potter with more space does not build a bigger kiln with many chambers; they build **more kilns** in one
**workshop**, sharing its power, its floor and its people. KILN does the same:

- **A flow stays exactly what it is today**: one roadmap with its own Roadmap gate, one lane, units strictly
  sequential, a human at every gate. Nothing inside a flow becomes parallel.
- **The workshop is new**: a host-level layer that owns what flows share — memory, loaded models, compute,
  the human's attention, and the web surface — and decides how they are shared.

The single lane is redefined at the right level: **one lane per flow**, and a **host-level budget** for how
many lanes may hold how many models at once.

### 12.2 What a flow is

A flow is the unit of isolation. Each flow has its own:

- **roadmap and Roadmap gate**, and its own rows;
- **durable store** (its own Pi Durable harness and storage), and therefore its own ordered event stream;
- **workspace** — its own KILN-managed worktree of the repository, never a working copy a person uses; each
  feature on its own branch (§12.7);
- **owner** — the human(s) allowed to decide at its gates.

Flows never share a store, a lane, a conversation or a gate. A flow's record is complete on its own: its
event stream replays without reference to any other flow.

### 12.3 Process model

```
                          Browser (loopback)
                                 │
 ┌──────────────────────── Workshop (host supervisor) ─────────────────────────┐
 │  web surface · session security · gate inbox · host event stream            │
 │  model pool (resident set, leases, memory budget) · host scheduler          │
 │  flow registry (start · suspend · resume · retire)                          │
 └───────┬──────────────────────┬──────────────────────┬───────────────────────┘
         │ supervised           │                      │
   ┌─────▼─────┐          ┌─────▼─────┐          ┌─────▼─────┐
   │ flow A    │          │ flow B    │          │ flow C    │   one process per flow:
   │ harness   │          │ harness   │          │ harness   │   its own Pi Durable store,
   │ store     │          │ store     │          │ store     │   tasks, lane, event stream,
   │ lane      │          │ lane      │          │ lane      │   workspace
   └─────┬─────┘          └─────┬─────┘          └─────┬─────┘
         └──────── model leases from the pool ─────────┘
                                 │ loopback
                              Ollama (several resident models, parallel slots)
```

- **One process per flow.** Each flow process is the single owner of its store (Pi Durable's rule holds
  per flow). A crash, a runaway tool or a store failure in one flow cannot take down another; the
  supervisor restarts the flow, and the flow resumes from its own durable state (§5.4).
- **One workshop supervisor.** It owns the web surface, the model pool and the host scheduler. It holds no
  flow's state; it talks to flow processes over a local, authenticated channel (a Unix socket or loopback).
- **The workshop is durable too.** Its own small store holds the flow registry, the model pool's resident
  set and its leases, and the host event stream — so a host restart re-establishes which models were
  resident and which flows held them.

### 12.4 The model pool

The pool replaces "the lane loads and unloads models" with "the lane **leases** a model from the pool".

- **Resident set.** The pool decides which models are loaded, bounded by a configured **memory budget**
  (well below physical memory — the OS, the workspace tooling and the browser need theirs). Each resident
  model costs its weights plus a context reservation per concurrent slot.
- **Leases.** Before a unit's first model request, the flow's lane asks the pool for a lease on its tier
  model. A lease is **shared**: two flows on the same model share one loaded copy, each using its own
  parallel slot. A lease is released when the unit settles.
- **KILN is the authority over residency, not Ollama.** Ollama's own idle eviction must never unload a model
  out from under a lease. The pool loads explicitly, pins residency while any lease is held, and unloads
  explicitly — extending what `ollama-resident.ts` already does for one flow (`keep_alive`, explicit unload,
  "never unload the model out from under a running unit").
- **Pinned judges.** The strongest model is needed by every flow's line-of-defense roles. On a host that can
  afford it, the pool **pins the strongest model resident** for the whole session, so judging never pays a
  load and no flow's judge waits for another flow's work model to be evicted. Work models rotate around it.
- **Lane-hold becomes a lease property.** A held lease (the judged gates) guarantees the model stays resident
  between the work being judged and the verdict, exactly as today — without blocking other flows that share
  the model.

### 12.5 The host scheduler

Affinity was the only cost lever inside one flow (Principle IV). Across flows it becomes a **host-level**
lever:

- **Affinity across flows.** When several flows have units waiting, the scheduler prefers units whose model is
  already resident. A swap happens only when no waiting unit fits the resident set and the budget forces an
  eviction — the same rule as today, applied to the whole host.
- **Admission control.** A lease that would exceed the memory budget waits; the unit stays `queued` (a
  committed state, visible and explained), never fails.
- **Concurrency limit.** Concurrent generations share the GPU and memory bandwidth; past a point, adding
  flows only slows every flow. The scheduler caps concurrent generations per model and per host, and the
  cap is tuned from measured throughput (§12.8), not assumed.
- **Fairness and priority.** Flows have a priority and a fair share; a low-priority flow yields the next lease
  to a high-priority one. No flow is starved: a queued unit's wait is bounded by policy, and an unusually
  long wait is a health signal.
- **No preemption mid-generation.** A running model request is never cut to free its slot; priority applies
  at the next lease, not inside a unit.

The scheduler only orders and admits work. It never crosses a gate, never chooses a role or a model for a
unit (the flow's director does that), and never changes a flow's roadmap.

### 12.6 The human across many flows

One human with three flows is the real bottleneck, not the machine. Two consequences:

- **Gate waits become useful.** In a single flow, the lane is idle while the human thinks. With several flows,
  a gate waiting in flow A frees compute for flow B — the idle time that dominated a single flow's wall-clock
  becomes another flow's work time. This is the main reason to run several flows at all.
- **A cross-flow gate inbox.** Every waiting gate task across all flows is visible in one place, each still
  owned by its flow and decided under that flow's rules. Ordering the inbox is a convenience (oldest first,
  priority, line-of-defense first); it never changes what a move means.

Every gate rule from §5.2 holds per flow, unchanged: a move names its flow, its gate instance and the state
version; `decided_by` comes from the session; the first committed move wins; nothing approves by clock,
restart or absence. **Delegation never crosses flows**: arming the unattended tail in flow A authorizes
nothing in flow B, and **the Roadmap gate stays per flow** — starting a new flow is itself a human command, recorded in
the workshop's event stream.

Several humans can share a workshop: each flow names its deciders, and a session can only move gates in
flows it is allowed to decide.

### 12.7 Workspaces and conflicts

- **Separate repositories** are the simple case: flows cannot interfere.
- **One repository, several flows** needs isolation: each flow works in its own worktree and branch, and meets
  the others only at the Merge gate.
- **The layout** (decided 2026-10-21): **one KILN-managed worktree per factory**, created with the factory; **one
  branch per feature** (`kiln/<factory>/<row>`), cut from the base when the Roadmap gate admits it. KILN never checks out
  branches or writes files in a person's own clone. Spikes and brownfield rehearsals get their own scratch worktrees.
- **Cleanup has two owners.** When a feature closes, its row task's last step removes the local feature branch after
  merge, or keeps an abandoned one as a tag (`kiln/abandoned/<row>`) for the record. The factory owns its worktree and
  removes it only when the factory is retired. Health flags orphaned branches and worktrees; nothing else deletes them.
- **Overlap is surfaced, not resolved by machines.** When two flows touch the same files, the workshop raises
  an overlap signal (an event and a health condition) at the earliest gate where it is visible — the human
  decides whether to sequence, split or proceed.

### 12.8 Events and observability across flows

- **Each flow keeps its own ordered stream** (§6). Envelope fields gain a `flow` id; `correlation` and
  `causation` stay within a flow.
- **The workshop has its own stream** for host events: `flow.started` · `flow.suspended` · `flow.resumed` ·
  `flow.retired` · `pool.model_loaded` · `pool.model_evicted` · `pool.lease_granted` · `pool.lease_waiting` ·
  `pool.lease_released` · `host.memory_pressure` · `host.concurrency_capped`.
- **A cross-flow lease links the streams**: a flow's `lane.acquired` event references the workshop's
  `pool.lease_granted` event by id, so a unit's wait can be explained across both.
- **There is no global total order across flows**, and none is needed. Cross-flow views (the gate inbox, host
  utilisation) are projections that merge streams by time, and are labelled as such.
- **New metrics**: memory headroom; resident set over time; lease wait per tier; concurrent generations; the
  throughput each flow loses to contention (tokens per second solo versus shared); utilisation recovered from
  gate waits; fairness (share received versus share configured).
- **One trace per row still holds**; lease waits appear as spans, linked to the workshop's pool spans.

### 12.9 What concurrency changes, and what it must not

- **Timing changes; outcomes must not depend on it.** A flow's units still run in its own order, gates still
  wait for humans, and its record still replays on its own.
- **Model outputs may vary under concurrent load.** Batched inference on shared models can produce slightly
  different outputs than solo runs. KILN already does not rely on deterministic generation — every artifact
  is judged and gated — but the record notes, per model request, whether it ran on a shared model and with how
  many concurrent slots.
- **Resource exhaustion is never a decision.** Memory pressure delays leases and raises signals; it never
  aborts a unit silently, never skips a gate, and never evicts a held model.

## 13. Models beyond the machine

KILN was conceived as strictly local: Ollama on loopback, no cloud round-trip (Principle VIII). This section
opens KILN to **non-local models when — and only when — a human configures them**, without weakening any
guarantee for the factory that does not. The rule in one line: **local by default; egress only by a
configured, recorded, policy-checked choice.**

### 13.1 Locality is a property of a model

KILN keeps a **model catalog**. Every model a flow may use has an entry with:

| Field | Meaning |
|---|---|
| **locality** | `local` — this machine (Ollama on loopback) · `private` — self-hosted on infrastructure the human controls (e.g. vLLM or a team GPU host) · `remote` — a third-party provider |
| **provider and model version** | pinned exactly; a provider changing what a model name means is treated as a different model |
| **capabilities** | context size, tool calling, image input, streaming, usage reporting |
| **cost model** | load time and memory for `local`; price per input / output / cached token for `private` and `remote` |
| **data handling** | what the provider's terms promise: retention, training use, region — checked against a flow's policy (§13.4) |
| **endpoint** | the one host the model is reached at; the network allowlist is derived from these entries |

Model access already goes through `pi-ai`, which supports local and remote providers alike; KILN adds the
catalog and the policy around it. Credentials live in the operating system's keychain — never in the durable
store, events, logs, the factory-log or the browser.

### 13.2 Profiles

A flow runs under one of three named **profiles**:

| Profile | Meaning |
|---|---|
| **local-only** *(default)* | today's KILN: no egress at all, enforced by the allowlist and provable by the network scan |
| **hybrid** | local by default; named roles may use named `private` or `remote` models |
| **remote-first** | `private` / `remote` models for most roles; local only where the policy requires it |

The profile, the per-role routing (§13.3) and the egress policy (§13.4) are fixed **per flow at the Roadmap
gate** — a human decision, recorded as part of the roadmap move. Changing any of them later is a recorded
command, effective from the next unit; a running unit never changes model or locality mid-run. A flow's
profile is part of its read model and appears wherever the flow does.

### 13.3 Routing roles to models

The tier map binds each role to a model from the catalog; locality is part of the choice. Patterns this makes
possible:

- **Remote judges, local workers.** Principle II says the judges always run on the strongest model; with
  remote models allowed, the strongest may be a remote frontier model. The high-volume work (research,
  drafts, code) stays local; the few, high-leverage verdicts at the judged gates — Design, Code review,
  Verification — use the best model available. Principle II gets stronger, not weaker.
- **Local judges, remote workers.** Fast remote generation, with verdicts that never leave the machine.
- **Cross-family judging.** The judge runs on a **different model family** from the author. Models from one
  family share blind spots; a judge from another family is more likely to catch what the author missed.
  Author/judge separation becomes separation of *roles and model families*, not only of roles. A flow's
  policy may require it for the judged gates.
- **Private infrastructure.** A team GPU host serving a large model counts as `private`: no third party sees
  the data, but traffic leaves the machine and is governed like any other egress.

The director still binds models when it creates a unit (§7); routing never becomes a model's choice.

### 13.4 Egress policy: what may leave the machine

Each non-local flow has an **egress policy**, decided at the Roadmap gate:

- **What may be sent, to which locality** — for example: specifications and plans to `remote`; source code
  only to `private`; these paths never; secrets never; nothing about other flows.
- **Which provider terms are acceptable** — the catalog's data-handling fields must satisfy the policy, or the
  model cannot be routed to.
- **Checks before every request** — the outgoing context is matched against the policy, scanned for secrets
  and keys, and redacted where the policy says so. A violation **blocks the request** and raises a signal; it
  never sends a quietly trimmed version, and a blocked unit waits for a human like a stopped gate.
- **Network enforcement** — the only hosts KILN may reach are loopback plus the catalog endpoints a flow's
  policy allows. The network scan of P-VIII becomes a check of exactly that allowlist.

Tools follow the same rule: a tool that reaches the network (web research, for example) is an egress like a
model call, allowed only by policy and recorded the same way.

### 13.5 Two cost units

Local cost is **held compute** — load time and wall-clock. Remote cost is **spend** — tokens and money. Both
are first-class:

- **Affinity is a local concern.** A swap to a remote model has no load cost, so the affinity scheduler
  (Principle IV) orders local work only; a remote unit never forces a local swap.
- **Budgets.** Each flow and each row can carry a spend cap. Reaching it **pauses the lane and raises a
  signal** — it never skips a gate, never downgrades a model, never approves anything.
- **Caching.** Each durable conversation carries a stable provider session identity, so providers that cache
  prompts can reuse a unit's context across its turns.
- **The single lane stays.** One lane per flow holds for remote units too: the lane paces the human and keeps
  the record ordered, not only the memory. Remote units do not need a lease from the workshop's model pool
  (§12.4), so a host running several flows can carry more of them.

### 13.6 Fallback is policy, never reflex

Remote models bring outages, rate limits and latency spikes. Pi Durable already retries interrupted requests
and keeps partial output; beyond that:

- **A work role may fall back** (remote → local, or to another provider) only if the flow's policy names the
  fallback; the switch is recorded.
- **A judge never silently falls back to a weaker model.** Downgrading a line-of-defense judge weakens the
  defense line, so it needs a human decision; until then the judged gate's unit waits.
- **A fallback never crosses policy**: a unit whose context may not go `remote` never falls back to `remote`.

### 13.7 Events and observability

Model requests become fully attributable:

- new events: `model.request.started` / `model.request.settled` with locality, provider, pinned version,
  tokens, cost and **bytes sent**; `egress.blocked` (policy rule, unit); `budget.reached`;
  `model.fallback` (from → to, policy rule); `profile.changed`; `provider.model_deprecated`;
- an **egress audit** per flow and per row: every request that left the machine, to which provider, under which
  rule, carrying which artifacts — shown at the Merge gate as "what left the machine for this feature";
- **comparable outcomes**: veto rate, rework and lead time per model and locality, so "is local good enough?"
  becomes a measurement for each role rather than a belief.

The `privacy` field of the event envelope (§6.3) still governs export; prompt and answer content never appears
in events, whatever the model's locality.

### 13.8 What does not change

- **KILN itself stays local.** The server, the store, the record, the web surface and every decision stay on
  the machine; only model calls (and policy-allowed tools) may go out.
- **No gate rule moves.** Remote judges advise; humans decide. Profiles, budgets and fallbacks never cross,
  skip or settle a gate.
- **`local-only` remains the default and remains provable.** A machine that configures nothing behaves, and
  can be shown to behave, exactly like today's KILN.

## 14. The factory wikis and the workshop wiki

Every factory keeps its own **wiki**, and the workshop keeps one more for what all factories share — following Andrej
Karpathy's *LLM Wiki* pattern as published: immutable raw sources, interlinked markdown pages an LLM writes and
maintains **directly**, and a schema that tells it how. **Curators** — engineers responsible for a factory's knowledge
corpus — choose its sources and may edit its pages; **anyone** in the workshop can edit the workshop wiki. The full
concept is in `factory-wiki.md`; this section records how it fits the design.

- **Readable without KILN.** Every wiki is a valid **Obsidian vault** with **wikilinks**, YAML properties and no plugin
  dependencies, so it opens in Obsidian, in editors such as Zed, or in any text editor; lint checks this contract
  (`factory-wiki.md` §6).
- **Storage.** A git repository of plain markdown per wiki: `raw/` (immutable sources), `pages/` (written by the wiki
  keeper, edited by people, including `index.md`), `AGENTS.md` (the schema). Each ingest, edit and filed answer is a
  commit with an author, so every change can be reverted.
- **No approval step.** As in Karpathy's pattern, the keeper writes pages directly. The person who starts an ingest
  discusses the takeaways with the keeper and can steer it; the result is shown as an ingest summary that anyone who
  may edit can adjust or revert. Lint, on the strongest model and where possible another family, is the independent
  check.
- **The workshop wiki** is included read-only in every factory vault as `workshop/`, so factory pages link to workshop
  pages with ordinary wikilinks; it is edited in its own vault, and its steps run on spare workshop capacity at the
  lowest priority.
- **Operations as steps.** Factory-wiki ingests, queries and lint passes run as durable steps on the factory's lane, at
  lower priority than feature work, typically while the factory waits on a human, never interrupting a feature step or
  a held judge.
- **Implementation knowledge.** As each gate settles, KILN adds an implementation digest of the record to `raw/record/`
  (factory-produced, no approval step), and the keeper writes from it: a **feature story**, **technical overviews**,
  **explainers**, **how-to guides**, **reference** pages and **learnings** — grounded in code excerpts at a commit and in
  record events, marked *in progress* until the feature merges, and checked by lint for **drift** from the code. The
  Merge gate brief shows what the feature added to the wiki (`factory-wiki.md` §9).
- **Use.** The director queries the factory wiki, then the workshop wiki, when it proposes a roadmap; research and
  concept steps start from them; gate briefs show *Context from the wiki* with citations labelled by wiki, flagging
  pages that are stale, contradicted or changed while the gate was open. The wikis are **context, never authority**: no
  page settles a gate.
- **Record.** Wiki operations are events in the factory's or the workshop's stream (§6.4, *Wiki* group); `log.md` is a
  projection of them, so it cannot drift.
- **Policy.** Sources and pages stay local; a keeper on a non-local model is governed by the egress policy (§13.4);
  restricted factory content never leaves the machine and never moves to the workshop wiki on its own.

## 15. Factories anywhere

The workshop described so far is one machine. `factories-anywhere.md` separates **where people decide** from **where
factories work**: the **workshop** keeps the front door, people, policies, the gate inbox, the host registry and the
workshop wiki; **factories run on hosts** — a laptop, a team server, a VM in the team's own cloud account, a container
— each running KILN's host runtime with its own model pool and scheduler. This section records how that fits the
design; the all-in-one machine remains the default, and everything here is opt-in.

- **Hosts.** Each host has a kind, a locality (`local` · `private` · `cloud`, as for models in §13), a region and owner,
  capacity, the models it can load, a cost model and a state (online · suspended · offline). A host joins by an
  Operator's recorded approval and receives a revocable identity.
- **Placement** is a human decision at the Roadmap gate, beside profile, policy and budget; the workshop checks policy,
  model and capacity fit and estimates cost, but never decides. A `local-only` factory can be placed only on a local
  host.
- **One factory, one host.** A factory keeps its single lane, durable store, record, workspace and wiki on exactly one
  host; §12's model pool, leases and scheduler become per host.
- **Moving** a factory is a recorded command: fit check, quiesce at a step boundary, hand over the store, workspace and
  wiki, resume on the new host. Waiting gates keep waiting with the same brief; nothing is approved, skipped or
  reopened; a failed transfer leaves the factory on the old host.
- **Sleeping hosts.** A rented host whose factories all wait at gates can be suspended — gates hold no model and run no
  code — and woken by a move; the decision shows as *decided, applying on wake* until the store is open again.
- **Network failure.** A host that loses the workshop works on to its next gates; no gate is settled while its host is
  unreachable; a move made meanwhile applies exactly once on reconnection; each factory's record lives on its host and
  the workshop's views catch up in order.
- **Data.** Workspace, store and secrets stay on the host; the record is replicated to the workshop without content, as
  always; the factory wiki is reachable as a git remote; restricted content is streamed to authorised browsers without
  being stored by the workshop.
- **Security.** Host and workshop authenticate each other and encrypt all traffic; a workshop reached over a network
  uses the team's identity provider; each host's allowlist covers only the workshop, its models and what its policies
  allow.
- **Record.** New events in the *Host* group (§6.4); placement and moves join the workshop's stream.

## 16. Teams: personal workshops and a team space

`team-space.md` lets a team work on one codebase while each person runs **their own workshop**. Workshops stay
sovereign; they coordinate through a **team space** — a git repository first, written only by members' signed commits.
This section records how that fits the design.

- **Contents.** The team roadmap (changed by a **quorum** of named deciders), claims, team knowledge, published digests,
  decision requests and responses, team rules (merge rules, policy floors, protected paths, shared role instructions),
  and members with their public keys.
- **Subscribe and publish.** Each workshop pulls the team space, verifies signatures and turns what it finds into events in
  its own record; it publishes signed files by its policy. Default publishing level: **coordination** — claims, gate
  outcomes for team-roadmap features without content, provenance for pull requests to the shared `main`.
- **Claims** are made at the Roadmap gate when a team feature is adopted, refined at the Work plan gate, released at merge;
  **advisory by default**, exclusive only on protected paths; overlap across workshops appears in the gate briefs of both.
- **Decisions across workshops.** A workshop can ask for an *opinion*, satisfy a *required review* from the team's merge
  rules, or name a *delegated decider*. A required review is mirrored **in both** the Merge gate and the code host's pull
  request. Only the owning workshop's deciders — or a person it explicitly names — settle its gates.
- **Merging.** The Merge gate shows base drift (teammates' overlapping merges since the restorable start), required reviews
  and checks, and the position in the code host's merge queue when the team has one; KILN builds no queue of its own.
- **Knowledge.** A **team knowledge** tier lives in the team space, editable by every member, included read-only in member
  vaults as `team/`; merged features' stories are published to it by the author's choice.
- **Identity.** Every act is signed by a person, with **personal keys** registered through the team's **identity
  provider** where one exists; removal there revokes the key. Shared workshops can join as one member.
- **Shared hosts.** A host may serve several member workshops, each with its own leases, stores and secrets.
- **Record.** New events in the *Team* group (§6.4).

## 17. The bench: notebook, research steps and spikes

`the-bench.md` gives engineers a place in their workshop for the work they do between gates, and turns what they make
there into knowledge. This section records how it fits the design.

- **Notebook.** A private vault folder per person (`notebook/`), under the same Obsidian vault contract as all knowledge
  but with no schema and no lint findings. Capture is always explicit: clipper, editor, terminal, KILN surfaces, local voice
  transcription. The keeper links, flags contradictions and suggests promotion, at the lowest priority, and never rewrites
  notes; it uses a notebook only for its owner's questions. **Promotion** is an ingest into a tier the author chooses.
- **Research steps.** Durable steps of kind *research* with **read-only tools**, run below feature work and between
  feature steps, never on a held judge's lane; a plan (sources, role, model, estimate, egress) is shown before they run;
  results land in the notebook labelled by origin and maturity. Workshop policy can cap research time and spend.
- **Spikes.** An isolated worktree on a `spike/` branch with a question and a time box; the engineer and/or an agent work
  in it at research priority; risky actions stay held. KILN refuses pull requests from `spike/` branches to `main`. Concluding
  a spike produces a **spike report** with spike-measured results; *propose as a feature* drafts a roadmap entry whose
  Concept or Design brief starts from the report. Spike code never carries over; branches are archived.
- **Labels.** Knowledge carries an **origin** (external · factory-produced · human research · research step ·
  spike-measured) and a **maturity** (exploratory · validated · decided) into pages, briefs and director citations.
- **Gates.** Bench items can be linked to the gate they are for; only promoted knowledge is cited in a brief.
- **Roadmaps.** A per-factory **candidate list** (unordered, not the roadmap) collects candidates from notes, research and
  spike reports; the director drafts proposals from it, suggests research where it cannot size a candidate, and never
  starts or schedules bench work. The Roadmap gate brief shows evidence and readiness per proposed feature and *what we
  learned since the last approval*; findings that undermine a queued feature are flagged for the next Roadmap gate.
- **Record.** New events in the *Bench* group (§6.4); no note content is ever in an event.

## 18. Living with an experimental substrate

KILN accepts Pi Durable's experimental status and evolves with it. To keep that cheap:

- **One seam.** Every Pi Durable call lives in one KILN module (the role `kiln/pi/` plays today for the Pi
  extension API). The task graph, gate contract and lane are written against KILN's own types.
- **Pinned versions, deliberate upgrades.** An upgrade is a recorded change with its own review, not drift.
- **The contract outlives the API.** §5.2's gate contract (atomic move + completion, exactly-once, first move
  wins, no clock) is KILN's; if a primitive is renamed or replaced, the seam changes and the contract does not.
- **Contribute back.** Where KILN needs something the library lacks (for example, a first-class "complete a
  waiting task from outside"), the preferred path is upstream, not a local workaround.

## 19. Security posture

- bind to `127.0.0.1` only — unless the workshop is deliberately shared over a network (§15), in which case it uses
  TLS and the team's identity provider;
- hosts and workshop authenticate each other and encrypt all traffic; host identities are revocable (§15);
- every act in a team space is signed with a member's personal key; keys are registered through the team's identity
  provider where one exists and revoked there (§16);
- a random per-launch secret establishes the human's session — no other local process or browser tab may
  submit a move or a command;
- reject requests whose `Host`/`Origin` are not the server's own (DNS rebinding, cross-site requests);
- no cross-origin access; every state-changing request protected against forgery;
- the durable store holds full transcripts and every decision — it is protected like the workspace, and
  only the server opens it;
- domain events and telemetry never carry prompt or answer content; the `privacy` field gates what each
  consumer and the optional exporter may see, and the exporter only ever targets `127.0.0.1`;
- provider credentials live in the OS keychain only; every outbound request is checked against the flow's
  egress policy and allowlist before it leaves (§13.4).

## 20. Open design questions

- ~~**Workspace isolation**~~: **Decided 2026-10-21** (human@batorfi) — a worktree per factory, a branch per feature; the row task cleans its
  branch, the factory its worktree (§12.7).
- ~~**Model residency**~~: **Decided 2026-10-21** (human@batorfi) — every model request — including the harness's own, such as compaction — goes through a KILN provider
  in front of Ollama, must hold the lane lease and targets the resident model; a request for another model is refused
  or becomes an explicit, recorded swap. Harness housekeeping runs on the step's resident model. Only KILN sets
  `keep_alive` and loads or unloads; a model loaded behind its back is a broken-guarantee signal.
- ~~**Store lifetime**~~: **Decided 2026-10-21** (human@batorfi) — one store per factory; closed features' transcripts move to a feature
  archive beside the store; the record stays whole and unsegmented in `kiln-v1` (`pi-durable.md` §12, `the-record.md` §18).
- **Multi-flow sizing**: default memory budget, per-model concurrency caps and the flow limit for a given host,
  derived from measured throughput under contention rather than fixed numbers.
- **Flow-to-workshop channel**: the protocol between the supervisor and flow processes, and how leases
  survive a supervisor restart while flows keep running.
- **Egress policy language**: how policies name artifacts, paths and localities, and how redaction rules are
  expressed and tested.
- **Model-family identity**: how the catalog records families so cross-family judging can be enforced.
- **Telemetry retention**: how long spans and fine-grained metrics are kept locally before ageing out
  (domain events are never aged out; archived transcripts: kept forever unless an Operator sets an age-out — decided
  2026-10-21).
- **Bench**: reserving research and spike capacity per person on shared hosts; switching off keeper suggestions;
  how long archived spikes are kept (`the-bench.md` §10).
- **Teams**: exact quorum rules per team; how exclusive claims expire; publishing levels beyond coordination
  (`team-space.md`).
- **Factories anywhere**: hosts in more than one workshop (answered for team spaces: yes, `team-space.md` §13); how workspaces move; workshop failover; which container
  forms to support; other Pi Durable storage adapters (`factories-anywhere.md` §13).
- **Wikis**: a dedicated wiki keeper role or the researcher with a schema; how long a page may go unreviewed before a
  gate brief flags it; how often a factory's copy of the workshop wiki is updated; how much code implementation pages
  reproduce (`factory-wiki.md` §14).
- ~~**Event schema evolution**~~: **Decided 2026-10-21** (human@batorfi) — upcast on read; stored events never change (`the-record.md` §18).
- ~~**r9 and the Pi extension**: `kiln/pi/` remains an alternate surface or is retired.~~ **Decided 2026-10-21: retired**;
  the terminal surface is the `kiln` CLI (PRD WEB-6), and r9 closes as superseded.
- **Positioning**: from "a factory *for Pi*" to "a factory *built on* Pi's durable substrate, with its own
  surface".

## 21. Roadmap consequences (sketch, for a Roadmap gate conversation)

Not a decision — the shape the Roadmap gate would be asked to consider:

- **r9** closes as *superseded* — the Pi-embedded TUI is retired; the `kiln` CLI is the terminal surface (decided
  2026-10-21).
- **Constitution amendment** — VII, VIII and IX MAJOR, II strengthened, IV scoped, VI renamed to the
  Roadmap gate, runtime-dependency stance.
- **Durable core** — the harness behind one seam; roadmap, row, unit, gate and lane tasks; the gate contract.
- **Event backbone** — outbox, dispatcher, envelope and catalog schemas; consumer cursors; the factory-log
  projector with the existing validators running on its output; the committed replay converted to an event
  stream.
- **Observability** — metrics, per-row traces, health watcher, notifier; the opt-in loopback OTLP exporter.
- **Durable workers** — units as conversations, per-role tool sets with replay declarations, lane-gated model
  access.
- **Server and web surface** — session security, move and command intake, live projection.
- **Workshop (multi-flow)** — supervisor, flow registry, model pool with leases and memory budget, host
  scheduler, cross-flow gate inbox, host event stream. Can follow the single-flow rows: a one-flow workshop is
  the degenerate case, so the single-flow design does not need to change to admit it.
- **Models beyond the machine** — model catalog, profiles, per-role routing, egress policy and checks,
  budgets, fallback rules, egress audit. Can follow the local-only rows: `local-only` is the default and needs
  none of it.
- **The bench** — notebook vault and capture, keeper suggestions and promotion, research steps (read-only, low
  priority, plan first), spikes (worktree, time box, no-merge guard, spike report, propose as feature), origin and
  maturity labels. Can follow the knowledge row.
- **Team space** — the team-space repository, subscribe/publish, signed acts and member keys, claims and overlap,
  decision requests, merge-gate conditions mirrored to the code host, team knowledge. Can follow the workshop and
  knowledge rows.
- **Factories anywhere** — host runtime and registry, host channel and identities, placement at the Roadmap gate,
  moves with handover, sleeping hosts, per-host model pools, replication of records to the workshop, network
  authentication for a shared workshop. Can follow the workshop row: one machine is the degenerate case.
- **Wikis** — a wiki repository per factory and one for the workshop, keeper and lint roles, ingest / query / lint as
  steps, ingest summaries and revert, record digests, *Context from the wiki* in gate briefs, wiki events and the
  `log.md` projection.
- **r10 (roles and tiers)** — `agents/*.md` become conversation instructions; the tier map binds models and
  tool sets per role.
- **r11 (director and commands)** — largely absorbed: the director *is* the row and roadmap tasks; commands
  are idempotent commits.
- **r4 (cut `kiln-v1`)** — gated on the above.

## 22. One sentence

KILN keeps its kiln — one lane, held heat, a human at every gate — and makes every part of the firing
durable: workers that survive a crash, gates that wait as long as the human needs, a director that resumes
exactly where it stopped, and an ordered stream of events that explains every moment of the firing — and,
on a big enough machine, lets several kilns share one workshop, all driven from a local browser.
