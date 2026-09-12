# KILN — the UI layers, in depth

> Companion to `20260911-concept.md`. The status layer that replaces the old
> dashboard — the three surfaces described as **UI concepts**. Three surfaces
> read one shared `FactoryState` and one event stream: **Layer A = Flow HUD**
> (persistent footer), **Layer B = Flow Popup** (per-gate modal overlay),
> **Layer C = Roadmap overlay** (deliverable-level zoom-out, the new surface).
> One rule governs them all: **never poll, never run a server**.
> Date: 2026-09-11 · status: concept (pre-implementation).

> **What a "surface" is here.** Each surface is a rendering driven by the same
> `FactoryState`; this doc describes each surface and the concepts behind it
> (it used to carry ASCII mock-ups, now removed — prose, tables, and the type
> definitions below are the spec). Layer A and B are per-feature (the per-feature
> lane); Layer C is **one level up** — it shows the **roadmap** (the ordered,
> human-approved firing program of a deliverable) and where the current
> implementation sits in it. The headless fallback for every layer is a printed
> ledger form, **never a silent approval**.

---

## 1. The three surfaces, at a glance

Three surfaces, one `FactoryState`, one **event-driven** redraw. A `pi.on(...)`
handler recomputes the snapshot and redraws on each event; a gate-open event
raises the relevant popup/overlay; in headless mode each surface degrades to a
printed ledger form, and **a missing surface never silently approves a gate —
Gate 0 included**.

| Layer | surface | scope | mechanism |
| ----- | ------- | ----- | --------- |
| A | Flow HUD | per-feature lane | `ctx.ui.setStatus(slot)` footer |
| B | Flow Popup | per-feature lane | `ctx.ui.custom(fn,{overlay})` modal |
| C | Roadmap overlay | deliverable | `ctx.ui.custom(fn,{overlay})` zoom-out |
| (fallback) | headless ledger | any | printed `WAIT` / roadmap rows |

Confirmed UI primitives (read this session):

| surface | API | precedent |
| ------- | --- | --------- |
| persistent footer slot | `ctx.ui.setStatus(slot, themedText)` | `status-line.ts` |
| live spinner | `ctx.ui.setWorkingIndicator(opts)` | `working-indicator.ts` |
| current model | `ctx.ui` model slot | `model-status.ts` |
| modal overlay | `ctx.ui.custom(fn,{overlay,overlayOptions})` | `doom-overlay/` |
| gate decision | `ctx.ui.select([...])` / `ctx.ui.confirm` | `permission-gate.ts` |
| headless detect | `ctx.hasUI`, `ctx.ui.headless` | `permission-gate.ts` |

---

## 2. Shared FactoryState (drives all three layers)

One object, mutated by events, read by redraws. **`roadmap` + `current` are
Layer-C fields; `gate0`/`rail` carry the gate state** (`gate0` is the
pre-lane **Gate 0 — Roadmap**; the per-feature `rail` is Gates 1–9).

```ts
interface FactoryState {
  resident:    { model: string; tier: string } | null;    // head in the lane
  running:     { duId: string; role: string } | null;      // current DU
  queue:     QueueEntry[];                                // depth-N, ordered
  switches:  number;                                       // switch-tax counter
  wallClock: string;                                       // "HH:MM"
  // --- Layer C (roadmap) + Gate 0 ---
  roadmap:   RoadmapRow[];                                 // the deliverable's firing program
  current:   string;                                        // in-flight roadmap row id
  gate0:     Gate;                                         // Gate 0 -- Roadmap (pre-lane)
  gate?:     Gate;                                         // open per-feature gate (1-9)
}
interface RoadmapRow {
  id:       string;       // r1, r2, ...
  short:    string;       // one-line human description
  status:   "not-started" | "in-flight" | "pr" | "merged";
  deps:     string[];     // other row ids this row waits on
  gate?:    number;       // current gate (1-9) while in-flight
}
```

Events that mutate it (`pi.on`): `turn_start`, `turn_end`, `agent_end`,
`tool_call`, `session_start`, plus two Layer-C events — `gate0_open` /
`roadmap_row_done` — that push a Layer-C redraw. Each event handler recomputes
the snapshot and pushes a HUD redraw; a gate-open event also pushes a popup
open; a Gate-0-open event also pushes the Roadmap overlay.

---

## 3. Layer A — Flow HUD (always-on, per-feature lane)

**Description.** A persistent footer, redrawn on every event. Three fixed slots
show the *resident model / role*, the *current task + step rail* (the nine
per-feature gates), and *wall clock + switch tax*. It is the cheapest surface,
kept live while the human works with the director. **Per-feature scope:** it
shows the in-flight row's own Gates 1–9; the *deliverable* view is Layer C.

The footer carries four lines:

- **model/role** — the resident head (`* qwen3-32b (CODE)`), the head in the lane.
- **task / steps** — the in-flight task and its gate rail, e.g.
  `T003 worker  1v 2v 3* 4v 5v 6- 7- 8- 9-`.
- **rail / gate** — `gate: --`, the wall clock (`12:47`), and the switch-tax
  count (`4 switches today`).
- **feature in flight** — the current roadmap row id + short description,
  e.g. `r3 "rate-limit / quota per key" (of r1..r5)`; added for Layer C so the
  per-feature HUD stays anchored to the deliverable.

The step rail uses one single-width glyph per gate — compact and safe for a
monospaced footer:

| glyph | meaning |
| ----- | -------- |
| `v` | done |
| `*` | current (the `working-indicator` spinner when the head is streaming) |
| `-` | pending |
| `+` | open gate |

Example `1v 2v 3* 4v 5v 6- 7- 8- 9-` = gates 1–2 done, 3 current, 6–9 pending,
nothing open.

Slot 1 doubles as the `model-status` "head in lane" readout; the `*` is the
`working-indicator` spinner when the head is streaming. The `feature in flight`
line is added for Layer C — it names the current roadmap row by id + short
description, so the per-feature HUD stays anchored to the deliverable.

---

## 4. Layer B — Flow Popup (modal overlay, per-feature lane)

**Description.** The old dashboard's "you were away, here's a gate" role, as a
modal that auto-rises when a gate opens. One overlay, two faces — *closed /
on-demand* and *open-gate* — driven by the same `ctx.ui.custom` primitive
`doom-overlay` uses. It returns the human's move via `ctx.ui.select([...])`,
so the popup is itself a gate decision surface. **Per-feature scope:** a *gate
card* of Gates 1–9 of one in-flight row; the *pre-lane* Gate 0 card is Layer C.

### 4.1 Closed / on-demand face

The popup shows the gate rail (one glyph per gate, §3), a current-gate pointer
(`current: PLAN / 9 of this row`), the lane (head + `* streaming` + task), the
queue (`7 pending / next = qwen3-8b x3`, switch-tax flagged), the wall clock +
today's switches, and `gate: --` with `[no per-feature gate open]` when nothing
is awaiting a decision.

### 4.2 Open-gate face (a Gate 1–9 gate card)

When a per-feature gate opens, the popup carries:

- **gate rail**: `1v 2v 3* 4v 5v 6- 7- 8- 9-` (done / current / pending).
- **artifact**: e.g. `plan.md` — *read by a subagent, not loaded whole*.
- **summary**: `4 tasks: T003, T004, T005, T006  est 12:07 wall`.
- **critical deps**: `T006 depends on T005, T004 (reviewer path)`.
- **switches**: `3 today (qwen3-8b -> qwen3-32b for review)`.
- **decision** (via `ctx.ui.select`):
  - `[approve]` proceed to the checkpoint gate
  - `[revise]` bounce a task / spec back with notes
  - `[reject]` drop the feature

The artifact (`plan.md`, `arch.md`, `concept.md`, `verification-report.md`) is
**read by a subagent and summarized**, never loaded whole into the popup —
keeps the overlay small and the popup state cheap.

### 4.3 Gate-face variants (move set differs per per-feature gate)

| Gate | Move set | note |
| ---- | -------- | ---- |
| CONCEPT / SPEC / CHECKPOINT / DOCS / PR | `[approve] [revise] [reject]` | the standard decision set |
| REVIEW | `[approve] [restart]` | line-of-defense; **reviewer never edits the artifact**; **restart feature, no revise** |
| VERIFICATION | `[approve] [reject]` | line-of-defense; **harness auto-mitigates**; `reject → mitigation loop, ≤ 2` |

---

## 5. Layer C — Roadmap overlay (deliverable-level, NEW)

**Description.** A zoom-out, above Layers A and B. Where A and B show *one
feature's* lane, Layer C shows the whole **roadmap** — the ordered, human-
approved **firing program** for a deliverable (Layer C's `roadmap: RoadmapRow[]`
in §2). It renders every feature **row** with a *one-line short description*,
its **status** (`not-started / in-flight / PR / merged`), its `deps`, and where
the implementation sits *right now* — the in-flight row highlighted at its
**current gate**. It is **additive**: it composes with A (the footer, per-lane)
and B (the per-gate popup), it does not replace them. It also carries **Gate 0
— Roadmap**, the *pre-lane* human decision that approves the firing program
*before* any row's Gates 1–9 run. **Headless: it degrades to the roadmap table
printed to the ledger** — a missing overlay never hides or auto-approves Gate 0.

### 5.1 Roadmap overlay — in-flight face

The overlay lists every roadmap row with `id / status / short / deps / lane-gate`
and highlights the in-flight row. Example deliverable **"rate-limit the public
API"**, Gate 0 approved for `r1..r5` at `12:47`, 4 switches today:

| id | status | short | deps | lane / gate |
| -- | ------ | ----- | ---- | ----------- |
| r1 | merged | register / verify e-mail (auth) | — | done |
| r2 | merged | API-key issuance + rotation | r1 | done |
| **r3** | **in-flight** | *"rate-limit / quota per key"* | r2 | **Spec / 9 — HERE** |
| r4 | pending | billing metering + usage report | r3 | waits r3 |
| r5 | pending | usage dashboard (client) | r4 | waits r4 |

The **unattended tail** stops at r3's PR (inter-feature → back to Gate 0).
Per-row controls remain: **per-row veto still halts**, a **per-row gate report**
is emitted, and **Gate 0 is re-validated at each boundary**.

### 5.2 Roadmap overlay — Gate 0 face (pre-lane, human-only)

Before `r1..r5` run, Gate 0 shows the **proposed firing program**, *drafted with
the human by the director but not yet approved* (no lane has run yet):

| id | short | depends on | size (est) |
| -- | ----- | ---------- | ---------- |
| r1 | register / verify e-mail | — | M |
| r2 | API-key issuance + rotation | r1 | M |
| r3 | rate-limit / quota per key | r2 | L |
| r4 | billing metering + usage report | r3 | L |
| r5 | usage dashboard | r4 | S |

The **director proposes; the human decides** (author / judge separation — the
roadmap is a human-owned, machine-editable *proposal*; the human authors it *with*
the director and approves it; the agent never auto-fills or auto-approves). The
move set is:

- `[approve roadmap]` lock the order + rows; start r1's lane
- `[revise w/ director]` reorder / split / coarsen with the director
- `[reject]` restart the breakdown

**Gate 0 is a human gate even headless (a durable WAIT)** — nothing auto-
approves the roadmap. Each approved row then runs its own Gates 1–9; **Gate 0
re-enters at every inter-feature boundary**.

### 5.3 Layer C headless fallback (the roadmap table form)

When `!ctx.hasUI`, Layer C cannot rise, so the **roadmap degrades to a table
printed to the factory-log / ledger** — the firing program and its Gate-0
decision recorded, never auto-approved (e.g. a printed row
`gate0 = approved@12:03 rows=r1..r5 decided_by=human@token`). The roadmap table
is printed and **Gate 0 stays a human WAIT** — a missing Layer C never hides or
auto-approves Gate 0.

---

## 6. Auto-pop at gate (event-driven, the popups' job)

**Description.** The popups (B + C) *replace* the old dashboard's "you were
away, here's a gate" role. **Layer B** auto-rises when a per-feature gate
(1–9) opens; **Layer C** auto-rises when **Gate 0** opens (pre-lane, or at an
inter-feature boundary). The lane WAITS for the human decision while a card is
up; the human's only job is to *decide, not poll*.

| key | action |
| --- | ------ |
| `g` | open Layer B Flow Popup (per-gate, human-initiated) |
| `M` | open Layer C Roadmap overlay (deliverable; **proposed keymap**) |
| `?` | toggle open / close |
| `q` | quit |
| `Esc` | close (only when **not** sitting on a gate) |
| `Enter` | approve / select the default move |
| `R` | restart / reject (**gate-context-dependent**) |
| `[ ]` | previous / next gate (navigate history) |

Keybinding precedent: `timed-confirm` / `confirm-destructive` / `question.ts`.

---

## 7. Headless path (CI / cron / no UI) — the no-silent-approval contract

**Description.** When `!ctx.hasUI`, *no surface can rise*, so every gate — *both
the per-feature Gates 1–9 and the pre-lane Gate 0* — degrades to a ledger row
carrying a **resume token + deadline** (the `timed-confirm` precedent), and
**Layer C degrades to the roadmap table (§5.3)**. The single-lane invariant stays
intact: the lane still waits, it just *records* the wait instead of *drawing*
it (e.g. a `gate_plan.token deadline=+00:30` WAIT row, while a completed row
reads `T003 done -- r2.log`). **A missing overlay may hide a gate or a roadmap
row; it may never silently approve one — including Gate 0.**

Policy: **`gate-block` — block by default; `--headless` is required to proceed.**

---

## 8. Data flow (events -> state -> surfaces)

The `pi` event stream (`turn_start`, `turn_end`, `agent_end`, `tool_call`,
`session_start`, plus Layer-C `gate0_open` / `roadmap_row_done`) flows into
`pi.on` handlers. Each handler recomputes `FactoryState` — including
`roadmap` / `current` — and pushes a redraw:

- `ctx.ui.setStatus` → the **Layer A** footer slots.
- `ctx.ui.custom` → the **Layer B** gate popup.
- `ctx.ui.custom` → the **Layer C** roadmap overlay; **if headless, the roadmap
  is printed as a table instead** (no overlay rises).

A gate decision — **Gate 0 or Gates 1–9** — is one `ctx.ui.select([...])` that
resolves to a `Promise<move>`. The move is applied to gate/rail state, then
yields the **next DU / next gate**; at every **inter-feature boundary**
**Gate 0 re-enters** for the next row.

---

## 9. Invariants

**Per-surface / per-layer**
- **Always-on but cheap.** Layer A is an event-driven footer; it does not cost
  model calls or block the lane.
- **One overlay primitive.** Closed/informational and open-gate (and the Gate-0
  face) are faces of *one* `ctx.ui.custom`, so a missing UI never *inadvertently*
  auto-advances.
- **Summarized, not loaded whole.** Gate artifacts are summarized by a subagent
  before they reach a popup/overlay.
- **Headless = ledger, not auto-approve** — and now explicitly the **roadmap is
  a printed, human-recorded table, not an auto-advancing roadmap.**
- **Never re-enters a completed row.** The roadmap can't auto-restart a
  `merged` row; inter-feature progression waits on Gate 0.

**Roadmap / Layer C**
- **Gate 0 is before all nine.** The per-feature Gates 1–9 keep their numbers;
  Gate 0 is a separate *pre-lane* human gate that approves the firing program
  and re-enters at every inter-feature boundary.
- **One row = one full lane.** Each roadmap row, once approved, runs its own
  Gates 1–9 exactly as a standalone feature; the overlay only *frames* the
  sequence.
- **In-flight is visible.** The overlay always shows *where* the implementation is
  (current row + current gate); a missing overlay degrades to a printed table.
- **No auto-approve of the roadmap.** Layer C's headless fallback records, never
  decides; the human authors the roadmap *with* the director and approves it.
- **Inter-feature unattended default = one PR.** A roadmap-level unattended run
  stops at each row's PR; chaining across rows is a separately authorized, higher-
  risk move that still preserves per-row veto-still-halts, per-row reports, and
  Gate-0 re-validation.

---

## 10. API risk stratification (UI track)

| API | status | mitigation |
| --- | ------ | ---------- |
| `ctx.ui.setStatus` | confirmed | none |
| `ctx.ui.setWorkingIndicator` | confirmed | none |
| `ctx.ui.select` | confirmed | none (gate moves / Gate 0 moves) |
| `ctx.ui.notify(msg, level)` | confirmed | none |
| `ctx.ui.custom(overlay)` | confirmed (doom) | use doom's overlay skeleton |
| `ctx.hasUI` / `ctx.ui.headless` | confirmed | none |
| `handoff.ts` yield/reclaim | **spike** | adapt its lane switch; read P0 |
| overlay `Component` type | **spike** | doom's custom component is template |
| `ctx.ui.confirm(...)` | **spike** | fall back to `ctx.ui.select` |
| Layer C keybinding (`M`) | **spike** | final key vs `?`/`g`; confirm TUI key layer |

---

## 11. Open questions (UI)

1. Does `ctx.ui.custom` overlay survive a `turn_end` / compaction, or must it be
   re-registered each event? (affects the redraw strategy.)
2. Can the overlay host `ctx.ui.select` directly, or must moves be wired through
   the overlay's own key handler?
3. Exact overlay `anchor`/`width`/`maxHeight` options for a full-width modal.
4. `ctx.ui.confirm` vs `ctx.ui.select` for the simple two-move gates (§4.3 verify).
5. **Layer C sizing:** one wide overlay listing all rows (§5.1) vs a compact
   strip (like Layer A) — and the keymap conflict between a Layer-C key (`M`) and
   the per-gate `g`/`?`.
6. **Gate-0 face:** does Gate 0 reuse the Layer-B gate-card chrome (§4.2) with a
   `roadmap` payload, or is it a distinct Layer-C face (§5.2)?
7. **Roadmap-as-artifact:** is `ROADMAP.md` a first-class on-disk artifact
   (analogous to `context.md`) or a derived projection of `factory-log` rows?
