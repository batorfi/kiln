# Feature Specification: KILN Live Walk — the first live-model smoke walk (one feature, end-to-end, Gates 1–9)

**Feature Branch**: `004-kiln-live-walk`

**Created**: 2026-09-16

**Status**: **Draft (clarified 2026-09-16 — NC1–NC3 resolved; see the Clarifications section
below).** R3 is roadmap row **r3** in
[specs/ROADMAP.md](../../ROADMAP.md), re-admitted at the 2026-09-15 seam as the **admitted
next-to-fire** row. The human (`human@batorfi`) ran r3's clarify pass on 2026-09-16 and resolved
**NC1 / NC2 / NC3** (recorded below). R3 is still **not begun**: its lane has no live gate yet,
so per **M4** it stays `queued` (not `active`) until it starts. Nothing here admits a program,
advances a gate, or fires the live model on its own (P-VI / FR-014/SC-007).

**Input**: the **kiln-v1** firing program row **r3** in
[specs/ROADMAP.md](../../ROADMAP.md):

> **r3** short "first live-model smoke walk — one feature end-to-end (Gates 1–9) on a local
>model", `deps: [r1]`, `status: queued`, re-admitted at the 2026-09-15 seam.

**Scope resolution (the decisions this scaffold makes, and how the three clarifications resolved
them):**
- **This is the row that first breaks the "prove it with a stub" convention.** r1
    (`002-kiln-lane`) proved the runtime spine with a **deterministic stub resident**
    (`kiln/src/stub-resident.ts`, NC2-stub) and r2 (`003-kiln-roadmap-overlay`) proved **Layer C**
    with a **structural/headless render + print twin** (both **NC1-deferred the live proof to r3**).
    R3 is the **first genuinely "live" row**: it drives the lane with a **real local-model resident**
   through one feature end-to-end (Gates 1–9) and runs the **live TUI smoke of Layers A/B/C** the
    earlier rows stood in for. R3 is therefore the row that *breaks* P-VIII's "prove the walk with
  a stub" standing convention and must re-establish a **live but still local-first** proof.
- **Live, and guaranteed — with a *recorded* `--stub` toggle (NC2).** Per the human's 2026-09-16
   decision a **real local-model resident is guaranteed** in r3's environment, so the **live path is
  the primary proof**. A `--stub` toggle **also** exists (local-first reproducibility, P-VIII): when
  selected it runs the r1 stub **with the fallback *recorded*, never a silent stand-in.** "Live,
   but still no cloud" holds regardless of the toggle.
- **A throwaway smoke feature (NC1).** Per the human's 2026-09-16 decision, the feature that
   *walks* the kiln is a **deliberate, deliberately-tiny throwaway feature** — chosen only to
    **exercise all nine gates cheaply**, not any of the later program rows (r4–r6) and not a
    self-referential "the kiln builds a kiln" dogfood. It is one full firing that r1/r2 already left
   open for r3.
- **It also clears the deferred live TUI smoke of Layers A/B/C (NC3).** R3 runs the **live-TUI
   proof** r1 and r2 **NC1-deferred** (a real `ctx.ui` Layer A/B/C surface set, event-driven, P-IX,
   over one shared `FactoryState`, with a headless **print-and-`WAIT` at Gate 0** twin) — the exact
   debt r3 was named to clear.
- **One row = one full lane, judged by 001/r1/r2, not them.** R3 is **one firing** — one full
   Gates-1-through-9 pass over the throwaway feature — and is **judged by** the same unmodified
    `kiln/validate/log.ts` (R1–R6, no-silent-approval), `kiln/validate/roadmap.ts` (M1–M4), and
   r1/r2's `runtime-ready` / `overlay-ready` probes. R3 is **additive**: it must not rewrite 001's
   log union or r1/r2's canonical shapes; like r2 it *extends* additively (a live-model resident
   impl + a live-walk sibling + a live TUI twin), never re-declares.
- **The load-bearing invariant r3 realizes, live.** r1 proved "a clean walk PASSES the log and a
   broken auto-approve FAILs it by name"; r3 proves the **same** on the **live model + live TUI**
   the stub stood in for — so the no-silent-approval net (P-V/P-VI), the affinity/switch cost
    (P-IV), the strongest-defence tiering (P-II), and the single-lane invariant (P-III) are all
   exercised **for real**, with a genuine human `decidedBy` resolving the gates that previously sat
   as a recorded `wait`.

> **This spec is a DRAFT, now clarified, for the human's gate-1 sign-off.** It states *what* r3
> must prove and *why* — per Principle VIII (live, guaranteed, but still local-first; the optional
> `--stub` toggle is *recorded*, never a silent stand-in), Principle I (no model approves its own
> work — r3's live walk still resolves each gate on a **human** move, not a model), Principle VII
> (the live walk's transitions + gate completions land in the factory-log the row itself writes),
> and Principle VI (r3 never self-admits its *own* program; the program it fires is the one already
> admitted in `specs/ROADMAP.md`). **NC1–NC3 are resolved (2026-09-16); this draft is ready for the
> human's `/speckit.plan`.**
>
> **Context.** r1 delivered the **runtime spine + Layers A/B** over one `FactoryState` with a
> headless print twin and `RuntimeReady`; r2 delivered **Layer C + its headless twin + a blocking
> headless Gate 0** and both **NC1-deferred** the *live* proof to r3. R3 is that deferred **live
> proof**: the first time the kiln fires on a **real resident** and through the **live TUI**, the
> very thing the earlier rows stood in for with stubs. Per the constitution/roadmap, r3's lane has
> **no live gate yet** (so it is *admitted but not begun*, `queued`, not `active` — M4).

## Clarifications

### Session 2026-09-16 (RESOLVED by human@batorfi)

- **Q (NC1) — *What* is the smoke-walk feature?** The feature that walks the kiln through the full
   Gates 1–9. **RESOLVED: (B) a deliberate throwaway feature** — a tiny one-off chosen *only* to
   exercise all nine gates cheaply. **Not** a self-referential "the kiln builds a kiln" dogfood,
   **not** a later program row (r4–r6) walked early. It is one full firing the kiln already owes
   r3.
- **Q (NC2) — *Live-model substrate* / local-first fallback.** Is a **real local model** available
   in r3's environment, and what role does the stub play? **RESOLVED: (A+C) a live local model is
   GUARANTEED in r3's environment, and a `--live`/`--stub` toggle is provided.** The **live path is
   the primary proof**; `--stub` runs the r1 stub as a **recorded** fallback for
   reproducibility/dogfood (**never** a silent stand-in — the toggle is logged, P-V/P-VII). Because
   live is guaranteed, the stub is a *toggle*, not an environment-driven fallback (the "flag a
   missing model" path is a belt-and-suspenders guard, not the norm).
- **Q (NC3) — *Does r3 also prove the deferred live TUI smoke walk?*** **RESOLVED: YES** — r3
   clears the r1/r2 **NC1 debt** by running the **live TUI smoke of Layers A/B/C** (a real
   event-driven `ctx.ui` surface over the live walk, with a headless print-and-`WAIT`-at-Gate-0
   twin), in addition to the live-model lane walk.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — One live-model feature, end-to-end, through all nine gates (Priority: P1)

**The story.** The human admits the already-recorded program, and r3 fires the **throwaway smoke
feature** through the **full Gates-1–9 lane on a real, guaranteed local-model resident**, emitting a
factory-log that PASSES 001's `kiln/validate/log.ts` and a broken no-silent-approval path that FAILs
it by name — **the same net r1 proved with a stub, now on the live model, primary.**

**Why this priority**: r3 exists to make the "one lane, held heat, no-silent-approval" thesis true
on the *live* path that every prior row deferred. Without it, the whole factory has only ever been
*proved* against a stand-in.

**Independent Test**: drive the live resident through `kiln/src/walk` (or its live sibling) and
replay the emitted JSONL through `kiln/validate/log.ts` → **PASS**; open the
no-silent-approval hole (a gate-completion with no `decidedBy` / no distinct pre-delegation) → a
**named R3 FAIL**. On the live path (primary); the `--stub` toggle yields the same PASS shape.

**Acceptance Scenarios**:
1. **Given** the guaranteed live local-model resident and the throwaway feature, **When** the lane
   runs the full Gates 1–9 on the live model (`--live`), **Then** the emitted log (transitions, a
   genuine human `decidedBy` per gate, a `cost` bracketing each swap, the unattended-tail
   `pre-delegation`) **PASSES** `kiln/validate/log.ts` (R1–R6).
2. **Given** the same walk with a **no-decider gate-completion** spliced in, **When** replayed,
    **Then** the log **FAILs** with a **named R3 (no-silent-approval)** — the net holds live.
3. **Given** the affinity queue, **When** the walk runs, **Then** the realized switch count equals
    `kiln/src/scheduler.ts` `switchCount` (P-IV), and each line-of-defense role ran on `strongest`
    (P-II / `bindRole`).

---

### User Story 2 — The deferred live TUI smoke walk of Layers A/B/C (Priority: P1, r1/r2 NC1 debt)

**The story.** R3 also fires the **live-TUI** proof r1 and r2 **NC1-deferred** (confirmed in scope,
NC3): a real `ctx.ui` surface set — **Layer A (HUD footer)**, **Layer B (on-demand gate popup)**,
**Layer C (roadmap overlay + its Gate-0 face)** — **redrawn on the live walk's fired events**
(P-IX), reading **one shared `FactoryState`**, with a **headless print twin** that **blocks an open
Gate 0** instead of auto-advancing.

**Why this priority**: this is the *explicit* debt both earlier rows named r3 to clear; it is a
second P1 (NC3), not a nice-to-have.

**Independent Test**: a live event-driven render over the live walk produces, for identical state, a
**byte-identical** overlay (SC-005 analogue); with the UI absent, the twin **prints** the program
and `gate0` **blocks** (F-GATE0-BLOCK analogue). No poll, no server, no timer.

**Acceptance Scenarios**:
1. **Given** a live `FactoryState` over r3's walk, **When** an event fires, **Then** the surface set
   redraws from that one state (event-only; **no `setInterval`/`setTimeout`/socket**, P-IX).
2. **Given** the UI is disabled, **When** Gate 0 opens, **Then** the twin **prints the roadmap table
   and `WAIT`s** at `gate0` — it **never auto-advances** (P-V/P-VI lifted to the program gate).
3. **Given** an identical captured state, **When** rendered twice, **Then** the overlay string is
    **byte-identical** (one source of truth, SC-005).

---

### User Story 3 — A `LiveModelReady` probe: the falsifiable, cloud-free, no-admission proof of the live path (Priority: P2)

**The story.** R3 ships a **falsifiable readiness probe** (`kiln/validate/live-ready`, extending
r1's `runtime-ready` / r2's `overlay-ready`) that asserts the **live path EXISTS, is wired, emits a
PASSES log, and pulls no cloud** — **without admitting the program or advancing a gate** (SC-006
analogue). It runs a walk on the resident (live by default, or the **recorded** `--stub` toggle) and
asserts a broken no-silent-approval path FAILs the log **by name**.

**Why this priority**: r3's *handoff artifact* for r4 (publish) — the proof the live factory "fires";
it is what makes r4's public distribution point trustworthy.

**Independent Test**: the probe PASSes on the emitted walk; each **falsify** hook (point a dep at a
missing file / open the no-silent-approval hole / flip to `--stub` without recording it) **names
itself** and flips `ready=false`; a zero-network scan over the new live code finds **0** cloud
round-trips.

**Acceptance Scenarios**:
1. **Given** the live path wired + a PASSES walk (`--live`, the default), **When** the probe runs,
    **Then** `ready=true` with a per-check trace.
2. **Given** the no-silent-approval hole, **When** the probe runs, **Then** `ready=false` naming a
    **R3** FAIL.
3. **Given** the `--stub` toggle, **When** the row runs, **Then** it still completes and
    **records the toggle** (P-VIII flag-not-block) — a *silent* stand-in (an unlogged swap to stub)
   **fails** the proof, never a silent approve.

---

### Edge Cases

- **`--stub` toggle selected** → r3 runs the r1 stub as a **recorded** fallback (NC2); the toggle
  is logged (P-VII), **never** a silent stand-in for the live resident; the live path remains
  primary (live guaranteed).
- **A missing live model anyway (belt-and-suspenders)** → r3 **flags and records the `--stub`
  fallback**, never silently treating a stand-in as the live proof.
- **A line-of-defense veto during the walk** (critic objection / reviewer `restart` / verifier
  `reject` / checkpoint overflow) → the **cruise halts** and returns the lane to a human
  (P-I/P-V; the net is live, not suspended for the live path).
- **A gate with no human move** → degrades to a **durable `wait`** (`gate/token/deadline`);
   **never** a `gate: approved` (P-V).
- **Gate 0 opens inside/near r3** → r3 **never self-admits its own program**; the program it fires
  is `specs/ROADMAP.md` (`gate0: approved, human@batorfi`), already admitted. R3 **re-opens** Gate 0
  at its own close (the next seam), it does not advance it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** KILN SHALL drive the **throwaway smoke feature** through the full **Gates 1–9 lane on
   a real, guaranteed local-model resident** (`--live`, the default; not the stub), emitting a
   factory-log that PASSES `kiln/validate/log.ts` (R1–R6).
- **FR-002** A **broken no-silent-approval** path on the live walk (a `gate-completion` with no
   human `decidedBy` and no distinct `pre-delegation`) SHALL make the emitted log **FAIL** `log.ts`
   with a **named R3** reason.
- **FR-003** The live walk SHALL keep **at most one resident + one running unit at any instant**
    (`F-SINGLE`, P-III), asserted over the per-step snapshots (as r1's `assertSingleLane`).
- **FR-004** The live walk's realized **switch count** SHALL equal `kiln/src/scheduler.ts`
    `switchCount` for its unit sequence (P-IV), with one `cost` record bracketing each swap.
- **FR-005** Each **line-of-defense** role on the live walk SHALL run on `strongest` (P-II /
    `bindRole`); a weaker binding is a config error the schedule rejects — **live and local alike.**
- **FR-006** A **`--live`/`--stub` toggle** SHALL select the resident: **live is the default/primary
   path** (a live local model is **guaranteed**, NC2); **`--stub`** runs the r1 stub as a
   **recorded** fallback for reproducibility — **never a silent stand-in** (the toggle is logged,
   P-V/P-VII). Any *unlogged* swap to a stand-in is a violation the proof catches.
- **FR-007** The **live TUI smoke** of **Layers A/B/C** (r1/r2 NC1 debt; confirmed in scope by NC3)
   SHALL redraw on the walk's **fired events** only — **no `setInterval`/`setTimeout`, no socket, no
   server** (P-IX).
- **FR-008** With the UI disabled, the **live twin** SHALL **print the roadmap table and `WAIT` at
   an open Gate 0**, never auto-advancing; an identical captured state SHALL yield a **byte-identical**
   render (one source of truth, SC-005).
- **FR-009** R3 SHALL be **additive**: it imports 001's log union, r1's `src/`/`ui/` spine, and
   r2's overlay/face, extending them — **no re-declaration, no log record-type change.**
- **FR-010** R3 SHALL **not admit its own program nor advance Gate 0** (P-VI / FR-014/SC-007); the
   program it fires is the human record in `specs/ROADMAP.md`, and r3 **re-opens** Gate 0 at its
   own close.
- **FR-011** A **line-of-defense veto** on the live path SHALL **halt the cruise** and return the
   lane to a human (P-I/P-V); auto-proceed pre-authorizes only the **approve** side and never silences
   a judge.
- **FR-012** Every live-walk transition, gate completion, and cost SHALL **land in the factory-log**
    (P-VII) so the feature's live journey is reconstructable from the log alone, including the human
    `decidedBy` per gate.
- **FR-013** R3 SHALL ship a falsifiable **`LiveModelReady`** probe (a `--broken` hook names the
   R3 gap; a zero-network scan finds no cloud; a `--stub` toggle is *recorded*, not silent); it
   runs **no gate, no feature admission** (SC-006 analogue) and is the r4 handoff proof.

### Key Entities

- **Live resident (E1)**: under `--live` the primary resident; a real **local-model** adapter
  (model name + a tier/`run` surface), the first *non-stub* `Resident` the lane drives.
- **The live walk (E2)**: `kiln/src/walk.ts`'s live sibling — drives E1 through the throwaway
  feature's Gates 1–9, emitting a PASSES log (and a broken FAIL variant); the dogfood
   `kiln/factory-log/`.
- **The `--live`/`--stub` toggle (E3)**: NC2 — selects E1 (live, default) or the r1 **stub**, with
  the selection **recorded** (never a silent stand-in); `--stub` is the recorded reproducibility path
  since live is guaranteed.
- **The TUI smoke (E4)**: r1/r2's deferred live-TUI proof (NC3) — a real `ctx.ui` Layer A/B/C run
  over E2, event-only, with its headless print/blocking twin (r2's `disabledUi`).
- **LiveModelReady (E5)**: the r3 **falsifiable probe** (extends `runtime-ready`/`overlay-ready`):
  live path present + wired + PASSES-emit + no-cloud + recorded-toggle; a `--broken` hook names the
   R3 gap; a `--stub` toggle is logged, not silent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** — "the kiln fires **live**": r3's emitted live-walk log **PASSES** `kiln/validate/log.ts`
    end-to-end (R1–R6) with a **genuine human `decidedBy`** per gate (vs. r1's stub, vs. a recorded
    `wait`), `--live` as the default.
- **SC-002** — "the net is live": a no-silent-approval hole on the live walk makes the log **FAIL**
    by a **named R3** (the net r1 proved with a stub now holds on the live path).
- **SC-003** — "one lane, live": `assertSingleLane` holds over the live walk's per-step snapshots
    (`F-SINGLE`, P-III).
- **SC-004** — "cheap to hold, live": realized switches == `switchCount` (P-IV) and every
   line-of-defense role ran on `strongest` (P-II).
- **SC-005** — "the deferred live TUI (NC3)": a live A/B/C smoke run redraws on **events only** (no
   poll/server/timer) and a disabled UI **prints the program + blocks an open Gate 0**
   (F-GATE0-BLOCK).
- **SC-006** — "the handoff": `LiveModelReady` PASSes on the live walk, **falsifies** its `--broken`
   hook (named R3) and its *unlogged* `--stub` swap, and finds **zero cloud** round-trips.
- **SC-007** — "no self-admission": r3 fires the **already-admitted** program, re-opens Gate 0 at
   its close, and **admits nothing of its own** (P-VI / FR-014).

## Assumptions

- **Substrate (resolved, NC2).** KILN is a single-lane, gate-railed **locally-served** factory on
   the **pi** harness (P-III/VIII). r1/r2 proved the spine and Layer C with a **stub**; **r3 is the
   first row that assumes a live local model — and per NC2 that live model is GUARANTEED.** The live
  path is **primary**; a `--stub` toggle remains for local-first reproducibility and is **recorded,
  never silent** (P-V/VII). "Local-first, no cloud" holds on both toggle positions.
- **r1 is the canonical live-wire (like 001 is the canonical schema, r2 the canonical overlay).**
  R3 **imports** r1's `kiln/src/*` (lane/gate/log-writer/scheduler/walk/clock/roles) and
   `kiln/ui/*` (hud/popup/overlay/gate0-face/factory-state/twin/keymap), the two JSON schemas, and
   `kiln/validate/{log,roadmap,runtime-ready,overlay-ready}.ts` — and **extends them additively.**
  It **does not** re-declare `Resident`, `FactoryState`, the `FactoryEvent` union, or 001's log
  record types.
- **r1/r2 NC1 lineage (resolved, NC3).** The **live-model** *and* the **live-TUI** smoke walks are
   the **exact proofs r1 and r2 deferred to r3** (r1: "a live-model smoke walk is its own row, r3";
   r2 NC1: "a live-model TUI walk is r3"). R3 realizes **both**, now confirmed in scope by NC3.
- **Smoke feature is a throwaway (resolved, NC1).** The feature that walks the kiln is a **deliberate
   throwaway** (tiny, one-off, to exercise all nine gates cheaply) — **not** a self-referential
   dogfood and **not** any later program row (r4–r6). That keeps the later rows' content out of r3's
   scope.
- **Program already admitted.** `specs/ROADMAP.md` is `gate0.status: approved`,
  `human@batorfi` (re-admitted 2026-09-15; r3 the admitted next-to-fire row). R3 **fires this
  program**, it does not admit it; r3 stays `queued` (no live gate yet, M4) until its lane starts.
- **Dates.** Constitution ratified 2026-09-12; r1/r2 lineage 2026-09-12/13; r3 scaffold +
  NC1–NC3 clarifications 2026-09-16.

## Out of Scope

- **Admitting the program / advancing Gate 0** — a **human move** (P-VI); r3 fires the
  already-recorded program and **re-opens** Gate 0 at its own close.
- **A cloud model / web dashboard / server** — KILN has none (P-VIII/IX); the live resident is
  **local** and the TUI is a **print/degrade** twin when the UI is absent.
- **The *content* of the later program rows** (r4–r6) — Gate 0 authors their lane; r3's throwaway
  smoke (NC1) is **not** a later row, so their content stays out of r3's scope.
- **Rewriting 001/r1/r2 canonical shapes** — r3 is **additive** (NC3-style, like r2); a
  log-record-type change to *host* the live path would be its own row.
- **Auto-chaining across rows** — `chain_unattended=false`; r3 stops at its own PR and hands the
  program back to Gate 0.

## Traceability to the Constitution

- **Principle I (author/judge separation)** → FR-002/FR-011/SC-002/SC-007: on the **live** path a
   gate still resolves on a **human** `decidedBy` (or a distinct `pre-delegation`); a model never
   approves its own work; a veto **halts the cruise.**
- **Principle II (strongest defence, always)** → FR-005/SC-004: every line-of-defense role on the
   live walk runs on `strongest`, enforced by `bindRole` — live and local alike.
- **Principle III (one lane; director-is-scheduler)** → FR-003/SC-003: the **live** walk is asserted
   single-lane over per-step snapshots (`F-SINGLE`).
- **Principle IV (affinity swap-only-on-tier-change)** → FR-004/SC-004: realized switches ==
   `switchCount` on the live sequence, one `cost` per swap.
- **Principle V (headless never silently approves)** → FR-006/FR-008/SC-002/SC-005/SC-006: a
   missing UI **prints the program and `WAIT`s** at an open Gate 0; the `--stub` toggle is
   **recorded, never silent**; the no-silent-approval net is enforced live.
- **Principle VI (Gate 0 human-only, always)** → FR-010/SC-007: r3 fires the human-admitted program
   and **re-opens** Gate 0 at its close; it admits nothing of its own.
- **Principle VII (everything in the log)** → FR-006/FR-012/SC-001/SC-006: the live walk's
   transitions, gate completions (with the human `decidedBy`), **and each `--live`/`--stub`
   toggle** land in the factory-log and are reconstructable from it alone.
- **Principle VIII (local-first; no cloud)** → FR-001/FR-006/SC-001/SC-006: r3 is the first
  *live* row yet stays **local** — a **guaranteed** live model (primary) plus a **recorded** `--stub`
  toggle; a zero-network scan finds **0** cloud round-trips on both toggle positions.
- **Principle IX (no server/poll)** → FR-007/SC-005: the deferred live TUI smoke redraws **on fired
   events only**; no `setInterval`/`setTimeout`, no socket.
- **r1/r2 NC1 lineage (resolved by NC3)** → FR-007/US2/SC-005: the live-model **and** live-TUI
   smoke walks r1 and r2 both **deferred to r3** are now confirmed in scope and realized.

---

> **Clarified note for the human (gate-1 sign-off).** NC1 (throwaway smoke feature), NC2 (live
> **guaranteed** + a `--live`/`--stub` toggle, stub *recorded* not silent), and NC3 (r3 **does**
> clear the live-TUI smoke of Layers A/B/C) are **resolved** by human@batorfi on 2026-09-16. This
> is **ready for the human's `/speckit.plan`** — next: `plan.md` → `tasks.md` → implement (live
> resident + live-walk sibling + live TUI smoke + a `LiveModelReady` probe extending
  runtime-ready/overlay-ready, all **additive**: no re-declaration of 001's log union / r1 spine /
> r2 overlay) → `compliance-note.md`, following the r1/r2 pattern (a clean walk PASSES `log.ts`; a
> broken no-silent-approval path FAILs it by a named R3; a zero-network scan finds no cloud).
> R3 remains `queued` (M4) until its lane starts; nothing here fires the model, admits the program,
> or advances a gate (P-VI).
