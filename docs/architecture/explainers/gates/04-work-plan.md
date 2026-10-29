# Gate 4 — Work plan — *In what pieces and order will it be built?*

> **Type:** explainer. **Phase:** contract. **Judge:** none (deterministic checks). **Delegable:** by default (covered by an armed tail). **Internal id:** `4-plan`.
> **Status:** the gate and its moves are [built] (r13–r14); the planner and the model-order computation are [planned] (r16–r18).
> [← all twelve gates](./README.md) · [← 3 Specification](./03-specification.md) · next: [5 Implementation](./05-implementation.md)

## What it decides

How the work is **cut and ordered**: the tasks, what each traces to in the specification, and the order they run.

## Why it exists

The order is not cosmetic. KILN runs one lane, and the lane has a resident model; the order of tasks decides how often a model must be swapped, and so what the feature costs in machine time. In a team it also decides which paths the feature will **claim**, which teammates see.

## Before the gate

A **planner** cuts the specification into tasks, each tracing to requirements. The director computes the model order, the expected swaps and the machine time. In a team, the plan is checked for overlap with teammates' claims. Deterministic checks confirm that every requirement is covered by some task.

## What the person sees first

The tasks and their order, mapped to requirements; the model order and expected cost; overlap with claims and protected paths; any task that touches a path an *added* gate applies to.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional | Implementation |
| **revise** | required | the same planner, with the note |
| **reject** | required | a fresh plan — or back to Specification, if the plan shows the specification was the problem |

A reject to Specification re-opens Specification, Work plan and every gate after it.

## Skipping and delegation

Cannot be skipped. **Delegable by default**: under an armed tail a clean plan settles as *approved under delegation*.

## In the running example

Four tasks: the endpoint (R1, R3), streaming for large reports (R2), the button and its states, the short guide. The plan runs the two server tasks back to back so the model is loaded once. No teammate claims `web/reports/`. The person approves.

## How it is built

Ordinary gate: a durable task that opens whole, waits and settles on a committed move. The restore point is *not* here — it is made at the next gate.

[← all twelve gates](./README.md) · [← 3 Specification](./03-specification.md) · next: [5 Implementation →](./05-implementation.md)
