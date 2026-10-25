# r54 — The Feed, the rest

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 32 of 43 in the committed order |
| **Depends on** | [r53 — The Feed](./r53-the-feed.md), [r35 — The bench, part 2: spikes and candidates](./r35-the-bench-part-2-spikes-and-candidates.md), [r39 — Team space, part 2](./r39-team-space-part-2.md) |
| **Unlocks** | — |
| **PRD requirements** | FEED-6, 7 |
| **Proven when** | a note fed from the editor lands in the notebook labelled *fed*; one item shared to the team changes no team artifact by itself; a watched folder is off until turned on and listed in *Changes* |

## In one paragraph

The rest of the Feed: once the bench exists, a fed item can be kept as a note in the private notebook or become a feature candidate; one item can be shared to the team on purpose; and a watched folder can feed items in when the person turns it on.

## What it delivers

- keep as a note (notebook, labelled *fed*) and feature candidate as destinations
- share a single item to the team as an explicit act that changes no team artifact by itself
- an opt-in watched inbox folder and capture from other surfaces, listed in *Models & policy → Changes*

## Not in this row

- —

## Requirements it carries

*As listed in the roadmap: FEED-6, 7. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| FEED-6 | **Share to the team** is an explicit act on a single item and never changes a team artifact by itself. | Could |
| FEED-7 | **Watched inbox folder** and capture from other surfaces (editor, phone) are opt-in and listed in *Models & policy → Changes* when turned on. | Could |

## How it is proven

**Acceptance:** a note fed from the editor lands in the notebook labelled *fed*; one item shared to the team changes no team artifact by itself; a watched folder is off until turned on and listed in *Changes*.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- **XII** — sharing is an explicit act
- **VIII** — off until turned on

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The Feed](../../docs/concepts/the-feed.md)
- [PRD FEED-6, FEED-7](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r35 — The bench, part 2: spikes and candidates](./r35-the-bench-part-2-spikes-and-candidates.md) · [index](./README.md) · [r36 — Observability in full](./r36-observability-in-full.md) →
