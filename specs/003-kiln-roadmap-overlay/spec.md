# Feature Specification: KILN Layer C — the Roadmap Overlay (the program-level zoom-out)

**Feature Branch**: `003-kiln-roadmap-overlay`

**Created**: 2026-09-13

**Status**: Draft (clarified 2026-09-13 — NC1–NC3 resolved to lean defaults; see the Clarifications section below)

**Input**: User description: "scaffold the next feature spec for the layer-C overlay row" — roadmap
row **r2** in [specs/ROADMAP.md](../../ROADMAP.md), `deps: [r1]`, deferred out of r1 by r1's
**NC1**.

**Scope resolution (the decisions this scaffold makes, and the ones it leaves open):**
- **This is roadmap row r2 — *the road*, not the kiln.** r1 (`002-kiln-lane`) built the
   runtime **spine** — the single lane, the gate primitive, the log-writer, the affinity
   scheduler — and its two *per-lane* surfaces: **Layer A (Flow HUD)** and **Layer B (Flow
   Popup)**, each a pure read of one shared `FactoryState` redrawn on a fired event with a
   headless *print* twin (r1's US5/P-IX). This row draws **Layer C (the Roadmap overlay)**:
   the one surface that shows the *program itself* — the ordered, human-admitted firing list
   (`roadmap: RoadmapRow[]` in `FactoryState`, admitted at Gate 0 in
   [specs/ROADMAP.md](../../ROADMAP.md)) — and where the in-flight row sits *right now*, at
   its current gate. Layer C is **one level up** from A/B and **composes** with them (it does
   not replace the footer or the per-gate popup).
- **It also carries Gate 0 — the one gate the constitution refuses to silence.** Layer C is the
   surface for **Gate 0 (Roadmap)**: the *pre-lane* human decision that *admits the program*
   (its rows, order, and dependencies) **and** the human gate that **re-enters at every
   inter-row seam** when a `roadmap_row_done` fire lands (Principle VI, `gate0 ≠ gate`). Its
   move set is **roadmap-level** (`approve roadmap / revise-with-director / reject`), *not*
   any per-gate 1–9 set; the two are **never conflated** in state or in the move vocabulary
   (constitution, *The Roadmap (Gate 0) invariants*).
- **Dogfood, headless-first, no cloud — extended to Gate 0.** r1 proved the spine with a
   deterministic stub resident; **r2 proves Layer C the same way** — a **structural / headless
   render test** (a pure `renderOverlay(state)` string + a **printed roadmap-table twin**), not
   a live-model TUI smoke walk (NC1; a *live* proof is r3's territory). The load-bearing
   invariant r2 realises is **P-V + P-VI lifted to the program gate**: with no UI, Layer C
   **prints the roadmap table and `gate0` prints-and-`WAIT`s — it never silently admits a row,
   never auto-advances, never re-enters a `merged` row**. A broken no-silent-approval path
   (one that *would* let a missing overlay advance Gate 0) must **FAIL** the emitted-log
   replay through 001's `kiln/validate/log` with a named reason (SC-003 analogue).
- **Additive, never re-declaring.** r2 **imports, it does not re-declare**: the
   `FactoryState` / `RoadmapRow` / `RoadmapHead` / `Gate0` shapes in `kiln/src/types.ts`, the
   two JSON schemas in `kiln/schemas/`, and 001's `kiln/validate/log.ts` + `kiln/validate/roadmap.ts`
   stay **canonical**. r2 *extends* r1's `FactoryEvent` union with two Layer-C events
   (`gate0_open`, `roadmap_row_done`) and **proposes** a thin **additive** record encoding for a
   Gate-0 decision (NC3) that 001's core R1–R6 union **still accepts** — it adds a program-
   decision record, it does **not** rewrite 001's log. Per **P-VI / FR-012**, drawing the
   program **does not admit it**: the admission stays the human record in `specs/ROADMAP.md`
   (`gate0.status: approved`); Layer C *renders* a decision the human made, it never makes one.

> **Resolved decisions (NC1–NC3, 2026-09-13; full Q/A in the Clarifications section below).**
>  Three genuine choices opened at scaffold time, then **confirmed** to their lean defaults
>   — the same convention r1 used for its NC1–NC4 (each is a now-**applied** decision; the
>  `[lean: …]` tag on each bullet records its **confirmed answer**):
> - **NC1 (Layer C testability).** Is Layer C's proof an interactive-TUI smoke test, or a
>    **structural / headless render test** (a pure `renderOverlay(state)` string + a printed
>    roadmap-table **twin**, like r1's A/B)? [lean: **structural/headless render + print twin** —
>     P-IX's testable half; a *live-model* TUI walk is r3.]
> - **NC2 (Gate-0 face shape).** Does Gate 0 **reuse Layer-B's gate-card chrome** with a
>    `roadmap` payload, or is it a **distinct Layer-C face** (the roadmap table, §5.2)?
>   [lean: **a distinct Layer-C Gate-0 face** — its move set is *roadmap-level*, and the
>    constitution forbids conflating `gate0` with `gate` (P-VI).]
> - **NC3 (Gate-0 record encoding without rewriting 001's log).** Does a Gate-0 decision ride
>      on a **new/fresh log record type that supersedes 001's union**, or on an **additive**
>      encoding that 001's core R1–R6 validator **still accepts**? [lean: **additive — a Gate-0
>       decision is a `human-decision` at `gate:"0"` plus the `ROADMAP.md` head's `gate0` block;
>        r2 adds no new log record type, so "001 declares, r2 runs, r2 is judged by 001" holds.**]
>
> **Context.** r1 (`002-kiln-lane`) delivered the **runtime spine + the two per-lane surfaces**
>    (Layers A/B) over one shared `FactoryState`, with a **headless print twin** and the
>   `RuntimeReady` probe (US5/US6) — and it **deferred Layer C** by NC1, naming r2. This row is
>   the **compositional UI that draws the program r1 belongs to**; it is judged **by** 001's
>   validators (`kiln/validate/log.ts` for the log, `kiln/validate/roadmap.ts` for the
>   program head) and **extends** r1's event-driven `FactoryState` surfaces (it imports r1's
>   `ui/factory-state.ts` / `ui/twin.ts`, not a re-declaration). Per KILN principle III/IX,
>   Layer C is **one surface over one `FactoryState`, redrawn only on events, no poll, no
>   server**; per P-VI it is the surface of the *program gate* that **nothing auto-approves**.
>
> This spec is written for the **human operator** who admits the program and decides Gate 0,
> and for the **line-of-defense reviewers / verifier** who judge Layer C. It states *what* the
> overlay and its Gate-0 face must do and *why* — per Principle IX (event-driven, no
> server/poll; the overlay degrades to a printed roadmap table) and Principle VII (a Gate-0
> decision and every `roadmap_row_done` land in the factory-log the row itself writes) and
> Principle VI (Gate 0 is the one human-only, always, non-silenceable gate).

## Clarifications

### Session 2026-09-13

- **Q (NC1):** Is Layer C proved interactively (a live TUI smoke walk) or by a structural /
  headless render + print twin?
  → A: **Structural / headless** — a pure `renderOverlay(state)` string plus a printed roadmap-
   table twin (P-IX's testable half, mirroring r1's A/B). A **live-model TUI smoke walk** is a
   later row (r3's proof). Keeps r2 independently testable and local-first (P-VIII).
- **Q (NC2):** Does the Gate-0 face reuse Layer-B's per-gate chrome, or is it a distinct Layer-C
  face?
  → A: **A distinct Layer-C Gate-0 face** (the roadmap table, §5.2). Its move set is *program-
   level* (`approve roadmap / revise-w/ director / reject`); the constitution forbids conflating
    `gate0` with `gate`, so the per-gate card is the wrong chrome.
- **Q (NC3):** How does a Gate-0 decision land in the log without rewriting 001's record union?
  → A: **Additively** — a Gate-0 decision is a **`human-decision` at `gate:"0"`** plus the
   `ROADMAP.md` head's `gate0` block (`status / rows / decided_by / at`). r2 **adds no new log
   record type**, so 001's core R1–R6 validator still accepts the emitted log, and the
    "001 declares → r2 runs → r2 judged by 001" chain holds. (`roadmap_row_done` is an *event*
     that re-enters Gate 0 and pushes a redraw; it is not a new log record either.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — The Layer C Roadmap overlay: the program-level zoom-out over one FactoryState (Priority: P1)

Layer C is the **one surface above Layers A and B**: where A shows *one feature's* footer and B
shows *one gate's* card, C shows the **whole firing program** — the `roadmap: RoadmapRow[]` r2
renders with **`id / status / short / deps / lane-gate`** per row and the **in-flight row
highlighted at its current gate** (the "HERE" marker, §5.1). It is **additive**: it *composes*
with A (the footer) and B (the per-gate popup) — it does not replace either — and like them it
reads **one shared `FactoryState`** and redraws **only on a fired factory event** (never by
polling, never from a server; P-IX). A new **`roadmap_row_done`** event **pushes a redraw**
(a row closed; the program advanced one notch) and, through US4, **re-enters Gate 0**.

**Why this priority**: This is the *deliverable-level* half of P-IX ("Layer C = the Roadmap
overlay, the deliverable-level zoom-out, a new surface") and the load-baring surface r1
**deferred by NC1**. Without it there is no program-level view — only per-lane ones. P1 — it is
the row's reason for existing and the surface US2 (its Gate-0 face) and US3 (its headless twin)
build on.

**Independent Test**: **Render Layer C** from a `FactoryState` carrying a multi-row `roadmap`
with one `active` row at a gate and assert: (a) `renderOverlay(state)` is a **pure read** — a
**captured identical** state yields an **identical** overlay string (one source of truth,
mirror of r1's SC-005); (b) the **in-flight row is highlighted at its current gate** and every
other row shows `status / deps / "waits <dep>"` as in §5.1; (c) an **inspection / grep over
`kiln/ui/*.ts` finds no `setInterval`/`setTimeout`, no socket, no server** (P-IX, the testable
half of "redraw only on events"); (d) a fired **`roadmap_row_done`** event updates the
`FactoryState` and Layer C **redraws** from it.

**Acceptance Scenarios**:

1. **Given** a `roadmap` of five rows `r1…r5` with `r3` **active at gate 3** and the rest
  `queued/done`, **When** `renderOverlay(state)` runs, **Then** it lists all five rows by
   `id / status / short / deps` and **highlights `r3` at "gate 3 — HERE"**, with `r4`/`r5`
    reading "waits r3" / "waits r4" (§5.1, SC-001).
2. **Given** a captured `state S`, **When** `renderOverlay(S)` is invoked **twice**, **Then**
   the overlay string is **byte-identical** both times — a **distilled read, one source of
   truth**, not a second store (P-IX / SC-005 analogue).
3. **Given** the layer-C code, **When** inspected for timers/sockets/servers, **Then** **0**
   `setInterval`/`setTimeout`, **0** sockets, **0** servers appear — every redraw is event-
   triggered and `roadmap_row_done` is the redraw trigger, not a poll.
4. **Given** Layer C *and* A/B live together, **When** a fired event renders, **Then** the
   footer (A) and gate popup (B) and overlay (C) **all recompute from the one `FactoryState`**
   — C *composes* with A/B, it does not hide or replace them (additive, P-IX).

---

### User Story 2 — The Gate 0 face: the pre-lane + inter-row human decision surface (Priority: P1)

Layer C **carries Gate 0** — the *program* gate the constitution treats as **the one that no
exception may silence** (P-VI). **Before** `r1..rN` run, Gate 0 shows the **proposed program**
(*drafted with the human by the director, not yet admitted*); **at every inter-row seam** (`a
`roadmap_row_done` fire) it **re-enters** for the next row. Its move vocabulary is **roadmap-
level** — `[approve roadmap]` (lock the order + rows; start the next lane), `[revise w/
director]` (reorder / split / coarsen), `[reject]` (restart the breakdown) — **distinct from
any per-gate 1–9 set** (the constitution: `gate0 ≠ gate`, "never conflated in state or in the
move vocabulary"). The overlay **auto-rises when a `gate0_open` event fires** (a new Layer-C
event, r1's US6 `gate-open` at the program level), holding the lane for the human; the human's
only job is to **decide, not poll**.

**Why this priority**: This is **P-VI realised as a surface** — "Gate 0 is human-only, always,"
and "no path reaches a row's gate 1 without a human Gate 0 approve recorded in the log." It is
the load-bearing *human* half of what makes a firing program trustworthy, and it is inseparable
from the overlay (US1). P1 — the row exists to let a human **see and admit the program**, not
merely to watch a lane.

**Independent Test**: (a) **Pre-lane** — render Gate 0's face over a `roadmap` with
`gate0.status: pending` and assert it shows the **proposed** program and the **roadmap-level**
move set `approve / revise / reject` (never a per-gate set). (b) **A human `approve roadmap`
move** carries a **non-empty `decidedBy: human@…`**, flips the `gate0` head to
`approved`, and is recorded as a **`human-decision` at `gate:"0"`** (NC3) — **and the emitted
log PASSES 001's `kiln/validate/log`** (dogfood). (c) **The auto-pop** — a `gate0_open` event
**raises the overlay**; with no UI the overlay **prints and `WAIT`s** (US3 / P-VI).

**Acceptance Scenarios**:

1. **Given** a `roadmap` with `gate0.status: pending`, **When** the Gate-0 face renders,
  **Then** it shows the **proposed** rows with the move set `[approve roadmap] / [revise w/
  director] / [reject]` — **never** a per-gate 1–9 set (`gate0 ≠ gate`, SC-002).
2. **Given** an open Gate-0 and a human `approve roadmap` with `decidedBy: human@…`, **When**
  applied, **Then** the `gate0` head flips to **`approved`** (`rows / decided_by / at`), and a
   **`human-decision` at `gate:"0"`** is emitted; the resulting log **PASSES
  `kiln/validate/log`** (SC-003 dogfood). A `revise`/`reject` move **holds the program open**
   (re-bounds with the director / restarts the breakdown), never silently advancing.
3. **Given** Gate 0 with **no UI present**, **When** `gate0_open` fires, **Then** the overlay
   **prints the program and `WAIT`s** — it **never** emits a `gate0: approved` move on its own
   (P-VI; the headless half of US3).
4. **Given** a human event whose move `∉ {approve roadmap, revise, reject}`, **When** applied
   at Gate 0, **Then** it is **rejected as illegal** and the program stays open (move integrity,
    the program-level analogue of r1's G3).

---

### User Story 3 — The headless roadmap twin: print the program; Gate 0 prints-and-`WAIT`s (Priority: P1)

When **no UI is present**, **Layer C cannot rise**, so — like r1's A/B twin — it **degrades to
the roadmap printed as a table to the factory-log / ledger**, and **Gate 0 specifically
*prints-and-`WAIT`s rather than auto-advancing*** (the constitution's P-V "the exact opposite of
a missing-UI silent approval," and P-VI for the program gate). A **missing overlay may hide a
roadmap row or the Gate-0 face; it may *never* silently admit a row or the program.** This is
the load-bearing **no-silent-approval invariant, lifted from r1's per-gate contract (P-V) to the
program level (P-VI)** — "recorded, never resolved."

**Why this priority**: P-VI + P-V are what make an *unattended* firing honest *at the program
level*; a `gate0` that auto-advanced on a missing overlay would be the single most dangerous
failure the constitution names. P1 — it is the *guard* the rest of r2 buys.

**Independent Test**: **Disable the overlay** and (a) assert the **printed roadmap table**
carries the **same** rows/status/deps the overlay would render (one source of truth; the twin
matches, cf. r1's S5); (b) with **no UI and no human move**, assert **exactly one `wait`-class
`gate0` WAIT** is emitted and **no `gate0: approved`** is produced — a **broken** path that
*would* let a missing overlay admit a row is a test vector that **makes the emitted log FAIL
001's `kiln/validate/log`** with a **named reason** (SC-002→SC-003 analogue).

**Acceptance Scenarios**:

1. **Given** the overlay **disabled**, **When** the program renders, **Then** the **roadmap
   table is printed** with the identical rows/`status`/`deps` the overlay would show — the
    *twin*, not a second source (a missing Layer C hides the view, never the data).
2. **Given** `gate0_open` with **no UI and no human move**, **When** the lane reaches Gate 0,
   **Then** it **prints the program and emits a `WAIT`** (token + deadline) and **never a
   `gate0: approved`** — a program gate that ran with no human present is **recorded, not
   resolved** (P-VI / P-V, SC-002).
3. **Given** a **broken** no-silent-approval path that would **auto-`approve`** a missing Gate 0,
   **When** its emitted log is replayed, **Then** it **FAILS `kiln/validate/log`** with a
   **named reason** (the broken vector, the SC-003 negative).

---

### User Story 4 — Inter-row re-entry: `roadmap_row_done` re-opens Gate 0; the unattended tail stops at one row's PR (Priority: P2)

Each `RoadmapRow` is **one full Gates 1–9 lane**; when a row reaches its closing PR a
**`roadmap_row_done`** event fires, which **re-opens Gate 0 between rows** (the inter-row seam)
and **pushes a Layer-C redraw** ("the program advanced one notch"). The **chaining across rows
is *off* by default** (`chain_unattended: false` — the safe default *stops at one feature's PR*
and hands the program back to Gate 0); cross-row chaining is **opt-in, logged, and
veto-liftable**, and it **preserves per-row veto-still-halts, per-row gate reports, and Gate-0
re-validation**. A **`merged`** row is **never re-entered** — inter-feature progression *waits
on Gate 0*, it does not auto-restart a done row.

**Why this priority**: This is the *program's* liveness discipline — each row is a whole firing
and the seam between them is a **human** re-admission. Valuable and constitution-mandated
(P-VI, the Roadmap invariants) but it builds *on* the overlay (US1) and its Gate-0 face (US2),
so it is one priority below them; on its own it presumes the overlay and the face already exist.
P2.

**Independent Test**: Drive a **two-row** program through `roadmap_row_done` for row 1 and
assert: (a) the seam **re-opens `gate0`** (it returns to a human WAIT) before row 2 is eligible;
(b) with `chain_unattended: false`, the unattended tail **stops at row 1's PR** and does **not**
begin row 2; (c) with chaining **opted in and logged**, the tail proceeds but a **line-of-
defense veto in row 2 still halts** and **Gate 0 is re-validated**; (d) a **`merged`** row,
once done, is **never re-entered** by a `roadmap_row_done` for it.

**Acceptance Scenarios**:

1. **Given** a completed row 1 (`status: done`, `outcome: @PR#N`) and row 2
   `deps: [r1]`, **When** `roadmap_row_done` fires, **Then** **Gate 0 re-opens** (a
   program-level WAIT) and **row 2 does not begin** until a human **re-admits** it (the seam,
    P-VI — SC-004).
2. **Given** `chain_unattended: false` (the default), **When** the unattended tail runs,
   **Then** it **stops at row 1's closing PR** and hands the program back to Gate 0 — it does
   **not** silently start row 2 (the safe default).
3. **Given** chaining **opted in and logged**, **When** row 2 runs and a line-of-defense veto
   (critic objection / reviewer `restart` / verifier `reject` / checkpoint overflow) fires,
   **Then** the **cruise halts and returns to the human**, and **Gate 0 is re-validated** at
   the boundary — auto-proceed authorizes only the *approve side* (P-VI tail rule).
4. **Given** a `merged`/`done` row, **When** a `roadmap_row_done` for *it* arrives, **Then**
   the overlay **does not re-enter it** — inter-feature progression **waits on Gate 0**,
    "never re-enters a completed row" (the constitution's Layer-C invariant).

---

### User Story 5 — OverlayCReady: the falsifiable, cloud-free, no-admission probe (Priority: P3)

The handoff gate out of r2. A **static `node --test`  probe — the **extension of r1's
`RuntimeReady`** — asserts: (a) the **overlay + its Gate-0 face + the headless twin exist and
are wired** into the r1 `kiln/ui/` surface set; (b) they **render deterministically** over one
`FactoryState` (a captured state ⇒ identical render) and **no timer/socket/server exists**
(P-IX); (c) **Gate 0 still blocks headless** (a missing overlay prints-and-WAITS, never admits);
and (d) the runtime + overlay module graph **pulls no cloud** (a zero-network grep, P-VIII). It
**advances no gate, admits no program, and runs no *real* feature** — a *probe*, not a *walk* —
and is **falsifiable** (remove / break one → FAIL, naming it).

**Why this priority**: P3 — it depends on US1–US4 being present; on its own it proves nothing,
but it is the falsifiable proof that "Layer C is drawn *and* its program-gate cannot be
auto-silenced," mirroring r1's "the kiln *fires*" probe.

**Independent Test**: Run **OverlayCReady** with the full overlay present → **PASS**;
**remove or break one** element (the overlay render, its headless twin, or a
Gate-0-can-never-auto-approve path) → **FAIL, naming the missing/broken element**; a
zero-network grep over the UI confirms P-VIII.

**Acceptance Scenarios**:

1. **Given** the overlay + Gate-0 face + twin present and wired, **When** OverlayCReady renders
   the program, renders identically, blocks a headless Gate 0, and greps for cloud, **Then** it
    **PASSES** and emits a **traceability note** mapping each Layer-C piece to its principle(s)
     (P-VI/P-V/IX/VIII — the runtime analogue of FR-009 / r1's SC-006).
2. **Given** the overlay with **its headless twin removed** (or a Gate 0 that *can* auto-
   approve), **When** OverlayCReady runs, **Then** it **FAILs and names the broken element**
   (falsifiable).
3. **Given** the overlay module set, **When** inspected for outbound dependency, **Then** it
   makes **no cloud round-trip** — the row is local-first by construction (P-VIII) — and it
   **admits no program and advances no gate** (P-VI / FR-012).

---

### Edge Cases

- **A missing overlay at Gate 0.** With no UI, **Gate 0 prints the program and `WAIT`s** — it
   *never* auto-admits a row (P-VI); a missing Layer C **hides the face**, it does not silence
   the program gate.
- **A broken no-silent-approval path** that *would* let a missing overlay admit a row. It is a
   **test vector**: the emitted log **FAILS** `kiln/validate/log` with a **named reason**
    (SC-002→SC-003), so the guard is provably enforced, not just declared.
- **An illegal move at Gate 0.** A human event whose move `∉ {approve roadmap, revise, reject}`
   is **rejected**; the program **stays open** — the program-level analogue of r1's G3.
- **`gate0` conflated with `gate`.** A per-gate 1–9 move is **never** accepted at Gate 0, and a
   `gate0` move is **never** accepted at a per-gate card — the two move vocabularies are
   disjoint (the constitution's Gate-0 invariant; NC2's reason for a *distinct* face).
- **Re-entering a `merged` row.** A `roadmap_row_done` for a `done`/`merged` row **does not
   restart it**; inter-feature progression **waits on Gate 0** ("never re-enters a completed
   row").
- **Chaining on vs off.** With `chain_unattended: false` (safe default) the tail **stops at one
   row's PR**; with chaining **opted in + logged** it proceeds but **a line-of-defense veto still
   halts** and **Gate 0 is re-validated** at every boundary — chaining is *veto-liftable*.
- **Overlapping surfaces.** Layer C **composes** with A (footer) + B (popup); a fired event
   redraws **all three** from the **one** `FactoryState` — C never hides or replaces them.
- **A closed terminal mid-program.** Because every `roadmap_row_done` and `gate0` move lands in
   the **log** (P-VII), a closed terminal leaves a **complete, reconstructable trail** of the
   program to the last row / gate it reached; it re-opens at the last `gate0` `WAIT`.
- **Cloud reference.** No overlay / Gate-0 path may require a cloud round-trip; a missing
   outside resource is flagged, not blocking (P-VIII).
- **A roadmap head that fails `roadmap.ts`.** Layer C **renders what it is given**; a row head
   that fails `kiln/validate/roadmap.ts` (e.g. a `gate0.status: approved` with no human record,
   or an unresolved/cyclic `deps`) is a **validator failure surfaced to the human**, not a
   state the overlay admits (001's M1/M3 hold).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST draw **Layer C (the Roadmap overlay)** — a surface *above* Layers
   A/B — rendering **every `RoadmapRow`** with `id / status / short / deps / lane-gate` and
   **highlighting the in-flight row at its current gate** ("HERE"), over **one shared
   `FactoryState`** (`roadmap`, `current`, `gate0`, `gate`).
- **FR-002**: Layer C MUST be **additive** — it **composes** with Layer A (Flow HUD) and Layer B
   (Flow Popup), redrawing all three from the single `FactoryState` on a fired event; it MUST
   **not** replace or hide them.
- **FR-003**: Layer C MUST **redraw only on a fired factory event** — **never by polling, never
   from a server** (P-IX) — and MUST add exactly two **Layer-C events** to r1's `FactoryEvent`
   union: **`gate0_open`** (raises the overlay / Gate-0 face) and **`roadmap_row_done`**
   (pushes a redraw + re-enters Gate 0).
- **FR-004**: Layer C MUST realize the **Gate 0 face** — the **pre-lane and inter-row** program-
   level decision surface — with the **roadmap-level** move vocabulary
   **`[approve roadmap] / [revise w/ director] / [reject]`**, rendered on a **distinct Layer-C
   face** (not a per-gate card; NC2).
- **FR-005**: A Gate-0 decision MUST carry a **non-empty `decidedBy: human@…`** and MUST flip
   the `gate0` head to `approved` (`rows / decided_by / at`); the decision MUST be recorded as a
   **`human-decision` at `gate:"0"`** **additively** (NO new log record type; NC3), and the
    emitted log MUST still **PASS 001's `kiln/validate/log`**.
- **FR-006**: Gate 0 and a per-feature gate MUST be **never conflated** — a per-gate 1–9 move is
   **never** accepted at Gate 0, and a `gate0` move is **never** accepted at a per-gate card
   (the constitution: `gate0 ≠ gate`, disjoint move vocabularies).
- **FR-007**: With **no UI**, Layer C MUST **print the roadmap as a table** (the headless twin;
   the twin's content is **identical** to the overlay's — one source of truth) and **Gate 0
   MUST **print the program and `WAIT`** — a headless program gate is **recorded, never
    resolved** (P-V/P-VI,
    US3).
- **FR-008**: The **no-silent-approval invariant MUST hold at Gate 0**: no path MAY emit a
   `gate0: approved` **without** a `decidedBy: human@…` move **or** a **logged, distinct
   pre-delegation** — and a broken path that *would* do so MUST make the emitted log **FAIL
   `kiln/validate/log`** with a named reason (the producer-side guard, lifted to the program
    gate).
- **FR-009**: On a **`roadmap_row_done`** fire the system MUST **re-open Gate 0 at the inter-row
   seam** and **must not begin the next row** until a human **re-admits** it; **`merged`/`done`
   rows are never re-entered** ("a roadmap can't auto-restart a `merged` row; inter-feature
   progression waits on Gate 0").
- **FR-010**: The **unattended tail MUST default to `chain_unattended: false`** — **stop at one
   row's closing PR** and hand the program back to Gate 0; cross-row chaining is **opt-in,
   logged, and veto-liftable**, and when on MUST **preserve per-row veto-still-halts, per-row
   gate reports, and Gate-0 re-validation** at every boundary.
- **FR-011**: The system MUST provide an **OverlayCReady** static probe (**the extension of
  r1's `RuntimeReady`**) asserting the overlay + Gate-0 face + headless twin **exist and are
  wired**, render **deterministically** over one `FactoryState`, **block a headless Gate 0**, and
   pull **no cloud** — **advancing no gate, admitting no program, running no *real* feature**
    (a *probe*, not a *walk*).
- **FR-012**: Every Layer-C path MUST be **local-first / cloud-independent** (P-VIII): **no path
   may require a cloud round-trip**, and a missing outside resource MUST be expressible as a
   **flagged, non-blocking** record — the overlay and its twin degrade to a **print**, never a
    network call for the program.
- **FR-013**: Each Layer-C piece MUST carry a **constitution traceability note** (mapping to
   P-VI/P-V/IX/VIII), and the emitted log MUST remain the **compliance evidence** a closed
   terminal leaves behind (P-VII) — the program's road, reconstructed from the log alone.
- **FR-014**: This row MUST **not itself auto-admit the program or advance Gate 0** — Layer C
   **renders** a decision a **human** made; the admission is the **human record** in
   `specs/ROADMAP.md` (`gate0.status: approved`, `decided_by: human@batorfi`,
   2026-09-13) — the overlay is the one that never made it (Principle VI / FR-012 analogue).

### Key Entities

- **The Layer C Roadmap overlay**: the **program-level surface** above A/B — a **pure render of
   `FactoryState.roadmap / current / gate0 / gate`** listing every row at its status/gate and
   highlighting the in-flight row (US1, P-IX); it *composes* with A/B (additive).
- **The Gate 0 face**: the **pre-lane + inter-row** decision surface Layer C carries — the
   roadmap table with the **roadmap-level** move set `approve roadmap / revise / reject` (US2,
   P-VI); the *one* gate the constitution will not silence.
- **The headless roadmap twin**: the **printed form** of the overlay + the **print-and-`WAIT`**
   Gate 0 (US3, P-V/P-VI) — a missing overlay **hides the view, never the decision**.
- **`roadmap_row_done` / `gate0_open`**: the **two Layer-C events** that extend r1's
   `FactoryEvent` union (US3/US4; FR-003) — one **re-enters Gate 0** and pushes a redraw, the
   other **raises the overlay**.
- **`RoadmapRow` / `RoadmapHead` / `Gate0` / `FactoryState`**: imported from
   `kiln/src/types.ts` and the JSON schemas (001 **canonical**, r2 **does not re-declare** —
   NC3); r2 reads and renders them.
- **The OverlayCReady probe**: the falsifiable **extension of r1's `RuntimeReady`** asserting
   presence + wiring + deterministic render + a blocking headless Gate 0 + no cloud — and that
   r2 **admits no program** (US5, P-VIII/VI).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** of program renders over a multi-row `roadmap` list **every row** by
   `id / status / short / deps` and mark **exactly one in-flight row "at its gate — HERE"**
   with the others showing `waits <dep>` (§5.1) — the zoom-out is complete and unambiguous.
- **SC-002**: **0** per-gate 1–9 moves are ever accepted at Gate 0, and **0** `gate0` moves are
   ever accepted at a per-gate card — the two move vocabularies stay **disjoint** (`gate0 ≠
   gate`); a Gate-0 face shows **only** the roadmap-level set.
- **SC-003**: **100%** of complete program walks whose emitted JSONL is **replayed through
   001's unmodified `kiln/validate/log`** **PASS** (R1–R6, gap-free/well-formed); the
   *broken-no-silent-approval* vector (an auto-admit of a missing Gate 0) **FAILs** with a
    **named reason** — P-V/P-VI enforced at the program gate.
- **SC-004**: With `chain_unattended: false`, the unattended tail **stops at 100% of rows'
   closing PRs** and re-enters **Gate 0** before the next row; a **`merged`/`done` row is
   re-entered 0 times** by a `roadmap_row_done` — no auto-restart of a completed row.
- **SC-005**: **100%** of redraws are **event-triggered** — **0** `setInterval`/`setTimeout`,
   **0** sockets, **0** servers in `kiln/ui/*.ts`; a **captured identical `FactoryState` yields
   a byte-identical Layer-C render** (one source of truth); a **disabled overlay prints the
   program and still `blocks` Gate 0** (P-IX/P-V).
- **SC-006**: The **OverlayCReady** probe is **falsifiable** — it **PASSES** only when the
   overlay + Gate-0 face + twin are present, wired, deterministic, and block a headless Gate 0;
   it **FAILs naming the broken element** when exactly one is removed; a zero-network grep
   confirms **0** cloud round-trips (P-VIII; the r1 SC-006 analogue for Layer C).
- **SC-007**: **0** program admissions and **0** gate-advances occur *inside* r2 — it is local-
   first and **does not admit its own program** (P-VI/FR-012); the admission is the **human
   record** in `specs/ROADMAP.md` (`gate0.status: approved`), validated by
   `kiln/validate/roadmap.ts` (M3/M4).

## Assumptions

- **Substrate.** KILN is a single-lane, gate-railed, **locally-served** factory on the **pi**
   harness with **no cloud dependency** (P-III/VIII). r1 (`002-kiln-lane`) delivered the
   **runtime spine + Layers A/B** over one `FactoryState` with a headless print twin and the
   `RuntimeReady` probe; **r2 (this row) draws Layer C on top**, importing r1's `ui/` — it does
   **not** re-declare `FactoryState`, the schemas, or 001's validators.
- **r1 is the canonical spine (like 001 is the canonical schema).** The `FactoryState` /
   `RoadmapRow` / `RoadmapHead` / `Gate0` shape in `kiln/src/types.ts`, the two JSON schemas,
   `kiln/validate/log.ts`, `kiln/validate/roadmap.ts`, `kiln/contracts/move-vocabulary.ts`, and
   r1's `kiln/ui/{hud,popup,twin,factory-state}.ts` are **imported, not re-declared**; r2
   *extends* r1's event union **additively**.
- **NC1 (Layer C testability) — lean default.** Layer C is proved by a **structural / headless
   render test** (a pure `renderOverlay(state)` string + a printed roadmap-table **twin**),
   mirroring r1's A/B; a **live-model TUI smoke walk** is **r3** (the first "live proof"), not
   r2. Keeps r2 independently testable and local-first.
- **NC2 (Gate-0 face shape) — lean default.** Gate 0 is a **distinct Layer-C face** (the roadmap
   table, §5.2) with its **roadmap-level** move set — not a reuse of Layer-B's per-gate chrome —
   because `gate0 ≠ gate` and the two are "never conflated."
- **NC3 (Gate-0 record encoding) — lean default.** A Gate-0 decision is a **`human-decision`
   at `gate:"0"`** plus the `ROADMAP.md` head's `gate0` block; r2 **adds no new log record type**,
   so 001's core R1–R6 validator still accepts the emitted log ("001 declares, r2 runs, r2
   judged by 001"); `roadmap_row_done` is an **event**, not a new record.
- **Guidance vs. law.** The UI concept (`docs/concepts/ui-layers-deep.md`) is **guidance**; the
   **constitution governs** where they disagree. `ui-layers-deep.md §11` open questions #5
   (overlay sizing / keymap `M`) and #6/#7 (Gate-0 face / roadmap-as-artifact) are resolved
   **here** by NC2 (distinct Gate-0 face), NC3 (roadmap-as-on-disk artifact, 001 canonical), —
   the `M` keymap stays a **planning spike** (r2's US1/US2 surface the *what*; the key
   binding is a `?`/`g`-conflict decision for `plan.md`).
- **Dates.** Constitution ratified 2026-09-12; this spec and r2's draft are 2026-09-13,
   continuing r1's lineage. r1's program (`gate0.status: approved`) is dated 2026-09-13.

## Out of Scope

- **Layer C as a live TUI smoke walk** (an interactive overlay driven by a real model) — that is
   **r3** (the first live-model proof); r2 proves Layer C **structurally/headless** (NC1).
- **The *content* of the program's later rows** (row-specific specs for anything beyond r2) —
   Gate 0 authors and admits them; r2 is one *row of the program*, not the program.
- **Any cloud backend / web dashboard** — KILN has none (P-VIII); the overlay + its twin are
   **print** forms, never a server.
- **Advancing Gate 0 or auto-admitting the program** — a **human move** (P-VI); the admission
   is the record in `specs/ROADMAP.md` (`gate0.status: approved`, `human@batorfi`).
- Modifying or replacing **001's or r1's canonical** shapes (the schemas,
   `kiln/src/types.ts`, `kiln/validate/*`, r1's `ui/` core) — r2 is **additive** (NC3); a log
   record-type change to *host* Gate 0 would be its own row, not r2.
- The **overlay `M` keybinding** final choice vs `?`/`g` and the overlay **sizing** (wide
   table vs a compact strip, `ui-layers-deep.md §11#5`) — a **planning spike** for `plan.md`.

## Traceability to the Constitution

- **Principle I (author / judge sep.)** → FR-005/FR-008/FR-014 (Layer C *renders* the program
   the human admits; the **Gate-0 decision** is a human move — the overlay never decides it; a
   broken auto-approve path FAILs dogfood) — US2/US3.
- **Principle V (headless never silently approves)** → FR-007/FR-008/SC-002/SC-003 (with no UI,
   Gate 0 **prints the program and `WAIT`s**; the no-silent-approval invariant **lifted to the
   program gate**, enforced at the producer; a broken path **FAILs the log** with a named reason)
   — US3.
- **Principle VI (Gate 0 human-only, always)** → FR-004/FR-006/FR-009/FR-014/SC-002/SC-004/
   SC-007 (Gate 0 is the one non-silenceable gate; `gate0 ≠ gate`; `roadmap_row_done`
   **re-opens** it; a `merged` row is **never re-entered**; r2 **does not admit its own
   program**) — US2/US4.
- **Principle VII (everything in the log)** → FR-013 (a `gate0` move and every
   `roadmap_row_done` **land in the log** reconstructed from it alone; the twin is a print of
   recorded state) — US3.
- **Principle IX (three layers, event-driven, no server)** → FR-001/FR-002/FR-003/FR-011/
   SC-005 (Layer C is the **third** surface over **one** `FactoryState`; **additive**; redraw
   **only on events**; a **headless print twin**; no timer/socket/server) — US1/US5.
- **Principle III/VIII (single lane · local-first)** → FR-012/SC-006/SC-007 (the overlay + twin
   pull **no cloud** and admit **no program**; the overlay is a *view*, the lane stays one) —
   US5.
- **Governance / FR-009-analogue** → FR-013/SC-007 (each Layer-C piece carries a constitution
   traceability note; the emitted log + the `ROADMAP.md` head are the **audit** a gate verifies
   compliance from; `kiln/validate/roadmap.ts` M3/M4 guards the `gate0` head).
