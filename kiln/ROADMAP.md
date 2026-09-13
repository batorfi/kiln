# ROADMAP.md — empty shipped artifact (Q2=A fixture)

> **➡ Canonically superseded 2026-09-13.** The *admitted* `kiln-v1` program now lives at
> **`specs/ROADMAP.md`** (`gate0.status: approved`, `human@batorfi`). This file remains the
> **shipped blank fixture** the scaffold ships (Q2=A: empty, `gate0.status: pending`, 0 rows) —
> the thing a fresh install starts from and the validator/`firing-ready` fixture — and is kept
> schema-valid; it is *not* a competing program, just the empty starting point.
>
> **This is the artifact the scaffold ships.** Per Q2 (resolved 2026-09-12, option A), the
> scaffold ships the **empty** program: schema-valid, **zero approved rows, no committed ordering**,
> `gate0.status: pending`. Director + human author the *actual* program at Gate 0 (a later row).
> **Gate 0 is the sole admission of the program** (Principle VI / M3): no part of this scaffold
> pre-authorizes a program.
>
> **Head:** the structured block below is the source of truth, validated by
> `kiln/schemas/roadmap.schema.json`. It is written as **JSON**, which is a *subset of YAML* — i.e. a
> "structured YAML head" in the loosest sense; the validator (`kiln/validate/roadmap.ts`) consumes
> this block. **Table:** a projection of the head (M4).

```json
{
  "deliverable": "kiln-v1-empty",
  "owner": "human@batorfi",
  "updated": "2026-09-12T00:00:00Z",
  "rows": [],
  "ordering": [],
  "chain_unattended": false,
  "gate0": { "status": "pending" },
  "trace": "P-VI (Gate 0 = sole, human-only admission); P-VII (recorded, never auto)."
}
```

## Rendered table (projection of the head — M4)

| id | status | short | deps | lane / gate |
|----|--------|-------|------|-------------|
| *(none)* | — | program not authored | — | **Gate 0: pending — awaiting a human admission** |

**order** = *(not committed)* · **gate0** = `pending` · **decided_by** = *(n/a)* ·
**note** = no program has been admitted; this empty artifact must **validate**, and any committed
program must be produced only by a Gate 0 human move.

### Negative baseline (what must FAIL validation — driven by `kiln/tests/negative/roadmap-m3.test.ts`, not the shipped file)

| mutate the head | expect |
|-----------------|--------|
| `gate0.status → "approved"` with no `rows` / `decided_by` / `at` | **FAIL** (M3: admission requires a full human-decided `gate0` record) |
| `ordering: ["r1"]` with no matching row in `rows` | **FAIL** (M1: ids must resolve to existing rows) |
| a row in `rows` with `deps` referencing a non-existent row, or forming a cycle | **FAIL** (M1: unresolved / cyclic deps) |
| a row with `status: "active"` but no `gate` (1–9) | **FAIL** (`gate` present iff `status=active`) |
| a row with `status: "done"` and no `outcome` matching `^@PR#[0-9]+$` | **FAIL** (`outcome` present iff `status=done`) |
