> Status: ground-up concept
> Type: skill — Code Reviewer (line-of-defense, the whole-feature review)
> Companion docs: `../concept.md` (vision), `../gates-why-how-what.md`
>
> Grounding: the "skill" framing and the two-pass / architecture-critic split follow
> `pipeline-template`'s `code-reviewer/SKILL.md`; the KILN-specific deltas (strongest-resident
> tiering, single-lane placement, and that the per-checkpoint gates are what makes a cheaper worker
> acceptable before this one) are ground-up KILN ideas.

# KILN — Code Reviewer: a whole-feature review that *cannot* miss, on the strongest model

## 0. KILN vs pipeline framing

The **code reviewer** is the **whole-feature** code review: after a feature's work has passed every
checkpoint, the reviewer examines the **entire diff against the feature's intent** before it can
advance to verification. This mirrors the *whole-feature* role of `pipeline-template`'s
code-reviewer. KILN's deltas: it is a **line-of-defense role**, so it **always runs on the
strongest resident model** even on a local setup, and it sits in the **single lane** after the
per-checkpoint gates and before the Verification gate. It is *not* a per-checkpoint pass — that
happens at each checkpoint by a separate, lighter review.

## 1. Purpose

Examine the **entire feature's diff** against **what the feature was supposed to do** — intent,
concept, spec, and ADRs — and report what is **wrong, missing, or out of scope**, *before the*
code reaches the verifier and a human PR. It is the "is the code right, not just does it compile?"
pass.

This is a **quality** execution unit (a line-of-defense pass), distinct from the per-checkpoint
review that happens earlier and cheaper.

## 2. Inputs

- The **whole-feature diff** — every change since the feature's work started.
- The **feature's intent** — the concept, the spec, the user stories, and any governing ADRs.

## 3. Output

A **review report** — findings, each tied to a specific intent or to something out of scope —
reported ready to the director, which then opens the **Review gate**.

## 4. What must NOT happen (the "rubber-stamp" failure mode)

- **Do not rubber-stamp** — a green review without reading the diff against intent is a false
  guarantee; the pipeline is only as right as this pass is.
- **Do not review per-checkpoint as the whole-feature review** — the per-checkpoint gates are a
  *separate, lighter* pass; conflating them lets a feature-level problem slip through.
- **Do not fix the code yourself** — the reviewer *finds*; the fix is a **Revise** move back to a
  worker. A reviewer that edits becomes the gate, and the pipeline loses its independence.
- **Do not decide the gate** — the **Review gate** is a human decision; the reviewer only reports.

## 5. Why this is the strongest tier

Because a cheaper **worker** wrote the code under the per-checkpoint gates, the whole-feature
**review** is the first time the *strongest* mind has seen the *entire* feature at once. The
strongest-resident requirement on a **local** setup matters here: a weak review at the whole-feature
stage is expensive to find later (in production). The cost is paid *now, on the strongest*, to keep
it out of the *far end* of the lane.

## 6. Two-pass pattern (the discipline that makes it whole, not per)

`pipeline-template` runs this as a **two-pass check**: a **first pass catches the obvious**; a
**second pass catches what the first pass's blindness lets through** (the reviewer reads its own
first findings and asks "what did I *not* notice?"). The **architecture critic is separate** — it
critiques the *design*, not the *code*; conflation is the named failure. KILN keeps both: the
reviewer does the two-pass over the *code*, the architecture critic does its own pass over the
*design*, each on the strongest, each feeding the human gate.

## 7. Gate / role

- **Gate:** the **Review gate** (one of the nine; *not* skippable — even small-triage features
  get it).
- **Role:** **quality** (line-of-defense), strongest resident model.

## 8. Grounding

`pipeline-template/skills/code-reviewer/SKILL.md` — *"a dedicated ephemeral pane spawned to review
a feature's **full diff** before it advances to the **verification gate**."* Inputs: the full diff
+ intent (concept, spec, stories, ADRs). Output: a review report to the director. Must-NOTs: no
rubber-stamping, no reviewing *during* the gate, no *editing* code, no *deciding* the gate. Two-
pass pattern; architecture critic is separate. KILN deltas (§5 strongest tiering, §6 two-pass as
KILN's discipline, §7 single-lane placement) are ground-up.

*The reviewer is the last independent mind on the whole feature: strongest, two-pass, and it
reports — it never fixes, never decides.*
