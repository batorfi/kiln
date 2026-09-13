# Specification Quality Checklist: KILN Lane Runtime

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-12
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *see Note 1:* the spec names
   KILN's **runtime pieces** (lane / gate / log-writer / affinity scheduler / HUD-Popup /
   RuntimeReady) because **their existence is constitution-mandated** (Principles III, IV,
   V, VII, IX); it defers **module/file names, UI primitives, and the resident-model
   substrate** to planning/rows as needed.
- [x] Focused on user value and business needs (the kiln *fires*; a human holds the door;
   everything is logged; it is local-first and cheap to hold).
- [x] Written for non-technical stakeholders (gates, holds, swaps, "watch the kiln" — not
   code).
- [x] All mandatory sections completed.

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — **all four (NC1 UI-layer scope, NC2
   resident-model test substrate, NC3 human-event channel, NC4 row granularity) are
   RESOLVED** 2026-09-12 and recorded in the spec's *Clarifications* section, each to its
   lean default. *(Resolved by `/speckit.clarify`; like 001 which resolved its Q1/Q2, this row
   now resolves its NC1–NC4 — the spec is **clarified**, **ready for `/speckit.plan`**.)*
- [x] Requirements are testable and unambiguous (each FR has an acceptance scenario + a
   dogfood path via 001's validator).
- [x] Success criteria are measurable (SC-001..007: counts, "0 cloud round-trips," "switches
   = N", "PASS 001's validator").
- [x] Success criteria are technology-agnostic (no implementation detail; "one resident at any
   instant," "no timer/socket," "emitted log PASSES" are substrate-neutral).
- [x] All acceptance scenarios are defined (US1–US6, each with Given/When/Then).
- [x] Edge cases are identified (closed terminal, headless self-resolve, illegal move,
    veto-in-tail, weak defense binding, tier vs affine boundary, missing watch, cloud ref,
    checkpoint `split+revise`).
- [x] Scope is clearly bounded (Out of Scope defers Layer C / live smoke walk / program content
    / cloud / Gate-0 admission).
- [x] Dependencies and assumptions identified (NC1–NC4 defaults; dogfood-of-001; guidance-
    vs-law; Gate-5 reconciliation carried).

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria (FR-001..012 → US1..US6).
- [x] User scenarios cover primary flows (lane hold/yield/resume, gate block/headless-wait,
    log emission, affinity swap, watch redraw, RuntimeReady probe).
- [x] Feature meets measurable outcomes defined in Success Criteria (each SC → an FR/US).
- [x] No implementation details leak into specification (module names / UI primitives /
    resident substrate are deferred; see Note 1).

## Gate-0 note (why this row cannot start yet)

Per Principle VI the **program containing r1 must be admitted by a human at Gate 0**. It is
**admitted**: the program now lives at [../../ROADMAP.md](../../ROADMAP.md) (**`gate0.status:
approved`**, `human@batorfi`), superseding the [frozen draft](../contracts/draft-roadmap.md)
(which stays `pending`). The human, not this scaffold, authorized r1's firing.

## Notes

- **Note 1 — "no implementation details" under a runtime system.** As in 001 (its
    "Content Quality / no implementation details" note), KILN's *domain entities*
    (the lane, the gate primitive, the factory-log writer, the affinity scheduler,
       `FactoryState`) are **constitution-mandated**, so the spec names **what** they must
    do (Principles III/IV/V/VII/IX) while deferring **how** (module/file layout, UI
    primitives, the resident-model substrate) to planning and the NCs. Under NC2's lean
     default this is *stronger* than usual: even a **live-model** walk is out of scope,
    leaving r1 provable with a **stub resident**, no cloud.
- **Clarified status.** 001→002 opened **four** choices (NC1–NC4); all four are now
    **resolved** (2026-09-12, recorded in the spec's *Clarifications* section) to their lean
    defaults. The spec is **Status: Draft (clarified)** — `/speckit.clarify` is complete;
     `/speckit.plan` is next.
- **Dogfood, not re-declaration.** r1 is judged **by** 001's contracts: its emitted log
    must **PASS `kiln/validate/log`** (SC-003), its move sets match `gate-rail.md` G3,
    its `Cost` field matches 001's `Cost` record shape. The spec therefore *references*
    001's schemas as the source of truth and does **not** redefine them.
- **Gate-5 reconciliation carried.** The checkpoint gate realizes **`split+revise (+
    append), no `reject`** — the reconciled move set resolved on the docs track in 001
    (constitution governs over the earlier `gates-why-how-what` wording).
- All checkboxes pass; the four NC1–NC4 clarifications are **resolved** (recorded in the spec
     *Clarifications* section). No item regressed; the former `[~]` "remaining NEEDS
    CLARIFICATION" item is now **`[x]`** (resolved).
