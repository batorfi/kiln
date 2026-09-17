# Specification Quality Checklist: KILN Live Walk — the first live-model smoke walk

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-16 · **Feature**: [spec.md](../spec.md) · **Row**: r3 of
[specs/ROADMAP.md](../../ROADMAP.md) (`deps: [r1]`, re-admitted 2026-09-15)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *see Note 1:* the spec names
    KILN's **live pieces** (the live resident, the live-walk sibling, the live TUI path,
    `LiveModelReady`, the `--live`/`--stub` toggle) because **their existence is constitution-/row-
    mandated** (P-VIII "local model", r1/r2's **NC1** deferred the *live* proof to r3, r2 NC1
    "a live TUI walk is r3"); it defers **module/file names, the throwaway's exact nine-gate
    content (§D4), and the `ctx.ui` wiring key/anchor (§10, off the critical path)** to planning.
- [x] Focused on user value and business needs (a human *sees the kiln fire **live***, with a
    gate the human — or a *recorded* fallback — always holds; a missing UI still `WAIT`s, never
    auto-advances).
- [x] Written for non-technical stakeholders ("the kiln fires live," "the net is live,"
    "a `--stub` selection is recorded, never a silent stand-in," "Gate 0 prints-and-waits" — not
    code).
- [x] All mandatory sections completed.

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — **all three (NC1 throwaway target, NC2 live
    guaranteed + `--live`/`--stub`, NC3 live TUI in scope) are RESOLVED** 2026-09-16 and
   recorded in the spec's *Clarifications* section. *(Resolved by the human's r3 clarify pass;
    the spec is **clarified**, **ready for `/speckit.plan`**.)*
- [x] Requirements are testable and unambiguous (each FR has an acceptance scenario + a dogfood
   path via 001's `kiln/validate/log` + `kiln/validate/roadmap.ts` + the new `LiveModelReady` probe).
- [x] Success criteria are measurable (SC-001..007: "live walk PASSES 001's validator with a
    human decider," "broken → named R3," "0 second-lane," "switches == `switchCount`," "live TUI
    event-only + a blocked headless Gate 0," "unlogged `--stub` fails `LiveModelReady`,"
    "0 program admissions").
- [x] Success criteria are technology-agnostic ("the kiln fires live," "the net is live,"
    "the deferred live TUI," "the recorded `--stub`," "the handoff to r4" — substrate-neutral;
    the *local* model is a P-VIII constraint, not a specific vendor).
- [x] All acceptance scenarios are defined (US1–US3, each with Given/When/Then).
- [x] Edge cases are identified (missing model anyway → recorded `--stub` fallback; a line-of-
    defense veto halts the cruise; a gate with no human move → a `wait`, never `gate: approved`;
     Gate 0 opens near r3 → r3 *fires* the admitted program + *re-opens* Gate 0, *no* admission;
    an *unlogged* `--stub` stand-in fails `LiveModelReady`).
- [x] Scope is clearly bounded (r3 = the *live* net on a *throwaway*; it **admits no program,
   advances no Gate 0** — that is Gate 0 / a later row; the later program rows r4–r6 are out of
    r3's scope).
- [x] Dependencies and assumptions identified (live model **guaranteed**, NC2; r1's `Resident`
   interface + `walk.ts` + r2's overlay/face/`overlay-ready` are **imported**, not re-declared
    (D8/NC3); no new log `recordType`).

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria (FR-001..FR-013, each traced to
   an SC + a principle + an entity E1–E5).
- [x] User scenarios cover primary flows (US1 live end-to-end; US2 the deferred live TUI; US3 the
   `LiveModelReady` handoff probe).
- [x] Feature meets the measurable outcomes defined in Success Criteria (SC-001..SC-007 map to
    "the kiln fires live," "the net is live," "one lane live," "cheap-to-hold live," "the
    deferred live TUI," "the handoff," "no self-admission").
- [x] No implementation details leak into the specification (module/file names, the throwaway's
    nine-gate content, and the `ctx.ui` wiring live in research.md D1–D8 + data-model E1–E5 +
    `contracts/` — not in the FRs/SCs).

## Notes

- This r3 spec is **additive and constitution-gated**: it **extends r1's spine + r2's overlay**,
    makes the proofs **live** (NC1), keeps the `--stub` **recorded** (NC2), and **clears r1/r2's
    NC1 debt** of the live TUI (NC3). The spec is **clarified** (NC1–NC3 resolved).
- Next step: **`/speckit.plan`** (done — see plan.md + research.md D1–D8 + data-model E1–E5 +
    `contracts/`), then `/speckit.tasks` → `/speckit.implement` → `compliance-note.md`, following
    the r1/r2 dogfood pattern: a **live** walk PASSes 001's `log.ts`; a **broken** no-silent-
    approval path **FAILs R3 by name**; a **`--stub`** is recorded; a **zero-network** scan is
     green; and r3 **admits no program / advances no Gate 0** (P-VI/SC-007).
