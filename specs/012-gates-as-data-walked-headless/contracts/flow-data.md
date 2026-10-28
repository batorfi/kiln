# Contract: the flow as data, and the engine over it

**Package**: `kiln/packages/contracts/src/flow/` · **Pure**: no I/O, no `node:` import, no clock · **Consumers**: the walk (`durable`), `kiln check flow` (`checks`), the drift test, and later the director (r18) · **Requirements**: FLOW-1/2/3, EXP-3, GATE-3/5/6 · Data shapes: [data-model.md](../data-model.md) §1–§2.

## 1. The engine (what the data is read through)

| Function | Returns | Rule it carries |
|---|---|---|
| `order(flow)` | `GateKey[]` in flow order | FR-002/003 — Roadmap gate first, Merge last |
| `applicability(flow, gate, facts, required)` | `Applicability` | FR-010/011/012/013 · [R7] |
| `atUiSlot(pinned, built)` | `Applicability \| null` (only turns on) | FR-016 |
| `next(flow, state)` | the next gate to open, skipping pinned not-applicable and triage-skipped gates | FR-001, FR-014 |
| `rule(flow, gate, kind)` | the `MoveRule` | FR-005, FR-020 |
| `noteRequired(flow, gate)` | `MoveKind[]` | FR-020 |
| `targetsOf(flow, gate, state)` | the `Target[]` a reject may name now: earlier gates that are pinned applicable and not skipped, `@build` where the flow has a build, `roadmap` where `targets.roadmap` | FR-022 |
| `consequence(flow, gate, kind, target?, state)` | `{ goto, recross: GateKey[], keeps: GateKey[], work: "author"\|"workers"\|"rebuild"\|"none", leaves: boolean }` | FR-021 … FR-025 — [the-flow §7 table] |
| `triage(flow, proposal, keep)` | `{ skip: GateKey[] } \| refusal` | FR-030/031 |
| `cap(flow, requested)` | `0..3` or refusal | FR-032 |
| `validateFlow(def)` | `Fault[]` (all of them) | FR-040/041 — see [check-flow.md](./check-flow.md) |

`Fault = { code: string; gate?: GateKey; detail: string }`. `consequence` is total over (gate, kind) pairs the data offers and **throws by name** for a pair it does not (an engine call for a move the gate cannot take is a programming error, never a user-visible state: `submitMove` has already refused it).

### 1.1 The consequence table (executable form of `the-flow.md` §7)

| Move (at) | `goto` | `recross` | `work` | kept |
|---|---|---|---|---|
| approve | next applicable gate, round 1 (or the next round if re-crossed) | — | author of that gate | everything |
| revise (any gate but 6, 6a) | same gate, round + 1 | — | author, with the note | the conversation |
| revise (6-review, 6a-ui-review) | same gate, round + 1 | — | workers, on the current code, with findings and note | code and workers' context |
| reject, no target (1–4, 8, 9) | same gate, round + 1 | — | a **fresh** author | gates before |
| reject (gate0, the admission crossing) | the walk ends *not admitted*; no gate of the feature opens | — | none | nothing carried |
| reject → target T (earlier gate) | T, round + 1 | every applicable gate after T | fresh author at T | gates before T |
| reject, no target (7-verification) | `@build` | every applicable gate after `@build` | workers, on the current code, with the diagnosis | spec, plan, restorable commit |
| reject → `roadmap` (1-concept, 9-pr only) | leaves the lane | — | none | nothing carried |
| restart (6-review, 6a-ui-review) | `@build` | every applicable gate after `@build` | rebuild from the restore point, then workers | spec, plan, restorable commit |
| split+revise (5-checkpoint) | 4-plan | 4-plan … end | the work plan revised; the remainder proposed to the roadmap | what was approved for the kept part |
| edit-rows · add-row · drop-row (gate0) | the admission gate, round + 1, with the note (the roadmap is edited by the person; r22 shapes it) | — | none | — |

Gates "after T" are those later in `order(flow)` that are **pinned applicable** and not skipped; a gate recorded not applicable or skipped is not re-crossed (there is nothing to cross).

## 2. The v2 data (what `src/flow/v2.ts` carries after r14)

| Gate | moves (person) | `rules` highlights | `triage` | `armsTail` | `delegable` | other |
|---|---|---|---|---|---|---|
| `gate0` | approve · revise · reject · edit-rows · add-row · drop-row | revise/reject: note required | — | — | never | `approve` may carry `admit` |
| `1-concept` | approve · revise · reject | reject: roadmap allowed; note required | skippable | — | never | |
| `2-architecture` | approve · revise · reject | reject: earlier allowed | skippable | — | never | judge `architecture-critic` |
| `2a-experience` | approve · revise · reject | reject: earlier (→ Architecture) | — | — | never | `appliesWhen` (unchanged), judge `design-critic` |
| `3-spec` | approve · revise · reject | reject: earlier | — | **true** | never | |
| `4-plan` | approve · revise · reject | reject: earlier | — | — | default | |
| `5-checkpoint` | approve · split+revise | split: note required; **no reject** | — | — | default | `restorePoint: true` |
| `6-review` | approve · revise · restart | revise → workers; restart → rebuild | — | — | default | judge `code-reviewer` |
| `6a-ui-review` | approve · revise · restart | as 6 | — | — | never | `appliesWhen`, judge `ui-reviewer`, check `ui-checker` |
| `7-verification` | approve · reject (+ automatic mitigate) | reject default `@build`, earlier allowed | — | — | default | `mitigationCap {2, 0, 3}`, judge `verifier` |
| `8-docs` | approve · revise · reject | reject: earlier | — (never skippable) | — | default | unjudged |
| `9-pr` | approve · reject | reject: earlier, roadmap allowed | — | — | explicit | |

`origin` is absent (built-in) on every gate; `noTriageSkip` absent on the flow. `v1` carries none of the new fields.

## 3. The applicability evaluator

`applicability()` returns the same bytes for the same inputs (canonical JSON of `Reason`). Dialect of `rule.paths`: `**` (any depth, including none), `*` (within a segment), `?` (one character within a segment), literals; `/` separators; case-sensitive; patterns containing any other glob metacharacter are **refused by `kiln check flow`** (`flow-glob-unsupported`). Golden cases for every pattern in `ui-flow.md` §4.1/§5.1 live in `contracts/tests/glob.test.ts`.

## 4. What must stay true (guarded by tests that fail by name)

- `v1` is byte-identical in behaviour: every r12 test passes unchanged.
- `moves` and `rules` agree: every kind in `moves` has a rule; `mitigate` has none for a person.
- `flow-vs-constitution.test.ts` still reads the constitution, the PRD and `ui-flow.md` and fails if the data drifts; it is *extended*, not replaced, for the new fields (FR-061).
