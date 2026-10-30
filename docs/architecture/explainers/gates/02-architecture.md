# Gate 2 — Architecture — *Is this the right structure?*

> **Type:** explainer. **Phase:** contract. **Judge:** the architecture critic. **Delegable:** never. **Triage:** may be skipped. **Internal id:** `2-architecture`.
> **Status:** the gate, its moves and its judge slot are [built] (r13–r14); the designer and the critic run on real models at [planned] r16.
> [← all twelve gates](./README.md) · [← 1 Concept](./01-concept.md) · next: [2a Experience design](./02a-experience-design.md)

## What it decides

Whether the build would have the **right shape**: module boundaries, data flow, the abstractions it introduces, what it touches and what it deliberately leaves alone.

## Why it exists

To catch a build that would *work* but be wrongly built, while changing it costs a document and not a rewrite. A design can pass every test and still put a dependency in the wrong direction; only a structural review sees that.

## Before the gate

A **designer** proposes a structure and the alternatives it considered. An **architecture critic** — an independent judge on the strongest available model, which holds the lane — reviews it. The designer gets **one answer round** to the critic's objections *before* the person sees anything, so the person decides on a dialogue, not on a raw objection the author never saw.

## What the person sees first

The structure and the alternatives; the critic's objections **by severity**, and how the design answers each; which answers the critic accepts and which it does not. The critic's verdict is evidence. It never decides.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional | the next applicable gate: Experience design if it applies, otherwise Specification |
| **revise** | required | the same designer, with the note; the critic runs again |
| **reject** | required | a fresh designer — or back to Concept, if the note says the premise is wrong |

A reject to Concept re-opens Concept and every gate after it.

## Skipping and delegation

Triage may skip Architecture along with Concept, recorded and shown later. The gate is **never delegable**, and an armed tail only starts at Specification, so the critic's work here is always in front of a person.

## In the running example

The designer proposes a new `GET /reports/:id/export.csv` endpoint that streams rows, and notes the alternative of building the file in the browser. The critic objects: *building it client-side would load the whole report into memory; large reports would stall the tab.* The designer answers: *the server streams.* The critic accepts. The person approves.

## How it is built

The judge is a **role** of the roster (`architecture-critic`). A configuration that binds a judge to anything weaker than the strongest model is refused by name (`G2/L1`). Because the judge holds the lane between its work and the verdict, the same judge sees every attempt.

[← all twelve gates](./README.md) · [← 1 Concept](./01-concept.md) · next: [2a Experience design →](./02a-experience-design.md)
