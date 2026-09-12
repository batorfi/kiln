> Status: ground-up concept
> Type: concept — end-to-end process flow (one feature walking the lane top to bottom)
> Companion docs: `20260911-concept.md` (vision), `20260911-gates-why-how-what.md`
> (gates rationale + move table + headless contract), `20260911-ui-layers-deep.md` (the UI
> that shows the walk), and `roadmap.md` (Gate 0 — Roadmap: the deliverable's firing program)
>
# One feature, walking the lane end-to-end

## 1. What this doc is

This is the **narrative** of a single feature — the moment the human hands the director a raw
idea, through to the moment the human merges. Read **top to bottom**: each unit below is one
hold-yield the director schedules on the **single lane**, with a short sentence of what it does
in human language, the **gate** (if any) that ends it, and what it costs the lane.

The *rationale* for each gate lives in `20260911-gates-why-how-what.md`. The *UI* that shows the
walk lives in `20260911-ui-layers-deep.md`. The *role-level* detail of each unit lives in the
per-role docs (`20260911-{research,designer,director,reviewer,writer,triage}.md`). Nothing here
is a list of requirements — it is the *shape* of the walk a feature takes, and why that shape
costs what it does.

The one thing to hold: **every "did we get this right?" is a human gate**, and the **only thing
that runs unattended on the lane is the work between two gates** — each of which is bounded by the
gate on its far side. A feature may be small enough to skip the front gates; it can never skip the
safety-net gates.

> **Scope of this walk: one roadmap row.** Everything below is *one feature* — one row of a
> Roadmap fired from gate 1 through gate 9 (PR). **Gate 0 — Roadmap** is *not* a unit in this
> walk; it is the **pre-lane** gate that **admits the program** before Unit 0 starts and
> **re-opens at each row's PR seam** to admit the next row (see `roadmap.md` and
> `20260911-gates-why-how-what.md`, "Gate 0 — ROADMAP"). Each row is a full copy of Units 0–11;
> the diagram below marks Gate 0 above Unit 0 to show where it sits.

## 2. The sequence, unit by unit

The lane holds **one resident model at a time**. The director holds it, *yields* when a gate
opens, and may **swap** to a different model when the next unit needs it. The cost of the walk is
the number of **swaps** between consecutive units — not the number of gates. The sequence below is
ordered so the **affinity queue** keeps that swap count low.

Each unit is written top to bottom as it actually fires on the lane.

---

### Unit 0 — Triage

Triage is the cheapest thing on the lane and the first to load. The lane is empty when the human
hands the raw idea to the director, so triage reads **only the raw idea** (no concept exists yet),
not the whole design. It emits two numbers the rest of the lane acts on:

- **feature size** — *small / standard / large*, judged by story complexity and complexity
  indicators, **not** a word count.
- **skip decision** — *which front gates* (if any) may be omitted; the rule is narrow: the small
  tier may skip the **Concept** and **Architecture** gates only, never a safety-net gate.

These two outputs are *the* product. There is no skip-decision gate; instead the human sees both
in the HUD and may **override either**, which sends a re-triage. On the lane, triage resolves on a
**cheap model** and **seeds the affinity queue**.

### Unit 1 — Researcher

Before anyone writes a word of concept, the researcher gathers context. It reads the raw idea and
the project's prior art — and **only for what the project's history does not cover** does a
proportionate outside lookup. On a local setup that outside lookup may be unavailable, and that is
acceptable: a local-first feature does not need the web, so the researcher **flags the gap rather than
blocking the feature**.

The entire output is a single **`context.md`** with five sections — (1) the restated problem in the
researcher's own words, surfacing but not resolving ambiguity, (2) relevant prior art cited by
path/ID, (3) external research scoped to what the project does not cover, (4) known constraints
from the constitution, the ADRs, or the raw input, and (5) open questions — which is expected to be
*non-empty*. The researcher is a **non-judgmental** pass: it carries no recommended solution, no
architecture, no scope. It reports **ready** to the director and **feeds the Concept gate** — it
has no gate of its own. There is a researcher only when the input is a research brief; for a
straight build the lane skips it.

On the lane, the researcher is a short **standard-tier** hold: a **swap** from triage's cheap
model, *unless* the director kept a standard model resident across both units — in which case the
same warm model carries the cost down and the two units share it.

*(Deep: `20260911-research.md`.)*

### Unit 2 — Concept writer

The concept writer drafts the human-facing concept — **what** the feature is and **why** it matters
— reading `context.md` *in full* plus the raw idea. This is the first place a human signs up for
what the factory is about to do, so it is a **gate**, not a pass.

- **Gate: Concept.** The human **approves** (proceed), asks for a **revision** (scoped, one round),
  or **rejects** (the feature is not the right one, or the framing is wrong). There is no
  *Split* move at this gate; a "too big" reaction is a *Revise*, not a *Split*.

On the lane the concept writer sits immediately behind the researcher and the two are **affinity
neighbours**, both standard-tier, so this unit costs **no swap** — the cheapest possible place for
it to sit, and the cost-minimizing shape of the whole front of the lane.

### Unit 3 — Architecture designer

With the concept accepted, the designer turns it into a concrete proposal: the components, the data
flow between them, and each design decision with its rationale. This is **`proposal.md`** —
deliberately a *proposal*, not a decision. The designer never writes code or tests; it stops at the
prose of *how it will likely work*.

The designer runs on the **same standard model** as the concept writer — a no-swap neighbour — so
the proposal costs no change in lane after the concept was approved.

*(Deep: `20260911-designer.md` — note the proposal-vs-critic-vs-gate separation.)*

### Unit 4 — Architecture critic

The most important pass on the *shape* of the system comes next, and it runs on the **strongest
model** resident in the lane — a **line-of-defense** role, not a producer. The architecture critic
tears at `proposal.md` hard and writes **`critique.md`**, covering feasibility, alternatives,
complexity, and any place the design is over-engineered or under-considered. Its output is a
critique of the *design only* — not a list of code changes, a test plan, or a build sequence.

- **Gate: Architecture.** When the gate opens the human sees the **proposal and the critique
  together** — not the proposal alone. The three moves stand: **approve** (the design is sound),
  **revise** (the design has a problem, scoped fix), **reject** (the design is wrong, redesign).
  Reject here returns to the designer, not to the human with the original raw idea.

On the lane this is a **swap up** from the standard model — a cost the factory pays now, at the far
side of a gate, to make sure the shape is sound before the build begins. After the architect gate,
the lane's cost curve is set: the strongest passes cluster here and at the back, with the cheapest
work between them.

### Unit 5 — ADR maker

Whatever the Architecture gate just accepted is now a **settled decision**, and the ADR maker
formalizes it into a **numbered, immutable ADR**. There is no gate of its own — the decision is
already the gate's output; the ADR is the *record* of it, written in the same voice the ADRs are
written in (decision, context, consequences).

The lane may **swap down** to a cheap model here: the ADR maker is a "warm" cheap step that rides
the lane *before* the next strongest pass, so the cost of the swap-down is recovered when the lane
needs to upgrade again.

### Unit 6 — Spec writer

From concept, proposal, and the accepted ADR the spec writer writes the **spec** — the list of user
stories, their acceptance criteria, and the **ordered checkpoints** each story decomposes into.
This is where the feature's acceptance criteria become concrete and checkable, so the spec is a
**contract, not prose**.

- **Gate: Spec.** The human **approves** the decomposition, asks for a **revision** (the stories or
  the checkpoints), or **rejects** (the spec does not capture the concept). Reject here returns to
  the designer or the concept, not to the human with the raw idea.

### Unit 7 — Plan writer

The plan writer decomposes the spec into *work*: which worker handles which checkpoint, and in what
order — **one plan per feature**. This is the last planning gate; the loop that follows is pure
execution.

- **Gate: Plan.** The human **approves** the assignment, asks for a **revision** (a different
  assignment, or a re-sequence), or **rejects** (a story is not decomposable as planned, or the
  assignment is wrong). A *reject* here returns to the spec, not to the concept — the plan is the
  last place to "re-plan" before the loop starts.

### Units 8 — Worker, the checkpoint loop

This is the only unit that **repeats** — once per checkpoint on the plan.

For each checkpoint, a **worker** reads its checkpoint's slice of the plan plus the spec, and
writes the code for that one checkpoint. Each checkpoint is a **Checkpoint gate**, and this gate is
special — it carries **three moves instead of two**:

- **Approve** — the checkpoint is done; go to the next checkpoint on the plan.
- **Revise** — a scoped, in-place fix *within* the same checkpoint.
- **Split + Revise** — "this one story is actually two stories." The human splits this checkpoint
  into two and the loop **re-plans around both**; the new checkpoints get their own gates.

Notably there is **no *Reject* at a checkpoint** — a checkpoint is *not* "done wrong," it simply
may need to become two. The "Split + Revise" move is the only one a checkpoint gets that the other
gates do not, and it is the *one* move that grows the feature, not shrinks it.

The loop repeats this unit for every checkpoint on the plan, each with its own gate. Workers are
the **only unattended run on a single lane**, and each is bounded by the gate on its far side —
which is what makes a cheaper model on the worker acceptable: the *work* is bounded, the *decision*
is still a human's.

### Unit 9 — Code reviewer

After the last checkpoint, the **code reviewer** does the whole-feature review on the **strongest
model** — the **entire feature diff vs intent** (concept, spec, stories, ADRs), not the diff alone.
It is a **two-pass** review: the first pass catches the obvious, the second asks *"what did the
first pass miss?"* and writes **`review.md`**. It makes **no edits** — it only *proposes* them, and
any resulting change routes back through a checkpoint so the checkpoint gate stays the source of
truth.

- **Gate: Review.** The human **approves** (the feature is ready to verify), asks for a **revision**
  (the feature has a problem, scoped fix), or **rejects** (the feature is wrong). Reject here
  returns to the checkpoint that was wrong, not to the spec — the review is the "are we sure we got
  this right?" moment, last in the rail.

On the lane the reviewer is the strongest model — the **first of a back-to-back pair** that costs no
swap between them.

*(Deep: `20260911-reviewer.md` — two-pass discipline, the "don't propose changes to fix things that
are actually fine" rule, and the "review the whole feature, not just the diff" rule.)*

### Unit 10 — Verifier

The verifier then **exercises every user story end-to-end** against the *running* system, and
writes **`verify.md`**. It is a different role from the reviewer: the reviewer reads the diff for
*intent*, the verifier runs the system for *behaviour*.

- **Gate: Verification.** The human **approves** (the feature is done), asks for a **revision**
  (a story is not yet exercised, scoped), or **rejects** (a story can't be exercised at all).

The verifier runs on the **same strongest model** as the reviewer — so this is a **no-swap
neighbour**: the cost of the double-strong back-to-back is *one model serving two quality passes*,
not two swaps.

### Unit 11 — Techwriter

Once verified, the **techwriter** writes the feature's user-facing docs from the *verified* feature
and its docs-relevant specs. The output is the per-feature usage docs a human reader would find in
the project.

- **Gate: Docs.** The human **approves** the docs, asks for a **revision**, or **rejects** them. A
  **small-triage** feature may **skip this gate** — it's a cheap-tail step, *not* a safety-net, so
  it is the one non-safety gate a small feature is allowed to drop. The safety-net gates (Concept,
  Architecture, Spec, Checkpoint, Review, Verification, PR) it can never skip.

*(Deep: `20260911-writer.md` — the writer *family*: concept-writer, techwriter, pr-writer.)*

### Unit 12 — PR writer

The last unit on the lane is the **PR writer**, which reads the docs the techwriter just wrote, the
verified code, the concept, and the ADRs, and writes the **PR description** — the human-facing
summary of what changed and why.

- **Gate: PR.** The three moves are as usual, but the terminal move is **Approve** — and that is
  the moment the human **merges the PR**, and the feature leaves the lane.

The PR writer is the **cheap tail** of the lane, riding the last resident model off the end.

---

## 3. Everything is in the factory-log

The lane is not just *watched* — it is *recorded*. Everything the factory does on these twelve
units lands in the **factory-log**, which is the system of record. The log is what a closed
terminal leaves behind, what a human audits after the fact, and what the headless contract is
backed by.

- **Every state transition** — each unit's load, each hold, each yield, each swap and swap-down —
  is a **lane event** in the log, with a timestamp.
- **Every gate completion** writes a short **report next to the feature's own spec artifacts** —
  the decision (approve / revise / reject / split+revise), the artifact reviewed (`concept.md`,
  `proposal.md`, `spec.md`, …), the model on each side, the **swap-and-wall-clock cost** for that
  unit, and a one-line note — and an **event** to the log. The report is the durable, greppable
  record the human can open later without the TUI; the log event is the audit trail the factory
  itself reads.
- **Every human decision** — approve, revise, reject, **split + revise**, override on triage — is a
  **decision event** with its timestamp, so a feature's whole journey is reconstructable from the
  log alone.
- **Every cost number** — the rail, the resident model, the **switch count**, the wall clock since
  `t=0` — is logged at each step, so the **per-feature cost** (swaps + wall-clock) is greppable
  after the fact, not just visible live on the HUD.
- **Every skip decision** — including any **override** the human made at triage — is logged as a
  decision event, so the lane's chosen shape is auditable.

The live **Flow HUD** (the `rail / lane / switches / clock` strip) is just a *view* over this log.
A closed terminal leaves a complete, durable trail — every gate that ever opened, every cost that
ever was paid, every decision that was made. That is also the **headless contract**: when there is
no TUI, the same gate-card content becomes a durable **WAIT row** in the log, resumable by a
**token**. The one hard rule that keeps an unattended run honest: **a missing UI may *hide* a gate,
it may *never silently approve* one.** The log is what enforces it.

*(Deep: `20260911-gates-why-how-what.md` for the headless contract; `20260911-ui-layers-deep.md`
for the two TUI faces.)*

## 4. Two things to hold, after this doc

1. **Every "did we get this right?" is a human gate.** The only thing that runs unattended on the
   lane is the *work* between gates — and each is bounded by the gate on its far side. That is what
   makes a cheaper head on a local setup *acceptable*: the work is bounded, the decision is human,
   and **everything is recorded in the factory-log**.
2. **The lane is the cost.** The director's job — and the affinity queue's whole job — is to keep
   the **swap count** low. The walk is nine gates long; the *cost of the walk* is the swap
   count, **not the gate count**. The nine gates are not the expensive part — the *swaps between
   them* are.

---

This is the whole feature, start to finish. `20260911-gates-why-how-what.md` is the *rationale*
for each gate; `20260911-ui-layers-deep.md` is the *UI* that shows the walk; and the per-role docs
(`20260911-{research,designer,director,reviewer,writer,triage}.md`) hold the *role-level* detail of
each unit on the lane.
