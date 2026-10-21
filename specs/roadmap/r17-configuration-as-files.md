# r17 — Configuration as files

> **Roadmap row r17** · phase: Workers · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Make configuration plain, reviewed files: roles as `agents/*.md`, the tier map with judges bound to the strongest model, `kiln check config` and `kiln check model` — every change checked, recorded and applied from the next step.

## What it delivers

- `kiln.config/` with workshop, providers (local), model catalog, roles, tier map and per-factory settings
- `kiln check config`: all-or-nothing validation, refusing a weaker judge binding
- `kiln check model`: measured capabilities, re-checked on version change
- configuration history: who, before, after
- changes applied from the next step, never mid-step

## Why it exists

- Configuration as code makes behaviour reviewable and reversible (`configuration.md` K1–K7).
- The strongest-judge rule must be impossible to configure away (constitution II).
- Measured model capabilities stop a role from being bound to a model that cannot do its job.

## Why it sits here

- **Depends on:** [r16](r16-real-local-workers.md)
- **Unlocks:** [r18](r18-the-director.md), [r28](r28-first-run.md)

Right after real workers, which it configures. Before the director, which relies on the tier map.

## What it builds on

- `src/roles.ts` tier policy (`TierPolicyError`) ported in r12

## How it is proven

**Acceptance:** A weaker judge binding is refused; a config change applies from the next step and is recorded with before/after.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

CFG-1, 3, 4, 6 (local), 7 (roles), 8 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no host files (r37), no remote providers (r33), no try-runs of role changes (r26)

## Decisions before it starts

- none open

## Risks

- Config drift edited outside KILN. Mitigation: checks on load; Health flags a failing check (r27).

## Read more

- [Configuration](../../docs/concepts/configuration.md)
