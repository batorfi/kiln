# Specification Quality Checklist: KILN's real UI on Pi (r9)

**Purpose**: Validate specification completeness and quality before planning
**Created**: 2026-09-22 · **Feature**: [spec.md](../spec.md) · **Row**: r9 of [specs/ROADMAP.md](../../ROADMAP.md) (`deps: [r2, r8]`, both `done`, `queued`)

## Content Quality

- [x] No implementation details beyond what the row's own subject requires — *Note 1:* the spec necessarily names Pi's real API (`ctx.ui.setStatus`,
  `ctx.ui.custom`, `registerShortcut`) because the row's job is to wire against it; exact module names and the keymap's final values are deferred to the plan.
- [x] Focused on user value (an operator sees the factory's state live, answers gates in Pi, and every answer is either a real recorded decision or a durable
  wait — never something in between).
- [x] Written for its stakeholders — a developer-tool spec; plain-language framing is in *Why this row exists* and *What r9 is not*.
- [x] All mandatory sections completed.

## Requirement Completeness

- [x] **No [NEEDS CLARIFICATION] markers remain.** NC1 (identity for `decidedBy` → an explicit, required session-level value, refused loudly if absent), NC2
  (`LiveUICtx` → keep the interface, real-Pi-backed body) and NC3 (acceptance test → automated + one human terminal smoke) were **resolved by
  `human@batorfi` on 2026-09-22**, each on the recommended option — see the spec's *Clarifications*.
- [x] Requirements are testable and unambiguous (FR-001..014; each maps to a story, a measured fact, or a spike question the plan will complete).
- [x] Success criteria are measurable (SC-001..007: footer matches across ≥3 states with no idle drift, a real per-gate decision recorded and log-valid, a
  real Gate-0 decision recorded, log-valid, non-pre-delegated and unreachable from the wrong code path, 0 non-answers ever applied — mutation-checked, 0
  unvalidated bare-letter keys remain, 0 new dependencies / 0 regressions, the `decidedBy` meaning statable in one sentence).
- [x] Success criteria are technology-agnostic where they can be; SC-001/002/003/005 name Pi and its shortcut format because the row *is* about wiring to Pi.
- [x] All acceptance scenarios are defined (US1–US4).
- [x] Edge cases are identified (overlay-focus stacking, a session switch mid-gate, no model present, an event firing mid-dialog, a possibly-spoofable
  identity scheme recorded as a stated limit rather than assumed safe).
- [x] Scope is clearly bounded (*What r9 is not*: not r10/r11, no re-opening of r1/r2/r3's renders or r8's seam contract).
- [x] Dependencies and assumptions identified (Pi 0.85.1 only; macOS only; fixture-driven gates, not a real lane; the keymap re-decision is scoped to this
  row's three keys; `docs/tui.md`/`docs/keybindings.md` claims are documented, not yet measured by r9's own spike).

## Feature Readiness

- [x] All functional requirements have acceptance criteria.
- [x] User scenarios cover the primary flows (the footer, a per-gate decision, a Gate-0 decision, and the safety net across all of them).
- [x] The measurable outcomes are reachable by the stories.
- [x] Implementation details do not leak beyond Note 1.

## Evidence

- Every fact under *Why this row exists* → "already measured" is sourced from r8's own committed evidence (`research.md`, the `ui-layers-deep.md` correction
  banner, the F-1 finding) — not re-asserted here without a citation.
- The three *newly measured* facts (overlay-hosts-its-own-list, `registerShortcut`'s modifier+key requirement, `escape`'s default binding) are sourced from
  Pi's own docs (`docs/tui.md`, `docs/keybindings.md`), read for this spec but **not yet run against a live terminal** — flagged as such in *Assumptions*, to
  be turned into measured (**M**) findings by this row's own spike task, the same discipline r8 used for its SQ1–SQ11 register.
- **Not measured, and said so:** whether `keymap.ts`'s bare letters actually fail in practice (a plausible, sourced inference from the docs, not yet
  reproduced against real Pi) — this is exactly what r9's spike must confirm first, since FR-007 depends on it.

## Notes

- Next step: `/speckit.plan`. The plan must carry FR-013's human terminal smoke test (to be done at verification) and FR-004/FR-007's resolved decisions
  (the identity scheme, the re-declared keymap).
- The roadmap row carries no `spec` pointer (r1, r7 and r8 have one; r2 and r3 never did). Adding one is a Gate-0 edit and was **not** made here.
