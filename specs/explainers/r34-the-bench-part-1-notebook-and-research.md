# r34 — The bench, part 1: notebook and research

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 30 of 43 in the committed order |
| **Depends on** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **Unlocks** | [r35 — The bench, part 2: spikes and candidates](./r35-the-bench-part-2-spikes-and-candidates.md) |
| **PRD requirements** | BENCH-1…4, BENCH-7 |
| **Proven when** | a notebook entry promoted to knowledge keeps its origin; research results are cited |

## In one paragraph

Engineers think while factories work. The bench gives each person a private notebook that matures into knowledge, and research steps that run on spare capacity — ungated by design, feeding the roadmap with evidence rather than decisions.

## What it delivers

- a private notebook per person with explicit capture (clipper, editor, terminal, KILN, voice)
- keeper suggestions — links, contradictions, maturity — never rewriting
- promotion of notes into workshop, factory or team knowledge
- research steps: plan first, read-only tools, below feature work, cited results
- origin and maturity labels on all knowledge

## Not in this row

- spikes and the candidate list (r35)

## Requirements it carries

*As listed in the roadmap: BENCH-1…4, BENCH-7. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| BENCH-1 | **Notebook**: a private, unruled vault per person under the vault contract; explicit capture from clipper, editor, terminal, KILN surfaces and local voice transcription. | Should |
| BENCH-2 | **Keeper suggestions** in the notebook — links, contradictions, maturity — never rewriting; used only for the owner's questions. | Should |
| BENCH-3 | **Promotion** of notes by ingest into the workshop, factory or team tier, linked back to the notes. | Should |
| BENCH-4 | **Research steps**: plan shown first; read-only tools; below feature work, never on a held judge's lane; results in the notebook with sources and labels; per-person caps. | Should |
| BENCH-7 | **Origin and maturity labels** on all knowledge, carried into briefs and director citations; lint ages exploratory knowledge faster. | Should |

## How it is proven

**Acceptance:** a notebook entry promoted to knowledge keeps its origin; research results are cited.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- PRD **P13** — ungated means ungated
- **X** — only promoted knowledge is cited
- **III** — research below feature work

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The bench](../../docs/concepts/the-bench.md)
- [PRD BENCH-1…4, 7](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r33 — Models beyond the machine](./r33-models-beyond-the-machine.md) · [index](./README.md) · [r35 — The bench, part 2: spikes and candidates](./r35-the-bench-part-2-spikes-and-candidates.md) →
