# Overlay API — 003-kiln-roadmap-overlay (r2) · Layer C + the two events + the twin

**Status**: design contract (Phase 1, D1–D5/D8). The **module surface** r2 exposes to a driver /
test. Every signature is *behavioral* (what a caller may do; what the invariants guarantee), not an
implementation body — `tasks.md` / `/speckit.implement` own the bodies. **Trace**: P-I, P-V, P-VI,
P-VII, P-VIII, P-IX.

**Golden rules:**
1. **Principle I / P-VI**: the overlay *renders*; the Gate-0 face *presents*; **no module
    *decides* its own gate** — a Gate-0 outcome is a **human move** (`gate-completion` at
    `gate:"gate0"` with `decidedBy: human@…`) r2 only *renders / records*.
2. **P-IX / D8**: one `FactoryState`, **event-driven**, **additive** — r2 *extends* r1's
   `FactoryEvent` and the twin, it **does not** re-declare 001's / r1's shapes.

---

## `kiln/ui/factory-state.ts` — the event union + `onEvent` (r1, **extended additively**, D4)

```ts
// (r1) the single store; mutates ONLY on events (F1 / P-IX). r2 extends the closed union:
export type FactoryEvent =
    | { kind: "transition"; to: string }
    | { kind: "gate-open"; gate: string }
    | { kind: "gate-resolve"; gate: string; move: string; by: string }
    | { kind: "cost"; switches: number; wallClock: string }
    | { kind: "wait"; gate: string }
    | { kind: "snapshot" }
    // ── r2 ADDS (exactly two; the Layer-C redraw triggers, P-IX) ──
    | { kind: "gate0_open" }                                // raises the overlay / Gate-0 face; the lane HOLDS
    | { kind: "roadmap_row_done"; rowId: string };          // redraw + re-enter Gate 0 (current → next eligible row)

// (r1) onEvent(state, ev) → NEW state, pure over the store. r2 handles the two new cases:
//   gate0_open        → set a "gate0-open" flag on the state (the overlay rises; the lane holds for a human).
//   roadmap_row_done  → current → next dep-eligible row; gate0 → a human WAIT (the inter-row seam, P-VI).
//   it NEVER fires the next row's gate 1; it NEVER re-enters a merged/done row.
```

**Guarantee (D4/FR-003, SC-005):** the two new events are the **only** Layer-C trigger, so
**no poll can exist** (the timer/socket grep stays green); `onEvent` remains **pure** (identical
state ⇒ identical next state; one source of truth).

---

## `kiln/ui/overlay.ts` — Layer C the roadmap zoom-out (E1 / US1, P-IX) · `F-OVERLAY`

```ts
import type { FactoryState } from "../src/types.ts";
// The program-level zoom-out (ui-layers-deep.md §5.1): a pure render of the ONE FactoryState.
export function renderOverlay(state: FactoryState): string;
// Lists every RoadmapRow as `id / status / short / deps / lane-gate`; highlights the in-flight
// `current` row "at gate N — HERE"; shows `waits <dep>` on a blocked row; shows the gate0 head
// (pending / approved{rows, decided_by, at}) at the top. Composes with A/B (never replaces them).

// The no-poll / no-server assertion (SC-005): a grep over kiln/ui/*.ts finds no setInterval/
// setTimeout, no socket, no server — Layer C redraws ONLY on a fired event.
```

**Guarantee (US1, SC-001/SC-005):** a captured identical `state` ⇒ a **byte-identical** overlay;
exactly **one** row reads "at gate — HERE"; the overlay lists **all** rows (SC-001); it is
**additive** — firing an event redraws A, B, and C together (FR-002).

---

## `kiln/ui/gate0-face.ts` — the Gate-0 face (E2 / US2, P-VI) · a *distinct* face (NC2/D2)

See [gate0-face.md](./gate0-face.md) for the contract; the module surface:

```ts
import { moveVocabulary } from "../contracts/move-vocabulary.ts";   // do NOT re-declare the set
export function renderGate0Face(roadmap: RoadmapHead): string;      // the §5.2 program table + moves
//   moves = moveVocabulary("gate0") = ["approve","revise","reject","edit-rows","add-row","drop-row"]
//   on a DISTINCT face — NEVER Layer B's per-gate card chrome (gate0 ≠ gate, G1).

// A human Gate-0 move is recorded ADDITIVELY as a gate-completion at gate:"gate0" (no new record
// type): { recordType:"gate-completion", "gate-completion": { gate:"gate0", move, decidedBy:"human@…", cost } }
//   with move ∈ moveVocabulary("gate0") and a non-empty decidedBy — else it STAYS OPEN (P-V/P-VI).
export function recordGate0Decision(roadmap: RoadmapHead, decision: { move: string; decidedBy: string }): FactoryRecord;
```

**Guarantee (US2, SC-002/SC-003):** the face shows **only** `moveVocabulary("gate0")` (a per-gate
move is **rejected** here; disjoint from Gates 1–9); a Gate-0 *decision* carries a `decidedBy:
human@…` and **PASSES 001's `kiln/validate/log.ts`** (the dogfood); a move without a decider
**stays open** (never resolved — P-V/P-VI).

---

## `kiln/ui/twin.ts` — the headless twin (**E4** / r1, **extended additively**, D5 / US3, P-V/P-VI)

```ts
// (r1) printHeadless(state) / disabledUi(state) — r2 extends so the print also carries Layer C:
export function printHeadless(state: FactoryState): string;   // adds: the roadmap TABLE
//   when the overlay is absent, print the SAME rows/status/deps renderOverlay would show (one source of truth).
//   when Gate 0 is reached headless: PRINT the program + emit a `wait` (token+deadline) — NEVER a gate0:approved.

export function disabledUi(state: FactoryState): { render: string; blocks: boolean };   // blocks extends blocksOn:
//   `blocks` reports an OPEN Gate 0 / open row-gate even when the overlay is missing — a missing
//   Layer C hides the VIEW, never the DECISION (F-GATE0-BLOCK, SC-002/SC-003).
```

---

## `kiln/ui/keymap.ts` — the Layer-C keymap (**§D6** — a low-risk planning spike; **not** a first-class E-entity)

```ts
// The resolved keymap (ui-layers-deep.md §11#5): M raises Layer C; g raises Layer B; ? toggles.
// Distinct keys, mutually-exclusive overlays — no conflict (a low-risk tweak for /speckit.implement).
export const LAYERC_KEY = "M";           // raise the Roadmap overlay / Gate-0 face
export const LAYERB_KEY = "g";           // (r1) raise the Flow Popup
export const TOGGLE_KEY = "?";
// wide full-width overlay (§5.1) is the lean sizing default; a compact strip is a deferred render tweak.
```

---

## `kiln/src/walk.ts` — a closed-row program walk (r1, **extended additively**, D3/D4)

```ts
// (r1) buildStubWalk(...) — r2 adds buildProgramWalk(): a sequence that closes a row, so r2 CAN
//   emit a gate-0 gate-completion + a roadmap_row_done→gate0_open and judge the result by log.ts.
export function buildProgramWalk(opts?: { gate0By?: string; brokenAutoApprove?: boolean }): { lines: string[] };
//   lines: ... gate-completion{gate:"gate0", move:"approve", decidedBy:"human@batorfi", cost} +
//          roadmap_row_done(signal) + gate0_open + a `wait` (gate0 re-entered). R1–R6 conformant.
//   brokenAutoApprove:true → drop the gate-0 `decidedBy` → the log FAILs log.ts R3 (the SC-002→SC-003 negative).
```

## `kiln/index.ts` — the wiring (extends r1's)

`kiln/index.ts` **also exports** `renderOverlay` / `renderGate0Face` / `recordGate0Decision` /
`buildProgramWalk` / `checkOverlayReady` on top of r1's spine exports. It emits **no `gate0`
decision** and **admits no program** (P-VI/FR-014/SC-007) — the overlay is the one that never
admitted `specs/ROADMAP.md`; the human move did.
