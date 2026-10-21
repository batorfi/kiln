# KILN Constitution
<!-- The factory's binding law. Per kiln-analogy.md §4.8, the constitution is the kiln's
     "atmosphere and glaze recipe": the law every firing must satisfy. It binds across
     firings and across a whole batch, not just within one. -->

## Core Principles

### I. Author / Judge Separation — no model may approve its own work

No role — including the director and its planner — ever decides the gate its own artifact feeds. A producer *produces*
(researcher, concept writer, designer, spec writer, planner, worker, techwriter, PR writer); a line-of-defense role
*judges* (architecture critic, code reviewer, verifier, and the judges of any added gate); the *deciding* move is always a
**person's**. A gate is a decision the feature waits on until a person's move is committed. Judgment is distributed across
many judges; the decision is singular, made by a person, in the workshop that owns the factory.

*Rationale:* this is the precondition for a trustworthy gate; a role that blesses its own artifact has removed its own
check.
*Testable as:* no gate settles without a committed move by a permitted person, or a recorded delegation on a clean path
(see *The Default Flow*); no conversation both produces an artifact and judges it; only the director creates
conversations.

### II. The lines of defense are always the strongest

Every line-of-defense role — the **architecture critic**, the **code reviewer**, the **verifier**, and any judge of an
added gate — MUST run on the **strongest model available to the factory**, wherever that model runs. Where a factory's or
a team's policy requires it, judges run on a **different model family** from the author they judge. A judge is **never
silently downgraded**: an unavailable judge becomes a question for a person, never a fallback to a weaker model.

*Rationale:* the judges are the gates' backstops; a factory works one step at a time with no parallel pass to catch what a
weak judge misses.
*Testable as:* the configuration check refuses any judge binding below the strongest available model; every judge step
records the model it ran on; no judge step runs on a fallback.

### III. One lane per factory; one generation at a time

Each factory is **strictly sequential**: one lane, one running model generation at a time, one feature at a time. A host
may run several factories, each with its own lane; how many models stay resident across them is bounded by the host's
memory budget and decided by its model pool. The **director** schedules its factory's lane; parallelism exists **between**
factories, never inside one.

*Rationale:* predictability, explainability and low switching cost are the point of a local kiln — one chamber per
firing; a host is a row of kilns, not a foundry.
*Testable as:* at most one generation runs per factory at any instant, enforced by the factory's lane task; resident models
on a host never exceed its configured budget.

### IV. Model affinity is the cost lever for local models

Work is ordered so the lane changes model **as rarely as possible**; a swap happens **only** when the next step's role
needs a different model. For local models the cost is `wall-clock = (work) + (switching)`, with switching
local-dominant; affinity applies within a factory and across factories on a host. For remote models, spend is governed
by **budgets** that pause work, never skip or downgrade it.

*Rationale:* loading a local model is the expensive move — re-heating the kiln from cold; firing like work together keeps
the chamber hot.
*Testable as:* the observed swap count is the minimum the plan's model sequence requires; a reached budget pauses and asks
a person.

### V. Nothing approves by absence

A missing screen, a missing person, a restart, a crash, a timeout or an unreachable device may **delay** a gate; it may
**never settle** one. Every gate is a **durable waiting task**: it settles only when a person's move is committed — and
that move and the gate's completion are **one atomic commit**, keyed exactly once, where the **first committed move
wins** and a move made against a stale state is refused. No clock settles a gate. *Headless* is not a mode: it is simply
waiting.

*Rationale:* this is the one rule that keeps an unattended factory honest — a gate is a door that opens only from the
person's side.
*Testable as:* killing the factory at any step of a gate task leaves it waiting on restart; no gate task has a timer; every
settled gate has exactly one committed move (or a recorded delegation) as its cause.

### VI. The Roadmap gate is human-only, always

The **Roadmap gate** — which features a factory builds, in what order, and how it runs — is the **one gate no exception
may reach**: not delegation, not a planner, not a team space, not a missing screen. It admits **one feature at a time**;
nothing is chained. The planner may draft and the person may shape the roadmap together with it, but only the person's
move at the Roadmap gate admits, and it admits exactly the version of the roadmap that was read.

*Rationale:* a wrong *program* costs the whole feature-set downstream of it; getting it right is what the roadmap is for.
*Testable as:* no feature starts without a recorded person's approve at the Roadmap gate; no delegation document can cover
it; a move on a superseded roadmap version is refused.

### VII. Everything is recorded

Every state change — a gate opening, a move, a step starting and settling, a model swap, a delegation, a configuration
change, a request that left the machine — is a **domain event committed atomically with the change it describes**, with
its actor and its cause. The ordered event stream in the factory's durable store **is the record**; the factory-log and
every other view are **projections** rebuildable from it, and the factory-log projection is byte-identical on rebuild.
Events never carry prompts, answers or code; content lives in documents the events reference. A delegated approve is
recorded as delegated, never as a person's live decision.

*Rationale:* the record is the audit trail and the basis of every explanation; one record, written with the change, cannot
drift from what happened.
*Testable as:* a feature's whole journey — every gate, decider, cause, model and cost — is reconstructable from its events
alone; rebuilding the factory-log yields the same bytes.

### VIII. Local by default; everything else by recorded choice

A factory runs on **local models by default**, and under the default `local-only` profile nothing leaves the machine.
Private and remote models, other hosts, paired devices and network access are allowed **only by configured, recorded,
policy-checked choice**: every outbound request is checked against the factory's egress policy before it is sent and
recorded after; every connection beyond loopback — between workshop and hosts, and from paired devices — is
**authenticated and encrypted**; there is **no KILN cloud** and no KILN-run service in the path. A role that needs an
outside resource the policy does not allow **flags it as unavailable** rather than reaching for it.

*Rationale:* the engineer's code, prompts and decisions are theirs; leaving the machine must be a decision, never a
default or a reflex.
*Testable as:* a `local-only` factory's network check finds nothing beyond loopback; every request that left the machine
has an egress record and the rule that allowed it; refused requests are recorded.

### IX. Surfaces are views, never sources of truth

People see and act on KILN through **surfaces** — the **web front door** served by the workshop, and the **CLI** — that
read **one committed state** and are driven by **domain events, never by polling**. No surface holds state of its own that
could disagree with the record, and no surface can settle anything except by submitting a move or a command for the
workshop to commit. The front door listens on **loopback by default**; reached over any network, it requires real
authentication (paired device keys, or the team's identity provider) and never accepts a decision without the full brief
being available. The earlier terminal surfaces inside Pi are **retired**.

*Rationale:* the person watches the kiln through windows; a window that could become a second truth, or decide on its own,
would break every other principle.
*Testable as:* every surface update is triggered by an event; no surface writes state directly; a move from any surface
is checked and committed by the workshop, or refused.

### X. Knowledge is context, never authority

The knowledge bases — factory, workshop and team wikis, implementation knowledge, scans and notebooks promoted into them —
**inform** decisions; they never **make** them. Every knowledge claim is traceable to its source, labelled with its origin
and, where it rests on code, cited at a commit; stale, drifted or contradicted knowledge is shown as such wherever it is
cited. No knowledge content settles a gate, satisfies a check, or overrides a specification.

*Rationale:* an LLM-written knowledge base is powerful context and a dangerous authority; keeping it context keeps people
and judges in charge.
*Testable as:* every page cited in a brief has sources; no gate, check or flow rule reads knowledge as a condition.

### XI. A factory is portable; moving it never changes a decision

A factory — its store, record, workspace and knowledge — can move between hosts or be restored from backup, and **no
move, restore or restart changes any decision, gate state or record**. A move is a recorded handover: quiesce, transfer,
verify, resume.

*Rationale:* factories must run anywhere without their guarantees depending on where they run.
*Testable as:* a factory's record before and after a move is identical up to the move's own events; a gate waiting before a
move is waiting after it.

### XII. Workshops are sovereign

Each person's workshop decides its own factories' gates. No act from a team space, another workshop, a host or a device
**settles** a gate in it; only the owning workshop's deciders — or a person it explicitly names, recorded — do. Team rules
form a **floor** a workshop may make stricter, never looser; teams coordinate by making work visible and asking, never by
deciding for each other.

*Rationale:* teams of personal workshops work in the open without anyone losing authority over their own work.
*Testable as:* no event arriving from a team space or another workshop can complete a gate task; every workshop setting is
at least as strict as the team floor.

## The Default Flow & The Roadmap

The **default flow** is KILN's spine. Per feature, in order, with plain names (internal ids unchanged: `gate0`,
`1-concept` … `9-pr`):

```
Roadmap gate (program, person only)
Contract:        1 Concept   2 Design*   3 Specification   4 Work plan
Build & prove:   5 Implementation   6 Code review*   7 Verification*
Release:         8 Documentation   9 Merge
                                                   * judged gates — a line-of-defense judge, held lane
```

**Anchors.** The Roadmap gate is always first and the Merge gate always last; the nine built-in gates are present in every
flow, in this order. Teams may **add** gates between built-in ones — by recorded decision, checked before use, each with
the same gate contract, the same full brief and moves from the same closed set — but may never remove or reorder a
built-in gate. A feature's flow is chosen at the Roadmap gate and pinned, with its gate versions, until it merges.

**Moves.** A closed set of move kinds — `approve`, `revise`, `reject`, `restart`, `split+revise`, `mitigate` — offered per
gate:
- **Concept, Design, Specification, Work plan, Documentation:** approve · revise · reject.
- **Implementation:** approve · split+revise; **no reject** — a feature about to be built is not "done wrong"; it may become
  two.
- **Code review:** approve · restart; **no revise** — the reviewer judges and never edits; restart rebuilds from the
  restorable commit confirmed at the Implementation gate.
- **Verification:** approve · reject, after **at most a bounded number of automatic fix rounds** (two by default); then a
  person decides.
- **Merge:** approve (= merge, the only point where *ship it* is authorised) · reject.

Corrective moves carry a note that becomes the next step's instruction.

**Every gate presents a complete brief.** No gate is presented as a bare yes/no: the person sees what is being decided,
the work, the yardstick, the evidence, the risks, the provenance, the history and every option with its consequence; the
brief as seen is recorded with the move. Advice is labelled as advice; no move is pre-selected.

**Two deliberate trims, never defaults.**
- **Triage** may skip **Concept and Design** for a small, well-scoped feature — recorded with its reasoning, shown in every
  later brief, and impossible where the flow forbids it. Nothing else can skip a gate.
- **The unattended tail** may be armed by the person who approves the **Specification gate**, for the gates after it
  (Merge only if explicitly included). It covers only the clean path: **any judge's objection, a split, a blocked request
  or a reached budget ends it**, and every later gate waits for a person. It never reaches the Roadmap gate. *"If
  everything checks out, don't bother me"* is never *"ship it even if a judge says no."*

**The roadmap.** A factory's roadmap is an ordered, dependency-gated list of features; each feature is one full walk of
its flow; features run **one at a time** per factory; a feature starts only when its dependencies are done; the Roadmap
gate re-opens after every merge and admits one next feature. The roadmap is a committed, reviewed artifact
(`specs/ROADMAP.md`) and the Roadmap gate's document.

## Roles, Models & Substrate

**Roles are files; models are bound to roles.** Each role is defined by instructions, a kind, its tools, its replay rule
and a version; a tier map binds roles to models. **Work roles** may run on the cheapest model the gate after them can
bound; **line-of-defense roles** run on the strongest (Principle II); **triage** may be cheap because a person's gate
bounds it immediately. Every step records the role version and the model it ran on.

**The substrate.** KILN runs on **Pi** and **Pi Durable** (durable tasks, conversations, documents, exactly-once
requests), reaches models through **`pi-ai`**, and serves local models through **Ollama**. Feature artifacts follow
**GitHub Spec Kit** — this constitution, the specification, plan and tasks of every feature in `specs/NNN-name/`, and the
`speckit.*` commands run by KILN's roles. Every external dependency sits behind **one seam module**.

**Dependencies are allowed, pinned and recorded.** A runtime dependency is a recorded decision with a pinned version
range; experimental dependencies sit behind a seam so that a change in them is a change in one place. The earlier
zero-runtime-dependency stance is superseded.

**Configuration is code.** Workshop and factory configuration are plain, reviewed files; every change is checked before it
applies, recorded with before and after, and applied from the next step; no configuration can weaken Principles I, II, V,
VI or VIII.

**The cost unit** for local work is held compute and wall-clock; for remote work it is spend within a budget. Complexity
must be justified.

**This constitution is the kiln's recipe.** Per `kiln-analogy.md` §4.8 it binds across firings and across a whole batch: a
feature that violates it is "fired in the wrong atmosphere" — the defect is in the surroundings, so it must be caught
before delegation is allowed to run.

## Governance

- **This constitution supersedes all other KILN practices.** Where a concept doc, the PRD or the code disagrees with it,
  the constitution governs. The concept set (`docs/concepts/`) is read to *understand* the system; it never overrides a
  principle here.
- **Amendment requires** a written rationale, **a person's approval**, a **version bump** by the policy below, and — for any
  MAJOR change — a migration note in the amendment history. Changes are drafted with a **Sync Impact Report** (an HTML
  comment at the top of this file) that is scratch and removed before the amended constitution is committed. The previous
  text of every amended version is kept unchanged under `.specify/memory/archive/`.
- **Versioning (semantic).**
  - **MAJOR** — a backward-incompatible principle removal or redefinition.
  - **MINOR** — a new principle or section, or materially expanded guidance.
  - **PATCH** — clarification, wording, typo, or non-semantic refinement.
- **Compliance.** Every gate and every pull request **MUST verify compliance** with this constitution; each non-obvious
  decision is justified; **the record is the compliance evidence** (Principle VII).

## Amendment history

**2.0.0 — 2026-10-20** — amended by decision of human@batorfi, adopting the constitution amendments listed in the PRD
(`docs/prd/kiln-prd.md` §15) for the new KILN (`docs/concepts/web-front-door.md` §11). Previous text:
`.specify/memory/archive/constitution-1.0.0.md`.

| Principle | Change | Level |
|---|---|---|
| I | role names updated; "only the director creates conversations" made testable | PATCH |
| II | judges on the strongest model *available to the factory* (which may be remote by policy); cross-family judging where required; never silently downgraded; the docs synthesizer is no longer a line-of-defense role — the line of defense is the judges of the judged gates (Design, Code review, Verification) and of added gates | MAJOR |
| III | one lane **per factory**; resident models bounded per host by the model pool | MAJOR |
| IV | affinity scoped to local models, within and across factories; remote spend governed by budgets | MINOR |
| V | restated as the durable gate contract — nothing approves by absence; first move wins; no clock settles a gate | MINOR |
| VI | Gate 0 renamed **the Roadmap gate**; shaping the roadmap together with the planner; admits the version read | PATCH |
| VII | the ordered event stream is the primary record; the factory-log is a projection | MAJOR |
| VIII | local by default; remote models, hosts, devices and networks only by configured, recorded, policy-checked choice; no KILN cloud | MAJOR |
| IX | the three terminal UI layers and "no server" replaced by surfaces that are views — the web front door and the CLI; the terminal surface inside Pi is **retired** | MAJOR |
| X, XI, XII | new: knowledge is context, never authority · a factory is portable · workshops are sovereign | MINOR |
| Gate rail | became **the default flow**: plain gate names, fixed anchors, added gates by recorded decision, a closed set of move kinds, the full brief at every gate | MINOR |
| Roles & substrate | Pi Durable, `pi-ai`, Ollama and GitHub Spec Kit named as the substrate; dependencies allowed, pinned and recorded; configuration as code | MINOR |

**Migration note (MAJOR changes).**
- *Code:* the first program's code (r1–r9) remains valid evidence under 1.0.0. Code kept by the restart (PRD §10.1) still
  expresses Principles I, II, IV and V; code adapted (§10.2) is brought under 2.0.0 by the row that ports it. The Pi
  extension and its terminal UI layers (`pi/`, `pi/ui/`, `ui/*` renderers) are frozen in `legacy/` at r12 and retired; they
  are no longer required to satisfy Principle IX.
- *Records:* existing factory-logs are kept and replayed as event streams (PRD M2); nothing recorded under 1.0.0 is
  rewritten.
- *Roadmaps:* the first program's roadmap is archived unchanged (`specs/archive/`); the new roadmap is admitted at the
  Roadmap gate under 2.0.0.
- *Principle references in code comments* (`P-VIII`, `P-IX`, …) keep their numbers; where a comment relies on 1.0.0
  wording, it is updated by the row that touches the file.

**1.0.0 — 2026-09-12** — ratified.

**Version**: 2.0.0 | **Ratified**: 2026-09-12 | **Last Amended**: 2026-10-20
