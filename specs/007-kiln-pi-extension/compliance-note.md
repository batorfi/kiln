# Compliance note — P-V and the Pi seam (T023, FR-017, NC3 = A)

**Trace**: [contracts/pi-seam.md](./contracts/pi-seam.md) S6 · [.specify/memory/constitution.md](../../.specify/memory/constitution.md) P-V · [research.md](./research.md) D5, D12.

## The operational definition of "headless" (verbatim from contracts/pi-seam.md S6)

> **Headless, for KILN, means: this run cannot obtain an *explicit human choice* from a mode that can reach a human.** It is decided by **mode and measured capability (S2)** — never by `ctx.hasUI` alone.
> A missing capability **hides** a layer and degrades the gate to a durable `WAIT`; it never advances one.

Implemented by `detectCapability` (`kiln/pi/port.ts`, per contract S2) and enforced by `interpret`/`resolveAsk` (`kiln/pi/outcome.ts`, per S3–S5), pinned by the table-driven suite in `kiln/tests/pi/seam.test.ts` (rows N1–N10, Y1) and its mutation harness (`_seam-rows.ts`, `checkInterpret`), plus `capability.test.ts` for S2 itself.

## Why an implementation stricter than P-V's wording is compliant

The constitution's Principle V reads:

> *"In headless (`!ctx.hasUI`) every gate … degrades to a durable `WAIT` row in the factory-log … under the default `gate-block` policy; a gate advances only on an explicit human move or a recorded exception."*

Two measurements (recorded in `research.md` Part B, M5 and M6) show this wording is neither necessary nor sufficient as a *detection recipe*, though the *principle it states* is untouched:

1. **`!ctx.hasUI` is not sufficient to identify every headless situation.** In Pi's `rpc` mode, `ctx.hasUI` is `true`, yet `ctx.ui.custom()` — the call a Layer B/C overlay needs — resolves to `undefined` with no UI request even emitted. A rule keyed only on `!ctx.hasUI` would treat `rpc` as capable of drawing an overlay it measurably cannot draw.
2. **`!ctx.hasUI` is not necessary to catch every silent non-answer.** In `print` and `json` mode (`hasUI: false`, which P-V's literal test *does* catch), `ctx.ui.select` and `ctx.ui.confirm` both resolve **instantly**, with **no distinguishable non-answer signal beyond the return value itself** (`undefined` and `false` respectively). A naive caller checking only `if (!ctx.hasUI) { … }` and otherwise trusting the return value is exactly the trap D5 exists to avoid — and it is a trap the literal wording does not warn against, because the wording is about *whether to consult the UI at all*, not about *what a resolved-but-empty answer means*.

r8's rule (S2 + S3) is a **strict superset** of what `!ctx.hasUI` alone would produce:

- Every case `!ctx.hasUI` marks headless (`json`, `print`, and any mode reporting `hasUI: false`) is **also** `canAsk: false` under S2 — nothing here re-admits a case P-V's literal test would have caught.
- S2 **additionally** withholds `canDraw` in `rpc` (a case `!ctx.hasUI` would have missed, since `hasUI` is `true` there), and S3 **additionally** withholds an answer for a dialog with no reachable human even when the raw return value looks answer-shaped (e.g., `confirm`'s `false`), and for `cancelled`/`timeout`/`not-offered`/`wrong-type` — cases the constitution's text does not enumerate at all.
- The rule can therefore only ever **withhold** an approval that the literal wording would also withhold, plus withhold some the wording is silent on. It **never grants** an approval in a case the wording would refuse. Because P-V's guarantee is a one-directional promise — *never silently approve* — a rule that only ever refuses *more* cannot violate a rule that promises to refuse in certain cases: it is stricter than the wording, not different from it.

## Decision (NC3 = A)

The constitution is **not amended**. No patch version bump, no Governance rationale entry, no migration note is required, because nothing in the text is contradicted — only its literal detection recipe is shown to be incomplete, and the implementation closes the gap in the strict direction.

This note itself is the record of that reasoning, as the spec's Clarifications section requires. **The wording is to be revisited at the r9 seam**, when a real terminal UI exists and Q1/Q2 of `ui-layers-deep.md` §11 (overlay survival, hosting a `select` inside an overlay) are answered — at that point "headless" may be worth stating in the constitution the way S2 states it here, rather than as `!ctx.hasUI`.
