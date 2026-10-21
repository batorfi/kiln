# r28 — First run

> **Roadmap row r28** · phase: Getting started · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Take a newcomer from install to a first factory waiting at its first Roadmap gate in under an hour: machine check, models recommended and measured, workshop and storage, a first factory with Spec Kit and its constitution, knowledge bootstrapped, and the first roadmap shaped together.

## What it delivers

- `kiln init` (browser or terminal) and `kiln doctor`, resumable and rerunnable
- models recommended from the hardware, checked, bound in `tiers.yaml` — judges on the strongest
- workshop identity (personal signing key) and one KILN home
- the first factory: Spec Kit adopted or added with approval; the constitution confirmed or drafted
- knowledge bootstrap from the repository's docs; the first roadmap shaped with the planner; a demo factory replay
- setup recorded as the first events

## Why it exists

- First use decides whether people adopt KILN; it must be fast, private and honest (`first-run.md`).
- Spec Kit and the constitution are the format and the yardstick of every feature — setup must establish them.
- Everything is files and everything is recorded from the first minute.

## Why it sits here

- **Depends on:** [r17](r17-configuration-as-files.md), [r22](r22-shaping-the-roadmap-together.md), [r23](r23-factory-knowledge-base.md)
- **Unlocks:** [r29](r29-new-codebases.md), [r30](r30-existing-codebases-scan.md)

On configuration (r17), roadmap shaping (r22) and the knowledge base (r23). New and existing codebases (r29–r31) continue from it.

## What it builds on

- the committed walks (r15) as the demo factory

## How it is proven

**Acceptance:** From install to a first Roadmap gate in under an hour on a fresh machine, nothing leaving it.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

SETUP-1…11 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no codebase scan (r30) or walking skeleton (r29)
- no team start or join beyond a preview (r38)

## Decisions before it starts

- Spec Kit upgrades policy; other agent integrations beside Pi (PRD §14)

## Risks

- Model downloads dominating setup time. Mitigation: downloads continue in the background while setup goes on.

## Read more

- [First run](../../docs/concepts/first-run.md)
- [Mockups 61–66](../../docs/concepts/mockups/README.md)
