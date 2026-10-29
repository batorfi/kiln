# Gate 1 — Concept — *Is this worth building, on these premises?*

> **Type:** explainer. **Phase:** contract. **Judge:** none. **Delegable:** never. **Triage:** may be skipped. **Internal id:** `1-concept`.
> **Status:** the gate and its moves are [built] (r13–r14); the researcher and concept writer are [planned] (r16).
> [← all twelve gates](./README.md) · [← Roadmap](./00-roadmap.md) · next: [2 Architecture](./02-architecture.md)

## What it decides

Whether the idea is worth building at all, **on the premises it rests on**. Not how, and not what exactly — only: is the problem real, is the scope right, and are the assumptions underneath it believable.

## Why it exists

It is the cheapest place to stop a wrong idea. At this point nothing exists but a document, so *no* costs a page. Every later gate inherits this one's premises, so a premise that is wrong here is wrong everywhere downstream.

## Before the gate

A **researcher** gathers what the knowledge base, the code and the permitted sources say. A **concept writer** then states the problem, the premises, the scope and — as important — what is *out of* scope.

## What the person sees first

The problem and the premises; what the concept rests on (cited pages, research, spikes) and **which premises are unproven**; what is explicitly out of scope.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional | the next applicable gate: Architecture |
| **revise** | required | the same concept writer, with the note; the concept is redone |
| **reject** | required | a fresh concept writer — **or the roadmap**: the feature leaves the lane, its work stays in the record, and the Roadmap gate re-opens |

Concept and [Merge](./09-merge.md) are the only two gates whose reject may target the roadmap. There is no "earlier gate" to name here other than that.

## Skipping and delegation

Triage may **skip** Concept (with Architecture) for a small, well-scoped feature; the skip and its reasoning are recorded and shown in every later brief. A flow may forbid skipping. Concept is **never delegable**: an armed tail starts later, at Specification.

## In the running example

"Export Reports as CSV" is small and well-scoped, so triage could skip this gate. Suppose it does not: the concept says the problem is *finance retypes report tables by hand*, the premise *CSV is what their spreadsheet opens* is marked **unproven** (no one asked), and out of scope is *any other format*. The person revises: *"ask finance what they open it in first."* The writer redoes the concept with that note, and the person approves.

## How it is built

A durable gate task, like every gate: it opens whole, waits, and settles only on a committed move. A skipped Concept never opens a task; the skip is recorded once, in the commit that makes it. Rejecting to the roadmap ends the feature's walk without a merge and re-opens the Roadmap gate.

[← all twelve gates](./README.md) · [← Roadmap](./00-roadmap.md) · next: [2 Architecture →](./02-architecture.md)
