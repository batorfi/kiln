# Specification Quality Checklist: Durable core and the gate contract (row r13)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-26
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *note:* r13 **is** the adoption of a named dependency (PRD CORE-1 names Pi Durable and "one KILN seam module"), and the row's acceptance is a crash proof; the spec therefore names the library, the seam, the store and the existing `kiln check` commands where the requirement itself does (FR-001, FR-050…054), and states the contract in KILN's terms only (FR-002). It names no language, framework API, file layout or class.
- [x] Focused on user value and business needs — the readers are the Operator (a gate that waits and settles once) and the engineer of r14–r18 (a core to build on).
- [x] Written for non-technical stakeholders — *note:* the guarantees are stated in plain terms (waits as long as it takes, one commit or none, once, first move wins); the infrastructure vocabulary is explained by the Key Entities.
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — the one that was raised (FR-054, the posture toward Node's experimental built-in SQLite) was answered by the person on 2026-10-26: accept, record and watch it (Option A); the spec was updated and the marker removed.
- [x] Requirements are testable and unambiguous — FR-001…FR-063, each with a pass/fail observation (a check, a kill point, a count).
- [x] Success criteria are measurable — SC-001 (every named step + ≥ 300 random kills, 0 half-applied), SC-002 (≥ 7 consecutive kills), SC-003 (100/100/100 counts), SC-005 (2 s), SC-007 (20/20 refusals), SC-009 (≥ 184 + 500 tests).
- [x] Success criteria are technology-agnostic — *note:* SC-006, SC-009 and SC-010 name the project's own `kiln check`, `npm test` and the library's absence from public types because they verify guarantees of the repository itself; no library API or code structure is used as a measure.
- [x] All acceptance scenarios are defined — eight stories, 33 scenarios.
- [x] Edge cases are identified — twelve, including a kill while opening, a move during start-up, a restart storm, a months-long wait, a damaged store, a backwards clock and power loss.
- [x] Scope is clearly bounded — Assumptions → *Scope* lists what r14, r15, r16, r17, r18, r19/r20 and r21 own; task bodies are shells; the lane is proven with scripted generations.
- [x] Dependencies and assumptions identified — r12 (done), r42 (done, `go`), the post-spike contract, the constitution's *Dependencies*, macOS only.

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria — each maps to a story scenario or a success criterion.
- [x] User scenarios cover primary flows — a waiting gate (US1), the move (US2), opening (US3), seam and task types (US4), resume and exactly-once (US5), the lane (US6), one owner (US7), dependency adoption (US8).
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — see the first note.

## Notes

- Validation run: iteration 2 of 3 — all items pass after the clarification was folded in (FR-054 rewritten, Clarifications and Status updated).
- Everything else that r42 handed to r13 has a stated default under Assumptions (new Node floor, pinned and locked dependencies, `externals` seam, one owner, lane lease released at restart); `/speckit-clarify` may still revisit them.
- All items pass: ready for `/speckit-clarify` (optional) or `/speckit-plan`.
