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

## 4. US2 (T021–T027)

1. **`event-version-unknown` cannot arise at the commit**: `appendEvent` stamps the catalog's current version itself (a draft has no version field), so that code is exercised by `validateEvent` (stored or hand-made events) and by the read path (`EventVersionUnknown`), not by the commit-time suite. The commit-time suite has 15 members for the other codes plus the FR-014 member.
2. **A `*/` inside a block comment** (`packages/*/src` in a doc comment) ended the comment early and made Node's type stripping fail with a misleading "Expected '{'" — found when `kiln check` first loaded `record.ts`. Rule for this repo: no `*/` in a `/** */` comment.
3. **The check's negative members each report only their own code.** The first run of the suite showed six members also tripping `catalog-schemas-stale` (a catalog mutation makes the committed files stale) or `catalog-unknown-emitted` / `catalog-dead-type`; the members now switch off the comparison they are not about. This is the suite doing its job (noise detection), recorded because it changed the members, not the check.
4. **FR-014 end to end** (`settle-decider.test.ts`): blank, whitespace-only and non-actor deciders are refused at submit; the gate keeps waiting; no `move.committed` or `gate.settled` exists; a conforming decider settles it and the settlement names the move and the person from the stored record.

## 5. US1 (T028–T037)

1. **A library rule found by the first walk with units:** `tx.task()` "cannot read tables after the first table write" — and `createTask` is a table write. Every event that needs the run of a task therefore reads the owner chain **before** the first write; creators (`row.ts`, `walk.ts`) pass their own run explicitly, the unit's own commits and the lane read it first. Recorded in `record/unit-events.ts`.
2. **The row failed silently, not loudly:** the first run of the row/unit tests showed the row `failed` with no event and no message in `reports`; the message was only visible in the stored outcome. The probe that found it is the pattern for the next one: read `outcome.message` through `openReader(store).tasks()`.
3. **`unit.started` is its own commit** (the event and a `started` flag in the checkpoint together) placed before `unit.step-begin`, so the existing unit kill points keep their hit counts. `unit.failed` is catalogued but **not emitted**: a failed unit's end is written by the library outside any commit of ours (the check lists it as not-emitted truthfully).
4. **The seam wakes the backbone (analysis F1):** `OpenStoreOptions.onAppended` and `hooks`; `wrapTx` marks a transaction that wrote a `kiln.event` chunk; both the runtime's commit (`library/tasks.ts`) and the root commit (`library/open.ts`) call `onAppended` after the commit resolves. Nothing consumes it yet — the backbone (T038) will.
5. **The scan learned a form:** a helper that takes the event type as a parameter (`appendUnitEvent`) declares what it may be given in a union named `…EventType`; `kiln check record` reads those literals (and a test shows a union not so named is ignored).
6. **Compat view gained `correlation`** so tests can see a run through `Inspection.outbox` without importing the library façade (a layer test forbids that outside `durable`).
7. **Weakened writers:** `appendWithoutValidation` (E2 names the stored note) and `seqFromMemory` (E1 names the hole after a rolled-back commit); the real writer refuses the first and leaves no hole in the second.

## 6. US6 (T038–T043)

1. **Task ids depend on who else commits.** A walk run with consumers following it has its row at task 13, not 10 (the consumers' own commits take ids from the library's sequence). The walk-equality proof compares `actor` strings such as `task:13`, so a baseline must be taken **with the same consumers** (`baseline(name, walk, choose, owner)` now takes the child-owner configuration). Found when every backbone kill failed equality at the first event; the diff showed `task:13` against `task:10`. Not a defect — a property to remember: equality is only claimed between runs configured alike.
2. **Stopping does not wait for a consumer's own code.** `Backbone.stop()` awaits only loops that are idle; a stalled consumer would otherwise hold `close()` for ever (its `deliver` receives an abort signal, and a test consumer that honours it ends at once). A stalled consumer is exercised in `backbone.test.ts`.
3. **Failure is a cursor field.** A throwing consumer stops its own loop, writes `failed:{seq,error}` into its cursor (`consumer-failed: …` or `cursor-ahead-of-head: …`) and `status()` shows it; `retry(name)` clears it and starts a new loop from the same cursor. The factory and the other consumers never notice.
4. **The weakened consumer is a *consumer*, not a backbone**: it acknowledges before its effect is done (a delayed write). The kill that exposes it must come after the cursor moved and before the late write, so it is armed at `backbone.batch-read` hit 3 (the batch read right after a delivery); E5 then names "never delivered". The same kill on the real consumer loses nothing.
5. **`catchUpAndJudge`** (support/consumer-judge.ts) is the shared end of every consumer proof: a fresh owner lets the consumers finish, a fresh reader checks the transactional one applied 1…head once each and the effect one delivered 1…head at least once.

## 7. US3 (T044–T049)

1. **The first program's streams are not uniform, so events carry what they must to reproduce them.** Reading the real lines showed the same fact written three ways: a `human-decision` gate as `"1"`, `"3-spec"` or `"gate0"`, a `gate-completion` gate as `1` or `"gate0"`, a `wait` gate as `"6"`. The converter keeps the gate exactly as written (`move.committed.gate`, `gate.completed.gate`), and the reducer derives it from the subject only for events r13/r14 wrote. Without that, line → event → line cannot be the identity on bytes.
2. **A gate completion with no decider must be representable and must never be committable.** The stream the first program kept *because* it fails has a `gate-completion` with no `decidedBy`; `gate.settled` (FR-014) rightly forbids that. So the first program's records live in **read-only legacy types** (`gate.completed`, `gate.waiting`, `lane.transition`, `lane.cost-recorded`; catalog flag `legacy`): they validate, replay, project and are checked by the stream rules (a legacy approving completion with no human and no pre-delegation is `stream-silent-approval`), but `appendEvent` refuses them (`event-type-read-only`). `lane.held` was dropped from the catalog: the first program's `hold` is a `lane.transition` kind.
3. **Lane lease changes are not the first program's residency transitions**, so r13's `lane.acquired|swapped|released` produce no factory-log line (the mapping table says so, both ways tested). The first program's `transition` records come only from replayed streams until r16 gives the lane models to load.
4. **Design change from research R9:** the live projection is **one effect consumer that rebuilds a touched run's whole file from the record and replaces it atomically**, not a transactional consumer keeping state in `kiln.projection` plus a second consumer writing files. The result is a function of the record alone, so a repeat changes nothing, a kill leaves the old or the new whole file and the repeat repairs it, and the reducer is the same code `kiln record rebuild-log` runs. The cost is O(run) per batch per run (runs are a few hundred events); the scale measurement (T067) will say whether that needs the incremental form (`step` already supports it and is tested to equal `foldRun`).
5. **Real walks' factory-logs pass the first program's validator** — including the interface walk with its v2-only gates 2a/6a, because `gate-completion` carries `flow` (R3 `flow` rule). A walk decided by `script:r14` is refused (`decidedBy` is not a `human@…`), and a test says so: a program is not a human, still.
6. **The CLI may reach the durable package through four modules, not three** (r13's rule, updated): `#durable/record/tools.ts` joins the channel client, the path arithmetic and the owner runner — it reads through a fresh reader and never owns the store. The rule's test names the fourth module.
7. **Under load the owner-start deadline is the first thing to give** (15 s in the test harness): four proof tests failed once with `the owner did not start within 15000 ms` while the machine's load average was 15; they pass on a rerun. Recorded so a future flake is read correctly, not "fixed" by lengthening the deadline.

## 8. US4 (T050–T054)

1. **All five real streams round-tripped on the first attempt** once the events carried the gate exactly as the first program wrote it (notes §7.1): the stub walk (11 records), the program walk and its broken twin (6 each), the r7 pair (25 each) — 73 events, folded back to the original bytes, with the valid ones accepted by the first program's validator and both broken ones still refused with R3 (by that validator on the rebuilt file and by the stream rules on the events).
2. **The capture is deterministic** (second run, identical bytes; `legacy/` untouched), because the first program's walkers use its injected clock.
3. **Which old row a walker belongs to is an inference** (stub walk → r2, program walk → r3) from the specs and the walkers' headers; `capture.ts`, its README and every `meta.json` say so.
4. **The check's walk members allow related codes.** A broken stream usually breaks its replay too (a gap makes the events differ from the conversion; a stripped decider changes the rebuilt line). Each member names the set of codes it is built to produce (`codes`), and anything outside the set is noise that fails the suite. The move-vocabulary stream rule has no member: the first program's streams carry no gate subjects (it is tested in `streams.test.ts`; `check-record.md` says so).
5. **Unresolved for the Roadmap gate**, not decided here: the row text says "r1–r3, r7, r8" and three have originals. r8's wrapper of the stub and program walkers is *not* claimed: no stream of its own was found.
