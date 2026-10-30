# Gate 2a — Experience design — *Is this the right experience for these users and journeys, within the charter?*

> **Type:** explainer. **Phase:** contract. **Judge:** the design critic. **Delegable:** never. **Applies:** only when the feature touches the interface. **Internal id:** `2a-experience`.
> **Status:** the gate, its applicability rule and its recording are [built] (r12–r14); the ux designer and the design critic are [planned] (r16, r17).
> [← all twelve gates](./README.md) · [← 2 Architecture](./02-architecture.md) · next: [3 Specification](./03-specification.md) · full definition: [ui-flow §4](../../../concepts/ui-flow.md)

## What it decides

What the interface **should be** — the journeys it serves, the screens, every state each screen can be in, the content and the interactions — before any of it is built.

## Why it exists

So the specification can say "done" in terms of **approved screens**, and so UI review has something real to compare the build against. The yardstick is the factory's **experience charter** (and design system), pinned at the version the feature was admitted under.

## Does it apply?

This is a **built-in gate with a deterministic rule**, evaluated once at admission and pinned. It applies when **any** of these is true — they combine with *or*:

* a path of the row matches `web/**`, `app/**`, `**/*.tsx`, `**/*.vue`, `**/*.css` or `design/**`;
* the row has the label `ui`;
* the row cites at least one charter **journey** step.

A fact that was not supplied counts as *false* — never a guess, never "apply by default" — and the recorded reason says so. A person may **require** the gate at the Roadmap gate; they cannot switch it off once it applies. If it does not apply, it is recorded **not applicable** with its reason: no task waits, no judge runs, nobody is asked, and the walk continues. That is not a skip.

## Before the gate

A **ux designer** drafts `experience.md` and mockups against the charter. Deterministic checks run first. The **design critic** — a different conversation, on the strongest model, holding the lane — then judges the result.

## What the person sees first

The journey steps served; the mockups beside the screens they change; the **states matrix**; the charter ids the design cites; the critic's findings.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional — use it for *open points* that UI review should carry | Specification |
| **revise** | required | the same ux designer, with the note |
| **reject** | required | a fresh designer — or an earlier gate the note names (Architecture, Concept) |

## Delegation

**Never delegable.** An experience is a judgement about people, and an armed tail never starts before Specification anyway.

## In the running example

The row touches `web/reports/Page.tsx`, so the gate applies. The designer proposes the export button's place, its states (idle, preparing, ready, failed) and the wording. The critic flags that *failed* has no recovery action. The person revises: *"failed must offer retry."* After the redo, they approve with an open point: *"the empty-report case is deferred"* — carried to UI review as an accepted deviation.

For a feature that touches no interface — a database migration, a CLI flag — this gate is recorded *not applicable* at admission and never appears again.

## How it is built

The rule is data (`appliesWhen` in `flow/v2.ts`), evaluated by a pure function (`applicability()`): same facts, same bytes. The reason is canonical JSON, which is what lets the walk record it **exactly once** and a restart repeat the same reason.

[← all twelve gates](./README.md) · [← 2 Architecture](./02-architecture.md) · next: [3 Specification →](./03-specification.md)
