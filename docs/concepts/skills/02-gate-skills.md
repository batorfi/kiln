> Grounded cross-ref index of KILN's gate-level concepts.
> Source-of-truth: `../20260911-kiln-gates-why-how-what.md` (the full gates rationale, move table,
> and headless contract). This file is a *short pointer* to that doc; the gates doc is the
> canonical, persistent home.
>
> KILN deltas vs `pipeline-template`'s gate concept: the gates are unchanged in *sequence and
> move-vocabulary*; what changes is *where the human decides* (in the same TUI as the work) and
> the **headless contract** (a missing UI may *hide* a gate, never *silently approve* one).

# KILN — gate concepts

Nine gates, in order, each a **human** decision with **three moves** (Approve / Revise / Reject;
the **Checkpoint** gate also has **Split+Revise**):

`Concept → Architecture → Spec → Plan → Checkpoint → Review → Verification → Docs → PR`

`small-triage` features **skip Concept + Architecture**.

## What each gate guarantees

| Gate | What it gates a human's decision on | Why the human must be inside (not delegated) |
|---|---|---|
| **Concept** | "is it *worth doing*, and is it *understood*?" | the *whole feature's value* is a human call |
| **Architecture** | "is it *right-shaped* vs the problem?" | the *design's coherence* is the critic's job, the human's *to accept* |
| **Spec** | "are the *user stories* right, and decomposed?" | the *what-will-be-built* is a human call |
| **Plan** | "what *order*, and what *worker* on what *checkpoint*?" | the *execution order* is where the lane's cost is paid |
| **Checkpoint** | "did this *one* unit do what it was told?" (with **Split+Revise**) | the *per-unit progress* is the only thing that runs unattended, and its far side is the *whole-feature* review |
| **Review** | "is the *whole feature's diff* right vs intent?" (two-pass, strongest) | the *whole-feature correctness* is the line the pipeline is *guaranteed* by |
| **Verification** | "does the *running system* actually do each user story?" | the *does-it-work* check is the strongest too |
| **Docs** | "is the *how-to* for a human good enough?" | the *how-to* is a human decision, even if the writer is cheap |
| **PR** | "is the *PR ready to merge?*" (the **APPROVE** move *is* the merge) | the *merge* is the human's decision, period |

## The headless contract

The one rule that keeps the whole thing honest: **a missing UI may *hide* a gate, it may *never
silently approve* one.** In a headless run, each gate becomes a **durable WAIT row** in the
factory log that the human **resumes by token** — and the director *never* advances past a gate
without a verdict.

## KILN delta (vs `pipeline-template`)

The *sequence* and the *move-vocabulary* are unchanged; what's new is **where the human decides**
(*in the same TUI as the work*, not in a dashboard) and the **headless contract** above (a durable
WAIT row the human resumes, never a silent advance).

*See:* `../20260911-kiln-gates-why-how-what.md` for the full rationale, the per-gate move table,
and the deep discussion of the headless contract.
