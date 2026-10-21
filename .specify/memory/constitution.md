# KILN Constitution
<!-- The factory's binding law. Per kiln-analogy.md §4.8, the constitution is the kiln's
     "atmosphere and glaze recipe": the law every firing must satisfy. It binds across
     firings and across a whole batch, not just within one. -->

## Core Principles

### I. Author / Judge Separation — no model may approve its own work

No role — including the director and the planner — ever decides the gate its own artifact feeds. A **producer** makes an
artifact; a **judge** examines it and produces evidence; the **deciding move is always a person's**, made live or through
a recorded delegation (see *The Flow*). A gate is a person's decision that the factory waits on until a move arrives.
Judgment may be spread across several judges and checks; the decision is singular, made by a person.

*Rationale:* this is the precondition for a trustworthy gate; a role that blesses its own artifact has removed its own
check, and the safety net collapses.
*Testable as:* no gate settles without a person's move or a recorded delegation; no artifact is authored and judged by
the same unit or conversation.

### II. Every judge runs on the strongest model

Every **judge role** — the architecture critic, the code reviewer and the verifier on the built-in gates, and any judge on
a gate a team adds — MUST be bound to the **strongest model available to the factory**, on every substrate, including a
local one, while producer roles are free to be cheaper. A weaker binding is a refused configuration, not a warning, and a
judge is **never silently downgraded**: when the strongest model is unavailable, the judged step waits and says why. A
factory or team policy may additionally require judges from a **different model family** than the author.

*Rationale:* judges are the gates' backgates; a single lane has no parallel pass to catch what a weak judge misses, so a
weak judge defeats the whole net.
*Testable as:* every judge unit records a model that is the strongest the factory's configuration allows; no judge binds
to a cheaper tier; a missing strongest model produces a wait, never a substitute.

### III. One lane per factory; sequential inside it

Each **factory** works on one codebase, **strictly sequentially**: one lane, one running unit at a time, one feature at a
time. The **director is the scheduler** — it holds the lane, yields it to a unit and reclaims it when the unit returns;
there is no separate scheduling abstraction. Parallelism happens **between factories**, never inside one. How many
factories may hold how many resident models at once is a **per-host memory budget** enforced by the host's model pool.

*Rationale:* predictability and low hold cost are the point of a local kiln — one chamber per factory, not a foundry; the
budget keeps several chambers on one machine honest.
*Testable as:* within a factory, at most one unit runs at any instant; across a host, resident models never exceed the
host's budget; on a one-factory host this reads exactly as one lane, one resident model.

### IV. Model affinity is the cost lever for local models

Work is ordered so that the lane changes local model **as rarely as possible**; a swap happens **only** when the next
unit's required tier differs from the resident one. Affinity applies **host-wide**, across the factories sharing a model
pool; after a restart, the lane re-establishes affinity first. Spend on remote models is governed by **budgets**, not by
affinity.

*Rationale:* loading a local model is the expensive move (re-heating the kiln from cold); firing like units together keeps
the chamber hot and the switch tax low.
*Testable as:* the observed local swap count is the minimum the planned tier sequence requires; no swap occurs on an
affinity-compatible boundary; remote spend never exceeds its budget without a recorded stop.

### V. A missing person never approves

A missing screen, a closed browser, a crash, a restart, a lost connection or an elapsed clock may **delay** a gate; none
may **settle** one. A waiting gate is a **durable waiting task**; it settles only on a **committed move** — a person's, or
an approve under a recorded delegation on a clean path. Nothing is ever inferred from absence.

*Rationale:* this is the one rule that keeps unattended work honest; a missing UI that approved silently would make every
other guarantee decorative.
*Testable as:* kill the factory at every step of every gate: it resumes waiting; no gate is settled without a committed
move; no settlement carries a clock or a restart as its cause.

### VI. The Roadmap gate is human-only, always

The **Roadmap gate** admits the next feature and decides how the factory runs. It is the **one gate no exception may
silence**: it accepts **no delegated move**, no unattended chain reaches it, and a missing person leaves it waiting. It
re-opens after every merged or abandoned feature; starting a factory is a recorded human command, and delegation never
crosses factories.

*Rationale:* a wrong program costs everything downstream of it and is not cheap to un-fire; getting it right is what the
firing program is for.
*Testable as:* no feature reaches its first gate without a person's approve at the Roadmap gate recorded with its actor;
no delegation names the Roadmap gate.

### VII. Everything is recorded

Every state change — gate opened, step started, model loaded or swapped, move made, delegation armed or ended, policy
stop, cost — is a **domain event** with its **cause and actor**, committed **atomically with the state it changes**, in an
ordered stream. That stream is the **primary record**; the factory-log and every other view are **projections**, rebuildable
from it. A delegated approve stays a **distinct entry** from a person's move, naming the delegation that produced it.

*Rationale:* the record is the audit trail and the backing of every other guarantee; a decision that cannot be explained
afterwards did not happen safely.
*Testable as:* any merged feature can be reconstructed — every gate's outcome, decider, evidence and cost — from the
record alone; every projection rebuilds identically from the stream.

### VIII. Local by default

A factory runs on **local models** and its data stays on the machine **by default**. Remote models, remote hosts and any
other egress happen **only by a configured, recorded, policy-checked choice**, per factory and per role; everything that
leaves is recorded. Every connection beyond loopback is **authenticated and encrypted**. A role that needs an outside
resource the policy does not allow **flags it as unavailable rather than blocking** the feature.

*Rationale:* ownership of code, intent and cost is a promise people make to their organisations; the default must keep it
without configuration, and every exception must be visible.
*Testable as:* under the default local-only profile, a run completes with no outbound network traffic beyond the
allowlist; every egress event names the policy that allowed it.

### IX. One committed state; surfaces driven by events

Every surface — the web front door, the command line, any other view — reads **one committed state** and updates **on
domain events, never by polling**. The front door is a **loopback server that is never a source of truth**: it renders
projections and carries moves and commands into the factory, and nothing is decided in it. A front door reachable over a
network requires **real authentication**.

*Rationale:* the person watches and decides where the record lives; a surface that held its own truth would be a second,
unaudited factory.
*Testable as:* no surface blocks on a timer; every update is caused by an event; stopping the front door loses no state
and settles no gate; a non-loopback listener without authentication is refused.

### X. Knowledge is context, never authority

Factory, workshop and team knowledge (the wikis) **inform** producers, judges and people; they never **settle** anything.
Every knowledge claim is **traceable to a source** — a commit, a document, a decision, a person — and no knowledge content
satisfies a gate, overrides a specification or counts as a judge's verdict.

*Rationale:* an LLM-written knowledge base is useful exactly as long as it is treated as a well-cited colleague, not as a
law; stale or wrong knowledge must cost a re-check, never a wrong decision.
*Testable as:* every knowledge page cites its sources; no gate move, delegation or check takes a knowledge page as its
cause.

### XI. A factory is portable

A factory's state, record and decisions are independent of the host it runs on. **Moving a factory never changes a
decision**: a move between hosts, a sleeping host or a lost connection pauses work and resumes it; it never settles,
re-opens or alters a gate.

*Rationale:* factories run wherever people place them; if placement could change outcomes, every move would need a fresh
audit.
*Testable as:* a factory moved at any step resumes in the same state with the same record; no move or host change appears
as the cause of a gate settlement.

### XII. Workshops are sovereign

Each workshop decides its own gates. **No act from a team space or another workshop settles a gate** — not a claim, a
quorum, a teammate's review or a published rule; only the owning workshop's deciders, or a person it explicitly names, do.
A teammate's review is a **person's evidence**, never a model's verdict and never a decision on the owner's behalf.

*Rationale:* teams coordinate by making work visible, not by deciding for each other; a team space that could approve a
gate would be a control plane nobody signed up for.
*Testable as:* every gate settlement names a decider belonging to, or explicitly named by, the owning workshop; no team
space event appears as the cause of a settlement.

## The Flow & The Roadmap

The flow is KILN's spine. KILN ships one **default flow** — the **Roadmap gate** and nine feature gates in order: Concept,
Design, Specification, Work plan, Implementation, Code review, Verification, Documentation, Merge. The constitution fixes
its **invariants**; the gates' questions, artifacts, judges and moves are specified in the **gate-rail contract**
(`kiln/contracts/gate-rail.md`) and explained in `docs/concepts/the-flow.md`.

**Flow invariants.**
- **Fixed anchors.** The Roadmap gate is always first and the Merge gate always last.
- **Built-in gates are never removed.** A flow may only **add** gates, by a recorded decision of an Operator (or the team
  quorum for team-shared flows); every added gate keeps the full gate contract — durable, waiting, settled only by a
  committed move, recorded.
- **A closed set of move kinds.** Every move is one of a closed set of kinds with a known consequence (*approve*,
  *revise*, *reject*, *restart*, *split*, and the Roadmap gate's row edits); teams may label moves in their own words but
  not invent new kinds. Changing the set is a constitutional amendment.
- **One feature at a time per factory.** A feature walks its flow from the Roadmap gate to Merge; the Roadmap gate admits
  one feature only and re-opens after it; there is no unattended chaining between features.
- **A flow is chosen per feature** at the Roadmap gate, from the factory's default.

**Shortcuts are decisions, not defaults.** Both are bounded, recorded and visible in every later brief:
- **Triage skip** may route a small feature past **Concept and Design only**, with its reasoning recorded; a person may
  override it, and a flow may forbid it. No judged gate after Design is skippable.
- **Delegation (the unattended tail)** may be armed only by the person who approves a feature's **Specification gate**,
  and covers only the **approve side** of the gates after it — Merge only if explicitly included. **Any objection** — a
  judge's objection, a code reviewer's `restart`, a verifier's `reject`, a split proposed at Implementation, a blocked
  request, a reached budget — **ends the delegation** for that gate and every gate after it. Delegation never reaches the
  Roadmap gate and is never inferred from absence.
- **Bounded automatic fixing.** Verification may run a capped number of automatic fix rounds (default 2, settable 0–3 at
  the Roadmap gate) before the gate opens; the cap forces a persistent failure in front of a person.

**The Roadmap invariants.** The program is an ordered, **dependency-gated** list of feature **rows**, kept as a committed,
reviewed artifact (`ROADMAP.md`) and admitted only at the Roadmap gate (Principle VI). A row fires only when its
dependencies are done; each row is one full walk of its flow; the Roadmap gate sits **between** rows, never inside one.
The program gate and a feature's gates are never conflated in state or in the move vocabulary.

## Roles & Model Tiers

Roles are defined as **files** (`kiln.config/`, see `docs/concepts/configuration.md`) and bound to models by a tier map.
The constitution fixes the **tier rule**:
- **Judges** run on the **strongest model available to the factory, always** (Principle II).
- **Producers** run on the **cheapest model the gate on their far side can bound** — the far gate is the producer's
  backgate.
- **Triage** may be cheap *because* a person's gate bounds it immediately.
- **The planner** drafts; it never decides. Its drafts are checked and labelled before a person sees them.

Configuration may choose models; it can never configure these rules away. The cost of local work is **held compute and
wall-clock**; complexity must be justified.

## Dependencies

KILN may take **runtime dependencies** where they carry their weight — Pi, Pi Durable and their companions are approved.
Every dependency is **pinned**, its adoption is a **recorded decision**, and it is reached through **one seam** so that
the guarantees above outlive its API. A dependency never weakens a principle: where it cannot honour one, KILN works
around it or does not use it.

**This constitution is the kiln's recipe.** Per `kiln-analogy.md` §4.8 it binds *across firings and across a whole batch*:
a feature that violates it is "fired in the wrong atmosphere" — the defect is in the *surroundings*, so it must be caught
*before* delegation is allowed to run.

## Governance

- **This constitution supersedes all other KILN practices.** Where a concept doc and this constitution disagree, the
  constitution governs. The concept set (`docs/concepts/`) is read to *understand* the system; it never overrides a
  principle here.
- **Amendment requires** a written rationale, **human approval**, a **version bump** by the policy below, and — for any
  MAJOR (breaking) change — a migration note. Changes are drafted with a **Sync Impact Report** (an HTML comment at the top
  of this file) that is **scratch, removed before the amended constitution is committed**.
- **Versioning (semantic).**
  - **MAJOR** — a backward-incompatible governance/principle removal or redefinition.
  - **MINOR** — a new principle/section added, or materially expanded guidance.
  - **PATCH** — clarification, wording, typo, or non-semantic refinement.
- **Compliance.** Every gate and every pull request **MUST verify compliance** with this constitution; each non-obvious
  decision is justified; and **the record is the compliance evidence** (Principle VII).

## Amendment record

**2.0.0 (2026-10-21)** — the restart: KILN moves from a Pi extension with a terminal UI to a local web front door on Pi
and Pi Durable, with many factories per host, an event-based record, knowledge per factory and teams of sovereign
workshops (`docs/prd/kiln-prd.md` §15, `docs/concepts/web-front-door.md` §11). Redefines II, III, VII, VIII and IX; scopes
IV; rewords I, V and VI; adds X, XI and XII; reduces the flow and role sections to invariants; allows pinned runtime
dependencies.
*Migration:* the first program's code (rows r1–r8) was built under 1.0.0 and stays valid history; it is frozen in
`legacy/` and its keep-list is ported under 2.0.0 (roadmap r12). Its four line-of-defense roles, nine-gate names and
factory-log-as-record are legacy terms; principle numbers I–IX keep their meaning for traces (`P-I`…`P-IX`) in code,
specs and contracts. On a single-person, single-host, local-only workshop, III, IV and VIII read as 1.0.0 did; II, VII
and IX still change (Documentation is no longer judged; the event stream replaces the factory-log as the record; a
loopback front door replaces the three terminal layers).

**1.0.0 (2026-09-12)** — ratified with the first program.

**Version**: 2.0.0 | **Ratified**: 2026-09-12 | **Last Amended**: 2026-10-21
