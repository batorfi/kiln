# Research & Resolved Unknowns: 003-kiln-roadmap-overlay (r2 — the Layer C roadmap overlay)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-09-13
· **Program**: [specs/ROADMAP.md](../../ROADMAP.md) (`gate0.status: approved`; r2 `deps: [r1]`)

Phase 0 output. **There are no `NEEDS CLARIFICATION` items** — every spec-level unknown was
resolved upstream: **001's research (U1–U8)** (the canonical TS + `node --test` + JSONL + zero-
dependency substrate), **r1's research (D1–D8)** (the runtime modules + the dogfood boundary), and
this spec's **Clarifications NC1–NC3** (Layer-C testability / Gate-0 face shape / Gate-0 record
encoding). What a UI row *must still pin* is the **overlay-realization** of the already-declared
contracts — *how* Layer C, the Gate-0 face, and the twin are built to *satisfy* P-IX/P-V/P-VI,
not *whether*. Those choices are D1–D8 below; each is a decision the Phase 1 modules and
quickstart scenarios depend on.

**The one open planning item, resolved here (not a NEEDS CLARIFICATION): the `M` keymap + overlay
sizing** (`ui-layers-deep.md §11#5`) — folded into **§D6** as a low-risk lean default so the
overlay's *what* is unblocked; the final key/size stays a `tasks.md`/`implement` tweak.

---

## Decisions extracted (what the overlay must pin)

| ID | Overlay-realization question | Type | Resolved in |
|----|------------------------------|------|-------------|
| D1 | How Layer C realizes "the roadmap zoom-out" as a pure render over one `FactoryState`, additive to A/B | precedent/best-practice | §D1 |
| D2 | The Gate-0 face: a **distinct** Layer-C face rendering the canonical `moveVocabulary("gate0")`, never a per-gate card (NC2) | design/constraint | §D2 |
| D3 | A Gate-0 decision rides **additively** on 001's `gate-completion` at `gate:"gate0"` — no new log record type (NC3) | design/constraint/integration | §D3 |
| D4 | The two new Layer-C **events** (`gate0_open` / `roadmap_row_done`) extend r1's `FactoryEvent` additively; how each mutates `FactoryState` | design | §D4 |
| D5 | The **headless roadmap twin** + print-and-`WAIT` Gate 0 (P-V/P-VI lifted to the program gate) | design/constraint | §D5 |
| D6 | The **`M` keymap vs `?`/`g`**, overlay sizing, and the **inter-row re-entry / unattended-tail-stop** mechanics (P-VI tail) | design | §D6 |
| D7 | **OverlayCReady** as a falsifiable extension of r1's `RuntimeReady`; **file placement under `kiln/`** | structure/best-practice | §D7 |
| D8 | **r2 is additive, judged by 001 + r1** — no re-declaration of the log/roadmap schemas, `move-vocabulary.ts`, `roles.ts`, or r1's `ui/` core | structure/invariant | §D8 |

---

## D1 — Layer C as a pure render over one `FactoryState`, additive to A/B (P-IX)

**Decision:** Layer C is a **render function** `renderOverlay(state: FactoryState): string` over
the **same single `FactoryState`** r1's HUD/Popup draw (001's shape in `kiln/src/types.ts`; r1's
`kiln/ui/*.ts`) — **not** a second store, not a TUI. It lists **every `RoadmapRow`** as
`id / status / short / deps / lane-gate` and **highlights the in-flight row at its current gate**
("HERE", `ui-layers-deep.md §5.1`), mirroring r1's `renderHud`/`renderPopup` as a **pure read**:
a captured identical state yields a **byte-identical** overlay (one source of truth, SC-005). It
is **additive** — it *composes* with Layer A (the footer) and Layer B (the per-gate popup); a
fired event redraws A, B, and C together (FR-002).

**Rationale:** P-IX ("Three surfaces, one `FactoryState`, one event-driven redraw; **one overlay
primitive**"); §5.1 is the canonical "in-flight face." Reusing r1's render pattern keeps Layer C
the *view* — never a second source of truth — and makes SC-005's "identical state → identical
render" provable the way r1 proved it (S5).

**Alternatives considered:**
- **A second state store for the program.** Rejected (P-IX "a distilled read, not a second source
   of truth"; the lane and the surfaces read *the* state, not copies — r1 D7).
- **A live TUI overlay.** Rejected for *r2* (NC1): a *live-model TUI smoke walk* is **r3**, the
    first live proof; r2 renders **structurally** with a print twin.

---

## D2 — The Gate-0 face: a distinct Layer-C face on the canonical `moveVocabulary("gate0")` (NC2)

**Decision:** Gate 0 is rendered on a **distinct Layer-C face** (the roadmap table, `§5.2`), **not**
a reuse of Layer B's per-gate card chrome. Its move set is the **roadmap-level** vocabulary r1/001
already make canonical — **`moveVocabulary("gate0")`** =
`[approve, revise, reject, edit-rows, add-row, drop-row]` (`kiln/contracts/move-vocabulary.ts`) —
where the human-facing *admission* moves are **`approve` / `revise (w/ director)` / `reject`** and
the **program-edit** moves are **`edit-rows / add-row / drop-row`** (exactly the set the admitted
program in `specs/ROADMAP.md` advertises for Gate 0). A **per-gate 1–9 move is never accepted at
Gate 0**, and a `gate0` move is **never accepted at a per-gate card** — the two vocabularies are
**disjoint** (G1: `gate0 ≠ gate`; SC-002).

**Rationale:** NC2 pins a *distinct face* because the Gate-0 set is *program-level*, and the
constitution forbids conflating `gate0` with `gate` ("never conflated in state or in the move
vocabulary"). Importing `moveVocabulary("gate0")` keeps the face **canonical, not re-declared**
(the same invariant r1 kept for the per-gate sets, G3).

**Alternatives considered:**
- **Reuse Layer-B's per-gate card with a `roadmap` payload.** Rejected (NC2): its chrome implies
  a per-gate move set + artifact-summary; Gate 0's set is *disjoint* and *program*-shaped.
- **Re-declare a `gate0` move set in r2.** Rejected: `move-vocabulary.ts` **already** defines it
    (D8 — 001 is canonical; r2 imports, never re-declares).

---

## D3 — A Gate-0 decision rides additively on 001's `gate-completion` at `gate:"gate0"` (NC3)

**Decision:** a human **Gate-0 decision** is recorded as **001's existing `gate-completion`
record** with **`gate: "gate0"`**, `move ∈ moveVocabulary("gate0")`, a **non-empty
`decidedBy: human@…`**, and a `cost` — **no new factory-log record type.** r1's validator
(`kiln/validate/log.ts`, `checkDecisions`) **already** treats `gate === "gate0"` as `validGate`
and G3-checks the move against `moveVocabulary("gate0")`; the R3 no-silent-approval guard
already requires a human `decidedBy` for an approving move. The **authoritative *state*** of the
admission is **`ROADMAP.md`'s `gate0` block** (`status / rows / decided_by / at`), validated by
`kiln/validate/roadmap.ts` (M3/M4); the **log** carries the matching `gate-completion` (P-VII).
**`roadmap_row_done` is an *event*, not a new log record** (see D4).

**Rationale:** NC3 pins "additive, no new record type → '001 declares, r2 runs, r2 judged by
001.'" A `gate-completion at gate:"gate0"` is the *minimal* realization 001's validator **already
accepts**, so r2's emitted log **PASSES `kiln/validate/log.ts` unchanged** (FR-005/SC-003) and the
broken auto-approve vector **FAILs it** (no `decidedBy` → R3). A new record type would re-declare
001's union (the "001 is canonical" invariant, D8).

**Alternatives considered:**
- **A fresh `gate0-decision` / `roadmap_row_done` log record type.** Rejected (NC3/D8): it
   *supersedes* 001's `recordType` union, breaking the additive contract and the dogfood.
- **Record the Gate-0 decision *only* in `ROADMAP.md` (no log entry).** Rejected (P-VII):
     "everything is in the log" — the decision must also be a `gate-completion` so a closed
    terminal reconstructs it *from the log alone*.

---

## D4 — The two new Layer-C events extend r1's `FactoryEvent` additively

**Decision:** r1's `kiln/ui/factory-state.ts` exports `type FactoryEvent` as a closed union
(`transition | gate-open | gate-resolve | cost | wait | snapshot`). r2 **extends it
additively** with exactly two — **`gate0_open`** (raises the overlay / Gate-0 face;
`onEvent` sets a Gate-0-open flag, holding for the human) and **`roadmap_row_done`** (pushes a
Layer-C redraw **and re-enters Gate 0** — `current` moves to the **next eligible row**, `gate0`
returns to a human `WAIT`). Both are handled by the **same pure `onEvent`** r1 already has
(event ⇒ new state; F1, P-IX); no timer/socket is added. **`roadmap_row_done` *renders* a row
close a human effected** — it never *fires* a next row's gate 1 (that awaits the human Gate-0
approve, D2/D6). The events are the redraw *triggers* P-IX names ("Layer-C events … `gate0_open`
/ `roadmap_row_done` that push a Layer-C redraw"); they are **not** new log records (D3).

**Rationale:** P-IX explicitly names these as the Layer-C events; folding them into r1's single
event channel keeps **one channel, one store** (r1 NC3) and makes "redraw only on a fired event"
(SC-005) provable: a `gate0_open`/`roadmap_row_done` is the *only* Layer-C trigger, so no poll can
exist. Keeping `roadmap_row_done` as an event — not a record — preserves the log union (D3) while
still landing its *effect* (a re-entered Gate 0 = a fresh `gate0_open`/`wait`) into the log (P-VII).

**Alternatives considered:**
- **A general "poll for next row" loop.** Rejected *out of hand* (P-IX: no poll; SC-005 greps for
  `setInterval`/`setTimeout`).
- **Two new log record types.** Rejected (D3/NC3 — additive, no new type).

---

## D5 — The headless roadmap twin: print the program; Gate 0 prints-and-`WAIT`s (P-V/P-VI)

**Decision:** r1's `kiln/ui/twin.ts` (`printHeadless` / `disabledUi`) is **extended** so a
disabled surface also **prints the Layer-C roadmap table** (the *same* rows/status/deps
`renderOverlay` would show — one source of truth) and **prints the Gate-0 face as a `WAIT`**
(a resume token + deadline) — **Gate 0 is the one no-exception gate: it prints-and-waits, it
never auto-advances and never auto-admits a row.** `blocks` (r1's `blocksOn`) is **extended** so a
*missing* Layer C still reports an **open Gate 0 / open row-gate** — a missing overlay **hides the
view, never the decision**. A **broken** path that would auto-approve a missing Gate 0 is the
**negative test vector** that makes the emitted log **FAIL 001's `log.ts`** (SC-002→SC-003).

**Rationale:** P-V ("a missing UI may **hide** a gate or roadmap row, but may **never silently
approve** it") **lifted to the program gate by P-VI** (`gate-block` by default; even headless, Gate
0 *prints* the table and *waits*). This is the *guard* the rest of r2 buys, and it reuses r1's
twin so the headless contract is one surface, not a third.

**Alternatives considered:**
- **Auto-advance a row when "obvious."** Rejected *out of hand* (P-V/P-VI's exact anti-pattern;
   Gate 0 is the most expensive decision of all).
- **Re-implement a separate print path for Layer C.** Rejected: r1's `disabledUi` is the *one*
   twin; extending it keeps "a missing surface hides the view, never the decision" as one rule.

---

## D6 — The `M` keymap, overlay sizing, and the inter-row re-entry / unattended-tail stop

**Decision (keymap/size — the one resolved planning spike, `ui-layers-deep.md §11#5`):**
`M` (proposed) **raises Layer C**; `g` opens Layer B (kept); `?` toggles. There is **no conflict**
because each key raises a **distinct surface** (A footer is always-on; B/C are overlays raised by
`g`/`M`), and overlays are mutually exclusive (one overlay up at a time). **Sizing**: a **wide
full-width overlay** (the §5.1 table) is the lean default — a compact "strip" variant is a pure
render tweak, deferred to `tasks.md`/`implement`. This resolves the spike so the overlay's *what*
is unblocked; the exact key/anchor stays a low-risk `implement` choice (`keymap.ts`, §D6 — **not** an E-entity).

**Decision (inter-row — P-VI tail, FR-009/FR-010):** on a `roadmap_row_done`, Gate 0 **re-opens**;
**`chain_unattended: false`** (the safe default) **stops at one row's closing PR** and hands the
program back to Gate 0; chaining is **opt-in, logged, and veto-liftable** — when on, a **line-of-
defense veto** (critic objection / reviewer `restart` / verifier `reject` / checkpoint overflow)
**halts the cruise** and **Gate 0 is re-validated** at the boundary. A **`merged`/`done` row is
never re-entered** — inter-feature progression **waits on Gate 0** ("never re-enters a completed
row"). This **composes on r1's gate-level unattended tail** (r1's `preDelegation`/veto) at the
*program* level: r2 adds the *program-level* stop-and-re-enter, not a new tail.

**Rationale:** the keymap/size are the *only* open item in §11 and are low-risk (a key binding; a
render shape); resolving them here unblocks `tasks.md` without touching the load-bearing guards. The
inter-row mechanics are the *program* half of P-VI/P-V and must preserve the row-level guarantees
r1 already enforces.

**Alternatives considered:**
- **Defer the keymap entirely out of the plan.** Rejected: §11#5 asks *which key*; an unresolved
   `M`-vs-`?`-vs-`g` conflict would stall `tasks.md`/`implement` with no lean default.
- **Auto-chain across rows by default.** Rejected (P-VI: cross-row chaining is *opt-in, logged,
   veto-liftable*; the safe default *stops at one feature's PR* — the constitution's Roadmap
   invariant).

---

## D7 — OverlayCReady: a falsifiable extension of r1's `RuntimeReady` (US5) + placement

**Decision:** **OverlayCReady** is a **static `node --test` probe**, the **extension of
r1's `kiln/validate/runtime-ready.ts`**, that asserts: (a) the **overlay + Gate-0 face + twin
exist and are wired** into `kiln/ui/` and `kiln/index.ts`; (b) they **render deterministically**
(a captured `state` ⇒ a byte-identical overlay) **and block a headless Gate 0** (a missing overlay
prints + `WAIT`s, never admits); and (c) the overlay module graph **pulls no cloud** (the same
zero-network scan). It **advances no gate, admits no program, runs no *real* feature** — a *probe*,
not a *walk*. Falsifiable: remove/break one element → **FAIL, naming it** (SC-006). Placement:
**`kiln/validate/overlay-ready.ts`**, composing on r1's `runtime-ready.ts` (importing its checks
so the overlay probe *includes* the spine checks it now builds on).

**Rationale:** "the OverlayCReady analogue of r1's SC-006" (spec US5 *why*); reusing r1's probe
shape keeps **one local CI story** and lets OverlayCReady *compose on* FiringReady (001) →
RuntimeReady (r1) → OverlayCReady (r2). It renders **no program admission** (P-VI).

**Alternatives considered:**
- **OverlayCReady *fires a real overlay* as proof.** Rejected (a probe, not a walk; it would
    start to *run* the program r2 must not).
- **A separate probe ignoring r1's checks.** Rejected: the overlay *relies on* the spine, so its
   probe must **compose** on `runtime-ready.ts`, not duplicate the zero-network/wiring scan.

---

## D8 — r2 is additive; it is *judged by* 001 and r1, not a re-declaration

**Decision:** r2 **imports, it does not re-declare** — the `FactoryState / RoadmapRow / RoadmapHead
/ Gate0 / FactoryRecord` shapes in `kiln/src/types.ts`, **001's two JSON schemas**
(`kiln/schemas/factory-log.schema.json`, `kiln/schemas/roadmap.schema.json`),
**`kiln/contracts/move-vocabulary.ts`** (`moveVocabulary("gate0")`), **`kiln/src/roles.ts`**,
and **r1's `kiln/ui/{hud,popup,twin,factory-state}.ts`** are reused/extended, **not copied**. r2's
**emitted log** is judged by **001's unmodified `kiln/validate/log.ts`** (the gate-0
`gate-completion` PASSES — D3) and the program head it **renders** is judged by
**`kiln/validate/roadmap.ts`** (M3/M4). "001 declares → r1 runs the spine + A/B → **r2 renders
Layer C and is judged by 001 + r1**."

**Rationale:** this is the invariant r1 established (001 canonical, r1 additive-and-judged-by-001);
r2 extends it one level. Keeping the overlay *additive* (D3/D4) is what lets it be *judged by* its
ancestors without re-declaring them — and is why the overlay's "no new record type" choice (D3)
keeps the dogfood green.

**Alternatives considered:**
- **Fork/rewrite 001's + r1's shapes for a "cleaner" overlay.** Rejected: breaks the
   ancestor-canonical chain and the dogfood ("judged by, not re-declared").
- **A new overlay schema.** Rejected: the roadmap schema already exists (`roadmap.schema.json`);
   r2 *renders and validates against* it.

---

## Summary of resolved decisions

- **D1** → Layer C = a **pure `renderOverlay(state)`** over the **one `FactoryState`**,
   **additive** to A/B; in-flight row highlighted at its gate (P-IX/§5.1; SC-005).
- **D2** → a **distinct Layer-C Gate-0 face** on the **canonical `moveVocabulary("gate0")`**
    (`approve/revise/reject` + `edit-rows/add-row/drop-row`), **never** a per-gate card (`gate0
   ≠ gate`; SC-002).
- **D3** → a Gate-0 decision rides **additively on 001's `gate-completion` at `gate:"gate0"`**
     (no new log record type); the authoritative state is `ROADMAP.md`'s `gate0` block; the
    emitted log PASSES 001's validator; "001 declares → r2 judged by 001."
- **D4** → two **additive events** on r1's `FactoryEvent`: **`gate0_open`** (raise + hold) and
     **`roadmap_row_done`** (redraw + re-enter Gate 0); no poll; they are *events*, not records.
- **D5** → the **headless twin** prints the roadmap table and **Gate 0 prints-and-`WAIT`s**
    (P-V/P-VI lifted to the program gate); the broken auto-approve vector FAILs the log.
- **D6** → `M`/`g`/`?` keymap + wide-overlay sizing resolved **here** (low risk); inter-row
    **re-entry + `chain_unattended:false` stop-at-one-PR + veto-liftable tail** compose on r1.
- **D7** → **OverlayCReady** = falsifiable **extension of r1's `runtime-ready.ts`** at
    `kiln/validate/overlay-ready.ts`; no gate advanced, no program admitted (SC-006).
- **D8** → r2 is **additive** — it imports 001's + r1's shapes and is **judged by**
     `kiln/validate/log.ts` + `kiln/validate/roadmap.ts`, re-declaring **nothing**.
