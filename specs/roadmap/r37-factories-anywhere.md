# r37 — Factories anywhere

> **Roadmap row r37** · phase: kiln-v1.x · release: `kiln-v1.x` (after the release) · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Let factories run beyond the engineer's machine: a host runtime and authenticated channel, hosts joined by approval and measured, placement decided at the Roadmap gate, moves with handover, sleeping hosts, and network failures that never approve anything.

## What it delivers

- the host runtime, separable from the workshop; the authenticated, encrypted host channel
- host join with Operator approval; `kiln host measure`; revocation
- placement at the Roadmap gate with fit checks
- moves with handover: quiesce, transfer, verify, resume
- sleeping hosts; decisions applying on wake, exactly once
- network failure: work on to the next gate, then wait

## Why it exists

- Hardware should never be the ceiling (`factories-anywhere.md`).
- A factory is portable; moving it never changes a decision (constitution XI).

## Why it sits here

- **Depends on:** [r32](r32-kiln-v1-release.md)
- **Unlocks:** [r38](r38-team-space-foundations.md), [r42](r42-devices-and-remote-work.md)

After the release. The team space (r38) and devices (r42) depend on it.

## What it builds on

- one process per factory (r25)

## How it is proven

**Acceptance:** A factory moves between hosts with handover; a network failure approves nothing.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

HOST-2…7, WEB-2 (network), CFG-5 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no team-shared hosts across workshops (r39)

## Decisions before it starts

- Hosts in several workshops; workspace moves; workshop failover; container forms (PRD §14)

## Risks

- A wider security surface. Mitigation: mutual authentication, revocable identities, everything recorded.

## Read more

- [Factories anywhere](../../docs/concepts/factories-anywhere.md)
- [Mockups 33–35](../../docs/concepts/mockups/README.md)
