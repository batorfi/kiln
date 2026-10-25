# Quickstart: validating the spike (row r42)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/](./contracts/)

How to prove the spike works end to end, **after** it is implemented; until then these commands describe what "done" looks like. Every scenario names the spec story it proves and the success criterion it settles.

**Prerequisites**: Node ≥ 22.19 (Pi Durable's floor; checked on 22.19.0 and the installed Node), git, network **once** for `npm ci`. Nothing else is installed globally. All commands run from `spikes/r42/` unless stated.

## 0. The shape on disk *(FR-010 · SC-008)*

```bash
cd spikes/r42
cat package.json | grep -A3 '"dependencies"'     # "@earendil-works/pi-durable": "1.4.0"   (exact, no ^ or ~)
git ls-files . | grep -c package-lock.json         # 1  (the lockfile is committed)
git check-ignore node_modules out                  # both ignored
ls ../../kiln | head -3                            # kiln/ unchanged: checks  fixtures  package.json …
grep -c '"dependencies": {}' ../../kiln/package.json   # 1  (kiln/ is still dependency-free)
```

**Expect**: the pin is exact, the lockfile is tracked, `kiln/` has no dependency and nothing under `kiln/` mentions the spike or Pi Durable.

## 1. Install the pinned version, record it *(FR-010, FR-013 · SC-006)*

```bash
npm ci
node -e 'const p=require("@earendil-works/pi-durable/package.json");console.log(p.name,p.version)'
```

**Expect**: `@earendil-works/pi-durable 1.4.0`. This is the one network act; the report records it. If `node_modules` is missing or differs from the lockfile, the next command fails `evidence-install-mismatch`.

## 2. The evidence, all strategies *(US1, US2, US3 · SC-001…SC-004, SC-006)*

```bash
npm run evidence
```

**Expect** a table like (numbers illustrative — the real ones are in the report):

```text
strategy           a (atomic)   b (once)   c (first wins)   d (no clock)   e (resumes)   kill points
native-signal      held         held       held             held *         held          9 of 9 + 300 random
native-abort       not-held     held       held             not-held       held          7 of 7 + 300 random
fallback-document  held         held       held             held           held          8 of 8 + 300 random
…                                         * with settings.restartLimit = Infinity
exit 0   evidence written to out/evidence.json
```

- Every cell is derived from scenarios that **ran**; a cell with zero scenarios reads `not-proven`.
- A different-process completer is part of every row *(SC-004)*.
- ≥ 100 repeats and ≥ 100 competing moves per strategy, exactly one record each *(SC-003)*.

## 3. One strategy, one kind of scenario *(US2 · SC-002)*

```bash
npm run kill-list -- --strategy native-signal          # each declared kill point and its phase
npm run evidence -- --strategy native-signal --only kill-point
```

**Expect**: every listed point is exercised; after each kill the reopened store satisfies I1–I7 ([data-model.md](./data-model.md) §2); the summary says `exercised N of N`.

## 4. Prove the oracle can fail *(FR-003, FR-013 · SC-006)*

```bash
npm test                                   # the harness's own tests, including a deliberately broken strategy
```

**Expect**: the broken strategy (one that records the move and completes the decision in **two** commits) is reported `not-held` for guarantee **a** with the violated invariant named (`I3`); a strategy that declares **no** kill points makes the
run fail `evidence-zero-kill-points`; a run with no scenarios fails `evidence-zero-tests`.

## 5. The fallback, if any guarantee fails natively *(US4 · SC-005)*

```bash
npm run evidence -- --strategy fallback-document
npm run evidence -- --strategy fallback-table
```

**Expect**: each of a–e `held` with the **same** scenarios (the same test files, no strategy-specific assertions). The upstream proposal exists at `upstream-proposal.md`, marked *not filed*.

## 6. The report *(US1, US5 · SC-001, SC-007, SC-009)*

```bash
less ../../specs/010-external-completion-spike/spike-report.md
```

**Expect**: the ten sections of [contracts/spike-report.md](./contracts/spike-report.md) in order; one verdict; the pinned version and integrity; the time box (start, end, kept); the port as the contract for r13 in KILN terms only; the findings
(Node floor 22.19, the dependency tree, `restartLimit`, one owner per storage, power-loss boundary).

## 7. Nothing else moved *(FR-011 · SC-008)*

```bash
cd ../../kiln && npm test && npm run check            # exit 0; new + legacy tests as before; three PASS
cd .. && git diff --stat main -- legacy kiln specs/ROADMAP.md   # empty
```

**Expect**: `kiln/`'s suite and checks unchanged (same counts as before the row: 184 + 500), `legacy/` byte-identical, `specs/ROADMAP.md` untouched by this row.

## 8. The declared Node floor *(plan risk R-3)*

```bash
npx -y node@22.19.0 src/evidence.ts --strategy native-signal      # the same runner, on Pi Durable's declared floor
```

**Expect**: the evidence runs on Pi Durable's own floor, or the report records the version at which it first works.

## Done when

- Scenarios 0–7 behave as stated on a fresh clone, and 8 is recorded.
- The report states one verdict and every status in it matches `out/evidence.json`.
- `specs/ROADMAP.md` is unchanged by this row, and r42 is still `queued` (closing it is the human's Roadmap-gate move).
