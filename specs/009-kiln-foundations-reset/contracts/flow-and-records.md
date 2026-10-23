# Contract: flow definitions, records and the validators

**FR-007, FR-008, FR-009, FR-011, FR-012, FR-019** · **Spec**: US3 · **Data**: [../data-model.md](../data-model.md) §1–4 · **Decisions**: [../research.md](../research.md) R6, R7

This is also the specification of the **new gate-rail contract** (FR-019): when the row lands, `kiln/packages/contracts/gate-rail.md` states v2 (the table
below) and points to `legacy/contracts/gate-rail.md` for v1; this file is its source.

## 1. The API of `contracts` (pure — no I/O)

```ts
// #contracts/flow/index.ts
export const flows: { readonly v1: FlowDefinition; readonly v2: FlowDefinition };
export const CURRENT_FLOW: "v2";                                   // all new work
export const DEFAULT_RECORD_FLOW: "v1";                            // a record that names no flow (FR-012)
export function flowOf(version: FlowVersion): FlowDefinition;
export function moveVocabulary(gate: GateId, flow?: FlowVersion): readonly MoveKind[];   // flow defaults to CURRENT_FLOW
export function moveAllowed(gate: GateId, move: string, flow?: FlowVersion): boolean;
export function gateName(gate: GateId, flow?: FlowVersion): string;
export const MITIGATION_CAP_DEFAULT = 2;                           // v2: settable 0–3 at the Roadmap gate; v1: fixed 2

// #contracts/roles.ts
export function bindRole(role: string, tier: Tier, roster: RoleRoster, extraJudges?: readonly string[]): Tier;
export function isJudge(role: string, roster: RoleRoster, extraJudges?: readonly string[]): boolean;
export function weakerBindingRejected(role: string, weaker: Tier, roster: RoleRoster): boolean;
```

`moveVocabulary(gate)` with no flow argument returns **v2** — the current law. Code that validates *history* passes the record's flow explicitly.

## 2. The standard flow, v2 (constitution v2.0.1, GATE-1, GATE-2)

| Key | Name | The question | Person's moves | Judge |
|---|---|---|---|---|
| `gate0` | Roadmap gate | Which feature next, in what order — and how does this factory run? | approve · revise · reject · edit-rows · add-row · drop-row | — |
| `1-concept` | Concept | Is this worth building, on these premises? | approve · revise · reject | — |
| `2-architecture` | Design | Is this the right structure? | approve · revise · reject | architecture-critic |
| `3-spec` | Specification | What exactly counts as done? | approve · revise · reject | — |
| `4-plan` | Work plan | In what pieces and order will it be built? | approve · revise · reject | — |
| `5-checkpoint` | Implementation | Do we start from a safe point — and is this still one feature? | approve · split+revise | — |
| `6-review` | Code review | Is the code right, measured against the specification? | approve · **revise** · restart | code-reviewer |
| `7-verification` | Verification | Does it actually work as specified? | approve · reject; automatic `mitigate` (default 2, 0–3) | verifier |
| `8-docs` | Documentation | Do the docs describe what was actually built? | approve · revise · reject | — |
| `9-pr` | Merge | Do we ship it? | approve · reject | — |

Internal keys are the first program's, unchanged (GATE-1). Reading order: the Roadmap gate first, Merge last (constitution, *Flow invariants*).
**v1** is the same table with `6-review` = approve · restart, the first program's names (`architecture`, `spec`, `plan`, `checkpoint`, `review`, `docs`,
`pull request`), no questions, a fixed mitigation cap of 2, and a four-judge roster that includes `docs-synthesizer`. v2's move sets contain v1's.

## 3. Records

- A `gate-completion` payload may carry `flow: "v1" | "v2"`. **Absent ⇒ v1.** The ported factory-log schema documents this; legacy's schema is unchanged.
- No record is rewritten to add the field. New records (r15 onward) write `flow: "v2"`.

## 4. The validators (`record`)

```ts
// #record/log.ts
export function validateLog(text: string, options?: { defaultFlow?: FlowVersion }): ValidationResult;     // G1, G3, R3–R5 as in the first program
// CLI: node packages/record/src/log.ts <file> [--flow v1|v2]
// #record/roadmap.ts
export function validateRoadmap(markdown: string): ValidationResult;                                     // unchanged
```

- Resolution per record: `record.flow ?? options.defaultFlow ?? DEFAULT_RECORD_FLOW`; G3 is checked against that flow's `moveVocabulary(gate, flow)`.
- **Failure message** (G3) names the flow and lists the allowed moves:
  `G3 record seq=1 (gate-completion): move "revise" not in MoveVocabulary(gate=6, flow=v1); allowed: approve, restart`
  (the first program printed `allowed: []`; the ported copy fixes this, legacy is untouched).
- Every other rule (G1 gate0 vs 1..9, R3 wait shape, R4 distinct pre-delegation, R5 no cloud field, no silent approval) is ported unchanged and keeps its test.

## 5. Required behaviours (each is a test)

| # | Given | Then |
|---|---|---|
| F1 | the v2 data | the table in §2 holds for all ten gates, including names, questions, moves and judges |
| F2 | the constitution's *closed set of move kinds* sentence and PRD GATE-2 | every kind in the data is in the closed set; the four GATE-2 gate sets equal the data |
| F3 | v1 | `6-review` = approve · restart; everything else equals the first program's `MOVE_VOCABULARY`, key for key |
| F4 | the committed r7 walks | `validateLog` passes with v1, and with v2 (v2's sets are a superset) |
| F5 | a `gate: 6, move: "revise"` record | fails with `flow=v1` (message names the flow and lists the allowed moves); passes with `flow=v2` and with `"flow": "v2"` in the record |
| F6 | a record with `"flow": "v2"` and `defaultFlow: "v1"` | the record's own flow wins |
| F7 | `bindRole("code-reviewer", "cheap", v1)` and `(…, v2)`; `bindRole("docs-synthesizer", "cheap", v1)` / `(…, v2)` | the first two throw `G2/L1 config error … must be "strongest"`; the third throws; the fourth does not |
| F8 | an added-gate judge passed as `extraJudges` | it is refused below `strongest` under either roster |
| F9 | `moveVocabulary("gate0")` shape | returns the six Roadmap-gate moves; `gate0` stays distinct from gates 1–9 (G1) |
