# r19 — Web front door, read-only

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Front door |
| **Release** | `kiln-v1` — position 9 of 43 in the committed order |
| **Depends on** | [r15 — The record](./r15-the-record.md) |
| **Unlocks** | [r20 — Gates on the web](./r20-gates-on-the-web.md), [r27 — Health and broken guarantees](./r27-health-and-broken-guarantees.md) |
| **PRD requirements** | WEB-1, 2, 4, OBS-1 (basic), EXP-6 |
| **Proven when** | a second browser tab without the secret sees nothing; a reconnect resumes from its last seq with no polling |

## In one paragraph

The first screens: a local web front door that shows the factory live, built on the record's read models and pushed events. It is read-only by design — it proves the surface is a window onto committed state before it is allowed to carry any move.

## What it delivers

- a loopback server with a per-launch secret, Host and Origin checks and CSRF protection; `decided_by` will come from the session
- read models with live push; a reconnecting browser resumes from its last event sequence number — no polling
- the first screens: workshop overview, factory live view, record explorer
- basic metrics derived from events

## Not in this row

- moves and the gate brief (r20)
- network-shared access (r37)

## Requirements it carries

*As listed in the roadmap: WEB-1, 2, 4, OBS-1 (basic), EXP-6. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| WEB-1 | A local server (Node, no runtime framework required) serving read models and a live event push; moves and commands as requests. | Must |
| WEB-2 | **Session security**: loopback bind, per-launch secret, Host/Origin checks, CSRF protection; `decided_by` from the session. Network-shared workshop: TLS and the team's identity provider. | Must / Should |
| WEB-4 | A reconnecting browser resumes from its last `seq`; no polling. | Must |
| OBS-1 | **Metrics** derived from events (human loop, quality, cost, throughput, model behaviour). | Must (core) |
| EXP-6 | **KILN's own charter and design system** are approved before the web front door's screens. | Must |

## How it is proven

**Acceptance:** a second browser tab without the secret sees nothing; a reconnect resumes from its last seq with no polling.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~user-facing words~~ — **decided 2026-10-21**: Factory / Feature / Step; *flow* = gate sequence only; people see *Knowledge*; metaphor in name and docs only (§14.5)

## Rules it must keep

- **IX** — one committed state; surfaces driven by events, never a source of truth
- **VIII** — loopback only

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [The web front door](../../docs/concepts/web-front-door.md)
- [The user experience](../../docs/concepts/user-experience.md)
- [PRD §6.7](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r18 — The director](./r18-the-director.md) · [index](./README.md) · [r20 — Gates on the web](./r20-gates-on-the-web.md) →
