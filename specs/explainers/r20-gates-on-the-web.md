# r20 — Gates on the web

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Front door |
| **Release** | `kiln-v1` — position 10 of 43 in the committed order |
| **Depends on** | [r18 — The director](./r18-the-director.md), [r19 — Web front door, read-only](./r19-web-front-door-read-only.md) |
| **Unlocks** | [r21 — Stepping in](./r21-stepping-in.md), [r22 — Shaping the roadmap together](./r22-shaping-the-roadmap-together.md), [r23 — The factory knowledge base](./r23-the-factory-knowledge-base.md), [r25 — One workshop, several factories](./r25-one-workshop-several-factories.md), [r44 — KILN in Zed, phase 1](./r44-kiln-in-zed-phase-1.md) |
| **PRD requirements** | BRIEF-1…4, BRIEF-6, WEB-3 (core), WEB-6, DIR-6, EXP-3 (briefs) |
| **Proven when** | a person decides every gate of a real feature in the browser and from the CLI; a move on a stale state version is refused |

## In one paragraph

This is where a person first decides a real feature's gates — in the browser, with the full ten-part gate brief, or from the `kiln` CLI with the same brief as text. It is the row that makes KILN a factory a person can actually run.

## What it delivers

- the ten-part gate brief with its headline, complete before presentation and recorded as seen
- moves bound to the state version they were made against; first move wins; stale moves refused
- Needs you — one inbox for everything waiting on the person
- the CLI as the terminal surface: `kiln status`, `kiln needs`, `kiln gate` with the brief as text and moves through the same intake
- no recommended move in the brief; *request more evidence* additive, costed and policy-bound

## Not in this row

- delegation, steering and risky-action approvals (r21)
- knowledge in briefs (r23)

## Requirements it carries

*As listed in the roadmap: BRIEF-1…4, BRIEF-6, WEB-3 (core), WEB-6, DIR-6, EXP-3 (briefs). Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| BRIEF-1 | Every gate is presented with a **ten-part brief**: orientation, the decision, the work, the yardstick, the evidence, risks and open issues, provenance, history, options with consequences (and the moves not available, and why), other actions. | Must |
| BRIEF-2 | A **headline** travels wherever a gate appears; a move is possible only where the full brief is available. | Must |
| BRIEF-3 | Honest about gaps; complete before presentation; **recorded as seen** with the move. | Must |
| BRIEF-4 | Per-gate emphasis (Roadmap gate: proposal, knowledge context, profile, policy, budget, **host**; Merge gate: end-to-end story and what the feature added to knowledge). | Must |
| BRIEF-6 | **No recommended move**: the brief never recommends or pre-selects a move; KILN's opinion only when asked, as a labelled planner step shown apart from the evidence. **Request more evidence** is additive — no verdict is ever replaced or hidden — costed before it runs, bounded by budget and policy (no count cap), and limited to models the policy allows; needing egress is a policy stop. | Must |
| WEB-3 | Surfaces (from the mockups): workshop overview and *Needs you*; factory live view; **gate brief**; coming back; record and feature record; knowledge; insights; models & policy; hosts; health; people. | Must (core) / Should (rest) |
| WEB-6 | **The CLI is the terminal surface**: `kiln status`, `kiln needs` and `kiln gate` show the same projections as the browser, the gate brief as plain text, and make moves through the same move intake under the same rules — a move only where the full brief has been shown, bound to the state version it was made against. | Must |
| DIR-6 | **Needs you**: one inbox per person across factories, workshop and team space, in three sections — waiting on you, suggestions, worth knowing — each item with its headline and what it blocks; ordered by stakes, blocking others, then waiting time; never decides or expires anything. Each person may choose the order (oldest first by default, teammates first, by factory); ordering never hides an item. | Must |
| EXP-3 | **Interface gates**: Experience design (after Architecture) and UI review (after Code review) are built into the default flow, with deterministic `applies_when`, recorded as *not applicable* otherwise; UXG-1…10 in the concept. | Must |

## How it is proven

**Acceptance:** a person decides every gate of a real feature in the browser and from the CLI; a move on a stale state version is refused.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~recommending a move; limits on more evidence~~ — **decided 2026-10-21**: no recommendation in the brief, only on request and labelled; more evidence additive, costed, policy-bound (§14.6, BRIEF-6)

## Rules it must keep

- **I** — a person decides
- **V** — a move only where the full brief is shown
- **IX** — the browser and the CLI share one intake

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The user experience §8 — the gate brief](../../docs/concepts/user-experience.md)
- [The flow](../../docs/concepts/the-flow.md)
- [PRD §6.8 and WEB-6](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r19 — Web front door, read-only](./r19-web-front-door-read-only.md) · [index](./README.md) · [r21 — Stepping in](./r21-stepping-in.md) →
