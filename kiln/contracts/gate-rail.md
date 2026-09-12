# Gate-Rail Contract — 001-kiln-scaffold

**Status:** design contract (Phase 1). The *moves and roles* are fixed; the
*runtime realization* (who blocks, how the UI draws) is a later row.
**Trace:** Constitution P-I, P-II, P-IV, P-V, P-VI, P-IX (per row, below).

This contract is what a **gate-completion** record's `move` field is checked
against (rule G3) and what the **FiringReady** check asserts exists.

---

## G1 — `gate` vs `gate0` are distinct, never conflated

- **`gate0`** = the pre-lane **program** gate (admits the firing program;
   human-only, re-opens at every inter-row seam).
- **`gate`** = one row's **live Gates 1–9** (the per-feature lane).
- No factory-log record or `FactoryState` field may conflate the two. A
  `gate-completion` names exactly one: `gate0` or an integer 1–9.

## G2 — Role classification (Principle II: strongest defense, always)

| tier | role | model | rationale |
|------|------|-------|-----------|
| **line-of-defense** | Architecture Critic | **strongest, always** | catches structural risk; the design backgate |
| **line-of-defense** | Verifier / Diagnosis | **strongest, always** | proves behavior vs the spec |
| **line-of-defense** | Code Reviewer | **strongest, always** | pre-merge judge of the whole diff |
| **line-of-defense** | Docs Synthesizer | **strongest, always** | cross-feature doc judge |
| work | Researcher | cheap → standard | feeds Concept; **local-first (flag-not-block)** |
| work | Concept Writer | standard | bounded by the Concept gate |
| work | Architecture Designer | standard | bounded by critic + Gate 2 |
| work | ADR Maker | cheap | warm step between strong passes |
| work | Worker | per-task tier | bounded by its Checkpoint gate |
| work | Techwriter / PR Writer | cheap | bounded by the Docs/PR backgate |
| triage | Feature-size triage | cheap | bounded immediately by a human gate |

**Rule G2 / L1:** a *line-of-defense* role is **never bindable to a cheaper tier
— a weaker binding is a configuration error the schema/runtime must reject, on
every substrate including the local one**. A *work* role may use a cheaper tier
**only upstream of the gate on its far side**.

## Per-gate move vocabulary (`MoveVocabulary(gateId)`)

| gate | id | moves | line-of-defense | special semantics |
|------|----|-------|-----------------|-------------------|
| 0 | `gate0` | approve / revise / reject **+** edit / add / drop rows | no | program-level; sole admission (P-VI); never auto-approves, even headless |
| 1 | concept | approve / revise / reject | no | cheapest bounce; **skippable** for small-triage |
| 2 | architecture | approve / revise / reject | **yes (critic)** | holds the lane; frontier head |
| 3 | spec | approve / revise / reject | no | pins the contract; validator-backed |
| 4 | plan | approve / revise / reject | no | dispatch order + affinity batching |
| 5 | checkpoint | **`split+revise` (+ `approve`); no `reject`** | no | restorable base before risk; the one "grow" move *(research §D: constitution governs over `gates-why-how-what.md`)* |
| 6 | review | **`approve` / `restart`** (no `revise`) | **yes (reviewer)** | judge never authors; `restart` reopens from checkpoint |
| 7 | verify | **`approve` / `reject`** | **yes (verifier)** | `reject` → **auto-mitigate ≤ 2 rounds → human WAIT** (G4) |
| 8 | docs | approve / revise / reject | no | as-built consistency; skippable for small-triage |
| 9 | pr | approve / reject | no | **`approve` IS the merge**; final human sign-off |

## G3 — Move integrity

A `gate-completion`/`human-decision` record's `move` **must be a member of
`MoveVocabulary(gateId)`**. A move outside the set is a validation failure.

## G4 — Verification mitigation cap

`verify`'s auto-mitigation is **bounded at 2 rounds**; after two failed rounds the
**only valid continuation is a human WAIT** — the contract forbids an unbounded
fix/reject loop.

## G5 — Checkpoint semantics

`checkpoint` carries `split+revise` (grow a feature into two) and **no
`reject`** — "a checkpoint is not done wrong, it may become two." *(Research §D:
the constitution's rail is the contract of record; a discrepancy with the runtime
concept doc `gates-why-how-what.md` is logged for the docs track.)*

## Two front-gate trims (deliberate, recorded levers — not defaults)

- **Triage-skip** routes a *small* feature past **gates 1 + 2 only**; every
  safety-net gate (incl. checkpoint, review, verify, PR) still runs.
- **Unattended tail** (after Spec, gate 3) pre-authorizes the **approve side** of
  gates 4–9 *within a single row*; it **never auto-authorizes Gate 0**, and any
  line-of-defense veto (critic objection, reviewer `restart`, verifier `reject`,
  checkpoint overflow) **halts the cruise** and returns to a human. Auto-crossed
  gates still emit a distinct `pre-delegation` record.

## Headless contract (Principle V)

- No surface may **silently approve** a gate, **Gate 0 included**.
- A gate with no human move degrades to the **only valid unresolved shape**: a
  `wait` record (`gate`, `token`, `deadline`). `gate0` additionally **prints the
  roadmap table** then WAITs.
- Default policy `gate-block`: the lane halts at a gate; `--headless` is
  required to proceed.

---

## Finalized (001 implementation, T021)

Finalized 2026-09-12 against the ratified constitution v1.0.0 and `research.md §D`. The
human-readable contract above is the source of truth; the machine-readable mirror is
`kiln/contracts/move-vocabulary.ts` (G3) and `kiln/src/roles.ts` (G2/L1). **Gate 5
reconciliation:** per the constitution (which governs over `gates-why-how-what.md`),
Checkpoint = `split+revise` + `approve`, **no `reject`**; the doc discrepancy is logged in
`specs/001-kiln-scaffold/compliance-note.md` for the docs track.
