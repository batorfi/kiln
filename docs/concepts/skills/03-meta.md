> Grounded cross-ref index of KILN's "meta" skill docs — the meta-side roles
> (researcher + architecture-critic + adr-maker + pr-writer, plus the cross-feature
> docs-synthesizer), where the **lines of defense** live.
> Source-of-truth skills: `../../../../pipeline-template/skills/<name>/SKILL.md`.
>
> KILN deltas are marked "ground-up"; the rest is faithful to the cited SKILL.md.

# KILN — "meta" skill docs (the meta / line-of-defense side)

These are the roles that *are or feed the gates' backgates* — the lines the pipeline is
*guaranteed* by. The four **line-of-defense** roles (architecture-critic, verifier / diagnosis,
code-reviewer, and docs-synthesizer) **run on the strongest resident model, even on a local
setup** — that's the "line-of-defense is always on the strongest" principle (see `../gates-why-how-what.md`
for the full rationale). The **researcher** is the *feeds*-role (it warms a downstream
role, it doesn't gate it) and is here because it's *the first thing on the lane*. The
**adr-maker** and **pr-writer** are *record* roles (cheap *producers* on the meta side). The
**docs-synthesizer** is a **line-of-defense, cross-feature** role — *not* one of the nine
numbered in-lane gates, but a synthesis pass a human invokes *after* the unattended tail.

---

## 1) researcher (`researcher/SKILL.md`) — feeds the Concept; deep-dive: `./research.md`

The **first** thing on the lane. Produces `context.md` — a structured **5-section** brief
(restate the problem in its own words, not *theirs*; cite relevant prior art *from the project*,
by path/ID; do **external** research **only for what the project's history doesn't cover**; list
known constraints; list open questions — *expected non-empty*). **Must NOT** propose a solution /
architecture / scope · hide "found nothing" · *pad* with tangential material · present to the human
(the director owns that).
- **KILN delta:** a *short, local-first* pass — the project-history part is trivially local; the
  external-research part depends on connectivity, so a local lane *leans on history and flags web
  research unavailable* rather than blocking. (See the full doc, §5-§6.)

## 2) architecture-critic (`architecture-critic/SKILL.md`) — is a gate *of itself*; deep-dive in `../gates-why-how-what.md`

**Is the gate's *line-of-defense pass*** for the Architecture gate — it *critiques* the design
proposal *before* the human decides. **Two-pass** discipline (first pass = the obvious; second
pass = *what the first passed* missed). **Must NOT** conflate with the *code-reviewer* (its job is
the *design*, not the *diff*); **must NOT** *edit* the proposal (it critiques; the fix is a
**Revise** back to the designer); **must NOT** *decide* the gate.
- **KILN delta:** **the strongest resident model, even locally** — the line the pipeline is
   *guaranteed* by is the strongest. A weak critic is not acceptable *here*; a weak *designer* (the
   *producer* of the proposal) is, because the *critic* is on the far side.

## 3) adr-maker (`adr-maker/SKILL.md`) — is *not* a gate; a settled-decision record; deep-dive: this §3 entry (and `./01-generic-roles.md` §10)

Formalizes a *settled* decision (the one a just-passed gate accepted, if any) into a numbered,
**immutable** ADR. **Must NOT** create an ADR for a *non-decision* · mutate a closed ADR
(correction = *a new, numbered ADR that supersedes*) · skip the *rationale* · *be* a gate (the
decision *is* the gate's output; the ADR is the *record*). It has **no standalone deep-dive doc** —
this §3 entry and `./01-generic-roles.md` §10 are its home.
- **KILN delta:** a *cheap* head — a "warm" unit the lane may run *between* the strongest-tier
  passes (a "swap-down" step before the next strongest unit).

## 4) pr-writer (`pr-writer/SKILL.md`) — is *not* a gate either; it *feeds* the PR gate; deep-dive: `./writer.md`

A dedicated ephemeral pane spawned *after docs, before the push*. Writes the **PR description**
(the change, the *why*, *one* verification summary). **Must NOT** add explanation beyond what the
*doc + diff* already say · *merge on the writer's say-so* (the **PR gate's human decision** is the
*merge*; "APPROVE = merge").
- **KILN delta:** the **cheap tail** of the lane — the last two units (docs + PR) ride the *last*
  resident model off the end, *no swap*.

## 5) docs-synthesizer (`docs-synthesizer/SKILL.md`) — a *line-of-defense, cross-feature* role; deep-dive: `./docs-synthesizer.md`

**NOT one of the nine numbered in-lane gates.** A **line-of-defense** role a human invokes
*directly*, *after* the unattended tail, to synthesise a *project-wide* doc from *full history*
(not per-diff). Eight output types: **technical overview, how-to guide, whitepaper, atomic
concept note** (`docs/concepts/<id>-<slug>.md`, timestamp id), **ADR index/map, FAQ, glossary,
onboarding runbook**. ADR-index and FAQ are **incremental** (not regenerated whole each time).
**Must NOT** be a per-diff feature task · fabricate (*state gaps explicitly*) · break the project's
doc conventions · write before grounding itself in the real history.
- **Gate:** *human-invoked*, *human-reviewed* before being considered final — *outside* the gate
  sequence. (See `../gates-why-how-what.md`, Gate 8 — DOCS — for the *per-feature* docs step, which
  is the lighter per-diff lane this role is distinct from.)
- **KILN delta:** a **line-of-defense** role, so the **strongest resident, even locally** — its far
  side has no gate; the *human reviewing it* *is* the backgate. It's the *one* role the lane
  doesn't run as a step — a cross-feature pass a human asks for after a batch of features is in.
  (See `./docs-synthesizer.md`.)

---

## How the "meta" side fits the lane

These five are *not* a separate category in the lane — they're **where they belong in lane order**:
- **researcher**: *first* (Unit 0).
- **architecture-critic**: *mid*, right *after* the designer (the strongest, the line).
- **adr-maker**: *right after the critic's gate* (a warm cheap step).
- **pr-writer**: *last* (Unit 12, the cheap tail).
- **docs-synthesizer**: *off-lane*, a cross-feature pass a human invokes *after* the unattended
  tail — not a lane unit at all.

The **line-of-defense** roles — the **architecture-critic**, the **verifier / diagnosis**, the
**code-reviewer's** two-pass, and the **docs-synthesizer** — are **always the strongest
resident**, and that's what makes a *cheaper producer* acceptable *upstream* of each. The
**producer** roles (designer, spec/plan writers, worker, techwriter, pr-writer, adr-maker) are
bounded by the *gate on their far side*, and so may be *cheaper*. The **researcher** is
a special case: it doesn't gate, it *feeds* — and it *starts* the lane. Routing is **two-track**
(the director's job, `./director.md` §5): work roles ride the *cheapest* bounding model, the four
line-of-defense roles ride the *strongest* always, triage is cheap because it's bounded
immediately.
