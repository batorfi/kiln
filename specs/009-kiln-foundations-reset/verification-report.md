# Verification report: Foundations reset (row r12)

**Branch**: `009-kiln-foundations-reset` @ `e3e930c` | **Date**: 2026-10-25 (closing run; re-run after the whole-branch code review **and after its fixes**) | **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Tasks**: [tasks.md](./tasks.md)
**Companions**: [implementation-report.md](./implementation-report.md) · [code-review-report.md](./code-review-report.md) · [baseline.md](./baseline.md) (every number, with its command)

**Method.** A fresh `git clone --branch 009-kiln-foundations-reset` into `/tmp/kiln-fresh` (no `node_modules`, nothing installed), then every scenario of
[quickstart.md](./quickstart.md) §0–§6 from `kiln/`; §7 on three further Node versions; the final run on the working tree. Machine: macOS, Node 25.9.0, **Pi 1.4.0**
installed (the live-Pi tier was measured against 0.85.1). *Three runs stand behind this report. The first, at `906c587` (the close of the row, Pi 1.1.0, 170 tests); a second, from scratch at the same commit after the
whole-branch code review (Pi since upgraded to 1.4.0), which added the probes of "Re-run: beyond the quickstart"; and a third, from scratch on a fresh clone of **`e3e930c`** after
the review fixes 1, 3 and 4 (184 tests). Every number below is from the third run unless a row says otherwise; none differs from the first except the test count, the Pi version
in the skip line, and the summary line's new `(N skipped)`.*

## Verdict

**All eight success criteria are met, with two stated limits** (SC-001's "measured Pi" half and the Verified-on-macOS-only scope). 87 of 87 tasks are done.
Closing numbers: `npm test` → **exit 0 · `new: 184 tests · legacy: 500 tests (30 skipped)`** (new 184 pass; legacy 470 pass, 0 fail, 30 skipped) · `npm run check` → **exit 0**
(`PASS network` 22 files · `PASS boundaries` 22 files · `PASS legacy` 168 files). `specs/ROADMAP.md`: row r12 is still `queued`; the Roadmap gate of 2026-10-25 (human@batorfi) approved the text edits of `60a2c7e` and recorded that r12 closes at its merge (below).

**Re-runs, same day.** At `906c587`, after the whole-branch review: every scenario and number reproduced; the extra probes found no failure of a success criterion but found *gaps beyond the criteria* (five spellings the network and boundary checks could not see; skipped tests hidden in the runner's summary). Those were fixed in `8b983e6` (review findings 1, 3, 4) and the verification was run again from scratch on a fresh clone of `e3e930c`: all eight criteria still met, every quickstart scenario reproduced, the five probes now fail by name, and the new suite is 184 tests. The section "Re-run: beyond the quickstart" has both outcomes; the [code review](./code-review-report.md) has the findings.

## Success criteria

| SC | Criterion | Command and result | Met |
|---|---|---|---|
| **SC-001** | 0 failures on a host with an unmeasured Pi **and** on one with the measured Pi | Unmeasured (this machine): `npm test` → exit 0, `live-Pi tier skipped: Pi 1.4.0 installed, measured [0.85.1]` once, 0 failures. Demanded: `npm test -- --pi` → exit 1, the 8 `PI-LIVE:` tests fail by name `pi-version-unmeasured` (US2.4). Measured Pi: **not run on a real 0.85.1** (none installed here); covered by runner tests R3/R4 with a stub `pi` printing `0.85.1` — the legacy child's environment is unchanged and the tier is left to run as the first program's did | ✔ — *limit: the measured-Pi half is stub-tested, not run against Pi 0.85.1* |
| **SC-002** | ≥ 54 ported cases run from the new packages; all 73 originals pass | `node tests/tools/count-ported.ts` → **ported 54 of 54 · waiting in legacy 19 of 19 · 73 of 73 accounted for** (gate-rail 6→15 and strongest-model 5→11 with new v2 cases added); legacy runs all 500 tests, 0 failures | ✔ |
| **SC-003** | 100 % of legacy files byte-identical, by a test | `kiln check legacy` → `PASS legacy — scanned 168 files`; tampered copy → `FAIL legacy-file-modified legacy/src/roles.ts` (exit 1); `checks/tests/legacy-baseline.test.ts` → tree id and all 168 blob ids equal git's; `git rev-parse HEAD:legacy` = `20a82c7e…` = `299b0a5:kiln` | ✔ |
| **SC-004** | flow data matches the constitution for **all gates** — names, moves, judges | `packages/contracts/tests/flow-vs-constitution.test.ts` reads constitution v2.1.0, PRD GATE-1/GATE-2 and `ui-flow.md` as text: **twelve** gates, the eleven feature-gate names in order, the five Principle-II judges, the closed set of move kinds, the interface gates' questions/moves/judges/`applies_when`; five mutants of `v2.ts` each fail ≥ 1 case (the criterion said "ten"; amended to twelve on 2026-10-25) | ✔ |
| **SC-005** | a weaker judge binding is refused in 100 % of the negative cases; `docs-synthesizer` never a judge | `strongest-model.test.ts` (11): each of the five v2 judges refused `standard`/`cheap`/`per-task` with `G2/L1 config error … must be "strongest"`; the four v1 judges likewise; `docs-synthesizer` a judge under v1, not v2; an invalid roster throws instead of reading as a rejection | ✔ |
| **SC-006** | the network lint detects every disallowed construct in its negative suite and fails when it scanned no files | `check-network` and `network-lint` tests: call, import, alias, computed access, external dependency, primitive, non-loopback URL, bare-name and missing-file allowlist entries, zero files — each by its own name with file and construct; quickstart §4: `FAIL network-call packages/lane/src/oops.ts`, `FAIL network-computed …`; the real tree passes (22 files); seven mutants of the lint each fail ≥ 1 test | ✔ |
| **SC-007** | the boundary check catches every forbidden import in its negative suite | B1–B10 (16 cases) and the CLI test: forbidden import (incl. a relative path into another package), sibling, `contracts` I/O, bare specifier, `legacy/` import, undeclared package, missing responsibility, zero files, invalid rule file; quickstart §5: `FAIL boundary-forbidden-import packages/record/src/oops.ts …`, `FAIL boundary-contracts-io …`; nine mutants each fail ≥ 1 test | ✔ |
| **SC-008** | the committed walks validate unchanged against v1 (and v2); a Code review `revise` fails v1 by name and passes v2 | `validate:log fixtures/r7-live-inference.jsonl` → `PASS`, and with `--flow v2` → `PASS`; the hand-made `revise` record → `FAIL — G3 record seq=1 (gate-completion): move "revise" not in MoveVocabulary(gate=6, flow=v1); allowed: approve, restart`, with `--flow v2` → `PASS`; a record naming gate `2a` fails v1 by name | ✔ |

## The quickstart on a fresh clone

| § | Scenario | Result |
|---|---|---|
| 0 | shape on disk | `legacy/` beside `kiln/`; nine packages; `checks/` with every file; 10 `responsibility` entries; no `node_modules`; `git status` clean |
| 1 | `npm test` | exit 0; skip line once; `new: 184 tests · legacy: 500 tests (30 skipped)`; `git status` clean afterwards |
| 2 | legacy frozen | `PASS legacy — scanned 168 files`; a scratch copy with one byte appended → `legacy-file-modified legacy/src/roles.ts`, exit 1 |
| 3 | flow and judges | `node tests/run.ts --new-only packages/contracts/tests` → 33 pass; the four `validate:log` outcomes above. *(The quickstart's own command here was wrong — `node --test <dir>/` — and its sample record had an invalid `wallClock`; both fixed.)* |
| 4 | network lint | as SC-006 |
| 5 | boundaries; `npm run check` | as SC-007; all three checks `PASS`, exit 0 |
| 6 | nothing was lost | the census tool, as SC-002 *(the quickstart's inline `node -e` read a field that does not exist; replaced by the tool)* |
| 7 | the declared Node floor | below |

## The declared Node floor (quickstart §7; code-review finding 1)

`node tests/run.ts --new-only` and `kiln check` on the clone, each on its own Node (via `npx node@<v>`):

| Node | New suite | `kiln check` |
|---|---|---|
| **22.18.0** (the floor) | 184 tests, 184 pass, 0 fail | `PASS network` · `PASS boundaries` · `PASS legacy`, exit 0 |
| 23.6.0 | 184 / 184 / 0 | all `PASS`, exit 0 |
| 24.1.0 | 184 / 184 / 0 | all `PASS`, exit 0 |
| 25.9.0 (installed) | 184 | all `PASS`, exit 0 |

The `imports` map and type stripping work on 22.18 as written; the fallback (relative cross-package specifiers, research R2) was not needed. The 23.6 and 24.1 rows are the versions on which
`import.meta.main` is undefined and the first version of the CLI exited 0 in silence; the shared `isEntryPoint` guard fixed it, and a regression test keeps it fixed.

## Functional requirements

| FR | State | Evidence |
|---|---|---|
| FR-001 packages and responsibilities | ✔ | nine packages + `checks/`, each `kiln.json`; `kiln check boundaries` enforces it |
| FR-002 runtime floor, no dependency, no bare specifier | ✔ | `dependencies` empty; `boundary-bare-specifier` and `network-external-dependency` refuse any; Node 22.18 → 25.9 pass |
| FR-003 one runner, any directory, zero tests fail | ✔ | `tests/run.ts`; runner R5 cases; run from `/tmp` |
| FR-004 `legacy/` byte-identical | ✔ | SC-003 |
| FR-005 legacy keeps running | ✔ | `legacy: 500 tests` in `npm test` |
| FR-006 Pi tier switched off, versions printed once, never when demanded | ✔ | runner R1–R4, R7; the live `--pi` run |
| FR-007–FR-009 flow as versioned data; moves; judges | ✔ | SC-004, SC-005 (twelve-gate v2 per the 2026-10-25 amendment) |
| FR-010 pure affinity logic | ✔ | `lane/src/affinity.ts`, 3 new tests, 3 mutants |
| FR-011–FR-014 schemas, validators, flow per record, clock, fixtures | ✔ | 23 ported record cases; `flow-records.test.ts`; fixtures byte-identical (`cmp`) |
| FR-015 every ported module with its tests; no case dropped | ✔ | the census: 54 of 54 |
| FR-016–FR-018 `kiln check`: network, boundaries, never vacuous, falsifiable | ✔ | SC-006, SC-007, SC-003; every check has mutation-checked negative tests |
| FR-019 the v2 gate-rail contract | ✔ | `packages/contracts/gate-rail.md` |
| FR-020 WORK-2 as corrected | ✔ | five judges; PRD WORK-2 brought in step (T080) |
| FR-021 roadmap untouched by the row, no gate decision | ✔ | below |

## The roadmap (FR-021, T086)

**Across the row** (`60a2c7e` → `906c587`, the commits that implemented it): `git diff 60a2c7e 906c587 -- specs/ROADMAP.md` is empty. Row r12: `queued`; every row `queued`; `gate0`: `approved`, `human@batorfi`,
`2026-10-22T12:20:22Z`; the validator prints `PASS`. The text edits in `60a2c7e` (the twelve-gate flow and the charter proposals folded into rows) were requested by the human, change no row, dependency or order.

**After the row, at the Roadmap gate** (`3cd18bc`, 2026-10-25T18:17:27Z, **human@batorfi**; `gate0.note` entry 2): the human **approved those edits as written**, and decided that r12 **stays `queued` until its pull request is merged**
(the schema allows `done` only with a merged `@PR#N`) and that review findings 1, 3 and 4 be fixed on the branch first. That commit changes four lines of `ROADMAP.md` (the header's "proposed" label, `updated`, `gate0.at`,
`gate0.note`); no row, dependency or order. The validator still prints `PASS`. FR-021 constrains the row's own work, which did not touch the roadmap; the gate decision is the human's, made after it. **Closing r12 — `status: done`,
`outcome: "@PR#N"` — is the next gate entry, when the PR is merged.**

## Re-run: beyond the quickstart

Probes added in the re-run, each on a scratch copy or a throw-away clone, so nothing in the repository changed (`git status` clean after every one).

| Probe | Command | Result |
|---|---|---|
| Demanded Pi tier, unmeasured Pi | `npm test -- --pi` | exit 1; `new: 184 tests · legacy: 500 tests (15 skipped)`; **8** legacy `PI-LIVE:` tests fail, each with `[{"code":"pi-version-unmeasured","detail":"reported=1.4.0 measured=[0.85.1]"}]` |
| `legacy/` removed | `mv ../legacy ../legacy.gone; kiln check legacy` | `FAIL legacy — 168 failures`, each `legacy-file-missing`, exit 1 |
| Ignored runtime file | `echo x > legacy/factory-log/x.jsonl; kiln check legacy` | `PASS` (the ignore glob works) |
| README command | `npm run validate:roadmap -- ../specs/ROADMAP.md` | `PASS` |
| Log stream, flow 2a under v1 | `validate:log` on a `gate:"2a"` record | `FAIL — G3 … gate 2a is not in flow v1`, exit 1 |
| Type-check, strict | `tsc --noEmit -p tsconfig.json` from a scratch install in `/tmp` | 4 errors (3 files); none behavioural — [code review](./code-review-report.md) finding 5 |
| Shallow clone | `git clone --depth 1 file://…; node tests/run.ts --new-only` | before the fix: exit 0, `new: 170 tests` with 5 skipped unmentioned (finding 4). **After: exit 0, `new: 184 tests (5 skipped)`** — the L6 baseline cross-check and the r7 history tests, now visible on the line |
| Checks against spellings outside the original negative suite | `import{a}from"#lane/affinity.ts"` in `record`; `import ("node:http")`; `import("node:" + "http")`; a file at `checks/lib/net.ts`; `import "../../../tests/pi-tier.ts"` in `lane` | before the fixes: all five **passed in silence** (findings 1, 3). **After (fresh clone of `e3e930c`): each fails by name** — `boundary-forbidden-import` (the minified one, and the one into `tests/`), `network-import`, `network-computed`, `network-call checks/lib/net.ts`. Twelve new cases (S1–S12) keep them failing; three mutants of the new regexes fail 2, 9 and 3 tests |
| Log stream, pre-delegation after the approval | `validate:log` on an approve at seq 1 followed by a `pre-delegation` at seq 2 | `PASS` — finding 2 (inherited from the first program; r12 preserves it by FR-011) |

The same run also repeated, on the fresh clone, the three tamper cases of quickstart §2 (modify, delete, add), the planted network and boundary violations of §4–§5, and the census of §6; all gave the results
tabulated above. The third run also repeated the Node floor (22.18.0, 23.6.0, 24.1.0: 184 tests, `kiln check` all `PASS`), the demanded-Pi run and the census (54 of 54).

## Limits and known follow-ups

1. **Measured Pi (SC-001, half).** No Pi 0.85.1 here; the measured-Pi path is stub-tested (R3/R4). Re-measuring the installed Pi (now 1.4.0) is a legacy chore that changes both lists in one commit; a test keeps them equal.
2. **macOS only.** As the README says. The entry guard and the path handling were written to be portable, but nothing here ran on Linux or Windows.
3. **`legacy-copies.json` `since` ids** are the commit ids of the porting commits where known; the later records (US3–US4) carry the id of the commit before the port, which is the nearest recorded.
4. **For the next Roadmap gate:** the `edit-rows` text of `60a2c7e` was **approved at the gate on 2026-10-25T18:17:27Z** (`3cd18bc`, `gate0.note` entry 2); r14's row now says twelve gates; `kiln check flow` (r14) will check the twelve-gate invariants; `kiln check design-system` / `foundations` have no row yet.
5. **Findings of the first code review** (T001–T019): the entry guard, `weakerBindingRejected`, the default flow and prototype keys are fixed with named tests; the F3 source was decided and implemented (text parse of the legacy file); the Phase 2 code now has tests.
   **Findings of the whole-branch review** ([report](./code-review-report.md)): 1 (import spellings), 3 (scan-root holes) and 4 (skipped tests in the summary) are **fixed** in `8b983e6` with tests; 6 (documents) in `e3e930c`. Open, none blocking: 2 (a late pre-delegation authorises an approval; inherited from the first program, a Roadmap proposal), 5 (no type-check; 4 strict errors), 7 (cosmetics).
6. **A defect found after that review and fixed:** the entry guard was also unsafe through a symlinked path (macOS temp directories), which the first program's idiom shares. Fixed in one shared helper with a regression test.

## Reproduce

```bash
git clone --branch 009-kiln-foundations-reset https://github.com/batorfi/kiln.git /tmp/kiln-fresh && cd /tmp/kiln-fresh/kiln
npm test                      # exit 0 · new: 184 tests · legacy: 500 tests (30 skipped)
npm run check                 # PASS network · PASS boundaries · PASS legacy
node tests/tools/count-ported.ts
npx -y node@22.18.0 tests/run.ts --new-only
```
