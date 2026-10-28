# Notes: The record (row r15) — lab notebook

Written while implementing: inventories, measurements, mutation checks, decisions found on the way. Newest section last.

## 1. Churn inventory (T002)

References to the outbox / `history` in tests and support (count of matching lines per file, found by grep on 2026-10-28, before any source change). They are classified as each is touched (T016–T019, T028–T029); this table is the starting list.

| File | Lines | Kind expected |
|---|---|---|
| `durable/tests/oracle.test.ts` | 9 | shape (reads `outbox` of `Inspection`) |
| `durable/tests/walk/moves.test.ts` | 6 | type-only (`history.filter(type)`) |
| `lane/tests/lane-proof.test.ts` | 5 | shape (`cause`, `data`) |
| `durable/tests/proof/support/walk-oracle.ts` | 5 | shape — reads the record via the compat view |
| `cli/tests/feature-cli.proof.test.ts` | 5 | **content** (`h.data.reasoning` at line 117 → reference + digest) |
| `durable/tests/walk/walk-inprocess.test.ts`, `feature-move.test.ts`, `proof/support/oracle.ts` | 4 each | type-only / shape |
| `durable/tests/proof/{walk-withdraw,open,open-outcomes,kill-points,different-process.proof}.test.ts` | 3 each | count / shape |
| `cli/tests/feature-cli.test.ts` | 3 | type-only |
| 12 further files with 1–2 lines | | type-only, except those that count entries after a gate open (`command.accepted` joins `gate.opened` in T029) |
| `durable/src/{inspect,walk/view,gate/open,gate/tasks,walk/walk,walk/moves,walk/state,types,store,index,outbox}.ts`, `lane/src/lane-task.ts`, `durable/README.md` | | the source to change |

Known **content** assertion: `cli/tests/feature-cli.proof.test.ts:117`. The others are found when T017/T018 run the suite.

## 2. Capture reconnaissance (T003)

Method: a scratch script **outside the repository** (`/tmp/recon/recon.ts`) imports the frozen walkers from `legacy/src/`, runs each twice, and compares the SHA-256 of the output.

| Old row | Candidate original | Result |
|---|---|---|
| r1 scaffold | the contract's own fixtures in `legacy/tests/contract/log.test.ts` | **No whole stream**: the file holds single per-line records (`perLine({recordType…})`) for the schema test. Nothing to replay as a walk → **missing** |
| r2 lane runtime | `buildStubWalk()` (`legacy/src/walk.ts`) — 11 lines, six record types (transition, cost, human-decision, gate-completion, pre-delegation, wait) | **Deterministic** (two runs, same SHA-256 `e81675e5351c…`) → capture |
| r3 roadmap overlay | `buildProgramWalk()` — a closed-row program walk, 6 lines, and its `brokenAutoApprove` twin (6 lines, fails R3) | **Deterministic** both (`6ed3c1486d26…`, `063f55a382bb…`) → capture both |
| r7 live inference | `kiln/fixtures/r7-live-inference.jsonl` (25 lines) and `r7-live-broken.jsonl` (25 lines) | already committed files → use as they are |
| r8 Pi extension | `legacy/pi/outcome.ts` states the extension does not touch the factory-log | **No stream** → **missing** |

Which old row a walker belongs to is an inference from the specs (`specs/002-kiln-lane`, `003-kiln-roadmap-overlay`, `006-kiln-live-inference`) and the walkers' own headers; the capture README says so.

So far: **3 of 5 named walks** have real originals (r2, r3, r7), as **5 streams** (stub, program, program-broken, r7 valid, r7 broken); **r1 and r8 are reported missing, with the reasons above** (Clarification Q3). The Roadmap gate decides whether the row can close with three.

## 3. Decisions and changes found while building the foundation (T006–T020)

1. **Real r14 entries were captured first.** `tests/tools/make-r14-samples.ts` ran eleven scenarios through r14's *unchanged* code and kept every outbox entry (`fixtures/stores/r14-outbox-samples.json`, 88 KB, 14 types across ~280 entries). The v0 → v1 upcasters were written against them and passed on the first run with no sample edited. Types no scenario produced (`lane.*`, `walk.move-ignored`) are covered by entries shaped exactly as the code writes them.
2. **Upcast tests live in `record/tests/`, not `contracts/tests/`** (tasks T013 said `C/tests`): they read the fixture with `node:fs`, which `contracts` may not import.
3. **A real bug found by the first append test:** with version 0 entries present, the first chunk starts at `legacyThrough + 1`, so the in-chunk position is `seq − max(256n+1, legacyThrough+1)`, not `seq − 256n − 1`. Fixed in `read.ts` (`inChunk`) and covered by `append.test.ts` ("a store r13/r14 wrote…", "a run is read through its index…").
4. **Actor grammar versus r13's open `decidedBy`.** r13 accepted any non-blank decider (`p`, `h`, `someone-else`, `person@example`). The envelope's actor grammar (FR-004) could not be applied at the commit without breaking moves that were valid, so the grammar's *person* form is `<token>@<token>` (`human@batorfi`, `person@example`) and a move whose `decidedBy` (and a gate whose `openedBy`, and a feature-level move) does not conform is refused at **submit** as `invalid-move`, naming the grammar — never at the commit. `kiln gate open`'s default `--by` changed from `cli` to `system`. This is a behaviour change to r13's move validation (stricter, by name); the log validator's own `^human@` remains the test of a *human*. Test deciders updated: `person-${n}` → `person-${n}@example`, `someone-else` → `someone@else`, `--by p` → `p@test`, `--by h` → `h@test`; the weakened walk's invented decider `restart` → `system@restart`.
5. **Event subjects** follow r13's gate-id pattern (`^[a-z0-9][a-z0-9:._-]{0,159}$`), not a four-segment gate form: hand-opened gates with ids such as `g` stay valid.
6. **Assertions changed because content left the payload (Clarification Q1):** `applicability.test.ts` and `feature-cli.test.ts` (a reason's rendered sentence is not an event field; its facts are), `triage.test.ts` and `feature-cli.proof.test.ts` (`reasoning` → `reasoningRef` + `reasoningDigest`), `moves.test.ts` (`remainder` → `remainderRef` + `remainderDigest`), `review-fixes.test.ts` (`because` → `why`), and the walk oracle's W2 (compares a reason's facts). Each now checks the reference and the digest of the exact text, which is stricter than before.
7. **`gate.settled` now reads the stored move record** for `move` and `decidedBy`; with no record the settle commit throws (FR-014) — a corner no existing test reaches.
