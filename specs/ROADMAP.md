# ROADMAP.md — the `kiln-v1` firing program · **Gate 0: APPROVED**

> **Admitted.** This is the **human-approved program** for `kiln-v1`, produced by the
> **Gate 0** move on **2026-09-13T06:54:20Z** (decided_by `human@batorfi`). It supersedes the
> director's **draft** at `specs/002-kiln-lane/contracts/draft-roadmap.md` (a pending proposal),
> which is now recorded as superseded and kept only so r1's spec cross-references resolve.
>
> **Why a separate artifact.** The draft was written *while r1 was being specified*, when the
> program was necessarily `pending` (the runtime must not admit its own program — Principle VI).
> The **admission** is a *later human move*; it lands here as a **distinct, approved** artifact
> rather than by flipping the draft in place. Gate 0's job at kickoff was to admit *the program*
> — the rows, their order, their dependencies — and to be the door that re-opens at every
> inter-row seam.
>
> **Status: APPROVED, Gate 0.** Decider: **human@batorfi**. At: 2026-09-13T06:54:20Z.
> Moves still available at Gate 0 (e.g. between rows): **approve / revise / reject / edit-rows /
> add-row / drop-row**.
>
> **Head:** the structured block below is the source of truth, validated by
> `kiln/schemas/roadmap.schema.json` and `kiln/validate/roadmap.ts` (it is JSON, a *subset of*
> YAML). **Table:** a projection of the head (a human view; the validator does not gate on it —
> M4 enforces only the per-row status invariants).

```json
{
  "deliverable": "kiln-v1",
  "owner": "human@batorfi",
  "updated": "2026-09-13T06:54:20Z",
  "rows": [
    {
      "id": "r1",
      "short": "core single-lane runtime (lane + gate + log-writer + affinity scheduler + HUD/Popup)",
       "deps": [],
       "status": "queued",
       "spec": "specs/002-kiln-lane/spec.md"
     },
    {
      "id": "r2",
       "short": "Flow UI — Layer C (the roadmap overlay; the program-level zoom-out)",
       "deps": ["r1"],
       "status": "queued"
     },
    {
      "id": "r3",
       "short": "first live-model smoke walk — one feature end-to-end (Gates 1–9) on a local model",
       "deps": ["r1"],
       "status": "queued"
     },
     {
      "id": "r4",
       "short": "publish the kiln toolchain to a public GitHub repo (the URL-runnable distribution point)",
       "deps": ["r2", "r3"],
       "status": "queued"
     },
    {
      "id": "r5",
       "short": "URL-runnable installer / scaffolding script — set up the kiln toolchain into an existing repo from a public GitHub URL",
       "deps": ["r4"],
       "status": "queued"
     },
     {
      "id": "r6",
       "short": "comprehensive newcomer docs (getting-started · how-to's · technical overviews) published to GitHub Pages",
       "deps": ["r5"],
       "status": "queued"
     }
   ],
  "ordering": ["r1", "r2", "r3", "r4", "r5", "r6"],
  "chain_unattended": false,
   "gate0": {
     "status": "approved",
     "rows": "r1..r6",
     "decided_by": "human@batorfi",
     "at": "2026-09-13T06:54:20Z",
     "note": "Gate 0 admitted on 2026-09-13T06:54:20Z (human@batorfi): the 6-row program r1→r2→r3→r4→r5→r6, locked in order with the encoded deps (r4 = [r2,r3]; r5 = [r4]; r6 = [r5]). This is the human admission the runtime (r1) did not make for itself (P-VI); it is recorded here as a full human-decided gate0 record so M3 / Q2=A hold and a missing UI can flip nothing. Inter-row chaining stays opt-in (chain_unattended=false): each row closes at its own PR, then Gate 0 re-opens at the seam."
   },
  "trace": "P-VI (Gate 0 = sole, human-only admission — this program is the human record of it); P-VII (recorded, never auto)."
}
```

## Rendered table (projection of the head — a human view only)

| id | status | short | deps | notes |
|----|--------|-------|------|-------|
| r1 | queued | core single-lane runtime (lane + gate + log-writer + affinity scheduler + HUD/Popup) | — | the first road-row; **spec.md written + clarified (NC1–NC4 resolved 2026-09-12)**; the row that *runs* 001's declared contracts |
| r2 | queued | Flow UI — Layer C (roadmap overlay) | r1 | deferred out of r1 (NC1) |
| r3 | queued | first live-model smoke walk (one feature end-to-end) | r1 | deferred out of r1 (NC2: r1 uses a stub resident) |
| r4 | queued | **publish the kiln toolchain to a public GitHub repo** — the URL-runnable distribution point | r2, r3 | *needs the full capability* (runtime + UI + live proof); the point a URL-runnable installer and GitHub Pages both build on |
| r5 | queued | **URL-runnable installer / scaffolding script** — set up the kiln toolchain into an *existing* repo from a public GitHub URL | r4 | the operator's requested capability; runs **from** the published toolchain, never off an unpublished dev tree |
| r6 | queued | **comprehensive newcomer docs** (getting-started · how-to's · technical overviews for newcomer agentic developers) on **GitHub Pages** | r5 | the operator's requested capability; sequenced *after* the installer so the "install → run" path a newcomer follows is real |

**order** = `r1 → r2 → r3 → r4 → r5 → r6` · **chain_unattended** = `false` · **gate0** =
**`approved`** · **decided_by** = `human@batorfi` (2026-09-13T06:54:20Z) ·
**eligibility** = r1 fires first (no deps); r2/r3 fire once r1 is `done`; r4 once r2 ∧ r3 are
`done`; r5 once r4 is `done`; r6 once r5 is `done`. Inter-row chaining is **off** — the human
re-admits at each `roadmap_row_done` seam unless they explicitly elect it (logged).

### The distribution tail (r4–r6) — approved as proposed

- **r4 — publish the toolchain to a public GitHub repo.** The distribution point. Encoded
   `deps: [r2, r3]` ("full capability incl. UI") as proposed; the human confirmed this at Gate 0.
   (A future revision may trim it to `[r1, r3]` to publish the runtime + proof without waiting on
   Layer C UI.)
- **r5 — a URL-runnable installer / scaffolding script.** Sets up the kiln toolchain into an
   *existing* repo from a public GitHub URL (a `curl <url>/install | sh`-style bootstrap that
   drops the kiln toolchain — `kiln/`, schemas, validators, gate-rail, and the `.pi`/`.specify`
   scaffolding — into a target repo without a clone). Depends on `r4`: the installer runs *from
   the published URL*, never off an unpublished dev tree. *Local-first note (P-VIII): the
   installer fetches the published toolchain over the network by design — it is the one row that
   is *network-permitting* precisely because it is the bootstrap; once installed the resident
   remains local.*
- **r6 — comprehensive newcomer documentation, published to GitHub Pages.** Getting-started,
   how-to's, and technical overviews written *for newcomer agentic developers*, hosted on GitHub
   Pages. Depends on `r5` (the "install → run" path the docs describe is real once the installer
   exists) and, transitively, on `r4` (docs host on the published repo's Pages). The doc set
   reuses `docs/concepts/` as source and adds the operational layer; a build/keymap spike
   (cf. Layer C's `ui-layers-deep.md §7`) precedes the build.

## What Gate 0 is being asked to do next

The program is **approved**; the next Gate 0 moves are *inter-row* re-admissions, not a re-vote:

1. **Fire r1** — its full Gates 1–9 lane (spec already at
   `specs/002-kiln-lane/spec.md`; plan/tasks not yet written).
2. **At `roadmap_row_done` for r1**, Gate 0 re-opens: re-admit the remaining program (r2→r6) or
   revise it, in light of what r1 teaches. Then r2/r3 (siblings, deps r1), then r4, r5, r6.
3. **Chaining is off** (`chain_unattended: false`); any line-of-defense veto *inside* a row halts
   its lane; cross-row chaining, if ever elected, is per-row, logged, and veto-liftable.

### Guardrails that held for this admission (verified)

- **It validates as an APPROVED program.** `node kiln/validate/roadmap.ts <this file>` → PASS:
   the `gate0` carries the full human-decided record (`status=approved` + `rows` + `decided_by`
   + `at`), so M3 / Q2=A are satisfied; a *pending* artifact could *pre-authorize* nothing, but
   this *approved* record is exactly the human move M3 demands.
- **The admission is recorded, not silent.** `decided_by`/`at` make the human's decision durable
   and greppable in the factory-log lineage (Principle VII); a missing UI can now flip nothing,
   because the decision is a recorded human move, never a model-written approval.
- **No auto-chaining.** `chain_unattended: false`; nothing in-flight; each row closes at its PR.
