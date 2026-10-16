# Implementation Plan: KILN's real UI on Pi (row r9)

**Branch**: `008-kiln-pi-ui` *(no git branch created; the directory name is the identity)* | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [`specs/008-kiln-pi-ui/spec.md`](./spec.md) — **clarified 2026-09-22, UI approved 2026-09-23** (NC1 = an explicit
`KILN_HUMAN` identity, NC2 = keep `LiveUICtx`'s interface with a real body, NC3 = automated + one human terminal smoke).

## Summary

r9 wires KILN's three pure UI layers — Layer A (`renderHud`), Layer B (`renderPopup`), Layer C (`renderOverlay`/`renderGate0Face`) — to Pi's **real** `ctx.ui`,
and closes the loop r8 deliberately left open: a human's explicit choice, once r8's seam says `answered`, is now actually **applied** — `applyMove` for a
per-gate move, `recordGate0Decision` for Gate 0 — with a `decidedBy` that is a real, explicitly-set human identity, never guessed. A **presentation wrapper**
(FR-015) sits between the pure renders and what Pi actually shows, substituting human-readable gate names, human-friendly timestamps, and the approved
header wording — three fixed, tested transforms, never free-form rewriting. The renders themselves, and r1/r2's gate-application functions, stay
byte-for-byte unmodified except one declared exception: `renderOverlay`'s column-width computation (research D8), approved at the mockup review.

**Approach, in one line:** *reuse everything r1/r2/r8 already built and tested; add exactly the glue that was missing — real Pi calls in, an applied decision
out, a presentation layer in between, and nothing that duplicates a seam that already exists.* Decisions and their evidence are in [research.md](./research.md)
Part A (D1–D10); the pieces are specified in [contracts/](./contracts); the approved visual reference is [ui-mockups.md](./ui-mockups.md).

**What planning measured** (real Pi 0.85.1, hermetic RPC, no model): `registerShortcut` accepts a **bare letter** at registration with no error — correcting
the spec's stronger inference — but whether a bare key actually *fires* versus being typed as ordinary text is unmeasurable over RPC; the plan therefore picks
`alt+g`/`alt+m`/`alt+/`, each individually confirmed to register and checked by hand against Pi's **complete** documented default-binding list for zero
conflicts (research D10). The human terminal smoke test (quickstart §5) is what confirms they actually fire.

## Technical Context

**Language/Version**: TypeScript, Node `^22.18.0 || >=23.6.0`, no build step — unchanged from r8.

**Primary Dependencies**: **none added** (SC-006). Still `dependencies: {}`. No new import of Pi anywhere outside `kiln/pi/`.

**Storage**: none written by this row directly. It **causes** r1's `gate-completion`/`Wait` records via r1/r2's own unmodified functions — no new
`recordType`, no new record shape.

**Testing**: `node:test` in `kiln/tests/pi/ui/`; `UiReady` (contract `ui-ready.md`); one human terminal smoke (`quickstart.md` §5), the same NC1=B-style split
r8 used for FR-016.

**Target Platform**: macOS verified; Linux/Windows unmeasured (same standing caveat as r7/r8).

**Project Type**: additive wiring inside the existing `kiln/` toolchain; one new subdirectory (`kiln/pi/ui/`).

**Performance Goals**: no new latency-sensitive path; Layer A/B/C redraw only on a fired event (P-IX, unchanged), never a timer.

**Constraints**: P-VIII scan covers `kiln/pi/ui/` the same way it covers `kiln/pi/` (no `SCAN_DIRS` change needed — `pi` already covers the whole tree
recursively); no new network primitive; nothing changes r1/r2/r7/r8's guarantees outside the one declared exception (`renderOverlay`).

**Scale/Scope**: 4 new files in `kiln/pi/ui/` (`present.ts`, `identity.ts`, `live-ctx.ts`, plus a small `keys.ts` shortcut-registration helper), 1 new
`validate/ui-ready.ts`, 1 additive export in `kiln/contracts/move-vocabulary.ts`, 1 edited function in `kiln/ui/overlay.ts` (column widths), 3 edited
constants in `kiln/ui/keymap.ts`, ~8–10 new test files.

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 design — still passes, with the same kind of one justified addition r8 recorded (a scan-adjacent
exception, this time an r2-file edit rather than an allowlist).*

| Principle | r9's position | Verdict |
|---|---|---|
| **I. Author / Judge separation** | r9 applies a human's explicit choice via r1/r2's own unmodified `applyMove`/`recordGate0Decision` — it never invents a second "apply" path, and an unresolved identity is refused **before** either function is ever called (L2/L3). | ✅ |
| **II. Lines of defense are strongest** | Not touched — no role/model logic in this row. | ✅ n/a |
| **III. Single lane, one resident** | Not touched; r9 draws surfaces over the existing single-lane state, it does not start a second one. | ✅ |
| **IV. Affinity is the only cost lever** | Layer A surfaces the real `switches` count (unchanged computation); r9 adds no swap logic. | ✅ n/a |
| **V. Headless never silently approves** | Extends r8's seam (`interpret`, `headlessWait`) to the *applied* decision: an `answered` outcome with an unresolved identity is **still** a `WAIT`, not a decision (L3 row 2) — a strictly larger set of refusals than r8's, same direction, never weaker. | ✅ |
| **VI. Gate 0 is human-only** | The Gate-0 face offers **only** `GATE0_ADMISSION_MOVES`; `recordGate0Decision` (unmodified) already refuses a non-`human@` decider and any pre-delegation at gate0 — r9 adds no new path around either rule. | ✅ |
| **VII. Everything is recorded** | No new `recordType`; every applied decision lands in r1's existing `gate-completion` record, via r1/r2's own writers. | ✅ |
| **VIII. Local-first** | No new network primitive; `kiln/pi/ui/` is covered by the existing recursive `pi` scan entry — no `SCAN_DIRS` change needed (FR-011); no file outside `kiln/pi/` imports a Pi type. | ✅ |
| **IX. No dashboard; event-driven; no polling** | Layers A/B/C redraw only on a fired `FactoryEvent` (r1/r2's existing contract, unchanged); no gate dialog carries a `timeout` (r8's rule, unchanged — Layer B/C's questions are built the same way `kiln-selftest`'s was). | ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/008-kiln-pi-ui/
├── spec.md              # clarified 2026-09-22; UI approved 2026-09-23
├── plan.md              # this file
├── research.md          # A: decisions D1–D10 · B: the findings register SQ1–SQ6 (completed by the spike)
├── data-model.md         # E1–E7
├── ui-mockups.md         # the four approved Layer A/B/C mockups — the visual reference this plan implements
├── quickstart.md         # runnable validation, incl. the human terminal smoke (§5)
├── contracts/
│   ├── presentation-wrapper.md   # the three fixed transforms, and the invariant a test enforces
│   ├── live-ctx-seam.md          # the real LiveUICtx, the outcome table, mutual exclusion, stale-answer handling
│   └── ui-ready.md               # the automated probe, its named failures
├── checklists/requirements.md
└── tasks.md              # Phase 2 — /speckit.tasks (NOT created here)
```

### Source Code (repository root)

```text
kiln/
├── contracts/
│   └── move-vocabulary.ts   # + GATE_NAME, + gateName() — additive only; MOVE_VOCABULARY etc. unchanged
├── ui/
│   ├── overlay.ts           # rowLine's column-width computation changed (research D8) — the ONE r2 behaviour change
│   ├── keymap.ts            # LAYERB_KEY/LAYERC_KEY/TOGGLE_KEY values changed (research D10); keymapIsConsistent() unchanged
│   └── live-tui.ts          # UNCHANGED — LiveUICtx interface and attachLiveTui() stay exactly as r3 left them
├── pi/
│   └── ui/                  # NEW
│       ├── present.ts       #   presentHud/presentPopup/presentOverlay/presentGate0Face — the three fixed transforms
│       ├── identity.ts      #   resolveIdentity() — reads KILN_HUMAN, validates against the human@ shape r1/r2 already require
│       ├── keys.ts           #   registers alt+g/alt+m/alt+/ via pi.registerShortcut, dispatching to live-ctx
│       └── live-ctx.ts       #   makeLiveUICtx() — the real LiveUICtx body; the outcome table; mutual exclusion (OverlayState)
├── validate/
│   └── ui-ready.ts          # NEW — the UiReady probe (contract ui-ready.md), composes on PiReady
└── tests/
    └── pi/
        └── ui/               # NEW
            ├── present.test.ts        gate-name/timestamp/header-wording transforms, P2's diff invariant
            ├── identity.test.ts       KILN_HUMAN present/absent/malformed
            ├── keymap.test.ts         Key Format regex, pairwise distinct
            ├── live-ctx.test.ts       the outcome table (L3), mutual exclusion (L5), apply-function routing (L4)
            ├── overlay-columns.test.ts  renderOverlay's new column-width computation, several row-length fixtures
            └── ui-ready.test.ts       the probe's named failures (offline, fake-Pi-backed, mirroring pi-ready.test.ts)
```

### What changes in existing files (FR-014; parallel to r8's own table)

| File | Change | Why it is safe |
|---|---|---|
| `kiln/contracts/move-vocabulary.ts` | `+ GATE_NAME`, `+ gateName()` | purely additive; every existing export, and `MOVE_VOCABULARY`'s content, is untouched |
| `kiln/ui/overlay.ts` | `rowLine`'s spacing becomes computed, not literal | the **one** declared behaviour change to an r1/r2 file this row makes; covered by `overlay-columns.test.ts` across several row-length fixtures, and by re-running r2's own existing overlay tests unmodified |
| `kiln/ui/keymap.ts` | three constant values change | `keymapIsConsistent()`'s own invariant (pairwise distinct) still holds; nothing else in the codebase reads these constants except the new `keys.ts` |
| `kiln/index.ts` | `+` additive re-exports (`gateName`, `resolveIdentity`, `makeLiveUICtx`, `presentHud` et al., `checkUiReady`/`reportUiReady`) | same pattern as r8's own index.ts additions |

*Not touched:* `kiln/ui/live-tui.ts`, `kiln/ui/hud.ts`, `kiln/ui/popup.ts`, `kiln/ui/gate0-face.ts`, `kiln/src/gate.ts`, `kiln/pi/outcome.ts`,
`kiln/pi/port.ts`, `kiln/pi/status.ts`, `kiln/pi/selftest.ts`, `kiln/pi/index.ts`, `kiln/validate/pi-ready.ts`, `kiln/validate/_pi-driver.ts`. An "untouched
since r9 began" test (the r7/r8 CR-10 pattern) pins this list at close, the values filled in once the implementation is committed — the same deferred-pin
approach r8 used for its own `untouched.test.ts`.

## Delivery order (what `/speckit.tasks` will expand)

1. **P0 — The presentation wrapper, test-first.** `present.ts` and `GATE_NAME`/`gateName()`; P2's diff-invariant test written **before** the code. *(US1, US2, US3)*
2. **P1 — Identity.** `identity.ts`, test-first against the exact `human@` shape r1/r2 already enforce. *(US2, US3)*
3. **P2 — The keymap re-decision.** `keymap.ts`'s three values, `keymap.test.ts`'s Key Format assertion. *(US4)*
4. **P3 — `renderOverlay`'s column widths.** The one declared r2 behaviour change, with r2's own existing tests re-run unmodified plus new fixtures at
   several row-length combinations. *(US3, the mockup-approved layout)*
5. **P4 — The real `LiveUICtx` (`live-ctx.ts`).** The outcome table (L3), mutual exclusion (L5), the apply-function routing (L4) — each written test-first
   against fakes, mirroring the rigor of r8's `outcome.ts` mutation-testing. *(US2, US3, US4)*
6. **P5 — `UiReady`.** Composes on `PiReady`; the named checks (`ui-ready.md` U2). *(US2, US3, US4)*
7. **P6 — Close-out.** README, the deferred "untouched" test pin, the implementation/verification/code-review reports, **and the human terminal smoke test
   recorded done or not done** (quickstart §5) — never implied.

## Risks

| Risk | Mitigation |
|---|---|
| **A chosen shortcut doesn't actually fire in a real terminal** (only registration was measured) | the human smoke explicitly checks firing, not just registration, for all three keys; a fallback re-decision is one small, isolated change (`keymap.ts`'s three constants) if needed |
| **`renderOverlay`'s column-width change regresses r2's own delivered behaviour** | r2's existing overlay tests are re-run unmodified as a regression gate; new fixtures specifically stress varying row-description lengths |
| **A malformed `KILN_HUMAN` slips through to `applyMove`** | `resolveIdentity` is checked **before** any question is built (L2), not just before applying — mutation-tested the way r8's seam was |
| **Two overlays end up open at once** | `OverlayState` (E4) is the single source of truth for what's open; `ui-ready.md` check (f) asserts it directly |
| **SQ2/SQ4/SQ6 need a real model to fully measure and none may be available during the smoke test** | quickstart §5 step 9 explicitly allows recording "not practical to test" rather than guessing at an unmeasured result |

## Complexity Tracking

| Addition | Why it is needed | Simpler alternative rejected because |
|---|---|---|
| **`renderOverlay`'s column-width computation** (the one r1/r2 behaviour change) | The approved mockup's alignment is not achievable by a presentation-layer substitution alone — `present.ts` only replaces fixed tokens, it does not re-flow whole lines (research D2) | Re-flowing already-rendered text in `present.ts` by parsing it back into columns is more fragile than fixing the one function that builds it, for a strictly larger amount of code |
| **KILN's own `OverlayState` mutual-exclusion guard**, rather than relying on Pi's overlay stacking | `docs/tui.md`'s overlay-focus behaviour is documented but unmeasured for KILN's specific "one overlay at a time" need (SQ5); building the guard is cheap and testable offline, and remains correct regardless of what the terminal smoke eventually finds | Waiting for SQ5's terminal measurement before deciding would block the whole row on one uncertain finding, for a guard that costs little to build defensively either way |
