# The Roadmap gate — *Which feature next, in what order — and how does this factory run?*

> **Type:** explainer. **Phase:** program. **Judge:** none. **Delegable:** never. **Internal id:** `gate0`.
> **Status:** the gate, its moves and its walk are [built] (r13–r15); shaping the roadmap together with a planner, and deciding it on the web, are [planned] (r22, r20).
> [← all twelve gates](./README.md) · next: [1 Concept](./01-concept.md)

## What it decides

Which **one** feature the factory builds next. Nothing is built that a person did not admit here. It is the only gate that decides *what* a factory works on, and the only one that delegation can never reach — not by an armed tail, not by absence, not by a restart.

Approving admits **one** feature, not the list. There is no chaining: when that feature merges, the Roadmap gate opens again.

## Why it exists

A factory that picks its own work picks what is easy. The Roadmap gate keeps the choice with a person, and it keeps the *reasons* with the choice: each row's origin (from you, from the planner, from a candidate, from the team roadmap), what changed since the last approval, and the evidence that the row is ready.

With the feature, the person also settles **how the factory runs** for it: the profile, the egress policy, the budget, where it runs, and the feature's **flow** — the standard twelve gates unless added gates apply. They can **require** an interface gate that the applicability rule would not switch on (never the reverse).

## Before the gate

The roadmap is *shaped together* **[planned]**: the engineer's goals and must-haves, a conversation with the planner, and direct edits with pins, beside the planner's draft from the knowledge base and the record. Every version is checked deterministically. Today the roadmap is a table committed as the gate's document, and the gate waits on it like any other.

## What the person sees first

The features, their order and dependencies; where each row came from; what changed since the last approval; how the factory will run; and, per feature, which gates apply and why. **Approve applies to the exact version of the roadmap the brief was assembled for** — a roadmap that changed after the brief is a different decision.

## The moves

| Move | Note | Where it leads |
|---|---|---|
| **approve** | optional | admits the next feature; it walks to its first gate |
| **revise** | required | the planner redrafts with the note; the gate asks again |
| **reject** | required | **nothing is admitted**; the walk ends *not admitted* and the factory idles |
| **edit-rows**, **add-row**, **drop-row** | optional | the person reshapes the roadmap directly; the gate asks again |

The three row edits belong to this gate and no other.

## In the running example

The roadmap has the row "Reports: export as CSV". The brief shows it came from the engineer's own list, answers their must-have *"finance can take reports into a spreadsheet"*, and that it touches `web/**` — so Experience design and UI review apply, and say why (`path "web/reports/Page.tsx" matches "web/**"`). The person approves. The feature starts; Roadmap is now closed until it merges.

## How it is built

The gate is a durable `kiln.roadmap` task. It holds the admission until a person's move commits; a crash, a restart or a lost connection leaves it waiting. A headless run shows the same `waiting`, recorded the same way. Applicability is evaluated once, **at admission**, from the feature's facts, and pinned for the feature's life: a gate that does not apply is recorded as *not applicable* in the commit that pins it. See [`kiln.roadmap`](../kiln-task-kinds/roadmap.md).

[← all twelve gates](./README.md) · next: [1 Concept →](./01-concept.md)
