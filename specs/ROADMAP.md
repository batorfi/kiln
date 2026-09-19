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
> **Status: APPROVED, Gate 0** · **tail re-admitted** (r4→r6, 2026-09-19T17:57:57Z — the r3 seam). Decider for the program: **human@batorfi**. Admission at 2026-09-13T06:54:20Z; **inter-row re-admission complete** — r1, r2 & r3 closed and merged to `main` (nominal @PR#1/@PR#2/@PR#3), and **Gate 0 has re-admitted the tail r4→r6 unchanged** (no revise/revoke) at the r3 seam. **r4 is the admitted next row** (publish the kiln toolchain — the URL-runnable distribution point, the first *network-permitting* row under P-VIII's one bootstrap exception); it stays `queued`/`eligible` until its own Gates 1–9 lane starts (`chain_unattended=false`; M4 requires a live gate for `active`). r3 — the first *live*-model smoke walk — **FIRED LIVE and is CLOSED this seam** (live-verified 124/124; F-NOT-SILENT; LiveModelReady READY; zero-cloud). Gate 0 stays the door that re-opens at every road-seam.
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
 "updated": "2026-09-19T17:57:57Z",
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
   "deps": [
    "r1"
   ],
   "status": "done",
   "outcome": "@PR#2"
  },
  {
   "id": "r3",
   "short": "first live-model smoke walk — one feature end-to-end (Gates 1–9) on a local model",
   "deps": [
    "r1"
   ],
   "status": "done",
   "outcome": "@PR#3"
  },
  {
   "id": "r4",
   "short": "publish the kiln toolchain to a public GitHub repo (the URL-runnable distribution point)",
   "deps": [
    "r2",
    "r3"
   ],
   "status": "queued"
  },
  {
   "id": "r5",
   "short": "URL-runnable installer / scaffolding script — set up the kiln toolchain into an existing repo from a public GitHub URL",
   "deps": [
    "r4"
   ],
   "status": "queued"
  },
  {
   "id": "r6",
   "short": "comprehensive newcomer docs (getting-started · how-to's · technical overviews) published to GitHub Pages",
   "deps": [
    "r5"
   ],
   "status": "queued"
  }
 ],
 "ordering": [
  "r1",
  "r2",
  "r3",
  "r4",
  "r5",
  "r6"
 ],
 "chain_unattended": false,
 "gate0": {
  "status": "approved",
  "rows": "r4..r6",
  "decided_by": "human@batorfi",
  "at": "2026-09-13T06:54:20Z",
  "note": "GATE-0 LOG (chronological, P-VII recorded):\n 1) 2026-09-13T06:54:20Z  human@batorfi  APPROVE  program r1->r6 (standing admission; the runtime did not make it for itself).\n 2) 2026-09-15T18:16:08Z  human@batorfi  road-seam   r1 (002) & r2 (003) closed -> main (nominal @PR#1/@PR#2); gate0 RE-OPENS at the seam.\n 3) 2026-09-15T18:59:08Z  human@batorfi  APPROVE(re-admit) TAIL r3->r6 UNCHANGED. In light of r1/r2 closing the tail is re-admitted without revise/revoke; r3 is the ADMITTED NEXT ROW TO FIRE (first live-model smoke walk). No row retracted. chain_unattended=false: r3 stays QUEUED until its own Gates 1-9 lane actually starts (its lane has no live gate yet, so r3 stays queued, not 'active' — M4 active requires a live gate). NOMINAL OUTCOMES: pre-r4 @PR#N are per-row close-LABELS (direct-commit dev tree), not GitHub PRs; the real PR/issue flow arrives at r4 (publish) / r5 (installer).\n  4) 2026-09-19T17:57:57Z  human@batorfi  road-seam   r3 (004-kiln-live-walk) closed -> main (nominal @PR#3; live-verified 124/124). gate0 RE-OPENS at the seam; r4->r6 re-admitted UNCHANGED (standing; r3 retired from the open tail). r3 FIRED LIVE: live walk PASSes 001 log.ts, --stub RECORDED (F-NOT-SILENT), LiveModelReady READY, zero-cloud; P-VI/SC-007 held (no program admitted BY THE BUILD, no gate advanced BY AUTHORING -- this human close IS that decision). r4 now the next row to fire."
 },
 "trace": "P-VI (Gate 0 = sole, human-only admission; this is the human record, updated to the r1/r3 seam); P-VII (recorded, never silent/false; the pre-r4 @PR#N are NOMINAL row-close labels, documented in gate0.note); P-IX (roadmap fields)."
}
```



## Rendered table (projection of the head — a human view only)

| id | status | short | deps | notes |
|----|--------|-------|------|-------|
| r1 | **done** | core single-lane runtime (lane + gate + log-writer + affinity scheduler + HUD/Popup) | — | CLOSED at the seam: **002-kiln-lane** delivered; nominal close-label **@PR#1** (pre-r4 = direct commit to `main`) |
| r2 | **done** | Flow UI — Layer C (roadmap overlay) | r1 | CLOSED this session: **003-kiln-roadmap-overlay**, `c89f9b4` (pushed to `main`); nominal close-label **@PR#2** |
| r3 | **done** | first live-model smoke walk (one feature end-to-end on a local model, Gates 1–9) | r1 | CLOSED at the seam: **004-kiln-live-walk** FIRED LIVE (the live walk PASSes 001's `log.ts`; `--stub` RECORDED via F-NOT-SILENT; LiveModelReady READY; zero-cloud); nominal close-label **@PR#3** (live-verified 124/124) |
| r4 | **next (queued)** | **publish the kiln toolchain to a public GitHub repo** — the URL-runnable distribution point | r2, r3 | ELIGIBLE (r2 ∧ r3 done) but **not begun**: gate0 re-opened at the r3 seam, `chain_unattended=false` ⇒ awaits the human's re-admission; *needs the full capability* (runtime + UI + live proof) and is the first network-permitting row; the point a URL-runnable installer and GitHub Pages both build on |
| r5 | queued | **URL-runnable installer / scaffolding script** — set up the kiln toolchain into an *existing* repo from a public GitHub URL | r4 | the operator's requested capability; runs **from** the published toolchain, never off an unpublished dev tree |
| r6 | queued | **comprehensive newcomer docs** (getting-started · how-to's · technical overviews for newcomer agentic developers) on **GitHub Pages** | r5 | the operator's requested capability; sequenced *after* the installer so the "install → run" path a newcomer follows is real |

**order** = `r1 → r2 → r3 → r4 → r5 → r6` · **chain_unattended** = `false` · **gate0** =
**`approved`** · **decided_by** = `human@batorfi` (2026-09-13T06:54:20Z) ·
**eligibility** = **r1 DONE; r2 DONE; r3 DONE** (r3's dep r1 closed at the seam; r3 FIRED LIVE and CLOSED this seam); r4 is **eligible** (deps r2 ∧ r3 done) but **not begun** — gate0 re-opened at the r3 seam and `chain_unattended=false` ⇒ it waits for the human's re-admission;
r5 once r4 is `done`; r6 once r5 is `done`. Inter-row chaining is **off** — the human
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

The program is **approved** and **three rows are closed** (r1, r2, r3); **Gate 0 has re-admitted the tail r4→r6** at the r3 seam (**not a re-vote**). The next step is to **fire r4**:

1. ~~**Fire r1**~~ — **DONE**: 002-kiln-lane delivered (spec/plan/tasks/implement all written; the lane
    spine + HUD/Popup + the `RuntimeReady` dogfood shipped). Closed at the seam, nominal **@PR#1**.
2. ~~**Fire r2**~~ — **DONE**: 003-kiln-roadmap-overlay delivered (the Layer-C overlay + its Gate-0
    face + the headless print-and-`WAIT` twin + the `OverlayCReady` probe; 98/98 tests; an overlay accuracy fix (a queue row "waits" only not-yet-closed deps; all-deps-closed reads "eligible"); a closed-row program walk
    PASSES 001's `log.ts` while a broken auto-approve FAILs it with a named R3). Closed at the seam, nominal
    **@PR#2** (`c89f9b4` pushed to `main`).
3. ~~**Fire r3**~~ — **DONE**: 004-kiln-live-walk FIRED LIVE this session — the first *live*-model smoke walk, one
    feature end-to-end on a local model across Gates 1–9 (E1–E5: the live resident, the live walk, the live TUI, the
    `LiveModelReady` probe); it also supplied the **live TUI smoke walk** r2 deferred under NC1. Live-verified 124/124;
    the live walk PASSes 001's *unmodified* `log.ts` while a broken `no-decidedBy` walk FAILs it with a named R3, the
    `--stub` stand-in is RECORDED (F-NOT-SILENT), `LiveModelReady` is READY, and the run is zero-cloud. Closed at the
    seam, nominal **@PR#3** (`06cad9c`/`a0f52df` on `main`; the close is the human's r3-seam move, P-VI).
4. **→ Fire r4 (ADMITTED, next to fire).** Gate 0 has **re-admitted the tail r4→r6 unchanged** at the r3 seam (2026-09-19T17:57:57Z, human@batorfi; no revise/revoke). r4 is *admitted & eligible* (deps r2 ∧ r3 done) but **not yet begun** (`chain_unattended=false`; it stays `queued`, not `active`, per M4). r4 = **publish the kiln toolchain** to a public GitHub repo — the URL-runnable distribution point and P-VIII's one *network-permitting* row (the bootstrap). **Next action: scaffold spec 005 for r4.**
5. **Chaining is off** (`chain_unattended: false`); any line-of-defense veto *inside* a row halts its lane;
   cross-row chaining, if ever elected, is per-row, logged, and veto-liftable — and stays that way across r4→r6.

### Guardrails that held for this admission (verified)

- **It validates as an APPROVED program.** `node kiln/validate/roadmap.ts <this file>` → PASS:
   the `gate0` carries the full human-decided record (`status=approved` + `rows` + `decided_by`
   + `at`), so M3 / Q2=A are satisfied; a *pending* artifact could *pre-authorize* nothing, but
   this *approved* record is exactly the human move M3 demands.
- **The admission is recorded, not silent.** `decided_by`/`at` make the human's decision durable
   and greppable in the factory-log lineage (Principle VII); a missing UI can now flip nothing,
   because the decision is a recorded human move, never a model-written approval.
- **No auto-chaining.** `chain_unattended: false`; nothing in-flight; each row closes at its PR.

## Gate 0 re-admission log (inter-row seams — P-VII, recorded)

| time (UTC) | decider | move | effect |
|---|---|---|---|
| 2026-09-13T06:54:20Z | human@batorfi | `approve` | admission: program r1→r6 (standing approval) |
| 2026-09-15T18:16:08Z | human@batorfi | road-seam | r1 & r2 closed → main (@PR#1/@PR#2); Gate 0 re-opens |
| 2026-09-15T18:59:08Z | human@batorfi | `approve` (re-admit) | tail r3→r6 **re-admitted unchanged**; r3 = admitted next row |
| 2026-09-19T17:57:57Z | human@batorfi | road-seam | r3 (004-kiln-live-walk) closed → main (@PR#3, live-verified 124/124); Gate 0 re-opens; r4→r6 re-admitted unchanged |

> The re-admission is the **human's** program-level move the runtime never makes for itself (P-VI). It is logged here and in the head's `gate0.note` so a missing UI flips nothing and a silent approval is impossible (P-VII). `gate0.status` stays `approved` (a re-admission, not a re-vote); after the r3 seam `r4` is the next row and stays `queued` until its own lane fires.