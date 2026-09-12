> Status: ground-up concept
> Type: skill — Docs synthesizer (a *line-of-defense*, cross-feature pass the human invokes off-lane)
> Companion docs: `../concept.md` (vision), `../gates-why-how-what.md` (Gate 8 — DOCS),
> `../process-flow.md` (the unattended tail this pass follows)
>
> Grounding: the "skill" framing and the eight output types follow
> `pipeline-template`'s `docs-synthesizer/SKILL.md`; the KILN-specific deltas — that this is the
> *one* role the lane does **not** run as a step (a cross-feature pass, off-lane, human-invoked
> *after* the unattended tail), that it is a **line-of-defense** role on the **strongest** resident
> model *even on a local setup* (its far side has no gate, so the *human who reviews it* **is** the
> backgate), and that its "gate" is a human review **outside** the nine per-feature gates — are
> ground-up KILN ideas. The eight output types and their file locations are faithful to the cited
> SKILL.md.

# KILN — Docs synthesizer: one strong pass over the *whole* history, off the lane

## 0. KILN vs pipeline framing

In `pipeline-template` the docs-synthesizer is a role a human invokes **directly, at any time,
outside any feature's pipeline** — it writes *broad, synthesized* documentation from the project's
**full history** (every feature's specs, plans, ADRs, `factory-log` entries, the current code), *not*
an incremental per-feature doc update (that is the **techwriter's** job, run by the director *after
verification*). KILN keeps the role and its eight output types intact; the deltas are **three things
about where it sits on the lane and why**:

- **It is off-lane.** Every role the *lane* runs as a step ends at a gate (there is a gate on its far
  side). The docs-synthesizer has **no gate of its own** and is **not one of the nine numbered
  per-feature gates** — the lane does *not* schedule it. It is a separate, cross-feature pass the
  *human* asks for.
- **It is a line-of-defense role.** Because its far side has **no gate**, a cheaper producer would
  have nothing between it and "done." By the KILN rule the four lines of defense — architecture
  critic, verifier/diagnosis, code-reviewer, and **this one** — **run on the strongest resident model
  always, even on a local setup** (`03-meta.md` §5, `../gates-why-how-what.md`). Its backgate is not
  a model on the next lane step; it is **the human** who reviews the draft.
- **It runs *after* the unattended tail**, when a **batch of features is in** — there has to be a
  body of completed, reviewed, merged history to synthesize *across*. It synthesizes the project
  *as-built*, not one feature's diff.

Everything else — the discipline, the eight types, the "state gaps, never fabricate" rule, the
incremental-not-regenerated rule for the index and the FAQ — is faithful to `pipeline-template`.

## 1. Purpose

When a batch of features has been shipped, the feature-level artifacts (a per-feature `concept.md`,
`spec.md`, `proposal.md`, `ADR`s, a per-diff doc, a PR description) exist *per feature*, in *their
own* voices. No single document answers "what **is** this project, how do I **use** it, **why**
does it work this way, **where do I start**" across the *whole* history. The docs-synthesizer
produces **one of the eight** such cross-feature documents, read and grounded in the real history.

- **Input:** the request names **one** output type and, roughly, what it should cover.
- **Output:** exactly one document of the chosen type, written from the full history in §2, at the
  location that type prescribes, presented to the human for review.

This is the role that keeps the *shipped system* and its *description* from drifting apart — not one
feature's docs (that's Gate 8's per-diff techwriter step), but the **whole project's** coherent
surface, as it exists *now*.

## 2. Inputs

- **The request**, naming the **one** output type (§3) and, roughly, its scope. The human tells you
  which; you do not guess a type from a vague request — if it is ambiguous, *ask*.
- **The project's full history** — read *before* you write: the relevant `specs/*/` and every
  feature's **ADRs**, the **`factory-log`** (a `.specify/factory-log.md`, or the sharded
  `.specify/factory-log/*.md`), and the **current codebase state** relevant to what is asked for.
- **The docs workspace** — the same one the **techwriter** uses (created lazily if it does not
  exist yet); this pass *extends* the project's docs, it does not invent a new place for them.

The grounding pass is non-negotiable: **read the history before you write.** A claim must trace to
something real — an ADR, a spec, a `factory-log` entry, the actual current code. And you must not
write from what a feature's spec *originally* said *if the implementation diverged in some verified,
accepted way* — the docs are the *as-built* system, not the original plan.

## 3. The eight output types

Pick **exactly one per invocation**. Each has a fixed location and a fixed scope; the type the human
names picks the kind. The first four are *regenerated* per request (one document, freshly written);
the last two are **incremental**; the middle two are written whole.

### 1. Technical overview
Orient a technical reader who has never seen the project, enough to contribute without re-deriving
decisions. Cover what the system does and for whom, the major components and how they relate, the
key design decisions *and why* (synthesized from ADRs and **linked**, not restated verbatim), the
known limitations / deferred scope (**sourced from actual recorded non-goals**), and where to go
next. **Dense but not exhaustive — a map, not the territory.** Do *not* narrate the pipeline's own
process (gate decisions, critique rounds): the reader wants the *system*, not how it was built.

### 2. How-to guide
Get a reader from *"I want to do X"* to *"I did X,"* reliably, with no other context needed. State
the goal up front; list **real** prerequisites; give **numbered** steps, each independently
verifiable; state how to confirm success. A troubleshooting section **only for failure modes actually
known to happen** (from `factory-log`, real bugs, obvious edge cases) — never speculative padding.
Second person, imperative mood, as short as the task allows. Commands and behavior **verified against
the current codebase**, not assumed from a spec the implementation may have diverged from.

### 3. Whitepaper
The project's *why* — motivation, design philosophy, the problem it exists to solve and the
reasoning behind the approach — for a reader deciding whether this project or approach is relevant.
Cover the problem and why it is real (**grounded in the actual concept docs' stated framing**), the
approach and its reasoning (**drawing on ADRs and the logged architecture-critique rounds** — a
genuinely rich source of real trade-off reasoning), explicit non-goals, and honest limitations. This
is the one genre with real latitude for narrative voice and persuasiveness — **but every claimed
rationale still traces to a real ADR, concept doc, or logged critique; never invent one to sound
more compelling.**

### 4. Atomic concept note
One idea, small, densely linked to related ideas — a **node in a graph**, not a document read start
to finish. One dense paragraph stating the idea in *synthesized language* (not copied from an ADR);
if it needs two paragraphs, it is probably two notes. Include a **Source** line (which ADR / spec /
code this understanding comes from) and a **See also** list of links to other concept notes, *each
annotated with why it is linked*, not a bare list. Optional tags, secondary to links.
Explicit boundary: *not* a substitute for the technical overview (it does not orient to the whole
system), *not* a how-to (no steps), *not* the whitepaper's voice (flat and precise, not persuasive).
**File naming:** `docs/concepts/<id>-<slug>.md`, where `<id>` is a creation-time timestamp
`YYYYMMDDHHMMSS` — links stay stable even if a title later changes. (These *are* the
`docs/concepts/*-*.md` deep dives the rest of this folder holds.)
**Two creation modes:** *single-note* (the human names one concept; write exactly that one) and
*survey* (scan a feature's, or the whole project's, ADRs/specs for candidate concepts; **propose a
list with a one-line reason each and write none until the human picks which** — bulk-generating
atomic notes tends to produce shallow ones, so resist writing more than what is asked).

### 5. ADR index / map of content
One navigable page indexing **every ADR across every feature** — a reader sees what decisions exist
and jumps to any one, without reading every ADR or following concept-note links one at a time. Group
**primarily by feature** (ADRs are already scoped under `specs/<feature>/adrs/`); add a *cross-
cutting thematic* grouping **only if real themes emerge** across many ADRs, never a forced taxonomy.
Each entry: ADR number/title, a **one-line summary of *the decision*** (not the reasoning — that is
the ADR's and the concept notes' job), status (accepted / superseded), links to the ADR and any
concept notes that reference it.
**Incremental, not regenerated:** updating it means *adding* entries for ADRs since the last pass;
existing summaries stay untouched unless specifically asked to be revised — avoid needless diff churn.
**Location:** `docs/concepts/_index.md`.

### 6. FAQ
Recurring points of confusion, **sourced from real `spec_gate` clarify-stage Q&A** (`speckit-
clarify`'s resolved ambiguities) across every feature — **never invented "anticipated" questions.**
Rephrase each question in natural reader-facing language (not the internal clarify-stage wording);
give a concise answer, linking back to the source spec's Clarifications section. Group by topic once
there are enough entries to warrant it.
**Incremental, not regenerated:** append new entries as new features' clarify stages produce them;
**never wholesale-rewrite** the file — a maintainer's own hand-added entries, if any, must survive.
**Location:** `docs/faq.md`.

### 7. Glossary
Project-specific term definitions, **as this project actually uses them** — not generic textbook
definitions. Alphabetical; term → one-to-two-sentence definition sourced from real usage in specs /
ADRs / code / constitution. Link to a concept note where one exists for deeper treatment. If a
definition needs more than two sentences, it has outgrown the glossary — **write a concept note
instead and link to it from here.**
**Location:** `docs/glossary.md`.

### 8. Onboarding runbook
Get a new contributor from zero to their first real contribution — broader and more sequenced than a
how-to guide, which targets one task. **Checklist-first:** real prerequisites (**verified against the
project's actual current setup docs, not assumed**), a **sequenced** setup checklist each item
independently checkable, **orientation pointers** to the technical overview / ADR index / glossary
*rather than re-explaining them inline*, a suggested small first task (mirroring this pipeline's own
"deliberately trivial synthetic feature" dry-run discipline), and who to ask when stuck — **only if
that contact information genuinely exists** in the project; **never invent placeholder contacts.**
Composed *of* links to how-to guides for individual task detail, **not a duplicate of their content.**
**Location:** `docs/onboarding.md`.

## 4. What must NOT happen

- **Do not be a per-diff feature task.** If you have been asked to update documentation because *one
  specific diff just shipped*, that is the **techwriter's** job (the director runs that **after
  verification**, as part of that feature's Gate 8). **Say so and stop** — the per-feature docs step
  and this cross-feature synthesis are *distinct* roles.
- **Do not fabricate, and state gaps explicitly.** Every factual or technical claim traces to
  something real — an ADR, a spec, a `factory-log` entry, the actual current code. If the history
  does not cover something a document needs, **say so in the document itself** — a *labeled gap* is
  honest; a filled-in guess is not.
- **Do not break the project's existing doc conventions.** Check what is already in `docs/` before
  adding anything; follow its *location, tone, structure* rather than imposing new ones.
- **Do not write before grounding yourself.** Read the relevant `specs/*/`, the features' **ADRs**,
  the **`factory-log`**, and the **current codebase** state first — not from assumption, and not from
  what a spec *originally* said where a verified, accepted divergence has since changed the as-built
  system.
- **Do not pick the type by guessing.** One human invocation = one output type; if the request is
  ambiguous, *ask*.
- **Do not editorialize** — the docs are *how-to / what-is / why*, not opinion. (The whitepaper is
  the one voice that may persuade; its *content* still traces, per §3.)
- **Do not be the gate.** This pass is human-*reviewed* (§5), but it is **outside the nine-gate
  sequence**; it does not advance a lane, and it is not a per-feature gate the director can auto-
  drive. A draft that "I made this doc perfect" without the human's review has moved the gate to the
  writer.

## 5. Model tiering (KILN)

This is the **line-of-defense tiering** in its most literal form. The four lines of defense are the
gates' **backgates** — they are *the check* something is right, not the work being checked — so they
run on the **strongest resident model, even on a local setup** (`../gates-why-how-what.md`,
`03-meta.md` §1). The architecture-critic's far side is the Architecture gate; the code-reviewer's
and verifier's far sides are the Review / Verification gates. The **docs-synthesizer's far side is
`nothing` on the lane** — it is off-lane, so there is *no downstream gate* to bound a weak synthesis
against. Its backgate is **the human who reviews the draft.** That is exactly why it, too, runs on the
**strongest**: a weak cross-feature synthesis (a gap filled in by a guess, a decision mis-summarized,
an overview that contradicts a live ADR) is the *most* expensive thing to get wrong, because it
**replaces the real artifacts for a reader who was not at the feature's own gates** and trusts the
doc as the project's authority.

Cost-wise the pass is a one-off the *human* elects — it never sits in the affinity queue, never pays
a lane swap, and never competes for the resident lane model. It is simply a strong, grounded pass
**after** the batch, on the strongest head, reviewed by the human.

## 6. When it runs — and the Gate 8 relation

The natural moment is **after the unattended tail**: a batch of features has been shipped (each
through its own Gates 1–9, each to its PR, the human's per-row re-admission at Gate 0 between rows),
and there is now a body of *completed, reviewed, merged* history to synthesize **across**. It is the
"look at what we just built, as a whole" pass the lane is **not** equipped to do — the lane holds one
feature at a time, one gate at a time.

**Relation to Gate 8 — DOCS.** Gate 8 (in `../gates-why-how-what.md`, and the per-feature doc step
in `./writer.md`) is the *per-diff* techwriter step — a *cheap* production bounded by the Docs gate
on its far side, run *once per feature*. This role is the *cross-feature, off-lane synthesis* that
sits **outside** that gate, invoked by the human **after** the tail, at the *strongest*. Same docs
workspace, **different kind of pass**: Gate 8 keeps *one feature's* how-to current and gated; the
docs-synthesizer keeps the *whole project's* coherent, grounded, navigable surface. Confusing the two
is the named failure of §4 — treat a request to "update the docs for this diff" as techwriter, not this.

## 7. Grounding

`pipeline-template/skills/docs-synthesizer/SKILL.md` — *"Write broad, synthesized documentation —
technical overviews, how-to guides, whitepapers, atomic concept notes, an ADR index, a FAQ, a
glossary, or an onboarding runbook — drawn from the project's full history (every feature's specs,
plans, ADRs, and factory-log entries), not one feature's diff. Use when the human asks for one of
these directly, any time, not as part of a feature's pipeline. Do not use for incremental per-feature
doc updates tied to one diff — that's the techwriter role's job."* Inputs: the eight output types,
each with its fixed scope and location, plus the `specs/*/`, ADRs, `factory-log`, and current code,
read *before* writing. Discipline: every claim traces to something real; state gaps; follow the
project's doc conventions; one type per invocation; ADR-index and FAQ **incremental**, not
regenerated. Output: the chosen document, presented for human review — which the cited source
explicitly places *outside* the pipeline's nine gates.

KILN deltas are ground-up: (§0) **off-lane, cross-feature, human-invoked after the unattended tail**
(the one role the lane does not schedule); (§5) **line-of-defense → strongest resident even on a
local setup, because its far side has no gate and the *human* is its backgate**; (§6) the **Gate 8
relation** (per-diff techwriter vs cross-feature synthesis) and its **timing** after the tail. The
eight types, their locations, and the discipline are faithful to the cited SKILL.md.

*The docs-synthesizer is the kiln's off-line, after-batch pass: one strong, grounded synthesis of the
whole body of work a human asks for *after* the firing is done — the strongest head, off-lane, with
the human who reviews it standing in for the gate that the lane does not run.*
