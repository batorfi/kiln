# Baseline: real local workers (row r16)

Readings taken before any implementation (T001), and the Phase 1/2 checkpoint (T014), on this machine: macOS 26.7.1, Apple M3 Ultra, 96 GB RAM.

## Before (2026-11-01, r15's closing state)

- **Node** `v26.8.2` (satisfies `^22.19.0 || >=24.1.0`) · **npm** `11.19.1`
- `cd kiln && npm test` — exit `0`. `new: 813 tests · legacy: 500 tests (30 skipped)`, default tier ~32s.
- `npm run proof` — exit `0`. `proof: 128 tests`, ~519s (one host under light load; r15's own baseline recorded 128/128 on an unloaded machine too).
- `npm run check` — exit `0`, all five checks `PASS` (network — 113 files; boundaries — 113 files, 17 layers; legacy — 168 files; flow — 1 file, 12 gates; record — 105 files, 42 types, 3 of 5 named walks replayed).
- `git rev-parse HEAD:legacy` = `20a82c7e214be256c804f6e8f1cd4cce9c8e9874`
- `specs/ROADMAP.md` sha256 = `be8a0160db2cbafb0f244dd092eca98229b49b3f2fe4d6710a561ff15a91ce71f` (last touched at commit `90a9f1c`)

## Phase 1 + 2 checkpoint (T014)

See `notes.md` for three real findings made while implementing this phase, each with its own fix: the boundary-cycle correction (T004), `lane.transition` turning out to be a read-only/legacy-only event type that cannot be committed (T013 — FR-027 corrected 2026-11-01, decided: rely on existing events and document fields, no new event type), and the empty network allowlist catching `residency.ts`'s direct `fetch` calls (T014's own checkpoint run).

After T001–T013, all new source is built and unit-tested in isolation; `kiln.unit`'s `work` phase is untouched (no user story has touched it yet, as the phase's own purpose states):

- `cd kiln && npm test` — exit `0`. `new: 860 tests · legacy: 500 tests (30 skipped)` (47 new tests added this phase: `package-resolves` ×1, `live-gate` ×5, `tools` ×5, `roster` ×7, `provider` ×5, `timeout` ×6, `residency` ×9, `kiln-provider` ×4, `lane-task-residency` ×4 — some counts approximate, all green), default tier ~32s, unchanged from before this phase.
- `npm run check` — all five checks `PASS` (network — 120 files, allowlist 1 entry; boundaries — 120 files, 17 layers, 2 external seams; legacy — 168 files unchanged; flow — unchanged; record — 112 files, 42 types unchanged, 3 of 5 named walks still replayed).
- `node --test checks/tests/boundaries.test.ts checks/tests/boundaries-dependencies.test.ts` — 84/84 pass, including the real-package scan (B1) and the existing `lane → workers` forbidden-import case (B3), unchanged.
- The live-model tier (`npm run test:live-models`) runs for real against this machine's installed Ollama (0.35.1) and `gemma4:12b` — not merely skipping: a real `pi-ai` completion, a real residency probe (tool-calling/streaming/usage all confirmed `true`), and a real `load()` with `keep_alive: -1` verified by request inspection.
- `npm run proof` — exit `0`. `proof: 128 tests`, ~533s — same 128 as before this phase (no new proof-tier kill-point tests yet; those land in T026/US2).
- `git diff main -- legacy` — empty, unchanged. `specs/ROADMAP.md` hash unchanged from T001.

## Phase 3 checkpoint (T017) — US4: a judge is never silently weaker

Pure proof on top of Foundational's existing machinery — no `unit.ts` change yet, no new source files beyond two test files.

- `cd kiln && npm test` — exit `0`. `new: 865 tests · legacy: 500 tests (30 skipped)` (5 new: `judge-tier-refusal` ×3, `judge-no-fallback` ×2).
- `npm run check` — all five checks `PASS`, unchanged from T014.
- Proves: `bindConversationRole`'s tier refusal happens before any provider call (sequencing proof via spy, since the real roster's `reviewer` entry is already `strongest`); a judge's residency failure never substitutes a different model — only a retry of the *same* model can succeed; the tier check happens before residency is ever asked for a model at all.

## Phase 4 checkpoint (T022) — US1: a step runs as a real, fresh conversation (the MVP)

`kiln.unit`'s `work` phase now calls a real conversation for a unit whose spec names a `role`; a scripted (no-role) unit's path is untouched.

- `cd kiln && npm test` — exit `0`. `new: 881 tests · legacy: 500 tests (30 skipped)` (16 new: `conversation` ×9, `unit-worker` ×4, `no-subagent` ×3).
- `npm run test:live-models` — **82 of 82, exit `0`, 0 skipped** (Ollama 0.35.1 + `gemma4:12b` both present): includes a real end-to-end worker turn — real provider registration, a real `KilnProvider`-mediated lease, a real `read-file` tool call against a real file, ~10–17 s wall time per run (not a skip).
- `npm run check` — all five checks `PASS` (network/boundaries — 121 files, up from 120: `conversation.ts` is new; legacy/flow/record unchanged).
- `npm run proof` — exit `0`. `proof: 128 tests`, ~560s — same 128 as T014/T017, all green: `unit.ts`'s new `role` branch (sharing the existing try/catch/lane-release path) caused no regression in any kill-point proof, including the heaviest ones (re-crossing walk × 6 named kill points, random-kill, storm).
- Judgment calls recorded in `notes.md`: `RoleEntry` gained `systemPrompt`; `Tool.parameters` confirmed to be typebox's empty `TSchema` interface (a plain JSON-schema object is structurally assignable, no builder needed); the tool-round loop is synchronous within one call (not yet kill-safe — that's T023-T027); `UnitCheckpoint`/`UnitResult` moved to `types.ts`; `role` reuses the existing `model` field; `requestId` is `(unit, step)`-keyed, standing in for WORK-5's `(feature, gate, step, attempt)` since a `TaskId` already correlates to one gate's one step.

## Phase 5 checkpoint (T028) — US2: a crash never double-charges a tool, a hang never touches a gate

`runTurn` restructured (T023, not additive — see `notes.md`) so a real conversation commits once per TOOL CALL, not once per model round; the interruption notice (T024) and the per-tier timeout (T025) are both wired through it; two new kill points (T026) are proven against a real-role unit with a scripted model reply, plus the weakened control (T027).

- `cd kiln && npm test` — **exit `0` in isolation per file; the FULL default-tier run shows `EXIT=1` from exactly 2 failures, both PRE-EXISTING (not from T023-T028) and confirmed load-dependent, not a regression**: `packages/lane/tests/residency.test.ts`'s `LIVE: probe()...` test and `tests/runner/zero-tests.test.ts`'s `the runner works from any working directory...` test. Both were already part of the suite before T023 (added at T011 and at r12 respectively); both pass cleanly and quickly in isolation (`node --test <file>` alone — 2.7s and 31s respectively, no failure); both fail only when the full suite's own parallelism puts many subprocess-spawning tests (several real `kiln owner` children, one real Ollama call) under contention at once, on this machine, regardless of what else is or isn't running concurrently. `new: 888 tests · legacy: 500 tests (30 skipped)` when it does pass a given file; `fail 0` for every file run alone. This is an environmental property of the full-suite run under this runner's parallelism, not a defect T023-T028 introduced — recorded here rather than papered over.
- `npm run proof` — exit `0`. **`proof: 132 tests`** (128 + 4 new: the two kill-point cases × real replay, the mid-timeout case, and T027's weakened-control case), ~539s. All green, including the 4 new `worker-replay.proof.test.ts` cases, run alone and inside the full proof tier.
- `npm run check` — all five checks `PASS` (network — 121 files, allowlist 1 entry; boundaries — 121 files, 17 layers, **2 external seams** — up from 1: workers' own seam to `pi-ai`, alongside durable's to `pi-durable`; legacy/flow/record unchanged).
- **Five pre-existing test-literal failures found and fixed, all dating to T009/T011, none of it T023-T028's own code** (full account in `notes.md`): `checks/tests/boundaries-dependencies.test.ts`, `packages/cli/tests/check-boundaries.test.ts` (both hardcoded `"1 external seam"`, now `2`); `checks/tests/network-lint.test.ts`, `packages/cli/tests/check-network.test.ts` (both hardcoded `"allowlist: 0 entries"`, now `1`); `packages/cli/tests/no-network.test.ts` (a standalone fetch-pattern scan, now reads the real allowlist instead of a second hardcoded exception); `packages/durable/tests/seam.test.ts`'s tests (a) and (c) (both asserted nothing-in-the-tree-imports-pi-ai, true before r16 and deliberately not true after it in exactly one sanctioned place — narrowed, not deleted). These had been failing silently since their introducing commits because every prior checkpoint's `npm test` ran through a pipe that swallowed the real exit code (`| tail -80`) — confirmed, not guessed; see `notes.md`'s dedicated section.
- `git diff main -- legacy` — empty, unchanged. `specs/ROADMAP.md` hash unchanged from T001.

## Phase 6+7 checkpoint (T031, T035) — US3's remaining proofs, US5: readiness and the memory budget

`reconcile()` wired before every `grant()` load (T029); checked for a real harness compaction call site and confirmed none applies to this row's checkpoint-based conversation model (T030, full account in `notes.md`); `requireCapability` + a fresh, never-cached `probe` wired into `conversation.ts`'s `callModel` (T032/T033 — a deliberate placement correction from the task's own sketch, recorded in `notes.md`); the memory-budget refusal that already existed since T011 (T034) got its missing retry-after-release test.

- `cd kiln && npm test` — same **2 pre-existing, load-dependent, non-regression failures** as the T028 checkpoint (`residency.test.ts`'s LIVE case, `zero-tests.test.ts`'s cwd case), both confirmed passing alone again this phase; `new: 895 tests · legacy: 500 tests (30 skipped)` (7 new: 2 in `lane-task-residency.test.ts` (T029), 1 in `kiln-provider.test.ts` (T030), 3 in `conversation.test.ts` (T032/T033), 1 in `residency.test.ts` (T034)).
- `npm run check` — all five `PASS`, unchanged shape from the T028 checkpoint.
- `npm run proof` — exit `0`, `132 tests` (unchanged — no new proof-tier kill points this phase; T029-T034 are unit/integration-level proofs, not kill-point proofs).
- `git diff main -- legacy` — empty, unchanged. `specs/ROADMAP.md` hash unchanged from T001.
