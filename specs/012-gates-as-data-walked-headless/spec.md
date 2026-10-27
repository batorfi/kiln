# Feature Specification: Gates as data, walked headless (row r14)

**Feature Branch**: `012-gates-as-data-walked-headless`

**Created**: 2026-10-27

**Status**: Draft — ready for `/speckit-clarify` or `/speckit-plan`; the one open question (GATE-4's scope, FR-044) was answered on the recommended option on 2026-10-27. Roadmap row **`r14`** is the **admitted next row** (Roadmap gate, `human@batorfi`, entry 5 of `gate0.note` in [specs/ROADMAP.md](../ROADMAP.md)). It stays `queued` — never `active` — until its own first gate opens (`chain_unattended=false`). **Nothing here admits a program, advances a gate, decides a gate or edits the roadmap** (constitution VI).

**Input**: the row **`r14`** — *"Gates as data, walked headless — the standard flow (Roadmap gate + eleven feature gates; Experience design and UI review carry a deterministic applies_when and are recorded as not applicable when it is false) executed from data with the closed set of move kinds and `kiln check flow` for the default flow; a scripted interface feature walks all eleven feature gates and a non-interface one the nine that apply, from the CLI, and both survive kill-and-resume at every gate."* Dependency **r13** (`done`, `@PR#6`). PRD requirements carried: **GATE-3, GATE-4, GATE-5, GATE-6, FLOW-1, FLOW-2, FLOW-3, FLOW-7 (default flow), EXP-3**. Governing text: constitution 2.1.0 (*The Flow & The Roadmap*, Principles I, V, VI, VII), [`docs/concepts/the-flow.md`](../../docs/concepts/the-flow.md) §6–§8, §11–§12, [`docs/concepts/ui-flow.md`](../../docs/concepts/ui-flow.md) §3–§6, [`docs/prd/kiln-prd.md`](../../docs/prd/kiln-prd.md) GATE-*, FLOW-*, EXP-3. Explainer: [`specs/explainers/r14-gates-as-data-walked-headless.md`](../explainers/r14-gates-as-data-walked-headless.md).

**Provenance (what r14 builds on, and does not re-open).**
- **r12** ported the standard flow as **versioned data** (`v1` the first program's ten-gate rail; `v2` the twelve-gate flow of constitution 2.1.0), the closed set of move kinds, and the record validators. The two interface gates **declare** their `applies_when` rule in v2; nothing evaluates it, and nothing records "not applicable". Evaluating it is this row's.
- **r13** built the gate contract: a gate opens whole, a move and its gate's completion are one commit, keyed exactly once, first move wins, no clock settles a gate; one owner per store, a private local channel and a thin `kiln gate` CLI; task shells for roadmap, row, unit, gate and lane. Its **brief is opaque**, its **task bodies are shells**, and **where work goes after `revise` or `reject` is not decided there** — the contract settles a gate and stops. Those three are this row's inputs, not its questions. r13's own proof of kill-at-every-step is reused here, not rebuilt.
- The **move semantics** are decided: [`the-flow.md` §11–§12](../../docs/concepts/the-flow.md) (accepted 2026-10-21): where `reject` goes, re-crossing, the fix-round cap, no Documentation skip, Code review's `revise`. This row **implements** them; it does not reopen them.
- The legacy contract [`kiln/packages/contracts/gate-rail.md`](../../kiln/packages/contracts/gate-rail.md) was rewritten for v2 data in r12 but still describes *declared data only* and the "evaluation is r14/r15" caveat; the roadmap's decisions table (*r12 / r14*) makes r14 the row that rewrites it to match what now executes.

## Clarifications

### Session 2026-10-27

- Q: GATE-4 (the unattended tail) is carried by r14, but the roadmap's acceptance never mentions delegation and r21 owns arming. How far does r14 go? → A: **Rule as data and check only** — the arming rule is in the flow data and `kiln check flow` refuses invalid arming; arming, delegated crossings and ending at an objection are r21's (FR-044).

## User Scenarios & Testing *(mandatory)*

The "users" of this row are the **Operator** (the person who runs a factory and decides its gates — here, at a terminal, through the CLI, since no screen exists yet) and the **engineer** of the rows after r14 (r15 records the walk, r18 directs it, r20 puts it on the web, r26 adds gates from files), who must build on a flow that is data and a walk that is trustworthy. Nothing here has a graphical surface; the proofs are scripted walks, crashes and restarts, and the interface is the CLI and the flow data.

### User Story 1 - A feature walks every gate of the flow, from data, from the CLI (Priority: P1)

An **interface feature** — one that touches the user interface — is admitted at the Roadmap gate and then walks **all eleven feature gates** in order: Concept, Architecture, Experience design, Specification, Work plan, Implementation, Code review, UI review, Verification, Documentation, Merge. Each gate opens whole, waits for a person's move, takes that move through the CLI, and the next gate opens. Which gate comes next, which moves a gate offers and what a move does are read **from the flow's data**, not from a sequence written into the program. At Merge the feature is done and the Roadmap gate would re-open for the next one.

**Why this priority**: this is the row's acceptance. "Gates as data" means a flow that is data actually *runs* — until then r12's flow is a table nobody executes.

**Independent Test**: from a clean store, run the scripted interface feature end to end using only the CLI; count the gates that opened, were decided and closed, and check each was decided by a move that the flow data allows at that gate.

**Acceptance Scenarios**:

1. **Given** a factory whose Roadmap gate has admitted an interface feature, **When** the script approves each gate in turn through the CLI, **Then** exactly eleven feature gates open, one at a time and in the flow's order, and each is settled by one committed move.
2. **Given** a gate that is open, **When** a move is sent whose kind is not in that gate's vocabulary (for example `reject` at Implementation, or `restart` at Concept), **Then** it is refused and nothing is written — the vocabulary comes from the data.
3. **Given** the flow data is changed by one gate (a gate renamed, a vocabulary narrowed), **When** the same walk runs, **Then** the walk follows the changed data with no change to any program — and a change that breaks an invariant is caught by `kiln check flow`, not discovered mid-walk (User Story 4).
4. **Given** the walk reaches Merge and it is approved, **Then** the feature is complete and no gate opens after it.
5. **Given** the same script run twice on two clean stores, **When** the two walks are compared, **Then** the sequence of gates, moves and outcomes is identical.

---

### User Story 2 - A non-interface feature walks the nine gates that apply; the other two are recorded as not applicable (Priority: P1)

A feature that does **not** touch the interface walks the same flow, but **Experience design** and **UI review** are evaluated against their deterministic `applies_when` rule, found false, and recorded as **not applicable — with the reason**. Nothing settles them, no judge runs for them, no person is asked, and the walk goes on to the next gate. The result is **nine** gates opened and decided. Not applicable is a *recorded outcome of the gate's own rule*, never a skip and never a settlement; a person who wants the gate anyway can require it at the Roadmap gate and then it applies like any other.

**Why this priority**: the second half of the acceptance, and the first place the flow is not a straight line. Getting "not applicable" right — deterministic, recorded, never decided by absence — is what keeps the interface gates from becoming either dead weight on every feature or a loophole for interface features.

**Independent Test**: run the scripted non-interface feature; verify nine feature gates opened, two recorded "not applicable" each with a reason that names the rule and the facts it was evaluated on; run it again with the same facts and get the same result; run it with the gate required and see all eleven.

**Acceptance Scenarios**:

1. **Given** a feature whose paths, labels, cited journeys and changed files do not meet an interface gate's rule, **When** the walk arrives at that gate's place, **Then** the gate is recorded *not applicable* with its reason, no gate task waits, and the next gate opens.
2. **Given** the same facts evaluated twice, **When** the rule is applied, **Then** the answer and the reason are identical — the rule uses no model and no clock.
3. **Given** an interface feature, **When** the rule is evaluated at Experience design (using the feature's paths, labels and cited journeys) and again at UI review (using what was actually changed), **Then** both apply and both gates open.
4. **Given** a feature for which a person required an interface gate at the Roadmap gate though its rule is false, **When** the walk arrives there, **Then** the gate applies and opens, and the record says it was required, not that the rule was true.
5. **Given** Experience design applied but the facts at UI review (what was actually built) no longer meet UI review's rule, **When** the walk arrives at UI review, **Then** it is recorded not applicable with the reason it was evaluated on — and a gate that applied earlier is never turned into "not applicable" *in flight* by anything but its own rule on the facts then in force.
6. **Given** a "not applicable" outcome, **When** a move is sent for that gate, **Then** it is refused: there is nothing to decide.

---

### User Story 3 - A walk survives being killed at every gate, and nothing is approved by a restart (Priority: P1)

The walk is interrupted — the owner is killed with a hard signal — at every gate of both walks: while a gate is opening, while it waits, between a move and the next gate's opening, while a "not applicable" outcome is being recorded, and while a gate is being re-crossed. After each restart the walk **continues from where it was**: a waiting gate is still waiting, a settled gate is still settled with one move, the next gate opens exactly once, and **no gate was settled by the restart**. Nothing is approved by absence, by a crash, or by a clock (constitution V).

**Why this priority**: it is the constitution's central testable promise (V) applied to the whole flow instead of to one gate. r13 proved the gate; r14 must prove the *walk between gates* — the new places where state can be half-done (a gate settled but the next not yet open; an outcome decided but not recorded).

**Independent Test**: run each scripted walk once per kill point (kill at every named step of every gate transition), restart, finish the walk, and compare each result to the uninterrupted walk: same gates, same moves, same outcomes, one move per gate, no extra approvals — judged by a fresh reader of the store that has no owner.

**Acceptance Scenarios**:

1. **Given** a gate settled by a move, **When** the owner is killed after that commit but before the next gate opens, **Then** on restart the next gate opens exactly once and the settled gate is unchanged.
2. **Given** a walk at a "not applicable" decision point, **When** the owner is killed at any step of evaluating and recording it, **Then** on restart the gate is recorded not applicable exactly once, or the evaluation is made again with the same result — never recorded twice, never recorded with a different reason.
3. **Given** a waiting gate in the middle of a walk, **When** the owner is killed and restarted more times than the library's crash-loop limit, **Then** the gate is still waiting, the walk has advanced nowhere, and the next valid move commits.
4. **Given** any kill point in either walk, **When** the walk is finished after the restart, **Then** the sequence of gates, moves and outcomes equals the uninterrupted walk's, and no gate is settled by anything except a committed move.
5. **Given** the mutation check from r13 (a deliberately weakened gate), **When** the walk's kill-and-resume proof runs against it, **Then** the proof fails by name — the proof is shown able to fail.

---

### User Story 4 - `kiln check flow` refuses every invalid flow (Priority: P1)

`kiln check flow` validates the default flow **all-or-nothing** and passes on the shipped one. It checks: anchors (Roadmap gate first, Merge last, nothing after Merge); that every built-in gate is present and in order, with the two interface gates conditional and nowhere else; that each gate's roles and judges are known and every judge is a judge role; that every gate's move kinds belong to the closed set; that every `returns_to` names an earlier gate or the roadmap and only where the rules allow; that `restart` and `mitigate` have the prerequisites they need; that arming can start only at the Specification gate and never at the Roadmap gate; that no cycle exists; and that the data agrees with the constitution. It comes with a **negative suite**: a set of deliberately invalid flows, each one refused with a failure that names the rule it breaks.

**Why this priority**: data that runs is only trustworthy if bad data cannot. r12's three checks are never-vacuous because each fails by name on a planted violation; this check must be the same, and it is what makes the next rows' edits to the flow (r26's added gates) safe.

**Independent Test**: run `kiln check flow` on the shipped flow (passes, scans the gates it names); run it on each member of the negative suite (each fails, naming the rule and the gate); run it on a flow that is *valid except for one fault* for each rule listed above and see exactly that fault named.

**Acceptance Scenarios**:

1. **Given** the shipped default flow, **When** `kiln check flow` runs, **Then** it passes and reports how many gates it checked — a check that checked nothing fails (never vacuous).
2. **Given** a flow whose first gate is not the Roadmap gate, or whose last is not Merge, or with a gate after Merge, **When** the check runs, **Then** it fails naming the anchor rule.
3. **Given** a flow that removes or reorders a built-in gate, that places an interface gate in the wrong slot, or that gives `applies_when` to a gate that is not one of the two interface gates, **When** the check runs, **Then** it fails naming the gate and the rule.
4. **Given** a flow with a move kind outside the closed set, with a Roadmap-gate row edit on a feature gate (or the reverse), or with `mitigate` among a person's moves, **When** the check runs, **Then** it fails naming the move and the gate.
5. **Given** a flow whose `restart` has no restorable commit to restart from, whose `mitigate` has no cap or a cap outside 0–3, whose `returns_to` points forward, to itself where that is not allowed, or to a gate that does not exist, or that contains a cycle, **When** the check runs, **Then** each is refused by name.
6. **Given** a flow that arms the unattended tail anywhere but the Specification gate, or at the Roadmap gate, or that makes an added gate an arming point, **When** the check runs, **Then** it fails by name.
7. **Given** a judge role unknown to the roster, or a gate that names a producer as its judge, **When** the check runs, **Then** it fails naming the role (the strongest-model rule itself stays r17's).
8. **Given** the negative suite, **When** it is run, **Then** every member is refused and a member that the check lets through fails the suite — the suite cannot pass with a check that accepts everything.
9. **Given** two faults in one flow, **When** the check runs, **Then** it reports **both** (all-or-nothing validation reports everything it found, then fails).

---

### User Story 5 - Moves lead where they were decided to lead; work that goes back is re-crossed (Priority: P2)

The Operator's moves have consequences, and the walk carries them out from the data. **Approve** opens the next gate. **Revise** (with a required note) sends the artifact back to the same author at the same gate; at **Code review**, `revise` sends the findings to the workers. **Reject** (with a required note) replaces the artifact with a fresh author at the same gate, or at an **earlier gate named in the note**; at Concept and Merge the target may be **the roadmap**, which takes the feature out of the lane. A person may make a reject to an earlier gate **at any time**, not only at the gate that is open. **Restart** (Code review and UI review) rebuilds from the restorable commit confirmed at Implementation. **Split+revise** (Implementation) shrinks the feature and returns the rest to the roadmap as a new feature. Whatever the target, **every gate after it is re-crossed**: it opens again, nothing approved before is carried across a change it did not see, and there is **no lighter confirmation**.

**Why this priority**: this is GATE-5 and GATE-6 — the part of "move semantics" that r13 explicitly left undecided. Without it the flow is a conveyor belt that only ever says yes. It is P2 because the P1 stories can be walked on approvals alone, but the flow is not honest until the other moves lead somewhere.

**Independent Test**: for each move kind and each gate that offers it, take the move in a scripted walk and check the gate that opens next, the gates re-opened after it, what was kept and what was redone, and that the note became the next step's instruction.

**Acceptance Scenarios**:

1. **Given** an open gate, **When** a `revise` move arrives with a note, **Then** the same gate stays open for a new round, the note is recorded as the next step's instruction, and the round count of that gate increases by one.
2. **Given** any corrective move (`revise`, `reject`, `restart`, `split+revise`), **When** it arrives **without** a note, **Then** it is refused and nothing is written; **and** an `approve` with a note records the note without turning it into a different kind of move.
3. **Given** a `reject` at Work plan whose note names Specification as the target, **When** it is committed, **Then** Specification re-opens with a fresh author, and Work plan, Implementation and every later gate are marked to be **re-crossed**; Concept, Architecture (and Experience design where it applied) keep their approvals.
4. **Given** a `reject` at Concept or at Merge whose target is the roadmap, **When** it is committed, **Then** the feature leaves the lane and the Roadmap gate re-opens; the feature's gates are not left open.
5. **Given** a feature at Verification, **When** a person makes a `reject` naming Architecture as the target (a gate that is no longer open), **Then** it is accepted as a move on the feature, Architecture re-opens, and every gate after Architecture is re-crossed; a step running at that moment stops at its checkpoint (it does not finish and commit an old result).
6. **Given** a re-crossed gate that opens again, **When** its brief is assembled, **Then** the brief says what changed since the last approval, or says plainly that nothing it judges changed — and the move is still a person's, with no lighter confirmation.
7. **Given** Code review, **When** the person's vocabulary is read, **Then** it is exactly `approve · revise · restart`; `restart` returns to the restorable commit and then to Code review; `revise` goes to the workers on the current code and then a fresh review of the whole diff.
8. **Given** Implementation, **When** a `split+revise` move arrives, **Then** the feature is reduced, the remainder is returned to the roadmap as a new feature (a proposal, never an admission — only the Roadmap gate admits), and the work plan and Implementation re-open.
9. **Given** an `approve` at the Roadmap gate or a row edit (`edit-rows`, `add-row`, `drop-row`), **When** it is sent to a feature gate, or a feature move is sent to the Roadmap gate, **Then** it is refused: the program gate and a feature's gates are never conflated in state or in the move vocabulary.

---

### User Story 6 - Triage can skip Concept and Architecture, and nothing else (Priority: P2)

For a small, well-scoped feature, triage may route past **Concept and Architecture only**, with its reasoning recorded; the recorded reasoning is shown in every later gate's brief. Triage can **never** skip Documentation, never skip any judged gate after Architecture, and **never make an applicable interface gate "not applicable"**: whether a small interface change needs the interface gates is decided by their own rule. A person can override a triage skip, and a flow may forbid it.

**Why this priority**: GATE-3 and the "no Documentation skip" decision (the-flow §12 q4). It is bounded and small, but it is the safety rail on a shortcut that otherwise erodes the flow.

**Independent Test**: walk a small non-interface feature with triage on (seven gates: Specification, Work plan, Implementation, Code review, Verification, Documentation, Merge) and a small interface feature with triage on (nine: those plus Experience design and UI review); try to skip any other gate and see it refused.

**Acceptance Scenarios**:

1. **Given** a small feature, **When** triage skips Concept and Architecture, **Then** the two are recorded **skipped** (a different outcome from *not applicable*) with the triage's reasoning, and the walk begins at the next gate.
2. **Given** triage proposing to skip any gate other than Concept and Architecture (including Documentation), **When** it is applied, **Then** it is refused by name.
3. **Given** a small interface feature, **When** triage skips Concept and Architecture, **Then** Experience design still opens (its rule is true) — triage did not change that.
4. **Given** a skipped Concept and Architecture, **When** a later gate's brief is assembled, **Then** it carries the skip and its reasoning.
5. **Given** a person who overrides the skip, **When** the override is made at the Roadmap gate, **Then** Concept and Architecture open as normal.
6. **Given** a flow that sets `no_triage_skip`, **When** triage tries to skip, **Then** it is refused.

---

### User Story 7 - Verification fixes itself a bounded number of times, then waits for a person (Priority: P2)

At Verification, a `reject` — by the verifier's finding — does not go to a person at once: the factory may run a **capped number of automatic fix rounds** (default **2**, settable **0–3** at the Roadmap gate) — a worker fixes, the same verifier checks again — before the gate opens for a person. An automatic round is a `mitigate`: it is **not a person's move** and **never a settlement**. When the cap is reached the failure is put in front of a person, with the cap and the rounds used shown. A cap of 0 means every failure goes straight to a person.

**Why this priority**: GATE-6's cap and the constitution's *bounded automatic fixing*. It is the one place the flow does work without a person; its bound is what keeps that honest.

**Independent Test**: walk Verification with a verifier that fails N times, for each cap in {0, 1, 2, 3} and for N below, at and above the cap; check the rounds taken, the point at which the gate opens for a person, and that no round ever settles the gate.

**Acceptance Scenarios**:

1. **Given** the default cap of 2 and a verifier that fails three times, **When** the walk runs, **Then** two automatic rounds are recorded, then Verification opens for a person with the cap and rounds shown; the third failure is the person's to see.
2. **Given** a cap of 0, **When** the verifier fails, **Then** no round runs and the gate opens for a person at once.
3. **Given** a cap outside 0–3, **When** the factory is configured with it, **Then** the value is refused by name.
4. **Given** an automatic round, **When** it is recorded, **Then** its kind is `mitigate`, its actor is the factory (not a person), and the gate remains open and waiting — no round settles Verification.
5. **Given** a person who tries to make a `mitigate` move through the CLI, **When** it arrives, **Then** it is refused: `mitigate` is not in any person's vocabulary.
6. **Given** the owner is killed during an automatic round, **When** it restarts, **Then** the round is neither lost nor counted twice, and the cap is still honoured.

---

### User Story 8 - The gate-rail contract says what now executes (Priority: P3)

The written contract for the flow, `kiln/packages/contracts/gate-rail.md`, is rewritten to describe the *executing* flow under constitution 2.1.0 — the twelve gates, the closed move kinds and where each leads, the re-crossing rule, the evaluation of `applies_when` and the *not applicable* outcome, triage's bounds, the fix-round cap and the arming rule — and the existing test that reads the constitution, the PRD and the concept documents and fails on drift is extended to cover it. The old statements "declared as data only" and "evaluation is r14/r15" are removed because they are no longer true.

**Why this priority**: a contract that disagrees with the code is worse than none (`firing-ready` reads it). It is P3 because it changes no behaviour, but the row is not done until the document and the data say the same thing.

**Independent Test**: change one gate's vocabulary in the data and see the drift test fail by name; change the same gate in the document only and see it fail; restore both and see it pass.

**Acceptance Scenarios**:

1. **Given** the rewritten contract, **When** a reader looks for the statements "declared as data only" or "evaluation belongs to r14", **Then** there are none.
2. **Given** the data and the contract, **When** the drift test runs, **Then** every gate's name, question, vocabulary, judge, `applies_when` and cap in the data equals the contract's, and the move-semantics table equals the-flow §7.
3. **Given** a divergence introduced in either file, **When** the drift test runs, **Then** it fails naming the gate and the field.

---

### Edge Cases

- **Two moves race for a gate that also triggers the next gate's opening.** r13's first-move-wins settles the race; the next gate must open exactly once, from the winner's move only.
- **A reject to an earlier gate arrives while a later gate is waiting.** The waiting later gate is withdrawn without being settled (it is *re-crossed*, not decided); no move is recorded on it, and its half-formed brief is not mistaken for a decided one.
- **A reject to an earlier gate arrives while a step is running.** The step stops at its checkpoint; its partial result is never committed; it is not run again until the target gate re-opens.
- **A reject names a gate that does not exist, a gate the feature has not reached, or a later gate.** Refused, naming the target. A reject names the roadmap anywhere except Concept and Merge: refused.
- **The target of a reject is an interface gate recorded "not applicable".** There is nothing to re-open; the nearest applicable earlier gate is named in the refusal, and a person chooses again.
- **A feature re-crossed through UI review whose rule is now false.** The rule is evaluated again on the facts then in force; the recorded outcome says so.
- **A required interface gate on a flow v1 store.** v1 has no such gates; the requirement is refused by name rather than silently ignored.
- **`applies_when` facts are missing** (no paths given, no journeys cited). A missing fact is *false*, not a guess; the reason records that the fact was absent — never a model's opinion, never a default of "apply".
- **A killed owner on the very first gate** (just after the Roadmap gate's approve): the feature is either not admitted or admitted with its first gate opening exactly once.
- **Merge is rejected.** The target is the same gate (a fresh author) or an earlier gate or the roadmap; the feature never leaves "in progress" by being rejected; nothing opens after Merge.
- **The flow data is invalid at start-up** (for example, edited by hand). The walk refuses to start and names the rule, rather than walking a flow the check would have refused.
- **A decider is a program.** Any process of the same OS user can run `kiln gate move --by <anyone>` (carried forward from r13, not changed here); the walk's scripted decider is recorded as a scripted stand-in and no claim is made that it is a person (see Assumptions).
- **Flow version mismatch.** A walk is pinned to one flow version for its life; a record made under v1 is never walked under v2, and a v2 feature is never given v1's ten gates.

## Requirements *(mandatory)*

### Functional Requirements

**The flow as data (FLOW-1, FLOW-2, FLOW-3, EXP-3)**

- **FR-001**: The system MUST execute a feature's walk **from the flow's data**: which gates exist, their order, the moves each offers, which are conditional and what each move does are read from the definition. A change to the data changes the walk with no change to any program.
- **FR-002**: The default flow MUST be the Roadmap gate followed by eleven feature gates in this order: Concept, Architecture, Experience design, Specification, Work plan, Implementation, Code review, UI review, Verification, Documentation, Merge.
- **FR-003**: The Roadmap gate MUST be first and the Merge gate last; **no gate may follow Merge**. Every built-in gate MUST be present and in order; none is ever removed.
- **FR-004**: Every move MUST be of the **closed set** of kinds — approve, revise, reject, restart, split+revise, mitigate, and the Roadmap gate's row edits (edit-rows, add-row, drop-row). A move outside the set MUST be refused, and the set MUST NOT be extended by data.
- **FR-005**: Each gate MUST offer only its own moves: Roadmap gate `approve · revise · reject · edit-rows · add-row · drop-row`; Concept, Architecture, Experience design, Specification, Work plan and Documentation `approve · revise · reject`; Implementation `approve · split+revise`; Code review and UI review `approve · revise · restart`; Verification `approve · reject` (with automatic `mitigate`); Merge `approve · reject`. A move outside a gate's own vocabulary MUST be refused with nothing written.
- **FR-006**: `mitigate` MUST never be a person's move and never a settlement; a person who sends it MUST be refused.
- **FR-007**: The Roadmap gate's row edits and a feature gate's moves MUST NOT be accepted at each other's gate.

**Interface gates (EXP-3)**

- **FR-010**: Experience design and UI review MUST each carry a **deterministic `applies_when` rule** evaluated from facts alone — the feature's paths and labels, the charter journeys its row cites (Experience design), and what was actually changed (UI review). No model and no clock takes part.
- **FR-011**: When the rule is false the gate MUST be recorded as **not applicable**, with its **reason** (the rule and the facts it was evaluated on); no gate waits, no judge runs, no person is asked, and the walk continues to the next gate.
- **FR-012**: When a fact the rule needs is **absent**, the rule MUST read it as false and the reason MUST say the fact was absent.
- **FR-013**: A person MUST be able to **require** an interface gate at the Roadmap gate even where its rule is false; the gate then applies and the record says it was required.
- **FR-014**: "Not applicable" MUST be a distinct recorded outcome from "skipped" (triage) and from "settled" (a person's move). No move may be made on a gate recorded not applicable.
- **FR-015**: An evaluation, once made for a feature, MUST be recorded exactly once; repeating it (after a restart or a retry) MUST produce the same record and not a second one.

**Move semantics (GATE-5, GATE-6)**

- **FR-020**: Every corrective move (`revise`, `reject`, `restart`, `split+revise`) MUST carry a **note**; without one it MUST be refused. The note MUST become the next step's instruction and be recorded with the move. An `approve` MAY carry a note, which does not change its kind.
- **FR-021**: `approve` MUST open the next applicable gate. `revise` MUST keep the same gate open for a new round with the same author context and the note; at Code review (and UI review) `revise` MUST send the findings to the workers and then call for a fresh review of the whole diff.
- **FR-022**: `reject` MUST target a fresh author at the **same gate**, or at an **earlier gate named in the note**; at Concept and at Merge the target MAY be **the roadmap**, which removes the feature from the lane and re-opens the Roadmap gate. A reject whose target is a later gate, a gate not in the flow, or the roadmap anywhere else MUST be refused naming the target.
- **FR-023**: A person MUST be able to make a `reject` to an earlier gate **at any time**, including when that gate is not the one that is open; a running step MUST stop at its checkpoint and its partial result MUST NOT be committed.
- **FR-024**: Whatever the target, **every gate after it MUST be re-crossed**: it opens again, nothing approved after the target is carried forward, and there is **no lighter confirmation**. A re-crossed gate's brief MUST state what changed since its last approval, or state plainly that nothing it judges changed.
- **FR-025**: `restart` MUST rebuild from the restorable commit confirmed at Implementation and then return to the gate it was made at. `split+revise` MUST reduce the feature, return the remainder to the roadmap as a **proposal** (never an admission) and re-open the work plan and Implementation. Implementation MUST NOT offer `reject`.
- **FR-026**: A gate withdrawn by a re-crossing MUST NOT be recorded as settled, and any move made on it before the withdrawal MUST be treated as made against the earlier state (it is refused as stale, not applied).

**Triage and the cap (GATE-3, GATE-6)**

- **FR-030**: Triage MAY skip **Concept and Architecture only**, recording its reasoning; the skip MUST be shown in every later gate's brief, MUST be overridable by a person at the Roadmap gate, and MUST be refusable by a flow that sets `no_triage_skip`.
- **FR-031**: Triage MUST NOT skip Documentation or any judged gate after Architecture, and MUST NOT make an applicable gate "not applicable". "Skipped" and "not applicable" MUST be recorded as different outcomes.
- **FR-032**: Verification MUST run at most **cap** automatic fix rounds before the gate opens for a person, where the cap is a factory setting of **0–3, default 2**; each round MUST be recorded as `mitigate` made by the factory, MUST NOT settle the gate, and MUST show the cap and the rounds used in the brief. A value outside 0–3 MUST be refused by name.

**`kiln check flow` (FLOW-7, default flow)**

- **FR-040**: `kiln check flow` MUST validate the default flow **all-or-nothing**, reporting **every** fault it finds before failing, and MUST pass on the shipped default flow.
- **FR-041**: It MUST check at least: anchors; presence and order of every built-in gate; placement of the two conditional gates and that no other gate is conditional; roles and judges (every named role is in the roster and every gate's judge is a judge role); move kinds in the closed set; the `returns_to` of every move (an earlier gate or the roadmap, and only where FR-022 allows); `restart` and `mitigate` prerequisites (a restorable commit for the first; a cap in 0–3 for the second); arming points (the Specification gate only, never the Roadmap gate, never an added gate); and cycles.
- **FR-042**: The check MUST be **never vacuous**: it MUST report how many gates it checked, and a run that checked none MUST fail.
- **FR-043**: The check MUST ship with a **negative suite** — a set of deliberately invalid flows, at least one for each rule in FR-041 — and the suite MUST fail if any member is accepted. Each refusal MUST name the rule and the gate.
- **FR-044**: The unattended tail (GATE-4) is carried by this row as a **rule in the data, checked** — arming only at the Specification gate, covering only the gates after it, never the Roadmap gate, never an added gate, UI review not delegable by default, Merge only if explicitly included — and **not as behaviour**. **Arming, delegated crossings recorded as *delegated*, and ending at an objection are r21's**; the scripted walk neither arms nor crosses under delegation. The Roadmap gate MUST accept no delegated move.

**The walk, headless, and surviving kills (GATE-1/2 proof, constitution V)**

- **FR-050**: A **scripted interface feature** MUST be able to walk the Roadmap gate's admission and then all eleven feature gates, and a **scripted non-interface feature** the nine that apply, from the CLI, with every move made through the CLI to the store's owner.
- **FR-051**: Both walks MUST **survive a kill at every gate**: kill at each named step of each transition (a gate opening, waiting, a move being committed, the next gate opening, a not-applicable outcome being recorded, a re-crossing, an automatic round), restart, and finish with the result of the uninterrupted walk — same gates, same moves, same outcomes, **one move per gate**, and **no gate settled by anything but a committed move**.
- **FR-052**: A walk MUST be **pinned to one flow version** for its life. A feature admitted under the v2 flow MUST use v2's gates; a record under v1 MUST NOT be walked under v2.
- **FR-053**: Headless MUST mean waiting: with no surface attached, a gate opens and waits; the walk never advances on a missing person, a timeout or a restart. The scripted decider MUST be recorded as a scripted stand-in, not as a claim that a person decided.
- **FR-054**: A walk MUST refuse to start on a flow definition that `kiln check flow` would refuse, naming the rule.
- **FR-055**: Tests MUST include a deliberately weakened walk (for example, a gate that the walk settles on restart) and MUST show that the kill-and-resume proof fails on it by name.

**The contract (rewrite)**

- **FR-060**: `kiln/packages/contracts/gate-rail.md` MUST be rewritten for constitution 2.1.0 to describe the executing flow — gates, closed move kinds with where each leads, re-crossing, `applies_when` evaluation and the not-applicable outcome, triage bounds, the cap, and the arming rule — and MUST no longer say the rule is "declared as data only" or that evaluation belongs to a later row.
- **FR-061**: The test that reads the constitution, the PRD and the concept documents and fails if the flow data drifts MUST be extended to cover the rewritten contract and the move-semantics table.

**What this row does not change**

- **FR-070**: The row MUST NOT change the r13 gate contract (a move and its gate's completion in one commit, keyed exactly once, first move wins, no clock), the closed outcome vocabulary, the one-owner rule, the dependency record, or `legacy/`. It MUST NOT edit `ROADMAP.md`, admit a program, or decide a gate; the row stays `queued` until its own first gate opens.
- **FR-071**: The row MUST NOT add a new move kind or a new gate, and MUST NOT introduce a browser surface, a model, a worker or a clock.

### Key Entities

- **Flow definition**: the versioned, ordered list of gates (id, name, question, phase, vocabulary, judge, conditional rule, cap) and the roster of judge and producer roles. Pinned to a walk for its life.
- **Gate (in the flow)**: a place in the flow with its own moves, an optional `applies_when`, an optional automatic kind, and a `returns_to` for each move that goes back.
- **Walk**: one feature's passage through its pinned flow — the ordered record of which gates opened, were decided, were not applicable, were skipped, were re-crossed, and by what move.
- **Move**: a closed kind, a decider, a key, a note (required when corrective), a target (when a reject goes back) and the brief as seen — the unit r13 settles a gate with.
- **Outcome of a gate in a walk**: one of *settled by a move*, *not applicable (with reason)*, *skipped by triage (with reasoning)*, *withdrawn for re-crossing*, *waiting*. Not applicable and skipped are distinct and neither is a settlement.
- **`applies_when` evaluation**: the deterministic answer to "does this gate apply to this feature" with the rule, the facts, and the reason recorded exactly once.
- **Re-crossing**: the marking of every gate after a reject's target as to be done again, with what changed since its last approval.
- **Fix round**: one automatic `mitigate` attempt at Verification, counted against the cap and never a settlement.
- **Negative suite**: the set of invalid flows `kiln check flow` must refuse, each tagged with the rule it breaks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A scripted interface feature walks from admission to Merge through **all 11** feature gates using only the CLI, each gate settled by exactly one committed move, with the gates, moves and outcomes identical across repeated runs.
- **SC-002**: A scripted non-interface feature walks **9** gates, and **2** (Experience design, UI review) are recorded "not applicable" each with a stated reason; **0** moves are accepted on a not-applicable gate.
- **SC-003**: Killing the owner at **every named step** of every gate transition in both walks (opening, waiting, move commit, next-gate opening, not-applicable recording, re-crossing, fix round) and restarting yields, in **100%** of cases, a walk equal to the uninterrupted one, with **0** gates settled by a restart, crash or clock; a gate killed and restarted **more than 5 times** in a row is still waiting.
- **SC-004**: `kiln check flow` passes on the shipped default flow and refuses **100%** of the negative suite — at least **one invalid flow for every rule** named in FR-041 — each refusal naming its rule and gate; a version of the check that accepts everything **fails** the suite.
- **SC-005**: For every move kind and every gate that offers it, the walk's next gate, re-opened gates, kept and redone work match the-flow §7 in **100%** of the move-semantics scenarios; **0** corrective moves are accepted without a note.
- **SC-006**: After any reject, **100%** of the gates after its target open again and **0** are carried forward as approved.
- **SC-007**: Triage skips **only** Concept and Architecture in **100%** of cases; an attempt to skip any other gate is refused; an interface feature never has its interface gates removed by triage.
- **SC-008**: Verification never runs more automatic rounds than the cap, for each cap in {0, 1, 2, 3}; no round settles the gate; a cap outside 0–3 is refused.
- **SC-009**: Changing one gate's vocabulary in the flow data changes the walk with **no program change**, and a change that breaks an invariant is refused by `kiln check flow` before any walk starts.
- **SC-010**: The rewritten contract and the flow data agree on **every** gate's name, question, vocabulary, judge, conditional rule and cap; a divergence in either fails the drift test by name.
- **SC-011**: The proof is shown able to fail: a deliberately weakened walk, and a deliberately permissive flow check, are each caught by the suite by name.
- **SC-012**: `npm test` and `npm run check` stay green with r13's guarantees unchanged (the new suite's runtime stays inside the measured budget or the plan splits it explicitly, never by a silent skip), and `legacy/` and `ROADMAP.md` are unchanged.

## Assumptions

- **The "person" in the walk is a scripted stand-in.** The walks are headless proofs; the script makes the moves a person would, and it is recorded as a scripted decider. Distinguishing a person from a program at the move boundary is a decision carried forward from r13 and is **not made here**; this row makes no claim that a scripted walk is a human decision.
- **The facts for `applies_when` are supplied to the walk as inputs** (a feature's paths, labels, cited journeys, and what was changed). Computing them from the roadmap and the real diff is the director's work (r18); the rule's evaluation, its determinism and its record are r14's.
- **The task bodies stay shells.** Steps in the walk (authoring, judging, building, fixing) are scripted, not performed by workers or models; r16 gives them substance. The walk proves the *gates*, not the *work*.
- **Briefs stay opaque to the store**, as in r13; the walk attaches to each brief the small set of facts this row owns (what changed since the last approval, the cap and rounds used, the triage skip, a required interface gate). Assembling the full ten-part brief is r20.
- **The Roadmap gate is the admission, not a step of every feature's walk.** The walks start by admitting the feature at the Roadmap gate (a human-only gate that accepts no delegated move) and then walk the eleven feature gates; the Roadmap gate re-opening after Merge is shown, not chained.
- **Added gates and flows from files are out of scope.** The check is built for the default flow; its rules are written so r26 can extend them to added gates, but nothing here reads a gate or a flow from a file.
- **Gate briefs and moves on the web are out of scope** (r20); so are the unattended tail's arming, delegated crossings and notifications (r21; FR-044), the record's event stream (r15), workers (r16), configuration as files (r17) and the director (r18).
- **The strongest-model rule for judges is checked here only as "the named role is a judge role"**; binding judges to the strongest model is a configuration check that belongs to r17.
- **Platform and runtime** are those r13 settled: macOS, the supported Node range, the pinned library behind the one seam. The suite's runtime budget is r13's; if the kill matrix pushes past it, the planned move is a named proof tier, never a silent skip.
