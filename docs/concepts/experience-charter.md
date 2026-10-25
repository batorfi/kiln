> Status: concept — **proposal** (2026-10-25, drafted for human@batorfi). Nothing here is decided until a person approves
> it; building it is admitted only at the Roadmap gate (`add-row` / `edit-rows`).
> Type: concept
>
> Scope note: this doc proposes an **experience charter** — a short, human-approved, versioned document that fixes the
> *user experience* of a product before its first roadmap exists, so every roadmap row and every feature is grounded in
> one picture of who the product is for, what they do with it and how it should feel. It is made during setup, next to the
> product brief and the constitution; it is **not a gate** and changes no flow invariant. It is a concept, not a spec.
>
> Companion docs:
>   - First run:              `first-run.md` (§8.2 the constitution; this doc adds a step beside it)
>   - New codebases:          `greenfield.md` (§5 framing: the product brief and the constitution)
>   - Existing codebases:     `brownfield.md` · Explore first: `code-exploration.md`
>   - The flow:               `the-flow.md` · An extensible flow: `extensible-flow.md`
>   - Shaping the roadmap:    `the-director.md` §4.3 · The bench: `the-bench.md`
>   - User experience of KILN itself: `user-experience.md`
>   - The constitution:       `../../.specify/memory/constitution.md` · The PRD: `../prd/kiln-prd.md`

# KILN — the experience charter

## 1. In one paragraph

A product built by a factory drifts when nobody holds its experience as a whole: each feature is reasonable alone, and
together they feel like five products. The **experience charter** is the one place that holds it. It is a short document
— one to three pages — written during setup, from the product brief, and **approved by a person before the first Roadmap
gate**. It names the **users**, the **experience principles**, the **top journeys**, the **screen map**, the
interaction and content **conventions**, an **accessibility floor** and where the **design tokens** live. The planner
reads it first when it drafts a roadmap; the Roadmap gate brief shows a **journey coverage map** against it; every later
brief cites it as part of the yardstick. It is amended only by recorded decisions, and never in the middle of a feature.

## 2. Why a charter and not a gate

The Roadmap gate is the fixed first anchor of every flow, and a flow can only add gates *between* built-in ones
(`extensible-flow.md` §3). An upfront gate would need a constitutional amendment. It does not need one: KILN already has a
pattern for things that must be settled by a person before the first roadmap — the **product brief** and the
**constitution** (`greenfield.md` §5, `first-run.md` §8.2). The charter is a third artifact of the same kind.

| | A new gate before the Roadmap gate | The charter (this proposal) |
|---|---|---|
| Flow invariants | broken (Roadmap gate first) | untouched |
| Constitution | amendment needed | none needed (§9) |
| Who decides | a gate decider | the person approving setup, recorded |
| Revisited | never — a gate is per feature | at every Roadmap gate, where program decisions already live |

## 3. What the charter holds

| Part | What it says | Example |
|---|---|---|
| **Users and situations** | who uses the product, in what situation, with what skill and device | *billing operators, at a desk, many invoices a day* |
| **Experience principles** | 3–7 short, testable statements, each with its origin and what it rules out | *X2 · Show the consequence before the click — no destructive action without a preview* |
| **Top journeys** | the 3–8 things users must be able to do, each as numbered steps with stable ids | *J1 · Correct a prorated invoice: J1.1 find it · J1.2 see why · J1.3 adjust · J1.4 confirm* |
| **Screen map** | the information architecture: areas, main screens and how they connect | *Invoices → Invoice → Proration trail* |
| **Interaction patterns** | the reusable behaviours every screen follows | *every list has empty, loading and error states; undo over confirm dialogs* |
| **Content voice** | tone, terminology, what the product never says | *plain words; "plan change", never "mutation"* |
| **Accessibility floor** | the minimum every screen meets | *WCAG 2.2 AA; full keyboard operation; nothing by colour alone* |
| **Design tokens** | where colours, type, spacing and components are defined — a pointer, not a copy | `design/tokens.json` |
| **Quality bars** | measurable experience limits | *first meaningful screen < 1 s on the reference machine* |
| **Non-goals** | experiences deliberately left out | *no mobile app in this release* |

Rules: every principle and journey has a **stable id** (`X2`, `J1.3`) that briefs, rows and reviews cite; every part says
**where it came from** (the product brief, research, a person's decision, the existing product); nothing is invented
silently — a gap is written as an **open question**, not filled with a guess. A starter template is in §14.

## 4. How it is made

**New codebase** (`greenfield.md` §14). After the product brief is approved:

1. the planner drafts the charter from the brief, its users and quality attributes, and the workshop's standing
   preferences, using the §14 template, each principle and journey citing its source, and open questions where the brief is
   thin;
2. the person edits it — alone, or in a shaping conversation with the planner, with alternatives side by side;
3. the person approves it; setup records `charter.approved` with its version, its approver and its content hash;
4. it is committed to the factory's worktree at `.specify/memory/experience-charter.md`, beside the constitution, as part
   of the first commit set the person has already reviewed.

**Existing codebase** (`brownfield.md`, `code-exploration.md`). The charter is **discovered, then confirmed**: the scan and
the explore space inventory the screens, routes, flows and existing conventions into a draft labelled *measured* or
*inferred*; the person corrects it; what the product does today is recorded as **as-is journeys**, and the charter says
plainly which parts are *as-is* and which are *intended*. Nothing is written to the team's repository except through its
own pull request.

**Who approves.** A Decider of the factory, or a person the workshop names for experience decisions (a designer, a product
owner). Approval is one person's recorded decision — never a model's, never inferred from absence.

**Without a charter.** A factory with no charter still works: briefs say *no experience charter*, the coverage map is
empty and says so. Setup offers the step and never forces it, so existing factories are not blocked.

## 5. Keeping it true

- **Versioned.** Semantic versions: MAJOR when a principle or a top journey is removed or redefined, MINOR when one is
  added, PATCH for wording. Every version is a commit and an event (`charter.amended`) with its decider and reason.
- **Amended at the Roadmap gate.** The gate re-opens after every merged or abandoned feature (Principle VI), so that is where
  an amendment is proposed, discussed and decided — with the evidence from the feature just finished. A proposed
  amendment is shown in the brief with its diff and the rows it affects.
- **Never in flight.** A feature **pins the charter version at admission**, like gate versions (`extensible-flow.md` §7). A
  new version applies to features admitted after it; a feature already in progress is shown *a newer charter exists* at its
  next gate and may adopt it by a recorded decision, never by default.
- **Drift is visible.** The knowledge keeper's lint compares the shipped screens and the screen map and offers findings
  (*a screen exists that the map does not show*); findings are suggestions to a person, never edits.
- **A document, not a wiki page.** The charter is a committed repository artifact, because it is a **yardstick** that
  briefs and judges measure against. Knowledge pages may *describe* it and cite it; they never replace it
  (Principle X).

## 6. How it grounds the roadmap

When the planner drafts a roadmap (`the-director.md` §4.3) it **reads the charter with the roadmap brief**, proposes
**vertical slices along the top journeys** (`greenfield.md` §9) and tags each row with the journey steps it serves. The
Roadmap gate brief then shows a **journey coverage map**:

| Journey | Rows | Coverage |
|---|---|---|
| J1 Correct a prorated invoice | r3 (J1.1, J1.2) · r5 (J1.3, J1.4) | **complete** after r5 |
| J2 Review month-end totals | r4 (J2.1) | **partial** — J2.2, J2.3 have no row |
| J3 Export for audit | — | **none** — deferred in the charter? |
| *(no journey)* | r6 Refactor tax module | **serves no journey** — fine if it is not user-facing |

Deterministic checks, computed from the roadmap head and the charter, never by an LLM, shown at the gate and never
blocking it (the gate is a person's decision):

1. every journey step cited by a row exists in the charter at the pinned version;
2. every top journey has at least one row, or is marked **deferred** or **non-goal** in the charter;
3. every row that changes user-facing behaviour names at least one journey step or says why it has none;
4. rows citing a journey step whose predecessors have no row are flagged as **out of order**;
5. the charter version the roadmap was drafted against is the current one.

Anything failing a check is shown as a **gap**, honestly, in the brief (BRIEF-3). The planner may propose fixes — a new
row, a reorder — and may never change a row the engineer wrote (DIR-5).

## 7. How it grounds each feature

| Where | What changes |
|---|---|
| **Concept and Specification briefs** | *the yardstick* part cites the principles and journey steps the feature serves, and the accessibility floor |
| **Design brief** | cites the screen map and interaction patterns the design must follow, as it cites the constitution |
| **Judges** | the architecture critic and the code reviewer are given the charter as part of their inputs and report findings against its ids |
| **Experience design and UI review gates** *(proposed separately)* | the added gates measure against the charter; without them the charter still informs every built-in brief |
| **Verification** | the accessibility floor and quality bars become checks where they can be run deterministically |
| **Documentation and knowledge** | feature stories link the journeys a feature completed; the knowledge base cites the charter version |
| **Bench** | a journey with unproven assumptions is offered as *research this* / *spike this* in the Roadmap-gate evidence view |

## 8. Teams

In a team (`team-space.md`) the **team floor** may carry a **shared charter floor** — the accessibility floor, the design
tokens, content voice — that every member workshop's charter may only make **stricter**, like configuration layering
(`configuration.md`). Journeys and the screen map belong to the product's factory. Changing the floor is a decision of
the team quorum; a workshop's amendments stay its own (Principle XII). A teammate's comment on an amendment is a person's
evidence, never a decision.

## 9. How it fits KILN's rules

| Principle | How the charter honours it |
|---|---|
| **I · No self-approval** | a model drafts it; only a person approves or amends it |
| **V · A missing person never approves** | an unapproved charter is *absent*, never assumed; no clock approves it |
| **VI · Roadmap gate human-only** | amendments are decided at the Roadmap gate; no delegation reaches them |
| **VII · Everything recorded** | `charter.approved` and `charter.amended` are events with actor, version and hash; features record the version they pinned |
| **VIII · Local by default** | drafting runs on the factory's models under its policy; nothing leaves because of the charter |
| **X · Knowledge is context, never authority** | the charter is a committed artifact, not a wiki page; knowledge cites it but cannot override it |
| **XII · Workshops are sovereign** | a team floor only tightens; no team act settles a workshop's amendment |
| **Flow invariants** | no gate added before the Roadmap gate; the flow is unchanged |

No constitutional amendment is needed. If the constitution's rule that briefs cite its principles is later extended to
name the charter, that is a MINOR clarification a person approves.

## 10. Proposed requirements

Identifiers use `XCH-` to avoid the PRD's `EXPL-` (explore) prefix.

| ID | Requirement | |
|---|---|---|
| XCH-1 | **Charter artifact**: the ten parts of §3 with stable ids and a source per part, committed at `.specify/memory/experience-charter.md`; a starter template ships with KILN | Must |
| XCH-2 | **Setup step**: draft from the product brief (new codebases) or discover and confirm (existing); approval by a Decider or a named person; recorded; never forced | Must |
| XCH-3 | **Versioning and amendment**: semantic versions; amendments decided at the Roadmap gate with a diff and affected rows; pinned per feature at admission; `charter.approved` and `charter.amended` in the catalog | Must |
| XCH-4 | **Planner input**: the planner reads the charter first and proposes slices along the top journeys, tagging rows with journey-step ids; it never changes a row the engineer wrote | Must |
| XCH-5 | **Coverage map**: the five deterministic checks of §6 in the Roadmap gate brief, shown as gaps, never blocking | Must |
| XCH-6 | **Briefs cite it**: the yardstick part of Concept, Design and Specification briefs cites the principles, journey steps and floor that apply | Must |
| XCH-7 | **Judges and checks**: judges receive the charter; the accessibility floor and quality bars run as deterministic checks at Verification where possible | Should |
| XCH-8 | **Drift lint** between screen map and shipped screens, as findings only | Should |
| XCH-9 | **Team floor** for the shared parts, stricter-only, changed by quorum | Could |

## 11. Where it lands in the program

The admitted roadmap (`specs/ROADMAP.md`) is changed only at the Roadmap gate, so these are **proposals for that gate**:

| Row | Proposed change |
|---|---|
| **r28 First run** | adds the charter step beside the constitution (XCH-2); the kiln init / kiln doctor flow records it |
| **r29 New codebases** | the product brief gains its charter, drafted from it; the walking skeleton cites it and the design tokens (XCH-1, XCH-6) |
| **r22 Shaping the roadmap together** | the planner reads the charter and the coverage map joins the Roadmap gate brief (XCH-4, XCH-5) |
| **r20 Gates on the web** | the brief's yardstick cites charter ids (XCH-6) |
| **r30 Existing codebases, part 1** and **r43 Explore space** | the discovered charter draft comes from the scan and the explore maps |
| **r15 The record** | the two new events enter the catalog |

Either each change is folded into those rows with `edit-rows`, or one new row — *the experience charter* — is added
after r23 with `add-row`. The Roadmap gate decides which; this doc does not.

## 12. Open questions

1. **File location.** `.specify/memory/experience-charter.md` (beside the constitution; KILN-owned file in Spec Kit's
   memory directory) or a KILN-owned path such as `docs/experience-charter.md`? Default proposed: beside the constitution.
2. **Approver.** Any Decider, or a named experience owner when one exists?
3. **Size.** Is one to three pages the right ceiling, or should a large product allow per-area appendices?
4. **KILN's own charter.** KILN is built by its own process; should it adopt a charter for its web front door, seeded from
   `user-experience.md`?
5. **Visual artifacts.** Should the screen map and journeys be allowed as rendered images next to the text (as the
   mockups are), with the text remaining the source of truth?
6. **Legacy products.** For an existing product with no coherent experience, is an *as-is* charter enough, or should the
   first feature be a deliberate experience reset?

## 13. One sentence

The experience charter is a short, person-approved document made at setup, before the first roadmap, that holds who the
product is for and how it should work as a whole — so the planner shapes the roadmap along real journeys, the Roadmap gate
shows what is covered and what is not, and every feature is measured against one picture instead of five.

## 14. Appendix — starter template

```markdown
---
charter: experience
product: <name>
version: 1.0.0
approved_by: <person>
approved: <date>
brief: <link to the product brief page>
---

## Users and situations
- U1 · <who> — <situation, skill, device> · source: <brief | research | decision>

## Experience principles
- X1 · <testable statement> — rules out: <what> · source: <…>

## Top journeys
- J1 · <name>
  - J1.1 <step> · J1.2 <step> · …   status: build | deferred | non-goal

## Screen map
<areas → screens → connections, as a list or a diagram; one line each>

## Interaction patterns
- <pattern> — applies to: <screens>

## Content voice
<tone, terms to use, terms never to use>

## Accessibility floor
<standard and level; keyboard; contrast; motion; language>

## Design tokens
<path to tokens and component sources>

## Quality bars
- <measurable limit> — measured by: <check>

## Non-goals
- <experience deliberately left out>

## Open questions
- <gap not to be guessed>
```
