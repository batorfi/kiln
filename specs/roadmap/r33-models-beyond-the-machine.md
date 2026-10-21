# r33 — Models beyond the machine

> **Roadmap row r33** · phase: kiln-v1.x · release: `kiln-v1.x` (after the release) · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Open KILN beyond local models by choice: a model catalog with locality, profiles per factory, per-role routing with cross-family judging, an egress policy checked before every request, budgets that pause, and policy stops that ask instead of working around.

## What it delivers

- the model catalog: locality, version, family, capabilities, cost, data handling
- profiles: `local-only` (default, provable), `hybrid`, `remote-first`
- per-role routing; cross-family judging where policy requires
- egress policy checked before each request (secrets scan, redaction); everything sent recorded
- budgets that pause; fallback only by policy; judges never fall back silently
- policy stops in Needs you

## Why it exists

- Some teams need a stronger judge or more capacity than local models give (`web-front-door.md` §13).
- Leaving the machine must be a decision, never a reflex (constitution VIII).

## Why it sits here

- **Depends on:** [r32](r32-kiln-v1-release.md)
- **Unlocks:** — (nothing depends on it)

After the release: the local-only workshop is complete without it, and it changes nothing built before.

## What it builds on

- the provider seam in `workers` (r16)

## How it is proven

**Acceptance:** A hybrid factory's cloud judge sees only what policy allows; a local-only factory reaches nothing beyond loopback.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

MOD-1…5, HITL-3, CFG-6 (remote) — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no remote hosts (r37)

## Decisions before it starts

- Egress policy language and model-family identity (PRD §14)

## Risks

- Content leaking through a provider. Mitigation: checks before sending, records after, `local-only` provable by the network check.

## Read more

- [Design §13 models beyond the machine](../../docs/concepts/web-front-door.md)
- [Configuration §5](../../docs/concepts/configuration.md)
- [Mockups 12, 14](../../docs/concepts/mockups/README.md)
