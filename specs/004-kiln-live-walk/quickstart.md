# Quickstart — 004-kiln-live-walk (r3) validation guide

**What this is.** A run guide that **proves the kiln fires *live*** — a **full Gates-1–9 lane over
a throwaway feature on a real, guaranteed local model** (E1/E2) — by **replaying its emitted log
through 001's `kiln/validate/log.ts`** (the dogfood) while the **fired program head** validates
through **`kiln/validate/roadmap.ts`** and `LiveModelReady` (**E5** — which **falsifies** its
`--broken`/`--broken-render`/`--broken-gate0`/*unlogged-stand-in* hooks and **zero-net** scan)
**PASSES** green. Each "Expect" maps to a success criterion. This guide is the **planning** form
(SC-001..SC-007 expected); a paired **`quickstart-run.md`** (captured at `/speckit.implement`)
records the *observed* result, like r1/r2.

**What this is NOT.** R3 **admits no program / advances no Gate 0** (P-VI/FR-010/SC-007) — the
program it *fires* is the **already-admitted** `specs/ROADMAP.md`, and r3 **re-opens** Gate 0 at the
throwaway's close. The `--stub` is a **recorded** fallback, *never* a silent stand-in. The live TUI
**degrades to its print twin** when the UI is absent (a missing surface still `WAIT`s on Gate 0).

---

## Prerequisites

- **001 + r1 + r2 delivered and on branch** (the dogfood targets): `kiln/schemas/`,
   `kiln/validate/log.ts` (+ `roadmap.ts`), `kiln/contracts/move-vocabulary.ts`,
    `kiln/src/types.ts`, **r1's** `kiln/src/{stub-resident,walk,log-writer,gate,scheduler,roles,
    clock}.ts` + `kiln/ui/{factory-state,hud,popup,twin,keymap}.ts` + `kiln/validate/runtime-ready.
    ts`, and **r2's** `kiln/ui/{overlay,gate0-face}.ts` (+ the **extended** `factory-state.ts`
    `gate0_open`/`roadmap_row_done` union and `twin.ts`) + `kiln/validate/overlay-ready.ts`.
- Node `>= 22.6` · `node --test`.
- r3's live modules, built at `/speckit.implement` per the
     [contracts/](./contracts/): `kiln/src/live-resident.ts` (E1 + the `--live`/`--stub` selector,
     E3), `kiln/src/live-walk.ts` (E2), `kiln/ui/live-tui.ts` (E4), `kiln/validate/live-ready.ts`
      (E5), and `kiln/index.ts` extended to export them.
- **A live local model is guaranteed in r3's environment (NC2)** by default; `--stub` is the
     recorded fallback for reproducibility.
- The admitted program: [specs/ROADMAP.md](../../ROADMAP.md) (`gate0.status: approved`;
    **r3 is a row in it**, `deps: [r1]`) — this guide *fires* *this* program, on the throwaway.

## Setup

```
# the r3 live path is wired into r1/r2's spine at /speckit.implement
$ ls kiln/src/live-resident.ts kiln/src/live-walk.ts kiln/ui/live-tui.ts kiln/validate/live-ready.ts
kiln/src/live-resident.ts  kiln/src/live-walk.ts  kiln/ui/live-tui.ts  kiln/validate/live-ready.ts   # all present
$ node kiln/validate/log.ts kiln/factory-log/r1-walk.jsonl        # no regression (r1 spine)
PASS
$ node kiln/validate/roadmap.ts specs/ROADMAP.md                  # the program head r3 FIRES
PASS
```

## Scenarios (each "Expect" maps to a SC)

| Scenario | Command | Expect |
|----------|---------|--------|
| **S1 (live PASSES)** | `node kiln/tests/dogfood/run.ts r3-live-walk` → `node kiln/validate/log.ts kiln/factory-log/r3-live-walk.jsonl` | PASS |
| **S2 (broken → named R3)** | `node kiln/tests/dogfood/run.ts r3-live-broken --broken` → `node kiln/validate/log.ts kiln/factory-log/r3-live-broken.jsonl` | **FAIL, named R3** |
| **S3 (`F-SINGLE` live)** | `node --test kiln/tests/lane` on the live snapshots | PASS — a forged two-running-at-once **throws** |
| **S4 (switches == `switchCount` + LoD `strongest`)** | `node --test kiln/tests/scheduler` | PASS — realized switches == `switchCount`; every LoD role on `strongest` (P-II) |
| **S5 (live TUI event-only + blocking headless Gate 0)** | `node --test kiln/tests/ui` + grep `setInterval\|setTimeout\|Server\|Socket` over `kiln/ui/*.ts` | PASS — event-only; **no timer/socket/server**; a disabled UI ⇒ `disabledUi(state).blocks === true` on an open Gate 0 (prints + `WAIT`s, never auto-advances) |
| **S6 (`F-NOT-SILENT`: `--stub` is recorded; unlogged fails)** | `node --test kiln/tests/live-ready --stub` | PASS — the `--stub` selection **appears in the log**; the *unlogged*-stand-in hook **fails `LiveModelReady`, named** |
| **S7 (`LiveModelReady` + all falsify hooks)** | `node kiln/validate/live-ready` + `--broken` + `--broken-render` + `--broken-gate0`, `--stub-unlogged` | READY, then each hook **names** its broken element; zero-network scan over `kiln/{src,ui,validate,contracts}` ⇒ **0** cloud |
| **S8 (no self-admission)** | `grep '"gate":"gate0"' kiln/factory-log/r3-live-walk.jsonl` | a **recorded human** `gate0` move only — r3 **fires** the admitted program + **re-enters** a `wait` at the seam, but emits **no program admission** (P-VI/SC-007) |

## The live-walk log (the SC-001/SC-002→SC-003 spine)

- **S1** replays the **live** full-nine-gate walk (transitions + a human `decidedBy` per gate + a
   `cost` per swap + a distinct `pre-delegation` on the tail + a `wait` at an open gate + the
   **recorded `--live`/`--stub` selection**) through 001's **unmodified** `kiln/validate/log.ts`
    → **PASS** (SC-001: "the kiln fires **live**").
- **S2** reuses r1's `run.ts --broken` vector on the **live** emit (a gate-completion with **no
   `decidedBy`**) → the log **FAILs R3, named** (SC-002/SC-003: "the net is **live**").
- r3 **advances no gate / admits no program** (P-VI/SC-007): the **program it fires** is
   `specs/ROADMAP.md` (`gate0.status: approved`, `human@batorfi`), and r3 **re-enters / `WAIT`s`
   Gate 0** at the throwaway's close — the *human's* admission record, **not** r3's. **`--stub` is
   recorded, never silent** (P-V/P-VII; the `F-NOT-SILENT` hook, SC-006).

## Out of scope for this guide (the row's boundaries)

- **No program admission / no Gate-0 advance** (Gate 0 / a later program row does that) — r3
     **re-opens** the seam, it does **not** re-vote it.
- **Live-TUI *smoke***, not a production overlay (NC1/§10 — the exact key/anchor is an `implement`
     tweak); a missing UI **degrades to the print twin + a `WAIT`** on Gate 0.
- **Cloud** — none (P-VIII); the live model is **local**, the `--stub` dependency-free, the zero-
    *network* scan green.
