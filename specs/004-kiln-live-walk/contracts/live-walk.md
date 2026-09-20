# Live Walk — 004-kiln-live-walk (r3) · E2 · the live-walk sibling of `walk.ts`

<!-- r7-correction -->
> **⚠ Correction recorded by r7 (2026-09-20) — read this first. The original text below is preserved verbatim (P-VII: recorded, never rewritten).**
>
> **1 · "the kiln fires LIVE" was not yet true.** r3's "live" resident, `makeLiveResident` (`kiln/src/live-resident.ts`), is a
> *deterministic pure function* returning `{ran: "live", via: <model>, …}`. Before r7 there was **no Ollama client, no `fetch`
> and no subprocess anywhere in `kiln/`**, the resident's return value was discarded at a bare `resident.run(unit)`
> (`lane.ts`), and `DEFAULT_LOCAL_MODEL` (`ollama/llama3.2:3b`) named a model that was **never installed** on the reference
> host — nothing could ever fail to resolve it. Read "fires LIVE" / "live model" below as *"walks the full rail through a
> deterministic adapter"*.
>
> **2 · The "zero-network / zero-cloud" checks cited below were vacuous.** `runtime-ready` and `live-ready` guarded their scan
> with `fileExists(dir)` — `statSync(p).isFile()`, which is `false` for a directory — so they skipped **every** directory and
> examined **zero files**; `overlay-ready` scanned `ui`/`contracts`/`validate` but never `src`. A planted external import,
> `require("http")` **and** a bare `fetch` in `kiln/src` left all three probes green. "Zero-cloud" was true of the code, but
> the probes could not have shown otherwise.
>
> **What r3 delivered and STILL STANDS:** the full nine-gate walk; the log-replay net (a clean walk PASSes 001's `log.ts`, a
> broken no-`decidedBy` walk FAILs by a named R3); the recorded `--live`/`--stub` toggle (`F-NOT-SILENT`); the live TUI
> smoke of Layers A/B/C; and `LiveModelReady`, which proves the live path is **wired** — *necessary, not sufficient* (an
> adapter satisfies it). r3 stays `done` @PR#3.
>
> **Where it was made true:** row **r7** (`specs/006-kiln-live-inference/`) — a real Ollama resident
> (`kiln/src/ollama-resident.ts`), `OllamaReady` (which fails a *claimed* live run that *performed* no round-trip), and one
> shared, genuinely-scanning P-VIII guard (`kiln/validate/_netscan.ts`). Full account:
> [`specs/006-kiln-live-inference/compliance-note.md`](../../006-kiln-live-inference/compliance-note.md).

**Status**: design contract (Phase 1, research D3/D7). **A *live* full-Gates-1–9 lane over the
throwaway feature, emitting 001's log union unchanged, plus the broken no-silent-approval vector.**
Trace: P-I (human decides), P-V (no-silent-approval held **live**), P-III (`F-SINGLE` live),
P-IV/`switchCount`, P-VII (the live walk's records are the audit).

---

## E2 — The live-walk sibling (extends r1's `kiln/src/walk.ts`)

r1's `kiln/src/walk.ts` proves "a clean walk **PASSES** 001's `kiln/validate/log.ts`; a broken
auto-approve **FAILs** it, **named R3**" — but **on a deterministic stub** (`buildStubWalk`). R3
adds a **sibling** (a `--live`/`--stub` *selector on the same builder*, D3/D2) that drives a
**live resident** (E1) through **one full Gates-1–9 lane** over the **trivial throwaway** (NC1/§D4),
emitting the **exact same log union** r1 emitted — **no new `recordType`** (D8/NC3):

| emitted record (001 union — *unchanged*) | what the live walk emits |
|------------------------------------------|--------------------------|
| `transition {kind, from?, to?, reason?}` | load/hold/yield/**swap** through the rail + the **recorded `--live`/`--stub` selection** (E3), `seq`/`ts`-stamped (P-VII) |
| `cost {switches, wallClock}` | one per genuine tier boundary; realized switches **== `switchCount`** (FR-004/P-IV/SC-004); a live `wallClock` |
| `gate-completion {gate, move, cost, decidedBy?, preDelegation?}` | a **human `decidedBy`** per gate (`move ∈ moveVocabulary(gate)`), **or** a **distinct `pre-delegation`** on the unattended tail (gates 4–9, FR-011) |
| `human-decision` / `pre-delegation` / `wait` | the open gates (`wait`, P-V), the unattended-tail pre-authorization **distinct** (P-VI), and the live **TUI event** audit (E4) |

### The full-nine-gate live lane + unattended tail (§D7; "the net, live")

The throwaway walks the **entire rail**, not a subset — so r3 also exercises what r1/r2 could only
*hint* at headlessly:

1. **triage** → **1** concept → **2** architecture (**critic**, LoD, holds lane) → **3** spec →
   **4** plan → **5** checkpoint (`split+revise`/`approve`; the restorable base) → **6** review
   (**reviewer**, LoD; `restart` reopens a checkpoint) → **7** verification (**verifier**, LoD;
    `reject` → **≤2 mitigation rounds** → human `wait`) → **8** docs → **9** PR (`approve` = merge).
2. **A clean unattended-tail cruise** of gates **4–9** via a **distinct `pre-delegation`**
   (the approve side pre-authorized; FR-011; the *opposite* of a silent approval).
3. **At least one line-of-defense veto, fired and *halted*** — the *"crack in the cool"*: a critic
      objection / a reviewer `restart` / a verifier `reject` / a checkpoint **overflow** **halts the
      cruise and returns the lane to a human** (SC-005/FR-007/US).

Guarantee: every gate resolves on a **human `decidedBy`** (or the distinct `pre-delegation`);
`F-SINGLE` holds over the live snapshots (SC-003 — `assertSingleLane`, P-III); realized switches
== `switchCount` (SC-004); and the emitted live log **PASSES `kiln/validate/log.ts`** (SC-001, P-I/P-
VII). A **broken** variant (the r1 `run.ts --broken` vector, spliced live — a `gate-completion` with
**no `decidedBy` / no distinct `pre-delegation`**) **FAILs R3 by name** (SC-002/SC-003).

---

## What E2 does **not** do

- **No new `recordType` / no schema change** — the live walk rides the **existing** union; `walk.ts`
   is *extended* (a selector), not *re-declared* (D8/NC3/D3).
- **No program admission / no Gate-0 advance** (P-VI/SC-007) — the throwaway is **one firing** of an
   *already admitted* program; r3 **re-opens** Gate 0 at the throwaway's close, it does **not**
    admit or advance it.
- **No re-derivation** — r3's *broken* vector **reuses** r1's `run.ts --broken` (`--broken`, strip a
    gate's `decidedBy`) on the **live** emitted log; it does not invent a new falsify.

## Entry / runner (the dogfood boundary)

```
# built at /speckit.implement; the emitted live JSONL is replayed through 001's UNMODIFIED validator
kiln/src/walk.ts            # (r1) REUSED — the emit sequence + buildStubWalk live-walk SIBLING extends
kiln/src/live-walk.ts       # E2 — LANE-LANE builder: --live drives a live resident through Gates 1–9 on the throwaway
kiln/tests/dogfood/run.ts   # (r1) REUSED, now live — writes kiln/factory-log/r3-live-walk.jsonl (+ --broken → r3-live-broken.jsonl)

# dogfood (the "kiln fires LIVE" spine)
node kiln/tests/dogfood/run.ts r3-live-walk        # → kiln/factory-log/r3-live-walk.jsonl
node kiln/validate/log.ts kiln/factory-log/r3-live-walk.jsonl      # → PASS  (R1–R6, human decidedBy per gate)
node kiln/tests/dogfood/run.ts r3-live-broken --broken            # opens the no-silent-approval hole
node kiln/validate/log.ts kiln/factory-log/r3-live-broken.jsonl   # → FAIL — R3 (named, "no human decidedBy…")
```

**Exit semantics (live):** the **clean** walk **PASSes** 001's validator with a **human `decidedBy`
per gate** (SC-001, P-VII); the **broken** walk **FAILs R3, named** (SC-002/SC-003, P-V); `F-
SINGLE`, `switchCount`, and every-LoD-`strongest` hold on the live sequence (SC-003/SC-004). R3 is
**additive** (D8): *it extends `walk.ts`, does not re-declare its emit sequence.*
