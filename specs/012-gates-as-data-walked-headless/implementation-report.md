# Implementation report: Gates as data, walked headless (row r14)

**Branch**: `012-gates-as-data-walked-headless` | **Report date**: 2026-10-28 | **Base**: `main` (`034db02`, r13 merged)
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tasks**: [tasks.md](./tasks.md) · **Readings**: [baseline.md](./baseline.md) · **Lab notebook**: [notes.md](./notes.md) · **Technical overview**: [overview.md](./overview.md)
This file is about the *work*: what was built, how far the evidence can be trusted, what changed from the plan, what went wrong on the way, and what is still open. It says what a reader should **not** conclude as plainly as what they can.

> **Reading guide.** Five minutes: §1 and §7. Reviewing the code: §2. Judging the evidence: §3–§4. Picking up the open items: §6–§7.

## 1. Status in one paragraph

**All eight user stories are built and every task is done.** A feature now *walks* the standard flow: `kiln feature admit` creates its row, **the owner** opens each next gate from the flow's data, a person's move through `kiln gate move` settles it, and the walk goes on — the Roadmap gate plus eleven feature gates for an interface feature (12 gates), nine for a plain one (10 gates, Experience design and UI review recorded *not applicable* with reproducible reasons). Moves lead where `the-flow.md` §7 says (revise, reject to an earlier gate with every later gate re-crossed, restart, split+revise, the admission crossing's four outcomes); a **feature-level reject** sends a feature back at any time and withdraws an open gate in one commit; triage skips Concept and Architecture only; Verification runs a bounded number of automatic fix rounds. `kiln check flow` validates the default flow all-or-nothing and refuses every member of a 37-member negative suite; `gate-rail.md` is rewritten for what executes and a drift test parses it. Measured on the finished tree (Node 25.9.0, macOS): **`npm test` exit 0 — 643 new + 500 legacy (30 skipped) tests, 111 s**; **`npm run proof` exit 0 — 92 tests, 276 s**; `npm run check` four `PASS`; the default tier passes on **Node 22.19.0, 23.6.0 and 24.1.0** in 75–78 s and the proof tier on 22.19.0; a fresh clone reproduces the quickstart. `legacy/` and `specs/ROADMAP.md` are unchanged. What r14 deliberately is **not**: the ten-part brief and moves in a browser (r20), arming and delegated crossings (r21), the event stream (r15), workers and models (r16), configuration (r17), the director (r18), added gates from files (r26) — and a scripted decider is **not** a human.

## 2. What exists

About **1 900 lines of source** and **≈ 3 400 lines of tests, fixtures and drivers** added to `kiln/`, over 13 commits.

```text
kiln/packages/contracts/src/flow/    types.ts v2.ts (+rules, triage, arming, delegable, restore point)      the flow's data
                                     engine.ts applies.ts glob.ts validate.ts                                the PURE rules: order · next · consequence · targets · triage · cap · applicability · the validator
kiln/packages/contracts/gate-rail.md  rewritten; tests/gate-rail-drift.test.ts parses it against the data and the engine
kiln/packages/durable/src/walk/      input.ts state.ts brief.ts walk.ts doc.ts moves.ts view.ts watch.ts api.ts   the walk: admit → admission → pin → work ⇄ verify → open → decide
kiln/packages/durable/src/gate/      + note/target/admit validation · the `withdrawn` end · a `withdraw` request on the decision slot
kiln/packages/durable/src/tasks/row.ts   the `walk` form beside r13's `script` form
kiln/packages/durable/src/channel/   + feature.admit · feature.state · feature.next (waits on an event) · feature.move
kiln/packages/cli/src/               feature-commands.ts cli-flags.ts · `kiln gate move --note --target --admit` · `kiln gate open --returns-to`
kiln/checks/flow.ts                  `kiln check flow` (the fourth check) · tests/flow-negative.ts (37 members, 28 codes)
kiln/tests/                          run.ts (+ the proof tier) · tools/mutate.ts (sabotage runner) · walk/drive.ts (the scripted CLI driver)
kiln/fixtures/walk-*.json            the walks the quickstart and the tests run
```

## 3. How the design carries the contract

* **Gates as data.** Every rule — which gate is next, what each move needs and where it leads, which gates apply, what triage may skip, the cap, who may arm the tail — is a field of `v2.ts` and a pure function in `contracts`. A test changes the data and shows the answer change with no other change (SC-009). The consequence table is **read from `the-flow.md` §7 as text** and from `gate-rail.md` §2, and each row is run through the engine.
* **The owner advances the walk.** The row never writes a move record and has no path that completes a gate; `decide` ends only because the gate task ended. Opening the next gate is *idempotent*, not atomic with the move: a deterministic command key makes a kill in between come back as a `repeat`. The window has names (`walk.settled-read`, `walk.gate-opening`) and is killed on both sides.
* **Applicability is evaluated once, recorded once, and explained.** Pinned at admission in the same commit as the checkpoint; the reason is canonical JSON (the same facts give the same bytes, checked across a kill); UI review alone may turn on at its slot; nothing turns an applicable gate off.
* **The feature-level move** reaches an open gate through its decision slot, so first-move-wins and exactly-once are the *one* mechanism r13 proved; with no gate open it is recorded and applied at the walk's next wake. Cost, stated: `GateState` gained `withdrawn`, the oracle gained I10, and r13's I1–I3 learned a third end of a gate.
* **Nothing polls.** `feature next` waits on an in-process event and re-derives its answer from the store; the walk shows a gate only once its decision step has registered.

## 4. How far the evidence can be trusted

| Claim | Evidence | Limit |
|---|---|---|
| A killed walk finishes **equal to the uninterrupted one** (SC-003) | `npm run proof`: every walk point × every hit × both walks (measured from a hit log), every gate at the two most dangerous points, the re-crossing walk, the fix-round walk, **300 random kills (seed 20261027)**; judged by a fresh reader with no owner: the outbox (type, subject, actor, cause, canonical data — no clock) equals the uninterrupted walk's, W1–W4 and I1–I10 clean, one move per gate, nothing left waiting or parked, no timer. A 12-test smoke runs in every `npm test`. | The full matrix is the proof tier, run and recorded at close-out, **not** on every `npm test`. Kills are SIGKILL of the owner process; host power loss is outside the guarantee (r13's boundary) and untested. |
| Nothing is approved by a restart or a clock | 7 consecutive kills on a waiting walk gate; ±10 years of clock skew; no timer on any gate; the weakened walk is rejected | The clock tests use the owner's injected clock; a real NTP jump is not simulated. |
| The proof can fail | the weakened walk (a row that reads the absence of a move as an approval) is caught by W1; a kill that never fires fails `proof-point-not-fired`; the accept-everything stub fails the check's suite; **11 sabotages** of the code (US4 3 · US5 5 · US8 3), plus the weakened walk, are each caught by name and each revert verified clean | Mutations are chosen by me; a defect I did not think of is not covered. |
| `kiln check flow` refuses every invalid flow | 37 members for 28 codes, each built by mutating a JSON-cloned copy of v2; each must report its own code and no unlisted one; two multi-fault members report all their codes | The check is for the *default* flow (FLOW-7 "Must (default flow)"); the `flow-cycle` detector is exercised only by a member that feeds it two added gates — no real flow has `after` references yet. |
| Notes, targets and admission decisions are judged against the gate's stored document | `gate-extensions.test.ts` (12) + the CLI flag test | The note rule applies to gates opened with `returnsTo`/`walk`; a gate opened the r13 way behaves exactly as before. |

The headline numbers are in [baseline.md](./baseline.md); the order in which the work found things is in [notes.md](./notes.md).

## 5. Success criteria

| | Result |
|---|---|
| **SC-001** interface walk, 11 feature gates, CLI only, repeatable | met: `feature-cli.test.ts` (default) — 12 gates in order, one move each, `done`, nothing after Merge; identical on a second store (proof tier) |
| **SC-002** plain walk, 9 gates, 2 not applicable with reasons, 0 moves accepted on them | met: 10 gates; `gate.not-applicable` ×2 with the reason text; a move on one is `unknown-gate` |
| **SC-003** every named step of every transition survives a kill | met at the proof tier (see §4) |
| **SC-004** `kiln check flow` passes and refuses 100 % of the negative suite; a permissive check fails the suite | met |
| **SC-005** the walk matches `the-flow.md` §7 for every kind of move; 0 corrective moves without a note | met (consequences read from the document; `gate-extensions` for the note rule) |
| **SC-006** after any reject 100 % of later gates are re-crossed, 0 carried forward | met (`moves.test.ts`, the re-crossing kill walk) |
| **SC-007** triage skips Concept and Architecture only | met (`triage.test.ts`, engine cases for every other gate) |
| **SC-008** at most cap rounds for each cap 0–3, none settles the gate | met (`fix-rounds.test.ts`, kills at both fix-round points) |
| **SC-009** changing the data changes the walk with no program change | met (`engine.test.ts`) |
| **SC-010** contract and data agree on every gate | met (`gate-rail-drift.test.ts`, 19; two directions sabotaged) |
| **SC-011** the proof and the check are shown able to fail | met |
| **SC-012** budget and guardrails | met, **after one correction** (§8.3): default tier 75–78 s on the three floors, 111 s for `npm test`; `legacy/` tree id and `specs/ROADMAP.md` unchanged |

## 6. Deviations from the plan (all recorded in `notes.md` as they happened)

1. **Units are created inside the row's own commit**, not as keyed commands (`walk:<f>:unit:…`): creating the unit and parking on it are one `run.commit`, exactly-once by construction.
2. **`decide` and `consume` are one phase in code** (the checkpoint *is* "waiting on the gate task"; the function that runs on wake is the consequence step).
3. **The oracle's walk invariants are a separate module** (`walk-oracle.ts`) over the same inspection, not fields added to `Inspection`; only the withdrawn end touched `inspect.ts`.
4. **The note rule applies to gates opened with `returnsTo`/`walk`**, so r13's tests and hand-opened gates are untouched (FR-070). One r13 test example was renamed (`note` → `comment` in `move-shape.test.ts`) because `note` now has a meaning.
5. **`kiln gate open --returns-to`** was added (not in the task list) so the walk's move semantics can be driven by hand and tested through the CLI.
6. **Three of r13's heaviest kill suites were renamed `*.proof.test.ts`** (`different-process`, `random-kill`, `storm`; content untouched). The default tier took 201 s on Node 22.19.0 with them; r13's own plan named exactly this fallback. They run in `npm run proof`.
7. **The proof tier is *only* the proof files**, not a superset of the default tier (the task text said "include").
8. **`openGate` takes `{ awaitRegistered: false }` for the walk**; the walk shows a gate once its decision step has registered. (See §8.1.)
9. **Spec amendments made while planning/analysing:** FR-025 (restart re-crosses from the build), FR-070 ("weaken no guarantee; may extend the shape"), FR-023 (single-step units), new FR-027 (the admission crossing), and the late-interface discovery is *not* recorded by r14.

## 7. Open items and what this row did not decide

1. **The scripted decider is not a human.** Every move in every walk is `script:r14`; r13's carried item — nothing distinguishes a person from a program as the decider of a move (any process of the same OS user can run `kiln gate move --by <anyone>`) — is **unchanged and undecided**. A later row (identity, r19/r20) must.
2. **Steps are scripted.** The walk proves the *gates*, not the *work*: authors, judges, workers, the verifier's verdicts and the "changed files" are inputs. r16 gives them substance; r18 computes the facts.
3. **Briefs are the small set r14 owns** (instruction, `recross.changedSince`, triage, applicability, fix rounds). The ten-part brief is r20.
4. **Arming and delegated crossings are not implemented** — only the rule is data and checked (`armsTail`, `delegable`). `Move` has no delegation field; r21 acts on the data.
5. **Event stream still minimal.** Walk outcomes are outbox entries with actor and cause in the commit of the state they change; step/task progress and the catalog are r15's (constitution VII's remaining part).
6. **`kiln.roadmap` (r13) and the walk's admission gate are two things.** For r14 the admission gate *is* the feature's Roadmap-gate crossing; unifying them is r18/r22's.
7. **A split's remainder is an outbox entry (`walk.split`)**, a proposal; nothing edits `ROADMAP.md` or admits anything. Turning it into a roadmap row is the Roadmap gate's work (r22).
8. **Key retention:** feature-move keys live in `kiln.walk/<feature>`; r15's archive must keep them with it (documented in `packages/durable/README.md`).
9. **macOS only; no power-loss test; a reused pid still blocks start-up** — all r13's, unchanged.
10. **Closing the row is the human's Roadmap-gate move.** `r14` stays `queued`; this row does not edit `specs/ROADMAP.md`.

## 8. What went wrong on the way (the honest log)

1. **`openGate` stalled 3 s on every other gate of a walk.** r13's bounded wait for "the gate can take a move" polls for the decision step's slot, but the scheduler cannot start the gate's tasks while the *opening task's step is still running*. A 12-gate walk took 18 s against 0.2 s in-process. Fixed for the walk (§6.8) without changing r13's default.
2. **The first kill test found a real bug.** After a kill at `walk.admit-opened`, the restarted owner ran the row's first step before the owner was ready; the gate API answered `not-ready`, the row threw, and the task failed for good. A row step that resumes during start-up now waits for readiness (`Services.whenReady`).
3. **A sabotage showed a test was not testing what it claimed.** "The walk never applies a recorded feature-level move" survived the first run of the mutation checks because my test sent the move in the window where the gate was *settled but not yet consumed* (another path handles that). The test now waits until the row is parked on a running step; the sabotage is caught.
4. **A failing walk leaked its child owner**, which made the debugging script itself hang; `runWalk` now cleans up on any throw and every call has an overall deadline whose failure message says where the store stood.
5. **`structuredClone` was the wrong deep copy** for the flow data (it preserves shared rule objects, so "break one gate's rule" broke every gate's); the negative suite clones through JSON.
6. **`validate.ts` had a real bug the suite exposed:** the "must be never delegable" rule keyed on `appliesWhen` instead of on the two interface gates, so a stray `applies_when` on Work plan cascaded into an unrelated fault.
7. **The first matrix pass was not clean twice:** my script's `PATH` lacked `/usr/sbin` (two `lsof` network tests could not run — not a product fault), and the default tier took 201 s on the floor Node (§6.6).
8. **Several commits briefly carried untested files** (I committed with `git add -A` before a story's tests had run). The final tree is green at each reported checkpoint, but the history is not "green at every commit" for the US3 support files; the checkpoints in `baseline.md` are the record.

## 9. Evidence

[baseline.md](./baseline.md) (before/after, the floor matrix, the proof tier, the tier split) · [notes.md](./notes.md) (mutation checks, what the kills found) · `mutations-us4/us5/us8.json` (the sabotages, re-runnable with `node tests/tools/mutate.ts`) · [overview.md](./overview.md) (the design) · [quickstart.md](./quickstart.md) (the acceptance run, reproduced on a fresh clone).
