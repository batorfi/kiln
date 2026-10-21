# r13 — Durable core and the gate contract

> **Roadmap row r13** · phase: Durable core · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Put KILN's most important promise — *nothing approves by absence* — into the substrate. Build the Pi Durable seam and the five durable task types, with the gate contract as a durable state machine, and prove it by killing the process at every step.

## What it delivers

- `packages/durable`: the one module that imports Pi Durable
- durable task types: roadmap, row (the director for one feature), unit (one step), gate, lane
- the **gate contract**: open (commit the gate document and brief), wait (a durable waiting task), decide (the move and the gate's completion in one atomic commit, exactly once, first move wins, stale moves refused), hand back
- the lane task: at most one running generation per factory
- a resolved answer to *how a move completes a waiting task from outside* (CORE-6), upstream with Pi Durable where possible

## Why it exists

- Every later promise — gates on the web, delegation, devices, hosts sleeping — rests on this contract. If it is wrong, nothing above it is trustworthy (constitution V).
- Making gates durable tasks means *headless* needs no special mode and a restart needs no recovery code: a waiting gate resumes as waiting (`pi-durable.md`).
- CORE-6 is the PRD's biggest technical risk; settling it first keeps it from surfacing late.

## Why it sits here

- **Depends on:** [r12](r12-foundations-reset.md)
- **Unlocks:** [r14](r14-gates-as-data.md), [r16](r16-real-local-workers.md)

Right after the foundations, before anything that opens gates or runs steps. It is the riskiest foundation, so it goes as early as possible.

## What it builds on

- `src/gate.ts` WAIT, token and pre-delegation logic → gate-task steps
- `src/lane.ts` single-lane invariant → lane task

## How it is proven

**Acceptance:** Kill the server at every step of a gate task: it resumes, waits, and settles only on a committed move — proven on all three platforms.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

CORE-1…6, LANE-1 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no gate *names* or flow data beyond what tests need (r14)
- no event stream yet (r15) — the record follows immediately

## Decisions before it starts

- The Pi Durable primitive for completing a waiting task from outside (PRD §14, CORE-6) — answered inside this row

## Risks

- Pi Durable is experimental. Mitigation: one seam, pinned versions, the contract stated independently of the API, an RPC fallback driver.
- Windows is the least proven platform for the substrate — the kill-and-resume proof runs on all three.

## Read more

- [KILN on Pi Durable](../../docs/concepts/pi-durable.md)
- [Design §5 the factory as a durable task graph](../../docs/concepts/web-front-door.md)
- [The flow §5 anatomy of every gate](../../docs/concepts/the-flow.md)
