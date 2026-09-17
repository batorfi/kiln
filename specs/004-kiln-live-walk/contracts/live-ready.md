# LiveModelReady — 004-kiln-live-walk (r3) · the falsifiable probe (E5 / US3, SC-006)

**Status**: design contract (Phase 1, research D6). **The extension of r1's `runtime-ready.ts` +
r2's `overlay-ready.ts`**: a static `node --test` check that asserts the **live path is wired,
emits a PASSing log, records the `--stub` fallback, renders deterministically, blocks a headless
Gate 0, and pulls no cloud** — **without advancing a gate, admitting a program, or running a *real*
feature** (a *probe*, not a *walk*). **Trace**: P-V (a broken no-silent-approval path **FAILs R3**),
P-VI (no admission), P-VII (the `--stub` selection is **recorded**), P-VIII (no cloud), P-IX (no
poll/server). `LiveModelReady` is the r3 **handoff proof for r4** (publish).

---

## What LiveModelReady asserts (all must hold to PASS)

`LiveModelReady` **composes on** r1's `runtime-ready.ts` (*wiring + PASSES-emit + zero-network*)
and r2's `overlay-ready.ts` (*deterministic render + a blocking headless Gate 0 + F1 human-only*)
and **adds r3's two hooks** (the **live** resident, and the **recorded** `--stub`/unlogged-stand-
in):

| # | assertion | how | fails-and-names |
|---|-----------|-----|-----------------|
| (a) **live path wired** (on r1 E7) | `kiln/src/live-resident.ts` (`Resident` live impl + the `--live`/`--stub` selector), `kiln/src/live-walk.ts` (E2), **`kiln/ui/live-tui.ts`** (r3 E4 — the live `ctx.ui` path over r2's render), and `kiln/validate/live-ready.ts` exist + are **importable**; `kiln/index.ts` **exports them on top of r1+r2's spine** | a static import + a presence check over `kiln/{src,ui,validate}` | names the missing/unwired element (e.g. "live-resident absent", "live-tui not wired") |
| (b) **PASSES-emit — the kiln fires LIVE** (on r1 E7) | the **live, full-nine-gate** walk's JSONL **replay through `kiln/validate/log.ts` PASSes** (R1–R6) **with a genuine human `decidedBy` per gate** | run the live walk (E2) + replay its JSONL through 001's *unmodified* `log.ts` | the emitted log is **invalid** — the broken `--broken` hook opens a no-`decidedBy` hole → **named R3** |
| (c) **deterministic render + a blocking headless Gate 0 + F1** (on r2 E6) | a captured live `state` ⇒ a **byte-identical** `renderOverlay` (SC-005); and with the live TUI **absent**, Gate 0 **prints + `WAIT`s` and **never emits a `gate0: approved`** (`disabledUi(...).blocks === true`) — r2's `F-OVERLAY` + `F-GATE0-BLOCK`, now on the **live** path; **F1** (a pre-delegated gate-0 is **refused**; only a `human@…` admits it) | reuse r2's `overlay-ready` checks on a live state | the broken render (`--broken-render`) / the Gate-0 auto-advance hole (`--broken-gate0`) / a non-human decider accepted at gate0 |
| (d) **recorded `--stub` — the `F-NOT-SILENT` hook** (r3, E3) | a `--stub` selection **appears in the log** (a `transition`/`cost` slot, E3); an **unlogged** stand-in ⇒ `ready=false` | run `--stub`, assert its marker is in the JSONL; run the *unlogged-stand-in* hook, assert it is **caught** | the **unlogged stand-in** (a `--stub` selection that emits **no recorded marker** — a *silent* stand-in) |
| (e) **no cloud** (on r1 E7 + r2 E6) | a **zero-network scan** over `kiln/{src,ui,validate,contracts}` finds **0** outbound/cloud dependency **and no socket/server/poll** (P-VIII/P-IX) on **both** toggle positions | static grep over `kiln/…` (import + `Server/Socket`/`fetch`/`setInterval`/`setTimeout` primitives) | the offending import / net primitive / timer |

**Guarantee `F-LIVEREADY` (US3, SC-006):** `LiveModelReady` **PASSes** only when **all** hold; it
**FAILs, naming the broken element**, when **exactly one** is removed/broken (a missing live
resident/unwired TUI, **`--broken`** the no-silent-approval hole, a **non-deterministic** render,
an opened Gate-0 auto-advance hole, an **unlogged** `--stub`, or a cloud import). It emits a
**traceability note** mapping each piece to its principle(s): P-I/P-VII (the human `decidedBy` + the
rec**orded** `--stub`), P-V (the R3 falsify), P-VI (the blocking headless Gate 0, F1), P-VIII/
P-IX (zero-cloud, no poll).

## What LiveModelReady does **not** do

- **No gate advances, no program is admitted, and no *real* feature "counts"** — it runs the
    *throwaway* live walk + a *blocked* headless Gate 0, not a *program* admission or a production
     build (P-VI/SC-007); the throwaway is **NC1's** one-off, not a program row.
- It **re-declares nothing** — it **composes on** r1's `runtime-ready.ts` + r2's `overlay-ready.ts`
    *and* reuses `kiln/src/types.ts`, `kiln/contracts/move-vocabulary.ts`
    (`moveVocabulary("gate0")`), 001's `kiln/validate/log.ts`/`roadmap.ts`, and r1's stub — an
    **extension**, not a duplicate (D8/NC3).

## Entry / runner

```
# node --test suite (the LiveModelReady check = r1's tests/runtime-ready + r2's overlay, +3 hooks)
kiln/tests/live-ready/           # extension of r1's runtime-ready + r2's overlay-ready; the F-NOT-SILENT suite
# CLI twin (optional; mirrors r2's kiln/validate/overlay-ready.ts)
kiln/validate/live-ready.ts      # prints READY or a named gap; runs NO gate, admits NO program; the r3 → r4 handoff proof
node kiln/validate/live-ready.ts [--broken | --broken-render | --broken-gate0 | --stub-unlogged]
```

**Exit semantics:** exit 0 = **READY** (live path wired + PASSES-emit + recorded `--stub` +
deterministic + a blocking headless Gate 0 + cloud-free); exit non-zero = FAIL, stdout **names** the
missing/broken element. **Falsifiable**: omit or break exactly one of (a)–(e) → a *specific* FAIL
(never a silent pass); the `--stub` selection **must be logged** or `LiveModelReady` **fails it,
named** (the `F-NOT-SILENT` hook, SC-006/NC2).
