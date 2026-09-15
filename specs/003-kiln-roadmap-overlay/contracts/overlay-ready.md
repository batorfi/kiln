# OverlayCReady — 003-kiln-roadmap-overlay (r2) · the falsifiable probe (E6 / US5, SC-006)

**Status**: design contract (Phase 1, D7). **The extension of r1's `runtime-ready.ts`**: a static
`node --test` check that asserts Layer C *exists, renders deterministically, blocks a headless Gate
0, and pulls no cloud* — **without advancing a gate, admitting a program, or running a real
feature** (a *probe*, not a *walk*). **Trace**: P-V, P-VI, P-VIII ("the OverlayCReady analogue of
r1's SC-006"; the runtime-analogue of FR-009). It **composes on r1's `runtime-ready.ts`** (it
*includes* the spine's wiring + zero-network + valid-log assertions, of which it is an extension).

---

## What OverlayCReady asserts (all must hold to PASS)

| # | assertion | how | fails-and-names |
|---|-----------|-----|-----------------|
| (a) **overlay + face wired** | `kiln/ui/overlay.ts` (`renderOverlay`), `kiln/ui/gate0-face.ts` (`renderGate0Face`), and the **extended** twin (`kiln/ui/twin.ts`) exist and are **importable**; `kiln/index.ts` **exports them on top of r1's spine** | a static import + a `runtime-ready`-style presence check over `kiln/ui/` | names the missing/stubbed element (e.g. "overlay absent") |
| (b) **deterministic render + a blocking headless Gate 0** | a captured `state` ⇒ a **byte-identical** `renderOverlay`; and with the overlay **absent**, Gate 0 **prints + `WAIT`s` and **never emits a `gate0: approved`** (`disabledUi(...).blocks === true` on an open Gate-0) — the `F-OVERLAY` + `F-GATE0-BLOCK` guarantees | render a state twice + assert equality; disable the UI, reach Gate 0, assert it blocks, and replay the emitted log through `kiln/validate/log.ts` | the broken render / the auto-advance hole (a broken no-silent-approval path → the log FAILs R3 and names it) |
| (c) **no cloud** | a **zero-network scan** over `kiln/{ui,validate,contracts}` (reuses r1's scan, D7) finds **no outbound/cloud dependency** (P-VIII) | static grep over `kiln/…` (import + `Server/Socket`/`fetch` primitives) | the offending import |

**Guarantee `F-OVERLAYREADY` (US5, SC-006):** OverlayCReady **PASSES** only when all three hold;
it **FAILs, naming the broken element**, when **exactly one** is removed/broken (a missing overlay
render, an opened auto-advance-of-Gate-0 hole, or a cloud import). It emits a **traceability note**
mapping each Layer-C piece to its principle(s) — P-IX (E1/E3 render-only), P-V/P-VI (E4 the
blocking headless Gate 0), P-VIII (E6 no cloud).

## What OverlayCReady does **not** do

- **No gate advances**, **no program is admitted**, and **no *real* feature runs** — it runs a
   *render* of a program head + a *blocked* headless Gate 0, not a Gates 1–9 walk or a live TUI
    (NC1 → the live proof is **r3**); this is a *probe*, not a *walk* (P-VI/FR-012).
- It **re-declares nothing** — it reuses `kiln/src/types.ts`, `kiln/contracts/move-vocabulary.ts`
    (`moveVocabulary("gate0")`), and **r1's `runtime-ready.ts`** (composing on, not duplicating).

## Entry / runner

```
# node --test suite (the OverlayCReady check)
kiln/tests/overlay-ready/            # extension of r1's tests/runtime-ready/
# CLI twin (optional; mirrors kiln/validate/runtime-ready.ts)
kiln/validate/overlay-ready.ts       # prints READY or a named gap; runs NO gate, admits NO program
```

**Exit semantics:** exit 0 = PASS (wired + deterministic + blocking-headless-Gate-0 + cloud-free);
exit non-zero = FAIL, stdout names the missing/broken element. **Falsifiable**: omit or break
exactly one of (a)/(b)/(c) → a *specific* FAIL, never a silent pass.
