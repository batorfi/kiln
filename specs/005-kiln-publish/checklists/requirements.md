# Specification Quality Checklist: KILN Publish — the URL-runnable distribution point

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-19 · **Feature**: [spec.md](../spec.md) · **Row**: r4 of
[specs/ROADMAP.md](../../ROADMAP.md) (`deps: [r2, r3]`, re-admitted 2026-09-19 r3 seam; `queued`)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *see Note 1:* the spec names KILN's
    **distribution pieces** (the published toolchain, the publish recipe/manifest, a `PublishedReady`
    probe, "the one human-gated handoff") because **their existence is constitution-/row-mandated**
    (P-VIII "one network-permitting row," r3's "for r4" handoff, r5/r6 "from a public GitHub URL"
    premise); it **defers module/file names, NC1's content manifest, NC2's target+mechanism, and
    NC3's exact P-VIII reconciliation** to research.md / data-model / `contracts/` / plan.
- [x] Focused on user value and business needs (a newcomer *stands the kiln up from a URL*; a
    distribution point is *provable* it is complete, cloud-free in the firing, and never
    *silently* self-published).
- [x] Written for non-technical stakeholders ("point a URL at the kiln," "the net is still live, and
    the kiln never publishes itself," "the firing is cloud-free; one human-gated handoff" — not code).
- [x] All mandatory sections completed.

## Requirement Completeness

- [ ] **No [NEEDS CLARIFICATION] markers remain — PENDING.** **NC1 (what is published / content
    manifest), NC2 (target + mechanism + *does r4 perform the push*) and NC3 (the P-VIII
    "cloud-free-firing / one-handoff" reconciliation)** are **OPEN at gate-1** with their strongest
    options offered; they are the human's sign-off, **not** resolved here. *The spec is a **clarify-
    pending draft** — next step is `/speckit.clarify` (or a human gate-1 pass), then `/speckit.plan`.*
- [x] Requirements are testable and unambiguous (each FR has an acceptance scenario + a dogfood path
   via the unmodified 001/r1/r2/r3 validators **plus** r4's `PublishedReady` / cloud-free-firing
    probe).
- [x] Success criteria are measurable (SC-001..007: "exactly one URL-runnable point," "a broken
    publish/decider FAILs by name," "0 silent publishes," "0 cloud in the firing," "full capability,
    additive / no new `recordType`," "0 self-admission," "one full lane, judgeable + r5 unblocked").
- [x] Success criteria are technology-agnostic ("a newcomer resolves the URL," "the net is live,"
     "the kiln never publishes itself," "the firing is cloud-free," "one URL-runnable point" —
     substrate-neutral; GitHub/host is a *hosting* choice, not the constraint).
- [x] All acceptance scenarios are defined (US1–US3, each with Given/When/Then).
- [x] Edge cases are identified (a publish with no human move → `wait`, never auto-push; a missing
    manifested path → probe `ready=false`; a cloud round-trip *in the firing* is a **fault**; a
    line-of-defense veto halts the cruise; r4's close re-opens Gate 0, admits none).
- [x] Scope is clearly bounded (r4 = the distribution point + its `PublishedReady` proof; it
    **performs no installer [r5] and builds no docs/Pages [r6]** — FR-012; it **does not trim its own
    `[r1, r3]`** deps — FR-013; it **admits no program / advances no Gate 0** — FR-007/SC-006).
- [x] Dependencies and assumptions identified (a public GitHub **host** is the one P-VIII exception;
    the **content manifest** (NC1), **target+mechanism** (NC2), and **P-VIII reconciliation**
    (NC3) are held at gate-1; 001's log `recordType` **union is reused as-is** — a recorded human
    push + a `wait`, no new `recordType`; r1/r2/r3 artifacts are **imported, not re-declared**).

## Feature Readiness

- [ ] All functional requirements have clear acceptance criteria — **FR-001..FR-013 drafted**, each
     traced to an SC + a principle + an entity E1–E4; **NC1/NC2/NC3 must resolve first** (FR-002's
     manifest, FR-004/FR-005's "human-gated push vs. r4 performs it," and FR-010's P-VIII statement
    all depend on the three clarifications).
- [ ] User scenarios cover primary flows — **US1 (stand up from a URL), US2 (the distribution point is
     provable, not silent / not self-made), US3 (full capability, additive)** are drafted; they
    resolve fully once NC1–NC3 land.
- [ ] **Feature meets the measurable outcomes defined in Success Criteria — pending NCs.** SC-001..
    007 are drafted but cannot be *verified* until the manifest (SC-001/SC-005) and the
    "human-gated-vs-executed" push decision (SC-003/SC-004) are fixed by NC1/NC2/NC3.
- [x] No implementation details leak into the specification (module/file names, the content manifest,
     the `PublishedReady` shape, and the push recipe live in research / data-model / `contracts/` —
      not in the FRs/SCs).

## Notes

- This r4 spec is **additive, constitution-gated, and the row that first permits network** — it
   **extends r1/r2/r3** (`RuntimeReady` → `OverlayCReady` → `LiveModelReady` → r4's
   **`PublishedReady`**) and **discharges r3's "for r4" handoff**, while holding P-VIII to *a
   narrow, human-gated, cloud-free-firing exception.* It is a **first `/speckit.specify` draft with
   NC1–NC3 OPEN** (not yet clarified).
- **Next step**: a human **gate-1 sign-off / `/speckit.clarify`** that resolves NC1/NC2/NC3, then
     `/speckit.plan` → `/speckit.tasks` → `/speckit.implement` → `compliance-note.md`, following the
     r1/r2/r3 dogfood pattern: the unmodified validators PASS on a clean lane, a **broken / silent-
     publish path FAILs `PublishedReady` by name**, the **firing stays zero-network (001 `log.ts`,
    zero-network scan)**, and r4 **admits no program / advances no Gate 0** (P-VI/SC-006).
- The act of **publishing** (NC2/Q-A default) is a **human-gated Gate-9 move** — r4 produces the
   recipe + manifest + probe; **the kiln never `git push`es on its own** (P-V/P-VI/P-I).
