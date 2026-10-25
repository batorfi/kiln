# Implementation report: Foundations reset (row r12)

**Branch**: `009-kiln-foundations-reset` | **Report date**: 2026-10-25 (first written at `719ee13`; brought to the end of the row at `906c587`) | **Head**: `e3e930c` (the row closed at `906c587`; the review fixes and the gate came after) | **Base**: `main` @ `299b0a5` (the baseline commit)
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tasks**: [tasks.md](./tasks.md) · **Baseline log**: [baseline.md](./baseline.md)
**Companions**: [code-review-report.md](./code-review-report.md) · [verification-report.md](./verification-report.md)

> **How to read this report.** §1–§2 and §4–§8 describe the branch **as it stands now**. §3 and §9–§15 are the dated record of how it got there (what each phase built, what the
> amendments changed) and are kept as written; §16 covers the last phase, which they predate; §17–§18 are what happened after the row closed (review, Roadmap gate, review fixes).

## 1. Status in one paragraph

**The row is implemented: 87 of 87 tasks are done, all five user stories and Polish, in 39 commits.** The first program's tree lives in `legacy/`, byte-identical to the baseline (tree id
`20a82c7e…`, 168 files) and still green. The new `kiln/` holds nine packages and `checks/`, with **no runtime dependency and nothing to install**: flow v1 and flow v2 (the twelve-gate flow of constitution
v2.1.0) as data, the tier policy, the record validators, the pure affinity logic, one test runner, and three checks — `kiln check network`, `boundaries` and `legacy` — each of which fails by name
and none of which passes vacuously. `npm test` → exit 0, **`new: 184 tests · legacy: 500 tests (30 skipped)`** (170 at the close of the row; 14 added by the review fixes); `npm run check` → exit 0, three `PASS`. All eight success criteria are met with two stated limits
(a measured Pi is stub-tested, not run; macOS only) — see the [verification report](./verification-report.md). The [whole-branch code review](./code-review-report.md) found no defect in what the
checks report and seven smaller items; the three that mattered (valid spellings of an import the lint and the boundary check could not see, scan-root holes, skipped tests hidden in the summary) are **fixed**. **The Roadmap gate sat on 2026-10-25** (human@batorfi): it approved the pending text edits of `60a2c7e` and decided that **r12 stays `queued` until its pull request is merged** — a row is `done` only with its merged `@PR#N` — so the next gate entry closes it.

## 2. Task progress

| Phase | Tasks | Done | State |
|---|---|---|---|
| 1 Setup — baseline and the move | T001–T004 (4) | 4 | **complete** |
| 2 Foundational — skeleton and leaf modules | T005–T019 (15) | 15 | **complete** |
| 3 US1 — new layout, kept rules proven (P1) | T020–T033 (14) | 14 | **complete** (§11) |
| 4 US2 — legacy frozen and verifiable (P1) — *with US1, the MVP* | T034–T047 (14) | 14 | **complete** (§12) |
| 5 US3 — flow v2 and judges as data (P2) | T048–T058 (11) | 11 | **complete** (§13) |
| 6 US4 — network lint (P2) | T059–T071 (13) | 13 | **complete** (§14) |
| 7 US5 — package boundaries (P3) | T072–T077 (6) | 6 | **complete** (§15) |
| 8 Polish | T078–T087 (10) | 10 | **complete** (§16) |
| **Total** | **87** | **87** | `tasks.md`: 87 checked, 0 open |

## 3. What was built

### 3.1 The move (T001–T004)

| Item | Result | Evidence |
|---|---|---|
| Baseline recorded | commit `299b0a5`, tree `20a82c7e…`, 168 files, Node 25.9.0, Pi 1.1.0 vs 0.85.1 measured | `baseline.md` |
| Move is pure | `git mv kiln legacy`; 168 renames at 100 %, 0 other | `git diff -M --name-status c4c3892 3298507` |
| Legacy tree identical to baseline | `git rev-parse HEAD:legacy` = `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` = `git rev-parse 299b0a5:kiln` | re-measured 2026-10-25 |
| Legacy suite green | `cd legacy && KILN_PI=0 node tests/run.ts` → **500 tests, 470 pass, 0 fail, 30 skipped** | re-run 2026-10-25, working tree stayed clean |
| Ignore patterns | `legacy/factory-log/*.jsonl|*.log` ignored, `.gitkeep` kept; `kiln/factory-log/` patterns kept | `.gitignore:22-30`, `git check-ignore` |

### 3.2 The new `kiln/` skeleton (T005–T007)

- `kiln/package.json` — `private`, ESM, `engines` `^22.18.0 || >=23.6.0`, **no dependencies**, the `imports` map for nine `#…/*` aliases, and the eight scripts of
  `contracts/runner.md`.
- `kiln/tsconfig.json` — editors only (`noEmit`); equal to `legacy/tsconfig.json` except for whitespace.
- Ten `kiln.json` files (nine packages + `checks/`), each stating one responsibility. The task text says `package.json`; the commit chose `kiln.json` (research R3)
  and `tasks.md` T007 was updated to match.

### 3.3 Contracts base (T008–T014, `kiln/packages/contracts/`)

| File | What it holds | Relation to the first program |
|---|---|---|
| `src/moves.ts` (32 lines) | `MOVE_KINDS` (9, the closed set), `GateKey`, `GateId`, `GATE_KEY_OF`, `FlowVersion` | new, per `data-model.md` §1 |
| `src/flow/types.ts` (34) | `GateDefinition`, `FlowDefinition`, `RoleRoster` | new, per §2–3 |
| `src/flow/v1.ts` (32) | the first program's rail as data: 10 gates, names, judges, cap 2, roster | transcribed from `legacy/contracts/move-vocabulary.ts` + `legacy/src/roles.ts` |
| `src/flow/index.ts` (37) | `flows`, `flowOf`, `moveVocabulary`, `moveAllowed`, `gateName`, `DEFAULT_FLOW`, `MITIGATION_CAP_DEFAULT` | v1 only (v2 arrives in T049–T050) |
| `src/roles.ts` (27) | `Tier`, `isJudge`, `bindRole`, `weakerBindingRejected`; roster is an argument | adapted from `legacy/src/roles.ts`; message now says "judge role" (data-model §3) |
| `src/types.ts` (94) | record and roadmap types | `legacy/src/types.ts` with one import line changed |
| `schemas/*.schema.json` | factory-log and roadmap schemas | byte-identical to `legacy/schemas/` (`cmp`) |

`contracts` imports nothing but its own files and uses no `node:` module (FR: I/O-free).

### 3.4 Record core (T015–T017, `kiln/packages/record/src/`)

`validate-core.ts`, `report.ts`, `clock.ts` — byte-identical copies of `legacy/validate/_core.ts`, `legacy/validate/_report.ts`, `legacy/src/clock.ts` (`cmp`).
The validators themselves (`log.ts`, `roadmap.ts`) are US1 work and do not exist yet.

### 3.5 Check registry and CLI (T018–T019)

- `kiln/checks/index.ts` — `CheckName`, `CheckResult` (data-model §9), `CHECK_NAMES`, an **empty** `registry`, and `runChecks`, which runs every name even if an
  earlier one fails and reports an unregistered name as the failure `check-not-registered`.
- `kiln/packages/cli/src/main.ts` — `kiln check [name…] [--json]`, text blocks in the contract's format, `--json` on one line, exit 0 / 1 / 2.

Behaviour measured on Node 25.9 and 22.18 (no checks are registered, so every check fails closed):

| Invocation | Output | Exit |
|---|---|---|
| `check` | three `FAIL … check-not-registered` blocks | 1 |
| `check legacy --json` | one-line JSON array | 1 |
| `check bogus` | `unknown check "bogus"; known: …` + usage, stderr | 2 |
| *(no command)* | usage, stderr | 2 |
| `check network` from `/tmp` | works from any working directory | 1 |
| `check legacy` on Node 23.6.0 / 24.1.0 | was: no output, exit 0 (code-review finding 1). **Fixed 2026-10-25**; now identical to 22.18 | 1 |

## 4. Requirement and success-criterion coverage (at `906c587`)

"Delivered" means satisfied and evidenced at head. Every row was re-run on a fresh clone on 2026-10-25 — the commands and outputs are in the [verification report](./verification-report.md).

| ID | Subject | State | Evidence |
|---|---|---|---|
| FR-001 | Packages of PRD §8.2 needed now | **Delivered** | nine packages + `checks/`, each `kiln.json` with one responsibility; `kiln check boundaries` enforces it |
| FR-002 | Node floor, no build, no runtime dependency, no bare specifier | **Delivered** | `dependencies` empty; bare specifiers refused by `boundary-bare-specifier` and `network-external-dependency`; Node 22.18, 23.6, 24.1, 25.9 pass |
| FR-003 | One way to run the suite; zero tests fail | **Delivered** | `kiln/tests/run.ts`; run from any directory |
| FR-004 | `legacy/` byte-identical | **Delivered** | tree id equal; `kiln check legacy` over a 168-file manifest; L1–L6 tests |
| FR-005 | Legacy tests keep running | **Delivered** | `legacy: 500 tests` inside `npm test` (470 pass, 0 fail, 30 skipped) |
| FR-006 | Pi tier switched off for an unmeasured Pi, versions printed once, never when demanded | **Delivered** | runner R1–R7; `npm test -- --pi` fails 8 tests by name |
| FR-007–FR-009 | Flow as versioned data; each gate its own moves; judges bind only to the strongest | **Delivered** | v1 equal to the first program (0 mismatches); v2 equal to constitution v2.1.0, PRD and `ui-flow.md` (a test reads them); 11 tier-policy cases |
| FR-010 | Pure affinity logic | **Delivered** | `lane/src/affinity.ts`, 3 new tests, mutation-checked |
| FR-011–FR-014 | Schemas, validators, flow per record, clock, fixtures | **Delivered** | 23 ported record cases; `flow-records.test.ts`; fixtures byte-identical |
| FR-015 | Every ported module with its tests; no case dropped | **Delivered** | `count-ported.ts`: 54 of 54 ported, 19 of 19 waiting in `legacy/`, 73 of 73 |
| FR-016–FR-018 | Checks: network, boundaries, never vacuous, falsifiable | **Delivered** | network: 19 new + 4 CLI cases and the 20 ported; boundaries: 16 + 4 CLI cases; zero-file, missing-directory and invalid-rule-file cases fail by name; *see review finding 1 for the spellings outside the negative suites* |
| FR-019 | The v2 gate-rail contract | **Delivered** | `packages/contracts/gate-rail.md` |
| FR-020 | PRD WORK-2 corrected | **Delivered** | before the row (2026-10-22) and again for v2.1.0 (T080) |
| FR-021 | Roadmap untouched, no gate decision | **Delivered** | `git diff 60a2c7e -- specs/ROADMAP.md` empty; row r12 `queued` |
| SC-001 | Green on an unmeasured and on a measured Pi | **Met — limit** | unmeasured: run (Pi 1.4.0 here); measured: stub-tested, no Pi 0.85.1 on this machine |
| SC-002 | ≥ 54 ported cases; all 73 accounted for | **Met** | the census tool |
| SC-003 | 100 % of legacy bytes identical, by a test | **Met** | `legacy-baseline.test.ts` + `kiln check legacy` (the git half skips on a shallow clone — review finding 4) |
| SC-004–SC-008 | Flow/judge/lint/boundary/walk criteria | **Met** | verification report, one row each |

## 5. State of the repository at head

| Question | Answer |
|---|---|
| Is `legacy/` green? | **Yes** — 500 tests, 0 failures. With the Pi tier on and an unmeasured Pi (`--pi`, or `KILN_PI=1`) 8 live-Pi tests fail by name, by design (the first program's behaviour; not a regression) |
| Does `cd kiln && npm test` work? | **Yes** — exit 0; `new: 184 tests · legacy: 500 tests (30 skipped)`; prints `live-Pi tier skipped: Pi 1.4.0 installed, measured [0.85.1]` once |
| `npm run check`? | **Yes** — `PASS network` (22 files), `PASS boundaries` (22 files), `PASS legacy` (168 files); exit 0 |
| `validate:log` / `validate:roadmap`? | Yes — `PASS` on the r7 walk (under v1 and v2) and on `specs/ROADMAP.md` |
| Is the README accurate? | Yes — rewritten in T078 (two trees, the new commands); every command in its "Run it" block works |
| Type-check? | None exists; a strict `tsc` run from a scratch install finds 4 errors, none behavioural ([review](./code-review-report.md) finding 5) |
| Size | `kiln/`: 78 tracked files, 1,808 lines of source, 2,040 lines in 27 test files (at `906c587`: 76 files, 1,775 and 1,843 in 25); `legacy/`: 168 files, unchanged; 285 files changed against `main` (11,192 insertions, 158 deletions) |
| Working tree | clean at `e3e930c` |

## 6. Departures from the written plan

All are in `plan.md`'s "Implementation notes" (T082). In one place:

1. **`kiln.json`, not `package.json`, per package** (T007) — research R3; `tasks.md` reflects it.
2. **`registry` is `Partial<Record<CheckName, …>>`** (T018), and `runChecks` returns the failure code `check-not-registered` for a name with no entry. That code is not yet in `cli-check.md` (review finding 6).
3. **Two flow defaults, not one** (T050): `CURRENT_FLOW` = v2 and `DEFAULT_RECORD_FLOW` = v1, as the contract names them — after the first review showed one constant serving both meanings.
4. **`weakerBindingRejected` takes an optional fourth parameter** (`extraJudges`), a superset of the contract's three, needed by F8.
5. **Flow v2 is the twelve-gate flow**, not ten (the 2026-10-25 amendment, §9): constitution v2.1.0 landed on `main` mid-row and the human chose option 1. SC-004 was amended from "ten" to "twelve".
6. **One entry guard for every command** (`record/src/entry.ts`): the first program's `process.argv[1] === fileURLToPath(import.meta.url)` idiom is unsafe through symlinked directories (macOS `/var` → `/private/var`); found by the tamper test (§12).
7. **Not byte-identical copies, by design:** `report.ts` (`nameMove` takes the flow), `log.ts`, and the factory-log schema (the `flow` field and the `2a`/`6a` gate ids) — each noted in `legacy-copies.json`.
8. **The network lint dropped two first-program rules** — "exactly one allowlist entry" and the Pi-driver process exemption (research R9) — and gained three failure codes; the boundary check gained `boundary-rules-invalid` (§14, §15).
9. **Empty local directories** `kiln/fixtures/` and `kiln/tests/` existed before T022/T031 (git does not track empty directories); both are populated now.

## 7. How this was measured

| Claim | Command |
|---|---|
| Legacy tree equals baseline | `git rev-parse HEAD:legacy` = `git rev-parse 299b0a5:kiln` = `20a82c7e214be256c804f6e8f1cd4cce9c8e9874` |
| Both suites, exit code, counts | `cd kiln && npm test` → `new: 184 tests · legacy: 500 tests (30 skipped)`, exit 0 (fresh clone of `e3e930c`) |
| The checks | `npm run check`; each with a planted violation on a scratch copy (quickstart §2, §4, §5) |
| Node floor | `npx -y node@22.18.0 tests/run.ts --new-only`, likewise 23.6.0, 24.1.0 → 184 / 184 / 0 each; `kiln check` all `PASS` |
| Census | `node tests/tools/count-ported.ts` |
| Roadmap untouched | `git diff 60a2c7e -- specs/ROADMAP.md` (empty); `validate:roadmap` `PASS` |
| Type-check | `tsc --noEmit --strict` from `/tmp/tscheck` (outside the repository) |
| Task state | 87 `[X]` and 0 `[ ]` in `tasks.md`; `git log main..HEAD` — 44 commits |

## 8. Next steps

1. **Open the pull request and merge it** (the human's Merge gate). `gh` is not installed on this machine; the compare page is `github.com/batorfi/kiln/compare/main...009-kiln-foundations-reset`. The branch has `main`'s PR #1 merged in.
2. **Then the Roadmap gate re-opens** (it is already decided what happens there): row r12 → `status: "done"`, `outcome: "@PR#N"`, `gate0.note` entry 3; the next row is **r42**, the go/no-go spike on Pi Durable (a no-go re-opens the gate before r13).
3. **As a Roadmap proposal, not an r12 change**: review finding 2 — a pre-delegation recorded *after* the approval it authorises still satisfies R3/R4. It is the first program's behaviour, preserved on purpose (FR-011).
4. **Whenever those files are next touched**: finding 5 (no type-check; 4 strict errors; optionally document an out-of-tree `tsc` run) and the `entry.ts` comment of finding 6.
5. The 19 deferred cases wait in `legacy/` for r13 and r16, each named in `checks/legacy-copies.json`.

## 9. Amendment 2026-10-25 — flow v2 is the twelve-gate flow

After this report was first written, `main` gained constitution **v2.1.0** (PR #1), and the human chose **option 1: v2 = the twelve-gate flow now**. Done:

- **Documents:** `spec.md` (status block, US3, FR-007/008/009/015/019/020, SC-004/005/008), `plan.md` (new *Amendment 2026-10-25* section A1–A8, constitution check),
  `data-model.md` §1–4, `contracts/flow-and-records.md` (§1–5, new rows F10, F11), `research.md` (R6/R7 amended, new R16), `quickstart.md`, the checklist note,
  and `tasks.md` (T008, T009, T011, T012, T048–T056, T058, T080–T082; the count stays 87).
- **Code already delivered, amended:** `moves.ts` (`GateKey` and `GateId` gain `2a-experience`/`6a-ui-review` and `"2a"`/`"6a"`; `GATE_KEY_OF` has 12 entries),
  `flow/types.ts` (`AppliesWhen`, `GateDefinition.appliesWhen` and `check`), `flow/index.ts` (`hasGate`; `moveAllowed` is false for a gate the flow lacks).
- **Re-measured:** v1/legacy parity script — 0 mismatches; `hasGate("2a"|"6a","v1")` false, `hasGate(6,"v1")` true; an unknown id still throws `unknown gate id`; the CLI exit codes
  are unchanged.
- **Not done, by design (FR-021 and scope):** `specs/ROADMAP.md` (its r14 text still says "ten gates" — an `edit-rows` proposal for the next Roadmap gate), the PRD's WORK-2 line (T080),
  the explainers (T081), `v2.ts` and the tests (US3, T048–T058), evaluating `applies_when`, and the `kiln check design-system` / `foundations` checks.

## 10. Roadmap and PRD updated (2026-10-25, commit `60a2c7e`)

At the human's request, after the twelve-gate decision:
- **`specs/ROADMAP.md`** — the `edit-rows` text of the three concept docs' proposals (charter §11, design system §14, interface gates §13) was folded into rows **r12, r14, r15, r17, r19, r20, r22, r28, r29, r30, r32, r43** (and the prose "ten gates" → the
  twelve-gate flow; the r12/r14 decision row now says constitution v2.1.0, five judges). No row, dependency or order changed; `gate0` and its log are untouched; the header says plainly the text is *proposed for the next
  Roadmap gate* (the precedent of r53). `legacy/validate/roadmap.ts` → PASS.
- **`docs/prd/kiln-prd.md`** — §8.2 (`legacy/` at the repository root, with the measurement), WORK-2 (five judges, v2.1.0), GATE-2 (the two interface gates' moves), M1, goal 1, the status line (T080 done).
- **Explainers** regenerated (`_generate.py`): only the eight files for the edited rows changed. FR-021 and T086 now name `60a2c7e` as the baseline.

## 11. User Story 1 completed (2026-10-25, T020–T033)

14 tasks, 34 of 87 done. What exists now, beyond §3:

| Piece | Where | Notes |
|---|---|---|
| Roadmap and log validators | `kiln/packages/record/src/roadmap.ts`, `log.ts` | ported with paths, imports and usage text changed; behaviour unchanged. `log.ts` passes flow `"v1"` explicitly (finding 3) and keeps the `process.argv[1]` entry guard (finding 1). The first program's API is kept (`validateLog(records)`, `validateLogFile(path)`); `contracts/flow-and-records.md` §4 was corrected to say so |
| Fixtures | `kiln/fixtures/r7-live-*`, `packages/record/tests/fixtures/roadmap-blank.md` | byte-identical (`cmp`) |
| Ported tests | `packages/record/tests/` | 23 cases, expectations unchanged |
| Lane (pure) | `packages/lane/src/types.ts`, `affinity.ts`, `tests/affinity.test.ts` | `switchCount`, `bindAll` (throws synchronously), `judgeUnitsBoundStrongest`, each taking the flow's roster; 3 new tests, mutation-checked |
| Runner | `kiln/tests/run.ts`, `tests/runner/zero-tests.test.ts` | discovers tests itself (no shell glob), fails a run with zero tests, rejects unknown flags, strips `NODE_TEST_CONTEXT` so it can run inside a test |

Measured: `npm run test:new` — **30 tests, 0 failures**; `validate:log` and `validate:roadmap` print `PASS` on the r7 walk and on the (updated) roadmap; the broken fixture exits 1. Details in `baseline.md`.

Not yet: `npm test` also runs the legacy suite (T045); `legacy-copies.json` records for these ports (T037); the manifest check. Two things to know for later: (1) the runner flags `--live`, `--cost`, `--serial`, `--pi` are rejected until T045 forwards them;
(2) the runner found a real pitfall — a nested `node --test` inside a test reads as "zero tests" unless `NODE_TEST_CONTEXT` is removed.

## 12. User Story 2 completed — the MVP (2026-10-25, T034–T047)

47 of 87 tasks done (T001–T047 and T080 — 48 with the PRD task). **US1 + US2 is the MVP the plan defined: the move is safe, proven and green.**

| Piece | Where |
|---|---|
| Manifest generator and manifest (168 files, from the baseline commit's blobs) | `kiln/tests/tools/make-legacy-manifest.ts`, `kiln/checks/legacy-manifest.json` |
| `kiln check legacy` (pure filesystem) and the copy record (27 records: 20 ported pairs, 5 `wait` files = the 19 deferred cases) | `kiln/checks/legacy-identity.ts`, `legacy-copies.json`; registered in `checks/index.ts` |
| Pi tier: measured list, `decidePiTier`, version probe | `kiln/tests/measured-pi.ts`, `pi-tier.ts` |
| Runner: both suites, zero-test rule on each, `--new-only` / `--legacy-only`, forwarded legacy flags, the skip line | `kiln/tests/run.ts` |

**Defects found and fixed on the way (worth knowing):**
1. **The entry guard was unsafe through symlinks** — and so is the first program's idiom. `import.meta.url` is a real path; `process.argv[1]` is as typed; on macOS temp dirs (`/var` → `/private/var`) they differ and a command would run nothing and exit 0. Found by the tamper test, fixed once in `packages/record/src/entry.ts` (`isEntryPoint`, realpath on both sides) and used by the CLI, both validators and the manifest generator; a regression test runs them through a symlink and a mutant of the old guard fails it. This is the same silent-pass class as code-review finding 1.
2. `git ls-tree` filters to the working directory's prefix: run from `kiln/` it listed zero files. The generator now uses `--full-tree` and refuses an empty listing.
3. A nested `node --test` inherits `NODE_TEST_CONTEXT` (US1 finding) — the runner strips it for both children.
4. While mutation-testing I reverted my own uncommitted runner with `git checkout`; I rebuilt it from the same content and committed immediately. Lesson kept: commit before mutating.

**Contract updates:** `runner.md` (exclusive flags, `KILN_LEGACY_RUNNER` seam), `legacy-identity.md` (`legacy-manifest-invalid`), `data-model.md` §6 (`cases`).

Full numbers: `baseline.md`. Next: US3 (T048–T058, the twelve-gate flow data and tests), US4 (T059–T071, the network lint), US5 (T072–T077, boundaries), Polish (T078–T087, minus T080).

## 13. User Story 3 completed — the twelve-gate flow as data (2026-10-25, T048–T058)

58 of 87 tasks done. New suite: **107 tests, 0 failures**; **34 of the 54** ported cases live.

| Piece | Where |
|---|---|
| Flow v2: twelve gates, five judges, `applies_when` declared on the two interface gates | `kiln/packages/contracts/src/flow/v2.ts`; `flow/index.ts` now has `CURRENT_FLOW` = v2 and `DEFAULT_RECORD_FLOW` = v1 (the two defaults the contract names; the single `DEFAULT_FLOW` is gone) |
| The test that reads the governing documents | `packages/contracts/tests/flow-vs-constitution.test.ts` — constitution (default-flow sentence, Principle II, closed set), PRD GATE-1/GATE-2, `ui-flow.md` |
| Ports | `gate-rail.test.ts` (6 → v1, plus v2, F3, F10 cases), `strongest-model.test.ts` (5 → v1 roster, plus F7, F8, invalid-roster cases) |
| Records | schema copy: `flow` (v1/v2, absent = v1) and gate ids `"2a"`/`"6a"`; `log.ts` resolves `record.flow ?? defaultFlow ?? v1`, fails an absent gate or unknown flow by name, prints the contract's G3 message, `--flow v1|v2`; `flow-records.test.ts` |
| The v2 contract document | `kiln/packages/contracts/gate-rail.md` |

**Review findings paid off:** finding 3 (the default-flow trap) is closed — `log.ts` never relies on a default; finding 4 and 2 have named tests. **Observed while building:** the PRD's own GATE-1 row now matches the constitution, so the test's extraction of the twelve names is a real cross-check, not a restatement.

Known deviations recorded in `legacy-copies.json`: `report.ts`'s `nameMove`, `log.ts` and the schema copy are no longer byte-identical to their originals (by design, noted per record).

Next: US4 (T059–T071, the network lint — ports 20 cases, so ported total becomes 54), US5 (T072–T077, boundaries), then Polish (T081–T087).

## 14. User Story 4 completed — the network lint (2026-10-25, T059–T071)

71 of 87 tasks done. New suite **150 tests, 0 failures**; **all 54 ported cases are live** (SC-002's census).

| Piece | Where |
|---|---|
| Tokenizer (comments, strings, templates with nested `${}`, regex literals) with a new offset-aligned `masked` view, and `moduleSpecifiers` | `kiln/checks/lex.ts` |
| `isLoopbackHost` (copied, not imported) | `kiln/checks/loopback.ts` |
| The lint: call / import / alias / computed detection, never-vacuous guard, path-keyed allowlist, loopback-literal rule for allowlisted modules; `checkNetwork()` over `packages/*/src` and `checks/*.ts` | `kiln/checks/network-lint.ts`, `network-allowlist.json` (empty), registered in `checks/index.ts` |
| Tests | 4 ported files (20 cases), `network-lint.test.ts` (19), `check-network.test.ts` (4) |

**Departures from the first program's lint, all recorded in `legacy-copies.json`:** the "exactly one allowlist entry" rule and the Pi-driver process exemption are gone (research R9); `globalThis["fe"+"tch"]` is now `network-computed` (the task and quickstart require it) rather than lumped with aliasing; imports starting `#` (this package's imports map) are internal, not "external dependencies"; and import detection runs on `masked`, so a whole `import x from "left-pad"` written inside a string is no longer mistaken for an import (this matters to the boundary check, B7). New codes added to `cli-check.md`: `network-external-dependency`, `network-nonloopback-url`, `network-allowlist-invalid`.

**Caught on the way:** a `*/` inside a doc comment (`packages/*/src`) ended it early and broke the file — the same shape of trap the tokenizer exists to avoid; and one of my own CLI assertions passed for the wrong reason (the scratch copy had no sibling `legacy/`), so I rewrote it to say what it means.

Next: US5 (T072–T077, `kiln check boundaries`), then Polish (T081–T087).

## 15. User Story 5 completed — package boundaries (2026-10-25, T072–T077)

77 of 87 tasks done; **all five user stories are complete**. New suite **170 tests, 0 failures**; `npm run check` is green with all three checks.

| Piece | Where |
|---|---|
| The rule file: 17 layers following PRD §8.2, `contracts` with `builtins: "none"`, no external seams, `legacy/` forbidden — equal to the contract's content | `kiln/checks/boundaries.json` |
| The check: classifies every import specifier (relative → resolved to its package, `#pkg/…`, `node:`, bare), applies the rules, verifies every `packages/*` directory is declared and every unit (and `checks/`) has a non-empty `responsibility`, validates the rule file itself (shape, dangling layer names, cycles) | `kiln/checks/boundaries.ts`; registered in `checks/index.ts` |
| Tests | `checks/tests/boundaries.test.ts` (16), `packages/cli/tests/check-boundaries.test.ts` (4) |

**Choices worth knowing:**
- A relative import into another package is judged exactly like the `#pkg/…` form, so the imports map cannot be bypassed with `../../lane/…`.
- An unprefixed builtin (`"fs"`) is a bare specifier — the tree uses `node:` everywhere, and the check keeps it that way.
- The rule file is itself checked (`boundary-rules-invalid`): a layer that names an undeclared layer, or a cycle, fails — a dependency direction that loops has no direction. This code is new; it is not in the contract's failure list and should be added to `boundaries.md`.
- The responsibility is read from the top-level `responsibility` of each `kiln.json` (the tasks' `kiln.responsibility` wording was loose).
- The tests and the lint/boundary checks scan the same files (`networkScanFiles`), so a file can never be seen by one and missed by the other.

Remaining: **Polish T081–T087** — explainers (`kiln-v1.md` §5.2, `kiln-architecture.md` §13, `_generate.py`), the plan's "Implementation notes", the ported-case census tool, a fresh-clone run of every quickstart scenario, the Node 22.18 run (and, per code-review finding 1, 23.6 and 24.1), the roadmap-untouched confirmation, and the verification report.

## 16. Polish completed — the end of the row (2026-10-25, T078–T087)

87 of 87 tasks done.

| Task | What | Result |
|---|---|---|
| T078, T079 | README: two trees, the new commands, the layout table; the `legacy/` row says older specs' `kiln/…` paths read as `legacy/…` (README line 254) | the measured-Pi sentence the legacy test reads is kept; the legacy suite still green after the edit |
| T080 | PRD §8.2, WORK-2, GATE-2, M1 | done earlier (§10) |
| T081 | Explainers: `kiln-v1.md` §5.2, `kiln-architecture.md` §13, `_generate.py` regenerated | regenerated with `python3 specs/explainers/_generate.py .` |
| T082 | `plan.md` "Implementation notes": each departure and why | §6 above is its summary |
| T083 | `kiln/tests/tools/count-ported.ts` | **ported 54 of 54 · waiting 19 of 19 · 73 of 73**; fails if a ported file has fewer cases than its original |
| T084 | every quickstart scenario on a fresh clone | the verification report; quickstart corrected in three places (a wrong `node --test <dir>/` command, a sample record with an invalid `wallClock`, an inline `node -e` reading a field that does not exist) |
| T085 | the declared Node floor | 22.18.0 / 23.6.0 / 24.1.0 / 25.9.0 — 170 tests each, `kiln check` all `PASS`; the `imports` map and type stripping work on 22.18 as written, so the relative-specifier fallback (R2) was not needed |
| T086 | roadmap untouched | `git diff 60a2c7e -- specs/ROADMAP.md` empty; r12 `queued`; `gate0` unchanged |
| T087 | closing numbers | `npm test` exit 0 (`new: 170 · legacy: 500`); `npm run check` exit 0; checklist ticked |

**Closing numbers, with the growth of the new suite:** US1 30 → US2 67 → US3 107 → US4 150 → US5 **170**. Ported cases: 0 → 23 → 34 → 54. Checks registered: 0 → 1 (`legacy`) → 2 (`network`) → 3 (`boundaries`).

## 17. After the row: whole-branch review and re-verification (2026-10-25)

The [code review](./code-review-report.md) read all authored source and probed it adversarially; the [verification](./verification-report.md) was re-run from a fresh clone and extended. Outcome: no success criterion
fails; the findings were gaps in what the checks can *see* (import spellings, scan roots, skipped tests in the summary), one inherited stream rule (a late pre-delegation), no type-check, and some stale documents. Nothing in the
repository was changed by the review itself — only the three reports (`a2d07dc`).

## 18. The Roadmap gate and the review fixes (2026-10-25)

**The gate** (`3cd18bc`, 2026-10-25T18:17:27Z, human@batorfi, `gate0.note` entry 2). Three decisions, taken by the human on a brief that said what the gate could and could not do:
1. *Sequence:* decide the pending edits now; r12 stays `queued` until the PR is merged (the roadmap schema allows `done` only with `@PR#N`; the gate re-opens "after every merged or abandoned feature").
2. *The `60a2c7e` text edits* (the twelve-gate flow and the charter, design system and interface-gate proposals folded into r12, r14, r15, r17, r19, r20, r22, r28–r30, r32, r43): **APPROVE as written**. Four lines of `ROADMAP.md` changed (the header's "proposed" label, `updated`, `gate0.at`, `gate0.note`); no row, dependency or order. `validate:roadmap` → `PASS`.
3. *Review findings 1, 3, 4:* fix them on this branch before the PR. Finding 2 (inherited) is not changed by r12.

**The fixes** (`8b983e6`; documents `e3e930c`):

| Finding | Change | Where | Tests |
|---|---|---|---|
| 1 import spellings | `moduleLoads`: optional whitespace everywhere; an `import()`/`require()` argument that is not exactly one string literal is `network-computed` | `checks/lex.ts`, `checks/network-lint.ts` | `network-spellings.test.ts` S1–S7 (12 cases in the file) |
| 3 scan roots | both checks scan everything under `packages/<name>/` and `checks/`, recursively (tests, `node_modules`, `.git` excluded); a relative import into `tests/`, `fixtures/` or the `kiln/` root is `boundary-forbidden-import` | `checks/network-lint.ts` (`networkScanFiles`), `checks/boundaries.ts` | S8–S12 |
| 4 skipped tests | the closing line shows skips: `new: 184 tests (5 skipped)` | `tests/run.ts` | `tests/runner/skipped-summary.test.ts` R8 (2 cases) |
| 6 documents | `check-not-registered`; scan roots; the summary line; the quickstart's Pi version and two more planted violations | `contracts/*.md`, `quickstart.md` | — |

**Numbers.** New suite 170 → **184** (+14); ported cases still 54 of 54; scanned files still 22 (nothing was hiding in the real tree); mutants of the new regexes fail 2, 9 and 3 tests. Re-verified on a fresh clone of `e3e930c`: `npm test` exit 0, `npm run check` exit 0, Node 22.18 / 23.6 / 24.1 / 25.9 → 184 tests each, the five formerly silent constructs now fail by name, a `--depth 1` clone prints `(5 skipped)`.

**One thing the fixes do not do:** the network lint stays a lint. `const { fetch: f } = globalThis`, `Reflect.get(globalThis, "fetch")` and `process.binding` are still not detected, as the lint's header says; runtime enforcement is the residency module's (r16).
