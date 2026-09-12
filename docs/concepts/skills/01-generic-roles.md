> Grounded cross-ref index of KILN's "generic" (a.k.a. "generic worker") skill docs — the
> in-lane roles (researcher, triage, architect/designer, worker, verifier, code-reviewer,
> techwriter, pr-writer, adr-maker).
> Canonical homes: each role's deep-dive lives in *this* `skills/` subfolder
> (`./research.md`, `./triage.md`, `./designer.md`, `./reviewer.md`, `./director.md`,
> `./writer.md` …), which is git-tracked; the parent `docs/concepts/` holds the canonical
> KILN prose (`concept.md`, `gates-why-how-what.md`, `roadmap.md`, `process-flow.md`,
> `kiln-analogy.md`, `ui-layers-deep.md`). *This* doc is an index of *where* to find each
> role's deep dive, with the *one* KILN delta called out inline (faithful to
> pipeline-template's framing, deltas marked "ground-up").
> Source-of-truth skills: `../../../../pipeline-template/skills/<name>/SKILL.md`.

# KILN — "generic worker" skill docs (the in-lane generic roles)

These ten are the **work roles on the lane** — they *do the work* (propose, build, write) and
the **lines of defense are the gates on their far side** (architecture-critic, verifier /
diagnosis, code-reviewer, docs-synthesizer — see `./03-meta.md`). They are the bulk of the
**affinity queue's** work: most of the lane runs on a cheap head bounded by the gate on its far
side; a single expensive "line-of-defense" unit (a critic / verifier / code-reviewer pass) is
run on the *strongest* model resident. **One rule that matters for all of these:** a *producer*
role is bounded by *the gate on its far side*, so it *may be cheaper* — and that's *fine* because
the **line-of-defense** on the gate's back is always (in KILN) the **strongest**.

## 1) researcher (`researcher/SKILL.md`) — KILN: `./research.md`

The first thing on the lane. Produces `context.md` — a structured **5-section** brief
(restate the problem in its own words, not *theirs*; cite relevant prior art *from the
project*, by path/ID; do **external** research **only for what the project's history doesn't
cover**; list known constraints; list open questions — *expected non-empty*). **Must NOT**
propose a solution / architecture / scope · hide "found nothing" (say so explicitly) · *pad*
the brief with tangential material · present to the human (the director owns that at the
Concept gate).
- **Gate:** none — it *feeds* the next gate (Concept). The Concept gate reads `context.md`
  alongside the raw idea.
- **When:** runs *only for standard-triage* features (a `small-triage` feature skips research
  — its smallness is *its* gate).
- **KILN delta:** a *short, local-first* pass — the project-history part is trivially local;
  the external-research part depends on connectivity, so a local lane *leans on history and
  flags web research unavailable* rather than blocking. (See the full doc, §5–§6.)

## 2) feature-size triage (`triage` — a KILN gate, no `pipeline-template` SKILL.md) — KILN: `./triage.md`

**This is a KILN gate, not a `pipeline-template` skill** — it's the *first read of a raw*
*input* (a ticket, a PR-comment, a `TODO`, a CI log) and the *one* cheap decision that decides
*whether and how much pipeline runs*. The full "gate" treatment (the two decisions, the
override rule, the *why*) lives in `./02-gate-skills.md`; this entry is the *role*.
- **Two decisions:** (a) **size** — `small-triage` vs `standard`. (b) **skip** — `small-triage`
   *skips* Concept + Architecture; `standard` runs the full nine gates.
- **Must NOT** be a worker · skip a *non-front* gate · *default* on genuine ambiguity (when in
   doubt, take the *small* path *only* when the *input* is unambiguously small, else *standard*
   — but a human may *down- or up-grade*).
- **When:** the very first thing, on *every* piece of raw input.
- **KILN delta:** it *is* the lane's cost optimization on KILN — a small feature's *short* lane is
   *cheaper* on a single machine than a full nine-gate lane would be, so the *triage gate*
   matters *more* in KILN than in a cloud setup.

## 3) architect / architecture designer (`architecture-designer/SKILL.md`) — KILN: `./designer.md`

A dedicated **ephemeral pane** spawned to **propose** an architecture *before* the critic (see
§4) critiques it. The lane's *standard* head is *the one that proposes*, not *the one that
decides*. Inputs: the approved concept (`concept.md`) + `context.md`. Output: a **proposed**
architecture — *components*, *data flow*, *interfaces*, and *one decision per component* with a
*rationale*. **Must NOT** *decide* the architecture (that's the **gate**, a human) · design
*past the bounded scope* of the feature · *bury* rationale.
- **Gate (it feeds):** the **Architecture gate** reads its proposal *and* the critic's
  critique, then decides.
- **Role:** a *work* role — it *proposes*, the **Architecture gate** *decides*.
- **KILN delta:** a standard head — the lane's *first expensive thing that isn't a gate* (the
  **triage gate** is the *cheap* gate; the *designer* is the *first* "real" work unit after it).

## 4) architecture critic (`architecture-critic/SKILL.md`) — KILN: `./03-meta.md` §2 / `../gates-why-how-what.md`

The gate's *line-of-defense* pass for the Architecture gate (see `./03-meta.md` §2 for the
line-of-defense treatment, and `../gates-why-how-what.md` for the gate itself). A dedicated
ephemeral pane spawned by the lane to *critique* the designer's proposals *before* the human
decides. It is a **line-of-defense** role, so in KILN it runs on the **strongest** resident
model. **Must NOT** conflate with the *code-reviewer* (the architect-critic's job is to find
the *design's* flaws *before* there's a diff; the code-reviewer's is to find flaws *in the
diff*); **must NOT** *edit* the proposal (it *critiques*; the fix is a **Revise** back to the
designer); **must NOT** *decide* the gate (the Architecture gate's human decision is *final*).

## 5) worker (`worker/SKILL.md`) — KILN: `./01-generic-roles.md` (this doc is the canonical,
persistent home; see `../gates-why-how-what.md` for the "checkpoint review" and
"lane-hold" mechanics)

The single **long-running** pane on the lane — the one that *executes the plan* (writes /
modifies code, runs tests, *reproduces the gate's required verification*). It's the *one* role
that's **allowed to be long-running and resident** across a lane (vs the ephemeral producers /
critics / reviewers). Inputs: the approved spec + the approved plan. **Must NOT** *skip a
checkpoint* · *silently* approve its own *verification* · *scope-creep* past the plan · *leave
*partial* work without reporting it.
- **Checkpoints:** the plan is split into *checkpoints* (a "do-then-check" unit). The worker
  reports **one** checkpoint at a time; the **Checkpoint Review gate** (the lane-side
  "lane-hold") either *holds* the lane on this checkpoint, *revise-back*, or *pass on to the*
  *next*.
- **Lane-hold:** the verifier / diagnosis runs *while the lane is held* at this checkpoint — a
  *second* independent look at the same artifact (see §6).
- **KILN delta:** the *single* unit the lane lets be long-running — because the *one* thing
  "resident" on a single machine is the *worker's* pane (vs the ephemeral units that spawn and
  die). The lane-side "lane-hold" is *this* pane held across a checkpoint.

## 6) verifier (`verifier/SKILL.md`) — KILN: `./reviewer.md` (verifier lives there too)

The gate-side "diagnosis" run — spawned by the lane **when the worker's checkpoint fails
verification** (a test it didn't pass, the verifier's own re-run disagrees, or the lane's
"verifier pass" fails). It produces a **diagnosis** — *why* the checkpoint didn't pass, *what*
*the fix is* (or "I don't know"), and *what the next* attempt should look like. It is a
**line-of-defense** role. Its diagnosis is a KILN lane-side artifact (the lane's "diagnosis
log"; a "diagnosis" entry lives in the gate's history — see `../gates-why-how-what.md`).
- **Must NOT:** fix the code (the *worker* does that, on the lane) · *guess* (when uncertain,
  say *so* and *recommend* — not "the fix is X" without a *why*) · *be a worker* (it's a
  *second look*, not a *third* pass at the same artifact).
- **When:** on a failed checkpoint, *before* the lane re-dispatches to the worker.
- **KILN delta:** the lane-side "diagnosis" — *the same* lane (the worker's *resident* one)
  holds on the verifier; the verifier is a *cheap* unit because its far side is *the worker*
   (which *is* the line-of-defense on *its* far side… wait — the worker's far side is the
  **Checkpoint Review gate's** *human*, not the verifier; the verifier's far side is *this
  same checkpoint's second re-run*). (See `../gates-why-how-what.md`.)

## 7) code reviewer (`code-reviewer/SKILL.md`) — KILN: `./reviewer.md`

A dedicated *ephemeral* pane, spawned by the lane on the **Review** gate **before** the human
decides. Reviews the *diff* (the worker's output) *against the spec* (the approved spec — not
the *code's own* claims). **Two-pass discipline**: first pass = the *obvious* (correctness,
style, error handling, missing tests); second pass = *what the first pass missed*. It is a
**line-of-defense** role, so on KILN it runs on the **strongest** resident model; see
`./reviewer.md`. **Must NOT** *rubber-stamp* the diff · review against the diff's *own* claims
(only the *spec*) · *edit* the diff (a "fix" is a **Revise** back to the *worker*; the
**code-reviewer's** output is *review notes*, not a patch) · conflate with the *architecture
critic* (that's the *design*; this is the *diff*).
- **Gate (it feeds):** the **Review gate** — the human reads *the diff* + the reviewer's
  *notes*, then *approve / revise / reject* the diff.
- **Output:** a "review-notes" set (a separate `review-notes.md` is *not a skill*; it's the
  reviewer's *output*, consumed by the *gate*).
- **KILN delta:** a *strong* head — the *one* "strong" thing at the Review gate; the *worker*
  on its far side may be cheaper because *this one* is on the *strongest*. (See `./reviewer.md`.)

## 8) techwriter / docs (`techwriter/SKILL.md`) — KILN: `./writer.md`

A dedicated **ephemeral pane** spawned *after a feature is verified, before the PR gate*. Writes
the per-feature docs/usage. **May skip** docs for `small-triage` features (a small feature may
not *need* docs). Inputs: the verified feature + its specs/concept.
- **Must NOT:** editorialize beyond what's needed to *use* the feature · skip docs for a
  *non-small* feature · merge the doc into the PR (doc is its own thing; PR is its own thing).
- **KILN delta:** cheap head (a Docs gate is on the far side), *affinity neighbor* of the PR
  writer (both cheap → no swap at the *tail* of the lane).

## 9) pr-writer (`pr-writer/SKILL.md`) — KILN: `./writer.md`

A dedicated ephemeral pane spawned *after docs, before the push*. Writes the **PR description**
— the change, the *why*, the verification summary. Inputs: the docs the techwriter just wrote +
the verified code + the concept + the ADRs.
- **Must NOT:** add explanation beyond what the *doc + diff* already say · merge *on the
  writer's* say-so (the **PR gate**'s human decision is the *merge* — "APPROVE = merge").
- **KILN delta:** the **cheap tail** of the lane — the last two units (docs + PR) ride the last
  resident cheap model, no swap.

## 10) adr-maker (`adr-maker/SKILL.md`)

Formalizes a *settled* decision (the one the just-passed gate accepted, if any) into a numbered,
**immutable** ADR. **Is NOT** a gate — the decision *is* the gate's output; the ADR is the
*record*. Inputs: the just-passed gate's decision + any rationale. Output: a numbered ADR
(append-only, never mutated).
- **Must NOT:** create an ADR for a *non-decision* · mutate a closed ADR (correction = *new*,
  numbered ADR that supersedes) · skip the rationale.
- **KILN delta:** a cheap head — a *warm* unit the lane may run *between* the strongest-tier
  passes (a "swap-down" step before a subsequent strongest unit).

## 11) docs-synthesizer (`docs-synthesizer/SKILL.md`) — KILN: `./docs-synthesizer.md`

A **line-of-defense, cross-feature** role — *not* one of the nine numbered in-lane gates.
Invoked **directly by a human**, *after* the unattended tail (see `./triage.md` §"unattended
tail"), it synthesises a **project-wide** doc from **full history**, not per-diff. Eight
output types: **technical overview, how-to guide, whitepaper, atomic concept note**
(`docs/concepts/<id>-<slug>.md` with a timestamp id), **ADR index/map, FAQ, glossary,
onboarding runbook**. ADR-index and FAQ are **incremental** (updated, not regenerated whole
each time). **Must NOT** be a per-diff feature task · fabricate — *state gaps explicitly* ·
break the project's doc conventions · write before grounding itself in the real history.
- **Gate:** it is *human-invoked* and *human-reviewed* before being considered final —
  *outside* the gate sequence. (See `./docs-synthesizer.md` and `../gates-why-how-what.md`, Gate 8 — DOCS.)
- **Role:** a **line-of-defense** role, so it runs on the **strongest** resident model —
  *always*, even on a local setup (its far side has no gate; the human reviewing it *is* the
  backgate).
- **KILN delta:** the *one* role that the lane doesn't run as a step — it's a *cross-feature*
  synthesis pass a human asks for *after* a batch of features is in. See `./docs-synthesizer.md`.

---

## How to read a "skill doc" in KILN

Each entry names its skill, its **one kind of mind**, its **one gate** (or "feeds" one), and its
**tiering choice** — and the *one* KILN delta that changes under the single-lane, gate-rail,
local-model model. Reading a skill doc top-to-bottom is reading *one role's whole job*. Reading
them *in lane order* (researcher → triage → concept-writer → designer → architecture-critic →
worker → verifier → code-reviewer → docs / techwriter → pr-writer) is reading *one feature's
whole walk* through the kiln — and the **affinity-queue's job** is to keep that walk on *as few
resident models as possible*.

Routing is **two-track** (full treatment in `./director.md` §5): the **work roles** — researcher
→ concept-writer → designer → worker → techwriter / pr-writer — are routed to the *cheapest*
model the gate on their far side can bound; the four **line-of-defense** roles — architecture
critic, verifier / diagnosis, code-reviewer, and docs-synthesizer — are routed to the
**strongest resident model always, even on a local setup**, because *they* are the gates'
backgates, and a weak backgate defeats the safety net. **Triage is cheap** because it is
bounded *immediately* by a human gate. `concept-writer` lives in `./writer.md` (one of the three
writ kinds, the *Concept*-gate one); `director` lives in `./director.md` (the *scheduling* role,
not a gate); `adr-maker` (§10) and `docs-synthesizer` (§11) are *not* in-lane gates — the
former is a *record* of a decision, the latter a *cross-feature* synthesis a human invokes.
