# Live Resident + Recorded `--live`/`--stub` Toggle — 004-kiln-live-walk (r3) · E1 + E3

**Status**: design contract (Phase 1, research D1/D2). **The *live* resident, plus its recorded
selection.** Trace: P-I (a model *runs*, never *decides*), P-V/P-VII (the `--stub` is *recorded*,
never a silent stand-in), P-VIII (local-first, no cloud), P-II (LoD roles bind `strongest`, live).

---

## E1 — The live resident (a live impl of r1's `Resident` interface)

r1's `kiln/src/stub-resident.ts` declares **`Resident`** = `{ run(workUnit): unknown;
model(): string; tier(): Tier }` and a **deterministic stub** (`out ?? work`, a fixed
`"stub-resident"` head). R3 adds a **live implementation** of that **same interface** — a **real
local model** (e.g. Ollama-served), so the lane can **drive a genuine inference** through the rail:

| member (r1 `Resident`, imported — unchanged) | r3's live behavior |
|----------------------------------------------|-------------------|
| `run(workUnit)` | drives a **real inference** on the live model (not a fixed stub `out`); the throwaway's checkpoints get *genuine* work product |
| `model()` | the **live** local model name — a real head, not `"stub-resident"` (SC-001 "the kiln fires **live**") |
| `tier()` | the model's tier; **line-of-defense roles bind `strongest`** via the inherited `bindRole` (P-II/FR-005), exactly as r1 — no new binding logic |

**Guarantee `F-LIVE-RESIDENT` (SC-001 / P-I, P-VIII):** the **default** resident is **live**; a
loD role on it runs `strongest`; the resident is **local** (a zero-network scan, E5, stays green);
and a live walk's **gates still resolve on a human `decidedBy`** (or a distinct `pre-delegation`) —
the model **runs** the work, it never **decides** a gate (P-I).

---

## E3 — The `--live`/`--stub` toggle + its *recorded* selection (NC2; `F-NOT-SILENT`)

A **selector** that picks E1 (live, **default**, NC2) or r1's stub (the reproducibility fallback).
The **load-bearing** point is that the **selection is *recorded***, landing in 001's existing log
union — **no new `recordType`** (D2/D8):

| surface absent / toggle | behavior (rule) | recorded as |
|-------------------------|-----------------|-------------|
| **`--live` (default)** | runs **E1** on a real local model — the **primary** proof | a `transition`/`cost` slot naming `resident: "live"` (+ the model name) |
| **`--stub`** | runs r1's deterministic stub as a **fallback** — still the *same* emit shape | a `transition`/`cost` slot naming `resident: "stub (RECORDED fallback, NC2)"` |
| **an *unlogged* `--stub` stand-in** | a **violation** — a `--stub` that emits **no recorded marker** | `LiveModelReady` (E5) **catches** it: `ready=false`, **named** (the *opposite* of a silent stand-in) |

**Guarantee `F-NOT-SILENT` (FR-006, SC-006 / P-V, P-VII):** a stand-in is **always recorded**,
distinguishable from a live run — the *precise opposite* of the "a missing UI silently approves a
gate" that P-V forbids. R3 **reuses** 001's `transition`/`cost` union for the record (D8/NC3 — **no
new `recordType`**), so this adds nothing to `kiln/validate/log.ts`; the *falsify* lives in
`LiveModelReady` (E5).

---

## What E1/E3 do **not** do

- **No cloud** — the live model is **local** (P-VIII); the `--stub` fallback is **dependency-free**;
   `LiveModelReady`'s zero-network scan stays green on **both** toggle positions (SC-006).
- **No re-declaration** — r3 does **not** redefine the `Resident` interface or the stub; it adds a
   *live* impl (**the same interface**) and a *recorded* selector (D8/NC3).
- **No gate advance / no admission** — selecting a resident is **not** a gate move; a live walk's
   gates resolve on a **human** (or a distinct `pre-delegation` on the tail), **never** the
  toggle/president (P-V/P-VI). A `--stub` selection is **never** a `gate0` or gate-1–9 decision.

## Entry / runner

```
# the live resident + the recorded toggle, built at /speckit.implement per live-walk.md / live-ready.md
kiln/src/live-resident.ts    # E1 — a LIVE impl of the r1 Resident interface (e.g. an Ollama adapter)
kiln/src/live-resident.ts    # E3 — the --live/--stub SELECTOR; writes a RECORDED transition/cost slot
kiln/tests/live-walk/        # node --test: --live PASSes; --stub is RECORDED; an UNLOGGED stub FAILs `F-NOT-SILENT`
```

**Guarantee:** `--live` is the **default**; `--stub` is **logged** (a `transition`/`cost` slot) —
an unlogged stand-in **fails** `LiveModelReady` by **name** (never silent — P-V/P-VII).
