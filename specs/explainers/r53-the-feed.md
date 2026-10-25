# r53 — The Feed

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Workshop |
| **Release** | `kiln-v1` — position 18 of 43 in the committed order |
| **Depends on** | [r22 — Shaping the roadmap together](./r22-shaping-the-roadmap-together.md), [r24 — Implementation knowledge and the workshop wiki](./r24-implementation-knowledge-and-the-workshop-wiki.md) |
| **Unlocks** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md), [r54 — The Feed, the rest](./r54-the-feed-the-rest.md) |
| **PRD requirements** | FEED-1…5 |
| **Proven when** | an item fed as a screenshot and a note is stored untouched, sorted into drafted destinations (only those this build has), routed by a person, and its trail shows *from your feed*; nothing is decided by feeding, and a routed item can be taken back |

## In one paragraph

The Feed is one place to drop anything half-formed: a note, a link, a screenshot, a file, a voice note, a ticket, a folder. The original is kept untouched; a labelled planner draft suggests where it could go; a person decides, and can take it back. In `kiln-v1` it offers only the destinations the build has.

## What it delivers

- one global capture action (web, `kiln feed`) that stores the original untouched
- deterministic intake and matching, then a labelled planner draft over a closed list of destinations, with no preselection
- routing as a recorded choice by a person, and `feed.unrouted` to take it back
- a *from your feed* trail on every use, and the original listing where it went

## Not in this row

- the notebook and feature-candidate destinations (r54, after the bench)
- sharing a single item to the team and the watched inbox folder (r54)

## Requirements it carries

*As listed in the roadmap: FEED-1…5. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| FEED-1 | **Free-form intake**: one global action (web, `kiln feed`, editor) accepts a note, link, screenshot, file, voice note, ticket or folder with no required structure; the original is stored untouched in the record with time and source. | Must |
| FEED-2 | **Drafted destinations**: a labelled planner step proposes where an item could go (feature candidate, roadmap input, gate evidence, knowledge page, question for a step, amendment suggestion, note) and what it found (overlap, matching ticket); no option is pre-selected. | Must |
| FEED-3 | **Nothing is decided by feeding**: routing is a person's recorded choice; a fed item is evidence or a wish, never a requirement, approval or move; it never blocks a factory and never escalates or expires. | Must |
| FEED-4 | **Trail**: every use of a fed item shows *from your feed* and links to the original; the original lists where it went. Sorting follows the workshop's egress policy; secrets are scanned on capture. | Must |
| FEED-5 | **Take it back**: every reversible destination can be taken back (`feed.unrouted`), and the item returns to *waiting*. | Must |

## How it is proven

**Acceptance:** an item fed as a screenshot and a note is stored untouched, sorted into drafted destinations (only those this build has), routed by a person, and its trail shows *from your feed*; nothing is decided by feeding, and a routed item can be taken back.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- **I** — the planner proposes, a person routes
- **VII** — every route and take-back is recorded
- **VIII** — personal by default, local first

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The Feed](../../docs/concepts/the-feed.md)
- [PRD FEED-1…5](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r27 — Health and broken guarantees](./r27-health-and-broken-guarantees.md) · [index](./README.md) · [r28 — First run](./r28-first-run.md) →
