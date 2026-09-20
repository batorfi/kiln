---
description: "Task list for 006-kiln-live-inference (r7) — true live local inference"
---

# Tasks: 006-kiln-live-inference (r7)

**Input**: Design documents from `specs/006-kiln-live-inference/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) (D1–D9) ·
[data-model.md](./data-model.md) (E1–E6) · [contracts/](./contracts/) · [quickstart.md](./quickstart.md) (S1–S13)

**Tests**: **INCLUDED.** This row's deliverable *is* a probe plus a set of assertions — FR-005–FR-009,
SC-002–SC-007 and the S1–S13 scenarios are test artifacts, not optional extras.

**Organization**: grouped by user story (US1–US4 from spec.md) so each is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4; Setup / Foundational / Polish carry no story label

## Path Conventions

Single project. The kiln toolchain lives under `kiln/` at the repository root: `kiln/src/`,
`kiln/ui/`, `kiln/validate/`, `kiln/tests/`, `kiln/fixtures/`, `kiln/schemas/`, `kiln/contracts/`.
Node `>= 22.6`, `node --test` runs `.ts` directly, zero dependencies.

**Canonical artifacts that MUST NOT be modified** (any diff here is a task failure):
`kiln/validate/log.ts` · `kiln/validate/roadmap.ts` · `kiln/schemas/*.json` ·
`kiln/contracts/move-vocabulary.ts` · `kiln/src/roles.ts` · all of `kiln/ui/*`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: make the new homes and entry points exist before anything is written into them.

- [x] T001 [P] Add `kiln/fixtures/.gitkeep` and verify `kiln/fixtures/*.jsonl` is **NOT** git-ignored (`git check-ignore -v kiln/fixtures/x.jsonl` must find no match) — per research.md **D9**, `kiln/factory-log/*.jsonl` IS ignored, so a fixture placed there could never be committed
- [x] T002 [P] Add npm scripts to `kiln/package.json`: `ollama-ready` → `node kiln/validate/ollama-ready.ts`, `live-inference` → `node --test kiln/tests/live-inference`, `switch-cost` → `node --test kiln/tests/switch-cost`, `capture-fixture` → the explicit fixture regeneration command (D9); keep `dependencies: {}` untouched
- [x] T003 [P] Create the `KILN_LIVE` gate helper in `kiln/tests/_live-gate.ts` exporting `liveEnabled()` (true iff `process.env.KILN_LIVE === "1"`) and `skipUnlessLive()` returning node-test `{ skip: <recorded reason> }` — per NC3=A, the default suite must never require a model
- [x] T004 Record the pre-change baseline: run `node --test "kiln/tests/**/*.test.ts"` and note the count (expected **124/124**) plus `runtime-ready`/`overlay-ready`/`live-ready` all READY, so any later regression is attributable

**Checkpoint**: new dirs and scripts exist; baseline recorded; nothing behavioural changed yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the async spine (D1–D3) and the shared network-scan definition (D6). Everything else
depends on these, and both are **offline-testable** — no Ollama needed.

**⚠️ CRITICAL**: no user story work may begin until this phase is complete and 124/124 is green again.

### The async spine (NC1=B · contracts/async-spine.md)

- [x] T005 Widen the resident interface in `kiln/src/stub-resident.ts` to `run(workUnit: WorkUnit): unknown | Promise<unknown>` — a **union, not a replacement** (D1/A1). `makeStubResident`'s implementation body MUST remain **unedited**; likewise `makeLiveResident` in `kiln/src/live-resident.ts`. Any edit to either implementation is a contract violation
- [x] T006 In `kiln/src/lane.ts`: make `yield_` and `run` `async`; change line ~100 from the bare `resident.run(unit);` to `await resident.run(unit)` **and capture the result** so it is reachable by the walk (contract **O4** — the discard is why r3's "real work product" claim was unobservable). `makeLane`, `hold`, `resume`, `assertSingleLane`, `hasSwapTransition` MUST stay synchronous (D2)
- [x] T007 In `kiln/src/scheduler.ts`: **split** `schedule` into a synchronous `bindAll(units): void` (the `bindRole` loop that throws on a sub-`strongest` line-of-defense binding) and an `async schedule(units, resident)` that calls `bindAll` **first**, then awaits `run` (D3/A3). `switchCount` and `lodUnitsBoundStrongest` stay synchronous. **Rationale to preserve in a comment**: a bare `async schedule` turns P-II's config error into a rejected promise that `assert.throws` passes silently
- [x] T008 [P] Make `buildStubWalk` and `buildProgramWalk` in `kiln/src/walk.ts` `async` (they await `run`); emitted record shapes unchanged — **no new `recordType`**
- [x] T009 [P] Make `buildLiveWalk` in `kiln/src/live-walk.ts` `async`; the `THROWAWAY_UNITS` sequence, the recorded-selection marker, and the emitted union stay **identical**
- [x] T010 Add `await` at the 9 walk-builder call sites inside the probes — `kiln/validate/runtime-ready.ts:146`, `kiln/validate/overlay-ready.ts:171,175,177`, `kiln/validate/live-ready.ts:129,138,148,151` — making `checkRuntimeReady`, `checkOverlayReady` and `checkLiveModelReady` `async`, and make **every probe CLI exit non-zero on a rejected promise** (contract **A6**). These 9 are the P-V/P-VIII proofs themselves; an un-awaited walk here reports a green check on an unbuilt walk
- [x] T011 Add `await` at the ~25 test call sites: `kiln/tests/lane/lane.test.ts:20,39,48`, `kiln/tests/scheduler/scheduler.test.ts:21`, `kiln/tests/dogfood/dogfood.test.ts:18,25,35,45`, `kiln/tests/live-walk/live-walk.test.ts:22,30,40,47,56,69,88,90`, `kiln/tests/twin/twin.test.ts:50,52,60`, `kiln/tests/inter-row/inter-row.test.ts:74,80`, and the runners `kiln/tests/dogfood/run.ts:20`, `run-program.ts:22`, `run-live.ts:27`. **Keep** `scheduler.test.ts:35,40` as `assert.throws(() => bindAll(...))` — they must stay synchronous throws, not `assert.rejects`
- [x] T012 Write the forgotten-`await` guard in `kiln/tests/negative/async-await.test.ts` (D8/A5/S11): a probe handed a `Promise` where it expects a resolved `WalkResult` MUST fail **named**, never read `undefined` fields as absent-and-fine. Cover at least one probe and one walk builder

### The shared network-scan definition (NC2=A · contracts/ollama-ready.md R6)

- [x] T013 Extract the duplicated zero-network scan into `kiln/validate/_netscan.ts`, preserving today's `EXTERNAL_IMPORT` and `NET_PRIMITIVE` behaviour **exactly** — it currently exists as three near-identical copies (`runtime-ready.ts:74`, `overlay-ready.ts:188`, `live-ready.ts:67`); one definition, one allowlist
- [x] T014 In `kiln/validate/_netscan.ts` add **call-based** detection — `fetch(`, `http.request(`, `https.request(`, and non-loopback `new URL(` — **in addition to** (never replacing) the existing patterns; export `LOOPBACK_ALLOWLIST = ["ollama-resident.ts"]` (**exactly one** entry); add the loopback-literal assertion (the allowlisted module's target must resolve to `127.0.0.1` / `localhost` / `$OLLAMA_HOST`); and bring **`kiln/src` into scope for `fetch(`** — today only `kiln/ui` is checked for it (`tests/ui/ui.test.ts:56`)
- [x] T015 Wire `runtime-ready.ts`, `overlay-ready.ts` and `live-ready.ts` to `_netscan.ts`, deleting their local copies. `live-ready.ts` MUST remain runnable with **no Ollama present** (contract **R5**) — no dialling check may leak into r3's static probe

**Checkpoint**: `node --test "kiln/tests/**/*.test.ts"` is green (124 + the new negative test), all three
existing probes are READY, and the scan is strictly stronger — with **no** Ollama installed.

---

## Phase 3: User Story 1 — The kiln actually fires a local model (Priority: P1) 🎯 MVP

**Goal**: a real Ollama-backed resident whose output is genuinely the model's, and is captured.

**Independent Test**: with Ollama up and an installed model, two different work units produce
**different** output reachable by the walk; with a model name absent from `/api/tags`, the run fails
**naming the missing model** rather than silently succeeding.

### Implementation for User Story 1

- [x] T016 [US1] Create `kiln/src/ollama-resident.ts` exporting `makeOllamaResident(opts?)` per contract **O1** — `{ model?, tier?, host?, seed?, temperature?, numPredict?, timeoutMs? }`; it implements r1's `Resident`, returns a **plain model name** from `model()` (never a URL, P-VIII), and **never decides a gate** (P-I). This is the **only** module permitted to reach loopback (T014's allowlist)
- [x] T017 [US1] Implement the request in `kiln/src/ollama-resident.ts` per contract **O2**: `POST http://<host>/api/chat`, body `{ model, messages:[{role:"user",content}], stream:false, think:false, options:{ temperature:0, seed, num_predict } }`, visible reply read from `message.content`. **`think: false` is mandatory** — measured on `gemma4:12b`, `/api/generate` with `num_predict:12` returned `content: ''` while `/api/chat` with `think:false` returned `'ready'`
- [x] T018 [US1] Implement the named failure modes in `kiln/src/ollama-resident.ts` per contract **O3**: a model absent from `/api/tags` fails **by name** at start-up (no silent substitution; any stub fallback stays **recorded**); an empty visible `content` is a **named fault**, not work product (FR-003); an unreachable host / non-2xx / timeout is a named failure or a durable `wait`, **never** an indefinite block and **never** an auto-approved gate; a non-loopback host is rejected
- [x] T019 [US1] Record the resident selection per contract **O5** / research **D5**: write `resident selection → live model=<name> @ loopback (NC2-A: local, not cloud)` into r3's existing `transition.reason` slot. A **symbolic** `@loopback`, not a raw address. **No new `recordType`**, and `kiln/validate/log.ts` stays **unmodified** — R5 scans keys, not values. Per contract **O6**, prompt and completion text MUST NOT enter the ledger
- [x] T020 [US1] Set `DEFAULT_LOCAL_MODEL` in `kiln/src/live-resident.ts` to a name that resolves in `/api/tags` (FR-013) — it is currently `ollama/llama3.2:3b`, which is **not installed** on the reference host. Do not hand-verify: T024's check (b) must catch staleness automatically
- [x] T021 [US1] Export the r7 surface from `kiln/index.ts` (`makeOllamaResident` and its types) alongside r1/r2/r3's exports, with a header comment stating that wiring admits no program and advances no gate (P-VI), matching the existing r1/r2/r3 blocks

### Tests for User Story 1

- [x] T022 [P] [US1] Write `kiln/tests/ollama-resident/ollama-resident.test.ts` (**gated** via `skipUnlessLive()`, S6): output **varies with input** (it is the model's output, not a fixed string); the result is **captured** and reachable by the walk; a missing model fails **naming** it; an empty visible reply is a **named fault**; `model()` returns a name with no URL in it
- [x] T023 [P] [US1] Write `kiln/tests/ollama-resident/recorded-selection.test.ts` (**offline**): the emitted `transition.reason` carries the resident marker and `@loopback`; the record passes 001's **unmodified** `kiln/validate/log.ts`; no record carries a forbidden R5 **key**; no prompt/completion text appears in the JSONL (**O6**)

**Checkpoint**: the kiln fires a real local model, the output is captured, and the selection is recorded.

---

## Phase 4: User Story 2 — A preflight probe that dials, and skips loudly (Priority: P1)

**Goal**: `OllamaReady` — the fourth probe, and the first that actually dials.

**Independent Test**: with Ollama stopped the probe reports `ready=false` **naming** the failed
precondition and the offline suite still completes green; with Ollama up and the model pulled it
reports `ready=true` with a per-check trace; every falsify hook names itself.

### Implementation for User Story 2

- [x] T024 [US2] Create `kiln/validate/ollama-ready.ts` with `checkOllamaReady(override?)` returning `{ ready, skipped, skipReason?, checks, live }` per data-model **E3**, **composing** `checkLiveModelReady` (which composes `overlay-ready` → `runtime-ready`) and reusing r1's `Check` shape — imported, not re-declared
- [x] T025 [US2] Implement checks **(a)–(c)** in `kiln/validate/ollama-ready.ts` per contract **R2**: (a) endpoint answers via `GET /api/tags` with a bounded timeout; (b) the **named** model is present in `/api/tags`; (c) one round-trip returns **non-empty visible** content. Each names itself on failure
- [x] T026 [US2] Implement checks **(d)–(f)** in `kiln/validate/ollama-ready.ts`: (d) the selection is **recorded** (inherit r3's `F-NOT-SILENT`); (e) a **fabricated** "live ran" marker with no round-trip is **caught** — this is the check that distinguishes r7 from r3, since `LiveModelReady` is satisfiable by a deterministic adapter; (f) `_netscan` is green **and** `LOOPBACK_ALLOWLIST` has exactly one entry
- [x] T027 [US2] Implement skip-is-never-a-pass per contract **R3**: `skipped === true ⇒ ready === false` **and** a non-empty `skipReason`. A `skipped` result with no reason is itself a failure. Assert the probe advances no gate and admits no program (P-VI / R4)
- [x] T028 [US2] Add the CLI entry to `kiln/validate/ollama-ready.ts` with flags `--no-endpoint`, `--no-model`, `--empty-visible`, `--stub-unlogged`, `--forged-live`, `--extra-loopback`; non-zero exit on any failure **and on a rejected promise** (**A6**)

### Tests for User Story 2

- [x] T029 [P] [US2] Write `kiln/tests/ollama-ready/skip.test.ts` (**offline**, S2): with the endpoint stubbed unreachable and with the model absent, the probe returns `ready=false`, `skipped=true`, and a **non-empty `skipReason`**; assert a `skipped` result can never be `ready=true`
- [x] T030 [P] [US2] Write `kiln/tests/ollama-ready/falsify.test.ts` (**offline where possible**, S7): each of the six hooks flips `ready=false` and **names itself**; `--forged-live` specifically distinguishes a *claimed* live run from a *performed* one
- [x] T031 [P] [US2] Write `kiln/tests/ollama-ready/ready.test.ts` (**gated**, S5): with a live host, `ready=true` with a per-check trace covering (a)–(f); assert `live` (the composed r3 result) is also READY

**Checkpoint**: the probe dials, proves a call happened, and skips with a record when it cannot.

---

## Phase 5: User Story 3 — The invariants hold live, and the affinity tax is measured (Priority: P1)

**Goal**: re-assert the constitution against a real resident, and turn Principle IV into a number.

**Independent Test**: `assertSingleLane` over live snapshots; realized switches `== switchCount`; a
weaker line-of-defense binding still throws; and a timed cold-vs-warm comparison shows switch time
dominating work time.

### Tests for User Story 3

- [x] T032 [P] [US3] Write `kiln/tests/live-inference/single-lane.test.ts` (**gated**, S8): `assertSingleLane` holds over snapshots captured from a **live** walk, and a forged two-running snapshot still **throws** (P-III / F-SINGLE)
- [x] T033 [P] [US3] Write `kiln/tests/live-inference/affinity.test.ts` (**gated**, S8): realized switches `== switchCount(units)` on a live walk (P-IV / SC-004), and every line-of-defense role binds `strongest` — a weaker binding **throws synchronously** via `bindAll` (P-II, contract **A3**)
- [x] T034 [P] [US3] Write `kiln/tests/live-inference/no-concurrency.test.ts` (**gated**, FR-015a / contract **A4**): exactly one unit is in flight at every awaited instant; assert the implementation contains no `Promise.all`/`Promise.race` over work units and no overlapping residents. Sequentiality is the thesis, not an implementation detail
- [x] T035 [US3] Write `kiln/tests/switch-cost/switch-cost.test.ts` (**gated**, S9 / data-model **E5** / contract **R7**): measure `coldMs` (unloaded model, e.g. via `keep_alive: 0`), `warmMs` (resident), and assert `ratio` exceeds a **conservative floor** — not the observed 64×, so a faster machine or smaller model cannot turn a true claim red. Must tolerate a 135 GB `strongest` model without timing out. *Reference: 18 040 ms cold · 280 ms warm on the operator's machine.* **This is the first assertion of Principle IV's "Testable as:" clause anywhere in the tree**

### Fixtures for User Story 3

- [x] T036 [US3] Implement the explicit fixture capture command (wired to T002's `capture-fixture`) that performs one real live full-rail walk and writes `kiln/fixtures/r7-live-inference.jsonl`, plus a no-`decidedBy` sibling `kiln/fixtures/r7-live-broken.jsonl`. It MUST be explicit — never silently rewritten by a test run (**D9**)
- [x] T037 [US3] Capture and **commit** `kiln/fixtures/r7-live-inference.jsonl` and `kiln/fixtures/r7-live-broken.jsonl` from a genuine live run against an installed model; record in the commit which model and Ollama version produced them
- [x] T038 [US3] Write `kiln/tests/live-inference/replay.test.ts` (**offline**, S10): `kiln/fixtures/r7-live-inference.jsonl` **PASSes** 001's unmodified `kiln/validate/log.ts` (R1–R6), and `r7-live-broken.jsonl` **FAILs with a named R3** (`no-silent-approval`). Assert both use 001's union only — **no new `recordType`**

**Checkpoint**: every constitutional invariant is proved against a live model, and the switch tax has a number.

---

## Phase 6: User Story 4 — The local-first guarantee is tightened, not quietly spent (Priority: P2)

**Goal**: prove the guard ended up **strictly stronger** than before r7 spent the exception.

**Independent Test**: the hardened scan catches a planted `fetch(` in `kiln/src/` that the old regexes
provably miss; the allowlisted module passes by name; a second loopback module fails.

> **Note on ordering**: the *mechanism* (T013–T015) is in Phase 2 because US1's resident cannot land
> honestly without the allowlist. This phase owns the **proof** that the hardening works — SC-007.

### Tests for User Story 4

- [x] T039 [P] [US4] Write `kiln/tests/netscan/hardened.test.ts` (**offline**, S3): a planted `fetch(` in a **non**-allowlisted `kiln/src` module is **caught, named**. Include an assertion documenting the verified baseline — today's `NET_PRIMITIVE` and `EXTERNAL_IMPORT` were both run against a realistic loopback resident and **neither tripped**
- [x] T040 [P] [US4] Write `kiln/tests/netscan/allowlist.test.ts` (**offline**, S3): the allowlisted module passes **by name**; `--extra-loopback` (a second entry) fails; a **non-loopback** host literal inside the allowlisted module also fails (the loopback-literal assertion)
- [x] T041 [P] [US4] Write `kiln/tests/netscan/strictly-stronger.test.ts` (**offline**): every pattern the pre-r7 scan caught is **still** caught — an external bare-specifier import and a `new Server`/`require('http')` primitive both still fail. The hardening must be additive, never a swap
- [x] T042 [US4] Assert in `kiln/tests/netscan/untouched.test.ts` (**offline**, S13) that r7 modified **no** canonical artifact: no diff in `kiln/validate/log.ts`, `kiln/validate/roadmap.ts`, `kiln/schemas/*.json`, `kiln/contracts/move-vocabulary.ts`, or `kiln/ui/*` — R5 needed no amendment because it scans **keys, not values** (**D5**)

**Checkpoint**: the P-VIII exception is declared, narrow, and policed by a guard that is measurably stronger.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T043 [P] Discharge **FR-014** — correct the overstated r3 claims in the five files that still carry them: `specs/004-kiln-live-walk/implementation-report.md`, `quickstart-run.md`, `compliance-note.md`, `contracts/live-walk.md`, `contracts/live-ready.md`. Describe what r3 **actually** delivered (a full-rail walk on a deterministic adapter). **Do not** rewrite `specs/ROADMAP.md`'s `gate0.note` entries 4 or 5 — the ledger is append-only, and entry 5 already records the correction
- [x] T044 [P] Write `specs/006-kiln-live-inference/quickstart-run.md` filling the S1–S13 result matrix with **observed** output, following r3's `quickstart-run.md` pattern — every "Expect" needs a real "Observed"
- [x] T045 [P] Write `specs/006-kiln-live-inference/compliance-note.md` tracing each constitutional principle to its proof, and record the **one declared P-VIII exception** with the evidence that the guard ended up stronger (plan.md Complexity Tracking)
- [x] T046 Run the full verification sweep: `node --test "kiln/tests/**/*.test.ts"` **offline** (green, no Ollama) → then `KILN_LIVE=1` (green, live) → `runtime-ready`, `overlay-ready`, `live-ready`, `ollama-ready` all READY → `log.ts` on both fixtures → `roadmap.ts specs/ROADMAP.md` → `git diff --quiet specs/ROADMAP.md` (S12: no diff from any code path)
- [x] T047 Verify **SC-009 / P-VI**: grep the emitted fixture for `"gate0"` and confirm the only such record is a **`wait`** (a re-open at the row's own close) — never a `gate0: approved` emitted by the build. r7 fires the admitted program; the **human** re-admits `r4 → r6` at the seam
- [x] T048 Tick off T001–T047 in `specs/006-kiln-live-inference/tasks.md` and hand back to the human for the r7 close — the Gate-0 seam re-opens, and **r4 becomes eligible** (its deps `[r2, r3, r7]` are then satisfied)

---

## Dependencies & Execution Order

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational — async spine + shared _netscan)   ⚠️ BLOCKS EVERYTHING
   ↓
   ├─→ Phase 3 (US1 — the resident)  ──┐
   │        ↓                          │
   ├─→ Phase 4 (US2 — OllamaReady) ────┤  US2 needs US1's resident to dial
   │        ↓                          │
   ├─→ Phase 5 (US3 — invariants + cost + fixtures)  needs US1; T038 needs T037
   │                                   │
   └─→ Phase 6 (US4 — the guard proven) ─┘  independent of US1–US3; needs only T013–T015
   ↓
Phase 7 (Polish)
```

**Hard dependencies**

| Task(s) | Depends on | Why |
|---|---|---|
| T006–T012 | T005 | the union widening must land before callers await |
| T010, T011 | T006–T009 | callers can only await once the builders are async |
| T015 | T013, T014 | probes wire to `_netscan` only after it exists and is hardened |
| T016 | T014 | the resident's `fetch` must be allowlisted **before** it lands, or the exception is undeclared |
| T024–T031 | T016–T019 | the probe dials the resident |
| T032–T035 | T006, T016 | live invariants need an async lane and a real resident |
| T038 | T036, T037 | replay needs committed fixtures |
| T043–T048 | all above | polish closes over finished work |

**Independent / parallel opportunities**

- **Phase 2**: T008 ‖ T009 (different files). T013 may start while T005–T007 land.
- **Phase 6 is fully parallel with Phases 3–5** — it needs only T013–T015, not the resident. T039 ‖ T040 ‖ T041.
- **Within stories**: T022 ‖ T023 · T029 ‖ T030 ‖ T031 · T032 ‖ T033 ‖ T034 · T043 ‖ T044 ‖ T045.

**Sequential by nature**: T005 (one interface, everything keys off it) · T006–T007 (same modules'
call graph) · T036 → T037 → T038 (capture, commit, replay).

---

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (US1).** That is the point at which the kiln genuinely fires a
local model and the claim r4 rests on becomes true. Everything after it hardens and proves that claim.

**Recommended order** (matches plan.md's closing note):

1. **Phase 2 first, in full.** It is mechanical, entirely offline-testable, and gates everything. Get
   back to a green 124/124 with no Ollama before touching the resident — otherwise a later live
   failure is ambiguous between "the model" and "the refactor."
2. **Phase 3 (US1)** — the resident. Stop here and you have the MVP.
3. **Phase 4 (US2)** — the probe that proves the call happened.
4. **Phase 5 (US3)** — the invariants and the P-IV number.
5. **Phase 6 (US4)** — can be done any time after Phase 2, including in parallel by a second pass.
6. **Phase 7** — polish, the r3 record correction, and the human handback.

**Two failure modes to watch for, both introduced by this row's own change**:

- A **forgotten `await` inside a probe** turns a real check into a green one (T012 guards this; 9 of
  the ~40 call sites are in the P-V/P-VIII proofs).
- A **config throw becoming a rejected promise** silently disables the strongest-model guard
  (T007 + T011's "keep `assert.throws`" note guard this).

**Stop conditions (a line-of-defense veto halts the lane and returns it to the human)**: the offline
suite cannot be made green; `live-ready` stops working without Ollama; a canonical artifact needs
modifying beyond the one declared signature change; or the cost assertion cannot be made stable
without weakening it into vacuity.

---

## Trace

Phase 2 → NC1, FR-015, FR-015a, D1–D3, D8, A1–A6 · Phase 3 → US1, FR-001–FR-004, FR-012, FR-013,
E1, O1–O6 · Phase 4 → US2, FR-005, FR-006, SC-002, SC-003, E3, R2–R4 · Phase 5 → US3, FR-007–FR-009,
SC-004–SC-006, E4, E5, R7 · Phase 6 → US4, FR-010, FR-011, SC-007, E6, R6 · Phase 7 → FR-014,
FR-016, SC-009, SC-010.

**Task count**: 48 · **Setup** 4 · **Foundational** 11 · **US1** 8 · **US2** 8 · **US3** 7 ·
**US4** 4 · **Polish** 6.
