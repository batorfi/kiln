# Specification Quality Checklist: KILN Layer C — the Roadmap Overlay

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-13 · **Feature**: [spec.md](../spec.md) · **Row**: r2 of
[specs/ROADMAP.md](../../ROADMAP.md) (`deps: [r1]`)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *see Note 1:* the spec names
    KILN's **Layer-C pieces** (the Roadmap overlay, its Gate-0 face, the headless roadmap twin,
    the two Layer-C events, the OverlayCReady probe) because **their existence is constitution-
    mandated** (P-IX "Layer C = the Roadmap overlay," P-VI "Gate 0 human-only, always"); it
     defers **module/file names, the `M` keybinding vs `?`/`g`, overlay sizing, and the record-
    encoding mechanic** to planning/NC3.
- [x] Focused on user value and business needs (a human *sees and admits the program* — the
    program-level zoom-out — and the program gate can never be silently auto-advanced on a
    missing overlay).
- [x] Written for non-technical stakeholders (overlay, roadmap table, "admit the program,"
    "waits <dep>", "Gate 0 prints-and-waits" — not code).
- [x] All mandatory sections completed.

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — **all three (NC1 Layer-C testability, NC2
    Gate-0 face shape, NC3 Gate-0 record encoding) are RESOLVED** 2026-09-13 and recorded in the
   spec's *Clarifications* section, each to its lean default. *(Resolved by this scaffold pass,
    following r1's convention, which opened + resolved its NC1–NC4 — the spec is **clarified**,
    **ready for `/speckit.plan`**.)*
- [x] Requirements are testable and unambiguous (each FR has an acceptance scenario + a dogfood
   path via 001's `kiln/validate/log` and `kiln/validate/roadmap.ts`).
- [x] Success criteria are measurable (SC-001..007: "every row listed," "0 per-gate moves at
    Gate 0," "PASS 001's validator," "a merged row re-entered 0 times," "0 timers/sockets/
    servers," "0 program admissions").
- [x] Success criteria are technology-agnostic (no implementation detail; "the zoom-out lists
    all rows," "gate0 ≠ gate," "a missing overlay prints-and-waits," "OverlayCReady is
    falsifiable" are substrate-neutral).
- [x] All acceptance scenarios are defined (US1–US5, each with Given/When/Then).
- [x] Edge cases are identified (missing overlay at Gate 0, broken no-silent-approval path,
    illegal move at Gate 0, `gate0`/`gate` conflation, re-entering a `merged` row, chaining on
    vs off, overlapping surfaces, closed terminal mid-program, cloud reference, a head that fails
     `roadmap.ts`).
- [x] Scope is clearly bounded (Out of Scope defers the live TUI smoke walk → r3, the program's
    row *content*, any cloud/dashboard, advancing Gate 0 / admitting the program, modifying 001/
    r1's canonical shapes, and the `M`-keymap + overlay-spacing spikes → `plan.md`).
- [x] Dependencies and assumptions identified (r1 is the canonical spine; NC1–NC3 defaults;
    dogfood-of-001 + r1; guidance-vs-law with `ui-layers-deep.md §11` #5/#6/#7 folded into
    NC2/NC3; dates 2026-09-13).

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria (FR-001..014 → US1..US5).
- [x] User scenarios cover primary flows (render the program at the zoom-out, the Gate-0 face +
    its moves, the headless print-and-`WAIT` twin, inter-row re-entry + the unattended-tail stop,
     the OverlayCReady probe).
- [x] Feature meets measurable outcomes defined in Success Criteria (each SC → an FR/US).
- [x] No implementation details leak into specification (module names / keybinding / overlay
    sizing / record-encoding mechanic are deferred to `plan.md`/NC3; see Note 1).

## Gate-0 note (why this row cannot start yet)

Per Principle VI the **program containing r2 must be admitted by a human at Gate 0**. It **is
admitted**: the program lives at [../../ROADMAP.md](../../ROADMAP.md) (**`gate0.status:
approved`**, `rows: r1..r6`, `decided_by: human@batorfi`, `at: 2026-09-13T06:54:20Z`),
superseding the [frozen pending draft](../contracts/draft-roadmap.md). r2 is **eligible** (its
only dep, **r1**, is complete — `[X] T001–T034` in r1's `tasks.md`; `runtime-ready` green per
r1's `quickstart-run.md`). **The next Gate-0 move is the human's inter-row re-admission at the
r1-done seam** — this row fires *only* because a human admitted the program; Layer C does **not**
admit it (P-VI / FR-014 / SC-007).

## Notes

- **Note 1 — "no implementation details" under a UI system.** As in 001/002, KILN's *domain
     entities* here (the **Layer-C overlay**, the **Gate-0 face**, the **headless twin**, the
     **two Layer-C events**, the **OverlayCReady** probe) are **constitution-mandated** (P-IX,
     P-VI), so the spec names **what** each must do while deferring **how** (module/file layout,
     the overlay `M` key vs `?`/`g`, wide-table-vs-strip sizing, and the exact record-encoding
     for a Gate-0 *decision*) to planning and NC3. This is a **render/UI row**: under NC1's lean
      default even a **live TUI smoke walk** is out of scope, leaving r2 provable by a **pure
     render + print twin**, no cloud.
- **Clarified status.** r2 opens **three** choices (NC1–NC3); all three are **resolved**
     (2026-09-13, recorded in the spec's *Clarifications* section) to their lean defaults. The
   spec is **Status: Draft (clarified)** — the `/speckit.specify` pass is complete;
    **`/speckit.plan`** is next.
- **r1 is the canonical spine (like 001 is the canonical schema).** r2 **imports** the
    `FactoryState`/`RoadmapRow`/`RoadmapHead`/`Gate0` shapes in `kiln/src/types.ts`, 001's two
    JSON schemas, `kiln/validate/log.ts` + `kiln/validate/roadmap.ts`, `kiln/contracts/move-
   vocabulary.ts`, and r1's `kiln/ui/{hud,popup,twin,factory-state}.ts` — it **extends r1's
    `FactoryEvent` union additively** (`gate0_open` / `roadmap_row_done`) and **records a Gate-0
    decision additively** (a `human-decision` at `gate:"0"`, NC3 — no new log record type). The
    "001 declares → r1 runs → r2 renders and is judged by 001+r1" chain holds; r2 does **not**
    re-declare or re-shape any canonical surface.
- **The `M` keymap + overlay spacing are planning spikes, not spec blockers**
    (`ui-layers-deep.md §11#5`): NC2 resolved the *face* (a **distinct** Layer-C Gate-0 face);
    *which key* raises it and whether it is a wide table or a compact strip are decided in
     `plan.md`, not in this spec.
- All checkboxes pass; the three NC1–NC3 clarifications are **resolved** (recorded in the spec's
    *Clarifications* section). No item regressed.
