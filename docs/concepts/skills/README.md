# KILN — the role skill docs (the roles of the lane)

> Status: ground-up concept · ground-up index
> Type: manifest / index of the role ("skill") deep dives in this folder
> Companion docs: `../concept.md` (the system), `../gates-why-how-what.md` (the nine gates +
> Gate 0), `../process-flow.md` (one feature's walk), `../roadmap.md` (Gate 0 and the firing
> program), `../ui-layers-deep.md` (the surfaces), `../kiln-analogy.md` (the firing image).
>
> This folder holds **one deep-dive per role** — *one kind of mind, one gate (or "feeds" one), one
> tiering choice, and the one KILN delta that changes under the single-lane, gate-rail, local-model
> model* — plus the three index docs that organize them into the **work roles** (`01-generic-roles.md`),
> the **gate concepts** (`02-gate-skills.md`), and the **meta / line-of-defense side** (`03-meta.md`).
> Each deep-dive is *faithful to* a `pipeline-template` `SKILL.md` with the **KILN delta marked
> "ground-up"**, because KILN inherits `pipeline-template`'s gate-driven roles and changes only their
> *placement, tiering, and the headless lane.* Source-of-truth skills:
> `../../../../pipeline-template/skills/<name>/SKILL.md`.

The whole idea in one line: **a KILN role is read in two directions.** Read one doc top-to-bottom
and you read *one role's whole job.* Read the deep dives **in lane order** and you read *one
feature's whole walk* through the kiln — which is exactly what `../process-flow.md` narrates. The
**affinity queue's** only job for those work roles is to keep that walk on *as few resident models
as possible.*

---

## The three index docs (read these first)

- **`01-generic-roles.md`** — the **work roles on the lane**: researcher, triage, concept-writer,
  designer, architecture-critic, worker, verifier/diagnosis, code-reviewer, techwriter, pr-writer,
  adr-maker, and the cross-feature docs-synthesizer. These *do the work*; the **lines of defense are
  the gates on their far side.** The single rule that matters for all of them: a *producer* is
  bounded by *the gate behind it*, so it *may be cheaper* — fine, because the **line-of-defense** on
  that gate's far side is *always the strongest*.
- **`02-gate-skills.md`** — the **nine per-feature gate concepts** (Concept → Architecture → Spec →
  Plan → Checkpoint → Review → Verification → Docs → PR; `small-triage` skips Concept + Architecture)
  and the pre-lane **Gate 0 — Roadmap**. A *short pointer* to `../gates-why-how-what.md`, the
  canonical home for the full move table and headless contract.
- **`03-meta.md`** — the **meta / line-of-defense side**: researcher + architecture-critic +
  adr-maker + pr-writer, plus the cross-feature **docs-synthesizer** — *where the lines of defense
  live.* The four line-of-defense roles (architecture-critic, verifier/diagnosis, code-reviewer,
  docs-synthesizer) **run on the strongest resident model, even on a local setup**, because they *are*
  the gates' backgates.

---

## The role deep dives

Each names its role, **one kind of mind**, **one gate** (or the gate it *feeds*), its **tiering
choice**, and the **one KILN delta** that changes under the single lane. Where a role has **no
standalone deep-dive**, this table says *where its home is.*

| role | kind of mind | gate | tier (KILN) | deep dive |
| --- | --- | --- | --- | --- |
| **researcher** | gathers context, decides nothing | *feeds* Concept (no gate of its own) | cheap → standard, local-first | `./research.md` |
| **triage** | decides the *whole path* the feature walks | **is itself a gate** (overrides always open) | cheap, first lane unit | `./triage.md` |
| **concept-writer** | writes *what + why* | **Concept** | **standard** (not cheap — its back-gate is Architecture) | `./writer.md` (of the "writer" family) |
| **designer** (architecture-designer) | *proposes* the architecture | **Architecture** (after it) | standard; the producer at standard | `./designer.md` |
| **architecture-critic** | *judges* the design (line of defense) | **is the Architecture gate's line-of-defense pass** | **strongest, always** | *no standalone doc*; home: `03-meta.md` §2 / `../gates-why-how-what.md` |
| **worker** | executes one checkpoint of the plan | **Checkpoint** (on its far side) | per-task tier; the one long-running resident | *no standalone doc*; home: `01-generic-roles.md` §5 (+ `../gates-why-how-what.md`) |
| **verifier / diagnosis** | *proves* the build; diagnoses failures | **Verification** (line of defense, ≤ 2 mitigation rounds) | **strongest, always** | `./reviewer.md` (verifier lives with the reviewer) |
| **code-reviewer** | *whole-feature* review vs intent (line of defense, two-pass) | **Review** (line of defense; `restart`, no `revise`) | **strongest, always** | `./reviewer.md` |
| **techwriter** | writes per-feature *how-to* docs | **Docs** (skippable for `small-triage`) | cheap; neighbor of pr-writer | `./writer.md` |
| **pr-writer** | writes the PR description | **PR** (the close; `APPROVE` = merge) | cheap; the tail of the lane | `./writer.md` |
| **adr-maker** | records a *settled* decision | **not a gate** — the record of the just-passed gate | cheap, a "warm" swap-down step | *no standalone doc*; home: `03-meta.md` §3 / `01-generic-roles.md` §10 |
| **docs-synthesizer** | *cross-feature* synthesis from full history (line of defense) | **not one of the nine; off-lane, human-invoked** | **strongest, always** — human is the backgate | `./docs-synthesizer.md` |
| **director** | orchestrates **and** schedules the single lane | *decides none; opens/holds all* | holds the lane; picks the affinity order | `./director.md` |

**Lane order** (how the deep dives read as *one feature's walk* — see `../process-flow.md`
Units 0–12):

```
Gate 0 (roadmap)   ┊  triage  →  researcher  →  concept-writer  →  designer
   (human, pre-lane)   ▲             │                │                │
                    first          feeds            gate 1         gate 2
                    lane unit  (concept)         (concept)      (architecture:
                    + cost            │                       designer →
                    commit      architect        architecture-critic, strongest)
                                        critic ←──│
              [Gate 0 re-opens at every inter-feature boundary]

              ...  spec-writer (g3) → plan-writer (g4) → worker ×N (g5 checkpoints)
                                   → code-reviewer (g6, strongest, two-pass)
                                   → verifier (g7, strongest, ≤2 mitigation)
                                   → techwriter (g8) → pr-writer (g9 · APPROVE = merge)

              off-lane, after a batch:  docs-synthesizer  (strongest; human-invoked)
```

The **director** is not in lane order — it is the *hand that runs the kiln*, holding the lane,
yielding it to each worker, and reclaiming it; see `./director.md`. Every other role above *sits
on the lane* at the position the order shows.

---

## The two things every role doc agrees on

The KILN delta shared by every deep dive is the **same two rules** (full treatment in
`../concept.md`, `../gates-why-how-what.md`, `../process-flow.md`):

1. **No model may approve its own work.** A role *produces* (`researcher`, `concept-writer`,
   `designer`, `worker`, `techwriter`, `pr-writer`, `adr-maker`, `docs-synthesizer`) or *judges*
   (the three line-of-defense roles, plus the human at every gate); it **never decides the gate.**
   The lane's only executor-of-anything-unattended is the *work*, and each work unit is **bounded by
   the gate on its far side** — that single fact is what makes a *cheaper* head acceptable on a
   *local* setup.
2. **The four lines of defense are always the strongest — even on a local setup.** Architecture
   critic, verifier/diagnosis, code-reviewer, docs-synthesizer. A weak backgate defeats the safety
   net, and on a single lane there is no parallel pass to catch what a weak judge missed. Routing is
   **two-track** (the director's job, `./director.md` §5): **work roles** ride the *cheapest* model
   the gate behind can bound; the **four line-of-defense roles** ride the *strongest* always;
   **triage** is cheap because it is bounded *immediately* by a human gate.

---

## How to read this folder

- **Want one role's whole job?** Open its deep dive top-to-bottom; it reads as one role.
- **Want one feature's whole walk?** Read the deep dives in the lane order above *as*
  `../process-flow.md` narrates them — that *is* the affinity queue's job: keep the walk on as
  **few resident models as possible**, because `wall-clock = (work) + (switching)` and the
  switching term is local-dominant (`./director.md` §6).
- **Want the rules of a gate or the whole gate rail?** Start at `02-gate-skills.md` →
  `../gates-why-how-what.md` (the nine gates + Gate 0, moves, the headless no-silent-approval
  contract).
- **Want the work vs line-of-defense split?** `01-generic-roles.md` (work) + `03-meta.md`
  (line-of-defense).
- **Missing a deep dive?** It is *not* missing — a few roles are deliberately documented *in their
  index entry* rather than given a standalone doc: the **worker** lives in `01-generic-roles.md`
  §5; the **adr-maker** in `03-meta.md` §3; the **architecture-critic** in `03-meta.md` §2 (with
  its *gate* in `../gates-why-how-what.md`); the **verifier** sits with the **code-reviewer** in
  `./reviewer.md`. Each such entry says *where its home is.*

*These docs are the roles of the kiln, one per mind; read one for a job, read them in lane order
for a feature, and the two shared rules — no model approves its own work, the lines of defense are
always the strongest — are what let a local, single-lane factory hold heat and stay honest.*
