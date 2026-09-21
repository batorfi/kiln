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
> **Status: APPROVED, Gate 0** · **amended three times** (at the r3 seam, and twice at the r7 seam). Decider for the program: **human@batorfi**. Admission at 2026-09-13T06:54:20Z; r1, r2, r3 & **r7** are **closed** (nominal @PR#1…@PR#4). At the r3 seam Gate 0 inserted **r7**. At the **r7 seam (2026-09-21)** the human **closed r7**, **defined `kiln-v1` as a fully runnable factory (real UI, commands, director, roles)**, and added **r8** before r4 — then, at 04:21:47Z, **split r8 into four rows (r8 the Pi extension foundation · r9 the real UI · r10 roles and tiers · r11 the director and commands)**, and **reworded r4** from *publish to a public repo* (it is already public) to *cut the `kiln-v1` release*, gated on all four. **r8 is the admitted next row**; it stays `queued`/`eligible` until its own Gates 1–9 lane starts (`chain_unattended=false`; M4). No row was dropped and no existing row was reordered relative to another. Gate 0 stays the door that re-opens at every road-seam.
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
 "updated": "2026-09-21T04:21:47Z",
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
   "id": "r7",
   "short": "true live local inference — a real Ollama-backed resident + an OllamaReady preflight probe that actually dials the endpoint",
   "deps": [
    "r3"
   ],
   "status": "done",
   "spec": "specs/006-kiln-live-inference/spec.md",
   "outcome": "@PR#4"
  },
  {
   "id": "r8",
   "short": "kiln-v1 foundation — the Pi extension: spike the Pi extension API for real (ctx.ui, commands, lifecycle) and load KILN as an actual Pi extension with a package layout the later rows build on",
   "deps": [
    "r7"
   ],
   "status": "queued"
  },
  {
   "id": "r9",
   "short": "kiln-v1 real UI — the three Flow layers (footer HUD, gate popup, roadmap overlay) on Pi's real ctx.ui, so a human answers a gate in Pi and the move is recorded as a real human decision",
   "deps": [
    "r2",
    "r8"
   ],
   "status": "queued"
  },
  {
   "id": "r10",
   "short": "kiln-v1 roles and tiers — the role agents (agents/*.md), a tier-to-model mapping, and unload-on-swap so the lane's swap becomes a real model swap",
   "deps": [
    "r8"
   ],
   "status": "queued"
  },
  {
   "id": "r11",
   "short": "kiln-v1 director and commands — the director that turns an approved spec into gated work units, and the commands to run a lane; acceptance: a newcomer starts a lane on a real feature in Pi and a human answers its gates",
   "deps": [
    "r9",
    "r10"
   ],
   "status": "queued"
  },
  {
   "id": "r4",
   "short": "cut the kiln-v1 release — a curated, versioned, URL-runnable distribution of the runnable factory: a release manifest, a version tag and GitHub Release, and a PublishedReady probe (the repository is already public and carries its README and LICENSE)",
   "deps": [
    "r2",
    "r3",
    "r7",
    "r8",
    "r9",
    "r10",
    "r11"
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
  "r7",
  "r8",
  "r9",
  "r10",
  "r11",
  "r4",
  "r5",
  "r6"
 ],
 "chain_unattended": false,
 "gate0": {
  "status": "approved",
  "rows": "r7,r8..r11,r4..r6",
  "decided_by": "human@batorfi",
  "at": "2026-09-13T06:54:20Z",
  "note": "GATE-0 LOG (chronological, P-VII recorded):\n 1) 2026-09-13T06:54:20Z  human@batorfi  APPROVE  program r1->r6 (standing admission; the runtime did not make it for itself).\n 2) 2026-09-15T18:16:08Z  human@batorfi  road-seam   r1 (002) & r2 (003) closed -> main (nominal @PR#1/@PR#2); gate0 RE-OPENS at the seam.\n 3) 2026-09-15T18:59:08Z  human@batorfi  APPROVE(re-admit) TAIL r3->r6 UNCHANGED. In light of r1/r2 closing the tail is re-admitted without revise/revoke; r3 is the ADMITTED NEXT ROW TO FIRE (first live-model smoke walk). No row retracted. chain_unattended=false: r3 stays QUEUED until its own Gates 1-9 lane actually starts (its lane has no live gate yet, so r3 stays queued, not 'active' — M4 active requires a live gate). NOMINAL OUTCOMES: pre-r4 @PR#N are per-row close-LABELS (direct-commit dev tree), not GitHub PRs; the real PR/issue flow arrives at r4 (publish) / r5 (installer).\n  4) 2026-09-19T17:57:57Z  human@batorfi  road-seam   r3 (004-kiln-live-walk) closed -> main (nominal @PR#3; live-verified 124/124). gate0 RE-OPENS at the seam; r4->r6 re-admitted UNCHANGED (standing; r3 retired from the open tail). r3 FIRED LIVE: live walk PASSes 001 log.ts, --stub RECORDED (F-NOT-SILENT), LiveModelReady READY, zero-cloud; P-VI/SC-007 held (no program admitted BY THE BUILD, no gate advanced BY AUTHORING -- this human close IS that decision). r4 now the next row to fire.\n  5) 2026-09-19T20:24:57Z  human@batorfi  ADD-ROW + EDIT-ROWS  r7 INSERTED before r4 (ordering r1,r2,r3,r7,r4,r5,r6); r4.deps extended to [r2,r3,r7]. WHY: r3 closed with a DETERMINISTIC live-resident adapter (kiln/src/live-resident.ts returns a pure function; no Ollama client, no fetch, no subprocess in kiln/; DEFAULT_LOCAL_MODEL names a model not installed on this host), so the FIRED-LIVE claim r4's spec leans on as its trust anchor is not yet true. r7 makes it true BEFORE the toolchain is packaged for distribution, and before r5's installer and r6's docs are written against a dist whose spine may still change (NC1: the sync/async fork -- 0 async/await/Promise in kiln/src|ui|validate today). NOT A RETRACTION: no row is dropped, and no existing row is reordered relative to another; r3 stays 'done' @PR#3 and its delivered scope stands (the full-rail walk, the log-replay net, the recorded --stub toggle, the Layers A/B/C live smoke). r7 pays the LIVE-INFERENCE debt r3 named at kiln/src/stub-resident.ts:8 and carried forward. PROPOSED BY: the director (draft at specs/006-kiln-live-inference/gate0-add-row-proposal.md, committed eccfbdf). DECIDED BY: the human at this seam -- P-VI/P-I: the runtime did not make this move for itself. NC1 REMAINS OPEN: it is now a gate-1/gate-2 question inside r7's own lane, not a pre-vote condition; if it resolves to the subprocess option the spine never breaks and the r7-before-r4 sequencing case weakens (recorded so the trade stays visible). r7 stays 'queued' (M4: 'active' requires a live gate; chain_unattended=false lifts nothing).\n  6) 2026-09-21T04:05:07Z  human@batorfi  CLOSE r7 + DEFINE kiln-v1 + ADD-ROW r8 + EDIT-ROWS r4.deps. (a) r7 CLOSED as done @PR#4 (nominal close-label; direct commit to main): 006-kiln-live-inference delivered -- a real Ollama-backed resident and OllamaReady; fixes 0c5bc19, last commit 7a196ca; 232 tests; a code review's 12 findings all fixed; F-1 decided 'keep as is'. (b) kiln-v1 DEFINED by the human: a FULLY RUNNABLE FACTORY, including a real UI, commands, a director and roles -- not a runtime library plus proofs. (c) r8 ADDED before r4 (ordering r1,r2,r3,r7,r8,r4,r5,r6), deps [r2,r7]: make the factory runnable. (d) r4.deps extended to [r2,r3,r7,r8], so the release cannot fire before there is a runnable factory to release. WHY: an audit at the r7 seam found nothing a newcomer can RUN to use the factory on a feature -- kiln/bin is empty and package.json has no 'bin'; the only Pi-API references in kiln/ are 3 comments; .pi/ holds only spec-kit prompts; there are no agents/*.md; 'director' appears only in comments; the real ctx.ui wiring was deferred at r2 (NC1) and again at r3 ('later polish'). r4-r6 (publish, installer, docs) would distribute and document a surface that r8 is about to change -- the same reason r7 was placed before r4. NOT A RETRACTION: no row is dropped; r1-r3 and r7 stay done; r4-r6 are unchanged apart from r4's deps. CONCERN RECORDED (not blocking): r8 as ONE row is very large (r1 alone was a row); its first clarify should decide whether to split it (a Gate-0 add-row), and its first lane step should be a spike on the Pi extension API, which has never been exercised. r8 STAYS 'queued' (M4: 'active' requires a live gate; chain_unattended=false lifts nothing). NOT DONE HERE: r4's short and specs/005-kiln-publish still say 'publish to a public GitHub repo' although batorfi/kiln is ALREADY public; they need their own revise. A README and LICENSE were prepared as a chore, outside Gate 0. PROPOSED BY: the director; DECIDED BY: the human at this seam -- P-VI/P-I: the runtime did not make this move for itself.\n  7) 2026-09-21T04:21:47Z  human@batorfi  SPLIT r8 + REWORD r4. (a) r8 SPLIT into four rows by the human: r8 (the Pi extension foundation, opening with an API spike), r9 (the real UI on Pi), r10 (role agents, a tier-to-model mapping and unload-on-swap), r11 (the director and commands; the acceptance row). New ordering r1,r2,r3,r7,r8,r9,r10,r11,r4,r5,r6. r8.deps [r2,r7] -> [r7]; r9.deps [r2,r8]; r10.deps [r8]; r11.deps [r9,r10]. (b) r4 REWORDED and its deps extended to [r2,r3,r7,r8,r9,r10,r11]: 'publish the kiln toolchain to a public GitHub repo' -> 'cut the kiln-v1 release'. batorfi/kiln is ALREADY public and now carries a README, an Apache-2.0 LICENSE, NOTICE and THIRD-PARTY-NOTICES, so r4 no longer creates a distribution point; it cuts a curated, versioned release of the runnable factory (manifest, tag + GitHub Release, PublishedReady). specs/005-kiln-publish was revised to match. WHY THE SPLIT: entry 6 recorded the concern that ONE row for a real UI + commands + a director + roles is very large (r1 alone, the lane, was a row). The split follows natural interfaces and puts the biggest unknown first -- the Pi extension API has never been exercised, so r8 opens with a spike and every later row plans against what Pi actually allows. r10 carries the half of r7's code-review finding CR-5 that was left undone (a tier-to-model mapping and unload-on-swap, which turn the lane's swap from bookkeeping into a real model swap). r11 is the acceptance row: a newcomer starts a lane on a real, non-throwaway feature in Pi and a human answers its gates. NOT A RETRACTION: no row dropped; r1-r3 and r7 stay done; r8 keeps its id and narrows its scope. CONCERN RECORDED (not blocking): r11 may itself prove too big; that is a call for its own first clarify. r8 STAYS 'queued' (M4; chain_unattended=false). PROPOSED BY: the director (the shape of the split); DECIDED BY: the human -- P-VI/P-I."
 },
 "trace": "P-VI (Gate 0 = sole, human-only admission; this is the human record, updated to the r1/r3 seam); P-VII (recorded, never silent/false; the pre-r4 @PR#N are NOMINAL row-close labels, documented in gate0.note); P-IX (roadmap fields)."
}```



## Rendered table (projection of the head — a human view only)

| id | status | short | deps | notes |
|----|--------|-------|------|-------|
| r1 | **done** | core single-lane runtime (lane + gate + log-writer + affinity scheduler + HUD/Popup) | — | CLOSED at the seam: **002-kiln-lane** delivered; nominal close-label **@PR#1** (pre-r4 = direct commit to `main`) |
| r2 | **done** | Flow UI — Layer C (roadmap overlay) | r1 | CLOSED this session: **003-kiln-roadmap-overlay**, `c89f9b4` (pushed to `main`); nominal close-label **@PR#2** |
| r3 | **done** | first full-rail smoke walk (one feature end-to-end, Gates 1–9) | r1 | CLOSED at the seam: **004-kiln-live-walk** delivered (the walk PASSes 001's `log.ts` and a broken no-decider FAILs by named R3; `--stub` RECORDED via F-NOT-SILENT; LiveModelReady READY; zero-cloud); nominal close-label **@PR#3** (124/124). **Caveat recorded 2026-09-19:** its resident is a *deterministic adapter*, not inference — **r7 completes this** |
| r7 | **done** | **true live local inference** — a real Ollama-backed resident + an `OllamaReady` preflight probe that actually dials the endpoint | r3 | CLOSED at the r7 seam (2026-09-21): **006-kiln-live-inference** delivered — the kiln now fires a **real** local model through the same lane, output captured, `OllamaReady` fails a *claimed* live run that *performed* nothing; the P-VIII scan repaired (it had scanned zero files since r1) and made a real tokenizer; a code review's 12 findings all fixed; F-1 decided *keep as is*; nominal close-label **@PR#4** (`0c5bc19`…`7a196ca` on `main`) |
| r8 | **next (queued)** | **kiln-v1 foundation — the Pi extension.** Spike the Pi extension API for real (`ctx.ui`, commands, lifecycle) and load KILN as an actual Pi extension with a package layout the later rows build on | r7 | SPLIT out of the original r8 at 04:21:47Z; ELIGIBLE (r7 done) but **not begun**. Opens with a **spike**: the Pi extension API has never been exercised, so every later row plans against what it actually allows |
| r9 | queued | **kiln-v1 real UI.** The three Flow layers (footer HUD, gate popup, roadmap overlay) on Pi's real `ctx.ui`, so a human answers a gate *in Pi* and the move is recorded as a real human decision | r2, r8 | headless still prints and `WAIT`s; a missing UI still never approves |
| r10 | queued | **kiln-v1 roles and tiers.** The role agents (`agents/*.md`), a **tier → model mapping**, and **unload-on-swap** so the lane's `swap` becomes a real model swap | r8 | carries the half of r7's code-review finding CR-5 that was left undone (P-IV) |
| r11 | queued | **kiln-v1 director and commands — the acceptance row.** The director that turns an approved spec into gated work units, and the commands to run a lane | r9, r10 | **acceptance:** a newcomer starts a lane on a real, non-throwaway feature in Pi and a human answers its gates. May itself need splitting — a call for its own clarify |
| r4 | queued | **cut the `kiln-v1` release** — a curated, versioned, URL-runnable distribution of the runnable factory (manifest, version tag + GitHub Release, `PublishedReady`) | r2, r3, r7, r8, r9, r10, **r11** | **REWORDED at the r7 seam** (was *publish to a public GitHub repo*): `batorfi/kiln` is **already public** and now carries a README, LICENSE and third-party notices. **GATED on r11** (and so on r8–r10): fires only once the factory is runnable. Spec `005-kiln-publish` revised to match |
| r5 | queued | **URL-runnable installer / scaffolding script** — set up the kiln toolchain into an *existing* repo from a public GitHub URL | r4 | the operator's requested capability; runs **from** the published toolchain, never off an unpublished dev tree |
| r6 | queued | **comprehensive newcomer docs** (getting-started · how-to's · technical overviews for newcomer agentic developers) on **GitHub Pages** | r5 | the operator's requested capability; sequenced *after* the installer so the "install → run" path a newcomer follows is real |

**order** = `r1 → r2 → r3 → r7 → r8 → r9 → r10 → r11 → r4 → r5 → r6` · **chain_unattended** = `false` · **gate0** =
**`approved`** · **decided_by** = `human@batorfi` (admitted 2026-09-13T06:54:20Z; amended 2026-09-19T20:24:57Z, 2026-09-21T04:05:07Z and 2026-09-21T04:21:47Z) ·
**eligibility** = **r1, r2, r3, r7 DONE**; **r8 is the next row** — eligible (dep r7 done) but **not begun** (`chain_unattended=false`; M4 keeps it `queued`, not `active`, until its lane opens a live gate); **r9** once r8 is `done` (and r2, done); **r10** once r8 is `done`; **r11** once r9 ∧ r10 are `done`; **r4 is not eligible** until r11 is `done`;
r5 once r4 is `done`; r6 once r5 is `done`. Inter-row chaining is **off** — the human
re-admits at each `roadmap_row_done` seam unless they explicitly elect it (logged).

> **Note on the numbering.** Row ids are *identities*; `ordering` is the *firing sequence*. `r7`
> and `r8`–`r11` fire **fourth** to **seventh** because the schema pins ids to `^r[0-9]+$` (so `r3b` is illegal) and renumbering
> r4→r6 would have broken every cross-reference in `specs/005-kiln-publish/` and the `gate0.note`
> history. The numeric value carries no ordering meaning.

### The proof row (r7) — added at the r3 seam

- **r7 — true live local inference.** A genuine Ollama-backed `Resident` plus an **`OllamaReady`**
   preflight probe that *actually dials* the endpoint (the sibling of `RuntimeReady` →
   `OverlayCReady` → `LiveModelReady`, and the first that makes a real call). **Why it exists:** r3
   closed with a *deterministic adapter* — `kiln/src/live-resident.ts` returns a pure function, and
   `kiln/` contains no Ollama client, no `fetch`, and no subprocess — so the live-model claim r4
   rests on was not yet true. r7 also **hardens the guard it uses**: the P-VIII zero-network scan is
   import-/primitive-based today and does **not** detect a `fetch` call, so r7 makes it call-based
   and allowlists the one loopback module by name. Depends on `r3` (it completes r3's work rather
   than redoing it); `r3` stays `done` @PR#3 and its delivered scope stands.
   **Clarified 2026-09-19 — NC1–NC3 resolved** (`human@batorfi`): **NC1 = async HTTP + an async
   spine** (`Resident.run` becomes async, threaded through `lane.run` → `walk` → `live-walk` →
   `scheduler.schedule`), **NC2 = loopback is local + harden the guard** (no constitution amendment),
   **NC3 = env-gated live tier** (`KILN_LIVE=1`, skip-with-record, fixture-based replay). **NC1's
   resolution confirms the r7-before-r4 sequencing**: the breaking change to r4's payload is real, and
   it now lands before r4 packages that surface. Decided on measured evidence — the `ollama` CLI
   exposes no `--seed`/`--temperature` (3 runs → 3 digests), while the HTTP path reproduced
   identically at temp 0 + seed 42.

### What `kiln-v1` means (defined by the human, 2026-09-21)

**`kiln-v1` is a fully runnable factory — including a real UI, commands, a director and roles.** It is *not* a runtime library plus proofs. The distinction was made explicit at the r7 seam,
because the program's rows r1–r7 built and verified the *pieces* (the single lane, the gates, the log, the affinity scheduler, Layers A/B/C as pure renders, a real local-model resident, the probes)
while nothing yet lets a person **use** them: `kiln/bin` is empty and `package.json` has no `bin`; the only Pi-API references in `kiln/` are comments; `.pi/` holds only spec-kit prompts; there are no
`agents/*.md` role files; and "director" appears only in comments. The concept document's own promise — *the human's only job is to plan the roadmap with the director, decide at the gates, and watch the kiln* —
is not yet something a newcomer can do.

### The runnable-factory rows (r8–r11) — one row, split at the r7 seam

The human first added **one** row (r8) to make the factory runnable. The director recorded a concern — one lane for *a real UI, commands, a director and roles* is very large (r1 alone, the lane, was a row) — and the human
ordered it **split** (2026-09-21T04:21:47Z). The split follows natural interfaces and puts the biggest unknown first:

- **r8 — the Pi extension foundation (opens with an API spike).** Exercise the Pi extension API for real — `ctx.ui`, commands, lifecycle — and load KILN as an actual Pi extension with a package layout the later rows build on;
  resolve the UI/keymap questions `ui-layers-deep.md §10` left open (r2 and r3 both deferred them as "later polish"). *Deps: r7.* **Why first:** the Pi API has never been exercised, and every later row depends on what it actually allows.
- **r9 — the real UI on Pi.** The three Flow layers (footer HUD, gate popup, roadmap overlay) on Pi's real `ctx.ui` — today they are pure renders driven through an abstract `LiveUICtx` — so a human answers a gate *in Pi* and the move is recorded as
  a real human decision; headless still prints and `WAIT`s, and a missing UI never approves. *Deps: r2, r8.*
- **r10 — role agents and model tiers.** The role agents (`agents/*.md`: the four line-of-defense roles, always on the strongest model, and the work roles), a **tier → model mapping**, and **unload-on-swap**, which turns the lane's `swap` from bookkeeping into a real
  model swap (P-IV) — the half of r7's code-review finding CR-5 that was left undone. *Deps: r8.*
- **r11 — the director and commands (the acceptance row).** The director — the scheduler that turns an approved spec into gated work units and holds the lane (today `director` appears only in comments and the only walk is a scripted throwaway) — and the commands to run a lane and answer its gates.
  **Acceptance:** a newcomer starts a lane on a real, non-throwaway feature in Pi and a human answers its gates. *Deps: r9, r10.* **A concern, recorded and not blocking:** r11 may itself prove too big; that is a call for its own first clarify.

**Why all four precede r4:** publishing, installing and documenting a factory that cannot yet be run — and whose surface these rows are about to change (an extension entry point, the package layout) — would repeat exactly the mistake r7 was placed before r4 to avoid.
r4 therefore depends on **all four** (`[r2, r3, r7, r8, r9, r10, r11]`).

### The distribution tail (r4–r6) — approved as proposed

- **r4 — cut the `kiln-v1` release.** *(Reworded at the r7 seam; it read "publish the toolchain to a public GitHub repo".)* `batorfi/kiln` is **already public** and now carries its README, an Apache-2.0 LICENSE, a NOTICE and
   third-party notices, so this row no longer *creates* a distribution point — it **cuts a release**: a curated, versioned, URL-runnable distribution of the runnable factory, i.e. a release manifest (what ships and what does not),
   a version tag and GitHub Release, and a `PublishedReady` probe. Pushing a release stays a human-gated network move (P-I / P-V). `deps: [r2, r3, r7, r8, r9, r10, r11]` — it fires only once the factory is runnable.
   Spec `005-kiln-publish` was revised to match.
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

The program is **approved** and **four rows are closed** (r1, r2, r3, r7). At the r7 seam (2026-09-21) the human **closed r7**, **defined `kiln-v1` as a fully runnable factory**, added **r8**, and — at 04:21:47Z — **split r8 into r8–r11** and **reworded r4** (*cut the release*), gated on all four. The next step is to **fire r8**:

1. ~~**Fire r1**~~ — **DONE**: 002-kiln-lane delivered (spec/plan/tasks/implement all written; the lane
    spine + HUD/Popup + the `RuntimeReady` dogfood shipped). Closed at the seam, nominal **@PR#1**.
2. ~~**Fire r2**~~ — **DONE**: 003-kiln-roadmap-overlay delivered (the Layer-C overlay + its Gate-0
    face + the headless print-and-`WAIT` twin + the `OverlayCReady` probe; 98/98 tests; an overlay accuracy fix (a queue row "waits" only not-yet-closed deps; all-deps-closed reads "eligible"); a closed-row program walk
    PASSES 001's `log.ts` while a broken auto-approve FAILs it with a named R3). Closed at the seam, nominal
    **@PR#2** (`c89f9b4` pushed to `main`).
3. ~~**Fire r3**~~ — **DONE**: 004-kiln-live-walk delivered — the first **full-rail** smoke walk, one
    feature end-to-end across Gates 1–9 (E1–E5: the resident adapter, the walk, the live TUI, the
    `LiveModelReady` probe); it also supplied the **live TUI smoke walk** r2 deferred under NC1. Verified 124/124;
    the live walk PASSes 001's *unmodified* `log.ts` while a broken `no-decidedBy` walk FAILs it with a named R3, the
    `--stub` stand-in is RECORDED (F-NOT-SILENT), `LiveModelReady` is READY, and the run is zero-cloud. Closed at the
    seam, nominal **@PR#3** (`06cad9c`/`a0f52df` on `main`; the close is the human's r3-seam move, P-VI).
4. ~~**Fire r7**~~ — **DONE**: 006-kiln-live-inference delivered — the kiln now fires a **real** local model through the same single lane (an async spine, a real Ollama-backed resident whose output is captured but never logged),
    with `OllamaReady` failing a *claimed* live run that *performed* nothing, and a P-VIII scan that genuinely reads the code (the old one had scanned zero files since r1). 232 tests; a fresh live capture reproduces the committed ledger byte for byte;
    a code review's 12 findings were all fixed and mutation-tested (29/29 killed); verification finding F-1 was **decided: keep as is**. Closed at the r7 seam, nominal **@PR#4** (`0c5bc19`…`7a196ca` on `main`; the close is the human's move, P-VI).
5. **→ Fire r8 (ADMITTED, next to fire).** The Pi extension foundation, opening with an API spike (see *The runnable-factory rows (r8–r11)* above). r8 is *admitted & eligible* (dep r7 done) but **not yet begun**
    (`chain_unattended=false`; it stays `queued`, not `active`, per M4). **Next action: scaffold spec 007 for r8** (`/speckit.specify`), and let its first clarify fix the spike's questions and what "loaded as a real Pi extension" means as an acceptance test.
6. **Then r9 → r10 → r11** (the real UI; roles and tiers; the director and commands — the acceptance row), **then fire r4** (cut the release) — `deps: [r2, r3, r7, r8, r9, r10, r11]`, so it becomes eligible only when r11 closes.
    Spec **005-kiln-publish** was revised for the new wording (the repository is already public; the README and LICENSE now exist).
7. **Chaining is off** (`chain_unattended: false`); any line-of-defense veto *inside* a row halts its lane;
   cross-row chaining, if ever elected, is per-row, logged, and veto-liftable — and stays that way across r8→r6.

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
| 2026-09-19T20:24:57Z | human@batorfi | `add-row` + `edit-rows` | **r7 inserted before r4** (ordering `r1,r2,r3,r7,r4,r5,r6`); **r4.deps → `[r2,r3,r7]`**. r7 pays the live-inference debt r3 carried forward; no row dropped, no existing row reordered relative to another, r3 stays `done` @PR#3. Proposed by the director (`specs/006-kiln-live-inference/gate0-add-row-proposal.md`), **decided by the human** |
| 2026-09-21T04:05:07Z | human@batorfi | `close` r7 + **define kiln-v1** + `add-row` + `edit-rows` | **r7 closed** (`done` @PR#4). **`kiln-v1` = a fully runnable factory (real UI, commands, director, roles).** **r8 inserted before r4** (ordering `r1,r2,r3,r7,r8,r4,r5,r6`); **r4.deps → `[r2,r3,r7,r8]`**. No row dropped; r1–r3 and r7 stay `done`. Proposed by the director, **decided by the human** |
| 2026-09-21T04:21:47Z | human@batorfi | `revise`/split r8 + reword r4 | **r8 split into r8–r11** (Pi extension foundation · real UI · roles and tiers · director and commands); ordering `r1,r2,r3,r7,r8,r9,r10,r11,r4,r5,r6`; **r4 reworded** to *cut the `kiln-v1` release* and **r4.deps → `[r2,r3,r7,r8,r9,r10,r11]`**. No row dropped; r8 keeps its id and narrows its scope. Proposed by the director, **decided by the human** |

> The re-admission is the **human's** program-level move the runtime never makes for itself (P-VI). It is logged here and in the head's `gate0.note` so a missing UI flips nothing and a silent approval is impossible (P-VII). `gate0.status` stays `approved` — a re-admission *and* an amendment, not a re-vote of the program. After the 2026-09-19T20:24:57Z amendment, **`r7` is the next row** and stays `queued` until its own lane fires; `r4` follows it, gated on `r7`.
>
> **On the amendment specifically (P-I).** The director *proposed* the row and the dep change and
> **could not make them**; the move above is the human's. The proposal was verified against the
> repo's own unmodified validator before the vote (schema-correct once decided, un-admittable while
> its `<<HUMAN-DECIDES>>` placeholders remained), and it recorded two validator findings it did
> **not** fix: `nextEligibleRow` counts an `aborted` row as satisfying its dependents (contradicting
> M2 and the constitution's "only when its `deps` are `done`"), and `checkM1`'s cycle detector
> follows only `deps[0]`, so a third dep is never traversed. Both are open hardening work.
>
> **On the r7-seam move specifically (P-I / P-VI).** The director *recommended* inserting a row before r4 and the human *decided* it — and, in doing so, **defined what `kiln-v1` means**, which is the more consequential decision: it turns r4–r6 from "package what exists" into "package a factory that runs". One concern is on the record and was not overridden: r8 is one very large row, so it should begin with a spike and may need splitting. `nextEligibleRow` now returns **r8**; it returns **r4** only once r8 is `done`.
>
> **On the split (P-I / P-VI).** The human ordered r8 split; the director proposed *where* to cut it and could not make the move. The shape puts the biggest unknown first (the Pi API spike) and makes r11 the acceptance row. `nextEligibleRow` still returns **r8**, then **r9** (r8 done), and returns **r4** only once **r11** is `done`.
