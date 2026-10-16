---
description: "Task list for 008-kiln-pi-ui (r9) — KILN's real UI on Pi"
---

# Tasks: 008-kiln-pi-ui (r9)

**Input**: Design documents from `specs/008-kiln-pi-ui/`

**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) (D1–D10, findings register SQ1–SQ6) ·
[data-model.md](./data-model.md) (E1–E7) · [contracts/](./contracts/) (`presentation-wrapper` P1–P4 · `live-ctx-seam` L1–L7 · `ui-ready` U1–U4) ·
[quickstart.md](./quickstart.md) · [ui-mockups.md](./ui-mockups.md) (the approved visual reference)

**Tests**: **INCLUDED.** This row's deliverable *is* a presentation transform, an applied-decision seam, and a probe — FR-004–FR-010, FR-015, SC-002–SC-008
and the mutation requirement are test artifacts, not optional extras.
**Test-first inside every story:** the tests are written and seen to **fail** before the code that satisfies them.

**Organization**: grouped by user story (US1–US4 from spec.md). US1 (Layer A) is the smallest and goes first as a warm-up; US2/US3 (the two real decision
paths) are the row's centre and depend on the presentation wrapper and identity module both being done; US4 (the safety net) is threaded through, not a
separate phase — its acceptance scenarios are covered by tasks inside US2/US3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4; Setup / Foundational / Polish carry no story label

## Path Conventions

Single project; the toolchain lives under `kiln/` (`kiln/pi/ui/` is **new**). Node `^22.18.0 || >=23.6.0`, zero dependencies.

**Canonical / existing artifacts that MUST NOT be modified** (any diff here is a task failure — asserted by T0XX's "untouched" test):
`kiln/ui/hud.ts` · `kiln/ui/popup.ts` · `kiln/ui/gate0-face.ts` · `kiln/ui/live-tui.ts` · `kiln/src/gate.ts` · `kiln/pi/outcome.ts` · `kiln/pi/port.ts` ·
`kiln/pi/status.ts` · `kiln/pi/selftest.ts` · `kiln/pi/index.ts` · `kiln/validate/pi-ready.ts` · `kiln/validate/_pi-driver.ts` · `kiln/validate/_netscan.ts` ·
`kiln/validate/log.ts` · `kiln/validate/roadmap.ts` · `kiln/schemas/*.json` · `kiln/contracts/move-vocabulary.ts`'s `MOVE_VOCABULARY`/`GATE_TO_KEY`/existing exports.
**The only existing files r9 may change, and only as declared:** `kiln/ui/overlay.ts` (column widths, research D8 — the one behaviour change), `kiln/ui/keymap.ts`
(the three constant values, research D10), `kiln/contracts/move-vocabulary.ts` (additive `GATE_NAME`/`gateName()` only), `kiln/index.ts` (additive exports),
`kiln/package.json` (additive script), `kiln/tests/run.ts` (already has `--pi`; no change needed here).
**Two hard rules for every task:** *(1)* **nothing outside `kiln/pi/` imports a Pi type** (research/plan, unchanged from r8); *(2)* **`present.ts` never calls
`renderHud`/`renderPopup`/`renderOverlay`/`renderGate0Face`'s output anything but read-only** — it returns a new string, it never mutates state.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: record the baseline before touching anything.

- [X] T001 Record the pre-change baseline in `specs/008-kiln-pi-ui/baseline.md`: `cd kiln && npm test` counts, `npm run validate:roadmap -- ../specs/ROADMAP.md`
  = PASS, `npm run pi-ready` = READY, `pi --version` = 0.85.1 — so any later regression is attributable. (Expected starting point: 376 tests, 0 fail, per r8's
  close-out checkpoint.) **Done, with a finding**: the installed Pi is now `0.87.0`, unmeasured by `MEASURED_PI_VERSIONS` — `pi-ready` FAILs and 8
  `PI-LIVE:` tests fail with `pi-version-unmeasured`, pre-existing environment drift unrelated to r9. See `baseline.md`.
- [X] T002 [P] Confirm the three chosen shortcuts (`alt+g`, `alt+m`, `alt+/`) are still conflict-free against the **current** `docs/keybindings.md` shipped
  with the installed Pi (`~/.local/lib/node_modules/@earendil-works/pi-coding-agent/docs/keybindings.md`) — Pi is pre-1.0 and moving (r8's own lesson); if a
  newer Pi has claimed one of these three, record the conflict and re-pick before T0XX's keymap task, rather than discovering it in the human smoke.
  **Done**: no conflict against the newer (0.87.0) doc either — see `baseline.md`.

**Checkpoint**: baseline recorded; the keymap choice is reconfirmed against the actually-installed Pi.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the two pieces every user story depends on — the additive gate-name export, and the presentation wrapper itself. Both are offline-testable.

**⚠️ CRITICAL**: no user story work may begin until this phase is complete and the suite is green again.

> **Write T003–T005 first and watch them FAIL** — the code does not exist yet.

- [X] T003 [P] `kiln/tests/pi/ui/gate-name.test.ts` (research D3, data-model E1): `gateName(3) === "spec"`; `gateName("gate0") === "gate0"`; `gateName`
  covers **every** `GateId` r1 declares (`1`..`9`, `"gate0"`) with no `undefined` result; `MOVE_VOCABULARY`, `GATE_TO_KEY` and every other existing export of
  `move-vocabulary.ts` are **unchanged** (a snapshot of `Object.keys` before/after this task's own diff).
- [X] T004 [P] `kiln/tests/pi/ui/present.test.ts` (contract `presentation-wrapper.md` P1/P2/P3, FR-015): for ≥3 `FactoryState` fixtures spanning different
  gate ids and ISO timestamps, and both `gate0.status` values — `presentHud`/`presentPopup`/`presentOverlay`/`presentGate0Face` each **(a)** call the real
  `renderX` first (assert via a spy that the raw output appears as a substring before substitution, or via exact fixture math) **(b)** produce output that
  diffs from the raw render **only** at gate-name / timestamp / header-wording spans — P2's diff invariant, implemented as: tokenize both strings, assert
  every differing token is explained by one of the three transforms **(c)** `presentPopup`'s output has **no** trailing `— moves […]` clause, while the
  options passed separately to the eventual `GateQuestion` (T013) still come from the full `moveVocabulary(gate.id)` — dropping it from the header text
  must not drop it from what's actually offered **(d)** for `presentOverlay`/`presentGate0Face`, the **exact** header strings from `ui-mockups.md` appear
  verbatim. A malformed timestamp/gate-id fixture passes through **unchanged** (P4 — no throw).
- [X] T005 [P] `kiln/tests/pi/ui/identity.test.ts` (data-model E3, research D4): `KILN_HUMAN=human@batorfi` → `{ok:true, decidedBy:"human@batorfi"}`;
  unset → `{ok:false, reason: <non-empty>}`; `KILN_HUMAN=nobody` (no `human@` prefix) → `{ok:false, ...}`; `KILN_HUMAN=""` → `{ok:false, ...}`; the accepted
  shape is **exactly** `/^human@\S+$/` — the same regex `resumeByToken`/`recordGate0Decision` already enforce (cross-checked in this test by importing
  those and asserting they'd throw on the same rejected values `resolveIdentity` rejects).
- [X] T006 Implement `kiln/contracts/move-vocabulary.ts`'s additive `GATE_NAME`/`gateName()` (turns T003 green). No existing line in the file changes.
- [X] T007 Implement `kiln/pi/ui/present.ts`'s four functions and its internal formatter (turns T004 green). Imports only `move-vocabulary.ts`,
  `ui/hud.ts`, `ui/popup.ts`, `ui/overlay.ts`, `ui/gate0-face.ts` — no Pi type.
- [X] T008 Implement `kiln/pi/ui/identity.ts`'s `resolveIdentity` (turns T005 green). Pure function; no I/O beyond the passed-in env object.
- [X] T009 Full suite + `pi-ready` + `validate:roadmap` re-run; must match T001's baseline plus these new, passing tests.

**Checkpoint**: the gate-name export and the presentation wrapper exist and are proven byte-accurate; identity resolution matches r1/r2's own requirement
exactly. Nothing Pi-facing has been touched yet.

---

## Phase 3: User Story 1 — The footer shows the factory's state, live, in Pi (Priority: P1)

**Goal**: Layer A pushes `presentHud`'s output to `ctx.ui.setStatus` on a fired event only.

**Independent Test**: a fake `ctx` records `setStatus` calls; assert one call per fired event, matching `presentHud`, and zero calls with no event.

> **Write T010 first and watch it FAIL.**

- [X] T010 [US1] `kiln/tests/pi/ui/live-ctx-status.test.ts` (FR-001): `makeLiveUICtx(fakeCtx).setStatus(footer)` calls `fakeCtx.ui.notify` (or the
  headless-mode equivalent, per r8's `output.ts` pattern) with **exactly** `footer` as given (Layer A's caller is responsible for passing `presentHud`'s
  output — `setStatus` itself does not re-derive it, keeping `LiveUICtx`'s existing one-argument shape, NC2 = A); a second call with unchanged content is
  still passed through (P-IX's "redraw on the event, not on a diff" contract is r3's, unchanged — this task does not add a memoization layer that wasn't
  asked for).
- [X] T011 [US1] Implement the `setStatus` half of `kiln/pi/ui/live-ctx.ts` (turns T010 green). No `OverlayState` interaction (Layer A never opens a dialog).

**Checkpoint**: Layer A's live path exists and is tested offline. **This is the smallest possible slice of the row's promise, proven before the harder parts.**

---

## Phase 4: User Story 2 — A human answers a per-gate gate, in Pi, and it is a real decision (Priority: P1) 🎯

**Goal**: Layer B's real choice reaches `applyMove` with a resolved identity; every non-answer (including a bad identity) reaches `headlessWait` instead.

**Independent Test**: the outcome table (contract L3) driven against a fake `ctx`/`Gate`, offline, with a mutation pass proving each row is distinguishable.

> **Write T012–T015 first and watch them FAIL.**

- [X] T012 [P] [US2] `kiln/tests/pi/ui/live-ctx-outcome.test.ts` (contract `live-ctx-seam.md` L2/L3, FR-004–FR-006): the full outcome table as data, mirroring
  r8's `_seam-rows.ts` pattern — **valid move + `ok:true` identity → `applyMove` called once, with that exact `decidedBy`**; **valid move + `ok:false`
  identity → `headlessWait` called, `applyMove` NEVER called** (this is the row's one new, load-bearing refusal — give it its own named mutation-resistant
  assertion, not just a table row); every r8-measured non-answer shape (cancelled/timeout/headless/wrong-type) → `headlessWait`, regardless of identity.
  A mutation harness (`checkOutcome(fn)`, same shape as r8's `checkInterpret`) returns the row names a broken implementation fails.
- [X] T013 [P] [US2] `kiln/tests/pi/ui/live-ctx-vocabulary.test.ts` (L4, FR-002): the `GateQuestion` built for a per-gate popup has **exactly**
  `moveVocabulary(gate.id)` as its options, for every gate id 1–9 — never a hand-written list; a mutation that hard-codes one option list for all gates is
  caught by name (checking at least two DIFFERENT gate ids produce DIFFERENT option sets).
- [X] T014 [P] [US2] `kiln/tests/pi/ui/no-timeout.test.ts` (reuses r8's pattern, FR-008/P-IX carried forward): the per-gate `GateQuestion`/`askGate` call
  built here carries **no `timeout`** — static check that `live-ctx.ts`'s Layer-B path calls `askGate` (r8's, imported) rather than constructing its own
  `select` call with extra arguments.
- [X] T015 [P] [US2] `kiln/tests/pi/ui/overlay-component.test.ts` (research D5, "a NEW overlay component"): the Layer-B overlay factory returns a component
  implementing `handleInput` that (a) navigates the option list on up/down (b) calls `done(optionOrUndefined)` on Enter/Esc, mirroring Pi's own
  `overlay-test.ts` pattern — **this is r8's F-1 lesson, applied on the first try this time**: a fake harness (mirroring `selftest.test.ts`'s
  `fakeCtxWithRealOverlayContract`) proves the component ALWAYS calls `done` for Enter/Esc, never hangs, **before any real-Pi check is attempted**.
- [X] T016 [US2] Implement the Layer-B half of `kiln/pi/ui/live-ctx.ts`: `raiseOverlay("B", ...)` — identity check first (L2), the overlay component (turns
  T015 green), `askGate`/`interpret` (r8, imported), the outcome table (turns T012 green), `moveVocabulary`-driven options (turns T013 green). Imports r8's
  `askGate`/`interpret`/`headlessWait`(`r1`) — no re-implementation.
- [X] T017 [US2] **Mutation pass** (recorded in the implementation report): break the outcome table five ways — swap the identity check to run AFTER
  `applyMove`; drop the identity check entirely; map a non-offered string to `applyMove` anyway; call `applyMove` twice for one answer; omit the `decidedBy`
  argument — confirm T012's harness catches each **by name**; restore; suite green.

**Checkpoint**: Layer B is real, tested, mutation-proof, and offline. A human's cancelled or unidentified answer can never reach `applyMove`.

---

## Phase 5: User Story 3 — A human acts at Gate 0, on the distinct face (Priority: P1) 🎯

**Goal**: the Gate-0 face offers only the admission moves, routes to `recordGate0Decision`, and is structurally unreachable from Layer B's code path.

**Independent Test**: the same outcome-table pattern as US2, targeted at `recordGate0Decision`; a disjointness test that inspects both call sites statically.

> **Write T018–T020 first and watch them FAIL.**

- [X] T018 [P] [US3] `kiln/tests/pi/ui/gate0-outcome.test.ts` (L3/L4, FR-003/FR-006): the Gate-0 face's `GateQuestion` options are **exactly**
  `GATE0_ADMISSION_MOVES` (`["approve","revise","reject"]`) — **never** the full `moveVocabulary("gate0")` (which also has `edit-rows`/`add-row`/`drop-row`);
  an `answered` outcome with `ok:true` identity calls `recordGate0Decision`, **never** `applyMove`; `ok:false` or any non-answer calls `headlessWait`, never
  `recordGate0Decision`.
- [X] T019 [P] [US3] `kiln/tests/pi/ui/gate0-disjointness.test.ts` (FR-003, "structurally unreachable" per contract L4): a **static** check —
  `kiln/pi/ui/live-ctx.ts`'s Layer-B code path (the function/branch handling `raiseOverlay("B", ...)`) contains no call to `recordGate0Decision`; its Layer-C
  Gate-0-face path contains no call to `applyMove`. Grep-based, mirroring r7/r8's own static-purity tests — not merely "the tests I wrote happen to pass."
- [X] T020 [P] [US3] `kiln/tests/pi/ui/gate0-plain-table.test.ts` (L4, "the plain table" branch): when `gate0.status !== "pending"`, `raiseOverlay("C", ...)`
  builds **no** `GateQuestion` at all (no call to `askGate`/`interpret`) — only `presentOverlay`'s content is shown; the overlay's own dismiss (Enter/Esc)
  still closes it (reuses T015's component-level `handleInput` contract for a non-interactive content mode).
- [X] T021 [US3] Implement the Layer-C half of `kiln/pi/ui/live-ctx.ts`: `raiseOverlay("C", ...)` — branches on `gate0.status` (turns T020 green), the
  Gate-0-face outcome path (turns T018 green), calling `recordGate0Decision` (r2, imported, unmodified).
- [X] T022 [US3] **Mutation pass**: break the disjointness — route a Layer-B answer to `recordGate0Decision`, or a Gate-0 answer to `applyMove` — confirm
  T019 (the static check) AND T018 (the outcome test) both catch it; restore; suite green.

**Checkpoint**: Gate 0's admission decision is real, and provably cannot be confused with a per-gate decision.

---

## Phase 6: User Story 4 — Mutual exclusion, stale answers, and the keymap (Priority: P1)

**Goal**: at most one overlay is ever pending; a late answer cannot misapply; the raise/dismiss keys are real, conflict-free bindings.

**Independent Test**: open B then C without closing B; assert B closed automatically. Re-derive the keymap's Key-Format validity offline.

> **Write T023–T025 first and watch them FAIL.**

- [X] T023 [P] [US4] `kiln/tests/pi/ui/mutual-exclusion.test.ts` (contract L5, data-model E4, FR-008): `raiseOverlay("B", ...)` then, before it resolves,
  `raiseOverlay("C", ...)` — assert the B `custom()` call's pending promise is resolved with `no-answer` (never a move) and `OverlayState.layer` becomes
  `"C"`; the reverse order also closes the first correctly. A fired `FactoryEvent` while one overlay is pending updates that SAME overlay in place — it does
  not open a second one (contract L4a, FR-009): assert no second `custom()`-equivalent call is recorded.
- [X] T024 [P] [US4] `kiln/tests/pi/ui/keymap.test.ts` (data-model E7, research D10, FR-007): `LAYERB_KEY`/`LAYERC_KEY`/`TOGGLE_KEY` each match
  `^(ctrl\+|alt\+|shift\+|super\+)+[a-z0-9/]+$` (a real modifier+key shape — no bare letter/symbol remains); `keymapIsConsistent()` still returns `true`;
  none of the three equals any entry in a **committed, dated snapshot** of Pi's default-binding list (`docs/keybindings.md`, copied verbatim into the test
  fixture at T002's re-confirmation date) — so a future Pi update changing its own defaults doesn't silently invalidate this test without a visible diff.
- [X] T025 [US4] Implement `kiln/pi/ui/keys.ts` (registers `alt+g`/`alt+m`/`alt+/` via `pi.registerShortcut`, dispatching to `live-ctx.ts`'s
  raise/dismiss calls) and apply `kiln/ui/keymap.ts`'s three constant changes (turns T024 green).

**Checkpoint**: the safety net (mutual exclusion, event-during-dialog, the keymap) is complete and offline-tested. All of US1–US4's acceptance scenarios now
have a corresponding, passing test.

---

## Phase 7: `UiReady` — the automated half of NC3

**Goal**: a real, hermetic Pi proves the whole chain end-to-end; each named failure is distinguishable.

**Independent Test**: `npm run ui-ready` → READY; each hook fails with exactly its own code.

> **Write T026 first and watch it FAIL** (needs real Pi — gated by `_pi-gate.ts`, reused from r8).

- [X] T026 `kiln/tests/pi/ui/ui-ready.test.ts` (contract `ui-ready.md` U2, U3): named `PI-LIVE: …` per r8's convention; against real Pi, hermetically —
  check (a) presentation applied on `setStatus`; (b) a valid move + valid `KILN_HUMAN` → exactly one real `applyMove` effect (observable via a fixture gate's
  state); (c) the same with `KILN_HUMAN` unset → **no** apply, `headlessWait` instead (`non-answer-approved` if this fails — the check that matters most,
  same naming convention as r8); (d) Gate-0 question never offers the edit-rows/add-row/drop-row moves; (e) options match `moveVocabulary` exactly; (f)
  opening B then C leaves only one `custom()` pending; (h) the three keymap constants pass the Key-Format check via a live Pi round trip (registration only —
  firing is the human smoke's job, not this probe's, per U3).
- [X] T027 Implement `kiln/validate/ui-ready.ts` (turns T026 green) — composes on `PiReady`'s driver (`_pi-driver.ts`, imported, unmodified); each check named
  per U2; hooks per failure mode, mirroring `pi-ready.ts`'s CLI pattern. Add `"ui-ready": "node validate/ui-ready.ts"` to `kiln/package.json`.
- [X] T028 **Checkpoint gate**: `npm run ui-ready` → READY; each of U2's failure-mode hooks (as `pi-ready.ts`'s were) fails with exactly its named code, never
  a pass, never a hang (reuses `_pi-driver.ts`'s deadline — no new timeout logic needed, per plan's "what changes" table).

**Checkpoint**: NC3's automated half is complete. Only the human terminal smoke remains.

---

## Phase 8: `renderOverlay`'s column widths (research D8 — the one r1/r2 behaviour change)

**Goal**: `renderOverlay`'s rows align by computed column width, matching the approved mockup, with r2's own existing tests still green.

**Independent Test**: several fixtures at deliberately different row-description lengths; r2's pre-existing overlay tests re-run unmodified.

> **Write T029 first and watch it FAIL against the CURRENT (hand-spaced) `renderOverlay`.**

- [X] T029 [P] `kiln/tests/pi/ui/overlay-columns.test.ts`: for ≥3 fixtures with varying `short` field lengths (including the exact `ui-mockups.md` fixture),
  every row's `[deps: …]` column starts at the **same** character offset, and every row's tail (`→ @PR#N` / `eligible` / `→ at <gate> — HERE`) starts at the
  same offset too — computed from the actual row set, not a fixed guess. A one-row roadmap (no alignment needed) still renders correctly.
- [X] T030 Implement `renderOverlay`'s `rowLine` column-width computation (research D8) — the **declared** exception to "r1/r2 unmodified." Run r2's own
  existing `kiln/tests/**/overlay*.test.ts` (unmodified) alongside T029; both must be green.

**Checkpoint**: the plain-table mockup's alignment is now genuinely achievable, and nothing r2 delivered regressed.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: wire the public surface, keep the docs honest, prove nothing existing moved except the one declared exception, hand the row back.

- [X] T031 [P] Additive re-exports in `kiln/index.ts`: `gateName`, `resolveIdentity`, `makeLiveUICtx`, `presentHud`/`presentPopup`/`presentOverlay`/
  `presentGate0Face`, `checkUiReady`/`reportUiReady`. `kiln/pi/ui/*` internals stay behind these named exports, not re-exported wholesale. A test extends
  r8's `index-exports.test.ts` pattern: the pre-r9 export count is pinned, and exactly these new names are the only addition.
- [X] T032 [P] `README.md`: mention `KILN_HUMAN` as a required env var for answering a gate in Pi, and `npm run ui-ready`.
- [X] T033 `kiln/pi/README.md` (the layout note): add r9's actual homes (`kiln/pi/ui/*`) to the table r8 left as a projection, confirming r10/r11's
  projected homes still don't collide with anything r9 created.
- [X] T034 `kiln/tests/pi/ui/untouched.test.ts` — the r7/r8 CR-10 pattern: pin `BASE..CLOSE` at r9's own close-out commit range; assert no file in the
  "MUST NOT be modified" list changed, **and** assert `kiln/ui/overlay.ts` DID change (the declared exception is checked for, not just excluded) — skip with
  a printed reason if the history is unavailable.
- [X] T035 Full validation: `npm test`, `npm run ui-ready`, `npm run pi-ready` (still green — nothing r8 built regressed), `runtime-ready`, `overlay-ready`,
  `live-ready`, `ollama-ready`, `validate:roadmap`. Record every count against T001.
- [X] T036 Write `specs/008-kiln-pi-ui/implementation-report.md` (r7/r8's shape): what was built, deviations from the plan, the mutation results (T017, T022),
  the completed findings register, and whether the keymap firing question (SQ1) or any other **T**-marked item surfaced anything during implementation.
- [X] T037 Write `specs/008-kiln-pi-ui/verification-report.md`: an end-to-end run of `quickstart.md` §1–§4, and **§5's human terminal smoke as a required
  field** (done/not done, name, date, Pi version, terminal, what was seen at each of the ten steps — especially whether `alt+g`/`alt+m`/`alt+/` actually
  **fired** — and anything odd). **Left for the human to fill; never filled or implied by the implementer.** State plainly what remains unverified: Linux,
  Windows, Pi ≠ 0.85.1, SQ2/SQ4/SQ6 if the smoke test couldn't reach a real model.
- [X] T038 Run a full code review and write `specs/008-kiln-pi-ui/code-review-report.md` — particular attention to the identity check's ordering (must run
  BEFORE any move is applied, not just before the gate opens), the mutual-exclusion guard's edge cases, and whether `renderOverlay`'s column-width change
  could regress a fixture r2's own tests didn't happen to cover.
- [X] T039 Fix the review's confirmed findings **test-first**, recording decisions taken and any left open with a reason.
- [X] T040 **Hand back to the human — do not close the row.** Per P-VI the director does not edit `specs/ROADMAP.md`: report that r9's lane is complete
  *except* the terminal smoke (if unrecorded), and list the human's moves — record the smoke, close r9 at the Gate-0 seam, add the row's `spec` pointer, and
  re-admit r10. The row stays `queued` until then.

---

## Dependencies & Execution Order

**Phase dependencies**: Setup → Foundational → **US1 ‖ (US2 needs Foundational only, not US1)** → US2 and US3 can run in parallel once Foundational is done
(they touch disjoint branches of the same file, `live-ctx.ts` — coordinate by writing US2's tests/implementation first, since US3 reuses the same overlay
component pattern T015 establishes) → US4 (needs US2 and US3's `raiseOverlay` branches to exist, to test them interacting) → Phase 7 (`UiReady`, needs
US1–US4 complete) → Phase 8 (`renderOverlay` columns — independent of everything else; could run any time after Setup) → Polish.

**Hard dependencies**

| Task(s) | Depends on | Why |
|---|---|---|
| T004, T005 | — | written first, fail against nonexistent code |
| T007 | T003, T006 | the wrapper needs the gate-name export to exist |
| T012–T022 | T007, T008 | the seam needs the presentation wrapper and identity resolved first |
| T015 | — | the overlay component's closability is proven BEFORE it's wired into the outcome table (r8's F-1 lesson, applied proactively) |
| T016 | T012, T013, T014, T015 | tests first |
| T021 | T018, T019, T020 | tests first |
| T023 | T016, T021 | mutual exclusion needs both raise paths to exist to test their interaction |
| T026 | T011, T016, T021, T025, T027 | the live probe needs the whole chain built |
| T030 | T029 | tests first |
| T034 | all code tasks | `CLOSE` is the last implementation commit |

**Parallel opportunities**

- **Phase 2**: T003 ‖ T004 ‖ T005.
- **Phase 4 and Phase 5 run in parallel** once Phase 2 is done (US2 and US3 touch the same file but different functions — write tests in parallel, serialize
  only the actual `live-ctx.ts` edits).
- **Within US2**: T012 ‖ T013 ‖ T014 ‖ T015. **Within US3**: T018 ‖ T019 ‖ T020. **Within US4**: T023 ‖ T024.
- **Phase 8 is fully parallel with Phases 3–7** — it touches only `kiln/ui/overlay.ts` and its own test file.
- **Polish**: T031 ‖ T032 ‖ T033.

**Sequential by nature**: T006 → T007 (the export before the wrapper that uses it) · T016 → T017 (build before mutate) · T021 → T022 · T025 → T026 (the
probe needs real bindings, not just the tests for them) · T027 → T028.

---

## Implementation Strategy

**MVP = Setup + Foundational + US1 + US2.** That is the point at which a human can answer a real gate in Pi and have it become a real, logged decision — the
row's central promise — even before Gate 0's own face or the safety-net polish is done.

**Recommended order**

1. **Phase 2 in full** — small, offline, and both later stories depend on it.
2. **US1** — the smallest slice, proves the live-push pattern works at all before the harder overlay work.
3. **US2** — the row's centre; get a per-gate decision genuinely applied before touching Gate 0's own, more consequential, face.
4. **US3** — reuses US2's overlay-component pattern (T015); should be faster once that pattern exists.
5. **US4** — the cross-cutting safety net, now that both raise paths exist to test against each other.
6. **Phase 7 (`UiReady`)** — proves the whole chain against real Pi.
7. **Phase 8 (`renderOverlay` columns)** — can be done any time after Setup, including in parallel by a second pass; sequenced last here only because it's
   independent of everything else, not because it's less important.
8. **Phase 9** — polish, the reports, and the human handback — **including the ten-step terminal smoke, the one thing this whole plan cannot do for itself.**

**Two failure modes to watch for, both directly inherited from r8's own lessons**

- **An overlay component that cannot close.** T015 exists *specifically* to catch this before it ever reaches a human's terminal — r8's F-1 was found live
  because no offline test checked `handleInput` existed at all; this row writes that check first, for both overlay components, before any real-Pi step.
- **A "valid move, no identity" answer slipping through.** T012's outcome table gives this its own named, mutation-resistant row — a check that only tests
  the "everything is fine" path would miss this exact class of bug, the same way earlier `PiReady` work found a check that only ever asserted `answered`.

**Stop conditions**: a canonical r1/r2/r7/r8 artifact needs modifying beyond `renderOverlay`'s declared exception; the outcome table cannot be made to fail a
mutant by name; a chosen shortcut turns out to already be bound in the actually-installed Pi (T002 should catch this before any implementation work); or the
human smoke shows a bare-key firing assumption was wrong in a way that needs more than a constant-value fix.

---

## Trace

Phase 2 → FR-011, FR-014, FR-015, SC-008 · Phase 3 → **US1**, FR-001, FR-012(the `setStatus` half of `makeLiveUICtx`), SC-001 · Phase 4 → **US2**, FR-002,
FR-004, FR-005, FR-006, FR-008(partial), FR-009(partial), FR-010(design), FR-012(the Layer-B half), SC-002, SC-004 ·
Phase 5 → **US3**, FR-003, FR-006, FR-012(the Layer-C half), SC-003 · Phase 6 → **US4**, FR-007, FR-008, FR-009, FR-010, SC-004, SC-005 ·
Phase 7 → FR-013(automated half), SC-002, SC-003, SC-004 · Phase 8 → the mockup-review alignment item (research D8), SC-001 ·
Phase 9 → FR-013(human half), FR-014, SC-006, SC-007.

**Task count**: **40** · **Setup** 2 · **Foundational** 7 · **US1** 2 · **US2** 6 · **US3** 5 · **US4** 3 · **UiReady** 3 · **Overlay columns** 2 · **Polish** 10.
