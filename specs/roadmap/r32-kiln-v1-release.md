# r32 — Cut the kiln-v1 release

> **Roadmap row r32** · phase: Release · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Ship `kiln-v1`: an installer, newcomer docs, a demo factory replaying a committed walk, a release manifest and version — accepted only when a newcomer goes from install to a first Roadmap gate on a real repository in under an hour, on every platform.

## What it delivers

- the installer for macOS, Windows and Linux
- newcomer docs
- the demo factory from a committed replay
- a release manifest and version tag
- the clean-install acceptance test

## Why it exists

- A release is a promise; the acceptance test makes it a checkable one (PRD §7 *Quality of KILN itself*).
- The demo lets people see every gate before deciding anything real.

## Why it sits here

- **Depends on:** [r21](r21-stepping-in.md), [r24](r24-implementation-knowledge-and-workshop-wiki.md), [r26](r26-agents-and-flows.md), [r27](r27-health-and-broken-guarantees.md), [r29](r29-new-codebases.md), [r31](r31-existing-codebases-baseline-territory.md)
- **Unlocks:** [r33](r33-models-beyond-the-machine.md), [r34](r34-bench-notebook-and-research.md), [r36](r36-observability-in-full.md), [r37](r37-factories-anywhere.md), [r42](r42-devices-and-remote-work.md)

Last of the `kiln-v1` rows; depends on every row inside the release line.

## What it builds on

- the old r4–r6 intents (release, installer, docs), now one row

## How it is proven

**Acceptance:** A newcomer installs KILN, runs first setup on a real repository and decides its first Roadmap gate in under an hour — on macOS, Windows and Linux.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

§3.1 goals, M14 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- everything in `kiln-v1.x` (r33–r42)

## Decisions before it starts

- **Blocking:** `kiln-v1` scope decides which rows this depends on

## Risks

- Platform-specific install failures. Mitigation: the acceptance test runs on all three platforms.

## Read more

- [PRD §3.1 goals and §11](../../docs/prd/kiln-prd.md)
- [First run](../../docs/concepts/first-run.md)
