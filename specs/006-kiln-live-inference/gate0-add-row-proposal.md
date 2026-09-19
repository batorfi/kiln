# Gate-0 proposal — `add-row` r7 + `edit-rows` r4 · **A DIRECTOR'S DRAFT, NOT AN ADMISSION**

> **Status: PROPOSED. Nothing here is admitted.** This is the **director's challengeable draft** of a
> Gate-0 program change, authored at the **open r3 seam**. Per **Principle VI** (Gate 0 is human-only,
> always) and **Principle I** (a producer never decides the gate its own artifact feeds), the runtime
> and the director **may propose** a program change and **may never make it**. The admission is a
> **later human move** that lands in `specs/ROADMAP.md`.
>
> **`specs/ROADMAP.md` is deliberately UNTOUCHED by this file.** Precedent: r1's director draft
> (`specs/002-kiln-lane/contracts/draft-roadmap.md`) was likewise a pending proposal, and the
> admission landed separately as a distinct, human-decided artifact rather than by flipping the draft
> in place.
>
> **This file cannot be admitted by accident.** The proposed head below carries explicit
> `<<HUMAN-DECIDES: …>>` placeholders where the human's decision fields go. Pasted as-is, it **FAILs**
> `node kiln/validate/roadmap.ts` (M3: `status: approved` requires `rows` + `decided_by` + `at`). The
> artifact is *designed* to be un-admittable until a human fills those in — the P-V/P-VI property
> applied to the proposal itself.

---

## 1. What is being proposed, in one line

Insert **one new row before r4** that makes the kiln's live-model claim true — a genuine
Ollama-backed resident and a preflight probe that actually dials the endpoint — and make r4's
dependency on it **explicit**, so the publish row cannot fire on an unproven live path.

## 2. Why this, why now (the case the human should challenge)

**The claim r4 rests on is not yet true.** `specs/005-kiln-publish/spec.md` stakes r4's case on r3:
*"r3 supplies r4's proof that the kiln actually fires — it is the trust anchor r4's public
distribution point stands on."* But `kiln/src/live-resident.ts:makeLiveResident` is a deterministic
pure function returning `{ran: "live", via: model, …}`. There is **no** Ollama client, **no** `fetch`,
**no** subprocess anywhere in `kiln/`; `DEFAULT_LOCAL_MODEL = "ollama/llama3.2:3b"` is a string label,
and on the current machine that model **is not installed**. r3's own ancestor said as much —
`kiln/src/stub-resident.ts:8`: *"A genuine live-model smoke walk is r3 — not provided here."* r3
shipped a deterministic adapter instead, so the debt was named and carried forward, not paid.

**The decisive reason is sequencing, not honesty.** Live inference plausibly changes the **published
surface itself**:

| What live inference likely touches | Why it matters to r4 |
|---|---|
| `Resident.run()` sync → async (see NC1) | ripples through `lane.run` → `walk` → `live-walk` → `scheduler.schedule` → both dogfood runners |
| the P-VIII zero-network scan definition | `validate/runtime-ready.ts:74`, `overlay-ready.ts:188`, `live-ready.ts:67` |
| R5's forbidden-key list | `validate/log.ts:19` — an endpoint cannot currently be recorded at all |

Those files **are** r4's payload. Publishing first yields a public v0.1.0 dist, an r5 installer
written against it, and r6 docs describing it — then a breaking spine change one row later. r4's own
spec forbids it from absorbing that change (`FR-006`, `SC-005`: additive only; upstream shapes
untouched), so it cannot be folded in either.

**Now is the zero-cost insertion point.** Gate 0 re-opened at the r3 seam (2026-09-19T17:57:57Z),
`chain_unattended: false`, and r4 is `queued` — **not** `active`. No lane is in flight. `add-row` at an
open seam is the cheapest move the gate-rail defines; the same insertion mid-r4-lane means
interrupting a firing.

**The honest counter-argument, stated fairly.** r4's actual work product (the manifest, the
`PublishedReady` probe, the publish recipe) is largely *orthogonal* to the resident — it does not
touch `lane.ts`. If NC1 resolves to the **subprocess** option, the spine never breaks, and firing r4
first becomes defensible. **NC1 is therefore the decision that should be settled before this proposal
is voted on**, and it is held open below rather than pre-resolved.

## 3. Why the row id is `r7` and not `r3b`

`kiln/schemas/roadmap.schema.json` → `$defs.row.id` → `"pattern": "^r[0-9]+$"`. A literal `r3b`
**fails** schema validation, and so does a `deps: ["r3b"]` reference (same pattern on the deps items).
Two legal alternatives were considered:

| Option | Verdict |
|---|---|
| **Renumber** r4→r5, r5→r6, r6→r7; new row becomes `r4` | **Rejected.** Breaks every cross-reference in `specs/005-kiln-publish/`, the ROADMAP's rendered table and distribution-tail prose, and the four-entry `gate0.note` history. A cosmetic gain for a large, error-prone rewrite of the human record. |
| **`r7`, positioned 4th in `ordering`** | **Proposed.** Row ids are *identities*; `ordering` is the *firing sequence*. Numeric value carries no ordering meaning in the schema or validator, so `r7` firing fourth is well-formed. All existing identities and cross-references survive untouched. |

## 4. Why this is TWO moves, not one

Both are in `MoveVocabulary(gate0)` — `["approve", "revise", "reject", "edit-rows", "add-row", "drop-row"]`.

1. **`add-row`** — insert `r7` (`deps: ["r3"]`, `status: "queued"`).
2. **`edit-rows`** — extend r4's `deps` from `["r2", "r3"]` to `["r2", "r3", "r7"]`.

Move 2 is **not** cosmetic, but its effect was measured rather than assumed. Eligibility is computed
from **`deps`**, not from `ordering`: `checkM1`/M2 in `kiln/validate/roadmap.ts` resolve deps, and
`nextEligibleRow` in `kiln/ui/factory-state.ts` returns *"the first non-terminal row whose deps are
all done"*. Running that **actual function** over the four relevant configurations:

| configuration | `nextEligibleRow` returns |
|---|---|
| today (no r7) | `r4` |
| `add-row` only (r4's deps left as `["r2","r3"]`) | `r7` |
| …and if r7 is later **aborted** | **`r4`** |
| **both moves** (r4 deps `["r2","r3","r7"]`) | `r7` |
| …and if r7 is later **aborted** | **`r4`** |

So what move 2 actually buys, stated precisely:

- **It blocks `drop-row`.** Removing r7 while r4 depends on it makes r4's `deps` reference a
  non-existent row — **M1 FAILs**. r7 cannot be quietly deleted; removing it requires a second,
  deliberate, recorded edit to r4.
- **It puts the dependency in the human record**, where the reason r4 waits is greppable rather than
  inferable from array position.
- **It does *not* protect against an `aborted` r7** — see the validator note below.

> **Two validator findings, recorded (P-VII).** Both surfaced while testing this proposal against the
> repo's own code; neither blocks the move, and both deserve a hardening task in a later row.
>
> 1. **`aborted` satisfies a dependency.** `nextEligibleRow` computes
>    `done = rows.filter(r => r.status === "done" || r.status === "aborted")`, so an **aborted** row
>    counts as satisfying its dependents. That contradicts the stated rule in both the constitution
>    (*"A row fires **only** when its `deps` are `done`"*) and the schema's own comment on `deps`
>    (*"A row is eligible to fire iff all deps are 'done' (M2)"*). Consequence here: aborting r7 makes
>    r4 eligible under **either** move combination — so the hard guard is M1 via `drop-row`, not
>    abort-resistance.
> 2. **The cycle detector follows only the first out-edge.** `checkM1`'s acyclicity walk follows
>    `deps[0]` per node, so `r7` as r4's *third* dep is never traversed. Harmless for this change (no
>    cycle exists: `r7 → r3`, and `r3` is terminal), but the acyclicity guarantee is weaker than it
>    reads.

## 5. The proposed head (the human's `add-row` + `edit-rows` applied)

Replace the `rows`, `ordering`, `updated`, and `gate0` fields of the head in `specs/ROADMAP.md` with
the following. **Changed / added lines are marked `← CHANGED` / `← ADDED` in the commentary after the
block, not inside the JSON** (the head must stay strict JSON).

```json
{
 "deliverable": "kiln-v1",
 "owner": "human@batorfi",
 "updated": "<<HUMAN-DECIDES: ISO-8601 timestamp of your Gate-0 move>>",
 "rows": [
  {
   "id": "r1",
   "short": "core single-lane runtime (lane + gate + log-writer + affinity scheduler + HUD/Popup)",
   "deps": [],
   "status": "done",
   "spec": "specs/002-kiln-lane/spec.md",
   "outcome": "@PR#1"
  },
  {
   "id": "r2",
   "short": "Flow UI — Layer C (the roadmap overlay; the program-level zoom-out)",
   "deps": ["r1"],
   "status": "done",
   "outcome": "@PR#2"
  },
  {
   "id": "r3",
   "short": "first live-model smoke walk — one feature end-to-end (Gates 1–9) on a local model",
   "deps": ["r1"],
   "status": "done",
   "outcome": "@PR#3"
  },
  {
   "id": "r7",
   "short": "true live local inference — a real Ollama-backed resident + an OllamaReady preflight probe that actually dials the endpoint",
   "deps": ["r3"],
   "status": "queued",
   "spec": "specs/006-kiln-live-inference/spec.md"
  },
  {
   "id": "r4",
   "short": "publish the kiln toolchain to a public GitHub repo (the URL-runnable distribution point)",
   "deps": ["r2", "r3", "r7"],
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
 "ordering": ["r1", "r2", "r3", "r7", "r4", "r5", "r6"],
 "chain_unattended": false,
 "gate0": {
  "status": "approved",
  "rows": "r7,r4..r6",
  "decided_by": "<<HUMAN-DECIDES: human@… >>",
  "at": "<<HUMAN-DECIDES: ISO-8601 timestamp of your Gate-0 move>>",
  "note": "<<HUMAN-DECIDES: append entry 5 from §6 below to the existing four-entry log; do not replace it>>"
 },
 "trace": "P-VI (Gate 0 = sole, human-only admission; this is the human record); P-VII (recorded, never silent/false; the pre-r4 @PR#N are NOMINAL row-close labels); P-IX (roadmap fields)."
}
```

**What changed, precisely — four edits, nothing else:**

| # | Field | From | To |
|---|---|---|---|
| 1 | `rows` | 6 rows | **7 rows** — `r7` **← ADDED**, positioned between `r3` and `r4` so `nextEligibleRow` reaches it first |
| 2 | `rows[r4].deps` | `["r2", "r3"]` | `["r2", "r3", "r7"]` **← CHANGED** (the real gate) |
| 3 | `ordering` | `[r1,r2,r3,r4,r5,r6]` | `[r1,r2,r3,**r7**,r4,r5,r6]` **← CHANGED** |
| 4 | `gate0.rows` | `"r4..r6"` | `"r7,r4..r6"` **← CHANGED** |

**Untouched on purpose:** every other row's `id`/`short`/`outcome`/`spec`; `r1`–`r3`'s `done` status
and nominal `@PR#N` labels; `chain_unattended: false`; `deliverable`; `owner`; `trace`. `gate0.status`
stays `approved` — this is an **amendment to a standing admission**, in the same spirit as the two
prior re-admissions, not a re-vote of the program.

## 6. The `gate0.note` entry to append (P-VII — recorded, never silent)

Append as **entry 5**, preserving entries 1–4 verbatim:

```
 5) <<HUMAN-DECIDES: timestamp>>  human@batorfi  ADD-ROW + EDIT-ROWS  r7 INSERTED before r4 (ordering r1,r2,r3,r7,r4,r5,r6); r4.deps extended to [r2,r3,r7].
    WHY: r3 closed with a DETERMINISTIC live-resident adapter (kiln/src/live-resident.ts returns a pure function; no Ollama client, no fetch, no subprocess in kiln/), so the "FIRED LIVE" claim r4's spec leans on as its trust anchor is not yet true. r7 makes it true BEFORE the toolchain goes public, and before r5's installer and r6's docs are written against a dist whose spine may still change (NC1: the sync/async fork).
    NOT A RETRACTION: no row is dropped or reordered relative to each other; r3 stays `done` @PR#3 (its delivered scope — the full-rail walk, the log-replay net, the recorded --stub toggle, Layers A/B/C live-smoke — all stand). r7 pays the LIVE-INFERENCE debt r3 named at kiln/src/stub-resident.ts:8 and carried forward.
    PROPOSED BY: the director (draft at specs/006-kiln-live-inference/gate0-add-row-proposal.md). DECIDED BY: the human at this seam — P-VI/P-I: the runtime did not make this move for itself.
```

## 6a. Verification of this proposal (already performed)

The proposed head in §5 was extracted and run through the repo's **own unmodified validator**, in both
states, before this file was handed over:

```
node kiln/validate/roadmap.ts <head with placeholders>   →  FAIL, exit 1
    $.gate0.decided_by does not match pattern /^human@/
    $.gate0.at expected ISO-8601 date-time (format)
    $.updated expected ISO-8601 date-time (format)

node kiln/validate/roadmap.ts <placeholders filled>      →  PASS, exit 0
```

So the proposal is **schema-correct once a human decides it**, and **un-admittable until then** — the
P-V/P-VI property holding for the proposal artifact itself. Row-eligibility behaviour was verified
separately by running `nextEligibleRow` over each configuration (§4's table). `specs/ROADMAP.md` was
**not** touched by any of this: the checks ran against temporary copies.

## 7. Applying the move (the human's checklist)

1. Settle **NC1** in `specs/006-kiln-live-inference/spec.md` (the sync/async fork). If it resolves to
   the **subprocess** option, re-read §2's counter-argument before voting — the sequencing case
   weakens materially, and firing r4 first becomes reasonable.
2. Edit `specs/ROADMAP.md`: apply the four edits in §5, replacing every `<<HUMAN-DECIDES: …>>`
   placeholder with your real decision, and append §6's entry 5 to `gate0.note`.
3. Update the rendered table and the "What Gate 0 is being asked to do next" prose — they are a
   *projection* (M4 does not gate on them), but a stale projection is exactly the kind of dishonest
   record P-VII forbids.
4. Add a fifth row to the **"Gate 0 re-admission log"** table at the foot of `specs/ROADMAP.md`.
5. Verify: `node kiln/validate/roadmap.ts specs/ROADMAP.md` → **PASS** (it will FAIL while any
   placeholder remains — that is the intended safety property).
6. Leave `.specify/feature.json` alone until you actually start r7's lane. It currently reads
   `specs/005-kiln-publish`; flipping it is part of *starting* the row, not of admitting it.
7. `r7` stays **`queued`**, never `active`, until its own Gates 1–9 lane opens a live gate (M4:
   `active` requires `gate` ∈ 1..9; `chain_unattended: false` lifts nothing automatically).

## 8. Moves available to the human at this gate

**approve** (apply §5 + §6 as proposed) · **revise** (amend the row's scope, deps, or position —
e.g. keep r7 but leave r4's deps alone, making the order advisory rather than gated) ·
**reject** (fire r4 next as already admitted; r7 is not created) · **edit-rows** ·
**add-row** · **drop-row**.

**A `reject` is a coherent choice, not a failure.** It means: publish the toolchain now, and pay the
live-inference debt after — accepting that the published dist, the installer's fetch target, and the
docs' API surface may need re-cutting if NC1 resolves to the async spine. The proposal's job is to
make that trade **visible and recorded**, not to force it.

---

## Trace

- **P-VI** — Gate 0 is human-only, always. This file **proposes**; it admits nothing, touches no
  program artifact, and carries placeholders that make accidental admission fail validation.
- **P-I** — author/judge separation: the director drafts the program change; the **human** decides it.
  The runtime does not make this move for itself.
- **P-VII** — recorded, never silent: §6 is the durable, time-stamped, greppable ledger entry; the
  proposal names its own author and the deciding party.
- **M1 / M2 / M4** — `r7`'s id matches `^r[0-9]+$`; `deps: ["r3"]` resolves to an existing row and
  introduces no cycle; `ordering` references only existing ids; `r7` carries no `gate` (it is
  `queued`, not `active`) and no `outcome` (it is not `done`).
- **M3** — `gate0.status: approved` retains a full human-decided record **once the human fills the
  placeholders**; until then the artifact is correctly un-admittable.
