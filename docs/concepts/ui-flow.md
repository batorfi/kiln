> Status: concept — **approved by human@batorfi (2026-10-25)**; revised the same day: the two gates are **built into the
> default flow**, not an extension. Admitting the work into the program is decided only at the Roadmap gate (`add-row` /
> `edit-rows`). Direction **A** (one design gate) plus the **UI review** gate were chosen in review.
> Type: concept
>
> Scope note: this doc defines the two **built-in interface gates** of the default flow — **Experience design** (after
> Architecture, before Specification) and **UI review** (after Code review, before Verification). It gives their gate
> definitions, the roles and checks behind them, what their briefs show, where their moves lead, when they apply to a
> feature, and how they keep the contract of every gate. It is a concept, not a schema or a spec; the gate files here are
> drafts. (The file keeps its name, `ui-flow.md`, for existing links.)
>
> Companion docs:
>   - The experience charter:  `experience-charter.md` (what these gates measure against) · The design system: `design-system.md` (what the interface is built from)
>   - An extensible flow:      `extensible-flow.md` (the rules every gate keeps; §14a for conditionally applicable built-in gates) · The flow: `the-flow.md`
>   - Configuration:           `configuration.md` (where gate, flow and role files live)
>   - The record:              `the-record.md` · Teams: `team-space.md` · Insights: `insights.md`
>   - The constitution:        `../../.specify/memory/constitution.md` · The PRD: `../prd/kiln-prd.md`

# KILN — the interface gates: Experience design and UI review

## 1. In one paragraph

KILN's default flow has twelve gates, two of which are about the interface and **apply when a feature touches it**.
**Experience design**
sits between Architecture and Specification: a designer role drafts the journeys, screens, states and mockups a feature needs,
an independent critic judges them against the **experience charter**, and a person decides — so the Specification gate
can fix *what done looks like* in terms of approved screens. **UI review** sits between Code review and Verification:
deterministic checks and an independent judge compare what was built with what was approved — accessibility, tokens,
states, visual match — and a person decides again. Both gates keep the full gate contract: durable, waiting, settled only
by a person's move, recorded. They are part of the standard flow; each carries a deterministic `applies_when` rule, and for
a feature that does not touch the interface they are recorded as **not applicable** (§3, §6).

## 2. Where the gates sit

```
Roadmap · Concept · Architecture · ▸ Experience design ◂ · Specification · Work plan · Implementation · Code review
                                                                                      · ▸ UI review ◂ · Verification · Documentation · Merge
```

| | Experience design | UI review |
|---|---|---|
| **Phase** | contract | build and prove |
| **Question** | *Is this the right experience — for these users, these journeys, within the charter?* | *Does what was built match what was approved, and is it accessible and consistent?* |
| **Placed** | after Architecture, before Specification | after Code review, before Verification |
| **Why there** | the architecture is known, nothing is specified yet — the spec can cite approved screens | the code is reviewed, nothing is proved yet — the verifier can check what UI review accepted |
| **Judged** | yes — design critic | yes — UI reviewer, with deterministic checks as evidence |
| **Artifact** | `experience.md`, mockups, a states matrix | `ui-review-report.md`, screenshots, check results |
| **Delegable** | no (and it sits before the arming point) | no by default (§8) |

Both are built-in gates: they are never removed from the flow, neither is an arming point, and neither moves the Roadmap
gate or Merge (`extensible-flow.md` §3).

## 3. Built in, and when they apply

```
# the standard flow (kiln.config/flows/standard.yaml) — built-in gates in order
roadmap · concept · design · experience-design · specification · work-plan · implementation
        · code-review · ui-review · verification · documentation · merge
```

- The gate ids are `2a-experience` and `6a-ui-review`; the existing ids (`gate0`, `1-concept` … `9-pr`) are unchanged. The
  gate files are `gates/experience-design.md` and `gates/ui-review.md`, shipped with KILN like every built-in gate.
- Each carries `applies_when` (§4.1, §5.1). When it is true, the gate runs like any other. When it is false, the gate is
  recorded as **not applicable** with the reason, shown at the Roadmap gate and in every later brief; nothing settles, no
  judge runs, and the walk continues. A person may **require** a gate at the Roadmap gate even where the rule would not
  apply it. This is not triage skip (`the-flow.md` §8.1), which routes past Concept and Architecture only.
- Triage may still skip Concept and Architecture for a small feature, but it **cannot make an applicable gate not applicable**:
  whether a small UI change needs the gates is decided by `applies_when`, not by triage.
- A team may add stricter terms (more paths or labels) and may **require** the gates for chosen paths; it may not narrow
  the default rule so that an interface feature escapes them.
- A factory with no interface at all sees the gates as not applicable on every feature, and the walk is the ten-gate walk
  it always was.

## 4. Experience design gate

### 4.1 Gate definition (draft)

```markdown
---
id: experience-design
name: Experience design gate
question: Is this the right experience for these users and journeys, within the charter?
phase: contract
after: design                    # the Architecture gate; its internal id stays `design`
before: specification
artifact: experience.md
author: ux-designer
judges: [design-critic]
moves:
  approve: { label: "Approve the experience" }
  approve_with_note: { kind: approve, label: "Approve with open points", note: required }
  revise: { label: "Revise the experience design" }
  reject: { returns_to: design }
delegable: false
hold_lane: true
applies_when:
  paths: ["web/**", "app/**", "**/*.tsx", "**/*.vue", "**/*.css", "design/**"]
  labels: [ui]
  journeys: any                      # the row cites at least one charter journey step (§6)
deciders: [experience-owner]         # the workshop's named experience owner; any decider if none is named
brief:
  emphasis: [journey steps served, screens and states, charter ids, mockups, consistency with existing screens]
version: 1
---
The ux-designer turns the feature's concept and design into the experience: which journey steps it serves, the screens
involved, every state each screen can be in, the content, and the interactions…
```

### 4.2 The work

1. **The author, `ux-designer`**, reads the feature's `concept.md` and `design.md`, the **charter** at its pinned version,
   the design tokens, the existing screen map and, if present, the factory's knowledge. It writes, in the feature
   directory (`specs/NNN-name/`):
   - `experience.md` — the journey steps served (charter ids), the screens added or changed, a **states matrix** for each
     (empty · loading · partial · error · success · offline where relevant), content and terminology, accessibility
     notes, and what is **new** against the charter (a pattern the charter does not have is a *proposed amendment*, never
     silently introduced);
   - `mockups/*.html` — one self-contained HTML mockup per screen state that matters, using the design tokens, rendered to
     PNG for the brief (KILN's own mockups are made this way, `mockups/README.md`). A mockup of a screen that has a
     charter **wireframe** keeps that wireframe's regions and their order; a screen without one gets a new region outline
     in `experience.md`, proposed as a charter addition.
2. **The judge, `design-critic`** (strongest model, lane held, a different conversation from the author) reads the same
   inputs and the author's output and reports findings by severity, each citing a charter id or a named heuristic:
   a principle contradicted, a journey step with no screen, a state missing, a pattern that departs from the screen map, an
   accessibility floor breach visible in the mockup, a content term the voice rules out. The critic never edits.
3. **Deterministic evidence** runs first, as plain checks: every journey step the row cites is covered by a screen; every
   screen has the full states matrix; every colour and size in the mockups resolves to a design token **of the design system**, and every component and pattern used exists in it (anything new is listed as a proposed addition, `design-system.md` §8.2); contrast of the
   mockup's text pairs meets the charter floor; the mockup's regions match the wireframe's region outline (a missing or
   reordered region is listed, never blocking on its own).

### 4.3 The brief

The ten-part gate brief (`user-experience.md` §8) with this emphasis:

| Part | What it shows here |
|---|---|
| **The decision** | the journeys and steps this feature serves, and what a person is being asked to accept |
| **The work** | the mockups as images, the states matrix, the content, side by side with the screens they change |
| **The yardstick** | the charter principles, journey steps, floor and patterns that apply, with ids and the pinned version |
| **The evidence** | the critic's findings and the deterministic checks, each with its charter id |
| **Risks and open issues** | states not designed, new patterns proposed, charter gaps, content not yet written |
| **History** | on a return round, how the previous note was addressed and what changed |
| **Options** | each move with its consequence; no recommended move (BRIEF-6) |

### 4.4 Moves

- **approve** → Specification. The approved `experience.md` and mockups become input to `speckit.specify`; the spec cites
  their ids as its yardstick for what the interface must do.
- **approve with open points** → the same, with a required note carried forward and shown at UI review.
- **revise** (note) → the same `ux-designer` conversation with the findings and the note; the gate returns.
- **reject** (note) → by default back to **Architecture**, because a wrong experience usually changes the structure; the note
  may name an earlier gate, as at any gate (`the-flow.md` §7). Gates after the target are re-crossed with no lighter move.

A proposed **charter amendment** found here (a new pattern, a missing journey) is not decided at this gate: it is listed
in the brief, and carried to the next Roadmap gate where charter amendments are taken (`experience-charter.md` §5).

## 5. UI review gate

### 5.1 Gate definition (draft)

```markdown
---
id: ui-review
name: UI review gate
question: Does the built interface match the approved experience, and is it accessible and consistent?
phase: build-and-prove
after: code-review
before: verification
artifact: ui-review-report.md
checks: [ui-checker]                 # deterministic evidence role (extensible-flow §4); field name proposed
judges: [ui-reviewer]
moves:
  approve: { label: "Approve the interface" }
  approve_with_note: { kind: approve, label: "Approve with accepted deviations", note: required }
  revise: { label: "Fix the findings" }            # the note goes to the workers, as at Code review
  restart: { label: "Rebuild the interface" }      # from the restorable commit
delegable: false
hold_lane: true
applies_when:
  paths: ["web/**", "app/**", "**/*.tsx", "**/*.vue", "**/*.css", "design/**"]
  labels: [ui]
  diff: [ui_files_changed, tokens_changed, routes_changed]   # deterministic predicates (extensible-flow §14.2)
deciders: [any]
brief:
  emphasis: [approved versus built, accessibility, states, tokens, visual match, accepted deviations]
version: 1
---
The ui-checker builds and runs the feature in the factory's worktree and records what it can measure; the ui-reviewer
reads that evidence against the approved experience and the charter…
```

### 5.2 The work

1. **`ui-checker`** — a deterministic role, no model judging. It builds the feature in the factory's worktree, runs it on
   a **loopback** port, and walks every screen and state in the approved `experience.md`, recording:

   | Check | Evidence |
   |---|---|
   | **Accessibility** | automated rules per screen and state, by severity; keyboard path through each journey step; focus order; reduced-motion respected |
   | **Contrast and sizing** | text and control pairs against the charter floor |
   | **Tokens** | every colour, size, spacing and font in the built CSS resolves to a token of the design system at the feature's pinned version; stray literals, off-system components, deprecated use and unregistered contrast pairs listed (`design-system.md` §8.4, §10) |
   | **States** | every state in the states matrix reachable and rendered; states built but not designed |
   | **Visual match** | screenshot of each state against the approved mockup, difference per screen and region, at the charter's breakpoints |
   | **Content** | strings against the voice rules and terminology |
   | **Structure** | the built screen's landmark regions and headings against the charter wireframe's region outline; regions missing, added or reordered |

2. **`ui-reviewer`** (judge, strongest model, lane held) reads the checker's structured evidence — the accessibility
   tree, computed styles, difference regions, the states table — together with `experience.md`, the charter and the diff,
   and reports findings by severity: a deviation that matters (a journey step that no longer works), one that does not (a
   2 px offset), and one that is *better* than the mockup and should be adopted. When the strongest model available is
   **image-capable**, it also reads the screenshots; when it is not, it judges from the structured evidence and the brief
   **says so** — it never hands the screenshots to a weaker model and calls the result a judgment (Principle II). The
   screenshots are always shown to the person.

### 5.3 The brief

| Part | What it shows here |
|---|---|
| **The decision** | whether the interface may go to Verification, and which deviations are accepted |
| **The work** | approved against built, side by side, per screen and state; the diff of interface files |
| **The yardstick** | the approved `experience.md`, the charter floor and the tokens, with ids |
| **The evidence** | the check table above with counts and locations; the reviewer's findings; whether the reviewer saw the images |
| **Risks and open issues** | designed states not built, built states not designed, accepted deviations carried from Experience design |
| **History** | on a return round, what the previous note asked and what changed |
| **Options** | each move with its consequence; no recommended move |

### 5.4 Moves

- **approve** → Verification (open minor findings carried forward and recorded as accepted).
- **approve with accepted deviations** → the same, each deviation named in the required note and shown in later briefs.
- **revise** (note) → the **workers** fix the findings on the current code, the checker re-runs, and a fresh reviewer
  conversation reviews again. The reviewer never edits, as at Code review.
- **restart** (note) → a fresh build from the restorable commit with the findings, for when the interface approach is wrong.
  If the findings show the *experience* was wrong, the person says so in the note and may send the feature back to
  Experience design instead (any gate may reject to an earlier gate).

## 6. How a feature joins the flow

Following `extensible-flow.md` §7:

1. **Proposed.** At the Roadmap gate the director shows, per row, whether each interface gate applies and why — *touches
   `web/**`; serves J1.3 and J2.1 → Experience design and UI review apply* — or that it is not applicable, with the reason.
2. **Decided.** The person decides with the roadmap, and may require a gate the rule would not apply. A team may make the
   gates **required** for certain paths (§9); required gates cannot be made not-applicable.
3. **Pinned.** The feature keeps the flow, both gate versions, the applicability decisions and the charter version until it
   merges.
4. **Refined.** If a feature turns out to touch the interface — a work plan that now changes `web/**` — the brief says so
   and the gate becomes applicable. **UI review** can always become applicable, since its slot is still ahead.
   **Experience design**'s slot is behind by then, so the person decides: carry on without it (recorded, shown in later
   briefs), or send the feature back (**reject → Architecture**) so the gate runs on the way through. A gate that applied is
   never made not-applicable in flight.

`applies_when` (`extensible-flow.md` §14a) combines three deterministic predicates, never an LLM: **paths and labels** of the row, **journeys** — the
row cites at least one charter journey step (a computed predicate over the roadmap, proposed here as an addition to
`extensible-flow.md` §14.2) — and, for UI review only, **diff predicates** on what was actually changed.

## 7. Roles

Roles are files in `kiln.config/agents/` (`configuration.md` §6); these are drafts.

| Role | Kind | Gate | Model tier | Tools |
|---|---|---|---|---|
| `ux-designer` | producer | Experience design | cheapest that the far gate can bound | read the repository, the charter, the design system and knowledge; write to the feature directory; render a mockup to an image; **no network, no shell beyond the renderer** |
| `design-critic` | judge | Experience design | **strongest model available**, never the author's conversation | read-only |
| `ui-checker` | checker (deterministic) | UI review | none — it runs code | build and run the feature on loopback in the factory worktree, drive a headless browser, run the automated rules; **writes only to the report directory** |
| `ui-reviewer` | judge | UI review | **strongest model available**; reads images only if image-capable | read-only |

`kiln check flow` verifies that the judges are the strongest binding and never the author, that moves come from the closed
set, that `returns_to` points earlier, and that `restart` has a restorable point before it (`extensible-flow.md` §9).
`kiln check model` measures whether the strongest model can read images; the result is recorded and shown in the UI
review brief.

## 8. Delegation

Delegation can be armed only at the Specification gate and covers only gates after it (`extensible-flow.md` §14.1).
Experience design sits **before** that point and is never crossed unattended. UI review sits after it and **could** be
crossed on a clean path; the draft sets `delegable: false`, because an interface that nobody looked at is exactly what the
charter exists to prevent. A team may set it `true`; then a clean path still requires **no accessibility violation above
the charter floor, no state missing, no unaccepted deviation and no reviewer objection** — and any objection ends the
delegation for that gate and every gate after it, as always.

## 9. Teams and layering

A team space can **require** both gates for matching paths (*`web/**` always runs both interface gates*) and share the gate and flow
files by quorum; a workshop may add stricter gates and may never drop a required one. The charter's team floor
(`experience-charter.md` §8) sets the accessibility floor and tokens these gates measure against. Reviews from a designer
teammate arrive as a **person's evidence** in either brief, never as a model's verdict and never as the decision
(Principle XII).

## 10. What the record and knowledge add

- **Events.** Built-in gate ids `2a-experience` and `6a-ui-review`; a gate whose rule is false records `gate.not_applicable` with its reason; every gate event carries the **gate version, the
  flow version and the charter version**; findings carry the charter ids they cite; `ui-checker` results are recorded as
  content-free summaries (counts and locations — never page content).
- **Knowledge.** The implementation digest links the feature's journeys, mockups and accepted deviations; the feature
  story shows the screens as approved and as built.
- **Insights.** Rejection and revision rates at each gate; which charter principles draw the most findings; deviations
  accepted per feature; fix rounds at UI review — counts and sample sizes shown, never rankings of people
  (`insights.md`).
- **Try before using.** `kiln gates try experience-design --on <feature>` and `kiln gates try ui-review --on <feature>`
  replay a past feature as if the gate had been in its flow and show the brief a decider would have seen
  (`extensible-flow.md` §10) — the way to find out whether a gate earns its place before a team requires it.

## 11. How it fits KILN's rules

| Rule | How the interface gates keep it |
|---|---|
| **I · No self-approval** | author and judge are separate roles in separate conversations; only a person decides either gate |
| **II · Judges on the strongest model** | `design-critic` and `ui-reviewer` bind to the strongest model; a weaker binding is a refused configuration; an image-less judge says so |
| **III · One lane** | judged gates hold the lane; the checker runs inside the factory's single lane |
| **V · A missing person never approves** | both gates are durable waiting tasks; no clock, restart or closed browser settles them |
| **VII · Everything recorded** | gate, flow and charter versions on every event |
| **VIII · Local by default** | rendering and checks run on the host, on loopback; no outbound traffic; a role that needs more flags it unavailable |
| **X · Knowledge is context** | the gates cite the charter, a committed artifact, not a wiki page |
| **Flow invariants** | built-in gates never removed (an inapplicable one is recorded, not dropped); Roadmap first, Merge last; closed set of move kinds |

## 12. Proposed requirements

| ID | Requirement | |
|---|---|---|
| UXG-1 | **Built-in gates**: `experience-design` and `ui-review` in the standard flow at their places, with `applies_when` and a recorded *not applicable* outcome; the standard flow passes `kiln check flow` | Must |
| UXG-2 | **Experience design gate**: author, judge, deterministic checks, artifacts, brief and moves as §4; the approved experience is input to the Specification gate | Must |
| UXG-3 | **UI review gate**: checker, judge, brief and moves as §5; findings cite the approved experience and charter ids | Must |
| UXG-4 | **Joining**: `applies_when` by paths, labels, charter journeys and diff predicates; flow proposed with reasons at the Roadmap gate; refinement in flight as §6 | Must |
| UXG-5 | **Roles**: `ux-designer`, `design-critic`, `ui-checker`, `ui-reviewer` as role files with tiers and tools as §7; judge binding enforced | Must |
| UXG-6 | **Capability honesty**: whether the strongest model can read images is measured and shown; no screenshot judgment by a weaker model | Must |
| UXG-7 | **Rendering and browser checks** behind one seam, local only, loopback only; the dependency recorded and pinned | Must |
| UXG-8 | **Charter integration**: briefs cite charter ids and versions; amendments found are carried to the Roadmap gate, never decided at these gates | Must |
| UXG-9 | **Try-runs** of both gates on past features | Should |
| UXG-10 | **Team-required** gates by path, and a designer teammate's review as evidence | Could |

## 13. Where it lands in the program

Proposals for the Roadmap gate, like those in `experience-charter.md` §11. Because the gates are part of the **default
flow**, they land with it, not after it:

| Row | Proposed change |
|---|---|
| **r14 Gates as data, walked headless** | the standard flow has twelve gates, with `applies_when` and the *not applicable* outcome; the scripted walk covers both an interface feature (eleven feature gates) and a non-interface one (UXG-1) |
| **r15 / r16 / r17 (roles, judges)** | `ux-designer`, `design-critic`, `ui-reviewer` and the deterministic `ui-checker` as built-in roles (UXG-5, UXG-6) |
| **r18 The director** | `applies_when` predicates, including the journey predicate, computed from the roadmap (UXG-4) |
| **r20 Gates on the web** | the brief renders mockups and approved-against-built comparisons (UXG-2, UXG-3) |
| **r28 / r29** | first run and new codebases make the charter, and offer the interface gates' defaults for the repository |

Row numbers are indicative; the Roadmap gate decides which `edit-rows` or `add-row` moves land this, and `ROADMAP.md`,
`specs/explainers/` and the infographic still say "ten gates" until it does.

## 14. Open questions

1. **Direction B later?** If a team separates UX from visual design, Experience design can split into a UX gate (after
   Concept) and a UI gate (after Architecture). Nothing here prevents it; no split is proposed now.
2. **UI review delegable?** Draft says no (§8). Should a clean path be allowed to cross it for teams that choose to?
3. **Late discovery.** §6 step 4 proposes sending a feature back with `reject → Architecture` so Experience design can join on
   the way. Does the flow semantics for adding a gate behind the current position need a rule of its own?
4. **The journey predicate.** Adding a computed predicate over the roadmap to `applies_when` (§6) extends
   `extensible-flow.md` §14.2; approve the extension, or keep to paths and labels only?
5. **Rendering and browser dependency.** Mockup rendering and the headless browser are a runtime dependency (Constitution
   *Dependencies*): which tool, pinned how, behind which seam, and is an SVG-only mockup mode needed for hosts that cannot
   run a browser?
6. **Automatic fix rounds at UI review.** Should mechanical findings (a token mismatch, a contrast pair) get bounded
   `mitigate` rounds like Verification before a person sees the gate?
7. **Who decides UI review.** Any decider, as drafted, or the experience owner as at Experience design?
8. **Visual match thresholds.** Per-screen difference limits belong in the charter's quality bars or in the gate
   definition; which?
9. ~~Extension or built in?~~ **Decided 2026-10-25:** built into the default flow, conditionally applicable (§3).

## 15. One sentence

KILN's default flow includes two ordinary gates for the interface — Experience design before Specification and UI review
before Verification, applying whenever a feature touches the interface — so a feature's experience is approved against the charter before it is specified, and what is built is
checked against what was approved before it is proved, with every guarantee of the built-in gates unchanged.
