# What we are building: `kiln-v1`

> **Type:** explainer — for understanding, not a specification. **Audience:** software engineers who will build,
> review or plan KILN and want a clear, high-level picture of exactly what `kiln-v1` delivers, what it leaves out, and
> how it gets built. **Status:** describes the `kiln-v1` scope of the [PRD](../../prd/kiln-prd.md) (final, 2026-10-21)
> and the [roadmap proposal](../../../specs/ROADMAP.md). The roadmap is **pending the Roadmap gate**: until a person
> admits it, the order and cut of rows may still change. Where this explainer and the PRD or roadmap differ, they govern.
>
> Companions: [architecture explainer](./kiln-architecture.md) · [the constitution, explained](./kiln-constitution.md) ·
> [the flow](../../concepts/the-flow.md) · [decisions, settled and open](../../concepts/open-decisions.md)

## Contents

1. [`kiln-v1` in one paragraph](#1-kiln-v1-in-one-paragraph)
2. [Who it is for](#2-who-it-is-for)
3. [What ships](#3-what-ships)
4. [A feature's life in `kiln-v1`](#4-a-features-life-in-kiln-v1)
5. [What we are building, technically](#5-what-we-are-building-technically)
6. [What is not in `kiln-v1`](#6-what-is-not-in-kiln-v1)
7. [How it gets built: 23 rows](#7-how-it-gets-built-23-rows)
8. [What we reuse from today's code](#8-what-we-reuse-from-todays-code)
9. [The quality bar](#9-the-quality-bar)
10. [When `kiln-v1` is done](#10-when-kiln-v1-is-done)
11. [Risks and how the plan handles them](#11-risks-and-how-the-plan-handles-them)
12. [Questions engineers usually ask](#12-questions-engineers-usually-ask)

---

## 1. `kiln-v1` in one paragraph

`kiln-v1` is a **local software factory with a web front door**. An engineer points it at a repository — new or
existing — and it builds features one at a time: agents research, design, write and verify the work, **independent
judges** on the strongest local model check it, and **the engineer decides at every one of ten gates** in a browser or
from the command line. Everything runs on the engineer's own machine on local models through Ollama, survives crashes and
reboots without losing or approving anything, and is recorded as an ordered stream of events that explains every
decision afterwards. Each factory keeps a knowledge base of how its code was built, readable in Obsidian. One machine can
run several factories, and a **small team** of engineers — each with their own workshop — can work on one codebase
together through a shared **team space** in git.

What `kiln-v1` deliberately is **not**: a hosted service, an autopilot, a cloud agent, or a swarm. Those boundaries are in
§6.

---

## 2. Who it is for

**The primary user is an engineer in a small team.** Each engineer runs their own **workshop** on their own machine — their
factories, their gates, their models. The team meets in a **team space**: a git repository holding the team roadmap,
claims on code, team knowledge and requests between teammates. A solo engineer is simply a team of one; nothing in
`kiln-v1` requires a team.

**Hardware.** `kiln-v1` runs local models only, so memory decides what is comfortable:

| Machine | What it supports |
|---|---|
| **below 32 GB** | setup says plainly that local-only will be slow or limited and suggests a smaller judge |
| **32 GB** | one factory, with a judge around 12B parameters |
| **64 GB and up** (recommended) | a stronger judge, room for work models alongside it |
| **128 GB** | several factories on one machine, sharing a model pool |

**Platform.** macOS first, Linux next. Node `^22.18.0 || >=23.6.0`, Git, Ollama. No KILN account, no KILN backend.

---

## 3. What ships

### 3.1 What an engineer can do with `kiln-v1`

- **Install and set up in under an hour.** `kiln init` (in the browser or the terminal) and `kiln doctor` check the
  machine, recommend and verify models, create the workshop, and bring in a first repository — adopting or adding
  GitHub Spec Kit and confirming its constitution — up to a first Roadmap gate. Nothing leaves the machine.
- **Shape a roadmap with a planner.** Write goals and constraints, talk them through with the planner, edit and pin rows;
  every draft is checked deterministically; the Roadmap gate admits exactly the version the engineer read.
- **Walk features through ten gates.** Concept, Design, Specification, Work plan, Implementation, Code review,
  Verification, Documentation and Merge — each with a complete **gate brief**, decided in the browser or with
  `kiln gate`.
- **Step in or step back.** Watch work live, steer a worker, approve or refuse a risky tool call, or arm **delegation**
  at the Specification gate so clean gates pass without interruption — stopping at the first objection.
- **Run several factories** on one machine, with one **Needs you** inbox across them.
- **Start a new codebase** from a product brief to a merged, verified walking skeleton.
- **Bring KILN into an existing codebase**: a full scan into the knowledge base, a baseline of what is already broken, a
  territory KILN may change, and the team's own conventions, CI and pull requests.
- **Read how the code was built.** Every merged feature leaves a feature story and implementation pages in the factory's
  knowledge base, grounded in code at a commit and flagged when the code drifts.
- **Work as a team.** Share a team roadmap decided by quorum, see who is building what through claims and overlap
  detection, ask teammates for required reviews, and merge through the code host's queue.
- **Customise the process.** Define roles as files, add gates of your own (a threat model, a security review), try
  either on a past feature before using it.
- **Trust the machinery.** A health watcher says plainly when something looks wrong and treats any broken guarantee as
  critical — and never acts on its own.

### 3.2 Capability map

| Area | In `kiln-v1` | Rows |
|---|---|---|
| **Durable core** | Pi Durable behind one seam; roadmap, row, unit, gate and lane tasks; the gate contract (atomic move + completion, first move wins, no clock settles a gate); one store per factory | r42, r13 |
| **The flow** | the default flow of ten gates as data; the closed set of move kinds; `kiln check flow`; triage skip; capped automatic fix rounds | r14, r18 |
| **The record** | transactional outbox; versioned event catalog; consumer cursors; factory-log as a byte-identical projection; upcasting on read; closed features archived | r15 |
| **Workers and judges** | fresh conversations per step on local models through `pi-ai`; tool sets and replay discipline; every model request through the lane; judges on the strongest model | r16 |
| **Configuration** | `kiln.config/` — role files, tier map, local model catalog; `kiln check config` and `kiln check model`; changes recorded | r17 |
| **The director** | deterministic orchestration; affinity ordering; the planner role whose drafts are checked before display | r18 |
| **Front door** | loopback server with a per-launch secret; live push; workshop overview, factory live view, record explorer | r19 |
| **Gates** | the ten-part gate brief, recorded as seen; moves bound to the state version; Needs you; the same gates from the CLI | r20 |
| **Stepping in** | delegation, steering, risky-action approvals, information-only notifications | r21 |
| **Roadmap shaping** | the roadmap brief, the shaping conversation, pins, versioned and checked drafts | r22 |
| **Knowledge** | a wiki per factory (ingest, query, lint) as an Obsidian vault; implementation knowledge; the workshop wiki | r23, r24 |
| **Workshop** | several factories, a shared model pool and host scheduler, one Needs you | r25 |
| **Agents and flows** | the Agents screen, role versions and try-runs; added gates and flows from files | r26 |
| **Health** | observe-never-act watcher, broken-guarantee signals, core metrics, `kiln health` | r27 |
| **Getting started** | `kiln init`, `kiln doctor`, first factory, Spec Kit, constitution, first roadmap | r28 |
| **New codebases** | product brief, constitution from it, technology decisions, walking skeleton | r29 |
| **Existing codebases** | profile, full scan into knowledge, baseline, territory, fitting the team's process, base drift | r30, r31 |
| **Team space** | signed team roadmap by quorum, claims and overlap, requests and mirrored reviews, team-aware Merge gate, team knowledge | r38, r39 |
| **Release** | installer, newcomer docs, a demo factory, release manifest and tag | r32 |

### 3.3 The command line

The CLI is a full surface, not an afterthought. It reads the same projections as the browser and makes moves through the
same intake, under the same rules.

| Command | What it does |
|---|---|
| `kiln init` · `kiln doctor` | first-time setup; machine, models and network checks |
| `kiln serve` | start the workshop and its loopback front door |
| `kiln status` · `kiln needs` | where every factory stands; everything waiting on you |
| `kiln gate` | show a gate's full brief as text, and make a move |
| `kiln check config` · `kiln check model` · `kiln check flow` | validate configuration, a model binding, a flow |
| `kiln agents try` | try a role change on a past feature |
| `kiln health` | the health watcher's view |
| `kiln replay` | replay a committed event stream through the projections |

---

## 4. A feature's life in `kiln-v1`

A short walk through what actually happens, end to end, for one feature in an existing repository.

1. **Admission.** The planner drafts the next feature from the engineer's roadmap brief, the knowledge base and the
   team roadmap. The engineer opens the **Roadmap gate**, reads the brief — the feature, why now, its flow, the policy —
   and approves. That admits **one** feature. If it is a team feature, a **claim** is published to the team space.
2. **Contract.** A researcher and concept writer produce the **Concept**; a designer produces the **Design**, which the
   **architecture critic** judges on the strongest model; a spec writer produces the **Specification** with Spec Kit; the
   planner produces the **Work plan**, which refines the claim with the files it will touch — and surfaces overlap with a
   teammate's claim if there is one. The engineer decides each gate. At Specification they may **arm delegation**.
3. **Build and prove.** The **Implementation** gate confirms a restorable starting point and that this is still one
   feature. Workers implement the plan in a KILN-managed worktree, on the feature's own branch, inside the factory's
   territory. The **code reviewer** judges the diff against the specification; the engineer approves, sends findings back
   to the workers (`revise`), or rebuilds (`restart`). The **verifier** proves the feature works, with up to two automatic
   fix rounds before a person sees a failure.
4. **Release.** The **Documentation** gate checks the docs and the feature story against what was built. The **Merge**
   gate shows the whole journey — every decision and by whom, the judges, what the feature added to the knowledge base,
   required teammate reviews, base drift — and opens or merges the pull request through the team's own process.
5. **Afterwards.** The claim is released, provenance is published, the feature's transcripts are archived beside the
   store, and the Roadmap gate opens again.

Throughout, the factory can crash, the laptop can close, the browser can be gone for a week: every waiting gate stays
waiting, and nothing is approved by anything but a person's move or a delegation the person armed.

---

## 5. What we are building, technically

### 5.1 The shape

```
 Browser / CLI ──► server: front door, session security, read models, live push, move & command intake
                     │
 workshop ──────── people & roles · policies · factory registry · Needs you · workshop wiki · workshop record
                     │  (in-process on one machine in kiln-v1)
 host ──────────── model pool (Ollama, resident models, leases) · host scheduler · health watcher
                     │
 factory (one process each) ── durable store (Pi Durable, SQLite): roadmap · row · unit · gate · lane tasks
                     ├── event outbox ──► backbone ──► projections (state, factory-log, metrics, health, knowledge log)
                     ├── workers: fresh conversations per step · roles · tools · pi-ai → Ollama
                     ├── workspace: a KILN-managed git worktree, a branch per feature
                     └── factory wiki: git + Obsidian vault

 team space ────── a git repository: team roadmap · claims · team knowledge · requests · rules · signed acts
```

Five ideas carry the design (the [architecture explainer](./kiln-architecture.md) covers them in depth):

1. **Gates are durable tasks.** A waiting gate is a task in a waiting state; a move and the gate's completion are one
   atomic commit.
2. **The record is an event stream.** Every state change commits its event in the same transaction; every view is a
   rebuildable projection.
3. **One lane per factory.** One running step at a time; parallelism comes from several factories.
4. **The front door decides nothing.** It renders projections and carries moves in.
5. **Everything has one seam.** Pi Durable, `pi-ai` and Ollama are each reached through exactly one module.

### 5.2 The codebase

`kiln-v1` reorganises the repository into packages with a strict dependency direction:

```
contracts ← record ← durable ← lane, workers ← director ← workshop ← server ← web, cli
                                                  team (beside workshop) · knowledge
```

| Package | Responsibility in `kiln-v1` |
|---|---|
| `contracts` | the flow as data, move kinds, event catalog and schemas, roles and tiers — pure, no I/O |
| `record` | event envelope, outbox, backbone, projections, factory-log, validators, upcasters |
| `durable` | **the only importer of Pi Durable**: task types, the gate contract, commands, resume |
| `lane` | lane task, affinity scheduler, model pool, residency — **the only module that talks to Ollama's management API** |
| `workers` | conversations, role instructions, tool sets, replay policy — **the only importer of `pi-ai`** |
| `director` | roadmap and row tasks, planning, fix rounds, digests |
| `knowledge` | wikis: ingest, query, lint, vault contract, implementation knowledge |
| `workshop` | registry, people and roles, policies, Needs you |
| `team` | the team-space repository: subscribe and publish, signatures, claims, requests, team rules |
| `server` · `web` · `cli` | HTTP, auth, read models, push, intake; the prebuilt front door; the command line |
| `checks/` · `fixtures/` · `agents/` | readiness probes and the network check; committed replays; role instructions |
| `legacy/` | the first program's code, frozen until each part is ported or retired |

`host/` (a separately running host runtime) and `bench/` exist in the layout but are `kiln-v1.x` work; in `kiln-v1` the
host runs in-process with the workshop.

### 5.3 Where data lives

| Data | Where | Notes |
|---|---|---|
| Tasks, conversations, outbox | the factory's SQLite store (Pi Durable) | one store per factory |
| Domain events | in the factory store | permanent; never archived or aged out |
| Closed features' transcripts | a checksummed archive beside the store | never in git; kept unless an Operator ages them out |
| Factory-log | JSONL projection | rebuildable, byte-identical |
| Code | a KILN-managed worktree | a branch per feature; never your own clone |
| Specs, plans, constitution, roadmap | in the repository (Spec Kit) | versioned with the code |
| Knowledge | git + Obsidian vaults | factory wiki, workshop wiki, team knowledge |
| Team space | a shared git repository | every write a signed commit |
| Secrets | the OS secret store | never in the record, store, browser or logs |

---

## 6. What is not in `kiln-v1`

Being precise about the boundary is as important as the scope. These are **designed** — the concept docs describe them —
but they are **not** built in `kiln-v1`. Each `kiln-v1.x` row depends only on the release, so none of them forces a
change to what `kiln-v1` builds: a local, single-host workshop is their degenerate case.

| Not in `kiln-v1` | What that means in practice | Planned |
|---|---|---|
| **Private and cloud models** | `kiln-v1` runs **local models only** (`local-only` profile). No per-role routing to remote models, no egress policies, no budgets for remote spend. | r33 |
| **The bench** | no private notebook, no research steps on spare capacity, no spikes or candidate list | r34, r35 |
| **Full observability** | no per-feature traces, no insights screens, no time travel, no OpenTelemetry export (core metrics and health *are* in `kiln-v1`) | r36 |
| **Factories anywhere** | factories run on the workshop's own machine; no team servers or cloud hosts, no moving factories, no sleeping hosts, no shared hosts | r37 |
| **Brownfield adoption stages** | no Observe → Rehearse → Contribute → Own stages, no rehearsal on past changes, no characterization tasks, no incremental re-scans | r40 |
| **Greenfield beyond the skeleton** | no automatic conventions enforcement, no vertical-slice planning, no team start of a new product | r41 |
| **A shared, multi-user workshop** | a team in `kiln-v1` is personal workshops plus a team space; several people logging into one workshop over the network is not built | with factories anywhere |
| **Gates after Merge** | no deployment or release-approval gates | out of scope |
| **An audit export** | no CloudEvents export of the record | not yet placed |
| **Hosted anything** | no KILN account, service or backend — ever | non-goal |

The terminal UI inside Pi from the first program is **retired**; the `kiln` CLI is the terminal surface.

---

## 7. How it gets built: 23 rows

KILN is built the way it will build software: a roadmap of feature-sized **rows**, each walked through the gates, with a
person admitting the program and re-admitting it between rows. `kiln-v1` is **23 rows** — r12 to r32, the spike r42,
and the team rows r38 and r39. Row ids are never reused, so they are not in numeric order.

### 7.1 The rows, in order

| # | Row | What it delivers | Proven when |
|---|---|---|---|
| 1 | **r12** Foundations reset | the package layout; legacy frozen; the keep-list ported with tests green | every ported test passes; `kiln check` runs the network check |
| 2 | **r42** Spike: external completion | a go/no-go on completing a waiting Pi Durable task atomically from outside | a spike report decides go, go-with-fallback or no-go |
| 3 | **r13** Durable core | the Pi Durable seam, task types, the gate contract, one store per factory | killed at every step of a gate, it resumes waiting and settles only on a committed move |
| 4 | **r14** Gates as data | the default flow and move kinds as data; `kiln check flow` | a scripted feature walks ten gates from the CLI and survives kill-and-resume at each |
| 5 | **r15** The record | outbox, catalog, backbone, factory-log projection, upcasting, feature archives | the factory-log rebuilds byte-identically; the first program's walks replay |
| 6 | **r16** Real local workers | `pi-ai` conversations on Ollama, tools, replay discipline, residency, model pool | a feature walks with real workers and judges; a crash mid-generation never double-runs a write |
| 7 | **r17** Configuration as files | `kiln.config/`, tier map, local model catalog, config and model checks | a weaker judge binding is refused; changes apply from the next step, recorded |
| 8 | **r18** The director | deterministic orchestration, affinity ordering, fix rounds, the planner | the same situation yields the same next step; failing drafts never reach a person |
| 9 | **r19** Front door, read-only | loopback server, session security, live push, first screens | a tab without the secret sees nothing; reconnects resume without polling |
| 10 | **r20** Gates on the web | the gate brief, moves, Needs you, the CLI gate commands | a person decides every gate of a real feature in the browser and the CLI; stale moves are refused |
| 11 | **r21** Stepping in | delegation, steering, risky-action approvals, notifications | an armed tail stops at the first objection; a judge cannot be steered |
| 12 | **r22** Shaping the roadmap | roadmap brief, shaping conversation, pins, versioned drafts | approve admits exactly the version read |
| 13 | **r23** Factory knowledge | the factory wiki, ingest/query/lint, the vault contract, knowledge in briefs | the wiki opens cleanly in Obsidian and Zed; briefs cite and flag stale pages |
| 14 | **r24** Implementation knowledge | feature stories and implementation pages, drift, the workshop wiki | a merged feature has a story at a commit; code changes flag drifted pages |
| 15 | **r25** Several factories | registry, shared model pool, host scheduler, one Needs you | three factories share one pool and one inbox |
| 16 | **r26** Agents and flows | Agents screen, try-runs, added gates and flows | an added gate is defined, checked, tried and chosen for a feature |
| 17 | **r27** Health | the watcher, broken-guarantee signals, core metrics | an injected broken guarantee is critical; a silent watcher shows *unknown* |
| 18 | **r28** First run | `kiln init`, `kiln doctor`, first factory, Spec Kit, first roadmap | install to a first Roadmap gate in under an hour, nothing leaving the machine |
| 19 | **r29** New codebases | product brief, constitution, decisions, walking skeleton | an empty repository reaches a merged skeleton that passes from a clean clone |
| 20 | **r30** Existing codebases 1 | profile and full scan into the knowledge base | a full scan writes module pages and a coverage report; resumes after a crash |
| 21 | **r31** Existing codebases 2 | baseline, territory, the team's process, base drift | out-of-territory writes are refused; pre-existing failures never block on their own |
| 22 | **r38** Team space 1 | team-space repository, keys and signed acts, team roadmap by quorum | a team roadmap change takes effect only when the quorum has signed |
| 23 | **r39** Team space 2 | claims and overlap, requests and mirrored reviews, team-aware Merge gate | overlap surfaces at Work plan; a required review conditions *approve*; Merge uses the code host's queue |
| — | **r32** Release | installer, newcomer docs, demo factory, manifest and tag | a newcomer installs KILN and decides a first Roadmap gate on a real repository in under an hour |

### 7.2 Dependencies and the critical path

Each step below can start once every row it names is done; rows on the same step are independent of each other.

```
step  row(s) — (depends on)
  0   r12 Foundations reset
  1   r42 Spike ............................... (r12)
  2   r13 Durable core ........................ (r12, r42)
  3   r14 Gates as data ....................... (r13)
  4   r15 The record .......................... (r14)
  5   r16 Real local workers .................. (r13, r15)      r19 Front door, read-only ... (r15)
  6   r17 Configuration as files .............. (r16)           r27 Health .................. (r15, r19)
  7   r18 The director ........................ (r14, r17)
  8   r20 Gates on the web .................... (r18, r19)
  9   r21 Stepping in · r22 Shaping the roadmap · r23 Factory knowledge · r25 Several factories ... (r20)
 10   r24 Implementation knowledge (r23) · r26 Agents and flows (r18, r25) · r28 First run (r17, r22, r23)
 11   r29 New codebases (r26, r28) · r30 Existing codebases 1 (r24, r28) · r38 Team space 1 (r24, r25)
 12   r31 Existing codebases 2 ................ (r21, r30)
 13   r39 Team space 2 ........................ (r31, r38)
 14   r32 Release ............................. (r21, r24, r26, r27, r29, r31, r39)
```

The **critical path** is fifteen steps long: r12 → r42 → r13 → r14 → r15 → r16 → r17 → r18 → r20 → r23 → r28 → r30 → r31 →
r39 → r32. Its first half is the durable core. Everything
user-facing waits for gates that genuinely wait and a record that genuinely explains — by design, the riskiest
foundations come first.

### 7.3 The one go/no-go

Everything rests on one primitive that Pi Durable does not yet publish: **completing a waiting task from outside**, so a
person's move and the gate's completion commit together. Row **r42** is a time-boxed spike that settles it before
anything is built on top: natively if Pi Durable allows it; otherwise through an upstream proposal and, until it lands, a
KILN decision table committed in the same SQLite transaction, behind the seam. A **no-go** re-opens the Roadmap gate
before r13 — the program is re-planned rather than built on sand.

---

## 8. What we reuse from today's code

The first program (rows r1–r8, KILN as a Pi extension) proved the core rules in about 5,900 lines of TypeScript and a
large test suite. `kiln-v1` does not throw that away. The rule: **keep code that expresses a rule we still hold; adapt code
whose rule holds but whose mechanism changes; retire code tied to the Pi extension or the terminal UI.**

| | Examples | Becomes |
|---|---|---|
| **Keep** | move vocabulary and gate rail, strongest-judge tier policy, affinity scheduler, deterministic clock, schemas, the log and roadmap validators, the hardened network scan, committed real walks, contract and negative tests | `contracts`, `record`, `lane`, `checks`, `fixtures` — ported with their tests |
| **Adapt** | the gate primitive, the single lane, the log writer, the Ollama residency code, the state reducer, the `*-ready` probes, the Pi RPC driver, the scripted walks | gate tasks, the lane task, the outbox validator, the residency manager, projections, readiness probes, a fallback worker driver, test scenarios and the demo |
| **Retire** | the Pi extension (`pi/`), the terminal UI layers, their tests | frozen in `legacy/`; the text renderers may live on in the CLI |

---

## 9. The quality bar

`kiln-v1` is held to the [constitution](../../../.specify/memory/constitution.md) (v2.0.1) — every rule enforced by
construction and proven by a check that fails by name. In engineering terms:

| Requirement | What it means for `kiln-v1` |
|---|---|
| **No silent approval** | kill-and-resume tests at every step of every gate; no timer, default or error path can settle a gate |
| **Durability** | a crash at any point loses no decision, double-applies no move, half-commits no step |
| **Determinism and replay** | committed event streams replay through every projection to the same result; replays are regression fixtures |
| **Local-first** | a `local-only` factory makes no outbound connection, proven by a network check that cannot pass vacuously |
| **Security** | loopback by default; a per-launch secret; Host/Origin and CSRF checks; `decided_by` from the session; secrets only in the OS store |
| **Privacy** | no prompt or answer content in events, metrics or logs |
| **Testability** | every principle has a named, falsifiable check (the `*-ready` pattern); a run that executes zero tests fails |
| **Performance** | targets set by measurement — swap cost, tokens per second, time to brief — recorded per model and host |
| **Accessibility** | readable without colour, full keyboard operation, WCAG 2.2 AA for the front door, a screen-reader-friendly CLI, localisable text |
| **Dependencies** | pinned, recorded, each behind one seam |

---

## 10. When `kiln-v1` is done

`kiln-v1` is done when the release row **r32** passes its acceptance, on top of every row before it:

> **A newcomer installs KILN, runs first setup on a real repository, and decides its first Roadmap gate in under an hour.**

And when the PRD's goals hold:

1. **A runnable factory** — a person walks a feature through all ten gates, in a browser, on local models.
2. **Rules enforced by construction** — no silent approval, author/judge separation, one step at a time per factory,
   judges on the strongest model, everything recorded — each with a check that fails by name.
3. **Durable by default** — no crash or restart loses work or settles a gate.
4. **Explainable** — the record rebuilds any view; the knowledge base explains how the code was built.
5. **Local by default** — a `local-only` factory provably makes no outbound call.
6. **Grows without redesign** — one factory, several factories, a team of workshops — with the same concepts, ready for
   `kiln-v1.x`.

After release, these are the measures that tell us it works: the share of human time spent at gates rather than
monitoring; problems caught by judges versus found after merge; zero lost decisions; any merged feature reconstructable
from the record alone; and the share of merged features with a complete feature story.

---

## 11. Risks and how the plan handles them

| Risk | How the plan handles it |
|---|---|
| **Pi Durable is experimental and moves** | one seam, pinned versions, a gate contract that outlives the API, and the first program's Pi RPC driver as a fallback worker path |
| **External completion of a waiting task is not a published primitive** | the r42 go/no-go spike, before anything depends on it; upstream first, a named local fallback |
| **Local models vary in tool calling and streaming** | per-model readiness probes in r16; results measured and recorded |
| **The concepts describe a lot** | strict Must/Should; everything not needed for a small team on one machine is `kiln-v1.x` |
| **Two products during the transition** | `legacy/` frozen; no feature work there |
| **Security surface of a server** | loopback only in `kiln-v1`; network modes arrive later, behind factories anywhere |
| **Teams collide on shared code** | claims and overlap from the Work plan gate, protected paths, base drift at Merge |

---

## 12. Questions engineers usually ask

**Is `kiln-v1` usable without a team?**
Yes. A solo engineer has a workshop and no team space; every team feature is additive.

**Can I use Claude, GPT or another cloud model in `kiln-v1`?**
No — `kiln-v1` is local-only. Private and cloud models, with per-role routing and egress policies, are row r33 in
`kiln-v1.x`. The design already accounts for them, so nothing built in `kiln-v1` has to change when they arrive.

**Does KILN touch my working copy?**
No. Each factory works in its own KILN-managed git worktree, one branch per feature, and never checks out branches or
writes files in a clone you use.

**Why is the order so foundation-heavy? Users see nothing until r19.**
Because every user-facing promise — a gate that waits, a record that explains, a judge that is independent — rests on
the durable core and the record. Building screens first would mean rebuilding them on a different truth. r14 already
walks a whole feature from the CLI, so the system is demonstrable early.

**What happens if the r42 spike says no?**
The Roadmap gate re-opens before r13 and the program is re-planned. That is the point of a go/no-go: find out before
building on it.

**Can the order change?**
Yes, until and at the Roadmap gate. The roadmap itself suggests two reshapings worth considering — moving Health
earlier so it watches the durable core from the start, or moving existing codebases ahead of new ones if the first users
bring existing repositories.

**Where do I find the detail?**
The [PRD](../../prd/kiln-prd.md) for requirements, the [roadmap](../../../specs/ROADMAP.md) for rows and acceptance,
[the flow](../../concepts/the-flow.md) for the gates, the [architecture explainer](./kiln-architecture.md) for how the
parts fit, and [the constitution, explained](./kiln-constitution.md) for the rules every row must keep.
