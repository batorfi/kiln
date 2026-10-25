# r53 — The Feed

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 31 of 42 in the committed order |
| **Depends on** | [r35 — The bench, part 2: spikes and candidates](./r35-the-bench-part-2-spikes-and-candidates.md) |
| **Unlocks** | — |
| **PRD requirements** | FEED-1…7 |
| **Proven when** | an item fed as a screenshot and a note is stored untouched, sorted into drafted destinations, routed by a person, and its trail shows *from your feed*; nothing is decided by feeding, and a routed item can be taken back |

## In one paragraph

The Feed is one place to drop anything half-formed: a note, a link, a screenshot, a file, a voice note, a ticket, a folder. The original is kept untouched; a labelled planner draft suggests where it could go; a person decides, and can take it back.

## What it delivers

- one global capture action (web, `kiln feed`, editor) that stores the original untouched
- deterministic intake and matching, then a labelled planner draft over a closed list of destinations, with no preselection
- routing as a recorded choice by a person, `feed.unrouted` to take it back, and notes kept in the private notebook labelled *fed*
- a *from your feed* trail on every use, and the original listing where it went
- opt-in share to the team for a single item, and an opt-in watched inbox folder

## Not in this row

- anything decided by feeding: a fed item is evidence or a wish, never a requirement, approval or move

## Requirements it carries

*As listed in the roadmap: FEED-1…7. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| FEED-1 | **Free-form intake**: one global action (web, `kiln feed`, editor) accepts a note, link, screenshot, file, voice note, ticket or folder with no required structure; the original is stored untouched in the record with time and source. | Should |
| FEED-2 | **Drafted destinations**: a labelled planner step proposes where an item could go (feature candidate, roadmap input, gate evidence, knowledge page, question for a step, amendment suggestion, note) and what it found (overlap, matching ticket); no option is pre-selected. | Should |
| FEED-3 | **Nothing is decided by feeding**: routing is a person's recorded choice; a fed item is evidence or a wish, never a requirement, approval or move; it never blocks a factory and never escalates or expires. | Must |
| FEED-4 | **Trail**: every use of a fed item shows *from your feed* and links to the original; the original lists where it went. Sorting follows the workshop's egress policy; secrets are scanned on capture. | Should |
| FEED-5 | **Take it back**: every reversible destination can be taken back (`feed.unrouted`), and the item returns to *waiting*. | Should |
| FEED-6 | **Share to the team** is an explicit act on a single item and never changes a team artifact by itself. | Could |
| FEED-7 | **Watched inbox folder** and capture from other surfaces (editor, phone) are opt-in and listed in *Models & policy → Changes* when turned on. | Could |

## How it is proven

**Acceptance:** an item fed as a screenshot and a note is stored untouched, sorted into drafted destinations, routed by a person, and its trail shows *from your feed*; nothing is decided by feeding, and a routed item can be taken back.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- **I** — the planner proposes, a person routes
- **VII** — every route and take-back is recorded
- **VIII** — personal by default, local first

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The Feed](../../docs/concepts/the-feed.md)
- [PRD FEED-1…7](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r35 — The bench, part 2: spikes and candidates](./r35-the-bench-part-2-spikes-and-candidates.md) · [index](./README.md) · [r36 — Observability in full](./r36-observability-in-full.md) →
