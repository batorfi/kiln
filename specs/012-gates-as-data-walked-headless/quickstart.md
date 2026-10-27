# Quickstart: validating r14 (the acceptance run)

How a reviewer sees the row work, end to end, on a fresh clone. Each section names the requirement it proves. Commands are run from `kiln/`; `$S` is a scratch store directory. Contracts: [flow-data](./contracts/flow-data.md) · [walk-contract](./contracts/walk-contract.md) · [check-flow](./contracts/check-flow.md). The run is recorded in `baseline.md` at close-out.

## 0. Prerequisites and baseline

```sh
git clone <repo> && cd <repo>/kiln && git switch 012-gates-as-data-walked-headless
npm ci                      # three pinned dependencies (r13); Node ^22.19.0 || >=23.6.0
npm test                    # r13's counts or more; exit 0
npm run check               # FOUR PASS lines: network · boundaries · legacy · flow
```
Expected: the r13 suite (474 new, 500 legacy, 30 skipped) is a subset of the new counts; `legacy/` tree id and `specs/ROADMAP.md` unchanged (`git diff --stat main -- specs/ROADMAP.md legacy` is empty).

## 1. The flow check (US4 · FR-040 … 043)

```sh
npm run kiln -- check flow              # PASS flow …  note: 12 gates examined
npm test -- checks/tests/flow-check.test.ts
```
Expected: pass on the shipped flow; the negative suite refuses every member by its code; the "accept-everything" stub **fails** the suite; two-fault members list both. Try it by hand: delete the `9-pr` entry from `v2.ts` → `FAIL flow … flow-anchor-last`, `flow-builtin-missing`; restore.

## 2. The interface walk (US1 · SC-001)

```sh
S=$(mktemp -d)/s
npm run kiln -- owner --store $S &                         # prints: listening / ready
npm run kiln -- feature admit --store $S --key k1 --feature f1 --walk fixtures/walk-interface.json
node tests/walk/drive.ts --store $S --feature f1 --script fixtures/walk-interface.approve-all.json
npm run kiln -- feature state --store $S --feature f1
```
Expected: the driver prints one line per gate; **12 gates** open and settle in this order — the Roadmap gate, then Concept, Architecture, Experience design, Specification, Work plan, Implementation, Code review, UI review, Verification, Documentation, Merge — each settled by exactly one move; the final state is `done`; nothing opens after Merge. A move whose kind is not in the gate's vocabulary (`gate move … --kind reject` at Implementation) is refused `invalid-move` and nothing is written.

## 3. The plain walk (US2 · SC-002)

Same with `fixtures/walk-plain.json`. Expected: **10 gates** (Roadmap + 9); `feature state` history shows `not-applicable` for `2a-experience` and `6a-ui-review`, each with a `reason.text` naming the rule and the facts (`no path matches …; no label …; no journey cited`); a `gate move` on either is `unknown-gate`; re-running with `--admit` carrying `"require":["2a-experience"]` gives 11 and records `why: "required"`.

## 4. Kill and resume at every gate (US3 · SC-003)

```sh
npm test -- packages/durable/tests/proof/walk-smoke.test.ts           # default tier: four kills, one per phase group
npm run proof                                                         # the full matrix + 300 random kills; the runner prints "tier: proof"
```
Expected: the **smoke** (default tier) kills the owner at four points — one per phase group — and the **proof tier** at every declared `walk.*` point, every gate of both walks, a reject/re-cross script, and 300 random kills; each time the walk is killed (SIGKILL), restarted on the same store, finished, and its outcome list equals the uninterrupted walk's; the fresh-reader oracle (I1–I10, W1–W4) reports nothing; no gate is settled by a restart; a gate killed and restarted 7 times is still waiting. The runner prints which tier ran; the recorded proof run is the evidence for SC-003. The **weakened walk** (settles on restart) is caught by name.

## 5. Where moves lead (US5 · SC-005, SC-006)

```sh
npm test -- packages/durable/tests/walk/moves.test.ts
```
Expected, by scenario: `revise` without a note → `invalid-move`; `revise` with one → same gate, round 2, the note in the next brief's `instruction`; `reject --target 3-spec` at Work plan → Specification round 2, then Work plan … Merge re-open one after another, each brief with `recross.changedSince`; `reject --target roadmap` at Concept → `left-lane`; at the admission crossing `revise` or a row edit → admission round 2, `reject` → the walk ends `not-admitted` and no feature gate opens; at Verification with no target → rework on the current code, then Code review re-crossed; `restart` at Code review → rebuild, Code review round 2; `split+revise` at Implementation → `walk.split`, Work plan re-opens; a **feature-level** `reject` while Verification is open → that gate `withdrawn`, Architecture round 2, 0 gates carried forward; the same while a step runs → recorded `pending`, consumed at the next wake.

## 6. Triage and fix rounds (US6, US7 · SC-007, SC-008)

```sh
npm test -- packages/durable/tests/walk/triage.test.ts packages/durable/tests/walk/fix-rounds.test.ts
```
Expected: triage on a small plain feature → 7 gates, Concept and Architecture `skipped` with reasoning (not `not-applicable`); a small interface feature still opens Experience design and UI review; any other gate named for skipping is refused; `overrideTriage:true` at admission opens Concept and Architecture. Cap 0/1/2/3 × verdicts `fail,fail,fail,pass`: rounds taken = min(cap, failures), the gate opens for a person after them, no round settles it, `--kind mitigate` is refused, a cap of 4 is refused at admission.

## 7. The contract (US8 · SC-010)

```sh
npm test -- packages/contracts/tests
grep -n "declared as data only\|belongs to r14\|r14/r15" packages/contracts/gate-rail.md   # no output
```
Expected: the drift test passes; changing one vocabulary in `v2.ts` (or in `gate-rail.md`) alone fails it by gate and field.

## 8. Not changed (FR-070 · SC-012)

```sh
git diff --stat main -- ../specs/ROADMAP.md ../legacy       # empty
npm test                                                    # exit 0; the runner prints the tier and the suite time (threshold 180 s)
```
Expected: r13's tests green **unchanged**; the default tier's time inside the 180 s threshold with at least 15 s of margin (the matrix is the proof tier, stated in the output); `npm run check` four PASS.
