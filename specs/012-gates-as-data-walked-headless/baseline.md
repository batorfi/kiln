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
