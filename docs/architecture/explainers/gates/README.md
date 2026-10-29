# KILN's twelve gates — an explainer

> **Type:** explainer — for understanding, not a specification. **Audience:** engineers and the people who will make the moves; no prior knowledge of KILN's internals is assumed.
> **Status tags:** **[built]** exists and is proven (rows r12–r15); **[planned]** is designed in the concept documents or the roadmap and not built yet.
> **Where this page and the contracts differ, the contracts govern:** [gate-rail.md](../../../../kiln/packages/contracts/gate-rail.md) (what executes) · [`flow/v2.ts`](../../../../kiln/packages/contracts/src/flow/v2.ts) (the data) · [the flow](../../../concepts/the-flow.md) (the concept) · [ui-flow](../../../concepts/ui-flow.md) (the two interface gates).
> **Companions:** [the task kinds behind a gate](../kiln-task-kinds/gate.md) · [how the record works](../the-record.md) · [vocabulary](../../../vocabulary.md)

## 1. What a gate is

A **gate** is a place in a feature's life where KILN stops and a person decides. Agents do the work before it, independent **judges** check that work, and a **brief** puts everything the person needs in front of them. Then the gate *waits* — as long as it takes. Nothing a clock, a restart, a crashed server or a missing screen does can decide it. The person makes a **move**; the move and the gate's completion are one atomic commit; the work goes where the move says.

KILN has **twelve** gates: the **Roadmap gate**, which admits one feature, and **eleven feature gates** the admitted feature walks, in three phases. Two of the eleven apply only when the feature touches the interface.

| Phase | Gate | The question it asks |
|---|---|---|
| program | [**Roadmap**](./00-roadmap.md) | Which feature next, in what order — and how does this factory run? |
| contract | [**1 Concept**](./01-concept.md) | Is this worth building, on these premises? |
| contract | [**2 Architecture**](./02-architecture.md) | Is this the right structure? |
| contract | [**2a Experience design**](./02a-experience-design.md) *(when the feature touches the interface)* | Is this the right experience for these users and journeys, within the charter? |
| contract | [**3 Specification**](./03-specification.md) | What exactly counts as done? |
| contract | [**4 Work plan**](./04-work-plan.md) | In what pieces and order will it be built? |
| build and prove | [**5 Implementation**](./05-implementation.md) | Do we start from a safe point — and is this still one feature? |
| build and prove | [**6 Code review**](./06-code-review.md) | Is the code right, measured against the specification? |
| build and prove | [**6a UI review**](./06a-ui-review.md) *(when the feature touches the interface)* | Does the built interface match the approved experience, and is it accessible and consistent? |
| build and prove | [**7 Verification**](./07-verification.md) | Does it actually work as specified? |
| release | [**8 Documentation**](./08-documentation.md) | Do the docs describe what was actually built? |
| release | [**9 Merge**](./09-merge.md) | Do we ship it? |

```
  PROGRAM    CONTRACT
  Roadmap ─► 1 Concept ─► 2 Architecture ─► 2a Experience design ─► 3 Specification ─► 4 Work plan
  gate        ╰─ triage may skip both ─╯   (when UI)
     ▲
     │      BUILD AND PROVE
     │      5 Implementation ─► 6 Code review ─► 6a UI review ─► 7 Verification
     │                                            (when UI)
     │      RELEASE
     │      8 Documentation ─► 9 Merge ─┐
     └────────── the Roadmap gate re-opens after every merge ◄──┘
```

The ordering follows one belief: **it is cheap to stop early and expensive to stop late.** Scope is decided before structure, structure before the contract, the contract before code. The Specification gate fixes what "done" means, and from then on Code review and Verification measure against it — never against taste.

## 2. The five moments every gate goes through

| Moment | What happens | Guarantee |
|---|---|---|
| **1. Work** | the author's steps run on the lane | judges are never steered |
| **2. Evidence** | the judge (on judged gates) and deterministic checks run | a judge's verdict is evidence, never a decision |
| **3. Brief** | the ten-part brief is assembled | the gate is not "waiting for a person" until it is complete |
| **4. Waiting** | the gate is a durable task in `waiting` | no clock, restart or missing screen settles it |
| **5. Move** | a person makes a move | the move and the completion are one commit; the first committed move wins |

## 3. The moves, and the one rule about them

The set of move kinds is closed: **approve**, **revise**, **reject**, **restart**, **split+revise**, and — at the Roadmap gate only — **edit-rows, add-row, drop-row**. Beside them, **mitigate** belongs to the factory at Verification and is never a person's. "Approve with a note" is an approve with a note, not a new kind.

| Move | Needs a note | Where the work goes |
|---|---|---|
| **approve** | optional | the next *applicable* gate; everything is kept |
| **revise** | required | the same author, with the note as its instruction; the artifact, then this gate's checks and judge, are redone |
| **reject** | required | a fresh author at this gate — or an **earlier gate the note names**; every gate after the target opens again. Only at Concept and Merge may the target be the roadmap. Verification's reject goes to the code |
| **restart** | required | a fresh build from the restorable commit (Code review, UI review) |
| **split+revise** | required | the feature keeps part of the work; the rest becomes a new roadmap row (Implementation) |

**Re-crossing.** When work goes back, every gate after the target opens again. A gate is never carried across a change it did not see, and there is no lighter confirmation for an unchanged gate — the brief says *unchanged since the approval on …* and the decision is still a person's.

## 4. Three outcomes that are not decisions

A gate can be passed without a person's move in exactly three recorded ways, and none of them is an approval:

* **Not applicable** — the gate's deterministic `applies_when` rule is false (only Experience design and UI review carry one). Recorded once, with the rule and what each part of it found. No task waits; nobody is asked.
* **Skipped** — triage judged the feature small and well-scoped and skipped **Concept and Architecture**. Recorded with its reasoning, shown in every later brief. Nothing else can be skipped.
* **Delegated** — the person who approved the Specification armed the *unattended tail*; a clean gate then settles as *approved under delegation*, naming the delegation, never a person. Any objection ends it. **[planned]** (r21).

Each page below says which of these can reach that gate.

## 5. What is built, and what is not

| | Status | Row |
|---|---|---|
| Every gate's definition — question, moves, notes, targets, judge, triage, delegation — as data, checked by `kiln check flow` | [built] | r12, r14 |
| The durable gate task: opens whole, waits, settles only on a committed move, the move and the completion in one commit | [built] | r13 |
| The walk: opens each next gate headless, applies each move's consequence, evaluates and records *not applicable* and *skipped*, runs Verification's bounded fix rounds, ends at Merge | [built] | r14 |
| Every state change as an event in the commit that makes it, so the history of any gate can be read back | [built] | r15 |
| Real local workers and judges (the work *between* gates is a scripted stand-in until then) | [planned] | r16 |
| The director, and the gate brief assembled for a person | [planned] | r18, r20 |
| Gates decided on the web; the unattended tail | [planned] | r20, r21 |

So today a feature can be walked through all twelve gates from the CLI (`kiln feature admit | next | move | state`, `kiln gate move`), every gate waits and records exactly as described, and the consequence of every move is the real one. What fills the time *between* gates is scripted.

## 6. The running example

Every page uses one made-up feature, so the gates read as one story: **"export the Reports page as CSV"** — a button on a web page, a new endpoint behind it, and a short guide. It touches `web/**`, so both interface gates apply. The pages say what changes for a feature that does not (a database migration, say): two gates are recorded *not applicable* and the walk goes on.

Read in order, or jump to the gate you need.
