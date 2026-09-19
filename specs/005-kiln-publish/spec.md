# Feature Specification: KILN Publish — the URL-runnable distribution point (row r4)

**Feature Branch**: `005-kiln-publish`  *(provisional short-name; renameable before /speckit.plan —
the spec-directory name is per-checkout state, not a committed artifact)*

**Created**: 2026-09-19

**Status**: **Draft — first `/speckit.specify` pass, ready for the human's gate-1 sign-off.** r4 is
roadmap row **r4** in [specs/ROADMAP.md](../../ROADMAP.md): short "publish the kiln toolchain to a
public GitHub repo (the URL-runnable distribution point)", `deps: [r2, r3]`, `status: queued`. r4 is
the **distribution point**: the URL from which r5's installer *runs* and r6's docs *host*. This
draft is **NOT yet clarified** — three decisions (**NC1 manifest / NC2 target + mechanism / NC3 the
P-VIII reconciliation**) genuinely branch the spec and are held, unresolved, at gate-1. **Nothing
here admits a program, advances a gate, or performs a publish** (P-VI / P-V / P-VIII).

**Input**: the **kiln-v1** firing program row **r4** in
[specs/ROADMAP.md](../../ROADMAP.md). Re-admitted at the 2026-09-19 r3 seam as the
**admitted next-to-fire** row; it stays `queued` (not `active`) per **M4** because its lane has no
live gate yet (`chain_unattended=false`; r4 is not auto-lifted by r3's close).

**Provenance (what r4 builds on, all closed to `main`)**:
- **r1** `002-kiln-lane` — the runtime spine + Layers A/B over one `FactoryState`, a headless
   print-and-`WAIT` twin, and the `RuntimeReady` dogfood (@PR#1).
- **r2** `003-kiln-roadmap-overlay` — **Layer C** (the program-level zoom-out) + its headless twin +
   a blocking headless Gate 0, and the `OverlayCReady` probe (@PR#2).
- **r3** `004-kiln-live-walk` — the **first live-model smoke walk**: the live net (live resident,
   live walk PASSes 001's `log.ts` while a broken no-decider FAILs it by name), the deferred live
   TUI of Layers A/B/C, the `LiveModelReady` handoff probe, and the recorded `--stub` toggle
   (@PR#3). **r3 *supplies r4's proof that the kiln actually fires* — it is the trust anchor r4's
   public distribution point stands on.**

---

## Why this row, and the scope it is *already* fixed on

r4 exists so the kiln has a **single, public, URL-runnable distribution point**: a public GitHub repo
that *hosts the toolchain* such that a newcomer can stand it up (r5) and read it (r6) **without a
clone of the dev tree**. It is the row that turns "the kiln is a repo on one developer's machine"
into "the kiln is a thing you can point a URL at." The stable, already-admitted framing:

- **The full capability, UI included (`deps: [r2, r3]`).** The human confirmed at Gate 0 that r4
   needs the *full* capability — runtime **and** Layer C **and** the live proof — *not* just the
   runtime + proof. A future revision may trim this to `[r1, r3]` (publish the runtime + proof without
   waiting on Layer C); **that trim is out of r4's scope** and would be its own Gate-0 move.
- **It is P-VIII's one *network-permitting* exception — by design, and only as a handoff.** The
   constitution says *no cloud round-trip*; r4 is the **single** row whose deliverable literally *is*
   distribution over the network, and it is permitted **precisely because it is the bootstrap**: the
   *firing* stays 100% local, the *distribution handoff* is the one network action, and **once a
   target repo is stood up the resident remains local** (P-VIII, and r5's installer-local note).
- **The kiln never publishes itself.** Publishing is a *network*, *external*, *irreversible-ish*
   move with a real surface (a token, a repo name, a public namespace). Per **Principle I** (a
   producer role never blesses its own artifact) and **Principle V** (no *silent* approval of any
   gate, including a publish), the act of putting bytes out the door is a **human-gated, final move**
   — the kiln produces the *recipe + the proof + a falsifiable "ready" probe*, and the human does the
   push. This is the *publish* analogue of r3's "the live walk is judged by a human `decidedBy`."
- **r4 fires an *already-admitted* program; it admits none.** Per **P-VI**, r4 *does not* admit the
   program (that is Gate 0, already `approved`, `human@batorfi`). r4 *re-opens* Gate 0 at its own
   close (the next seam); it does not advance it.
- **One row = one full lane, judged by 001/r1/r2/r3, not by them.** As r1–r3 did, r4 is **additive**:
   it must not rewrite 001's log union, r1's runtime, r2's overlay/`OverlayCReady`, or r3's
   live-walk/`LiveModelReady`. r4 *extends* additively — a publish manifest + a **`PublishedReady`
   probe** (the r4 analogue of `LiveModelReady`) that PROVES the distribution point without
   *performing* it.

> **This spec is a DRAFT for the human's gate-1 sign-off.** It states **what** r4 must produce (a
> **public, URL-runnable distribution point that a newcomer can stand up from, cloud-free in the
> firing and network-permitting only at the *handoff*)** and **why** (no distribution point ⇒ r5's
> "install → run" path is not real, and r6 has nothing to host on — so r4 is the gate on the whole
> delivery tail), while holding the three decisions that genuinely branch the *how* of the manifest
> and the push (NC1 / NC2 / NC3) at gate-1. It defers module/file names, the exact published-artifact
> manifest, and the push mechanism to research.md / data-model / `contracts/` / plan, per
> Principle VIII (the local-first constraint) and the spec's "what/why, not how" scope.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A newcomer can stand the kiln up from a public URL, no dev-clone (Priority: P1)

**The story.** A newcomer developer wants to run the kiln without *knowing* this dev repo. r4 puts
the **toolchain** at a **public, URL-runnable** point so that standing it up is a *point-and-fetch*
move, not a *clone-the-development-history* move. r4 is the distribution point r5 (the URL-runnable
installer) *runs from* and r6 (newcomer docs) *hosts on*.

**Why this priority**: without a public, URL-runnable distribution point the entire delivery tail
(r5 *and* r6) is un-buildable — r5 "runs from the published URL, **never off an unpublished dev
tree**" and r6 "hosts on the published repo's Pages." r4 is the **gate** on both.

**Independent Test**: the published point is addressable by URL and resolves to **the** toolchain
(the `kiln/` runtime + schemas + validators + `contracts/`/`gate-rail` + the `.pi`/`.specify`
scaffolding), such that r5 can *reference that URL* and r6 can *host on that repo* — demonstrable
without the human having to hand anyone the dev tree.

**Acceptance Scenarios**:
1. **Given** r4's published distribution point, **When** a newcomer resolves the URL, **Then** they
   reach **the** toolchain (the r5/r6 "from a public GitHub URL" premise is *real*, not aspirational).
2. **Given** the distribution point, **When** r5's installer references its URL, **Then** the
   installer's "fetch the published toolchain over the network by design" handoff has a *thing to
   fetch* (r5 is unblocked).
3. **Given** r6's docs, **When** they need a home, **Then** the published repo's Pages *is* that home
   (r6 is unblocked).

---

### User Story 2 — The distribution point is *provable* without being *silent* or *self-made* (Priority: P1)

**The story.** r4 ships a **`PublishedReady`-style falsifiable readiness probe** (the r4 analogue of
r3's `LiveModelReady` / r1's `RuntimeReady` / r2's `OverlayCReady`): it asserts the **distribution
point EXISTS, is complete, is wired, pulls no cloud in the *firing*, and carries no *silent*
self-publish** — **without admitting a program or advancing a gate.** Each falsify hook (point a
manifested path at a missing file / open a "publish without the human" hole / let the *run* reach a
cloud round-trip) **names itself** and flips `ready=false`.

**Why this priority**: a public distribution point for a *governance* tool must be *trustworthy by
construction*, not merely asserted. r3's proof is that the kiln *fires*; r4's proof is that the
kiln **distributes honestly** — the *run* is cloud-free and the only network action is the
human-gated handoff. This is what makes r5/r6's "point at a URL" *safe*, not just *possible*.

**Independent Test**: the probe PASSes on a complete, wired, cloud-free dist with a *human-gated*
push; each falsify hook **names itself** and flips `ready=false`; a zero-network scan over the new
publish code finds **0** cloud round-trips **in the firing** (the handoff is the one permitted
network action, and it is a *human* move, not an automatic one).

**Acceptance Scenarios**:
1. **Given** a complete + wired dist and the human-gated push path, **When** the probe runs, **Then**
   `ready=true` with a per-check trace (the distribution point *exists and is honest*).
2. **Given** a "silently auto-publish" hole (a path that would put bytes public **without a human
   move**), **When** the probe runs, **Then** `ready=false` naming the fault — a publish is
   **never silent** (P-V/P-VI lifted to a network move).
3. **Given** the probe, **When** a zero-network scan runs over the new publish code, **Then** it finds
   **0** cloud round-trips **in the firing** (P-VIII): the only network action is the one
   human-gated *handoff*.

---

### User Story 3 — r4 distributes the *full* capability and stays additive (Priority: P2)

**The story.** r4 carries the **full capability** the ROADMAP pinned — runtime (**r1**), Layer C UI
(**r2**), and the live proof (**r3**) — as a coherent, versioned dist, and it **extends** the tree
rather than *re-declaring* it: no new log `recordType`, no rewrite of 001/r1/r2/r3's canonical
shapes. r4 is the row that also **closes r3's handoff debt** — r3 *named* r4 as "the public
distribution point the live proof is for"; r4 discharges it.

**Why this priority**: a distribution point that omits UI or proof would *lie* about the kiln's
capability; and a row that re-declares upstream artifacts would fork the single source of truth.
Both are P-I / P-IX violations r4 must avoid.

**Independent Test**: the dist's content manifest (NC1, held) resolves to the full capability incl.
UI + proof; the probe's "wire" checks confirm r1's runtime, r2's overlay, and r3's `LiveModelReady`
are **imported, not re-declared**; and r4 lands as an additive extension that **admits no program**
(no new Gate-0 admission; no new log union member).

**Acceptance Scenarios**:
1. **Given** the full-capability dist, **When** the manifest is resolved, **Then** runtime + Layer C +
   live proof are all present (deps `[r2, r3]`, full capability incl. UI).
2. **Given** r4's extension, **When** the factory-log union and r1–r3 shapes are re-checked, **Then**
   **no new** `recordType` is declared and upstream shapes are **not** re-written (additive; P-I/P-IX).
3. **Given** r4's close, **When** Gate 0 re-opens at the seam, **Then** r4 has **admitted no
   program** (it fired the already-admitted one; it *retires itself* and *re-opens* Gate 0).

---

### Edge Cases

- **The actual publish has no human move** → it is **blocked / recorded as a `wait`**, never
   auto-pushed. A publish is a gate with a *final* human sign-off (P-V/P-VI); a missing UI can
   **hide** it or print-and-`WAIT`, never **silently approve** it. *(The kiln does not `git push`
   on its own.)*
- **A manifested path resolves to a missing file** (NC1 boundary) → the `PublishedReady` probe
   **names the** fault and flips `ready=false`; the dist does **not** silently "publish what's
   there."
- **The *firing* tries to reach a cloud round-trip** (P-VIII) → this is a **fault**, not a feature:
   the *only* network action permitted is the single, **human-gated *handoff**.* Any network
   dependency *inside* the run makes the probe `ready=false`.
- **A line-of-defense veto during r4's lane** (critic objection / reviewer `restart` / verifier
   `reject` / checkpoint overflow) → the **cruise halts** and returns the lane to a human
   (P-I/P-V).
- **r4's own close opens Gate 0** → r4 **never self-admits** r5/r6 (P-VI); it *re-opens* Gate 0 at
   the seam for the human to re-admit the tail r5→r6. No row is retracted by r4's close.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** KILN SHALL produce a **public, URL-runnable distribution point** for the kiln
   toolchain — a point a newcomer can *resolve by URL* to stand the kiln up **without cloning the
   dev tree** (the r5/r6 "from a public GitHub URL" premise).
- **FR-002** The distribution point SHALL carry the **full capability** the ROADMAP pinned for r4 —
   **runtime + Layer C UI + the live proof** (deps `[r2, r3]`), as one coherent, versioned dist.
      *(Content boundary held at NC1.)*
- **FR-003** The distribution point SHALL be a **falsifiable `PublishedReady`-style proof**, not a
   bare assertion: its "exists / is complete / is wired / is cloud-free in the firing / carries no
   silent self-publish" claim SHALL each have a hook that **names itself** and can flip
   `ready=false`.
- **FR-004** Publishing SHALL be a **human-gated, final move**: no path in the kiln SHALL put bytes
   public **without a recorded human decision** — a publish with no human move is blocked / recorded
   as a `wait`, **never** auto-pushed (P-V/P-VI, lifted to a network move; P-I: a producer role never
   blesses its own *public* artifact).
- **FR-005** The **firing** SHALL remain **cloud-free** (P-VIII): the kiln's *run* pulls **0**
   external round-trips; the **only** network action permitted is the single, **human-gated
   *handoff*** at distribution, after which the *resident remains local.*
- **FR-006** r4 SHALL be **additive**: it SHALL NOT re-declare 001's log `recordType` union, r1's
   runtime shapes, r2's overlay/`OverlayCReady`, or r3's live-walk/`LiveModelReady` — it extends
   them (P-I/P-IX; one source of truth).
- **FR-007** r4 SHALL **admit no program**: it fires the already-admitted program in
   `specs/ROADMAP.md` and, at its close, **re-opens** Gate 0 for the human's re-admission of the
   tail (P-VI). It does not advance Gate 0 on its own.
- **FR-008** r4 SHALL be **greppable in the factory-log lineage** (P-VII): its transitions, gate
   completions, the recorded human push decision, and its `PublishedReady` result are reconstructable
   from the log alone; a closed terminal leaves a complete trail.
- **FR-009** r4 SHALL **discharge r3's handoff**: r3 named r4 as "the public distribution point the
   live proof is for"; r4 is that point, and r5/r6 are thereby unblocked.
- **FR-010** Because r4 is the one **network-permitting** row, it SHALL **state its P-VIII
   exception explicitly and narrowly** — *distribution handoff only, human-gated,
   resident-stays-local-afterward* — and a missing UI **degrades to a print-and-`WAIT`, never a
   silent publish** of the point.
- **FR-011** r4 SHALL be a **single full Gates 1–9 lane** (row = whole firing), gated by a human at
   each gate and judgeable by the same unmodified validators/probes r1–r3 left (001's `log.ts`,
   `roadmap.ts`, `runtime-ready`, `overlay-ready`, `live-ready`), plus the new `PublishedReady` probe.
- **FR-012** *(Scope guard, out of r4.)* r4 SHALL NOT perform r5's **installer** (the fetch/bootstrap
   that *runs the* distribution point) or r6's **docs/Pages** build; those are the downstream rows it
   **unblocks**, not part of r4.
- **FR-013** *(Scope guard, out of r4.)* r4 SHALL NOT re-trim r4's own `deps` to `[r1, r3]` (the
   "publish the runtime + proof without Layer C" future revision) — that is a **Gate-0 / roadmap**
   move, not an in-lane change.

### Key Entities

- **E1 — The Published Toolchain (the distribution artifact).** What r4 publishes: the kiln as a
   coherent, versioned dist. *Content boundary held at NC1* (the stable core is `kiln/` runtime +
   schemas + validators + `contracts/`/`gate-rail` + the `.pi`/`.specify` scaffolding, over an *as
   yet unknown* treatment of dev-process `specs/` history and local `kiln/factory-log/*.jsonl`,
   which git-ignores).
- **E2 — The Publish Recipe / Manifest.** The declarative, *reviewable* description of which artifacts
   go public, where, and under what gate — the thing a human *reads and signs*; **not** an
   executable auto-pusher.
- **E3 — `PublishedReady` (the readiness probe).** E3 is r4's falsifiable proof (the analogue of
   r1's `RuntimeReady`, r2's `OverlayCReady`, r3's `LiveModelReady`): it asserts E1 *exists / is
   complete / is wired / is cloud-free in the firing / carries no silent self-publish*, and its
   falsify hooks name themselves.
- **E4 — The Human Push (the one network move).** The single, human-gated distribution *handoff* —
   the recorded human decision that puts E1 public. It is the one P-VIII exception, and the kiln's
   only "network" action.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** The kiln has **exactly one** public, URL-runnable distribution point, and a newcomer can
   resolve it by URL (the r5/r6 "from a public GitHub URL" premise is *real*, verifiable by resolving
   the URL — not by cloning the dev tree).
- **SC-002** A `PublishedReady` probe runs **green** on the complete + wired + cloud-free dist, with
   a per-check trace; every falsify hook (missing manifested path / a silent-self-publish hole / a
   cloud round-trip *in the firing*) flips it `ready=false` **by name.**
- **SC-003** **Zero silent publishes**: no path can put the toolchain public **without a recorded
   human decision** — a publish with no human move is a blocked / `wait`ed gate, demonstrably.
- **SC-004** **Zero cloud in the firing**: a zero-network scan over r4's new publish code finds **0**
   external round-trips *inside* the run; the only network action is the single human-gated
   *handoff* (P-VIII).
- **SC-005** The dist carries the **full capability** (runtime + Layer C + live proof), and the
   "wired" checks confirm r1/r2/r3 artifacts are **imported, not re-declared** (**no new** log
   `recordType`; upstream shapes untouched).
- **SC-006** **Zero self-admission**: at r4's close Gate 0 *re-opens*; r4 has admitted **no** program
   (it fired the already-admitted one) — verifiable from the log: no new Gate-0 admission by r4.
- **SC-007** r4 is a **single full lane**, judgeable by the same unmodified validators/probes r1–r3
   left **plus** `PublishedReady`; r5 is thereby **unblocked** ("runs from the published URL"), and
   r4 has **discharged r3's handoff** (SC-009 analogue: r3's "for r4" is met).

## Assumptions

- **A public GitHub host is available** for the distribution point (the *host* is the one
   network-permitting exception, P-VIII; the *firing* stays local). The repo *target/visibility/
   namespace* and the *push mechanism* are held at **NC2**. *(Reasonable default: a public repo;
   the human chooses the exact target.)*
- **The published dist is a curated, versioned artifact**, not the raw dev tree with its history; its
   exact content boundary (in vs. out for `specs/`, `kiln/factory-log/*.jsonl`, `docs/concepts/`,
   the constitution) is held at **NC1**. *(Reasonable default: ship the toolchain + scaffolding +
   docs-source; **not** local dev process / git-ignored runtime logs.)*
- **The push is a human-gated final move**, not something the kiln performs on its own — the
   *specification, recipe, manifest, and `PublishedReady` probe* are r4's deliverables; the *act of
   publishing* is the human's Gate-9 sign-off. This default is *strong* (it follows P-V/P-VI/P-I
   directly), but **NC2/NC3** pin it precisely because r4 is the row with real external surface.
- **r4 reuses 001's `log.ts` record union as-is** (like r1/r2/r3): a "publish" or "human push"
   event, if any, is expressed *within* the existing `transition` / `gate-completion` /
   `human-decision` / `wait` shapes (a recorded human decision + a `wait`, not a new `recordType`).
- **This draft is pre-plan**: module/file names, the exact manifest, the `PublishedReady` probe's
   shape, and the push recipe all live in research.md / data-model / `contracts/` / plan, not here.
   r4 extends the lane additively; it does not re-open r1–r3.

## Clarifications

### Session 2026-09-19 (OPEN — gate-1; pending human@batorfi)

The following three decisions genuinely branch the spec and have **multiple reasonable
interpretations with no single safe default** (r4 is the network-permitting row, so the stakes are
higher than a throwaway). They are **held, not resolved**, for the human's gate-1 sign-off. Per
`/speckit.specify`, at most 3 markers are carried; each offers the strongest options.

#### Q (NC1) — *What* is "the kiln toolchain" that r4 publishes?

**Context**: the ROADMAP distribution-tail says r5's installer "drops the kiln toolchain — `kiln/`,
schemas, validators, gate-rail, and the `.pi`/`.specify` scaffolding," and r6 "reuses
`docs/concepts/` as source and adds the operational layer." But it is silent on the **boundary**:
does r4 publish the **whole dev repo as-is** (history + dev `specs/` + git-ignored local logs
included), or a **curated release dist**?

**What we need to know**: the **content manifest** of the published dist — what travels public, and
what is deliberately excluded.

| Option | Answer | Implications |
|--------|--------|--------------|
| A       | **Curated release dist**: ship `kiln/` (runtime + schemas + validators + `contracts/`) + `.pi/`/`.specify/` scaffolding + `docs/concepts/` (source for r6) + the constitution *of record*; **exclude** dev-process `specs/` history and git-ignored `kiln/factory-log/*.jsonl`. | Smallest public surface; cleanest "this is *the toolchain*" story; the most P-VIII-narrow. |
| B       | **Publish the whole repo as-is** (a faithful mirror, history intact). | Maximally transparent; no curation to get wrong; but leaks dev process / local logs unless the host is curated by ignore-rules. |
| C       | **Hybrid**: ship a curated *artifact* dist **and** keep the full repo public too, so the toolchain *and* the lineage are both reachable. | Most open; two public surfaces; the installer points at the *artifact* dist, docs at the *repo*. |
| Custom | Provide your own manifest treatment. | — |

#### Q (NC2) — *Where* and *how* is r4 published, and *does r4 perform the push?*

**Context**: r4 is "publish the kiln toolchain to a **public** GitHub repo." This is the one row with
a token, a namespace, and an *external, near-irreversible* surface. P-VI/P-V say the kiln never
*approves its own work* and never *silently* acts; P-I says a producer role never blesses its *own
public artifact.*

**What we need to know**: (a) the **target** — a **new** public repo (human-chosen namespace) vs.
making the **current** repo public; (b) the **mechanism** — `git` remote + `push` vs. `gh repo
create` + push; and (c) the crux — **does r4's lane *execute* the push, or *specify + gate* it for
the human's Gate-9 sign-off?**

| Option | Answer | Implications |
|--------|--------|--------------|
| A       | **r4 specifies + gates; the human pushes** (r4 = the recipe + manifest + `PublishedReady` probe + a *recorded* human push move). | Honors P-VI/P-V/P-I; the "publish" is a recorded human event; the kiln never `git push`es on its own. *(Recommended default.)* |
| B       | **r4 performs the push** (a human-authorized, scripted publish at Gate 9). | One-step to ship; but gives the lane a network + token surface — the strongest case for keeping P-V "never silent" *and* P-I "never self-bless." |
| C       | **New repo** vs. **make current public** — pick the target the newcomer install story implies. | A new public repo is the cleaner "distribution point" story; making the current repo public is the least work but mixes dev + dist. |
| Custom | Provide your own target + mechanism. | — |

#### Q (NC3) — *How does r4 stay "no cloud" while its deliverable is distribution?*

**Context**: P-VIII says *no cloud round-trip*; r4's deliverable is literally distribution *over the
network.* The ROADMAP resolves *intent* ("the installer fetches over the network by design — the one
row that is network-permitting precisely because it is the bootstrap; once installed the resident
remains local"). But the spec must pin **what r4 actually proves vs. performs.**

**What we need to know**: the exact **P-VIII reconciliation** — that the *firing* is 100% cloud-free
and the **only** network action is the single, **human-gated *handoff***, proven by a
`LocalFirst`/`PublishedReady` "zero cloud in the firing" check.

| Option | Answer | Implications |
|--------|--------|--------------|
| A       | **"Cloud-free firing, one human-gated handoff"**: r4 proves the *run* is 0-network; the *push* is the lone, recorded exception. | The constitution stays *true* (local-first); r4 is *narrowly* network-permitting, by exception not by default. *(Recommended default.)* |
| B       | **Full network permitted at r4** (distribution is the new norm). | Loosens P-VIII for the tail; r5/r6 would be "network," a material governance change (would be its own amendment note). |
| C       | **No network at all — r4 produces only an offline tarball + manifest; the human mirrors it.** | Maximally local; but the "URL-runnable / from a public GitHub URL" premise of r5/r6 stops holding. |
| Custom | Provide your own reconciliation. | — |

---

## Trace

- **P-I (author/judge separation)** — a *producer* role (techwriter/PR-writer, r4's content) never
   *blesses its own public artifact*; the publish is a **human-gated** move (NC2/Q-A). FR-004/SC-003.
- **P-V (no silent approval)** — no path silences a *publish*, *Gate 0 included*; a missing UI
   **prints-and-`WAIT`s**, never auto-publishes. FR-004/FR-010/SC-003.
- **P-VI (Gate-0 human-only)** — r4 **admits no program**; it fires the already-admitted program and
   **re-opens** Gate 0 at its close. FR-007/SC-006.
- **P-VIII (local-first, no cloud)** — the **firing** is 0-network; the **only** network action is
   the one human-gated *handoff*, and the resident stays local afterward. FR-005/FR-010/SC-004/NC3.
- **P-VII (recorded)** — r4's transitions, gate completions, the **recorded human push**, and the
   `PublishedReady` result land in the factory-log, greppable and reconstructable. FR-008.
- **P-IX (one source of truth, event-driven, no poll/server)** — r4 **extends** 001/r1/r2/r3 (no new
   `recordType`, no re-declared shapes); the dist is a *read*, not a second source. FR-006/SC-005.
- **M4 (roadmap status invariants)** — r4 is `queued`/`eligible` (deps `[r2, r3]` done) but **not
   `active`** until its lane starts; r4's close re-opens Gate 0 for r5→r6. FR-007/FR-011.
- **R1–R6 / 001** — r4's lane is *judged by* 001's unmodified `log.ts` (a clean walk PASSES; a
   broken no-decider/publish FAILs by name). FR-011/SC-007.
- **Provenance** — r1 (`RuntimeReady`), r2 (`OverlayCReady`), r3 (`LiveModelReady`, the live proof
   r4 distributes) are **imported and extended**, not re-declared. E3 / FR-006.
