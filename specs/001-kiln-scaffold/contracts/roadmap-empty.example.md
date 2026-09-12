# ROADMAP.md — empty shipped artifact (Q2=A fixture)

> **This is the artifact the scaffold ships.** Per Q2 (resolved 2026-09-12,
> option A), the scaffold ships the **empty** program: schema-valid, **zero
> approved rows, no committed ordering, `gate0.status: pending`**. Director +
> human author the *actual* program at Gate 0 (a later row). This file is also a
> **positive fixture** for the roadmap validator and a **negative baseline**:
> flipping any one field into a *committed* state (gate0 → `approved`, or a
> committed `ordering`) must make the validator **FAIL** (M3), proving the
> scaffold does not pre-authorize a program.
>
> **Head:** the structured YAML block below (source of truth, validated by
> `roadmap.schema.json`). **Table:** a projection of the head (M4).

```yaml
deliverable: kiln-v1-empty   # a program with no admitted rows yet
owner: human@token
updated: "2026-09-12T00:00:00Z"

rows: []                      # Q2=A: no rows committed; director authors them at Gate 0
ordering: []                  # not committed -> not a firing program yet
chain_unattended: false       # human re-admits per row at Gate 0 (default, conservative)
gate0:                        # pre-lane human gate; PENDING until a human admits
  status: pending             # M3 guard: NOT "approved" -> nothing has been admitted
rows-note: "Program not yet authored. Director proposes; human admits at Gate 0."
trace: "P-VI (Gate 0 = sole, human-only admission); P-VI/P-VII (recorded, never auto)."
```

## Rendered table (projection of the head — M4)

| id | status | short | deps | lane / gate |
|----|--------|-------|------|-------------|
| *(none)* | — | program not authored | — | **Gate 0: pending — awaiting a human admission** |

**order** = *(not committed)* · **gate0** = `pending` · **decided_by** = *(n/a)* ·
**note** = no program has been admitted; this empty artifact must **validate**, and
any committed program must be produced only by a Gate 0 human move.

### Negative baseline (what must FAIL validation — for the suite, not the shipped file)

| mutate | expect |
|--------|--------|
| `gate0.status -> "approved"` without `rows`/`decided_by`/`at` | **FAIL** (M3: admission requires a human decision record) |
| `ordering: [r1]` with no matching row in `rows` | **FAIL** (M1: ids must resolve) |
| a row in `rows` with `deps` referencing a non-existent row, or a cycle | **FAIL** (M1: unresolved / cyclic deps) |
| a row with `gate` set but `status != active` | **FAIL** (gate present iff active) |
| a row with `status: done` and no `outcome: @PR#N` | **FAIL** (outcome iff done) |
