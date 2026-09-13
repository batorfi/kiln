# RuntimeReady — 002-kiln-lane (r1) · the falsifiable probe (E7 / US6, SC-006)

**Status**: design contract (Phase 1). The **extension of 001's FiringReady**: a static
`node --test` check that asserts the runtime *exists, is wired, emits a valid log, and
pulls no cloud* — **without advancing a gate or running a real feature** (a *probe*,
not a *walk*). **Trace**: P-VI, P-VII, P-VIII + "the runtime analogue of FR-009 in 001."

---

## What RuntimeReady asserts (all three must hold to PASS)

| # | assertion | how | fails-and-names |
|---|-----------|-----|-----------------|
| (a) **wiring present** | `kiln/index.ts` is **wired** (`laneIsWired() === true`); the lane / gate / writer / scheduler / ui modules are **importable and present** | a static import + a `firing-ready`-style presence check over `kiln/` | names the missing/stubbed module (e.g. "log-writer removed") |
| (b) **the runtime emits a valid log** | run a **synthetic stub-resident walk** (E6) and **replay its emitted JSONL through `kiln/validate/log.ts`** (001's unmodified validator) → it **PASSES** (R1–R6; D5 dogfood) | the same replay 001's quickstart Scenario 1–3 use | names the broken dogfood (e.g. "emitted log fails 001's R3") |
| (c) **no cloud** | a **zero-network grep** over the runtime module set finds **no outbound/cloud dependency** (P-VIII) | static grep over `kiln/` | names the offending import |

**Guarantee `F-RUNTIMEREADY` (US6, SC-006):** RuntimeReady **PASSES** only when all
three hold; it **FAILS, naming the broken element**, when **exactly one** is removed or
broken (a broken no-silent-approval hole, a missing writer, or a broken wiring). It
emits a **traceability note** mapping each runtime piece to its constitution
principle(s) — the runtime analogue of FR-009.

## What RuntimeReady does **not** do

- **No gate advances** and **no *real* feature runs** — it runs a *stub* walk, not a
  Gates 1–9 walk (NC2/P-VIII keep r1 local-first; a live walk is **r3**).
- It **re-declares nothing** — it reuses 001's `kiln/validate/log.ts`, the schemas,
   `move-vocabulary.ts`, and `roles.ts`.

## Entry / runner

```
# node --test suite (the RuntimeReady check)
kiln/tests/runtime-ready/            # extension of 001's tests/firing-ready/
# CLI twin (optional; mirrors kiln/validate/firing-ready.ts)
kiln/validate/runtime-ready.ts       # prints PASS/FAIL + the named element; runs NO gate
```

**Exit semantics:** exit 0 = PASS (wired + valid-emit + cloud-free); exit non-zero =
FAIL, stdout names the missing/broken element. **Falsifiable**: omit or break exactly
one of (a)/(b)/(c) → a *specific* FAIL, never a silent pass.
