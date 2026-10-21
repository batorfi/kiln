# r19 — Web front door, read-only

> **Roadmap row r19** · phase: Front door · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Open the window: a loopback web server with a per-launch secret, read models built from the record, and a live push — so a person can see every factory, every step and the record in a browser, before anything can be decided there.

## What it delivers

- the workshop server: loopback bind, per-launch secret, Host and Origin checks, protection against forged requests
- read models projected from events; live push; a reconnecting browser resumes from its last sequence number, no polling
- first screens: workshop overview, factory live view, record explorer
- basic metrics from events

## Why it exists

- Seeing before deciding: a read-only front door proves the projections and the security model without any move path to get wrong.
- Surfaces are views, never sources of truth (constitution IX) — this row builds the view layer on that rule.

## Why it sits here

- **Depends on:** [r15](r15-the-record.md)
- **Unlocks:** [r20](r20-gates-on-the-web.md), [r27](r27-health-and-broken-guarantees.md)

It needs only the record (r15), so it can run alongside the workers and director rows; gates on the web (r20) build on it.

## What it builds on

- the state projection from r15; text renderers from the retired terminal UI only where useful for CLI summaries

## How it is proven

**Acceptance:** A second browser tab without the secret sees nothing; a reconnect resumes from its last seq with no polling.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

WEB-1, 2, 4, OBS-1 (basic) — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no moves or commands (r20, r21)
- no remote devices (r42)

## Decisions before it starts

- User-facing words — Factory / Feature / Step, *Knowledge* vs *wiki* (PRD §14)

## Risks

- DNS-rebinding or cross-site requests against a local server. Mitigation: Host/Origin checks and the session secret from day one.

## Read more

- [Design §4 the shape and §19 security](../../docs/concepts/web-front-door.md)
- [The user experience](../../docs/concepts/user-experience.md)
- [Mockups 01, 04, 18](../../docs/concepts/mockups/README.md)
