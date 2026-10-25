# Specification Quality Checklist: Foundations reset (row r12)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-22
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *accepted deviation, see Notes*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders — *for KILN's builders and reviewers, who are this row's users*
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — NC1 and NC2 resolved 2026-10-22
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details) — *as far as a restructuring row allows*
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded (Out of Scope; adapt items stay in legacy)
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — *accepted deviation, see Notes*

## Notes

- **Accepted deviation — implementation terms.** r12 is a restructuring row: its *subject* is the codebase. Package names,
  the runtime version and the test runner are the domain of the feature, taken verbatim from PRD §7–§8 and §10, not design
  choices made in the spec. How the packages are wired, the workspace mechanics and file moves are left to `/speckit.plan`.
- **Resolved 2026-10-22 (human@batorfi):** NC1 → versioned flow definitions (v1 = first program, v2 = constitution v2.0.1);
  NC2 → copy (legacy keeps a frozen copy; the ported copies evolve). Spec, FR-004/007/012, edge cases and SC-008 updated.
- **Amended 2026-10-25 (human@batorfi):** v2 = the twelve-gate flow of constitution v2.1.0 (option 1). Spec, plan §Amendment, data model, flow contract, research R16 and tasks updated; the checklist items above still hold.
- **Resolved 2026-10-23 (`/speckit-clarify`, human@batorfi):** the Pi skip is done by the runner through the legacy gate's `KILN_PI=0`
  switch (FR-006, US2); the network check is a static lint over the new packages with a checked-in, path-keyed allowlist that starts
  empty (US4, FR-016, SC-006); the 19 tests on adapt-item subjects stay in legacy, 54 are ported (FR-015, SC-002).
- **Validation run 1 (2026-10-22):** all other items pass. Counts cited in the spec were measured on 2026-10-22: 500 tests
  (477 pass, 15 skip, 8 fail — live-Pi, Pi 1.1.0 vs measured 0.85.1); 73 kept test cases in `tests/contract`, `negative`,
  `netscan`, `scheduler`, `switch-cost`.
- **Validation run 2 (2026-10-22):** all items pass; ready for `/speckit.plan`.
- **Validation run 3 (2026-10-23, after `/speckit-clarify`):** 16/16 items pass; no regressions.
- **Closed 2026-10-25:** all 87 tasks done and verified on a fresh clone — see [verification-report.md](../verification-report.md). Every item above still holds; the row's close is the human's Roadmap-gate move.
