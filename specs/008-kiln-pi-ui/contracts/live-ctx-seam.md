# Contract — the real `LiveUICtx` and its seam into r1/r2 (E4, E5, E6)

**Trace**: FR-002, FR-003, FR-004, FR-005, FR-006, FR-008, FR-010 · P-I, P-V, P-VI · [research.md](../research.md) D4–D7 · [data-model.md](../data-model.md) E3–E6

## L1 — `makeLiveUICtx` implements r3's `LiveUICtx`, unchanged in shape

```
makeLiveUICtx(piCtx: PiCtx, gate: Gate, head: RoadmapHead): LiveUICtx
```

`setStatus`, `raiseOverlay` — exactly r3's existing two methods (data-model E5). No new method. `attachLiveTui`'s call sites (r3, unmodified) do not need to
change to use a real body instead of a test double.

## L2 — Before any question is asked, identity is resolved once

`raiseOverlay("B"|"C", …)` calls `resolveIdentity()` (data-model E3) **before** building any `GateQuestion`. An `ok: false` result is treated exactly like
r8's `no-answer` — the overlay, if drawn at all, is informational only (it may still show the popup content so the operator can see *what* is blocked), and
the gate goes to `headlessWait` immediately, without ever calling `askGate`. **No dialog is ever shown that could be mistaken for asking for a decision that
cannot be recorded.**

## L3 — The outcome table (extends r8's, adds the "apply" step r8 deliberately stopped short of)

| Pi's raw dialog result | r8's `interpret` outcome | Identity | This row's action |
|---|---|---|---|
| an offered move string | `answered(move)` | `ok: true` | `applyMove(gate, move, decidedBy)` (per-gate) or `recordGate0Decision(head, {move, decidedBy})` (Gate 0) |
| an offered move string | `answered(move)` | `ok: false` | **`headlessWait(gate)`** — an answer is never applied without a resolved identity, even if the move itself was valid |
| cancelled / timed out / not offered / wrong type | `no-answer(reason)` | either | `headlessWait(gate)` — unchanged from r8 |
| capability says `cannot-ask` | `no-answer("cannot-ask")` | either | `headlessWait(gate)` — unchanged from r8 |

Row 2 is the one genuinely new refusal this row adds: **a syntactically valid move, from a human who explicitly chose it, is still not applied if
`KILN_HUMAN` was not set correctly** — because r1/r2's own `applyMove`/`recordGate0Decision`/`resumeByToken` would refuse it anyway (they require
`decidedBy` to start with `human@`), so refusing it here, before ever calling them, is not a *new* restriction — it is the *same* restriction, caught one
layer earlier, with a clearer, KILN-Pi-specific error message than a thrown exception would give.

## L4 — Which "apply" function, decided by which face is showing

- **Layer B** (a per-gate 1–9 card): the question's options come from `moveVocabulary(gate.id)`; an `answered` outcome calls **`applyMove`** (r1, unmodified).
- **Layer C's Gate-0 face** (`gate0.status === "pending"`): the question's options are `GATE0_ADMISSION_MOVES` (r2's existing export — `approve`/`revise`/
  `reject` only, **never** the roadmap-edit moves); an `answered` outcome calls **`recordGate0Decision`** (r2, unmodified). This is FR-003's disjointness
  invariant, enforced structurally: there is no code path in which a Layer-B-sourced choice reaches `recordGate0Decision`, or vice versa — each call site
  names its own function directly, there is no shared "apply(outcome)" dispatcher that could be fed the wrong table.
- **Layer C's plain table** (`gate0.status !== "pending"`): no question is ever built; `raiseOverlay("C", content)` shows `presentOverlay`'s output with no
  `custom()` dialog beyond the overlay's own dismiss handling (Enter/Esc close it, exactly as r8's F-1 fix already established the pattern for).

## L4a — A fired event never corrupts a pending overlay (FR-009)

If a `FactoryEvent` arrives while `OverlayState.layer` is non-null (L5's guard, below, already has a `custom()` call pending for that layer), the redraw
updates that SAME overlay's rendered content **in place** (the component's own `render()` is re-invoked by `tui.requestRender()`-style redraw, not by a new
`custom()` call) — it never opens a second dialog for the same layer, and never silently drops the pending one. Only a *different* layer wanting to open
triggers L5's exclusion logic.

## L5 — Mutual exclusion (FR-008, research D6)

`live-ctx.ts` tracks `OverlayState` (data-model E4). `raiseOverlay(layer, content)` for a layer other than the currently-tracked one first calls the tracked
overlay's own close path (resolving its `custom()` promise with no answer — a `no-answer`, `headlessWait`, never a move), **then** opens the new one. At most
one KILN overlay's `custom()` call is ever pending at a time.

## L6 — A late answer never applies to the wrong gate (FR-010, research D7)

Every `askGate`/`interpret` call closes over the **specific** `Gate` object it was opened for. A session switch measured (r8 SQ3) to still deliver a late
answer to that closure does not change *which* `gate` object the resulting `applyMove` call would target — it is the same one. If, before that late answer
arrives, the *same* gate is somehow re-opened with a *new* `Wait` (a new token), `resumeByToken`'s own comparison (`gate.wait.token !== token` →
`"still-open"`) already refuses the stale one; this row adds **no new token logic** on top of that existing refusal. SQ6 (research Part B) marks this
reasoning as **T** — to be confirmed, not assumed, by the human terminal smoke.

## L7 — What this contract never does

No new `recordType`. No new Wait shape. No call to `applyMove`/`recordGate0Decision` with a `decidedBy` that did not pass `resolveIdentity`. No dialog for a
per-gate move that offers anything beyond `moveVocabulary(gate.id)`; no dialog for Gate 0 that offers anything beyond `GATE0_ADMISSION_MOVES`.
