# Technical overview: r14 — gates as data, walked headless

**Row**: `r14` of the `kiln-v1` firing program · **Feature**: `012-gates-as-data-walked-headless` · **Written**: 2026-10-27 · **Status**: **built and proven** (2026-10-28) — all 89 tasks done; the readings are in [baseline.md](./baseline.md), the account of the work in [implementation-report.md](./implementation-report.md). Sections written before the build say **[built]** in their heading; where the build differed from the design the text was corrected, and §13 lists the differences. **Audience**: the engineer who has to build r14 or the row after it (r15 records the walk, r18 directs it, r20 puts it on the web, r26 adds gates from files), and the reviewer who has to decide whether a walk can be trusted.
**Companions**: [spec.md](./spec.md) (what and why, normative; 41 requirements, 12 success criteria) · [plan.md](./plan.md) · [research.md](./research.md) (R1–R18, the design decisions) · [data-model.md](./data-model.md) · [contracts/](./contracts/) (`flow-data.md`, `walk-contract.md`, `check-flow.md`) · [quickstart.md](./quickstart.md) (the acceptance run) · [tasks.md](./tasks.md) · the predecessor overview, [../011-durable-core-gate-contract/overview.md](../011-durable-core-gate-contract/overview.md).

> **Reading guide.** §1–3 say what the row is and what it inherited. §4–7 are the design: the pure engine, applicability, the walk, and what changes in the gate. §8–9 are the check and the command line. §10 is the data. §11 is how the design will be *attacked* — as in r13, the proof is the real product. §12–15 are governance, decisions, status and risks. §16–17 are a glossary and a reading order.

---

## 1. Summary

KILN promises that **a feature walks a fixed, auditable path of gates, and every step along it is a person's committed move or a rule anyone can recompute**. r12 wrote the path down as data (twelve gates, nine move kinds) but nothing ran it. r13 built a single gate that waits for a person for as long as it takes and is settled by that person's move and nothing else — but a gate was opened by hand, one at a time. r14 makes the path *run*.

Three things are new:

1. **A pure flow engine** (`packages/contracts`). Which gate comes next, what each move does, which gates an interface feature needs and which it does not, what a reject may name as its target, what triage may skip, how many automatic fix rounds are allowed — all functions over the flow data. No I/O, no clock, no model.
2. **A walk** (`packages/durable`). `kiln.row` grows a `walk` form. After a person's move settles a gate, **the owner** opens the next one — durably, exactly once, again after a restart if it was killed in between. It records *not applicable* and *skipped* outcomes with reproducible reasons, runs scripted work units, applies the consequence of each move (revise, reject, restart, split+revise, re-crossing), runs Verification's bounded fix rounds, and ends at Merge. A **feature-level reject** can send a feature back at any time, even when no gate is open.
3. **`kiln check flow`** (`checks`) with a **negative suite**: a table of deliberately invalid flows, one per rule, each of which the check must refuse by name — and a stub that accepts everything, which the suite must catch.

Two scripted walks are the acceptance: an **interface feature** through the Roadmap gate and all eleven feature gates (12 gates), and a **plain feature** through the Roadmap gate and nine (10 gates; Experience design and UI review recorded *not applicable*). Both are driven only through the CLI, and both are killed at every named step and must finish equal to the uninterrupted walk.

What r14 deliberately is *not*: added gates and flows from files (r26), the ten-part brief and moves in a browser (r20), the unattended tail's arming and delegated crossings (r21), the event catalog and stream (r15), workers and models (r16), configuration as files (r17), the director (r18). The steps in a walk are **scripted**; the "person" in the tests is a **scripted stand-in** recorded as such.

---

## 2. Where r14 sits

```
 r12 foundations reset (done) ── flow v1/v2 as data, move kinds, validators, three checks
 r42 spike, go (done)        ┐
 r13 durable core (done)     ┴── one gate: open whole, one-commit move, keyed, first wins, no clock
                                 │
                            r14 GATES AS DATA, WALKED  ◀── this row
                                 │
              r15 the record ──▶ r18 the director ──▶ r20 gates on the web ──▶ r21 stepping in ──▶ r26 added gates
```

**What the predecessors handed over, and what r14 did with it:**

| Hand-off | What r14 does with it |
|---|---|
| r12: the twelve-gate flow v2 with `appliesWhen` **declared, never evaluated**; the closed move kinds; `moveAllowed` | Adds rules to the data (all optional), evaluates `appliesWhen`, and reads every walk decision from the data. `v1` is untouched. |
| r12: three never-vacuous checks with planted-violation tests | A fourth, `flow`, built the same way: stable codes, never vacuous, a negative suite that can fail. |
| r12: `gate-rail.md` "declared as data only … evaluation is r14/r15" | Rewritten to describe what executes; a drift test ties it to the data and asserts those sentences are gone. |
| r13: the gate contract, outcome vocabulary, keyed commands, first-move-wins | Reused unchanged. The gate's *shape* gains optional fields; no guarantee is weakened and r13's tests run unchanged. |
| r13: gate ids are `gate:<feature>:<gateKey>:<round>` | A gate that opens again is a **new round with a new id** — the oracle's "one record per gate" needs no change for revise or re-crossing. |
| r13: the row/unit shells ("r14 replaces the script with the real walk") | `kiln.row` gets a `walk` form; the `script` form stays and keeps its tests. |
| r13: the channel and the thin CLI, built "because r14's headless walk will drive it" | Three more channel operations and `kiln feature …` over the same socket. |
| r13 carried forward: nothing distinguishes a person from a program as the decider; a reused pid blocks start-up | **Not decided here.** The scripted decider is recorded as `script:r14` and the report says no human decided. |

---

## 3. The shape of the system

```
 kiln feature admit / next / move / state        kiln gate move --note --target --admit
            │  (one JSON line each way over r13's private Unix socket; a completer never opens the store)
            ▼
 ┌───────────────────────────────────── the OWNER (one process per store) ─────────────────────────────────────┐
 │  channel ─▶ walks API ───────────────┐                                                                      │
 │            (admit · state/next · move)│                                                                     │
 │                                       ▼                                                                     │
 │   contracts/flow  ◀── pure ── durable/walk ── kiln.row (walk form) ── phases:                               │
 │   engine · applies · glob · validate      admit → admission → pin → work → open → decide → consume         │
 │                                       │                                  │ opens (keyed)        ▲ reads    │
 │                                       │ units (scripted, single-step)    ▼                      │ the     │
 │                                       ▼                          gate API (r13, extended)       │ STORED  │
 │                                  kiln.unit tasks                 open · submit · state          │ record  │
 │                                                                  decision slot ◀── feature-level withdraw │
 └───────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                   store: SQLite via the seam · + kiln.walk/<feature> (the one new document family)

 checks/flow.ts ──▶ contracts/flow/validate.ts          (the check never loads durable or the library)
```

**Layers** (the layer rule is unchanged: no new package, no new edge):

| Layer | Where | New in r14 |
|---|---|---|
| Flow data | `contracts/src/flow/{types,v2}.ts` | optional fields: per-move `rules`, `triage`, `armsTail`, `delegable`, `restorePoint`, `origin`, `after`; `v1.ts` byte-identical |
| Flow engine (pure) | `contracts/src/flow/{engine,applies,glob,validate}.ts` | everything that is a *rule about the flow* |
| The walk | `durable/src/walk/{input,state,walk,brief,moves,watch,doc}.ts` + `tasks/row.ts` | the effectful half: opens gates, waits, records, advances |
| The gate | `durable/src/gate/*` | additive: note/target/admit validation, stored `noteRequired`/`returnsTo`, the `withdrawn` end, a `withdraw` request on the decision slot |
| The channel and CLI | `durable/src/channel/*`, `cli/src/feature-commands.ts` | `feature.admit`, `feature.state`, `feature.move`; `kiln feature …` |
| The check | `checks/flow.ts` | `kiln check flow` |

**Why the rules are in `contracts` and the walk in `durable`.** The check must run without a store or the library (`checks` may import only `contracts`), and the owner must advance the walk (only `durable` touches the store). A pure core read by both is the only arrangement the layer rule allows — and it is also what the director (r18) will compose later, without moving anything.

---

## 4. The flow as data, and the engine over it **[built]**

### 4.1 Data

v2 already lists twelve gates with a move vocabulary each. r14 adds, all optional so v1 and every r12 record stay valid:

| Field | Meaning | Where it is set |
|---|---|---|
| `rules[kind]` | `note: required\|optional`; `leads` (next · same-gate · workers-then-same-gate · rebuild-then-recross · split · roadmap-edit); for `reject`, `targets: { earlier, roadmap?, default }` | every move of every gate |
| `triage: "skippable"` | triage may skip this gate | Concept, Architecture — and **nothing else** |
| `armsTail` | the unattended tail may be armed here | Specification only (data and check; r21 acts on it) |
| `delegable` | never · default · explicit | never: Roadmap gate, Concept, Architecture, Experience design, Specification, UI review · default: Work plan … Documentation · explicit: Merge |
| `restorePoint` | the commit `restart` rebuilds from | Implementation |
| `origin: "added"`, `after` | reserved for r26's added gates; the check refuses arming on them and follows `after` for cycles | none in v2 |

### 4.2 Engine

`order · rule · noteRequired · next · targetsOf · consequence · triage · cap · applicability · atUiSlot · validateFlow` — pure functions, tested without a store. The one that carries the semantics is `consequence(flow, gate, kind, target, state)`, the executable form of `the-flow.md` §7:

| Move (at) | Goes to | Re-crossed | Work done |
|---|---|---|---|
| approve | next applicable gate | — | author of that gate |
| revise (most gates) | same gate, round + 1 | — | author, with the note |
| revise (Code review, UI review) | same gate, round + 1 | — | **workers** on the current code, then a fresh review of the whole diff |
| reject, no target | same gate, round + 1 | — | a fresh author |
| reject → earlier gate T | T, round + 1 | every applicable gate after T | fresh author at T |
| reject, no target (Verification) | `@build` | every applicable gate after the build | workers, on the current code, with the diagnosis |
| reject → roadmap (Concept, Merge only) | out of the lane | — | — |
| restart (Code review, UI review) | `@build` | every applicable gate after the build | rebuild from the restore point |
| split+revise (Implementation) | Work plan | Work plan … end | revised plan; the remainder is *proposed* to the roadmap, never admitted |
| (admission crossing) revise / row edit | admission, round + 1 | — | redraft the proposal |
| (admission crossing) reject | the walk ends *not admitted* | — | — |

`@build` is the one pseudo-target: *after Implementation, before Code review*. Gates "after" a target are the later gates that are **pinned applicable and not skipped** — a gate recorded not applicable has nothing to cross.

---

## 5. Applicability and its reasons **[built]**

Experience design and UI review apply only to interface work. r14 turns "declared" into "decided, once, and provable":

* **Pinned at admission.** In the commit that follows the Roadmap gate's `approve`, both gates are evaluated from the feature's facts (`paths`, `labels`, cited `journeys`) and any gate the person *required*; the answer is stored in the row's checkpoint. Each *not applicable* is an outbox entry in the **same commit** as that checkpoint — so it is recorded exactly once, by construction.
* **A reason, not a boolean.** The answer carries a `Reason`: the rule, the three-valued evaluation of each predicate (`match` · `no-match` · `absent`), the verdict, and a plain sentence. It is canonical JSON, so "the same facts give the same reason" is a byte comparison, and a restart that re-evaluates produces the same bytes.
* **OR across predicates, absent is false.** A feature with an interface file but no label still applies; a fact nobody supplied counts as false and the reason says `absent` — never a guess, never "apply by default".
* **UI review alone may turn on.** At its own slot, if it was pinned not applicable and not required, the diff predicates (`ui_files_changed`, `tokens_changed`, `routes_changed`) are checked; if true it becomes applicable (`gate.became-applicable`) and opens. Nothing ever turns an applicable gate off, and Experience design never changes after admission.
* **Glob dialect.** A 40-line pure matcher (`**`, `*`, `?`, literals) — no dependency, because `contracts` has no `node:` access and a library matcher would be a new pinned dependency. `kiln check flow` refuses a rule using any other glob character.

Not applicable ≠ skipped ≠ settled. They are three different recorded outcomes with different causes (a rule · triage · a person's move), and the check, the walk and the contract keep them apart.

---

## 6. The walk **[built]**

### 6.1 One row, one checkpoint

`kiln.row`'s input becomes `{feature, script}` (r13, unchanged) **or** `{feature, walk}`. A walk's whole state — pinned applicability, cursor, rounds, which gates are approved and with which upstream revisions, the note that is the next step's instruction, the fix-round count — lives in the task's **checkpoint**, committed with every transition. Kill-and-resume is therefore the library's, already proved by r42 and r13, not a new mechanism.

### 6.2 The phases

| Phase | Does | Commit |
|---|---|---|
| `admit` | opens the admission gate (`gate:<f>:gate0:<n>`), whose brief is the *admission proposal* (which interface gates apply and why, the triage proposal, the cap) | open, keyed `walk:<f>:open:gate0:<n>` |
| `admission` | waits on the gate task. `approve` continues; `revise` and row edits open round + 1; `reject` ends the walk *not admitted* | — |
| `pin` | reads the **stored** record; takes `admit` (gates required, triage override, fix-round cap); evaluates applicability, triage and cap | **one commit**: `walk.admitted`, one `gate.not-applicable`/`gate.skipped` each, status → active, checkpoint |
| `work` | the scripted units of the cursor gate: an *author* unit, a distinct *judge* unit where the gate has a judge, *workers* or a *rebuild* where the last consequence says so, Verification's fix rounds | per unit, keyed |
| `open` | opens the cursor gate's next round with its brief, `noteRequired` and `returnsTo`; **binds it to the feature** (see §7.3) | atomic with `openGateId`, keyed `walk:<f>:open:<gate>:<round>` |
| `decide` | the checkpoint *is* "waiting on the gate task"; the function that runs when it wakes reads the **stored** record (a person's move, or a feature-level withdrawal), applies the consequence the flow data gives, and records the outcome. It ends *only because the gate ended*. | **one commit**: new walk state, outbox entries, checkpoint |
| `verify` | Verification only: takes the scripted verifier's next verdict; while it is `fail` and fewer than the pinned cap of automatic rounds has run (and no person has rejected), records a `walk.fix-round` and queues a worker unit and a re-check | **one commit** per round |

**The row never writes a move record and has no path that completes a gate.** The only things that end `decide` are r13's decision step (a person's move) or a withdrawal (a person's feature-level move). A weakened row that treated a restart as approval is part of the proof — and must be caught.

### 6.3 Advancing without atomicity — on purpose

After a gate settles there is a real window: the move is committed, the next gate is not yet open. r14 does **not** close it by putting "open the next gate" into the move's commit (that would couple every gate to the walk and change r13). It makes the window *harmless*: the next opening has a deterministic command key, so a row that wakes after a kill reads the stored record, recomputes the same consequence, and issues the same key — `repeat`, never a second gate. The window has names (`walk.settled-read`, `walk.gate-opening`) and is attacked in the matrix.

### 6.4 What a person sees, from the command line

```
kiln owner --store $S &                                              # listening · ready
kiln feature admit --store $S --key k1 --feature f1 --walk walk-interface.json
kiln feature next  --store $S --feature f1                           # blocks until a gate is open, prints it:
  {"gateId":"gate:f1:gate0:1","gateKey":"gate0","round":1,"briefRef":"9c…","vocabulary":[…],"brief":{…}}
kiln gate move --store $S --gate gate:f1:gate0:1 --key m1 --kind approve --by script:r14 --brief-ref 9c… --admit admit.json
kiln feature next  --store $S --feature f1 --after gate:f1:gate0:1   # waits for the NEXT gate — an event, never a poll
…                                                                    # eleven more, ending in {"status":"done"}
```

`feature next` is the only waiting command. It waits on an in-process notification the owner raises when a gate opens or the walk ends, and re-derives its answer from the store; an owner restart ends the wait with a connection loss the client retries. Nothing polls (constitution IX).

### 6.5 Verification's automatic rounds

Before Verification opens, a scripted verifier gives a verdict. While it is `fail` and fewer than **cap** rounds have run (default 2, settable 0–3 *at the admission crossing*), a worker unit runs and the verifier runs again; each round is a `walk.fix-round` entry of kind `mitigate` by `factory`. Then the gate opens, with the cap, the rounds used and the verdicts in its brief. A round is **never a person's move and never a settlement** (`mitigate` is in no gate's vocabulary and `submitMove` refuses it by name), and after a person's reject no further automatic rounds run.

### 6.6 Briefs: only the facts r14 owns

The store treats a brief as opaque JSON. The walk attaches the small, deterministic set it owns: the *instruction* (the previous move's note), `recross.changedSince`, the triage skip and its reasoning, the pinned applicability, and the fix-round counts. "What changed since the last approval" is computed from **artifact revisions** — a hash of (gate, the scripted content label, the upstream revisions it judges, the note) compared with the vector recorded at that gate's last approval; an empty difference renders as "nothing this gate judges changed since the approval on …". Assembling the real ten-part brief is r20.

---

## 7. What changes in the gate **[built]**

### 7.1 The move gains three optional fields

`note`, `target` and `admit`. They are part of equality for `repeat` and `key-conflict` (a changed note under the same key is a `key-conflict`), and they are stored in the move record in the same commit as the settlement. `submitMove` refuses, as `invalid-move` with a named detail: a corrective move with no note · a `target` on anything but a reject · a target the gate was not opened to accept · `admit` anywhere but `approve` at the Roadmap gate · a fix-round cap outside 0–3 · `mitigate`. The validation order is fixed (key → shape → decider → brief → vocabulary → note → target → admit → race) and a refusal writes nothing. The **refusal vocabulary stays closed**; no new code.

### 7.2 The gate stores what it was opened to accept

`noteRequired` and `returnsTo` are written once, in the opening commit, beside the move vocabulary — so a move is judged against the gate's **own stored document**, never against the walk's memory. That is r13's discipline, extended.

### 7.3 A third end for a gate: withdrawn

A person may send a feature back to an earlier gate **at any time**. That cannot be a move *on* a gate (a settled gate refuses moves; between gates there is none), so it is a **feature-level move**: `{kind: reject, decidedBy, target, note}` with a key, on the feature.

* **A gate is open** → the owner delivers a `withdraw` request into that gate's decision slot — the same single-shot rendezvous a move uses. The decision step's **one commit** writes the feature-move record, the withdrawal, `gate.withdrawn` and `move.committed`, and completes the decision. The gate ends *withdrawn* — not settled, with no move record.
* **No gate is open** (a step is running) → a keyed command records the move as `pending`. The next gate-opening commit **reads and refuses while a move is pending**, and the row consumes it at its next wake, ignoring the finished step's result. Walk units are single-step, so "stops at its checkpoint" means the unit's only checkpoint, its end.
* **Opening is bound to the feature.** The commit that opens a walk gate also sets the feature's `openGateId` — so there is no window in which a move sees "no gate" and a gate then opens.

First-move-wins and exactly-once are the same proved mechanism: a gate move that is committing wins over a feature move (judged against the stored record), a second feature move while one is pending is `lost-race` naming the first, and a move on a withdrawn gate is `stale` naming the feature move's key. Cost, stated: `GateState` gains `withdrawn`, and the oracle gains I10 and learns the third end in I1–I3.

---

## 8. `kiln check flow` and its negative suite **[built]**

`checkFlow({flow?})` calls the pure `validateFlow` and maps every fault to `{code, file, detail}`. **All-or-nothing**: it reports every fault it finds, then fails. It is never vacuous: it notes how many gates it examined, and examining none is `flow-vacuous`. Stable codes, one per rule of FLOW-7:

| Rule | Codes |
|---|---|
| anchors | `flow-anchor-first`, `flow-anchor-last`, `flow-after-merge` |
| presence and order | `flow-builtin-missing`, `flow-builtin-order`, `flow-gate-duplicate` |
| conditional gates | `flow-conditional-placement`, `flow-conditional-unexpected`, `flow-glob-unsupported` |
| roles and judges | `flow-role-unknown`, `flow-judge-not-judge` |
| move kinds | `flow-move-kind-unknown`, `flow-move-wrong-scope`, `flow-mitigate-person-move`, `flow-rule-missing`, `flow-note-not-required` |
| `returns_to` | `flow-returns-to-invalid` |
| prerequisites | `flow-restart-no-restore-point`, `flow-mitigate-cap-invalid`, `flow-mitigate-no-cap` |
| triage | `flow-triage-forbidden` (Documentation can never be skippable) |
| arming | `flow-arming-point`, `flow-arming-roadmap`, `flow-arming-added-gate`, `flow-delegable-invalid` |
| cycles, shape | `flow-cycle`, `flow-vacuous`, `flow-version` |

**The negative suite** is a table of mutations, each applied to a deep copy of v2: at least one member per code, plus two multi-fault members. `runNegativeSuite(check)` returns what the check accepted, what it refused with the wrong code, and which codes no member reached. The tests assert all three are empty, that each member's *repair* makes the check pass again (so the failure was the fault's), and — the point — that **a stub which accepts everything makes the suite fail**. The check is the fourth of its kind: `kiln check` prints four `PASS` lines, and the text that said "three" is updated (history is annotated, not rewritten).

Two limits to know: the check is for the *default* flow (FLOW-7 "Must (default flow)"; added gates are r26), and the `flow-cycle` detector is exercised only by a negative member that feeds it two *added* gates pointing at each other — no real flow has `after` references yet.

---

## 9. The command line and the driver **[built]**

```
kiln check [network|boundaries|legacy|flow]… [--json]
kiln gate move … [--note <text>] [--target <gate|@build|roadmap>] [--admit <file.json>]       # r13's, extended
kiln feature admit --store --key --feature --walk <file>
kiln feature next  --store --feature [--after <gateId>]          # waits for an event; prints one JSON line
kiln feature state --store --feature
kiln feature move  --store --feature --key --by --target --note  # always a reject: the only feature-level kind
```

Exit codes are r13's: 0 any answered request (a refusal is an answer), 2 usage, 3 owner unreachable, 4 outcome unknown (retry the same key). A completer never opens the store.

**The driver** (`tests/walk/drive.ts`, test support, not product) shells out to exactly this CLI: admit, then loop *next → choose the move from a script → gate move* until the walk ends. Its decider is `script:r14`. It is why "from the CLI" is literally true of the acceptance walks — and why the script cannot cheat by opening gates itself.

---

## 10. Data **[built]**

* **One new document family**, `kiln.walk/<feature>`: `{status, openGateId, moves (keyed), pending}`. It exists because the opening commit and a completer's command must read the *cross-task* facts — which gate is open, whether a move is waiting — and a task's checkpoint can be read by neither. Everything else about the walk stays in the checkpoint.
* **Gate documents** gain `noteRequired` and `returnsTo`; the `kiln.move` document gains an optional `withdrawn` field. No other family changes; r13 documents are open objects, and a test opens an r13-shaped store under the new owner.
* **Identities.** Gate round `gate:<f>:<gateKey>:<round>` · open command `walk:<f>:open:<gate>:<round>` · work unit `walk:<f>:unit:<gate>:<round>:<role>` · fix round `walk:<f>:fix:<round>:<n>` · a feature move is the caller's key.
* **Outbox additions** (each with actor and cause, in the commit of the state it records): `walk.admitted`, `gate.not-applicable`, `gate.became-applicable`, `gate.skipped`, `gate.withdrawn`, `walk.returned`, `walk.fix-round`, `walk.split`, `walk.left-lane`, `walk.not-admitted`, `walk.completed`. r15 adopts them as it adopts r13's; the schema is not frozen here.

---

## 11. How the design will be attacked **[built]**

The method is r13's, extended; the new things are what a *walk* adds to a gate.

| Mechanism | What it is |
|---|---|
| **Sixteen new kill points** | Injected hooks, none from the environment: `walk.admit-opened`, `admission-read`, `pin-begin`, `pin-after-write`, `pin-committed`, `unit-created`, `gate-opening`, `gate-opened`, `settled-read`, `consume-after-write`, `consume-committed`, `fix-round-begin`, `fix-round-committed`, `withdraw-received`, `withdraw-after-write`, `withdraw-committed`. Each is declared in the task that first fires it, so r13's "declared equals used" test never goes red; a proof guard fails by name on one that never fired. |
| **Walk equality** | The headline assertion: a walk killed at a point, restarted on the same store and finished has an outcome list **equal to the uninterrupted walk's** — same gates, same moves, same outcomes, one move per gate. |
| **Oracle additions** | **I10** withdrawn ⇔ a withdrawal ∧ decision terminal ∧ no move record · **W1** outcomes follow the flow's order over the pinned applicable gates (plus re-crossings) and no round has two settled records · **W2** each not-applicable/skipped/became-applicable appears exactly once with a reason equal to the engine's recomputation · **W3** no outcome's decider is a clock, a restart or the owner · **W4** automatic rounds ≤ the pinned cap, each `mitigate` by `factory`, none coinciding with a settlement. I1–I3 learn the third end of a gate. |
| **Fresh reader** | `inspectStore` gains the walk's view; what a test judges is the store, never the owner's memory. |
| **A weakened walk** | A row whose `decide` treats a restart as approval lives in the tests' support code; the proof must fail on it by name (W1/I2/W3) and pass on the real walk with the same script. |
| **A permissive check** | The accept-everything stub of §8 — the suite must fail on it. |
| **Mutation checks** | On a committed tree, each reverted and the revert asserted clean: delete a rule from `validate.ts` · make the check pass on empty · loosen the glob check · make the withdraw path also write a move record (I10 and I2 must fail) · let `submitMove` accept a move on a withdrawn gate · change one vocabulary in the data only, then in the contract only. |

**Two tiers, decided now.** r13's suite already takes 142–166 s of its 180 s threshold, so the kill matrix is in the **proof tier** from the start (`*.proof.test.ts`, `npm run proof`): every point on the interface walk, every gate of both walks at every point, a reject-and-re-cross script, and 300 random kills. The **default tier** runs a four-point smoke (one kill per phase group), one storm, the clock test and the weakened-walk control. The runner prints which tier ran; nothing is cut; and **the recorded proof run is the evidence for SC-003**.

---

## 12. Governance **[built]**

| Principle | How r14 meets it |
|---|---|
| **I — author / judge separation** | Every judged gate gets a distinct *judge* unit beside its *author* unit; a test asserts no unit is both. No unit decides a gate; the row has no path that writes a move record. |
| **V — a missing person never approves** | Every walk gate is an r13 gate: waiting is stored, nothing settles it but a committed move. The new windows (between a move and the next opening; a pin; a fix round; a withdrawal) are named kill points, each attacked. |
| **VI — the Roadmap gate is human-only** | Every walk starts at a person's `approve` carrying `admit`. `Move` has no delegation field; the admission crossing accepts no delegated move; both are asserted. |
| **VII — everything recorded, atomically** | Every walk outcome is an outbox entry with actor and cause in the commit of the state it changes. **The part r14 does not meet**: step and task progress events and the catalog/stream are r15's — stated in the spec's Assumptions and the plan's Complexity Tracking, not passed by omission. |
| **IX — event-driven surfaces** | `feature next` waits on an in-process event and re-derives from the store. No polling anywhere. |
| *The Flow* | Anchors, built-ins never removed, closed move kinds, "shortcuts are decisions": enforced by the engine and by `kiln check flow`, each rule with a negative member that fails by code. |
| *Dependencies* | None added. |

---

## 13. Decisions and deviations worth knowing

| Decision | Why |
|---|---|
| The pure rules live in `contracts`, the walk in `durable` (R1) | The check needs the rules without a store; the owner needs the walk next to the gate. |
| `kiln.row` grows a `walk` form, not a sixth task kind (R2) | CORE-2 names five kinds; a feature *is* a row. |
| A re-opened gate is a new round with a new id (R3) | "One record per gate" holds by construction. |
| The owner advances; opening the next gate is idempotent, not atomic with the move (R4) | Atomic would couple every gate to the walk and change r13; the key-repeat window is named and attacked. |
| Note, target and admission decisions are fields of the move (R5) | They must be recorded atomically with the settlement; free text would be parsing prose. |
| A feature-level move reaches an open gate through its decision slot (R6) | Only a decision step can complete a task in the same commit as the record; polling is forbidden. |
| Applicability pinned at admission, UI review may only turn on (R7; clarification) | Matches `ui-flow.md` §6; reproducible; an applied gate never flips off. |
| No glob dependency (R8) | `contracts` has no `node:`; a library matcher is a new pinned dependency. |
| `restart` and a Verification reject re-cross from `@build` (R11) | Rebuilt code must not skip Code review (P2: nothing is carried across a change it did not see). |
| Arming is data and a check, not behaviour (R13; clarification) | r21 owns arming; the check can still refuse a malformed rule. |
| The admission gate *is* the feature's Roadmap-gate crossing; reject ends the walk (R18) | Matches `the-flow.md`; unifying with `kiln.roadmap` is r18/r22's. |
| Kill matrix in a proof tier from the start (R16) | Measuring first and moving later is near-certain rework. |

**Amendments made to the spec while planning and analysing** (all recorded in the spec and `plan.md`):

1. **FR-025** — `restart` re-crosses every gate after the build, not "returns to the gate it was made at"; a Verification reject with no target means rework on the current code, then the same re-crossing.
2. **FR-070** — "MUST NOT change the r13 gate contract" became "MUST NOT weaken any guarantee; MAY extend the shape".
3. **FR-023** — "stops at its checkpoint" is met by single-step walk units.
4. **FR-027 (new)** — the admission crossing's four outcomes.
5. **Late interface discovery is not recorded** by r14 (the brief's, r20).
6. **`keepTriage` → `overrideTriage`**, `admit.require` validated, and the check's gate count is a note rather than `scanned`.

---

## 14. Status and what remains

**All 89 tasks are done.** Measured on Node 25.9.0: `npm test` 643 new + 500 legacy tests (111 s), `npm run proof` 92 tests (276 s), four checks `PASS`; the default tier passes on Node 22.19.0 / 23.6.0 / 24.1.0 in 75–78 s and the proof tier on 22.19.0. See [baseline.md](./baseline.md) and the [implementation report](./implementation-report.md), which also lists what this row did *not* decide (a person versus a program as decider; scripted steps; the ten-part brief; arming; the event stream).

**r14 stays `queued`.** Closing the row is the human's Roadmap-gate move; this row does not edit `ROADMAP.md`, and `legacy/` is byte-identical.

---

## 15. Risks and unknowns

* **The withdraw path touches r13's proved gate.** Mitigation: r13's whole proof is re-run unchanged first; `withdraw` is a branch that cannot run for a move; a mutation check makes it write a move record and requires I10 and I2 to fail.
* **The window between a move and the next opening** is the walk's new place to go wrong. It is named, attacked at both sides, and made idempotent rather than atomic.
* **Suite time.** The decision above (proof tier) removes the surprise; T058 verifies at least 15 s of margin on the default tier.
* **Scripted everything.** Units, verdicts and the decider are scripted; the walk proves the *gates*, not the *work*, and a scripted decider is not a human. The implementation report will say so.
* **Reasons can drift.** A change to the evaluator's text would change bytes; goldens compare bytes and a restart test compares across a kill.
* **`kiln.row` creeping toward the director.** Units are scripted, there is no scheduling, no affinity, no planner; any behaviour not in the spec needs a spec line first.
* **macOS only, no power-loss test, a reused pid blocks start-up** — all r13's, unchanged.

---

## 16. Glossary

* **Flow** — the ordered gates of a feature, as data; v2 is the Roadmap gate plus eleven feature gates.
* **Walk** — one feature's passage through its pinned flow, and the task that carries it (`kiln.row`, walk form).
* **Admission crossing** — the feature's pass through the Roadmap gate: a person's `approve` with `admit`, which starts the walk.
* **Pin** — fix the feature's applicability, triage skips and fix-round cap, once, at admission.
* **Applicable · not applicable · skipped · withdrawn · settled** — the five outcomes a gate can have in a walk; none is another's synonym.
* **Round** — one opening of a gate; a revise, a fresh author or a re-crossing opens round + 1 as a new gate.
* **Re-cross** — open every applicable gate after a reject's target again; nothing is carried across a change it did not see.
* **`@build`** — the pseudo-target between Implementation and Code review.
* **Feature-level move** — a reject made on the feature, not on a gate; it withdraws an open gate or is held pending.
* **Withdrawn** — a gate ended by a feature-level move without being settled.
* **Reason** — the canonical record of why a gate applies or not: the rule, the facts, the verdict.
* **Artifact revision** — the hash that lets a brief say what changed since a gate's last approval.
* **Negative suite** — the table of invalid flows `kiln check flow` must refuse.
* **Weakened walk** — the deliberately wrong row the proof must catch.
* **Proof tier** — the `*.proof.test.ts` files run by `npm run proof`; the evidence for SC-003.

---

## 17. Reading order

1. This overview, then [contracts/walk-contract.md](./contracts/walk-contract.md) — what an engineer building on the walk actually needs.
2. [contracts/flow-data.md](./contracts/flow-data.md) (the engine and the consequence table) and [contracts/check-flow.md](./contracts/check-flow.md) (the codes, the suite, the CLI).
3. [data-model.md](./data-model.md) §1–§3 and [research.md](./research.md) R3–R7, R11, R16, R18.
4. [spec.md](./spec.md) — the clarifications and the analysis decisions at the top explain *why* it reads as it does.
5. When code exists: `contracts/src/flow/engine.ts` → `durable/src/walk/walk.ts` → `durable/tests/proof/support/oracle.ts` → `walk-smoke.test.ts` → `walk-negative.test.ts` (the weakened walk).
