# r37 — Factories anywhere

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | kiln-v1.x |
| **Release** | `kiln-v1.x` — position 33 of 42 in the committed order |
| **Depends on** | [r32 — Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) |
| **Unlocks** | — |
| **PRD requirements** | HOST-2 (separate), HOST-3…7, WEB-2 (network), CFG-5, TEAM-9 |
| **Proven when** | a factory moves between hosts with handover; a network failure approves nothing |

## In one paragraph

Factories stop being tied to the workshop's machine: they run on any host — a team GPU server, a cloud machine — placed by a person, moved without losing a step, and sleeping while they wait at gates.

## What it delivers

- hosts that join by an Operator's approval, with revocable identities and a mutually authenticated, encrypted channel
- placement at the Roadmap gate with fit checks; local-only factories only on local hosts
- moves with handover; sleeping hosts with moves applied on wake, exactly once
- network failure that never approves anything
- shared hosts serving several member workshops; a network-shared workshop with real authentication

## Not in this row

- —

## Requirements it carries

*As listed in the roadmap: HOST-2 (separate), HOST-3…7, WEB-2 (network), CFG-5, TEAM-9. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| HOST-2 | **Host runtime** separable from the workshop; a single machine runs both by default. | Must (in-process) / Should (separate) |
| HOST-3 | Hosts join by an Operator's approval, receive revocable identities, and talk over a mutually authenticated, encrypted host channel. | Should |
| HOST-4 | **Placement** at the Roadmap gate with fit checks (policy, models, capacity, cost); `local-only` factories only on local hosts. | Should |
| HOST-5 | **Moves** with handover (fit check, quiesce, transfer store/workspace/wiki, resume); never change a decision. | Should |
| HOST-6 | **Sleeping hosts**: suspend when all factories wait; decisions *applying on wake*, exactly once. | Should |
| HOST-7 | **Network failure**: hosts work on to the next gate; no gate settled while unreachable; records catch up in order. | Should |
| WEB-2 | **Session security**: loopback bind, per-launch secret, Host/Origin checks, CSRF protection; `decided_by` from the session. Network-shared workshop: TLS and the team's identity provider. | Must / Should |
| CFG-5 | **Hosts**: join with Operator approval, `kiln host measure`, capacity, pins, sleep, `serves`, revoke. | Should |
| TEAM-9 | **Shared hosts** serving several member workshops with isolated leases, stores and secrets. | Should |

## How it is proven

**Acceptance:** a factory moves between hosts with handover; a network failure approves nothing.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- workspace moves; workshop failover; container forms; other storage adapters (§14.8 — hosts in several workshops already answered: yes)

## Rules it must keep

- **XI** — a factory is portable; moving never changes a decision
- **V** — an unreachable host is absence
- **VIII** — authenticated, encrypted connections beyond loopback

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [Factories anywhere](../../docs/concepts/factories-anywhere.md)
- [PRD §6.12](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r36 — Observability in full](./r36-observability-in-full.md) · [index](./README.md) · [r46 — Explore: as-is specifications](./r46-explore-as-is-specifications.md) →
