# Data Model: 003-kiln-roadmap-overlay (r2 — the Layer C roadmap overlay)

**Feature**: [spec.md](./spec.md) · **Research**: [research.md](./research.md) ·
**Plan**: [plan.md](./plan.md)

Phase 1: the **Layer-C entities** r2 adds — the *render* of what 001 *declared* and r1 *ran*.
001 gave the **shapes** (`RoadmapRow` / `RoadmapHead` / `Gate0` / `FactoryState` in
`kiln/src/types.ts`; the two JSON schemas; `moveVocabulary`); r1 gave the **store + the two
per-lane surfaces** (`kiln/ui/*`); r2 gives the **overlay, the Gate-0 face, the twin's Layer-C
half, the two new events, and the probe** that render over those shapes. Each entity below is a
*render* counterpart; the field **shapes are unchanged and imported** from
`kiln/src/types.ts` + `kiln/contracts/move-vocabulary.ts` + r1's `kiln/ui/*` (r2 **imports, not
re-declares** — D8, the ancestor-canonical invariant).

> **Numbering note (E1–E6).** The entities E1–E6 below are the **canonical** set. The
> `kiln/ui/keymap.ts` planning spike (`LAYERC_KEY = "M"` + overlay sizing, **research §D6**) is
> **not a first-class entity** — it is a low-risk `implement` tweak and carries **no E-number**:
> the **`E4` slot is the *headless twin*'s**, not the keymap's (the keymap is a **§D6** decision).

---

## Entity 1 — The Layer C Roadmap overlay (E1 / US1 / FR-001, FR-002) · `F-OVERLAY`

The **pure render** `renderOverlay(state: FactoryState): string` over the **one shared
`FactoryState`** r1's A/B draw — the *roadmap zoom-out* of `ui-layers-deep.md §5.1`.

| input field (001/r1 shape) | meaning in r2's render |
|----------------------------|------------------------|
| `roadmap: RoadmapRow[]` | the program; every row renders as `id / status / short / deps / lane-gate` |
| `current` | the in-flight row id — **highlighted "at gate N — HERE"**; other rows show `status` (merged/done) or `waits <dep>` |
| `gate0` | the program gate's head state (`pending` / `approved`) shown at the top of the overlay; `approved` shows `rows / decided_by / at` |
| `gate` | the in-flight row's live gate — shown *inside* the highlighted row (`lane-gate`) |
| `switches` / `wallClock` | shown on the overlay footer (a distilled read of r1's cost, not re-computed) |

**Guarantee `F-OVERLAY` (SC-005 / P-IX):** `renderOverlay` is a **pure function** — a captured
identical `state` yields a **byte-identical** overlay (one source of truth); it redraws **only on
a fired event** (D4); it **composes** with A/B (a fired event redraws all three) — Layer C
**never hides or replaces** A/B (FR-002). **Additive**: it reads `FactoryState`, it does not fork
a lane (P-III `F-SINGLE` holds; D1).

---

## Entity 2 — The Gate-0 face (E2 / US2 / FR-004, FR-006) · the program gate rendered

The **distinct Layer-C face** (`ui-layers-deep.md §5.2`) that renders the **proposed or
admitted program** with its **roadmap-level move set**, on a face **disjoint from a per-gate card**.

| field / rule | meaning (canonical, imported) |
|--------------|-------------------------------|
| `face: "gate0"` | a **distinct** face — **never** Layer B's per-gate card (NC2/D2; `gate0 ≠ gate`, G1) |
| moves | **`moveVocabulary("gate0")`** = `["approve","revise","reject","edit-rows","add-row","drop-row"]` — the human-facing **admission** set is `approve / revise (w/ director) / reject`; the **program-edit** moves are `edit-rows / add-row / drop-row` |
| `decidedBy` | **required** on a Gate-0 *decision* — a non-empty `human@…`; else the face **stays open** (a recorded, not resolved, request — P-V/P-VI) |
| `rows` | e.g. `r1..r6` — the proposed/admitted program the face shows (the §5.2 table) |

**Transitions (D2/D3):**
- **pre-lane / inter-row:** `gate0_open` event → the face **rises** over the proposed program
   (`gate0.status: pending`); the human's `approve` move flips it to `approved` and is **recorded
   additively** as a `gate-completion` at `gate:"gate0"` → `gate-resolve`.
- **illegal move** `∉ moveVocabulary("gate0")` → **rejected**, the face **stays open**
   (US2 SC-4; G3).
- **`gate0` vs `gate`:** a per-gate 1–9 move is **never** accepted here, and a `gate0` move is
   **never** accepted at a per-gate card (the two vocabularies are **disjoint** — SC-002).

---

## Entity 3 — The two Layer-C events (E3 / D4 / FR-003) · additive on r1's `FactoryEvent`

r1's `type FactoryEvent` is a **closed union**; r2 **extends it additively** with exactly two,
handled by the **same pure `onEvent`** (F1/P-IX):

| event | `onEvent` effect on `FactoryState` | not |
|-------|------------------------------------|-----|
| **`gate0_open`** | sets a **Gate-0-open flag** → the overlay/Gate-0 face **rises**, the lane **holds** for a human decision | never *advances* Gate 0; emits no program admission |
| **`roadmap_row_done`** | **redraw** + **re-enter Gate 0**: `current` → the **next eligible row** (deps `done`), `gate0` → a human `WAIT` | never *fires* the next row's gate 1 (that awaits the human Gate-0 approve); **never re-enters a `merged`/`done` row** |

These are the **redraw triggers** P-IX names ("Layer-C events … that push a Layer-C redraw"); they
are **events, not new log records** (D3 — the log union is unchanged; a row close lands in the log
as a `gate-completion` at `gate:"gate0"` of the *previous* row + a fresh `gate0_open`/`wait`).

**Guarantee:** because a `gate0_open`/`roadmap_row_done` is the **only** Layer-C trigger, **no
poll can exist** (SC-005 — the timer/socket grep stays green).

---

## Entity 4 — The headless roadmap twin (E4 / US3 / FR-007, FR-008) · P-V/P-VI lifted

r1's `kiln/ui/twin.ts` (`printHeadless` / `disabledUi` / `blocksOn`) is **extended** so a
disabled surface also handles Layer C:

| surface absent | behavior (rule) |
|----------------|-----------------|
| **overlay missing** | **print the roadmap table** (the *same* rows/status/deps `renderOverlay` shows — one source of truth) |
| **Gate 0 reached headless** | **print the program + emit a `wait`** (token + deadline) — **never a `gate0: approved`** |
| **`blocked` report** | `blocksOn` **extends**: a missing Layer C still reports an **open Gate 0 / open row-gate** |

**Guarantee `F-GATE0-BLOCK` (SC-002/SC-003 / P-V/P-VI):** with **no UI**, Gate 0 is **recorded,
never resolved** — a broken no-silent-approval path that *would* auto-approve a missing Gate 0 is
a **test vector** that makes the emitted log **FAIL 001's `kiln/validate/log.ts`** with a named
reason (R3, "no-silent-approval," `checkDecisions` already flags a `gate-completion` at
`gate:"gate0"` lacking a `decidedBy`).

---

## Entity 5 — The program head r2 renders (001 shape, imported) · `RoadmapHead` / `Gate0`

Not new — **001's** `RoadmapHead` / `Gate0` in `kiln/src/types.ts`, validated by
**`kiln/validate/roadmap.ts`** (M1–M4). r2 **renders** the head in `[specs/ROADMAP.md](../../ROADMAP.md)`:

| field | value r2 renders (admitted program) | guard |
|-------|--------------------------------------|-------|
| `gate0.status` | `approved` (admitted; `human@batorfi`, `2026-09-13`) | M3: an `approved` head must carry `rows / decided_by / at` |
| `rows` / `ordering` | `r1..r6`, `["r1".."r6"]` | M1: ids resolve; no unresolved/cyclic `deps` |
| `chain_unattended` | `false` (the safe default; FR-010) | — |
| a row's `status`/`gate`/`outcome` | `queued` (r2) → `active`+`gate` (in-flight) → `done`+`outcome:@PR#N` | M4: `gate` iff `active`; `outcome` iff `done` |

A head that **fails `roadmap.ts`** (e.g. an `approved` without a human record, or an unresolved/
cyclic `deps`) is a **validator failure surfaced to the human** — the overlay **renders what it is
given** and does **not** admit it (edge case "a roadmap head that fails `roadmap.ts`").

---

## Entity 6 — OverlayCReady (E6 / US5 / FR-011, FR-014) · the falsifiable probe

A **static `node --test` probe** at **`kiln/validate/overlay-ready.ts`** — the **extension of
r1's `runtime-ready.ts`** (composing on its checks):

| assert | names |
|--------|-------|
| (a) the **overlay + Gate-0 face + twin exist and are wired** into `kiln/ui/` + `kiln/index.ts` | the missing/stubbed element |
| (b) they **render deterministically** (a captured `state` ⇒ byte-identical overlay) **and block a headless Gate 0** (a missing overlay prints + `WAIT`s, never admits) | the broken render / the auto-advance hole |
| (c) the overlay module graph **pulls no cloud** (zero-network scan, P-VIII) | the offending import |

**Guarantee `F-OVERLAYREADY` (SC-006):** **PASS** only when all three hold; **FAIL, naming the
broken element**, when exactly one is removed/broken. It **advances no gate, admits no program, runs
no *real* feature** — a *probe*, not a *walk* (the r1 SC-006 analogue, P-VI).

---

## Cross-entity invariants r2 makes true (success-criteria proof map)

| SC | proven by |
|----|-----------|
| SC-001 (every row listed; exactly one in-flight "at gate—HERE") | E1 `F-OVERLAY` render over `roadmap`/`current` (§5.1) |
| SC-002 (0 per-gate moves at Gate 0; 0 gate0 moves at a per-gate card; disjoint vocabularies) | E2 + `moveVocabulary("gate0")` (G1; NC2/D2) |
| SC-003 (100% of complete program walks PASS 001's `log.ts`; broken auto-approve FAILs) | E4 `F-GATE0-BLOCK` + E2/E3 (gate-0 `gate-completion` PASSES; broken vector FAILs R3) |
| SC-004 (unattended tail stops at each row's PR; a `merged`/`done` row re-entered 0 times) | E3 `roadmap_row_done` + E5 `chain_unattended:false` (FR-009/FR-010) |
| SC-005 (every redraw event-triggered; 0 timer/socket/server; identical state ⇒ identical render; disabled prints + blocks) | E1/E3 `F-OVERLAY` + E3 events |
| SC-006 (OverlayCReady falsifiable; 0 cloud round-trips) | E6 `F-OVERLAYREADY` + zero-network scan |
| SC-007 (0 program admissions / 0 gate-advances inside r2; r2 doesn't self-admit) | E2/E4 render-only + `specs/ROADMAP.md` holds the human admission |

**Constitution traceability (FR-009-analogue):** each of E1–E6 carries a **trace note** naming its
principle(s) — **P-IX** (E1/E3, event-driven additive overlay), **P-V/P-VI** (E2/E4, Gate 0
human-only + the headless print-and-`WAIT`), **P-VII** (E5/P-VII, the decision in the log + the
`ROADMAP.md` head), **P-VIII** (E6, zero-network) — so a downstream gate and r3's FiringReady-
style checks verify compliance from the emitted log + the rendered head.
