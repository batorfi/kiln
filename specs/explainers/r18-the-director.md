# r18 — The director

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Director |
| **Release** | `kiln-v1` — position 8 of 43 in the committed order |
| **Depends on** | [r14 — Gates as data, walked headless](./r14-gates-as-data-walked-headless.md), [r17 — Configuration as files](./r17-configuration-as-files.md) |
| **Unlocks** | [r20 — Gates on the web](./r20-gates-on-the-web.md), [r26 — Agents and flows](./r26-agents-and-flows.md) |
| **PRD requirements** | DIR-1…5 |
| **Proven when** | the same situation yields the same next step every time; planner drafts that fail checks never reach a person |

## In one paragraph

The director is the deterministic code that runs each feature's flow — what comes next, in what order, on which model — with an LLM **planner** for the parts that need judgment. Its drafts are checked by rules before anyone sees them, and it never decides a gate.

## What it delivers

- the deterministic core executing a feature's pinned flow
- affinity ordering of steps, and capped automatic fix rounds at Verification
- the planner role — on the strongest model by default — drafting roadmap proposals, work plans and splits, each with reasons and citations
- deterministic checks on every draft; a failing draft goes back to the planner, never to a person
- the planner never changes a row the engineer wrote; it may only propose
- answers from the record with citations

## Not in this row

- shaping the roadmap together in the browser (r22)
- Needs you (r20)

## Requirements it carries

*As listed in the roadmap: DIR-1…5. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| DIR-1 | The director is **deterministic code** (the roadmap and row tasks); LLM-assisted proposals run as ordinary steps. | Must |
| DIR-2 | It proposes roadmaps (citing knowledge), plans units, orders them by affinity, applies moves, runs fix rounds, drafts record digests. It never decides a gate. | Must |
| DIR-3 | Commands — start a row, arm delegation, pause after step, abort step, accept/reject a proposal, move a factory — are idempotent commits. | Must |
| DIR-4 | A conversational interface to the director answers from the record with citations; talking never moves a gate. | Should |
| DIR-5 | The **planner** is an LLM role run as a step; its drafts (roadmap proposals, work plans, splits, synthesis answers) are labelled, checked by deterministic rules before display, and decided by people. The planner runs on the **strongest** model by default (an Operator may bind it lower, recorded), and it never changes a row the engineer wrote — it may only propose a change. | Must |

## How it is proven

**Acceptance:** the same situation yields the same next step every time; planner drafts that fail checks never reach a person.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~the planner's limits~~ — **decided 2026-10-21**: strongest model by default; only proposes changes to rows the engineer wrote (PRD DIR-5)

## Rules it must keep

- **I** — the planner drafts, people decide
- **IV** — affinity ordering
- **VI** — the director never admits a feature

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The director and Needs you](../../docs/concepts/the-director.md)
- [PRD §6.4](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r17 — Configuration as files](./r17-configuration-as-files.md) · [index](./README.md) · [r19 — Web front door, read-only](./r19-web-front-door-read-only.md) →
