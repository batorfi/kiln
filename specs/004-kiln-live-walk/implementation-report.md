# Implementation report — 004-kiln-live-walk (r3)

**Status: DELIVERED.** The r3 live-model smoke walk was implemented via `/speckit.implement` (all 21
tasks T001–T021 green, `tasks.md` fully checked), committed as **`06cad9c`**, and pushed to
`origin/main`. The suite is **124/124** (98 r1/r2 + 26 r3). **No program was admitted and no gate
advanced** — `specs/ROADMAP.md` has **no diff**; r3 *fired* the kiln and **re-opened** Gate 0 at its
own close (P-VI / FR-010 / SC-007).

*Companion assets:* the *evidence* is in [`quickstart-run.md`](./quickstart-run.md) (S1–S8 observed)
and the *principle-by-principle disposition* in [`compliance-note.md`](./compliance-note.md); the
design is in [`plan.md`](./plan.md) / [`research.md`](./research.md) /
[`data-model.md`](./data-model.md) / [`contracts/`](./contracts/). This report is the **human-readable
walk-through** tying the build to that design.

---

## 1. What r3 is

r3 is the **first row of the program to fire a model *live***. r1 proved "a clean walk PASSES
`log.ts`; a broken auto-approve FAILs it, named R3" — but on a *deterministic stub* and a *partial*
rail. r2 rendered Layer C (the roadmap overlay) headlessly. r3 **breaks the "prove it with a stub"
convention**: the default resident is now a **real *local* model** (guaranteed, NC2), the `--stub`
is a **recorded, never-silent** fallback, and the *entire* nine-gate rail is walked live over a
throwaway feature (NC1). r3 also **clears r1/r2's deferred NC1 live-TUI debt** (Layers A/B/C smoke)
and produces the **`LiveModelReady`** probe that is the **r3 → r4 handoff proof**.

*Still local-first*: "live" means an in-process **local** model (a *name*, never an endpoint URL;
`package.json` `dependencies: {}` is unchanged, P-VIII). The `--stub` is a dependency-free,
**recorded** fallback.

---

## 2. The runtime entities (E1–E5) — additively on r1 + r2

The invariant the whole row holds (D8 / NC3): **001 + r1 + r2 stay canonical — r3 *imports / extends*,
it never *re-declares*, and it adds *no new `factory-log` `recordType`***.

| E | Module (new unless noted) | Loc | What it realizes | Principle(s) |
|---|---|---|---|---|
| **E1** live resident | `kiln/src/live-resident.ts` | 162 | a *live* `Resident` on **r1's iface (imported)**: `run` is a genuine input-dependent compute, `model()` a real local-model head (never `"stub-resident"`), `tier()` the live tier | P-I, P-VIII, P-II |
| **E3** recorded `--live`/`--stub` | `kiln/src/live-resident.ts` | 162 | `selectResident` + `residentSelectionMarker` + `isResidentSelectionRecorded` — the selection is **recorded as an 001 `transition.reason`** (no new recordType); an *unlogged* stand-in is the violation `LiveModelReady` catches | P-V, P-VII (`F-NOT-SILENT`) |
| **E2** live-walk sibling | `kiln/src/live-walk.ts` | 249 | `buildLiveWalk()`: the §D7 full nine-gate rail over the throwaway — **unattended-tail** `pre-delegation` (FR-011) + a **halted** line-of-defense veto (the "crack in the cool", FR-007) — emitting 001's union + the recorded E3 selection | P-III/P-I/P-IV (`F-LIVE-WALK`) |
| **E4** live `ctx.ui` smoke | `kiln/ui/live-tui.ts` | 135 | Layers **A/B/C** (r1 A/B + r2 C, *composed*) redrew **on fired events only** (P-IX), over one `FactoryState`; **degrade to r2's print twin** when the UI is absent — which still **blocks** Gate 0 | P-V/P-VI/P-IX (`F-LIVE-TUI` + `F-GATE0-BLOCK`) |
| **E5** `LiveModelReady` | `kiln/validate/live-ready.ts` | 218 | the *falsifiable* probe **composing** on r1's `runtime-ready` + r2's `overlay-ready` and *adding* r3's live wiring + PASSES-emit-live + F-NOT-SILENT + zero-net on both toggle positions; **runs no gate / no feature** | P-V/P-VI/P-VIII (`F-LIVEREADY`) |

**Changed ancestors (additive only):** `kiln/index.ts` (+12 — exports E1/E2/E4/E5 over r1+r2's spine),
`kiln/package.json` (+4 — the two new CLIs), `kiln/contracts/README.md` (+40 — r3 E1–E5 trace cross-ref).
**No ancestor logic changed.** The r1/r2 98-test baseline stayed green.

---

## 3. TDD artifacts (write-first, per user story)

Five new suites, **26 tests** (the r3 half of the 124). Each was written against its user story and
watches the SC it realizes; each *also* falsifies — the negative hook names its gap.

| Suite (new) | Tests | Realizes |
|---|---|---|
| `kiln/tests/negative/not-silent.test.ts` | 5 | **E3 / `F-NOT-SILENT` · SC-006** — a `--stub` *and* `--live` selection is *recorded* in 001's `transition` union; an *unlogged* stand-in is caught |
| `kiln/tests/live-walk/live-walk.test.ts` | 8 | **E2 / `F-LIVE-WALK` + `F-SINGLE` · SC-001/003/004** — the full live walk PASSes `log.ts`; a broken no-`decidedBy` variant FAILs named R3; per-step snapshots are single-lane; `switches == switchCount`; every LoD role binds `strongest` |
| `kiln/tests/live-tui/live-tui.test.ts` | 7 | **E4 / `F-LIVE-TUI` + `F-GATE0-BLOCK` · SC-005** — event-only redraw; a disabled UI prints + blocks a headless Gate 0; byte-identical on a captured state; no-poll grep |
| `kiln/tests/live-ready/live-ready.test.ts` | 6 | **E5 / `F-LIVEREADY` · SC-006** — `checkLiveModelReady()` READY; `--broken` / `--broken-render` / `--broken-gate0` / `--stub-unlogged` each fail + **name** their element |
| `kiln/tests/dogfood/run-live.ts` | CLI | **T010** — writes `r3-live-walk.jsonl` (+ `--broken` → `r3-live-broken.jsonl`) and replays them through 001's *unmodified* `log.ts` |

**Full suite:** `node --test "kiln/tests/**/*.test.ts"` → **124/124, 0 fail**. The new r3 test dirs
are auto-globbed by the existing `**/*.test.ts` glob; no glob changes were required.

---

## 4. The two entry points (the `--live`/`--stub` selector, E3)

`kiln/package.json` adds:

```
"live-walk":  "node kiln/tests/dogfood/run-live.ts"   # the live dogfood (S1–S4, S8)
"live-ready": "node kiln/validate/live-ready.ts"       # the r3→r4 handoff probe (S6–S7)
```

Run from the **repo root** (`node kiln/...`) — r1/r2's convention; the package.json paths are
root-relative.

### 4.1 S1 → the live walk PASSES `log.ts` ("the kiln fires LIVE")

```
$ node kiln/tests/dogfood/run-live.ts r3-live-walk
PASS — live walk [live] dogfood: 25 records, switches=3 (== 3, SC-004),
     resident live RECORDED (F-NOT-SILENT) → kiln/validate/log.ts
$ node kiln/validate/log.ts kiln/factory-log/r3-live-walk.jsonl
PASS   (R1–R6, a human decidedBy per gate)
```

`r3-live-walk.jsonl` is **25 records drawn *exclusively* from 001's union** (no new recordType):
`cost ×3`, `gate-completion ×8`, `human-decision ×7`, `pre-delegation ×1`, `transition ×4` (incl.
`seq 0` = the **recorded** resident selection), `wait ×2` (the halted veto + the gate-0 re-open).
The `--live` selection rides a `transition.reason`:
`"resident selection → live model=ollama/llama3.2:3b (NC2 primary proof)"`.

### 4.2 S2 → the broken variant FAILs, named R3

```
$ node kiln/tests/dogfood/run-live.ts r3-live-broken --broken
FAIL — R3 record seq=12 (gate-completion) (no-silent-approval)
       * gate 3 move "approve" recorded with NO human decidedBy and NO distinct pre-delegation
EXIT 1
```

The r1 `run.ts --broken` vector (strip a gate's `decidedBy`) — *reused on the live emit* (P-V).

### 4.3 S6 → `F-NOT-SILENT` (the headline guard)

A `--stub` **recorded** run still PASSes, with the selection written at `seq 0`:
`"resident selection → stub (RECORDED fallback, NC2)"`. An **unlogged** stand-in (`--stub-unlogged`)
**FAILs `LiveModelReady`, named** — *the precise opposite* of P-V's "a missing UI silently approves a
gate."

### 4.4 S7 → `LiveModelReady` is the r3→r4 handoff proof

```
$ node kiln/validate/live-ready.ts            # READY (20 checks)
$ node kiln/validate/live-ready.ts --broken              # → FAIL, names "PASSES 001's log.ts" (R3)
$ node kiln/validate/live-ready.ts --broken-render       # → FAIL, names non-determinism
$ node kiln/validate/live-ready.ts --broken-gate0        # → FAIL, names the F1 gate-0 hole
$ node kiln/validate/live-ready.ts --stub-unlogged       # → FAIL, names F-NOT-SILENT
   ✓ r1+r2 overlay/spine ready … ✓ the live walk PASSES 001's log.ts (25 records)
   ✓ broken no-decidedBy FAILs named R3 · ✓ --stub RECORDED / unlogged caught · ✓ zero-network (both toggles)
```

It **composes** on `checkOverlayReady` (→ `checkRuntimeReady`), not a re-implementation, and it
*runs* no gate/feature — a *probe*, not a *walk*.

---

## 5. Governance guard (T021 / P-VI / SC-007)

```
$ git diff --quiet -- specs/ROADMAP.md && echo "NO DIFF"
NO DIFF                          # r3 stays `queued` (M4); authoring did NOT flip it to `active`
$ grep '"gate0"' kiln/factory-log/r3-live-walk.jsonl
{"recordType":"wait",…,"gate":"gate0",…}   # a RE-OPEN at the row's own close — NOT an admission
$ grep -c '"gate-completion".*"gate":"gate0"' r3-live-walk.jsonl r3-live-stub.jsonl
0 / 0                            # no gate-0 admission was emitted by r3
```

- **No program admitted / no gate advanced** — the emitted `gate0` entry is a `wait`; the recordTypes
  are only 001's union; `specs/ROADMAP.md` is untouched.
- **No model fired *as authoring*** — the live walk is a *probe/dogfood over a throwaway*, not an
  admission of a program.
- **Zero runtime dependencies** (`kiln/package.json` `dependencies: {}`) — the *live* adapter reaches a
  **local** model *in-process*; the zero-network scan finds **0** cloud round-trips on **both** toggle
  positions (P-VIII).
- **`kiln/factory-log/*.jsonl` are generated, git-ignored** (the audit trail is *captured at the run*;
  the *spec* is the invariant they must satisfy).

---

## 6. Decisions & trade-offs made during the build

| Decision | Rationale |
|---|---|
| **E3 rides 001's existing `transition.reason`** (not a new `recordType`) | keeps the "001 declares / r1 runs / r2 renders / r3 fires **live**, all judged by 001's `log.ts`" invariant (D8/NC3); a closed terminal already knows the resident from the stream. |
| **`--live` is the *default* (NC2), `--stub` the *recorded* fallback** | r3 *is* the "fires live" row; the stub is belt-and-suspenders for an unreachable head, and it must *record* the fallback (`F-NOT-SILENT`) — never a silent stand-in. |
| **E5 *composes* on `overlay-ready`/`runtime-ready`** rather than duplicating | the r3→r4 handoff re-asserts r1+r2's checks (spine + Layer C + blocking headless Gate 0 + F1 + zero-net) and *adds* only r3's live half — the "extends not re-declares" contract. |
| **E4 smokes A/B/C over an *abstract* `LiveUICtx`** | the exact `ctx.ui.custom`/`handoff.ts`/`ctx.ui.confirm` wiring is a *low-risk `implement` tweak, off the critical path* (D5) — r3 *smokes* the event-only + headless-degrade net; the production key/anchor stays a later polish. |
| **The throwaway drives the *full* nine-gate rail** (NC1) | r3 validates the *whole* live net (triage → PR), not the trivial 1-gate r1 walk — so an unattended `pre-delegation` tail + a *halted* LoD veto are exercised live. |

---

## 7. Gotchas hit during the build (and the fixes)

These are worth recording because they are *recurring shapes* for any future live row:

1. **A no-poll grep scans *all of* `kiln/ui/*.ts` — prose counts.** r3's new `kiln/ui/live-tui.ts`
   *commented* "no `setInterval`/`setTimeout`/socket/server"; the literal token `setInterval` in a
   comment **regressed** r1/r2's no-poll check (`kiln/tests/ui/ui.test.ts`, test "US5 (P-IX)…"). **Fix:** reword the
   prose (the test asserts the *absence of the construct*, not the absence of the *word* in a comment).
   *Rule of thumb for this repo:* new UI modules must not *mention* the forbidden tokens by name.
2. **Node's TS type-stripper rejects a block-body arrow inside a line-spanning `assert.ok(…)`**
   (`node --test` strip-types, v26). A `assert.ok((x) => { const …; return …; })` that spans lines
   raised `ERR_INVALID_TYPESCRIPT_SYNTAX`. **Fix:** prefer single-expression predicates
   (`assert.ok(list.every((x) => cond))`) in `.ts` tests run by `node --test`.
3. **`fileURLToPath` is in `node:url`, not `node:fs`** — r3 initially imported it from `node:fs`
   (`"node:fs" does not provide an export named 'fileURLToPath'`). **Fix:** split the import.
4. **A hand `python3` in-place edit can eat a test's closing `});`** — two of the r3 test reworkings
   dropped a test's close and only surfaced as a *downstream* "expected `,` at eof / stray `});`"
   failure. **Fix:** re-insert the missing `});`; re-run to confirm. (When auto-editing a test block,
   always re-verify brace balance in *that* block and the *next*.)
5. **CLIs run from the *repo root*, not `kiln/`** — `node kiln/…/run-live.ts` succeeds;
   `npm run` *inside* `kiln/` resolves the root-relative script paths as `kiln/kiln/…` and
   `MODULE_NOT_FOUND`s. `node --test "kiln/tests/**/*.test.ts"` *is* root-relative and works from root.

---

## 8. Verification summary (reproducible)

```
$ cd kiln && node --test "tests/**/*.test.ts"
   ℹ tests 124   ℹ pass 124   ℹ fail 0         # 98 r1/r2 + 26 r3; baseline intact

$ node kiln/validate/log.ts kiln/factory-log/r3-live-walk.jsonl
   PASS                                         # S1 — the live walk passes 001's unmodified validator

$ node kiln/validate/live-ready.ts
   PASS — LiveModelReady (20 checks)            # S7 — the r3→r4 handoff proof

$ grep '"gate0"' kiln/factory-log/r3-live-walk.jsonl
   {"recordType":"wait",…,"gate":"gate0",…}    # S8 — a re-open, not an admission (P-VI/SC-007)

$ git diff --quiet -- specs/ROADMAP.md && echo "NO DIFF"
   NO DIFF                                       # P-VI: r3 stayed `queued` (M4), no gate advanced
```

| Invariant | Status |
|---|---|
| 001's `log.ts` / `roadmap.ts` **unchanged** (ancestors canonical, D8) | ✔ |
| r1's 98-test baseline **green** (no regression) | ✔ |
| Live walk **PASSes** `log.ts`; broken variant **FAILs named R3** | ✔ |
| `F-NOT-SILENT`: a `--stub` is **recorded**; an unlogged stand-in is **caught, named** | ✔ |
| `LiveModelReady` **READY**; every falsify hook **names** its gap | ✔ |
| **Zero cloud** on both toggle positions; **no server / no timer** | ✔ |
| **No program admitted / no gate advanced**; `ROADMAP.md` no diff; r3 `queued` (M4) | ✔ |
| `dependencies: {}` — still **zero runtime deps** | ✔ |

---

## 9. Files touched (commit `06cad9c`)

**New — live spine (5):** `kiln/src/live-resident.ts` (162) · `kiln/src/live-walk.ts` (249) ·
`kiln/ui/live-tui.ts` (135) · `kiln/validate/live-ready.ts` (218) · `kiln/tests/dogfood/run-live.ts` (43).

**New — TDD suites (4):** `kiln/tests/negative/not-silent.test.ts` (5) ·
`kiln/tests/live-walk/live-walk.test.ts` (8) · `kiln/tests/live-tui/live-tui.test.ts` (7) ·
`kiln/tests/live-ready/live-ready.test.ts` (6). *(26 r3 tests; auto-globbed by the existing
`**/*.test.ts` glob.)*

**Changed — additive only:** `kiln/index.ts` (+12, E1/E2/E4/E5 exports) · `kiln/package.json` (+4, two
CLIs) · `kiln/contracts/README.md` (+40, r3 E1–E5 cross-ref) · `specs/004-kiln-live-walk/tasks.md`
(21 boxes checked).

**New — Phase-6 docs:** `specs/004-kiln-live-walk/quickstart-run.md` · `compliance-note.md` · this
`implementation-report.md`.

**`specs/ROADMAP.md` — deliberately *not* in the set** (P-VI: r3 stays `queued`, no gate advanced).

---

## 10. What r3 leaves on the table (scope guard, D5 / NC1)

- A **production live TUI** (real `ctx.ui` harness, key/anchor wiring for Layer C via `handoff.ts`) —
  r3 *smokes* the live net over an *abstract* `LiveUICtx`; the concrete Pi wiring is a later polish
  (low-risk `implement` tweak, off the critical path).
- A genuinely live model call *on a non-throwaway* feature — r3 fires a **trivial one-off** through
  all nine gates; r3 does **not** build r4–r6.
- **Gate-0 advancement / program admission** — r3 *re-opens* Gate 0 at its close; the human in
  `specs/ROADMAP.md` must still *admit* the next row.

**Next move (human's):** r3 has **fired the kiln live** and produced the `LiveModelReady` handoff —
its lane stands ready for the *human's* Gate-0 admission of r4 (publish) or the next row. Until then
r3 stays `queued`.
