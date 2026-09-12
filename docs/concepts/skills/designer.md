> Status: ground-up concept
> Type: skill — Architecture Designer (proposes the architecture, before the critic)
> Companion docs: `../concept.md` (vision), `../process-flow.md`
>
> Grounding: the "skill" framing follows `pipeline-template`'s `architecture-designer/SKILL.md`; the
> KILN-specific tiering (standard head + separate strongest critic) and the lane placement are
> ground-up KILN ideas. `proposal.md` is the artifact's real content.

# KILN — Architecture Designer: a proposal that survives the critic *and* the human gate

## 0. KILN vs pipeline framing

The **architecture designer** is a *work* role — it **proposes** the architecture for a feature
(its `proposal.md`) so that a separate, independent **architecture critic** can tear at it and the
human can judge it at the **Architecture gate**. The designer does **not** approve its own
architecture; the critic and the gate do. This mirrors `pipeline-template`'s designer/critic
split; KILN's deltas are the **model-tiering** (standard head) and the **single-lane** placement —
the designer runs, yields the lane, the critic runs next (often on the resident strongest model),
then the gate waits for the human.

## 1. Purpose

Produce the **architecture proposal** — components, data flow, interfaces, and *the explicit
design decisions and their rationale* — for the concept that just passed its gate. It is the
artifact the **critic** critiques and the **human** approves or rejects.

**Inputs:** the approved **concept** (and the `context.md` it was built on).
**Output:** `proposal.md` — components, data flow, the interfaces between them, and each decision
with its *reason*, not just its choice.

## 2. What must happen

- The proposal must be **critiquable**: it states enough that a critic can find weaknesses, not a
  vague aspiration.
- It must **name the decisions and their rationale** — a proposal that says "use X" without "why X
  and not Y" is not yet an architecture, it's a wish.

## 3. What must NOT happen (this discards the "pick the obvious thing" reading)

- **Do not self-approve** — the designer proposes; the **critic** and the **Architecture gate**
  decide. A designer that blesses its own work has removed the only check.
- **Do not design past the feature's scope** — the concept bounded it; the proposal serves the
  concept, not a grander vision.
- **Do not bury the rationale** — a reviewer or critic who can't see *why* a decision was made can't
  judge it. Explicit rationale is the deliverable, not an afterthought.

## 4. Model tiering (KILN)

The **architecture designer** is a **work** pass on a **standard head** — it proposes, and its
boundaries are the **critic + the gate behind it**. The **architecture critic** that critiques the
proposal is a **line-of-defense pass at the strongest model** — the check the pipeline is
*guaranteed* by runs on the best. This **producer/counterpart at standard, the independent check at
strongest** pattern is what makes a cheaper producer acceptable: a gate sits on the far side of it.

## 5. Gate / role

- **Gate:** the **Architecture gate** (one of the nine; one of the skippable pair for small-triage
  features).
- **Placement:** runs *after* the concept gate, *before* the critic. In the lane: it is an
  **execution unit**, so it holds and yields like any work unit; because it is **standard-tier**,
  it may run on the resident standard model without a swap, or trigger one.

This is a good unit for the **model-affinity queue**: a standard-head proposal right after a
standard-head concept means **no swap**, just a lane hold — exactly the cost-minimizing pattern the
director's scheduler is built for.

## 6. Grounding

`pipeline-template/skills/architecture-designer/SKILL.md` — *"You are a dedicated ephemeral pane
spawned to **propose** the architecture … you do NOT decide the architecture. The critic evaluates
the proposal, and the human decides the gate."* Inputs: the approved concept. Outputs: `proposal.md`
reporting ready to the director. Must-NOTs: no deciding the architecture (that's the critic + gate),
no proposing a solution without considering alternatives. KILN deltas (§4 tiering, §5 lane
placement / swap economics) are ground-up.

*The designer proposes; the critic judges; the human decides — and the designer's job is to give
both something worth judging.*
