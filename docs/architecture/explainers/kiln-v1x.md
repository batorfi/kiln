# After `kiln-v1`: what `kiln-v1.x` adds

> **Type:** explainer — for understanding, not a specification. **Audience:** software engineers who want to know what
> comes after `kiln-v1`: what each later addition delivers, why it is shaped as it is, and how it builds on `kiln-v1`
> without changing it. **Status:** describes the `kiln-v1.x` rows of the [roadmap](../../../specs/ROADMAP.md)
> (r45, r33–r37, r46–r52, r40, r41) and the PRD requirements they carry ([PRD](../../prd/kiln-prd.md), final 2026-10-21;
> rows r43–r52 added 2026-10-22). The program, these rows included, was
> **admitted on 2026-10-22**; each row still fires only when the Roadmap gate, re-opening after each feature, admits it next. Each row has its own explainer in
> [`specs/explainers/`](../../../specs/explainers/README.md). Where this explainer and the PRD or
> roadmap differ, they govern.
>
> Companions: [what `kiln-v1` delivers](./kiln-v1.md) · [architecture explainer](./kiln-architecture.md) ·
> [the constitution, explained](./kiln-constitution.md) · [decisions, settled and open](../../concepts/open-decisions.md)

## Contents

1. [`kiln-v1.x` in one paragraph](#1-kiln-v1x-in-one-paragraph)
2. [Why it can come later without breaking anything](#2-why-it-can-come-later-without-breaking-anything)
3. [The additions at a glance](#3-the-additions-at-a-glance)
4. [r45 and r33 — Models beyond the machine](#4-r45-and-r33--models-beyond-the-machine)
5. [r34 and r35 — The bench](#5-r34-and-r35--the-bench)
6. [r36 — Observability in full](#6-r36--observability-in-full)
7. [r37 — Factories anywhere](#7-r37--factories-anywhere)
8. [r40 — Existing codebases, the rest](#8-r40--existing-codebases-the-rest)
9. [r41 — New codebases, the rest](#9-r41--new-codebases-the-rest)
10. [r46–r49 — Explore, beyond the explore space](#10-r46r49--explore-beyond-the-explore-space)
11. [r50–r52 — KILN in Zed, phases 2–4](#11-r50r52--kiln-in-zed-phases-24)
12. [Order and dependencies](#12-order-and-dependencies)
13. [Still not planned](#13-still-not-planned)
14. [Questions engineers usually ask](#14-questions-engineers-usually-ask)

---

## 1. `kiln-v1.x` in one paragraph

`kiln-v1` is a factory for a small team, each engineer with a workshop on their own machine, running local models only.
**`kiln-v1.x` widens that in nine directions**, over fifteen roadmap rows: factories may use **remote judges** first
(r45) and then **private and cloud models** for any role under a recorded egress policy; engineers get **a bench** — a private notebook, research steps and throwaway spikes that
feed the roadmap with evidence; the record gains **traces, insights and time travel**; factories can run **on any host**
— a team GPU server, a cloud machine — and move between hosts or sleep while they wait; and KILN gets deeper at **existing
codebases** (adoption stages, rehearsal on past changes) and **new ones** (conventions enforcement, vertical slices, a team
starting a product together); **Explore** grows from `kiln-v1`'s explore space into as-is specifications, tours,
archaeology, readiness reports and legacy languages; and **KILN in Zed** grows from links and an MCP server into the Agent
Panel, gate moves in the editor and a language server. `kiln-v1.x` is **not one release**: it is a set of independent additions, each admitted at
its own Roadmap gate, in whatever order the people deciding find most valuable.

---

## 2. Why it can come later without breaking anything

The PRD makes a specific promise: **`kiln-v1.x` can follow without changing anything built before it, because the
single-machine, local-only workshop is its degenerate case.** That promise is designed in, not hoped for. `kiln-v1`
already builds the narrow version of each seam that `kiln-v1.x` widens:

| `kiln-v1` builds… | …which `kiln-v1.x` widens to | Row |
|---|---|---|
| a model catalog with **local** entries, and the `local-only` profile | private and remote entries, `hybrid` and `remote-first` profiles, egress policy, budgets | r33 |
| a **host runtime in-process** with the workshop | a separate host runtime, a host channel, many hosts | r37 |
| one store per factory that is **independent of its host** (Principle XI) | moving that store between hosts, and sleeping hosts | r37 |
| knowledge tiers (factory, workshop, team) with **ingest** | a fourth, private tier — the notebook — promoted into them | r34 |
| a **planner** that drafts roadmaps with reasons | drafts with evidence and readiness from research and spikes | r35 |
| an **event stream** that every view is rebuilt from | traces, insights and time travel as further projections of it | r36 |
| a **full scan, baseline and territory** for existing code | adoption stages, rehearsal, preserved behaviour, incremental re-scans | r40 |
| a **walking skeleton** on a foundation flow | conventions enforced from feature two, vertical slices, growing into brownfield | r41 |

Two consequences follow for engineers building `kiln-v1`:

- **Build the seam, not the shortcut.** For example, `kiln-v1` checks every model request against a policy even though
  the only policy is `local-only`; it routes every request through the lane even though there is one host. That is what
  lets r33 and r37 add behaviour instead of rewriting it.
- **Every `kiln-v1.x` row depends only on the release** (or on another `kiln-v1.x` row). Nothing in `kiln-v1` waits for
  them, and they can be reordered freely at later Roadmap gates.

The rules do not change either. Each addition keeps every principle of the [constitution](./kiln-constitution.md) —
several of them (VIII local by default, XI a factory is portable) were written with these additions in mind.

---

## 3. The additions at a glance

| Row | Addition | In one sentence | Builds on | Open decisions before it |
|---|---|---|---|---|
| **r45** | Remote judges | the judge roles on a pinned remote frontier model; workers stay local — the first `kiln-v1.x` row | r32 | — (decided 2026-10-22: judge context, fallback, planner placement) |
| **r33** | Models beyond the machine | private and cloud models for the roles a policy names, with every request checked and recorded | r45 | egress policy language; model-family identity |
| **r34** | The bench, part 1 | a private notebook that matures into knowledge, and research steps on spare capacity | r32 | research capacity on shared hosts; keeper suggestions off-switch; Obsidian vault import |
| **r35** | The bench, part 2 | throwaway spikes with measured reports, and evidence for the roadmap | r34 | archived spike retention |
| **r36** | Observability in full | traces, insights with honest numbers, a feature's journey, time travel | r32 | — (retention of telemetry is decided: 90 days) |
| **r37** | Factories anywhere | factories on any host, placed by people, moved without losing a step, sleeping while they wait | r32 | how workspaces move; workshop failover; container forms; other storage adapters |
| **r40** | Existing codebases, the rest | adoption in stages, rehearsal on past changes, preserved behaviour, re-scans that keep knowledge true | r31, r35, r48 | Rehearse required before Contribute, or recommended |
| **r46–r49** | Explore, beyond the explore space | as-is specifications and business rules, tours and archaeology, spec coverage and readiness, legacy languages | r32 (r48 also r46, r35) | — (defaults adopted 2026-10-22) |
| **r50–r52** | KILN in Zed, phases 2–4 | the KILN agent in Zed's Agent Panel, gate moves in the editor, a language server and team review | r32 → r50 → r51 → r52 | — (defaults adopted 2026-10-22) |
| **r41** | New codebases, the rest | conventions enforced, slices riskiest first, growing into brownfield, starting as a team | r29, r35, r39 | when to revisit an early decision on evidence |

---

## 4. r45 and r33 — Models beyond the machine

### First: remote judges (r45)

The first `kiln-v1.x` row moves only the **judges** — architecture critic, code reviewer, verifier — to a remote frontier
model, through a direct provider or OpenRouter **pinned** (approved providers only, no fallbacks to other providers, data
collection denied, zero data retention where required). Workers and the planner stay local. The judge reads only its
**judge context** — the diff, specification, design, touched files and their direct dependents' interfaces — under the
factory's egress policy; budgets pause; the model served and the provider are recorded on every request. It is the
smallest change that gives a 32–64 GB machine a frontier judge (`hybrid-deployments.md`). r33 then generalises it.

### Then: models beyond the machine for every role (r33)


**What it adds.** A factory may use **private** models (a company's own inference server) and **remote** models (a cloud
provider) — but only for the roles its policy names, decided by a person at the Roadmap gate.

- **A full model catalog.** Every model has a locality (`local` · `private` · `remote`), a pinned version, a **family**,
  capabilities, cost, data-handling terms and an endpoint. Credentials live in the OS secret store.
  `kiln check model` measures capabilities and re-checks on a version change.
- **Profiles.** Each factory runs under `local-only` (still the default, still provable), `hybrid` or `remote-first`.
- **Per-role routing.** The tier map can send a role to a remote model — for example, judges to a stronger cloud model,
  workers staying local. A policy can require **cross-family judging**: the judge comes from a different model family
  than the author.
- **Egress policy.** Before every non-local request, KILN checks what may go to which locality, scans for secrets and
  applies redaction. **A violation blocks the request; it never trims it and sends the rest.**
- **Budgets and fallback.** A reached budget **pauses** the lane — it never skips a gate or downgrades a model. A work
  role may fall back to another model only if the policy names the fallback; **a judge never falls back silently**.
- **Policy stops.** Blocked egress, a reached budget or an unavailable judge arrive in Needs you as decisions, with
  their reason — never as workarounds.

**What changes for engineers.** A factory's brief shows its profile wherever the factory appears; the Merge gate shows
what left the machine for this feature. An **egress audit** per factory and per feature lists every request that left,
to which provider, under which policy.

**Guarantees it must keep.** VIII (local by default: everything that leaves is a recorded, policy-checked choice),
II (judges on the strongest model — which may now be a configured remote one — and never silently downgraded),
IV (affinity remains the local cost lever; remote spend is governed by budgets).

**Proven when.** A hybrid factory's cloud judge sees only what policy allows, and a local-only factory reaches nothing
beyond loopback.

**To settle first.** How policies name artifacts, paths and localities, and how redaction rules are expressed and
tested; how the catalog records model families so cross-family judging can be enforced.

---

## 5. r34 and r35 — The bench

The bench is the engineer's own place to think while factories work. It is **ungated by design**: nothing on the bench
settles a gate, and spike code never reaches `main` (PRD principle P13). It feeds the roadmap with **evidence**, not
decisions.

### r34 — Notebook and research

- **The notebook** — a private, unruled vault per person (an Obsidian vault like every other KILN wiki), with explicit
  capture from a web clipper, an editor, the terminal, KILN's own surfaces and local voice transcription. Capture is
  always a deliberate act.
- **Keeper suggestions** — links, contradictions and a maturity hint, offered in the notebook. The keeper never rewrites
  a note, and uses the notebook only to answer its owner's questions.
- **Promotion** — a note moves into workshop, factory or team knowledge by an ingest, linked back to where it came from.
- **Research steps** — a question answered by an agent with read-only tools, its plan shown first, running **below
  feature work** and never on a lane held by a judge; results land in the notebook with sources and labels; per-person
  caps keep it fair.
- **Origin and maturity labels** on all knowledge — *from a person*, *from research*, *from a spike*; exploratory or
  established — carried into briefs and the planner's citations; lint ages exploratory knowledge faster.

### r35 — Spikes and candidates

- **Spikes** — a throwaway worktree on a `spike/` branch, with a question and a time box, worked by the engineer, an
  agent, or both; risky actions are held for a person as everywhere else. **No pull request to `main` can come from a
  spike branch.** The spike is archived when it concludes.
- **Spike reports** — what was measured, not what was hoped. *Propose as a feature* seeds a roadmap entry and its
  Concept or Architecture brief.
- **The candidate list** — per factory: candidates from notes, research and spike reports, with links kept; editable by
  deciders and Curators; proposable to the team roadmap with evidence. Flaky tests from a brownfield baseline arrive here
  too.
- **Evidence at the Roadmap gate** — readiness per proposed feature (*ready · thin · unknown*), unproven assumptions,
  *research this* and *spike this* actions, and *what we learned since the last approval*.
- **The director suggests, never starts** research or spikes; a proposal says plainly when a candidate cannot be sized.
- **In a team** — research claims, sharing bench output by choice, handing a spike to a teammate.

**Guarantees it must keep.** X (knowledge is context — and only *promoted* knowledge is cited in a brief),
I and V (bench output is never a decision), III (research and spikes take the lane only below feature work).

**Proven when.** A notebook entry promoted to knowledge keeps its origin; research results are cited; a spike's report
becomes evidence on a candidate at the Roadmap gate; spike code never merges.

**To settle first.** Whether research and spike capacity is reserved per person on a shared host or first come, first
served; whether keeper suggestions can be switched off per person; how long archived spike branches are kept; whether
setup can import an existing Obsidian vault as the notebook.

---

## 6. r36 — Observability in full

`kiln-v1` already derives core metrics from events and runs the health watcher. r36 adds the views that answer *how is
the factory actually working?*

- **Traces** — one per feature, from feature to gate to step to model request to tool call, linked to the events. An
  **opt-in OpenTelemetry export** sends them only to an allowed collector, loopback by default.
- **A feature's journey** — every gate, round, move and decider for one feature; machine time versus waiting time; where
  work went back. Rebuilt from the record, never stored separately.
- **Insights** — honest numbers about the work: where time goes, which gates and judges earn their place, how models
  compare. They follow strict rules:
  - **counts and sample sizes always shown**, with a few-cases rule: fewer than 5 cases are listed, 5–19 shown as a rate
    with its count, trends only from 20;
  - **evidence for people, never automatic change** — no insight changes configuration, the director or a gate;
  - **no rankings of people**, personal figures private to the person; targets only on system behaviour, never on
    approval speed or volume;
  - team comparisons only by opt-in, with at least three contributing workshops, as ranges.
- **Time travel** — any projection rebuilt as of any point in the record: *what did this gate's brief look like when it
  was decided?*

**Guarantees it must keep.** VII (every view is a projection of the event stream — traces and insights included), IX
(event-driven, never polling), VIII (export only to an allowed collector), and the PRD's privacy rule: no prompt or answer
content in metrics, traces or exports.

**Proven when.** There is one trace per feature; insights show counts and sample sizes; the record explorer travels to
any moment.

---

## 7. r37 — Factories anywhere

**What it adds.** Factories stop being tied to the machine the workshop runs on.

- **Hosts** — a laptop, a team server, a cloud machine, a container. A host joins by an Operator's approval, receives a
  revocable identity, and talks to the workshop over a **mutually authenticated, encrypted host channel**.
  `kiln host join` and `kiln host measure` record what it can run.
- **Placement** — decided by a person at the Roadmap gate, with fit checks: policy, models, capacity, cost. A
  `local-only` factory may only be placed on a local host.
- **Moves with handover** — a recorded command: fit check, quiesce at a step boundary, transfer the store, feature
  archives, workspace and knowledge repository, resume on the new host. A failed transfer reopens the old store; nothing
  has changed.
- **Sleeping hosts** — a host whose factories all wait at gates can suspend entirely; waiting gates run no code. A move
  made while it sleeps is **applied on wake, exactly once**.
- **Network failure** — a host that loses the workshop keeps working up to the next gate; no gate is settled while it is
  unreachable; records catch up in order when it returns.
- **Shared hosts** — a team GPU server can serve several members' workshops, each with isolated leases, stores and
  secrets; every placement is still each workshop's own decision.
- **A network-shared workshop** — the front door reachable beyond loopback, with TLS and the team's identity provider.

**Guarantees it must keep.** XI (a factory is portable — a move, a sleep or a lost connection never settles, re-opens or
alters a gate), V (absence never approves — an unreachable host is absence), VIII (every connection beyond loopback is
authenticated and encrypted; each host's allowlist is checked), XII (a shared host never decides for a workshop).

**Proven when.** A factory moves between hosts with handover, and a network failure approves nothing.

**To settle first.** How a workspace moves — a full copy, or a git remote the new host clones; whether the workshop
itself can move or fail over to a standby; which container and orchestration forms to support first; whether Pi
Durable's other storage adapters can host a factory store.

---

## 8. r40 — Existing codebases, the rest

`kiln-v1` brings KILN into an existing codebase with a full scan, a baseline, a territory and the team's own process.
r40 adds the parts that build **trust in stages** and keep the knowledge true over time.

- **Adoption stages**, each entered by a recorded decision, so a team can see exactly how far it has let KILN in:
  **Observe** (profile, full scan and baseline; no file changed), **Rehearse** (replays of past changes; no pull
  requests), **Contribute** (real features in its territory; the Merge gate opens a pull request into the team's normal
  review), **Own** (for a well-bounded area, the team's merge path — granted by the team's quorum, still through the code
  host's rules).
- **Rehearsal** — KILN takes an issue the team already solved, runs the flow up to Code review and Verification in a
  scratch worktree, ungated, and **compares its judges' findings with what the team actually merged**. It is how a team
  measures KILN on its own code before trusting it with new work.
- **Preserved behaviour** — the specification states what must not change, and where that behaviour is untested, the
  work plan starts with **characterization tests** that pin it down first.
- **Brownfield knowledge** — ingest from code, history and docs with source labels; interview questions for Curators;
  disagreements between docs and code surfaced as lint findings.
- **A small, reviewed footprint** — Spec Kit and the constitution enter the team's repository through an *Add Spec Kit*
  pull request when KILN enters Contribute; until then they live only in KILN's scratch worktree. Committed `.kiln/`
  files are opt-in.
- **Keeping the scan true** — an incremental re-scan after each merge to `main`, a full re-scan on request; re-scans
  never overwrite people's edits — a conflict becomes a contradiction for a person to resolve.
- **Issues and review comments** — issues imported as bench candidates; review comments on KILN's pull requests returned
  to the factory as notes.

**Guarantees it must keep.** XII and the team's own process (code owners, required reviews and CI are shown and never
bypassed), X (scan knowledge cites the commit it read), I (rehearsal is evidence, never a decision).

**Proven when.** A rehearsal on a past change compares the judges' findings with what the team merged.

**To settle first.** Whether Rehearse is required before Contribute, or only recommended.

---

## 9. r41 — New codebases, the rest

`kiln-v1` takes an empty repository to a merged, verified walking skeleton. r41 adds what keeps a young codebase
coherent as it grows.

- **Conventions from day one** — the conventions the skeleton wrote down are checked by the code reviewer and CI from the
  second feature; changing one is a recorded decision.
- **Slices and risk** — the planner proposes vertical slices, riskiest assumptions first, with tests-first work plans by
  default.
- **Growing into brownfield** — when a trigger is met, the director *suggests* switching on a brownfield practice,
  decided at a Roadmap gate: code KILN did not write arrives → a full scan and incremental re-scans; the first release
  ships → preserved behaviour and a baseline; a second factory or a teammate works in the repository → territories and
  claims; the code outgrows what a step can read → the code map.
- **Starting as a team** — the product brief, constitution and technology decisions agreed in the team space; the
  skeleton built by one workshop; claims opened once it merges.

**Guarantees it must keep.** VI (every switch of practice is a Roadmap-gate decision), I (the planner proposes slices;
people decide), XII (a team agrees in the team space; each workshop still decides its own gates).

**Proven when.** Conventions written by the skeleton are enforced from feature two, and a team starts a product
together.

**To settle first.** When a greenfield factory should revisit an early decision that evidence keeps fighting — for
example, a spike-backed technology choice that later features keep working around.

---

## 10. r46–r49 — Explore, beyond the explore space

`kiln-v1` ships the **explore space** (r43): exploring a codebase with no factory and no gates — maps, hot spots, the test
landscape, and questions and traces answered with citations. These rows take it from understanding to specification
(`code-exploration.md`):

- **r46 — As-is specifications.** Specifications of what the code does today in Spec Kit's format, business rules cited to
  their code, open questions and characterization-test proposals, confirmed or corrected by a person; a constitution
  discovered from the code; past changes replayed as spec-driven worked examples.
- **r47 — Tours and archaeology.** Tours drafted by KILN and reviewed by an expert; why-it-is-like-this narratives;
  recovered decisions for a person to confirm.
- **r48 — Readiness.** The spec-coverage map, adoption stages 0–2 (explore, understand, specify as-is), change sizing as
  candidates, and the factory readiness report — evidence, never a score of a person. r40's adoption stages build on it.
- **r49 — Legacy languages.** Deterministic parsing for the first legacy languages chosen by demand; honest coverage.

**Guarantees it must keep.** Zero footprint until a team chooses its own pull request; every claim cited and labelled (X);
recovered specifications are candidates until a person confirms them.

## 11. r50–r52 — KILN in Zed, phases 2–4

`kiln-v1` ships phase 1 (r44): deep links, task templates, vault projects and a read-only MCP server. These rows bring
KILN into the editor itself (`zed-integration.md`):

- **r50 — The Agent Panel.** The KILN agent over ACP, read-only: the director, Needs you, full gate briefs with every
  citation followed in the editor, diffs, explore questions, risky-action approvals as permission requests.
- **r51 — Decide where the code is.** Code review, then Verification and Implementation, decided in Zed only after the full
  brief, through the same move intake, with identity from a session token in the OS keychain; following and steering
  workers.
- **r52 — Ambient and team.** A KILN language server (territory, claims, knowledge on hover, drift, preserved behaviour,
  findings) and teammates' required reviews from a shared Zed workspace.

**Guarantees it must keep.** Zed is a surface, never a source of truth (IX); a gate move needs the full brief (V, UX
decision 4); MCP served to cloud agents is egress (VIII).

## 12. Order and dependencies

```
                     ┌─► r45 Remote judges ─► r33 Models beyond the machine
                     ├─► r34 The bench 1 ─► r35 The bench 2 ─┬─► r48 Readiness (also r46) ─► r40 Existing codebases, the rest (also r31)
                     │                                       └─► r41 New codebases, the rest (also r29, r39)
 r32 kiln-v1 ────────┼─► r36 Observability in full
                     ├─► r37 Factories anywhere
                     ├─► r46 As-is specifications · r47 Tours and archaeology · r49 Legacy languages
                     └─► r50 Zed: Agent Panel ─► r51 Zed: decide in the editor ─► r52 Zed: ambient and team
```

- **r45 comes first** in the proposed order — remote judges are the cheapest large gain — and **r33 builds on it**.
- **r34, r36, r37, r46, r47, r49 and r50 are independent** of each other and can be admitted in any order — or in parallel
  by different people, since each is its own feature.
- **r35 needs r34**; **r48 needs r46 and the bench** (r35); **r40 needs r48** (its adoption stages continue r48's); **r41
  needs the bench**; Zed's phases run **r50 → r51 → r52**.
- The roadmap lists them in id order, but **the order is a Roadmap-gate decision** each time. Reasonable drivers:
  - a team that needs a **stronger judge than its machines can run** → r45 first;
  - a team with a **shared GPU server** → r37 first;
  - a team that wants **evidence-backed roadmaps** → r34 and r35 first;
  - a team **adopting KILN on a large existing codebase** → r35 then r40.

Each row also lands with its own open decisions (§3). They are listed in
[`open-decisions.md`](../../concepts/open-decisions.md) and should be settled before the row's Roadmap gate, the same way
`kiln-v1`'s were.

---

## 13. Still not planned

Some ideas are designed or discussed in the concept docs but have **no row**, not even in `kiln-v1.x`:

| Idea | Status |
|---|---|
| **Gates after Merge** — deployment, release approval | out of scope; how they would relate to the Merge gate's authority is an open question |
| **An audit export** — the record as content-free CloudEvents JSONL for a team's own audit systems | not yet placed |
| **A wiki as training data** — a mature factory wiki used to tune a smaller local model that knows the factory | not yet placed |
| **Migrating a workshop** created by an earlier KILN version | the first release after `kiln-v1` will need it |
| **A hosted KILN** — accounts, a service, a backend | a non-goal, permanently |

---

## 14. Questions engineers usually ask

**Is `kiln-v1.x` one release?**
No. It is fifteen rows, each admitted at its own Roadmap gate after `kiln-v1`. There may be several point
releases, in whatever order the deciders choose.

**Do I need to prepare for these while building `kiln-v1`?**
Only by building the seams honestly: the policy check before every model request, the lane in front of every request, a
store that knows nothing about its host, knowledge with origins. §2 lists them. Don't build the `kiln-v1.x` features
themselves early.

**With r45, can a cloud model be the judge?**
Yes, if the factory's policy routes the judge role there and it is the strongest model available to that factory. It is
still never silently downgraded: if it is unreachable, the judged step waits and says why. Remote judges advise; people
still decide.

**Does the bench make KILN less safe — agents running outside the gates?**
No. Research steps use read-only tools; spikes run in throwaway worktrees with risky actions held for a person; nothing
from the bench settles a gate, and spike branches cannot open pull requests to `main`. The bench produces evidence; the
gates still decide.

**With factories anywhere, can a team server run my factory without me?**
It can *host* your factory once you place it there. It cannot decide anything: your workshop still owns every gate,
moves are your commands, and a lost connection approves nothing.

**Why do r40 and r41 wait for the bench?**
Their strongest evidence — rehearsal comparisons, spike-backed technology decisions, candidates from issues and flaky
tests — flows through research, spikes and the candidate list, which the bench provides.

**Where do I find the detail?**
The [PRD](../../prd/kiln-prd.md) (MOD, BENCH, OBS, HOST, BROWN and GREEN requirements), the
[roadmap](../../../specs/ROADMAP.md), and the concept docs: [models beyond the machine](../../concepts/web-front-door.md)
(§13), [the bench](../../concepts/the-bench.md), [insights](../../concepts/insights.md),
[factories anywhere](../../concepts/factories-anywhere.md), [brownfield](../../concepts/brownfield.md) and
[greenfield](../../concepts/greenfield.md).
