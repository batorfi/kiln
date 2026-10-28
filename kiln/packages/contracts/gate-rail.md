# Gate-Rail Contract — flow v2 (constitution v2.1.0)

**Status:** the contract of record for **new work**, and — since r14 — a description of what **executes**: the walk of a feature runs this flow from its data, and `kiln check flow` refuses a flow that
breaks it. It supersedes the first program's rail for everything but verifying its own records.
**Source of truth, in order:** the constitution (`.specify/memory/constitution.md`, *The Flow & The Roadmap*, Principle II) → the PRD (GATE-1 … GATE-6, FLOW-1 … FLOW-7, EXP-3) → the concept documents
(`docs/concepts/the-flow.md` §7–§12, `docs/concepts/ui-flow.md`). This file states what they say; `tests/gate-rail-drift.test.ts` **parses this file** and fails, naming the gate and the field, when it
disagrees with the data in `src/flow/v2.ts`; `tests/flow-vs-constitution.test.ts` ties that data to the constitution, the PRD and `ui-flow.md`.
**v1** — the first program's ten-gate rail, constitution v1.0.0 — is [`legacy/contracts/gate-rail.md`](../../../legacy/contracts/gate-rail.md). It is kept as data (`src/flow/v1.ts`) so the first program's committed
records stay verifiable; nothing new is written under it, and a walk is never run under it.

This contract is what a `gate-completion` record's `move` is checked against (rule G3) under the flow the record was made under (rule F), and what the walk (`packages/durable/src/walk/`) executes.

---

## 1. The flow, v2: the Roadmap gate and eleven feature gates

| Key | Id | Name | The question | Person's moves | Judge | Needs a note | Triage | Delegable |
|---|---|---|---|---|---|---|---|---|
| `gate0` | `gate0` | Roadmap gate | Which feature next, in what order — and how does this factory run? | approve · revise · reject · edit-rows · add-row · drop-row | — | revise, reject | — | never |
| `1-concept` | 1 | Concept | Is this worth building, on these premises? | approve · revise · reject | — | revise, reject | skippable | never |
| `2-architecture` | 2 | Architecture | Is this the right structure? | approve · revise · reject | architecture-critic | revise, reject | skippable | never |
| `2a-experience` | `"2a"` | Experience design *(conditional)* | Is this the right experience for these users and journeys, within the charter? | approve · revise · reject | design-critic | revise, reject | — | never |
| `3-spec` | 3 | Specification *(arms the tail)* | What exactly counts as done? | approve · revise · reject | — | revise, reject | — | never |
| `4-plan` | 4 | Work plan | In what pieces and order will it be built? | approve · revise · reject | — | revise, reject | — | default |
| `5-checkpoint` | 5 | Implementation *(the restore point)* | Do we start from a safe point — and is this still one feature? | approve · split+revise | — | split+revise | — | default |
| `6-review` | 6 | Code review | Is the code right, measured against the specification? | approve · revise · restart | code-reviewer | revise, restart | — | default |
| `6a-ui-review` | `"6a"` | UI review *(conditional)* | Does the built interface match the approved experience, and is it accessible and consistent? | approve · revise · restart | ui-reviewer | revise, restart | — | never |
| `7-verification` | 7 | Verification | Does it actually work as specified? | approve · reject | verifier | reject | — | default |
| `8-docs` | 8 | Documentation | Do the docs describe what was actually built? | approve · revise · reject | — | revise, reject | — | default |
| `9-pr` | 9 | Merge | Do we ship it? | approve · reject | — | reject | — | explicit |

*Needs a note:* a corrective move carries a note, which **becomes the next step's instruction** (GATE-5); an `approve` may carry one without becoming another kind.
*Delegable:* the unattended tail (r21 acts on it; r14 only carries and checks the rule) is armed at Specification alone and covers the gates after it — `default` is covered by the tail, `explicit` only if the
person includes it (Merge), `never` is never crossed by delegation. The Roadmap gate accepts **no** delegated move.
The automatic `mitigate` of Verification is the factory's, not a person's, and is in no gate's person vocabulary.

## 2. Where moves lead

Each row is `kind@gate` (with `→target` when the move names one); the drift test runs every row through the engine (`consequence()`), so this table cannot disagree with what executes. *Goes to* is the gate the
work returns to (`@build`: the code itself, after the restore point and before Code review). *Re-crossed* lists the gates whose approvals no longer stand — each opens again, none is carried across a change it did
not see, and there is **no lighter confirmation**. A gate recorded *not applicable* or *skipped* is not re-crossed: there is nothing to cross.

| Move | Goes to | Re-crossed | Work |
|---|---|---|---|
| `revise@3-spec` | `3-spec` | — | author |
| `revise@6-review` | `6-review` | — | workers |
| `revise@6a-ui-review` | `6a-ui-review` | — | workers |
| `reject@4-plan` | `4-plan` | — | author |
| `reject@4-plan→3-spec` | `3-spec` | 3-spec, 4-plan, 5-checkpoint, 6-review, 6a-ui-review, 7-verification, 8-docs, 9-pr | author |
| `reject@7-verification` | `@build` | 6-review, 6a-ui-review, 7-verification, 8-docs, 9-pr | workers |
| `reject@7-verification→3-spec` | `3-spec` | 3-spec, 4-plan, 5-checkpoint, 6-review, 6a-ui-review, 7-verification, 8-docs, 9-pr | author |
| `reject@1-concept→roadmap` | `roadmap` | — | none |
| `reject@9-pr→roadmap` | `roadmap` | — | none |
| `restart@6-review` | `@build` | 6-review, 6a-ui-review, 7-verification, 8-docs, 9-pr | rebuild |
| `restart@6a-ui-review` | `@build` | 6-review, 6a-ui-review, 7-verification, 8-docs, 9-pr | rebuild |
| `split+revise@5-checkpoint` | `4-plan` | 4-plan, 5-checkpoint, 6-review, 6a-ui-review, 7-verification, 8-docs, 9-pr | author |
| `revise@gate0` | `gate0` | — | author |
| `reject@gate0` | `not-admitted` | — | none |

Beyond the table: `approve` opens the next **applicable** gate; a **reject** names its target (`target`), or goes to a fresh author at the same gate — except at Verification, where it goes to the code; the roadmap is a
target at Concept and Merge **only**; Implementation has no `reject` (a restorable base, not "done wrong"); a person may send the **feature** back to an earlier gate **at any time** (a feature-level `reject`: it withdraws an
open gate without settling it, or is applied at the walk's next wake — a step running at that moment is ignored, not committed). At the Roadmap gate, `revise` and the row edits (`edit-rows`, `add-row`, `drop-row`) ask
again with the note; a `reject` admits nothing and the walk ends *not admitted*.

## 3. Applicability: `applies_when`, evaluated

Experience design and UI review are **built in** and carry a **deterministic** `applies_when` rule — paths and labels, and for Experience design the journeys the row cites; for UI review the diff predicates
(`ui_files_changed`, `tokens_changed`, `routes_changed`). The walk **evaluates** it (`applicability()`; no model, no clock):

* **Once, at admission**, from the feature's facts and any gate a person **required** at the Roadmap gate; the answer is **pinned** for the feature's life. Predicates combine with **or**; a fact that was not supplied is
  `absent` and counts **false**, and the reason says so. A required gate applies whatever the rule says.
* Where the rule is false the gate is recorded **not applicable**, with a **reason** (the rule, what each predicate found, the verdict) — canonical JSON, so the same facts give the same bytes. That is neither a skip
  nor a settlement: no gate task waits, no judge runs, no person is asked, and the walk continues. It is recorded **exactly once**, in the commit that pins it.
* **UI review alone** may turn on later: at its own slot, if it was pinned not applicable and not required, the diff predicates are read; if one is true it becomes applicable (recorded as such) and opens. **Nothing
  turns an applicable gate off**, and Experience design never changes after admission.

## 4. Shortcuts and bounds

* **Triage skip** may route a small feature past **Concept and Architecture only**, with its reasoning recorded and shown in every later brief. A person may override it at the Roadmap gate; a flow may forbid it
  (`no_triage_skip`). It **cannot** skip Documentation or any judged gate after Architecture, and it **cannot** make an applicable gate not applicable. *Skipped*, *not applicable* and *settled* are three different
  recorded outcomes.
* **Verification's fix rounds:** before the gate opens for a person the factory runs at most **cap** automatic rounds (a worker fixes, the same verifier checks again): default **2**, settable **0–3** at the Roadmap
  gate. Each round is a `mitigate` by the factory, recorded in the commit that starts it; it is never a person's move and never a settlement. After a person's `reject` there are no more automatic rounds.
* **The unattended tail** may be armed only at the Specification gate and never at the Roadmap gate or at an added gate; any objection ends it (r21).

## 5. Flow invariants (constitution v2.1.0) — enforced by `kiln check flow`

* **Fixed anchors.** The Roadmap gate is first and Merge is last; nothing comes after Merge.
* **Built-in gates are never removed**, and keep this order. Experience design sits directly after Architecture and UI review directly after Code review; no other gate carries `applies_when`. A flow may only **add**
  gates (r26).
* **A closed set of move kinds:** approve, revise, reject, restart, split+revise, mitigate (bounded, automatic, never a person's move, never a settlement), and the Roadmap gate's row edits (edit-rows, add-row,
  drop-row). Teams relabel kinds; they never add one. A row edit belongs to the Roadmap gate only. "Approve with a note" is an *approve* with a note, not a new kind.
* **Every move has a rule** (its note, where it leads); a corrective move requires a note; a reject only ever goes **back** (an earlier gate, `@build`, or — at Concept and Merge — the roadmap); `restart` needs a
  restore point before it; automatic rounds state a cap within 0–3; every judge is a judge role of the roster; nothing in the placement loops.

## 6. Rules

* **G1 — `gate0` is distinct from the feature gates.** A `gate-completion` names exactly one: `gate0`, an integer 1–9, or `"2a"` / `"6a"` (flow v2 only).
* **G2 / L1 — Every judge runs on the strongest model** (Principle II). The v2 judges are the **architecture critic, design critic, code reviewer, UI reviewer and verifier**, and any judge on a gate a team adds. A
  weaker binding is a refused configuration (`TierPolicyError`, message `G2/L1 config error: judge role "…" cannot bind tier "…"; must be "strongest" (P-II)`), on every substrate. Producers (including the UX
  designer and the Docs Synthesizer) may use a cheaper tier. **The Docs Synthesizer is not a judge in v2** (the Documentation gate is unjudged since constitution v2.0.1).
* **G3 — Move integrity.** A record's `move` must be in `MoveVocabulary(gate, flow)`. A gate the record's flow does not have (`"2a"`/`"6a"` under v1) fails G3 by name: `gate 2a is not in flow v1`.
* **G4 — Verification mitigation cap** as in §4.
* **G5 — Checkpoint semantics:** `split+revise`, no `reject`.
* **F — The `flow` field.** A `gate-completion` payload may carry `flow: "v1" | "v2"`. **Absent means v1**: the first program's records carry none and are never rewritten. A validator resolves `record.flow ??
  options.defaultFlow ?? v1`; the record's own field always wins. New records write v2. The G3 message names the flow and lists the allowed moves: `move "revise" not in MoveVocabulary(gate=6, flow=v1); allowed:
  approve, restart`.

## 7. What changed

**From v1:** Code review gains `revise` (constitution v2.0.1); two interface gates with `applies_when` (v2.1.0); the roster adds the design critic and the UI reviewer and drops the Docs Synthesizer; gate 2 is
**Architecture**; the mitigation cap is settable 0–3 (default 2). v2's gates and move sets contain v1's, so every record the first program wrote validates under **both** flows (SC-008).
**From r12's text of this file (r14):** the rule is no longer something the data merely carries — it is evaluated, pinned and recorded; the move semantics of §2, the notes, the targets, triage, the cap and the arming
rule are data, checked by `kiln check flow` and executed by the walk.

## 8. Headless contract (Principle V) — unchanged

No surface may silently approve a gate, the Roadmap gate included. A gate with no human move degrades to the only valid unresolved shape: a `wait` record — the same `waiting`, recorded the same way. A decision
needs a human `decidedBy` or a distinct `pre-delegation` record (R3/R4). A restart, a crash, a lost connection or a clock never settles a gate.

---

*Machine-readable mirror:* `src/flow/v2.ts` (v2), `src/flow/v1.ts` (v1), `src/flow/engine.ts` (`consequence`, `next`, `targetsOf`, `earlierThan`, `triage`, `cap`), `src/flow/applies.ts` (`applicability`,
`atUiSlot`), `src/flow/validate.ts` (`validateFlow`), `src/flow/index.ts` (`moveVocabulary`, `moveAllowed`, `gateName`, `hasGate`), `src/roles.ts` (G2/L1), `src/moves.ts` (move kinds, gate ids).
*Specifications:* `specs/009-kiln-foundations-reset/contracts/flow-and-records.md`, `specs/012-gates-as-data-walked-headless/contracts/`.
