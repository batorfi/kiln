> Grounded cross-ref index of KILN's skill / concept docs.
> Source-of-truth skills: `../../../../../pipeline-template/skills/*/SKILL.md` (relative)
> `../../pipelines/.../` is not used; see the real paths in the per-role docs.
>
> Note: these live in `docs/concepts/skills/`, a subfolder that has not persisted reliably
> across environment resets — the **per-role docs in the parent `docs/concepts/` directory are
> the canonical, persistent home**. Treat this subfolder as a convenience cross-ref, not a
> source of truth.

# KILN — skill docs (cross-ref index)

Per-role deep-dives that complement the top-level concept docs. The **canonical home for these is
the parent `docs/concepts/` directory** (one `20260911-kiln-<role>.md` per role) — those files
persist reliably. This subfolder re-derives the same material as grouped indexes.

## Top-level concept docs (`docs/concepts/`)

| Doc | Role / scope |
|---|---|
| `20260911-kiln-concept.md` | the whole vision, the 9-gate rail, execution model, roles |
| `20260911-kiln-gates-why-how-what.md` | the nine gates — why, how, what + headless contract |
| `20260911-kiln-ui-layers-deep.md` | UI layers, UI primitives, headless contract (deep) |
| `20260911-kiln-process-flow.md` | one feature end-to-end through the kiln |
| `20260911-kiln-research.md` | **Researcher** — the first pass (new) |
| `20260911-kiln-triage.md` | **Feature-size triage** — a gate that picks the path |
| `20260911-kiln-designer.md` | **Architecture Designer** — the proposal before the critic |
| `20260911-kiln-reviewer.md` | **Code Reviewer** — the whole-feature review, strongest, line-of-defense |
| `20260911-kiln-director.md` | **Director** = orchestrator + the single-lane scheduler |
| `20260911-kiln-writer.md` | **"Writer" as a kind** — 3 writers (concept / tech / PR) on one lane |
| `roadmap.md` | **Gate 0 — Roadmap**: `Roadmap` / `RoadmapRow`, `Lane` / `routeamap` — the pre-lane program admission + the unattended inter-feature boundary (`gate 0` in `process-flow.md`, the **Layer C** overlay in `ui-layers-deep.md`, analogue §4.9 in `kiln-analogy.md`) |

## Grouped indices (this subfolder)

| Doc | Covers |
|---|---|
| `01-generic-roles.md` | per-skill deep-dives — the 10 skills incl. the **researcher** |
| `02-gate-skills.md` | gate concepts (cross-ref to the gates-why-how-what doc) |
| `03-meta.md` | the "meta" skills — architecture-critic, adr-maker, pr-writer (the line-of-defense side) |
