# Research: Gates as data, walked headless (row r14)

Decisions taken before design (each: **Decision · Rationale · Alternatives**). Nothing here re-opens r13's gate contract, the move semantics decided in `the-flow.md` §7/§11–§12, or the three clarifications of the spec. Source reading: `kiln/packages/{contracts,durable,record,cli}`, `kiln/checks`, `docs/concepts/{the-flow,ui-flow}.md`, `specs/011-…`.

## R1 — Where the flow engine lives: a pure module in `contracts`, the walk in `durable`

**Decision.** Everything that is a *rule about the flow* is a pure function over the flow data in `packages/contracts/src/flow/` (no I/O, `builtins: none`): `engine.ts` (order, next gate, consequences of a move, target validation), `applies.ts` (the `applies_when` evaluator and its reasons), `glob.ts` (the path matcher), `validate.ts` (the faults of a flow definition). The *walk* — the part that opens gates, waits and records — is in `packages/durable/src/walk/`, because the owner must advance it (Clarification Q3) and `durable` is the only package that may touch the store. `kiln check flow` (`checks/flow.ts`) imports only `contracts`.
**Rationale.** The layers already forbid `durable → director`; the director (r18) will *drive* the same engine later. Pure rules are testable without a store and shared by the check, the walk and the contract drift test — one source for "what the flow says".
**Alternatives.** Rules inside the walk (the check would have to import `durable` and the library — refused by the layer rule); a new `flow` package (a seventeenth layer for ~400 lines; adds a boundary edge for nothing).

## R2 — The walk is `kiln.row` grown up, not a sixth task kind

**Decision.** `kiln.row`'s input becomes `{feature, script}` **or** `{feature, walk}` (exactly one). The r13 scripted form is unchanged and keeps its tests. The walk form runs a state machine kept entirely in the task's **checkpoint** (JSON, committed with each transition). `row.ts`'s own header says "r14 replaces the script with the real walk" — this is that.
**Rationale.** CORE-2 names five kinds (roadmap, row, unit, gate, lane); a feature *is* a row. Checkpointed state means kill-and-resume is the library's, already proved, not re-invented.
**Alternatives.** A `kiln.feature` kind (breaks "five kinds", duplicates the row's job); state in a document only (a second source of truth beside the checkpoint).

## R3 — A gate that opens again is a new gate id, with the next round

**Decision.** r13 already fixed the id as `gate:<feature>:<gateKey>:<round>`. A `revise`, a fresh author, a re-crossing or a rebuild opens **round n+1** as a brand-new gate; the old round stays settled (or withdrawn) as history. No gate is ever re-opened in place.
**Rationale.** "Exactly one record per gate" (I4) and "a gate settled stays settled" stay true by construction; the oracle and the kill proof need no change for rounds. This resolves the item the clarify pass deferred.
**Alternatives.** Re-opening a gate document (mutates a once-written document; breaks I4); a `rounds[]` array in one gate (a gate with several records).

## R4 — The owner advances the walk; opening the next gate is idempotent, not atomic with the move

**Decision.** After a gate's task goes terminal the row (woken by the library's wait-on-child, as the roadmap shell is) reads the stored move record, computes the consequence with the engine, and opens the next gate through `openGate` under a **deterministic command key** `walk:<feature>:open:<gateKey>:<round>`. A kill between the move's commit and the next opening re-runs the row phase, which finds the record and re-issues the same key → `repeat`. Not-applicable outcomes and pins are written in the **same `run.commit`** as the row's checkpoint advance (one commit: outbox entry + checkpoint).
**Rationale.** Making "move + next gate open" one commit would put gate-opening inside the decision step's commit and couple every gate to the walk; the key-repeat pattern is r13's own for the roadmap shell and is already kill-proved. The window is real, named (`walk.settled-read`, `walk.gate-opening`) and attacked.
**Alternatives.** One commit for move + next open (couples the gate contract to the walk; changes r13); the script opens each gate (rejected in Clarification Q3).

## R5 — Corrective moves, targets and admission decisions: optional fields on the move

**Decision.** `Move` gains optional `note`, `target` and `admit`; `MoveRecord` stores them; equality for `repeat`/`key-conflict` compares all of them (a changed note under the same key is a `key-conflict`). `GateSpec`/`GateDocument` gain `noteRequired: MoveKind[]` and `returnsTo: Target[]`, written once at opening like `vocabulary`. `submitMove` refuses by name, as `invalid-move`, a corrective move without a note, a `target` on a non-reject, a target not in `returnsTo` (own gate always allowed), and `admit` anywhere but `approve` at `gate0`. `admit` is `{require?: GateKey[]; overrideTriage?: boolean; fixRounds?: 0..3}` — the Roadmap gate's admission decisions (GATE-6 cap, EXP-3 "require", Q1 pin, triage override).
**Rationale.** FR-020/FR-022/FR-013/FR-032 need these in the *person's* move to be recorded atomically with the settlement. Storing the rules at opening keeps `submitMove` judging against the gate's own stored document, never against walk memory (r13's discipline). The refusal vocabulary stays closed (`invalid-move`).
**Alternatives.** A side-channel document for the note (two writes for one decision); `target` inside the free-text note (parsing prose — "named in the note" is satisfied by a field).

## R6 — A feature-level move reaches an open gate through its decision slot

**Decision.** `reject`-to-an-earlier-gate "at any time" (Clarification Q2) is a **`FeatureMove`** `{kind:"reject", decidedBy, target, note}` with a key, on `featureId`. Two cases, one record:
(a) **a gate is open** — the owner delivers a `withdraw` request into that gate's decision slot (the same single-shot slot a move uses); the decision step's **one commit** writes the feature-move record, a `kiln.withdrawal` document, `gate.withdrawn` and `move.committed` entries, and returns the decision task terminal `{withdrawn:true}`; the gate task settles as *withdrawn*, not *settled*;
(b) **no gate is open** (a scripted step is running) — a ledger command writes the record as `pending`; the row consumes it at its next wake and ignores the finished step's result. Walk units are created **single-step**, so "stops at its checkpoint" (FR-023) means the unit's only checkpoint, its end.
Opening a walk gate and recording it as the feature's `openGateId` are **one commit**, and that commit refuses (`feature-moved`, internal) if a move is pending — so no window exists in which a move sees "no gate" and the gate then opens.
**Rationale.** Only a decision step may complete a task in the same commit (r42's result); a tx cannot transition another task. Reusing the slot keeps first-move-wins and exactly-once as one proved mechanism.
**Alternatives.** Polling the pending record (forbidden: IX); aborting tasks from outside (the seam has no such operation and it would not be atomic with the record); leaving withdrawn gates waiting as zombies (live tasks forever; breaks I1).
**Cost, stated.** `GateState` gains `withdrawn`; the oracle gains I10 (*withdrawn ⇔ withdrawal document ∧ decision terminal ∧ no move record*) and I1–I3 learn the third terminal shape. r13's invariants stay as they are for gates that were never withdrawn.

## R7 — Applicability: pinned at admission, UI review turns on at its slot

**Decision.** (Clarification Q1.) The row evaluates both interface gates **once**, in the commit that follows the Roadmap gate's `approve`, from `facts` (paths, labels, cited journeys) and `admit.require`, and stores `pinned.applicability[gate] = {applies, why: "rule"|"required", reason}` in its checkpoint; each *not applicable* is an outbox entry `gate.not-applicable` in the same commit. At UI review's slot, **only** if pinned not-applicable and **not** required, the diff predicates in `built` are evaluated; if true the gate `gate.became-applicable` (and opens); nothing ever sets an applicable gate to not-applicable. Predicates combine with **OR** (`paths ∨ labels ∨ journeys` for Experience design; `paths ∨ labels` at admission and `diff` at the slot for UI review) — the data in `v2.ts` lists alternatives, and `ui-flow.md` §4.1/§5.1 shows them as parallel lists. A missing fact is false and the reason says `absent`.
**Rationale.** Deterministic, replayable, and the same facts always give the same reason (FR-012, FR-015); the reason is canonical JSON, so "recorded exactly once" is a hash comparison.
**Alternatives.** AND across predicates (an interface file with no label would escape); evaluating at each slot (rejected in Q1).

## R8 — Glob matching: a small pure matcher, no dependency

**Decision.** `glob.ts` supports `**`, `*`, `?` and literals over `/`-separated paths (no brace sets, no negation), compiled once to a regular expression, case-sensitive. Every pattern in v2's `INTERFACE_WORK` is in that subset; the check refuses a rule with an unsupported glob character.
**Rationale.** `contracts` has no `node:` access and the project takes no dependency for 40 lines; determinism needs a fixed, tested dialect (golden cases for each pattern in `ui-flow.md`).
**Alternatives.** `minimatch`/`picomatch` (a new pinned dependency for the dependency record and the lock); `node:path.matchesGlob` (experimental on the whole supported range, and `contracts` cannot import `node:`).

## R9 — What "changed since the last approval" means in a scripted walk

**Decision.** Each gate round's artifact has an `artifactRev` = hash of `(gateKey, the author step's scripted content label, the upstream revs it judges, the note)`. A re-crossed gate's brief lists `changedSince: [{gate, from, to}]` for every upstream gate whose rev differs from the vector recorded at this gate's last approval, and the sentence "nothing this gate judges changed since the approval on <time>" when the list is empty. The script may mark a fresh author's output `sameContent` so the empty case is testable.
**Rationale.** FR-024 needs a deterministic, testable "what changed" with no real artifacts yet (r16). Revs are cheap, canonical and survive replay.
**Alternatives.** Free text written by the script (not checkable); omitting it until r20 (FR-024 would not be met).

## R10 — Verification: fix rounds are units the owner runs, then the gate opens

**Decision.** Before Verification opens, the row runs the scripted verifier (`walk.verifier`, a list of `pass|fail`). While the verdict is `fail` and `used < cap`, it runs one **fix round** — a `worker` unit, then the verifier again — and records each as a `walk.fix-round` outbox entry (kind `mitigate`, actor `factory`, cause the deterministic round key). The gate then opens with `{cap, used, verdicts}` in its brief. `mitigate` is not in any gate's person vocabulary (already true in v2 data) and `submitMove` refuses it by name. After a *person's* reject there are no automatic rounds on the next pass (`the-flow.md` §6).
**Rationale.** FR-032/US7 with no model: the *bound* and the *record* are the product; the verdicts are an input. Fix rounds keyed by `(feature, round, n)` are exactly-once through `repeat`.
**Alternatives.** Rounds inside the gate's decision step (gate contract changes; a non-person writer of the gate's record); counting rounds in memory (lost on kill).

## R11 — Restart and Verification-reject re-cross from "the build"

**Decision.** The engine has one pseudo-target, `@build` (after Implementation, before Code review). `restart` = rebuild from the restorable commit (a worker unit), then re-cross from `@build`; a person's Verification `reject` with no target = rework on the current code (a worker unit), then re-cross from `@build`; naming `3-spec` etc. re-crosses from that gate. The spec's FR-025 is amended accordingly (the clarify text said "returns to the gate it was made at"; that would let rebuilt code skip Code review).
**Rationale.** `the-flow.md` §7: restart keeps "concept, design, specification, work plan, restorable commit" and redoes "the code, then Code review"; P2 forbids carrying approvals across a change they did not see.
**Alternatives.** Returning to the originating gate only (UI review `restart` would skip Code review of new code — contradicts P2).

## R12 — Triage skip and `not-applicable` are separate outcomes

**Decision.** Gate outcomes in the walk's history are a closed set: `settled`, `not-applicable`, `skipped`, `withdrawn`, `waiting`. Triage input is `{skip, reasoning}` in the walk input; at admission it is proposed in the brief and `admit.overrideTriage === true` overrides it. The engine allows skipping only gates whose data says `triage: "skippable"` (Concept, Architecture) and only when the flow does not set `noTriageSkip`.
**Rationale.** FR-014/FR-031 make the distinction testable by outcome name; the allowed set is *data* so `kiln check flow` can refuse a flow that makes Documentation skippable.
**Alternatives.** A boolean `skipped` on a gate (cannot say why or by whom).

## R13 — Arming is data and a check, not behaviour (the GATE-4 clarification)

**Decision.** v2 data gains `armsTail: true` on Specification only, `delegable: "never"` on the Roadmap gate, Experience design and UI review, `"default"` on Work plan … Documentation, `"explicit"` on Merge. `kiln check flow` validates those facts (FR-041); nothing reads them in a walk, and the Roadmap gate refuses any move carrying a delegation (it has no such field — already tested in r13). `Move` has **no** delegation field in r14.
**Rationale.** r21 owns arming; adding the fields now lets the check fail by name on a malformed rule without implementing the behaviour.
**Alternatives.** Leaving arming out of the data (the check could not refuse bad arming — FR-041 unmet).

## R14 — `kiln check flow` and its negative suite

**Decision.** `checks/flow.ts` exports `checkFlow({flow?})` → `CheckResult`; failures use stable codes (`contracts/check-flow.md`). The negative suite is a table in `checks/tests/flow-negative.ts` of `{rule, fault, mutate(def)}` applied to a deep copy of v2 — one per rule, two with **two** faults. `runNegativeSuite(check)` returns the members the check *accepted*; the real test asserts that set is empty, and a second test feeds it a stub that accepts everything and asserts the suite then **fails** (the suite is shown able to fail). The check counts the gates it examined and fails a run that examined none. `CHECK_NAMES` becomes four (`network`, `boundaries`, `legacy`, `flow`); r12/r13 text and tests that say "three checks" are updated, not the checks themselves.
**Rationale.** Same discipline as r12's three checks (never vacuous, planted violations), one more name. All-or-nothing = collect every fault, then fail.
**Alternatives.** A JSON-schema check (cannot express order, cycles, prerequisites); a file of invalid flows on disk (they would drift from the data they mutate).

## R15 — How a person drives a walk: three channel operations, three CLI commands

**Decision.** The owner's channel gains `feature.admit` (creates the row through the command ledger), `feature.state`/`feature.next` (the open gate with its id, `briefRef`, vocabulary, `returnsTo`, brief — and, with `after`, **a reply that waits for a change using an in-process notification, never a poll**), and `feature.move` (R6). The CLI gains `kiln feature admit|next|move|state`, and `kiln gate move` gains `--note`, `--target`, `--admit <file>`. A completer still never opens the store.
**Rationale.** "From the CLI" (SC-001) without the script opening gates (Q3) needs a way to learn the next gate; waiting on an event keeps IX (surfaces do not poll) and survives a restart because the answer is re-derived from the store on reconnect.
**Alternatives.** The script polls `gate state` (a polling surface, and it cannot know the next gate's id); reading the store directly (a completer never opens the store — r13).

## R16 — Test cost: two tiers, decided now, never silent

**Decision.** Logic tests are in-process (engine, glob, applicability, consequences, the check, the negative suite — milliseconds). Kill tests spawn real owners. r13's suite already takes 142–166 s of its 180 s threshold, so **the kill matrix is in the proof tier from the start**: the **default tier** runs `walk-smoke` (four kills, one per phase group: pin, open, settle, consume), one storm on a walk gate, the clock test and the weakened-walk control; the **proof tier** (`npm run proof`, files named `*.proof.test.ts`) runs every walk point on the interface walk, every gate of both walks at every point, a reject/re-cross script, and 300 random kills. The runner prints which tier ran. The recorded proof run (baseline.md) is the evidence for SC-003.
**Rationale.** Measuring first and moving later is near-certain rework; the tier split was planned in r13 for exactly this. Nothing is cut: every case still exists and is run, and the report says where.
**Alternatives.** Cutting the matrix (SC-003 unmet); running everything every time (the default suite crosses its budget).

## R17 — The contract document is generated from nothing, but tested against everything

**Decision.** `gate-rail.md` is rewritten by hand (it is prose for people); `flow-vs-constitution.test.ts` is extended (`gate-rail.test.ts` already parses it) to compare, per gate, name · question · vocabulary · judge · `applies_when` · cap · note rules · targets · triage · delegable with the data, and the move-consequence table with `the-flow.md` §7 (a tabular parse). The sentences "declared as data only" and "evaluation belongs to r14/r15" are asserted **absent**.
**Rationale.** FR-060/061; a hand-written document with a machine drift test is the pattern r12 set.
**Alternatives.** Generating the document from the data (the prose, rationale and headless contract would be lost).

## R18 — The admission gate is the Roadmap-gate crossing of a feature; its other outcomes

**Decision.** For r14 the walk's admission gate (`gate:<feature>:gate0:<n>`) **is** the feature's Roadmap-gate crossing: a person's `approve` carrying `admit`, recorded with its actor, precedes the feature's first gate (constitution VI). It is **not** the factory-level `kiln.roadmap` task, whose gate0 is untouched; unifying the two is r18/r22's. Its other outcomes (FR-027): `revise` and a row edit open admission round + 1 with the note; `reject` ends the walk as *not admitted* (`the-flow.md`: "nothing is admitted; the factory idles").
**Rationale.** The program gate and a feature's gates are never conflated; reject at the admission crossing has no "fresh author at the same gate" meaning because admitting nothing is the point of the move.
**Alternatives.** Reusing `kiln.roadmap` for admission (couples a factory-wide task to a per-feature walk before the roadmap is shaped, r22); a `reject` that reopens the same crossing (a loop with no outcome).
