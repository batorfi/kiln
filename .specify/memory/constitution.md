# KILN Constitution
<!-- The factory's binding law. Per kiln-analogy.md §4.8, the constitution is the kiln's
     "atmosphere and glaze recipe": the law every firing must satisfy. It binds across
     firings and across a whole batch, not just within one. -->

## Core Principles

### I. Author / Judge Separation — no model may approve its own work

No role — including the director — ever decides the gate its own artifact feeds. A producer
*produces* (researcher, concept-writer, designer, worker, techwriter, pr-writer, adr-maker); a
line-of-defense role *judges* (architecture-critic, verifier/diagnosis, code-reviewer,
docs-synthesizer); the *deciding* move is always a **human's**. A "gate" is a human decision the
lane blocks on until a verdict arrives as an event. Judgment is distributed across many judges, but
the decision is singular, at one human, at one kiln.

*Rationale:* this is the precondition for a trustworthy gate; a role that blesses its own artifact
has removed its own check, and the safety net collapses.
*Testable as:* a lane must not advance past any gate without a human move; no gate report is ever
authored and adjudicated by the same execution unit.

### II. The lines of defense are always the strongest

The four line-of-defense roles — **Architecture Critic, Verifier / Diagnosis, Code Reviewer, and
Docs Synthesizer** — MUST run on the **strongest resident model, on every substrate, including a
local one** where every *other* role is free to be cheap. A cheap judge at any of these positions
is a rejected configuration.

*Rationale:* these roles are the gates' backgates; a single lane has no parallel pass to catch what a
weak judge misses, so a weak backgate defeats the whole net.
*Testable as:* the model on each line-of-defense unit is the strongest available; never a cheaper tier.

### III. A single lane; one resident model at a time

The factory is **strictly sequential**: exactly one lane, one resident model at a time, with no
parallelism by design. The **director *is* the scheduler** — there is no separate scheduling
abstraction to collapse. It holds the lane, *yields* it to a worker, and reclaims it when the
worker returns.

*Rationale:* predictability and low *hold* cost are the point of a local kiln — one chamber, not a
foundry; the single chamber is the thesis, not a constraint to fight.
*Testable as:* at most one model is resident and one work unit is running at any instant.

### IV. Model affinity is the only cost lever; swap only when a tier demands it

Work units are queued in a **model-affinity queue** so the lane changes model **as rarely as
possible**; a model swap happens **only** when the next unit's required tier differs from the
resident one. The cost model is `wall-clock = (work) + (switching)`, with the *switching* term
local-dominant; keeping the lane resident is the single highest-leverage cost control.

*Rationale:* loading a new model locally is the expensive move (re-heating the kiln from cold);
firing like units together keeps the chamber hot and the switch-tax low.
*Testable as:* the observed switch count is the minimum the plan's tier sequence requires; no swap
occurs on an affinity-compatible boundary.

### V. Headless never silently approves

A missing UI may **hide** a gate or a roadmap row, but it may **never silently approve** one. In
headless (`!ctx.hasUI`) every gate — **including Gate 0** — degrades to a **durable `WAIT` row**
in the factory-log (a resume token + a deadline), under the default `gate-block` policy; a gate
advances only on an explicit human move or a *recorded exception*. Gate 0 specifically *prints* the
roadmap table and *waits*, rather than auto-first-row.

*Rationale:* this is the one rule that keeps an unattended run honest; the factory-log enforces it,
and it is the exact opposite of a missing-UI silent approval.
*Testable as:* with no UI present, no gate report is marked approved without a human move or a
logged, distinct pre-delegation entry.

### VI. Gate 0 is human-only, always

The **Roadmap (Gate 0)** is the **one gate no exception may silence** — not the unattended tail, not
a cheap head, and *especially* not a missing UI, where it prints-and-WAITS rather than auto-
advancing. Gate 0 is the most expensive decision of all (the whole program: its rows, order, and
dependencies), and it is the one the constitution refuses to auto-authorize.

*Rationale:* a wrong *program* costs the entire feature-set downstream of it and is not cheap to
un-fire; getting it right first is what the whole "firing program" is for.
*Testable as:* Gate 0 opens at kickoff and at every inter-row seam, and no path reaches a row's gate
1 without a human Gate 0 approve recorded in the log.

### VII. Everything is recorded in the factory-log

Every state transition (load / hold / yield / swap), gate completion, human decision, skip/override,
and cost number (rail, resident model, switch count, wall-clock) **MUST** land in the **factory-log**,
time-stamped, durable, and greppable, so a feature's whole journey is reconstructable from the log
alone. An auto-crossed gate still emits its report, **tagged *auto-approved under pre-delegation
(spec #N approved T)*** with the reviewing model and a "no objections" note — a **distinct ledger
entry** from a gate the human decided at the keyboard.

*Rationale:* the log is the audit trail and the backing for the headless contract; a closed terminal
must leave a complete trail, and a human pre-delegating an approve must stay *distinguishable* from a
gate that genuinely ran with no human present.
*Testable as:* the log, read alone, reconstructs every gate's outcome, decider, and cost for a feature.

### VIII. Local-first: no cloud round-trip

The factory MUST run on **local models** (Ollama-served) with **no cloud API dependency**. On a
local substrate a role that needs an outside resource (e.g. web research) **flags it as *unavailable
rather than blocking the feature*** — a local-first feature does not need the web.

*Rationale:* each local model is a scarce, slow-to-swap resource held on one machine; the factory's
shape (single lane, held heat, affinity) follows that constraint instead of fighting it.
*Testable as:* the run completes with no outbound network dependency; missing web access flags, not
fails, a feature.

### IX. No dashboard: three UI layers, event-driven, no polling, no server

The "dashboard" idea becomes **Layer A (Flow HUD**, a persistent footer), **Layer B (Flow Popup**, the
on-demand gate card), and **Layer C (the Roadmap overlay**, the deliverable-level zoom-out) — three
surfaces that read **one shared `FactoryState`** and redraw **on factory events, never by polling, and
never from a server**. One overlay primitive renders the closed / open-gate / Gate-0 faces, so a
*missing* overlay can never *inadvertently* auto-advance.

*Rationale:* the human watches the kiln *where the work happens*; determinism plus "never poll / never
run a server" keeps the status a distilled read, not a second source of truth. A missing Layer C
degrades to a *printed* roadmap table, never a silent advance.
*Testable as:* no surface blocks on a timer or a socket; every redraw is triggered by a fired event.

## The Gate Rail & The Roadmap

The gate rail is KILN's spine. Per feature, in order:

```
Gate 0  ROADMAP (pre-lane, human-only)
1  CONCEPT   2  ARCHITECTURE   3  SPEC   4  PLAN   5  CHECKPOINT
6  REVIEW     7  VERIFICATION   8  DOCS   9  PR
```

**Move vocabulary.** Most gates are `Approve / Revise / Reject`. Two line-of-defense gates and two
control gates specialise:
- **Checkpoint (5)** adds **`Split + Revise`** and has **no `Reject`** — a checkpoint is not "done
  wrongly," it may simply become *two*; it is the one move that *grows* a feature.
- **Review (6)** is **`Approve / Restart`** — the code-reviewer *judges* the diff, it does not
  author it, so there is **no `Revise`**; the corrective move *reopens* implementation from the
  checkpoint and routes back through it.
- **Verification (7)** is **`Approve / Reject`** with **bounded auto-mitigation (≤ 2 rounds)** then
  escalates to a human `WAIT`; rejection does not bounce to an editor — the factory may fix its own
  defect cheaper, but the cap forces a persistent failure to a human.
- **Checkpoint (5)** and **PR (9)** omit `Revise` — a restorable *base commit* and a *merge* are
  yes/no, not an edit.

**Two front-gate trims, deliberately composed.** *Triage-skip* and *the unattended tail* are the two
deliberate, recorded lane-shaping levers — never defaults the system reaches for on its own:
- **Triage** (cheap head, before the lane) may route a *small* feature past **gates 1 + 2**
  (Concept, Architecture) *only*. No safety-net gate is skippable; the skip is a human-overridable
  *classification*, and an over-classification (call it `small-triage` when it is not) is the costlier
  mistake, because it skips the very gates that would have caught the complexity.
- **The unattended tail** lets a human who *just approved the Spec (gate 3)* pre-authorize the
  *approve side* of gates **4–9** and let the lane drive itself to a PR. It pre-schedules only the
  *green* outcome: **any line-of-defense veto — an architecture-critic objection, a code-reviewer
  `restart`, a verifier `reject`, or a checkpoint that overflows/splits — halts the cruise and returns
  the lane to the human.** It also **never authorizes Gate 0**: *firing the next roadmap row is always
  a fresh human decision.* "If everything checks out, don't bother me" is **not** "ship it even if a
  judge says no."

**Gate 5 is a control gate, not a content gate:** it creates a **restorable git base** *before* risky
work begins — the rollback handle for gates 6/7. Bouncing is *cheap early, costly late*; the
checkpoint is that "restorable before-the-high-fire" state.

**The Roadmap (Gate 0) invariants.** A deliverable is broken into an ordered, **dependency-gated**
list of feature **rows**, each row **one full Gates 1–9 lane**, fired **one row at a time**:
- **Gate 0 is human-only, always** (Principle VI).
- **One row, one line.** Exactly one row is the hot kiln at a time; rows are sequential,
  **deps-gated**, and never parallel.
- **Dep order is enforced.** A row fires *only* when its `deps` are `done`.
- **A row is a whole firing.** Each row runs the full Gates 1–9 (with its own optional in-row
  unattended tail); Gate 0 sits *between* rows, never *inside* one.
- **The inter-row chain is gated by a human.** Each `roadmap_row_done` re-opens Gate 0; cross-row
  chaining is **opt-in, logged, and veto-liftable**; the safe default **stops at one feature's PR**
  and hands the program back to Gate 0.
- **`gate0` ≠ `gate`.** `gate` is one row's live Gates 1–9 gate; `gate0` is the program gate between
  rows; the two are never conflated in state or in the move vocabulary.
- **One RoadmapRow ↔ one HUD row ↔ one Gates 1–9 lane ↔ one closure PR**, and the roadmap is **a
  committed, reviewed artifact** (`ROADMAP.md`), not ephemeral UI.

## Roles, Model Tiers & the Local Substrate

**Two-track routing (the director's job).** The directive that decides which head a unit runs on is
two-track and is the reason a cheaper head is acceptable upstream of a gate:
- **Work roles** run on the **cheapest model the gate on their far side can bound** — the far gate is
  the producer's backgate.
- **The four line-of-defense roles** run on the **strongest resident model, always** — they *are* the
  backgates (Principle II).
- **Triage** is cheap *because* it is bounded *immediately* by a human gate.

| Tier | Role | Model |
|---|---|---|
| **Line of defense** | Architecture Critic | **strongest, always** |
| **Line of defense** | Verifier / Diagnosis | **strongest, always** |
| **Line of defense** | Code Reviewer | **strongest, always** |
| **Line of defense** | Docs Synthesizer | **strongest, always** |
| Work | Researcher | cheap → standard (feeds Concept; local-first) |
| Work | Concept Writer | standard (its backgate is Architecture) |
| Work | Architecture Designer | standard (bounded by critic + Gate 2) |
| Work | ADR Maker | cheap (a warm step between strong passes) |
| Work | Worker | per-task tier (bounded by its checkpoint gate) |
| Work | Techwriter / PR Writer | cheap (bounded by the Docs / PR backgate) |
| Triage | Feature-size triage | cheap (bounded immediately by a human gate) |

**Artifacts a lane produces** (the chain a feature leaves behind):
`context.md → concept.md → proposal.md → critique.md → ADR → spec.md → plan.md → [checkpoints] →
review → verification → docs → pr`, plus the deliverable-level `ROADMAP.md`. The **researcher**
(*context.md*) runs only for a *standard* feature and may flag unavailable web research rather than
block (Principle VIII); the **docs-synthesizer** is a *cross-feature* pass the **human invokes directly**,
**outside** any feature's nine gates.

**Local substrate & cost.** The cost unit is **held compute / wall-clock**, not cloud tokens. There is
**no dashboard, no pane-per-worker parallelism, no separate 14th scheduling abstraction** — the lane
is one module with a cost/switch account; the director *is* that scheduler. Complexity must be
justified; a cheaper head is *permitted* upstream of a gate, never at one of the four defense
positions.

**This constitution is the kiln's recipe.** Per `kiln-analogy.md` §4.8 it binds *across firings and
across a whole batch*: a feature that violates it is "fired in the wrong atmosphere" — the defect is
in the *surroundings*, so it must be caught *before* the unattended tail is allowed to run.

## Governance

- **This constitution supersedes all other KILN practices.** Where a runtime concept doc and this
  constitution disagree, the constitution governs. The concept set (`docs/concepts/` — *the guidance
  file for runtime development*) is read to *understand* the system; it never overrides a principle
  here.
- **Amendment requires** a written rationale, **human approval**, a **version bump** by the policy
  below, and — for any MAJOR (breaking) change — a migration note. Changes are drafted with a **Sync
  Impact Report** (an HTML comment at the top of this file) that is **scratch, removed before the
  amended constitution is committed**.
- **Versioning (semantic).**
  - **MAJOR** — a backward-incompatible governance/principle removal or redefinition.
  - **MINOR** — a new principle/section added, or materially expanded guidance.
  - **PATCH** — clarification, wording, typo, or non-semantic refinement.
- **Compliance.** Every gate and every PR **MUST verify compliance** with this constitution; each
  non-obvious decision is justified; and the **factory-log is the compliance evidence** (Principle
  VII) — the record a closed terminal leaves behind is itself the audit.

**Version**: 1.0.0 | **Ratified**: 2026-09-12 | **Last Amended**: 2026-09-12
