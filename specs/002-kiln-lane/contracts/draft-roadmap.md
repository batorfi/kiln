# ROADMAP.md (DRAFT) — SUPERSEDED by `specs/ROADMAP.md` · **Gate 0: PENDING → APPROVED**

> **➡ SUPERSEDED 2026-09-13T06:54:20Z.** This pending proposal was **admitted at Gate 0** and is
> now the live program at **`specs/ROADMAP.md`** (`gate0.status: approved`, full human-decided
> record: `rows: r1..r6`, `decided_by: human@batorfi`, `at: 2026-09-13T06:54:20Z`). This file
> stays **only** so r1's spec cross-references (which cite this path) still resolve. **Do not
> edit this draft** — the approved program and its record live at `specs/ROADMAP.md`.
>
> *The proposed head below is frozen as historical record (still `gate0: pending`).*

# ROADMAP.md (DRAFT) — the `kiln-v1` firing program · **Gate 0: PENDING**

> **Extended 2026-09-13 to 6 rows.** This draft originally proposed row **r1** (002-kiln-lane,
> the core lane runtime) for the `kiln-v1` program. It is now extended with the **distribution
> tail** the operator requested: **r4** publish the kiln toolchain to a public GitHub repo,
> **r5** a URL-runnable installer that sets up the toolchain into an *existing* repo, and **r6**
> comprehensive newcomer docs on **GitHub Pages**. Still **pending** a human admission at Gate 0.
>
> **This is NOT an admitted program.** It is the **director's proposal** that this firing program
> belongs to `kiln-v1` — for a **human to admit at Gate 0**. Per Principle VI the **Gate 0
> admission is a human move, always, even headless**; **nothing in the scaffold (or this draft)
> auto-approves it.** `gate0.status` is **`pending`** by construction, and the M3 guard in
> `kiln/validate/roadmap.ts` *rejects* any `approved`/committed program that lacks a full
> human-decided record — so this draft **cannot** pre-authorize a firing.
>
> **Status: DRAFT, awaiting Gate 0.** Author: the director (planning arm). Decider: **you.**
> Moves available at Gate 0: **approve / revise / reject / edit-rows / add-row / drop-row**.
>
> **Head:** the structured block below is the source of truth, validated by
> `kiln/schemas/roadmap.schema.json` and `kiln/validate/roadmap.ts` (it is JSON, a *subset of*
> YAML). **Table:** a projection of the head (a human view; the validator does not gate on it —
> M4 enforces only the per-row status invariants).

```json
{
  "deliverable": "kiln-v1",
  "owner": "human@batorfi",
  "updated": "2026-09-13T00:00:00Z",
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
    "status": "pending",
    "note": "director's proposal, EXTENDED 2026-09-13 to a 6-row program: r1 runtime spine → r2 Layer C UI → r3 first live smoke walk → r4 publish toolchain to a public GitHub repo → r5 URL-runnable installer (sets up kiln into an existing repo) → r6 comprehensive newcomer docs on GitHub Pages. r4 is the distribution point both r5 (the installer runs from a published URL) and r6 (docs host on GitHub Pages) need; r5 + r6 are the two capabilities the operator requested. Awaiting human admission at Gate 0 — not approved by any artifact."
  },
  "trace": "P-VI (Gate 0 = sole, human-only admission — this draft stays PENDING); P-VII (recorded, never auto)."
}
```

## Rendered table (projection of the head — a human view only)

| id | status | short | deps | notes |
|----|--------|-------|------|-------|
| r1 | queued | core single-lane runtime (lane + gate + log-writer + affinity scheduler + HUD/Popup) | — | the first road-row; **spec.md exists, clarified (NC1–NC4 resolved 2026-09-12)** |
| r2 | queued | Flow UI — Layer C (roadmap overlay) | r1 | deferred out of r1 (NC1) |
| r3 | queued | first live-model smoke walk (one feature end-to-end) | r1 | deferred out of r1 (NC2: r1 uses a stub resident) |
| r4 | queued | **publish the kiln toolchain to a public GitHub repo** — the URL-runnable distribution point | r2, r3 | *needs the full capability* (runtime + UI + live proof); the point a URL-runnable installer and GitHub Pages both build on |
| r5 | queued | **URL-runnable installer / scaffolding script** — set up the kiln toolchain into an *existing* repo from a public GitHub URL | r4 | the operator's first requested capability; runs **from** the published toolchain, never off an unpublished dev tree |
| r6 | queued | **comprehensive newcomer docs** (getting-started · how-to's · technical overviews for newcomer agentic developers) on **GitHub Pages** | r5 | the operator's second requested capability; sequenced *after* the installer so the "install → run" path a newcomer follows is real |

**order** = *(proposed: r1 → r2 → r3 → r4 → r5 → r6)* · **chain_unattended** = `false` · **gate0** =
**`pending`** · **decided_by** = *(none — awaiting the human)* ·
**note** = this is a **proposal**, not an admission. It must **validate as a pending program**,
and **no** committed/approved form of it may exist until a human moves `gate0` to
`approved` with a full `rows / decided_by / at` record.

### New rows added 2026-09-13 (r4–r6) — the distribution tail

The original proposal admitted r1–r3 (build the runtime, its program-level UI, and a first live
proof). The two rows the operator requested — **a URL-runnable installer** and **comprehensive
docs on GitHub Pages** — both *premise a public, published toolchain*, so the program grows by
three rows:

- **r4 — publish the toolchain to a public GitHub repo.** The distribution point. It depends on
   `r2` **and** `r3`: the *whole* capability (runtime + UI + a live end-to-end proof) must exist
   before anything is published and pointed at by a URL. *Decision to confirm at Gate 0: does r4
   also wait on r2 (Layer C UI), or is "full capability" just r1 + r3?* — encoded as
   `deps: [r2, r3]`; the human may trim it with a Gate 0 **edit-rows** move.
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

## What Gate 0 is being asked to decide

1. **Approve** this 6-row program (lock the rows, order, and deps) — then r1 may fire its own
   Gates 1–9, **one row at a time**, with Gate 0 re-opening at each inter-row seam; r4 is
   eligible only once r2 ∧ r3 are `done`, r5 once r4 is `done`, r6 once r5 is `done`.
2. **Revise** it with the director via the Gate 0 program-edit moves `edit-rows / add-row /
   drop-row` (e.g. trim r4's `deps` to `[r1, r3]`; splice in a pre-publish "release" row; reorder
   r5/r6) before any row fires.
3. **Reject** it and return to planning.

**Two open decisions to confirm (program-edit moves, not blockers):**
- **r4's dependency set.** Encoded `[r2, r3]` (= "full capability incl. UI"). The human may narrow
   to `[r1, r3]` (publish the runtime + proof without waiting on Layer C UI) — **edit-rows**.
- **r5's network posture.** The installer is the one row that *fetches over the network by design*
   (a URL-runnable bootstrap); confirm this is acceptable as the sanctioned exception to P-VIII
   *for the bootstrap only* (the resident stays local post-install).

### Guardrails already in place (no action needed — these hold regardless of the move)

- **This draft validates as PENDING.** `node kiln/validate/roadmap.ts <this file>` → a pending
   program (schema-valid; M3 does not fire because `gate0.status` is `pending`).
- **It cannot be silently flipped to approved.** M3 in `kiln/validate/roadmap.ts` *rejects* any
   `gate0.status: approved` that lacks `rows / decided_by / at` — so even a malicious edit cannot
   make this an admitted program without a full human-decided record (Principle VI, M3 / Q2=A,
   carried forward from 001).
- **No row auto-starts.** `current` is unset; nothing is in-flight; cross-row chaining is
   `false` (a human must elect it, logged, per row).

## In-row decisions r1 had to make — RESOLVED (pre-clarify, from `spec.md`)

These are **inside** r1 (its `/speckit.clarify` step), distinct from the **Gate-0 program
question above**. They gate *how* r1 is built, not *whether* it fires — all four are now
**RESOLVED (2026-09-12)** to their lean defaults, recorded in the spec's *Clarifications*
section:

- **NC1** UI-layer scope in r1 — **RESOLVED:** A/B only here; Layer C → **r2**.
- **NC2** resident-model test substrate — **RESOLVED:** stub head, no live model; live walk → **r3**.
- **NC3** human-event channel — **RESOLVED:** one channel; headless = print + `wait` + token-resume.
- **NC4** row granularity — **RESOLVED:** spine US1–US4 + UI (US5) as P2 in r1; r2/r3 as siblings.
