# Baseline and control readings: row r14

**Branch**: `012-gates-as-data-walked-headless` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)

The numbers this row is compared against (spec FR-070, SC-012) and the facts measured while building it, each with the command that produced it. Entries are appended as tasks complete; none is edited after the fact.

## Before (T001) — 2026-10-27

Taken on branch `012-gates-as-data-walked-headless` at `7914c12` (spec, plan and tasks committed) and **before any file under `kiln/` changed**. `main` is `034db02` (r13 merged, PR #6).

| Reading | Command | Result |
|---|---|---|
| New + legacy suites | `cd kiln && npm test` | exit **0** — `new: 474 tests · legacy: 500 tests (30 skipped)`; whole `npm test` took **182 s** |
| Live-Pi tier | (printed by the runner) | `live-Pi tier skipped: Pi 1.4.0 installed, measured [0.85.1]` |
| Checks | `cd kiln && npm run check` | exit **0** — `PASS network` · `PASS boundaries` · `PASS legacy — scanned 168 files` (three checks) |
| `legacy/` tree id | `git rev-parse HEAD:legacy` | `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` |
| Difference from `main` in the guarded paths | `git diff --stat main -- legacy specs/ROADMAP.md` | **empty** |

### Environment

| | |
|---|---|
| Node | v25.9.0 (`/opt/homebrew/bin/node`; **not on the default PATH of this shell** — every command is run with `export PATH=/opt/homebrew/bin:$PATH`) |
| npm | 11.14.1 |
| Platform | macOS (Darwin 25.6.0) |

## Text that says "three checks" (T002) — 2026-10-27

Found by grep over `kiln/`, the README and the r12/r13 quickstarts. **Update** = tests/product text (T024). **Annotate** = history, never rewritten.

| File:line | Says | Action |
|---|---|---|
| `kiln/packages/cli/tests/check-boundaries.test.ts:54` | `all three checks together …` | update (T024) |
| `kiln/packages/contracts/gate-rail.md:5` | "reads all three" (sources, not checks) | none — it counts documents |
| `kiln/checks/kiln.json` | responsibility names the network lint, boundaries and legacy identity | update (T020/T024) |
| `specs/009-kiln-foundations-reset/quickstart.md:126` | `All three checks together: npm run check → exit 0` | annotate: "four since r14" |
| `specs/011-durable-core-gate-contract/quickstart.md:22,26` | `the three checks` · `# three PASS` | annotate: "four since r14" |

## Tiers (T003) — 2026-10-27

`tests/run.ts` gained `--proof` (and `npm run proof`): the **default tier** runs every `*.test.ts` except `*.proof.test.ts` and prints `tier: default (N proof files not run; npm run proof runs them)`; the **proof tier** runs *only* the proof files and prints `tier: proof (N proof files)`; a proof file named on the command line always runs; `--proof` with no proof file fails ("ZERO tests"). One deliberate difference from the task text: the proof tier is *only* the proof files (not a superset of the default tier) — the close-out runs both, and a superset would re-run r13's 150 s for no new evidence. Covered by `tests/runner/tier.test.ts` (5 tests).

## Phase 2 checkpoint (T004–T016) — 2026-10-27

`cd kiln && npm test` → exit **0**, `new: 514 tests · legacy: 500 tests (30 skipped)` in **186 s** (474 r13 + 40 new: 5 tier, 12 glob, 8 engine, 2 store-compat, 10 gate-extensions, 2 CLI flags, 1 kill-point list). `npm run check` → three `PASS` (`network` and `boundaries` 63 files, `legacy` 168). `contracts` tests 53 pass (r12's `flow-vs-constitution`, `gate-rail`, `strongest-model` unchanged).

Two things r13's suite forced, both recorded here and in `notes.md`:

1. **Note-required applies only to gates opened to carry the walk's semantics** (`GateSpec.returnsTo` or `GateSpec.walk` present). r13's tests make `reject`/`revise` moves at gate0 with no note; a note rule on every gate would have broken them. A gate opened the r13 way behaves exactly as before (FR-070).
2. **One r13 test example renamed.** `tests/move-shape.test.ts` used `note` as its example of an *unknown* field that is never stored. `note` now has a meaning (the next step's instruction), so the example field is `comment`. Nothing in that test was loosened.

## Phases 4–5 checkpoint (T025–T046: US1 and US2) — 2026-10-27

`cd kiln && npm test` → exit **0**, `new: 577 tests · legacy: 500 tests (30 skipped)` in **186 s**. `npm run check` → four `PASS` (`network`/`boundaries` 73 files, `legacy` 168, `flow` 1 file / 12 gates).

**T040 — the interface walk through the CLI** (`packages/cli/tests/feature-cli.test.ts`, a real `kiln owner` process and the scripted driver shelling out to `kiln feature next` / `kiln gate move`): 12 gates in the flow's order (`gate0, 1-concept, 2-architecture, 2a-experience, 3-spec, 4-plan, 5-checkpoint, 6-review, 6a-ui-review, 7-verification, 8-docs, 9-pr`), each by one committed move with decider `script:r14`, final state `done`, nothing after Merge; `restart` at the Roadmap gate refused `invalid-move`; two clean stores give identical gate/outcome/outbox lists. In-process the same walk takes ~0.2 s.

**T046 — the plain walk through the CLI:** 10 gates; `gate.not-applicable` for `2a-experience` and `6a-ui-review` (actor `factory`, cause `walk:f-plain:pin`) with reasons such as `does not apply: no path matches [web/**, …]; no label is one of [ui]; the row cites no journey`; a move on `gate:f-plain:2a-experience:1` is `unknown-gate`; `admit.require` gives 11 gates with `why: "required"`.

Not yet done: **T047** (the replay-across-a-kill test) — it needs the child-owner walk harness of US3.

## US3 — kill and resume (T047–T057) — 2026-10-27

**The proof tier** (`cd kiln && npm run proof` → `tier: proof (4 proof files)`): **39 tests, exit 0, 187 s**, on Node 25.9.0, macOS.

| File | What it does | Result |
|---|---|---|
| `walk-kill-points.proof.test.ts` | the owner SIGKILLed at each of the 11 declared walk points (first hit) on the interface walk, restarted, finished; every declared point must have been reached | 12/12 |
| `walk-every-gate.proof.test.ts` | `walk.settled-read` and `walk.gate-opening`, once per gate, on both walks (11 + 9 gates) | 4/4 tests, 40 kills |
| `walk-kill-matrix.proof.test.ts` | every point × every time it is reached (measured from a hit log of the uninterrupted walk) × both walks | 22/22 tests |
| `walk-random-kill.proof.test.ts` | **300 random kills, seed 20261027**: random walk, point and hit. Hits by point: settled-read 30, pin-after-write 29, pin-begin 37, admission-read 31, gate-opening 22, gate-opened 33, consume-after-write 21, admit-opened 18, consume-committed 25, unit-created 30, pin-committed 24 | 1/1 (186 s) |

After EVERY kill the judge asserts, from a fresh reader with no owner: the walk ended `done` with no gate open; no move was refused; walk invariants W1–W4 clean; per-gate invariants I1–I9 clean and exactly one move record on every gate; no task left waiting or parked; no timer; and **walk equality** — the outbox (type, subject, actor, cause, canonical data; no clock) equals the uninterrupted walk's, entry for entry.

**Default tier additions:** `walk-smoke` (4 kills: `pin-after-write`, `gate-opening` ×6, `settled-read` ×6, `consume-after-write` ×6), `walk-replay` (2 kills around the pin commit: the two not-applicable entries exist once each with the uninterrupted walk's reason bytes), `walk-storm` (**7 consecutive kills** with no move: the same gate open and waiting after each, nothing terminal, invariants clean; then the move commits and the walk goes on), `walk-clock` (±10 years: a waiting gate has no timer and `gate.opened` carries the injected clock; a whole walk under a skewed clock equals the real-clock walk), `walk-negative` (the **weakened walk** — a row that treats the absence of a move as an approval — is rejected by `W1`; the real walk passes the same judge; a kill that never fires fails `proof-point-not-fired`).

A run of the uninterrupted interface walk reaches `walk.gate-opening` / `settled-read` / `consume-*` 11 times and `walk.unit-created` 14 times; the plain walk 9 and 11.

## T058 — the tier split, verified — 2026-10-27

Before the CLI-walk tests were split: `npm run test:new` took **172 s** (594 tests) — 8 s of margin against r13's 180 s threshold, under the 15 s the plan asks for. The two slowest command-line walks (the second-store determinism run, 33 s of CPU under contention, and the `admit.require` variant) plus the new all-kinds-of-moves walk and the `feature move` walk went to `packages/cli/tests/feature-cli.proof.test.ts` (proof tier); the default tier keeps one interface walk and one plain walk through the CLI, and the in-process equivalents of everything moved.

After US5: `cd kiln && npm test` → exit **0**, `new: 630 tests · legacy: 500 tests (30 skipped)`, **185 s** for the whole of `npm test` (the pre-row reading was 182 s for 474 + 500 tests). `tier: default (6 proof files not run; npm run proof runs them)`. `npm run check` four `PASS` (`network`/`boundaries` 74 files).

## US5 — where moves lead (T059–T071) — 2026-10-27

* `consequence()` — the-flow.md §7 as an executable table: the rows of §7 are *read as text* and each row is checked against the engine; every (gate, kind) the data offers has a consequence; a pair it does not offer throws by name. `featureReject()` / `earlierThan()` for the feature-level move.
* `moves.test.ts` (13 in-process walks): revise needs a note and opens round 2 with the note as the next brief's instruction; a reject with no target is a fresh author at the same gate; a reject to an earlier gate re-crosses every active gate after it (Experience design and UI review skipped when not applicable), each brief saying what changed since its last approval — or "unchanged" when `sameContent` made the fresh author yield identical content; reject → the roadmap at Concept ends the walk and anywhere else is refused; Verification's reject with no target reworks the code and re-crosses Code review; restart at Code review rebuilds, restart at UI review re-crosses Code review too; revise at Code review sends the workers; split+revise records the remainder as a proposal and re-crosses the work plan; the admission crossing's four outcomes (FR-027).
* The feature-level move (`feature-move.test.ts`, 7): with a gate open it WITHDRAWS it (no move record; `gate.withdrawn` + `move.committed` in the same commit; a person's move afterwards is `stale` naming the feature move); with none open it is recorded and the walk applies it at its next wake; keyed exactly once; first move wins; refusals by name; **60 races** of a person's move against a feature-level move — exactly one ending each time, the loser told who won, I1–I10 clean.
* Withdrawal under kill (`walk-withdraw.test.ts`): killed at `walk.withdraw-received`, `-after-write` and `-committed` — the gate is either waiting with nothing recorded or withdrawn once; the SAME key then gives the one outcome; the walk goes back and finishes; I10 clean.
* A re-crossing is killed too: `walk-recross.proof.test.ts` — the re-crossing walk killed at every walk point × every hit; four of those kills run in the default tier (`walk-smoke`).

## Floor matrix (T082) and the proof tier (T083) — 2026-10-28

`npm run test:new` and `npm run check` on each Node, on the final tree (default tier; the three r13 kill suites that were renamed `*.proof.test.ts` — see `notes.md` — run in the proof tier):

| Node | `test:new` exit | New tests | `kiln check` | Wall time |
|---|---|---|---|---|
| **22.19.0** (the floor) | 0 | 643 | 4 × `PASS` | **75 s** |
| **23.6.0** | 0 | 643 | 4 × `PASS` | **78 s** |
| **24.1.0** | 0 | 643 | 4 × `PASS` | **78 s** |
| **25.9.0** (installed; full `npm test`) | 0 | 643 new · 500 legacy (30 skipped) | 4 × `PASS` | **111 s** for both suites |

The first pass of the matrix was not clean, twice, and the matrix did its job: (1) my matrix script's `PATH` lacked `/usr/sbin`, so two `lsof`-based network tests could not run — the script, not the product; (2) before r13's three heaviest kill suites moved to the proof tier, the default tier took **201 s on 22.19.0** (666 tests), over the 180 s threshold. After the move it is 75–78 s on every Node.

**Proof tier** (`npm run proof`, `tier: proof (10 proof files)`): **92 tests, exit 0** — on **22.19.0 in 267 s** and on **25.9.0 in 276 s**. It is r14's seven proof files (kill points, every gate, the whole matrix, 300 random kills with seed 20261027, the re-crossing walk, the fix-round walk, the slow command-line walks) plus r13's three moved suites (the separate-process proof, 300 random gate kills, the 7-kill storm).

## "After" (T087) — 2026-10-28

| Reading | Command | Result |
|---|---|---|
| New + legacy suites | `cd kiln && npm test` | exit **0** — `new: 643 tests · legacy: 500 tests (30 skipped)`, 111 s (before the row: `474 · 500 (30)`, 182 s) |
| Proof tier | `npm run proof` | exit **0** — 92 tests, 276 s |
| Checks | `npm run check` | exit **0** — `PASS network` / `boundaries` (74 files) · `legacy` (168) · `flow` (1 file, **12 gates examined**) |
| `legacy/` tree id | `git rev-parse HEAD:legacy` | `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` — **equal to the "before"** |
| Guarded paths | `git diff --stat main -- specs/ROADMAP.md legacy` | **empty** |
