# r39 — Team space, part 2

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Team |
| **Release** | `kiln-v1` — position 25 of 41 in the proposed order |
| **Depends on** | [r38 — Team space, part 1](./r38-team-space-part-1.md), [r31 — Existing codebases, part 2: baseline, territory, process](./r31-existing-codebases-part-2-baseline-territory-process.md) |
| **Unlocks** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md), [r41 — New codebases, the rest](./r41-new-codebases-the-rest.md) |
| **PRD requirements** | TEAM-4…7, HITL-4 |
| **Proven when** | overlapping claims surface at the Work plan gate; a required teammate review conditions *approve*; the Merge gate uses the code host's queue |

## In one paragraph

With a team roadmap in place, the team needs to see who is building what, ask each other for decisions, and merge through its own code host — without anyone deciding a gate from outside the workshop that owns it.

## What it delivers

- claims made on adoption, refined at Work plan, renewed by activity (advisory: stale at 3 days, expired at 7; exclusive: 48 hours); protected paths; overlap surfaced at the Work plan gate
- requests and required reviews between workshops, signed and mirrored with the code host's pull request; required reviews condition *approve*
- hand-over of a waiting decision to a teammate the workshop names
- the team-aware Merge gate: base drift, required reviews and checks, the code host's merge queue
- published progress and team knowledge

## Not in this row

- team bench work (r35)
- team review in Zed (r52)

## Requirements it carries

*As listed in the roadmap: TEAM-4…7, HITL-4. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| TEAM-4 | **Claims**: made on adoption, refined at Work plan, released at merge; **renewed by activity**, stale after 3 quiet days, expired after 7 (exclusive: 48 hours), expiry releasing the claim only; **advisory by default**, exclusive on protected paths; **overlap detection** across workshops shown in both gate briefs. | Must (v1) |
| TEAM-5 | **Decisions across workshops**: opinions, required reviews, delegated deciders — signed, recorded on both sides; required reviews **mirrored** with the code host's pull request. | Must (v1) |
| TEAM-6 | **Merge gate in a team**: base drift, required reviews and checks, the code host's merge-queue position; no KILN queue. | Must (v1) |
| TEAM-7 | **Team knowledge** tier in the team space, editable by every member, included as `team/` in member vaults; merged-feature stories by the author's choice. | Must (v1) |
| HITL-4 | **Hand-over** of a waiting decision to another permitted Decider — a person in the same workshop (PPL-1 team) or a teammate the workshop explicitly names (TEAM-5); hidden in a one-person workshop with no team space. | Should |

## How it is proven

**Acceptance:** overlapping claims surface at the Work plan gate; a required teammate review conditions *approve*; the Merge gate uses the code host's queue.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- **XII** — a teammate's review is evidence, never a decision
- **I** — one decision per gate

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The team space](../../docs/concepts/team-space.md)
- [PRD TEAM-4…7, HITL-4](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r38 — Team space, part 1](./r38-team-space-part-1.md) · [index](./README.md) · [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) →
