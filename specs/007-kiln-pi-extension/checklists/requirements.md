# Specification Quality Checklist: KILN on Pi — the extension foundation (r8)

**Purpose**: Validate specification completeness and quality before planning
**Created**: 2026-09-21 · **Feature**: [spec.md](../spec.md) · **Row**: r8 of [specs/ROADMAP.md](../../ROADMAP.md) (`deps: [r7]`, `queued`)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *Note 1:* the spec necessarily names **Pi's API** (`ctx.ui`, `registerCommand`, RPC mode): the
  row's stated purpose is to *spike that API*, so the API is the subject, not an implementation choice. **File and module names are deferred to the plan.**
- [x] Focused on user value (the operator and the authors of r9–r11 know what Pi allows; KILN answers inside real Pi; a silent human is never a decision).
- [x] Written for its stakeholders — this is a developer-tool spec; plain-language framing is in *Why this row exists* and *What r8 is not*.
- [x] All mandatory sections completed.

## Requirement Completeness

- [x] **No [NEEDS CLARIFICATION] markers remain.** NC1 (acceptance test → automated + one human TUI smoke), NC2 (load mechanism → `-e` + package manifest, no auto-load) and NC3 (P-V wording → no
  amendment, implement stricter) were **resolved by `human@batorfi` on 2026-09-21**, each on the recommended option — see the spec's *Clarifications*.
- [x] Requirements are testable and unambiguous (FR-001..017; each maps to a story and a check — a table-driven seam test, `PiReady`, or a doc check).
- [x] Success criteria are measurable (SC-001..009: 100 % of SQs answered, one command < 5 s with no model, 0 silent approvals across ≥ 5 named non-answer shapes,
  broken extension FAILs by name, 0 new dependencies, 0 false "confirmed" left, layout readable by a human).
- [x] Success criteria are technology-agnostic where they can be — SC-002/003/004 name Pi because the row *is* Pi; the rest are not.
- [x] All acceptance scenarios are defined (US1–US4).
- [x] Edge cases are identified (Pi absent/older/newer; the operator's own Pi config; command collisions; `/reload`/`/new`/`/resume` mid-gate; RPC disconnect;
  two Pi processes = two lanes (owned by r11); silent `notify` headless; loader syntax mismatch).
- [x] Scope is clearly bounded (*What r8 is not*: not r9/r10/r11/r4/r5, no gate decision, no amendment unless NC3 = B).
- [x] Dependencies and assumptions identified (Pi 0.85.1 external; macOS only; TUI documented not measured).

## Feature Readiness

- [x] All functional requirements have acceptance criteria.
- [x] User scenarios cover the primary flows.
- [x] The measurable outcomes are reachable by the stories.
- [x] Implementation details do not leak beyond Note 1.

## Evidence

- The nine measured facts (M1–M9) are reproducible from [`../pre-spec-probe/`](../pre-spec-probe) with real Pi `0.85.1`, hermetic, no model.
  **Not measured, and said so:** the TUI mode, Linux, Windows, any Pi other than 0.85.1.

## Notes

- Next step: `/speckit.plan`. The plan must carry FR-016 (a human TUI smoke, to be done at verification) and FR-017 (the operational definition and compliance note).
- The roadmap row carries no `spec` pointer (r1 and r7 do; r2 and r3 never did). Adding one is a Gate-0 edit and was **not** made here.
