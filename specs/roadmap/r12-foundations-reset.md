# r12 — Foundations reset

> **Roadmap row r12** · phase: Foundation · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Start the new codebase cleanly: create the package layout the PRD defines, freeze the old Pi-extension code in `legacy/`, and port every part of the old code that still expresses a rule KILN keeps — with its tests — so the restart begins from proven ground instead of from zero.

## What it delivers

- the `kiln/packages/` layout (contracts, record, durable, lane, workers, director, knowledge, workshop, host, team, bench, server, web, cli), `checks/`, `fixtures/`, `legacy/`
- `legacy/` holding the r1–r9 code, frozen — the Pi extension and terminal UI retired
- `packages/contracts`: the standard flow and the closed set of move kinds as data (from `move-vocabulary.ts`), the strongest-judge tier policy (from `roles.ts`), the schemas
- `packages/lane`: the affinity scheduler (from `scheduler.ts`); `packages/record`: the factory-log and roadmap validators
- `checks/`: the never-vacuous network check, generalised to per-host allowlists
- CI running every test on macOS, Windows and Linux

## Why it exists

- The old code proved the core rules — the move rules, the judge policy, affinity, the validators. Rewriting them would throw away tested behaviour (PRD §10).
- A frozen `legacy/` keeps the old product runnable as evidence while making it impossible to extend by accident (PRD risk *two products during the transition*).
- Three-platform CI from the first row prevents a feature from ever being "done" on one platform only (PRD §7 *Platforms*).

## Why it sits here

- **Depends on:** — (first row)
- **Unlocks:** [r13](r13-durable-core.md)

It is first because everything else lands in the layout it creates and depends on the contracts it ports. It has no dependencies.

## What it builds on

- `contracts/move-vocabulary.ts`, `contracts/gate-rail.md` → standard flow as data
- `src/roles.ts` → tier policy · `src/scheduler.ts` → affinity scheduler · `src/clock.ts`
- `schemas/*.json`, `validate/_core.ts`, `log.ts`, `roadmap.ts`, `_report.ts`, `_netscan.ts`
- `tests/contract`, `tests/negative`, `tests/netscan`, `tests/scheduler`, `tests/switch-cost` — moved with their modules

## How it is proven

**Acceptance:** New layout builds and every ported test is green **on macOS, Windows and Linux** in CI; legacy frozen; `kiln check` runs the network check.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

GATE-1/2, WORK-2, LANE-2, EVT-5 (validators) — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no durable tasks yet (r13), no events (r15), no models (r16), no UI (r19)
- no new behaviour — this row moves and organises; it does not invent

## Decisions before it starts

- Platforms — decided: macOS, Windows and Linux (2026-10-21)
- Terminal surface — decided: retired (2026-10-20)

## Risks

- Ported tests that pass vacuously after the move — the netscan lesson from r7. Mitigation: every check must fail when its subject is removed.

## Read more

- [PRD §8 architecture and §10 what we keep](../../docs/prd/kiln-prd.md)
- [The architecture explainer](../../docs/architecture/explainers/kiln-architecture.md)
