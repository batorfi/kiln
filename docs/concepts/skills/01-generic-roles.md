> Grounded per-skill cross-references (all 10 skills).
> Source-of-truth skills: `../../../../pipeline-template/skills/<name>/SKILL.md` (real path);
> KILN deltas are marked "ground-up" and are not in `pipeline-template`.
> Each KILN deep-dive lives at `../<name-or-role>.md` (the parent docs/concepts/ directory).
>
> Canonical home: the parent `docs/concepts/20260911-kiln-<role>.md` files persist reliably;
> treat this file's role summaries as cross-references, not the source of truth.

# KILN — generic role skill docs (per-skill, with KILN deltas)

Each entry: **purpose · inputs · output · what-must-NOT-happen · gate · tier · grounding**.
The first five sections are faithful to the cited SKILL.md; the sixth (KILN delta) is ground-up.

> Reading these as a list is the right way to read a *factory*: each role has exactly one kind of
> mind, exactly one gate (or feeds one), and exactly one tiering choice. The KILN delta for each
> is the *one thing* that changes under the single-lane, local-model, gate-rail model.

---

## 1) researcher (`researcher/SKILL.md`) — KILN: `../20260911-kiln-research.md`

The very first thing to run on a feature. An ephemeral pane spawned *before the concept writer*,
job: produce `context.md` — a structured implementation-context brief, **5 sections** (restate the
problem in its own words; cite relevant prior art from the project; do proportionate external
research only for what the project's history doesn't cover; list known constraints; list open
questions). **Does NOT** write the concept, propose an architecture, or evaluate anything — it just
*warms up* the downstream roles.
- **Inputs:** the raw human input + the project's own prior artifacts (concepts, ADRs, specs,
  references); web search *only when project history doesn't cover it*.
- **Output:** `context.md`, structured + concise enough to read *in full*, reported ready to the
  director.
- **Must NOT:** propose a solution / architecture / scope · hide "found nothing" · pad the brief
  · present to the human (the director owns that, at the Concept gate).
- **Gate:** none — *feeds* Concept. **Runs** only for **standard-triage**; small-triage skips it.
- **KILN delta (§5 in the doc):** a *short, local-first* pass — the project-history part is
  trivially local; the external-research part depends on connectivity, so a local lane leans on
  history and *flags* web research unavailable rather than blocking.

## 2) feature-size triage (`triage` — a KILN gate, no `pipeline-template` SKILL.md) — KILN: `../20260911-kiln-triage.md`

A **gate**, not a worker. First read of the raw input; emits **two** decisions: **size**
(`small-triage` vs `standard`, by counting user-story complexity + scanning complexity indicators)
and **skip** (`small-triage` features skip the Concept + Architecture gates). 
- **Must NOT:** be a worker · skip a *non-front* gate · default when the input is genuinely
  ambiguous (classify, don't guess).
- **Gate:** *is itself* a gate; the human may override at any point.
- **KILN delta:** it *is* the lane's cost optimization — a small feature's *short lane* is cheaper
  to run than the full nine.

## 3) architect / architecture designer (`architecture-designer/SKILL.md`) — KILN: `../20260911-kiln-designer.md`

A dedicated ephemeral pane spawned to **propose** the architecture *before the architecture*
critic — the designer *proposes*, does **not** decide. Inputs: the approved concept (and the
`context.md` it was built on). Output: `proposal.md` — components, data flow, interfaces, plus
*each decision and its rationale*.
- **Must NOT:** decide the architecture (that's the critic + the gate) · design past the feature's
  bounded scope · bury the rationale.
- **Gate:** *feeds* Architecture. **Role:** work.
- **KILN delta:** standard head, *affinity neighbor* of the researcher/concept-writer (no swap
   between them — the cost-minimizing early sequence).

## 4) architecture critic (`architecture-critic/SKILL.md`) — KILN: `../20260911-kiln-process-flow.md`

A line-of-defense pass — it **critiques** the design proposal, *before the gate*. Inputs: the
proposal. Output: a critique report; the **gate** is a *human* decision. Two-pass discipline:
**first pass** = the obvious (coherence, obvious risk, alternatives not yet considered); **second
pass** = what the first pass missed. **Must NOT** conflate with the code-reviewer (its job is the
*design*, not the *diff*); **must NOT** edit the proposal (it critiques; the fix is a **Revise**
back to the designer); **must NOT** decide the gate.
- **KILN delta (§):** **the strongest resident model, even locally** — the line the pipeline is
  *guaranteed* by is the strongest. A cheap critic is not acceptable *here*.

## 5) worker (+ per-checkpoint review) (`worker/SKILL.md` + `code-reviewer` per-checkpoint role)

A dedicated ephemeral pane that **implements one checkpoint** from the plan, *then* the
checkpoint's gate is a human decision. KILN uses **per-task** model tiering here (a cheap checkpoint
may run on a cheaper head; the *line-of-defense* roles don't).
- **Inputs:** the plan's checkpoint slice + the feature's spec/stories/concept + the relevant ADRs.
- **Output:** the checkpoint's *code* + a per-checkpoint review summary; the gate is human.
- **Must NOT:** implement more than the checkpoint's slice · review-and-merge in one pass · decide
  the checkpoint's gate.
- **KILN delta:** per-task tiering is *legal because of the gate* — the checkpoint's gate is the
  far side of each worker unit; the whole-feature **code-reviewer** (strongest) is the back-gate.

## 6) verifier (`verifier/SKILL.md`) — KILN: `../20260911-kiln-reviewer.md` (verifier lives there too)

A dedicated ephemeral pane spawned **after the code-reviewer's gate**, to exercise *every user
story in the spec* end-to-end, *before the human PR*. Inputs: the spec's user stories + the
running system. Output: a verification report; the gate is a *human* decision.
- **Must NOT:** "I think this passes" without *actually exercising the system* · skip a story ·
  report success that the *system* doesn't confirm · decide the gate.
- **KILN delta:** the **strongest resident** — the line the pipeline is *guaranteed* by (the
  "does-the-feature-actually-work" check) is the strongest, same as critic.

## 7) code reviewer (`code-reviewer/SKILL.md`) — KILN: `../20260911-kiln-reviewer.md`

A *whole-feature* review, **two-pass**, *after the final checkpoint and before the verification
gate*. Inputs: the full feature diff + the intent (concept, spec, stories, ADRs).
- **Must NOT:** rubber-stamp · conflate the per-checkpoint review with the whole-feature review
  (different things) · *edit the code* (finds, doesn't fix — the **Revise** move is back to a
  worker) · decide the gate.
- **KILN delta:** **strongest resident**, the strongest *single* pass on the whole feature — runs
  *after* the per-checkpoint gates, and *before* the verifier (also strongest; back-to-back,
  affinity-queue keeps the lane resident).

## 8) techwriter (`techwriter/SKILL.md`) — KILN: `../20260911-kiln-writer.md`

A dedicated ephemeral pane spawned *after a feature is verified, before the PR gate*. Writes the
per-feature docs/usage. **May skip** docs for `small-triage` features (a small feature may not
*need* docs). Inputs: the verified feature + its specs/concept.
- **Must NOT:** editorialize beyond what's needed to *use* the feature · skip docs for a
  *non-small* feature · merge the doc into the PR (doc is its own thing; PR is its own thing).
- **KILN delta:** cheap head (a Docs gate is on the far side), *affinity neighbor* of the PR
  writer (both cheap → no swap at the *tail* of the lane).

## 9) pr-writer (`pr-writer/SKILL.md`) — KILN: `../20260911-kiln-writer.md`

A dedicated ephemeral pane spawned *after docs, before the push*. Writes the **PR description** —
the change, the *why*, the verification summary. Inputs: the docs the techwriter just wrote + the
verified code + the concept + the ADRs.
- **Must NOT:** add explanation beyond what the *doc + diff* already say · merge *on the writer's
  say-so* (the **PR gate**'s human decision is the *merge* — "APPROVE = merge").
- **KILN delta:** the **cheap tail** of the lane — the last two units (docs + PR) ride the last
  resident cheap model, no swap.

## 10) adr-maker (`adr-maker/SKILL.md`)

Formalizes a *settled* decision (the one the just-passed gate accepted, if any) into a numbered,
**immutable** ADR. **Is NOT** a gate — the decision *is* the gate's output; the ADR is the
*record*. Inputs: the just-passed gate's decision + any rationale. Output: a numbered ADR (append-
only, never mutated).
- **Must NOT:** create an ADR for a *non-decision* · mutate a closed ADR (correction = *new*,
  numbered ADR that supersedes) · skip the rationale.
- **KILN delta:** a cheap head — a *warm* unit the lane may run *between* the strongest-tier
  passes (a "swap-down" step before a subsequent strongest unit).

---

## How to read a "skill doc" in KILN

Each entry names its skill, its **one kind of mind**, its **one gate** (or "feeds" one), and its
**tiering choice** — and the *one* KILN delta that changes under the single-lane, gate-rail,
local-model model. Reading a skill doc top-to-bottom is reading *one role's whole job*. Reading
them *in lane order* (researcher → triage → concept-writer → designer → critic → spec → plan →
worker → reviewer → verifier → docs/techwriter → pr-writer) is reading *one feature's whole walk*
through the kiln — and the **affinity-queue's job** is to keep that walk on *as few resident
models as possible*.
