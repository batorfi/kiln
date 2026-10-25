# Gate-Rail Contract — flow v2 (constitution v2.1.0)

**Status:** the contract of record for **new work**. It supersedes the first program's rail for everything but verifying its own records.
**Source of truth, in order:** the constitution (`.specify/memory/constitution.md`, *The Flow & The Roadmap*, Principle II) → the PRD (GATE-1, GATE-2,
WORK-2) → the interface-gates concept (`docs/concepts/ui-flow.md`). This file states what they say; `tests/flow-vs-constitution.test.ts` reads all three
and fails if the data in `src/flow/v2.ts` drifts from them.
**v1** — the first program's ten-gate rail, constitution v1.0.0 — is [`legacy/contracts/gate-rail.md`](../../../legacy/contracts/gate-rail.md). It is
kept as data (`src/flow/v1.ts`) so the first program's committed records stay verifiable; nothing new is written under it.

This contract is what a `gate-completion` record's `move` is checked against (rule G3) under the flow the record was made under (rule F).

---

## The flow, v2: the Roadmap gate and eleven feature gates

| Key | Id | Name | The question | Person's moves | Judge |
|---|---|---|---|---|---|
| `gate0` | `gate0` | Roadmap gate | Which feature next, in what order — and how does this factory run? | approve · revise · reject · edit-rows · add-row · drop-row | — |
| `1-concept` | 1 | Concept | Is this worth building, on these premises? | approve · revise · reject | — |
| `2-architecture` | 2 | Architecture | Is this the right structure? | approve · revise · reject | architecture-critic |
| `2a-experience` | `"2a"` | Experience design *(conditional)* | Is this the right experience for these users and journeys, within the charter? | approve · revise · reject | design-critic |
| `3-spec` | 3 | Specification | What exactly counts as done? | approve · revise · reject | — |
| `4-plan` | 4 | Work plan | In what pieces and order will it be built? | approve · revise · reject | — |
| `5-checkpoint` | 5 | Implementation | Do we start from a safe point — and is this still one feature? | approve · split+revise | — |
| `6-review` | 6 | Code review | Is the code right, measured against the specification? | approve · **revise** · restart | code-reviewer |
| `6a-ui-review` | `"6a"` | UI review *(conditional)* | Does the built interface match the approved experience, and is it accessible and consistent? | approve · revise · restart | ui-reviewer |
| `7-verification` | 7 | Verification | Does it actually work as specified? | approve · reject; automatic `mitigate` | verifier |
| `8-docs` | 8 | Documentation | Do the docs describe what was actually built? | approve · revise · reject | — |
| `9-pr` | 9 | Merge | Do we ship it? | approve · reject | — |

## Flow invariants (constitution v2.1.0)

- **Fixed anchors.** The Roadmap gate is first and Merge is last.
- **Built-in gates are never removed.** Experience design and UI review are built in and carry a **deterministic `applies_when`** rule (paths, labels,
  and — for Experience design — the journey predicate; for UI review, the diff predicates). Where the rule is false a gate is recorded as **not
  applicable** with its reason; that is neither a skip nor a settlement. *In r12 the rule is declared as data only (`appliesWhen`); evaluating it and
  recording the outcome are r14/r15.* A flow may only **add** gates.
- **A closed set of move kinds:** approve, revise, reject, restart, split+revise, mitigate (bounded, automatic, never a person's move, never a
  settlement), and the Roadmap gate's row edits (edit-rows, add-row, drop-row). Teams relabel kinds; they never add one. "Approve with a note" is an
  *approve* with a required note, not a new kind.
- **Implementation has no `reject`** (a restorable base, not "done wrong"); **Code review** and **UI review** judge and never author: `revise` sends
  the findings to the workers, `restart` rebuilds from the restorable commit.
- **Verification** `reject` auto-mitigates up to the cap (default **2**, settable 0–3 at the Roadmap gate), then a person waits.
- **Triage skip** may route a small feature past **Concept and Architecture only**; it cannot make an applicable gate not applicable.

## Rules

- **G1 — `gate0` is distinct from the feature gates.** A `gate-completion` names exactly one: `gate0`, an integer 1–9, or `"2a"` / `"6a"` (flow v2 only).
- **G2 / L1 — Every judge runs on the strongest model** (Principle II). The v2 judges are the **architecture critic, design critic, code reviewer, UI
  reviewer and verifier**, and any judge on a gate a team adds. A weaker binding is a refused configuration (`TierPolicyError`, message
  `G2/L1 config error: judge role "…" cannot bind tier "…"; must be "strongest" (P-II)`), on every substrate. Producers (including the UX designer and the
  Docs Synthesizer) may use a cheaper tier. **The Docs Synthesizer is not a judge in v2** (the Documentation gate is unjudged since constitution v2.0.1).
- **G3 — Move integrity.** A record's `move` must be in `MoveVocabulary(gate, flow)`. A gate the record's flow does not have (`"2a"`/`"6a"` under v1) fails
  G3 by name: `gate 2a is not in flow v1`.
- **G4 — Verification mitigation cap** as above.
- **G5 — Checkpoint semantics** unchanged: `split+revise`, no `reject`.
- **F — The `flow` field.** A `gate-completion` payload may carry `flow: "v1" | "v2"`. **Absent means v1**: the first program's records carry none and are
  never rewritten. A validator resolves `record.flow ?? options.defaultFlow ?? v1`; the record's own field always wins. New records (r15 onward) write v2.
  The G3 message names the flow and lists the allowed moves: `move "revise" not in MoveVocabulary(gate=6, flow=v1); allowed: approve, restart`.

## What changed from v1

1. **Code review gains `revise`** (constitution v2.0.1): v1 is `approve · restart`.
2. **Two interface gates** — Experience design and UI review — with `applies_when` (constitution v2.1.0); v1 has neither.
3. **The roster:** v2 adds the design critic and the UI reviewer and drops the Docs Synthesizer; v1's four judges were architecture critic, verifier, code
   reviewer, docs synthesizer.
4. **Plain names:** gate 2 is **Architecture** (v1 `architecture`; the PRD's earlier "Design" is retired).
5. **The mitigation cap** is settable 0–3 (default 2); v1's is fixed at 2.

v2's gates contain v1's and its move sets contain v1's, so every record the first program wrote validates under **both** flows (SC-008).

## Headless contract (Principle V) — unchanged

No surface may silently approve a gate, the Roadmap gate included. A gate with no human move degrades to the only valid unresolved shape: a `wait`
record. A decision needs a human `decidedBy` or a distinct `pre-delegation` record (R3/R4).

---

*Machine-readable mirror:* `src/flow/v2.ts` (v2), `src/flow/v1.ts` (v1), `src/flow/index.ts` (`moveVocabulary`, `moveAllowed`, `gateName`, `hasGate`),
`src/roles.ts` (G2/L1), `src/moves.ts` (move kinds, gate ids). *Specification:* `specs/009-kiln-foundations-reset/contracts/flow-and-records.md`.
