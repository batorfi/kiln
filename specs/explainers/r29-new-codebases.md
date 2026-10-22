# r29 — New codebases

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Getting started |
| **Release** | `kiln-v1` — position 19 of 41 in the committed order |
| **Depends on** | [r26 — Agents and flows](./r26-agents-and-flows.md), [r28 — First run](./r28-first-run.md) |
| **Unlocks** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md), [r41 — New codebases, the rest](./r41-new-codebases-the-rest.md) |
| **PRD requirements** | GREEN-1…5 |
| **Proven when** | an empty repository reaches a merged walking skeleton that builds and passes from a clean clone |

## In one paragraph

Starting from an empty repository, intent comes before code: a product brief, a constitution written from it, technology decisions made by a person — and a walking skeleton first, proven from a clean clone.

## What it delivers

- the repository created with Spec Kit, files shown before the first commit
- a product brief, and a constitution written from it with each principle citing its origin
- technology decisions recorded by a person as decision pages — no starter templates
- a walking skeleton on the foundation flow (standard flow, no triage skip), verified from a clean clone; for a library, build, test, CI, packaging and one public function end to end

## Not in this row

- conventions enforcement, slices and growing into brownfield (r41)
- research and spike evidence for decisions (r35)

## Requirements it carries

*As listed in the roadmap: GREEN-1…5. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| GREEN-1 | **Start empty**: create the repository, add Spec Kit (files shown before the first commit), local-only by default; always a KILN-managed worktree. | Must |
| GREEN-2 | **Product brief**: problem, users, outcomes, non-goals, constraints, quality attributes, success measures — written or drafted with the planner, approved, a knowledge page *from a person*; feeds the roadmap brief. | Must |
| GREEN-3 | **Constitution written from the brief** with `speckit.constitution`, each principle citing its origin; approved before the first feature; amendments recorded and versioned. | Must |
| GREEN-4 | **Technology decisions**: open choices listed, evidence from research steps and spikes where the bench is available (M13), decided by a person, recorded as decision pages (and constitution amendments where binding); later Design gates measure against them. No starter templates: choices start open; prior decisions in workshop knowledge are evidence, never defaults; no built-in Decisions gate (decision pages appear in the Design brief). | Must |
| GREEN-5 | **Walking skeleton first**, on a **foundation flow** (standard + `no_triage_skip`): layout, build, tests, CI, formatter/linter, one end-to-end path, quickstart, conventions page; Verification from a clean clone. For a library, build, test, CI, packaging and one public function end to end through the public API is a complete skeleton. | Must |

## How it is proven

**Acceptance:** an empty repository reaches a merged walking skeleton that builds and passes from a clean clone.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~starter templates, library skeleton, Decisions gate~~ — **decided 2026-10-21**: no templates; a library skeleton is build, test, CI, packaging and one public function; no built-in Decisions gate (GREEN-4, 5)

## Rules it must keep

- **VI** — every feature admitted at the Roadmap gate
- **I** — technology choices are a person's

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [New codebases](../../docs/concepts/greenfield.md)
- [PRD §6.20](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r28 — First run](./r28-first-run.md) · [index](./README.md) · [r30 — Existing codebases, part 1: profile and full scan](./r30-existing-codebases-part-1-profile-and-full-scan.md) →
