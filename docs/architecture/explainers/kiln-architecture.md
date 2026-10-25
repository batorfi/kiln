# How KILN is built — an architecture explainer

> **Type:** explainer — for understanding, not a specification. **Audience:** engineers new to KILN's design who want to
> know how the parts fit together and why they are shaped this way. **Status:** describes the **new KILN** as designed in
> the concept documents and the PRD (2026-10); the implementation is planned in [`specs/ROADMAP.md`](../../../specs/ROADMAP.md)
> and has not started. Where this explainer and a concept doc differ, the concept doc governs.
>
> Sources: [PRD §8–9](../../prd/kiln-prd.md) · [web front door](../../concepts/web-front-door.md) ·
> [KILN on Pi Durable](../../concepts/pi-durable.md) · [the record](../../concepts/the-record.md) ·
> [the director](../../concepts/the-director.md) · [the flow](../../concepts/the-flow.md) ·
> [factories anywhere](../../concepts/factories-anywhere.md) · [configuration](../../concepts/configuration.md) ·
> [knowledge](../../concepts/factory-wiki.md) · [team space](../../concepts/team-space.md) · [health](../../concepts/health.md)

## 1. The problem the architecture solves

KILN lets AI agents do real feature work while people make every decision that matters. That sounds like a UI problem —
show people the work, let them click *approve*. It is really a **correctness** problem, because KILN makes promises that
must hold even when things go wrong:

- **No gate is ever approved by anything but a person's move** (or an explicit, recorded delegation on a clean path) — not
  by a crash, a restart, a timeout or a missing browser.
- **No model approves its own work**, and judges always run on the strongest model.
- **Nothing is lost** when the machine crashes; work resumes where it stopped.
- **Every decision is explainable** afterwards: who, on what evidence, caused by what.
- **Nothing leaves the machine** unless a policy allows it, and then it is recorded.

Most of the architecture exists to make those promises **structural** — true because of how the parts are built, not
because every piece of code remembers to check.

## 2. The big picture

*The same picture as an infographic, with every connection numbered: [`../visualisations/kiln-platform-architecture.png`](../visualisations/kiln-platform-architecture.png).*

```
                         person (browser, loopback)                 person (CLI)
                                   │                                     │
 ┌─────────────────────────────────┴───── WORKSHOP ──────────────────────┴───────────────────────────┐
 │  server: front door, session security, read models, live push, move & command intake              │
 │  people · roles · policies · factory registry · placement · Needs you · workshop wiki · health    │
 │  workshop store (its own small durable store and record)                                          │
 └──────────┬────────────────────────────────────────────┬───────────────────────────────────────────┘
            │ in-process / local channel                 │ authenticated host channel
 ┌──────────▼─────────── HOST (this machine) ──┐   ┌─────▼──────── HOST (team server, cloud VM) ───────┐
 │  model pool (resident models, leases)       │   │  same shape                                       │
 │  host scheduler · health watcher            │   │                                                   │
 │  ┌──── FACTORY A ────┐ ┌──── FACTORY B ────┐ │   │  ┌──── FACTORY C ────┐                            │
 │  │ one process       │ │ one process       │ │   │  │                   │                            │
 │  │ Pi Durable store  │ │ Pi Durable store  │ │   │  └───────────────────┘                            │
 │  │ director · lane   │ │ director · lane   │ │   └───────────────────────────────────────────────────┘
 │  │ workers · record  │ │ workers · record  │ │
 │  │ workspace · wiki  │ │ workspace · wiki  │ │            TEAM SPACE — a git repository, not a server:
 │  └───────────────────┘ └───────────────────┘ │            team roadmap · claims · team knowledge ·
 └──────────────┬──────────────────────────────┘            requests · team rules · signed acts
                │ loopback                 ┆ only if policy allows
             Ollama                 private / cloud model providers
```

Four levels, each with a clear job:

| Level | What it is | What it owns |
|---|---|---|
| **Workshop** | one person's KILN — the thing they log into | people and roles, policies, the factory registry, placement, Needs you, the front door, the workshop wiki |
| **Host** | a machine that runs factories | the model pool, the host scheduler, the health watcher |
| **Factory** | one codebase, one lane, one feature at a time | its durable store, its record, its director, its workers, its workspace and its knowledge base |
| **Team space** | where several workshops coordinate | the team roadmap, claims, team knowledge, requests — never anyone's gates |

On a single laptop all four collapse into one machine and one workshop process supervising a few factory processes.
Nothing changes in the design when they spread out — the single-machine case is the degenerate case of the distributed one.

## 3. Five ideas that shape everything

### 3.1 One authority per factory: the durable store

Each factory has **one durable store** (SQLite, managed by **Pi Durable**) and **one process that owns it**. Every piece of
factory state — which gate is open, what the director decided, which step is running, which move was made — lives there,
and only there. Everything else is a view.

*Why:* two sources of truth eventually disagree. The old KILN had runtime state and a log file side by side; the new one
has one store, and the log becomes a projection that can be rebuilt from it at any time.

### 3.2 Gates are durable tasks

A gate is not a dialog box. It is a **durable task** with a small, fixed life:

```
open ──► (brief assembled) ──► waiting ──► move committed ──► settled ──► director applies the move
```

- **Opening** commits the gate document and the brief exactly as it will be shown.
- **Waiting** is a durable state. A gate with no move simply stays waiting — across restarts, disconnects, days.
- **A move** arrives from an authenticated session and is committed **together with the gate's completion, in one atomic
  commit**, with an idempotency key. The **first committed move wins**; a move against a stale state version is refused.
- **No timers** exist on gate tasks. Nothing can settle a gate by elapsed time.

*Why:* this turns *no silent approval* from a rule people must remember into a property of the data. There is no code path
from "crash", "timeout" or "no browser" to "settled" — the only path to *settled* is a committed move. *Headless* needs no
special mode: it is just *waiting*.

### 3.3 The record is written with the change, not after it

Every state change carries its **domain events** in the **same commit** (a transactional outbox). A dispatcher reads the
outbox in commit order, gives each event a gap-free global sequence number, and publishes it on an in-process backbone.

*Why:* an event can never claim something that did not happen, and nothing that happened can lack its event. Because each
factory store has one writer, there is one **total order** of events — no clocks to reconcile.

### 3.4 Deterministic orchestration, LLM content

The **director** — the code that decides what happens next — is **ordinary deterministic code**. It runs a feature's
**flow** (the gates and their moves, defined as data), creates steps one at a time, applies moves, counts fix rounds.
When it needs *content* — a roadmap proposal, a work plan, a split — it runs the **planner**, an LLM role, as a step like any
other; the draft is checked by rules and labelled as a draft before any person sees it.

*Why:* an LLM in charge of orchestration would behave differently twice in the same situation and make *why did KILN do
that?* unanswerable. Keeping judgment in roles — and decisions with people — keeps the factory predictable and explainable
from the record.

### 3.5 Seams around everything that might change

| Seam | The only module allowed to touch it |
|---|---|
| Pi Durable (tasks, conversations, store) | `durable` |
| model inference (`pi-ai`: Ollama, private, cloud) | `workers` |
| Ollama's model management (load, unload, residency) | `lane` |
| network listeners | `server`, `host` |
| Spec Kit commands and templates | `workers` (as tools of roles) |

*Why:* Pi Durable is young and will evolve; providers change; KILN's guarantees must not. Each external dependency sits
behind one module, so a change in it is a change in one place.

## 4. Following one decision through the system

The best way to see the architecture is to follow a single move — a person approving a Code review gate.

```
 browser          server            factory store (one commit)             backbone        director / lane / workers
    │  POST move     │                       │                                │                    │
    │──────────────►│  check session,       │                                │                    │
    │  (gate id,     │  state version,       │                                │                    │
    │   move, note,  │  idempotency key      │                                │                    │
    │   version)     │──────────────────────►│ kiln.move + gate completion    │                    │
    │                │                       │ + event move.committed         │                    │
    │                │                       │ ── all or nothing ──           │                    │
    │                │                       │──── outbox, in commit order ──►│ seq 48211          │
    │◄───────────────│ 202 accepted          │                                │──► state projector  │
    │◄═══════════════╪═══ live push: gate settled ════════════════════════════│──► factory-log      │
    │                │                       │                                │──► metrics, health  │
    │                │                       │  gate task wakes, settles      │                    │
    │                │                       │  row task wakes ───────────────┼───────────────────►│ next: Verification
    │                │                       │                                │                    │ verifier step queued
    │                │                       │                                │                    │ lane: lease the
    │                │                       │                                │                    │ strongest model
    │                │                       │                                │                    │ conversation runs
    │◄═══════════════╪═══ live push: step started, model, progress ══════════════════════════════════│
```

What to notice:

- **The server never decides.** It authenticates, checks the move is well-formed and current, and commits. `decided_by`
  comes from the session, never from the request body.
- **One commit does three things**: records the move, completes the gate's waiting task, and writes the event. A crash
  before it — nothing happened; after it — all of it happened.
- **The browser is never a source of truth.** It receives views and events; a reconnect resumes from its last sequence
  number. Two tabs, or a lost connection, cannot change the outcome.
- **The director reacts to committed state**, not to the request. It reads the gate's outcome and creates the next step.
- **The lane** makes sure only one generation runs in the factory, leases the right model from the host's pool, and keeps a
  judge's model resident between the work and the verdict.

## 5. Inside a factory

### 5.1 The durable task graph

```
roadmap task                      holds the Roadmap gate; admits one feature at a time
 └─ row task                      the director for one feature — its checkpoint is the director's state
     ├─ unit task → conversation  a step: triage, researcher, concept writer, designer, critic, worker, …
     ├─ gate task                 Concept gate
     ├─ unit task → conversation
     ├─ gate task                 Architecture gate
     │   …
     └─ gate task                 Merge gate
 lane task                        the factory's single lane: holder, resident model, hold flag, swaps
```

Every task **checkpoints every step**. When the process restarts, each task resumes from its last checkpoint — the
director needs no recovery code of its own. A waiting gate resumes as waiting; a half-finished step resumes or restarts by
its replay rules; nothing is approved by the restart.

### 5.2 Steps, conversations and roles

- A **unit** is one step of work, run as a **durable conversation** between a **role** and a model.
- A **role** is a file (`agents/<role>.md`): instructions, kind (work, judge, planner, keeper, researcher), its tools, its
  replay rule, its version. The **tier map** binds roles to models; **judges bind only to the strongest model**, and a
  weaker binding is refused when the configuration is checked.
- Each step gets a deterministic **request id** (feature, gate, step, attempt), so a retried request is executed once.
- **Replay discipline:** read-only tools are safe to re-run after a crash; writes and shell commands are not — the model is
  told what already happened instead of doing it twice.
- **Only the director creates conversations.** Roles have no subagent tool; the crew cannot spawn more crew.

### 5.3 The lane

One factory, one running generation. Before a step's first model request it **acquires the lane** and a **lease** on its
model from the host's model pool; it releases both when it settles. The **affinity scheduler** orders waiting work to avoid
needless model swaps — a swap happens only when a different tier is genuinely needed. On the **judged gates** (Architecture, Code
review, Verification) the lease is **held**, so the judge's model stays resident through the verdict and any automatic fix
rounds.

### 5.4 The workspace and Spec Kit

The factory works in its repository — by default a **separate git worktree**, so the engineer's own checkout is untouched.
Feature artifacts follow **GitHub Spec Kit**: the constitution in `.specify/memory/constitution.md`, one directory per
feature in `specs/NNN-name/` (spec, plan, tasks, and KILN's concept, design and judges' reports), and the `speckit.*`
commands run by KILN's roles as Pi sessions. Spec-driven artifacts are versioned with the code; the factory store keeps the
record, not copies of them. Beside the constitution sit the **experience charter** and the **design system** (`.specify/memory/`), the yardsticks of the interface gates.

## 6. The record and its views

```
 factory store ── outbox ──► dispatcher (seq) ──► backbone ─┬─► state projector ─────► read models ──► front door
                                                            ├─► factory-log projector ─► factory-log.jsonl (validated)
                                                            ├─► metrics · insights
                                                            ├─► health watcher
                                                            ├─► knowledge log (wiki log.md)
                                                            ├─► notifier
                                                            └─► OTLP exporter (opt-in, loopback only)
```

- **The envelope** is the same for every event: id, sequence, type and schema version, time, subject, **actor**,
  **correlation** (which feature run), **causation** (which event caused this one), trace context, privacy level, and a
  payload that **never contains prompts, answers or code** — content lives in documents, referenced by id.
- **Projections are rebuildable.** Any view can be dropped and rebuilt from the stream; the factory-log projection must be
  **byte-identical** on rebuild, which is how the record proves itself.
- **Three kinds of signal are kept apart:** domain events (the record, permanent), telemetry (traces and metrics, kept for
  a while), and logs (debugging). Only domain events are evidence.
- **Consumers never slow the factory.** Each has its own cursor; a slow view catches up on its own.
- From `causation`, any event can be walked back to the person's move or the director's rule that started the chain — the
  basis of *ask the director* answers, the feature record and audits.

## 7. Models and where they run

- **Locality is a property of a model**: `local` (on the host, via Ollama), `private` (a team server), `remote` (a cloud
  provider). All are reached through `pi-ai`.
- **A factory's profile** (`local-only` by default, `hybrid`, `cloud`) and its **egress policy** decide which roles may use
  which localities and what content may leave. Every outbound request is checked before it is sent and recorded after.
- **The model pool** on each host decides what is resident within a memory budget, shares one loaded copy between factories
  through leases, and can **pin the strongest judge** for the session. KILN — not Ollama's idle timer — is the authority
  over residency.
- **Fallback is policy, never reflex:** a work role may fall back if policy says so; a judge never falls back silently — an
  unavailable judge becomes a question for a person.

## 8. Knowledge

Each factory has a **knowledge base** following Karpathy's LLM-Wiki pattern — **raw sources** (immutable), **pages** written
by a keeper role and edited by Curators, and a **schema** (`AGENTS.md`). Every wiki is a **git repository of plain markdown
and a valid Obsidian vault**, readable in Zed or any editor.

- **Ingest, query and lint are steps** on the lane, recorded like any other work; `log.md` is a projection of wiki events.
- **Implementation knowledge** is written as features pass gates: feature stories, overviews, explainers, how-tos, each
  **cited at a commit**, flagged as **drifted** when the code moves on.
- For existing codebases, a **full scan** writes the backbone of the knowledge base: inventory, structure, history, tests,
  module pages and open questions.
- Briefs cite knowledge as **context, never authority**, showing whether a page is stale or contradicted.

A **workshop wiki** holds knowledge that spans factories (models, machines, learnings) and is included read-only in every
factory vault; a **team** tier lives in the team space.

## 9. The workshop, hosts and the team space

- **Process model.** On each host, one supervisor and **one process per factory**. A crash or runaway tool in one factory
  cannot take down another; the supervisor restarts it and it resumes from its own store.
- **Hosts** join a workshop with an Operator's approval and a revocable identity, and talk over an authenticated channel.
  **Placement** — which host a factory runs on — is decided by a person at the Roadmap gate. A factory can **move** between
  hosts with a handover (quiesce, transfer store, workspace and wiki, resume). Hosts can **sleep** when every factory waits at
  a gate; a decision made meanwhile **applies on wake**, exactly once.
- **Network failure** never decides anything: a host works on to its next gate and waits; nothing is settled while it is
  unreachable.
- **The team space is a git repository**, not a service. Workshops pull it, verify **signed** acts, turn them into events in
  their own records, and publish their own progress at the level the team chose. The team roadmap changes by **quorum**;
  **claims** on paths make overlap visible early; reviews between teammates are requests, and **each person still decides
  their own gates**. Merging uses the code host's own queue and required reviews.

## 10. The front door and its security

- **A local web app** served by the workshop's server, **bound to loopback**, protected by a **per-launch secret**, with
  Host and Origin checks. There is no KILN account and no KILN backend.
- **Read models and live push.** The browser gets views built from the record and a stream of events; it reconnects from
  its last sequence number and never polls.
- **Intake for moves and commands.** Moves go to gate tasks; commands (start, pause after step, arm delegation, move a
  factory) go to the director — each recorded, idempotent, and never able to settle a gate.
- **Every surface is a view of the same data**: the CLI (`kiln init`, `kiln doctor`, `kiln health`, `kiln check`, …) reads
  and writes the same files and stores as the browser.

## 11. Configuration as code

A workshop's configuration is a folder of plain files — `kiln.config/`: hosts, providers, the model catalog, role
instructions, the tier map, gate definitions and flows, policies, health thresholds and per-factory settings. The front
door edits the same files.

- **`kiln check config`** validates a change before it applies — all or nothing, never vacuous.
- A change applies **from the next step**, never in the middle of one, and is recorded with who, before and after.
- Layers make settings **stricter, never looser**: team floor → workshop → factory.
- **Some rules cannot be configured away:** judges on the strongest model, no silent approval, egress by policy only.
- **No secrets in files** — files name a secret; the OS or host secret store holds it.

## 12. Health

A **health watcher** on every host observes the machinery — stuck steps, slow model loads, lagging views, hosts offline,
knowledge conformance, configuration drift — and raises **signals** with evidence and what a person could do. It **never
acts**. A separate class of **broken-guarantee** signals (a gate settled without a move, a judge off the strongest model, a
disallowed destination reached, a projection that does not rebuild identically) is always critical and kept in the record;
the director's own fail-closed checks stop the affected factory, attributed separately. When the watcher cannot see, Health
says *unknown*, never *healthy*.

## 13. The codebase

```
kiln/
  packages/
    contracts/   gate rail and flows as data, move kinds, event catalog and schemas, roles and tiers   (pure, no I/O)
    record/      envelope, outbox, backbone, projections, factory-log, validators
    durable/     THE Pi Durable seam: task types, gate contract, commands, resume
    lane/        lane task, affinity scheduler, model pool, residency (Ollama)
    workers/     conversations, role instructions, tool sets, replay policy, providers, egress checks
    director/    roadmap and row tasks, planning, fix rounds, digests
    knowledge/   wikis: ingest, query, lint, vault contract, implementation knowledge, scans
    workshop/    registry, people and roles, policies, placement, Needs you
    host/        host runtime, host channel, moves, sleep
    team/        team space: subscribe and publish, signatures, claims, requests, team rules
    bench/       notebook, research steps, spikes
    explore/     explore spaces: maps, ask and trace, as-is specifications, tours, readiness
    editor/      Zed: links and tasks, MCP server, ACP agent, language server
    server/      HTTP, session security, read models, push, intake
    web/         the front door (prebuilt)
    cli/         kiln init · doctor · health · serve · host · check · agents try · replay
  agents/        role instructions
  checks/        readiness probes and network checks
  fixtures/      committed event streams and replays
  legacy/        the first program's code, frozen until each part is ported or retired
```

**Dependency direction** — inner layers never import outer ones:

```
contracts ◄── record ◄── durable ◄── lane, workers ◄── director ◄── workshop, host ◄── server ◄── web, cli
                                                                    team (beside workshop)
```

`contracts` is pure: the rules KILN holds — the standard flow, the move kinds, the strongest-judge policy, the event
schemas — with no I/O, so they can be tested exhaustively and reused everywhere. Much of it is ported from the first
program's code, which already expresses these rules (PRD §10).

## 14. Where each guarantee is enforced

| Guarantee | Enforced by | Not by |
|---|---|---|
| No gate settles without a person's move (or recorded delegation) | the gate task's state machine; atomic move + completion; no timers | the UI hiding buttons |
| First move wins; no double decisions | idempotency keys and memo on the gate instance | client-side locking |
| A restart approves nothing | durable `waiting` state; resume from checkpoints | recovery code |
| Judges on the strongest model | tier policy in `contracts`, checked by `kiln check config`; re-checked at bind time | role authors remembering |
| One generation per factory | the lane task | convention |
| Every change is explainable | outbox events in the same commit, with actor and causation | log statements |
| The log cannot drift | factory-log is a projection, rebuilt byte-identically | careful writing |
| Nothing leaves unseen | egress checks before every request in `workers`; per-host network allowlists; refused requests recorded | trusting providers |
| Configuration cannot weaken the rules | non-configurable checks; layers only stricter | documentation |
| Health never acts | the watcher only emits signals; actions are commands or director rules | discipline |

## 15. Questions newcomers usually ask

**Why not let an LLM orchestrate?** Because the same situation must lead to the same next step, cheaply and explainably.
LLMs draft; deterministic code orchestrates; people decide.

**Why one process and one store per factory?** Isolation and a single writer: one factory's failure cannot hurt another,
and each record has one total order.

**Why is the log a projection?** So there is only one truth. The log is still produced, validated and byte-identical on
rebuild — it is just no longer something that could disagree with the store.

**Why a git repository for the team space, not a server?** No one has to run or trust a central service; every act is
signed and versioned; a team can work offline and reconcile. The team space coordinates — it never holds anyone's gates.

**Why Pi Durable?** It gives exactly the primitives KILN's promises need — durable tasks with checkpoints, waiting, durable
conversations, exactly-once requests — so KILN builds its guarantees on top instead of reinventing a workflow engine.

**What happens if Pi Durable changes?** Only `durable` imports it. The gate contract — *the move and the gate's completion
are one atomic commit, keyed exactly once, first move wins* — stays the same whatever primitive implements it.

## 16. Read next

- [The vision](../../concepts/vision.md) — why KILN exists
- [KILN at a glance](../../concepts/infographic/kiln-at-a-glance.png) — the whole concept on one page
- [The web front door](../../concepts/web-front-door.md) — the full design, §4–§12
- [KILN on Pi Durable](../../concepts/pi-durable.md) — why the substrate is the key enabler
- [The record](../../concepts/the-record.md) — events, envelope, projections in depth
- [The flow](../../concepts/the-flow.md) — the twelve gates, gate by gate
- [The PRD](../../prd/kiln-prd.md) — requirements, architecture, codebase layout, milestones
