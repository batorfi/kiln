> Status: concept — **proposal** (2026-10-25, drafted for human@batorfi). The structure and the decisions below are settled
> for review; admitting the work into the program is decided only at the Roadmap gate (`add-row` / `edit-rows`).
> Type: concept
>
> Decisions taken for this proposal (2026-10-25) — each is the default if the review does not change it:
>   1. **Location**: `.specify/memory/design-system/`, beside the constitution and the experience charter, **referenced
>      from both** (§10). The implementation (CSS, components) stays in the product's code; the design system holds the
>      **specification and the tokens** and points to the code (§4.1).
>   2. **Token format**: the **W3C Design Tokens Community Group format** (DTCG, stable `2025.10`), JSON, in three tiers —
>      primitive, semantic, component (§5).
>   3. **Approver**: a **named design owner** where the workshop has one (it may be the experience owner), otherwise a
>      Decider — as for the charter (§7).
>   4. **Additions at Experience design, everything else at the Roadmap gate**: a feature may *add* a token, component or
>      pattern, approved by the person who approves the Experience design gate; renaming, removing or changing the meaning
>      of anything is taken only at the Roadmap gate (§8).
>   5. **KILN's own design system**: KILN adopts one for its web front door, seeded from the palette and states already used
>      in its infographics (§12).
>   6. **Framework-neutral**: the design system specifies behaviour and tokens, never a UI framework (§4.4).
>
> Scope note: this doc proposes a **design system** for every product KILN builds — and for KILN itself — as a
> **standardised, human-approved, versioned set of foundations, tokens, components and patterns**, made at setup beside the
> experience charter. The charter says *what the experience is and why*; the design system says *what it is made of and how
> it looks*. Like the charter it is **not a gate** and changes no flow invariant; the built-in Experience design and UI
> review gates measure features against it. It is a concept, not a spec.
>
> Companion docs:
>   - The experience charter:  `experience-charter.md` (what the experience is) · The interface gates: `ui-flow.md`
>   - First run:               `first-run.md` · New codebases: `greenfield.md` · Existing codebases: `brownfield.md`,
>                              `code-exploration.md`
>   - The flow:                `the-flow.md` · An extensible flow: `extensible-flow.md`
>   - Configuration:           `configuration.md` · The record: `the-record.md` · Teams: `team-space.md`
>   - User experience of KILN itself: `user-experience.md`
>   - The constitution:        `../../.specify/memory/constitution.md` · The PRD: `../prd/kiln-prd.md`

# KILN — the design system

## 1. In one paragraph

Before a product's first roadmap exists, KILN asks for two short documents a person approves: the **experience charter**
(who it is for, the journeys, the screens) and the **design system** (what the interface is built from). The design system
is a small, structured set of files — **foundations** (colour, type, space, motion, icons, layout), **tokens** (every
value, named by its role, in a standard format), **components** (each specified with anatomy, states, accessibility and
the tokens it uses) and **patterns** (how components combine to do the charter's work) — plus a **manifest** that says
which version it is, who owns it, and where the code that implements it lives. Features are designed from it at
Experience design, built from it by the workers, and checked against it at UI review; a value that is not a token, or a
component that is not in the system, is a finding, not a surprise. It is versioned, amended only by a person, and
framework-neutral.

## 2. Why a design system, and why standardise its structure

| Without it | With it |
|---|---|
| each feature invents its colours, spacing and controls; the product drifts screen by screen | every feature draws from one named set; consistency is checked, not hoped for |
| UI review can only say *this looks different* | UI review says *3 literals instead of tokens, 1 component outside the system, 2 contrast pairs below the floor* — deterministic evidence |
| the designer role and the workers each guess a style | the designer cites component and token ids; the workers receive the same ids |
| accessibility is a wish | the accessibility floor becomes a **registry of tested pairs** the checker verifies in every mode |
| every team arranges its system differently, so nothing carries over | one **standard structure** — the same files, ids and checks in every factory — so briefs, judges and checkers work the same everywhere |

Standardising the *structure* (not the look) is the point: KILN does not tell a product how to look. It makes the way
the look is written down the same everywhere, so the gates can reason about it. The structure follows what established
design systems converge on — layered tokens, specified components with states and accessibility, documented patterns,
explicit lifecycle and governance (§14).

## 3. How it relates to the charter and the gates

| | Experience charter | Design system |
|---|---|---|
| **Answers** | who is it for, what do they do, how should it behave as a whole | what is it built from, how does it look and respond |
| **Holds** | users, principles `X#`, journeys `J#.#`, screen map `S#`, wireframes, voice, accessibility floor, quality bars | foundations, tokens `T:`, components `C:`, patterns `P:`, icon set, motion, theme modes |
| **Changes** | principle or journey added/removed | token, component or pattern added/renamed/removed |
| **Measured by** | Experience design (journeys, screens, principles) and UI review | Experience design (only system parts used), code review evidence, UI review (tokens, contrast, states, structure) |
| **Never** | a gate; a model's decision | a gate; a framework choice; a model's decision |

Ownership at the boundary, so nothing is written twice: the **accessibility floor** is *set* by the charter (what level
every screen meets) and *proved* by the design system (a registry of foreground/background pairs that meet it in every
mode); the **content voice** is *set* by the charter and *applied* by the system's content patterns, which cite it;
**interaction patterns** are *named* in the charter and *specified* — with components, states and tokens — in the system.
The charter's **design tokens** part (`experience-charter.md` §3) becomes a **pointer to the design-system manifest**.

Together they are the yardstick for the two interface gates (`ui-flow.md`): the charter says whether the experience is
right; the design system says whether it is built from the right parts.

## 4. The standard structure

### 4.1 The layout

```
.specify/memory/design-system/
  design-system.md              ← the manifest: version, owner, modes, implementation pointers, inventory, status
  foundations/
    color.md  typography.md  spacing-and-layout.md  elevation.md  motion.md  iconography.md  imagery.md
  tokens/
    primitive.tokens.json       ← raw values: a palette, a type scale, a spacing scale (DTCG)
    semantic.tokens.json        ← roles: color.action.primary, color.status.wait.bg, space.component.gap …
    component.tokens.json       ← component-scoped aliases: button.primary.bg → color.action.primary
    modes/<mode>.tokens.json    ← the semantic overrides for dark, high-contrast, density …
    contrast.json               ← registry of text/surface pairs that must meet the charter's floor
  components/<name>.md          ← one spec per component (§6)
  patterns/<name>.md            ← one spec per pattern (§6.5)
  content/ui-copy.md            ← terminology glossary, microcopy rules; cites the charter's voice
  CHANGELOG.md                  ← every change: version, what, why, who decided
```

- **The manifest** (`design-system.md`) carries front matter — `name`, `version` (semver), `owner`, `charter` (the
  version it was made against), `modes`, `breakpoints`, `implementation` (where the code lives: tokens build output,
  component library path or package, optional Storybook or design-tool links) — and an **inventory table** of every
  component and pattern with its status and the version it arrived in. It is the one file the briefs and checkers read
  first.
- **The implementation stays in the product's code** (a stylesheet built from the tokens, a component library). The design
  system never copies code; it specifies, and points. A product that already has a design system in code, Storybook or a
  design tool **adopts** it by pointer (§7) — KILN does not move it.
- **Ids.** Tokens `T:color.action.primary`, components `C:button`, patterns `P:data-table`, foundations `F:motion` —
  stable, cited by briefs, mockups, findings and code review evidence, like `X2` and `J1.3` in the charter.

### 4.2 Foundations

Short prose with the *reasoning* behind the values, so a reviewer can judge a deviation:

| Foundation | It fixes |
|---|---|
| **Colour** | the palette's roles (brand, neutral, status), when each is used, what carries meaning, and the rule that colour never carries meaning alone |
| **Typography** | the type scale, families, weights, line heights, measure; how it scales with user settings |
| **Spacing and layout** | the spacing scale (a base unit and its multiples), the grid, the breakpoints, density |
| **Elevation and shape** | layers, shadows or borders, radii — as a small named set |
| **Motion** | durations and easings as tokens; what motion is for; the **reduced-motion** behaviour of each use |
| **Iconography** | the icon set, sizes, stroke, naming, when an icon needs a label |
| **Imagery** | illustration and photography rules, if the product has them |

### 4.3 Modes

A **mode** is a set of semantic-token overrides — *light*, *dark*, *high-contrast*, *compact density*. Components never
mention a mode; they use semantic tokens, and the mode decides the value. The manifest lists the modes the product
supports; **every semantic token has a value in every listed mode** (a deterministic check, §9), and the contrast registry
is verified **per mode**.

### 4.4 Framework-neutral

The design system specifies **behaviour, states, accessibility and tokens**, never React, Vue or a CSS methodology. The
implementation pointer names whatever the product uses. Where a factory's stack has a token-to-code transformation (a
build step that turns the JSON into CSS variables or platform constants), the manifest names it; it is a pinned runtime
dependency under the constitution, behind one seam (§15 Q2).

## 5. Tokens

### 5.1 Format

Tokens are written in the **DTCG format** — a vendor-neutral, JSON format published as a stable report by the W3C Design
Tokens Community Group — so any design tool, transformer or checker can read them:

```json
{
  "color": {
    "ember": { "600": { "$type": "color", "$value": "#C2410C", "$description": "KILN brand, action" } }
  }
}
```

```json
{
  "color": {
    "action": {
      "primary": { "$type": "color", "$value": "{color.ember.600}", "$description": "primary action fill" }
    }
  }
}
```

Every token has a `$type` and `$value`, and a `$description` saying its role. Aliases use the DTCG reference syntax
(`{group.token}`). Deprecation is recorded with the DTCG `$deprecated` property (§8.3). *(The specification is a
Community Group report, not a W3C standard; KILN pins the version it validates against.)*

### 5.2 Three tiers

| Tier | Holds | Named by | Used by |
|---|---|---|---|
| **Primitive** | raw values — the palette, the type scale, the spacing scale | what it *is*: `color.ember.600`, `space.4` | only the semantic tier |
| **Semantic** | the roles a design uses — `color.action.primary`, `color.status.wait.bg`, `space.component.gap` | what it is *for* | components, patterns, mockups, screens |
| **Component** | a component's own aliases — `button.primary.bg → color.action.primary` | the component and its part | that component alone |

Rules: **primitives are never used directly** by components or screens; **semantic tokens are the vocabulary of design**;
component tokens exist only where a component needs to vary from the semantic default. A literal (`#C2410C`, `13px`) in a
mockup or built CSS is a finding.

### 5.3 Naming

`category.role.variant.state` in lower-case, dot-separated, **named by role, never by value** (`color.action.primary`,
not `color.orange`; not `color.ember.600` in a component). Scales use numbers (`space.4`), status uses words (`ok`, `wait`,
`error`, `info`). A name is stable: renaming is a MAJOR change (§8).

### 5.4 Required semantic roles

Every product's semantic tier covers at least these roles — so that the gates and checkers can rely on them — and may add
more:

| Group | Roles |
|---|---|
| **Surface** | `surface.base` · `surface.raised` · `surface.sunken` · `surface.overlay` |
| **Text** | `text.primary` · `text.secondary` · `text.disabled` · `text.inverse` · `text.link` |
| **Border and focus** | `border.default` · `border.strong` · `focus.ring` (visible, meets non-text contrast) |
| **Action** | `action.primary` · `action.secondary` · `action.danger` — each with `bg`, `fg`, `border` and hover/active/disabled |
| **Status** | `status.ok` · `status.warn` · `status.error` · `status.info` — each with `bg`, `fg`, `border` (and product-specific ones, §12) |
| **Space, size, shape** | `space.*` scale · `size.control.*` (touch/hit target) · `radius.*` |
| **Type** | `font.family.*` · `font.size.*` · `font.weight.*` · `font.lineheight.*` |
| **Motion** | `motion.duration.*` · `motion.easing.*` |
| **Layer** | `z.*` named layers |

### 5.5 The contrast registry

`tokens/contrast.json` lists every **foreground/surface pair** the product uses and the **requirement** it must meet
(from the charter's accessibility floor, for example text 4.5 : 1, large text and non-text 3 : 1). The checker computes
each pair **in every mode** and fails the design system if one is short — before any screen exists. A screen may use only
registered pairs; an unregistered pair in the built CSS is a finding at UI review.

## 6. Components and patterns

### 6.1 One spec per component

`components/<name>.md`, front matter plus a fixed set of sections — the same for every component, so a judge and a checker
know where to look:

```markdown
---
id: C:button
name: Button
status: stable            # proposed · beta · stable · deprecated
since: 1.0.0
replaces: —
tokens: [button.*]
---
## Purpose            when to use it, and when not
## Anatomy            the named parts (label, icon, container) — each with its token
## Variants           primary · secondary · danger · quiet — and what each means
## States             default · hover · focus · active · disabled · loading · error — every one specified
## Accessibility      role, name, keyboard operation, focus order and visible focus, target size, announcements
## Content            label rules (verb first, no punctuation), truncation, localisation, the voice from the charter
## Behaviour          events, async, repeat-click, undo
## Do and don't       short pairs
## Used in            the patterns and screens that use it (maintained by the checker)
```

### 6.2 The states rule

A component's **States** section covers **every state it can be in**, including the ones teams forget — focus,
disabled, loading, error, empty, read-only. This is the same list the per-feature **states matrix** at Experience design
is built from, so a screen's states are assembled from components whose states are already specified.

### 6.3 The core set

A product starts with the components its charter's journeys need and grows (§8). Setup proposes a **core set** from the
journeys — typically: *button, link, text input, select, checkbox and radio, switch, form field, table, list, tabs,
navigation, dialog, toast and inline message, tooltip, badge and status pill, empty state, skeleton and spinner,
pagination*. A component enters the inventory only when a journey needs it; unused components are not carried.

### 6.4 Accessibility inside the spec

Every component spec states its **keyboard path, accessible name and role, focus behaviour, target size and what is
announced**, plus its contrast pairs (registered in §5.5). A component without them is *incomplete* and cannot reach
status `stable`.

### 6.5 Patterns

`patterns/<name>.md` specifies how components combine to do recurring work, in the charter's interaction-pattern terms —
*data table with bulk actions, form with validation, destructive action with undo, empty state, error recovery, filter and
search, confirm-or-undo, onboarding step*. A pattern cites its components by id, the charter's principles it serves
(`X2`), the states of the whole (loading, partial, error, success), and where it is **not** to be used. Patterns are where
the charter's *"every list has empty, loading and error states"* becomes concrete.

### 6.6 Content in the interface

`content/ui-copy.md` holds the **glossary** (the one term for each concept, and the words the product never uses) and the
**microcopy rules** for buttons, errors, empty states, confirmations and dates and numbers. It *cites* the charter's voice
and never restates it.

## 7. How it is made

Made during setup, **after the charter** (the system serves the charter's journeys and principles) and before the first
Roadmap gate.

**New codebase** (`greenfield.md`):
1. the planner drafts the system from the charter and a short **brand input** the person gives (colours or a logo, a mood,
   fonts they already own — or *none*, and the planner proposes a restrained default), with each foundation's reasoning and
   open questions where input is thin;
2. the planner proposes the **core set** of components and patterns from the charter's journeys;
3. deterministic checks run (§9) and a **specimen page** is rendered — every token, type specimen, component state and
   contrast pair on one page — so the person sees the system, not a list of values;
4. the person edits — alone or in conversation with the planner, with alternatives side by side — and approves; setup
   records `design_system.approved` (version, approver, content hash);
5. it is committed beside the constitution and the charter.

**Existing codebase** (`brownfield.md`, `code-exploration.md`) — **discovered or adopted, then confirmed**. Three cases,
decided at setup and recorded:

| Case | What KILN does | Source of truth |
|---|---|---|
| **The code is the system** (CSS variables, a theme file, a component library) | extracts tokens and a component inventory into the standard structure, labelled **measured** or **inferred**; finds near-duplicates and unnamed literals as *findings, not fixes* | the code; the files are a derived, confirmed view |
| **An external system exists** (a design tool, Storybook, a published package) | records it as the manifest's `implementation` pointer, mirrors its tokens into DTCG when it can export them, and never edits the external source | the external system; the files mirror it |
| **There is none** | proposes one from what the screens use today — the palette, type and spacing actually in the CSS — consolidated into tiers, as a **proposal** the team may take as a target | nothing until approved |

Nothing is written to the team's repository except through its own pull request, as for the charter and constitution.

**Who approves.** The **named design owner** where the workshop has one (it may be the same person as the experience
owner); otherwise a Decider of the factory. Approval is one person's recorded decision — never a model's, never inferred
from absence. **Without a design system**, a factory still works: briefs say *no design system*, the token checks report
what is measurable (literals, contrast of what is used) and say that no registry exists. Setup offers the step and never
forces it.

## 8. Keeping it true

### 8.1 Versions

Semantic versions, recorded in the manifest and the changelog:

| Change | Version |
|---|---|
| **MAJOR** | a token, component or pattern **renamed, removed or changed in meaning**; a mode removed; a contrast requirement raised |
| **MINOR** | a token, component, pattern, variant or mode **added**; a status raised (`beta → stable`) |
| **PATCH** | wording, documentation, a value adjusted with **every contrast pair still passing in every mode** and no change of role |

### 8.2 Who may change what, and where

| Change | Decided | Why there |
|---|---|---|
| **Additions** needed by a feature — a new token, a variant, a component, a pattern | by the person who approves that feature's **Experience design** gate, in the same decision, as a **feature-scoped addition**; merged into the system at Merge as a MINOR version | a person decides, with the mockup in front of them; additive change cannot break an existing feature |
| **Renames, removals, meaning changes, new modes, floor changes** (MAJOR) and **value changes** that move a contrast pair | at the **Roadmap gate**, as a design-system amendment, with the evidence of what it touches | it can alter features already admitted; the gate re-opens between features (Principle VI) |
| **Wording and documentation** (PATCH) | by the design owner or a Decider, recorded | no effect on any screen |

A feature **pins the design-system version at admission**, as it pins the charter; a newer version never alters a feature
in progress. Where a feature in flight needs an addition, §8.2's first row applies — it never needs a newer version.

### 8.3 Lifecycle and deprecation

Components and patterns carry a **status**: `proposed` (specified, not yet built), `beta` (built, may change in a MINOR),
`stable` (changes only by §8.1's rules), `deprecated` (a replacement named, a removal version stated). A deprecated token
or component stays valid for **at least one MINOR version**, is **flagged at UI review** wherever it is used, and is
removed only in a MAJOR; a deprecation without a replacement and a removal version is refused by the checker.

### 8.4 Drift

KILN measures, deterministically, where the built product has drifted from the system — literals instead of tokens,
components built outside the system, near-duplicates of existing tokens, deprecated entries still in use, unused tokens and
components — and reports it at UI review (for the diff) and in a periodic report (for the whole product). **Findings, not
fixes**: cleaning drift is a roadmap row a person admits.

## 9. The checks — deterministic, never blocking by themselves

`kiln check design-system` (also run when the system is drafted, amended or a feature adds to it) verifies:

1. **Valid DTCG** — every file parses; every token has `$type` and `$value`; `$type` and value agree.
2. **References resolve** — no alias cycle, no dangling reference; **component tokens → semantic → primitive**, never
   skipping a tier.
3. **Required roles present** (§5.4) and **complete in every listed mode**.
4. **Contrast registry** — every registered pair meets its requirement **in every mode**; every pair used by a component
   token is registered.
5. **Naming** — names follow §5.3; no value-named tokens above the primitive tier.
6. **Component specs complete** — every section present, every state specified, accessibility section filled, tokens
   resolve; a component with gaps cannot be `stable`.
7. **Patterns cite real components**, and every component in the inventory exists as a file.
8. **Lifecycle** — a deprecated entry names its replacement and removal version; no removed entry is referenced.
9. **Versions and changelog** — the manifest version matches the changelog's latest entry and follows §8.1 against the
   previous version (a removal without MAJOR is flagged).
10. **Charter alignment** — the manifest cites a charter version; the accessibility floor in the registry matches the
    charter's.

Checks give evidence for the briefs; **a person decides**. A check that cannot run (no specimen renderer on a host) says
so and never counts as a pass.

## 10. How it grounds the gates and the flow

| Where | What the design system does |
|---|---|
| **Roadmap gate** | rows that add or change interface parts show it; design-system amendments (MAJOR, value changes) are taken here; the brief shows the pinned version |
| **Experience design** (`ui-flow.md` §4) | the ux designer composes screens **only from components and patterns in the system**; mockups use tokens by name; the **critic** receives the system as input; anything new is listed as a **proposed addition** in the brief, decided with the gate (§8.2); the deterministic check *every colour and size resolves to a token* now resolves against the registry |
| **Specification** | requirements for the interface cite component and pattern ids (`C:data-table`, `P:destructive-undo`) |
| **Work plan / Implementation** | workers receive the system's manifest, the relevant component specs and token build output; a task adds a component only where the spec says so |
| **Code review** | the reviewer receives the drift evidence for the diff (literals, off-system components) as evidence, never as a verdict |
| **UI review** (`ui-flow.md` §5) | the **Tokens** check runs against the system at the pinned version; the **States** check uses the component states; **contrast** uses the registry; deprecated use is flagged |
| **Merge** | feature-scoped additions are merged into the system with a MINOR version and a changelog line, from the approved Experience design decision |

The briefs cite design-system ids and the pinned version in their yardstick, as they cite charter ids
(`user-experience.md` §8). A factory without a design system still gets the gates, measured against what the existing
screens use (§7).

**Teams** (`team-space.md`). A team space may publish a **team design system** — a floor and a base: tokens, components
and the contrast requirement. A workshop's design system **extends** it (adds, never loosens or redefines), exactly as the
charter's team floor works (`experience-charter.md` §8). Changes to a team design system need the team's quorum.

## 11. Where it fits the constitution

The constitution's *The Experience Charter* section gains the design system as the charter's companion: a **yardstick,
never a gate**, approved and amended only by a person, pinned per feature, a committed repository artifact and never a
knowledge page. This is part of the same MINOR amendment (2.1.0), because it adds a section and changes no principle.

| Principle | How the design system keeps it |
|---|---|
| **I · No self-approval** | a model drafts it and a feature may propose additions; only a person approves or amends it |
| **II · Judges on the strongest model** | the critic and UI reviewer receive the system as input; the checks are deterministic, not a judge |
| **V · A missing person never approves** | nothing is approved by absence; an addition waits with its Experience design gate |
| **VI · The Roadmap gate** | breaking changes are taken only there |
| **VII · Everything recorded** | `design_system.approved` and `design_system.amended` with version, decider and reason; pinned versions on gate events |
| **VIII · Local by default** | drafting, extraction and the specimen render run on the host; nothing leaves; an external design tool is only ever read through a configured pointer |
| **X · Knowledge is context** | pages may cite the system and never override it |
| **XII · Workshops sovereign** | a team design system is a floor; a workshop extends, never loosens |

## 12. KILN's own design system

KILN adopts a design system for its web front door (`web-front-door.md`) — the first product made under both the charter and
the design system. It is **seeded from what KILN already uses**: the infographics and the mockups carry an implicit
palette that this makes explicit.

| Seed | From | Becomes |
|---|---|---|
| **Palette** | warm neutrals (`#F5F2EE` background, `#1C1814` ink, `#E6E0D8` line) with an **ember** brand (`#C2410C`, `#EA580C`) | `color.neutral.*` and `color.ember.*` primitives; `color.surface.*`, `color.text.*`, `color.action.primary` semantics |
| **State colours** | amber *waiting*, green *ok*, blue *info*, violet *delegated* | the product-specific status roles `status.wait`, `status.ok`, `status.info`, `status.delegated` — each tied to its meaning in the gate rail, Needs you and the brief |
| **Type** | a system sans stack and a monospace for ids, paths and hashes | `font.family.sans`, `font.family.mono`, with a scale |
| **Components** | the surfaces KILN's concept already describes | *gate rail and gate card · gate brief section · move bar (no pre-selected move) · Needs you item · status pill · event row · record table · diff view · factory card · host card · toast and inline message · empty state* |
| **Patterns** | `user-experience.md` | *decide-at-a-gate · come-back-after-away · steer-or-approve a held action · compare approved with built · confirm with consequence* |

The seed is a **proposal for the first design system**, drafted and approved before the front door's screens are built
(DSN-12); the mockups in `mockups/` stay illustrations. A rule specific to KILN is written into the foundations: **colour
never carries a gate's state alone** — every state has a word and a shape.

## 13. Proposed requirements

| ID | Requirement | |
|---|---|---|
| DSN-1 | **Standard structure**: the manifest, foundations, tokens, components, patterns, content and changelog layout of §4, at `.specify/memory/design-system/`, referenced from the constitution and the charter | Must |
| DSN-2 | **Tokens**: DTCG format in three tiers with the required semantic roles, modes and contrast registry (§5) | Must |
| DSN-3 | **Component and pattern specs** with the fixed section set, every state and an accessibility section (§6) | Must |
| DSN-4 | **Setup step**: drafted from the charter and a brand input, a core set, a specimen page; approval by the design owner or a Decider; recorded; never forced (§7) | Must |
| DSN-5 | **Adopt or discover**: for existing codebases, the three cases of §7; measured/inferred labels; external sources mirrored read-only | Must |
| DSN-6 | **Versioning and change**: semver, additions at Experience design, MAJOR at the Roadmap gate, a feature pins the version (§8) | Must |
| DSN-7 | **Lifecycle**: status, deprecation window, replacement and removal version (§8.3) | Should |
| DSN-8 | **Deterministic checks**: `kiln check design-system` with the ten checks of §9 | Must |
| DSN-9 | **Gate integration**: Experience design composes only from the system and lists proposed additions; UI review's Tokens, States and contrast checks run against it; briefs cite ids and versions (§10) | Must |
| DSN-10 | **Drift report**: literals, off-system components, deprecated use, unused entries — findings, never fixes (§8.4) | Should |
| DSN-11 | **Teams**: a team design system as a floor; workshops extend; quorum for changes (§10) | Could |
| DSN-12 | **KILN's own design system**, drafted and approved before the web front door's screens (§12) | Must |
| DSN-13 | **Specimen page**: every token, type specimen, component state and contrast pair rendered on one page, from the files, locally | Should |

## 14. Where it lands in the program

Proposals for the Roadmap gate, like those in `experience-charter.md` §11 — and best taken **together with the charter**:

| Row | Proposed change |
|---|---|
| **r28 First run** | adds the design-system step after the charter step (DSN-4) |
| **r29 New codebases** | the walking skeleton is built from the first design system's tokens and core components (DSN-1, DSN-2, DSN-3) |
| **r30 Existing codebases, part 1** and **r43 Explore space** | discover or adopt the existing system (DSN-5) |
| **r26 Agents and flows** and the built-in interface gates | the ux designer, critic and UI checker consume the system (DSN-9) |
| **r20 Gates on the web** | the brief's yardstick cites design-system ids and versions; the specimen page and the drift evidence render (DSN-9, DSN-13) |
| **r15 The record** | `design_system.approved` and `design_system.amended` enter the catalog |
| **r19 Web front door, read-only** | KILN's own design system is approved first (DSN-12) |
| **Constitution** | the experience-charter section names the design system (part of 2.1.0) |

Either each change is folded into those rows with `edit-rows`, or one new row — *the design system* — is added after the
charter row with `add-row`. The Roadmap gate decides which; this doc does not.

## 15. Open questions

1. **Token transformation.** Turning DTCG JSON into CSS variables or platform constants needs a build step. Which tool,
   pinned how, behind which seam — and does KILN ship a minimal transformer so a factory without one still works?
2. **Specimen rendering.** The specimen page is HTML; rendering it to an image needs the same headless browser as the
   mockups (`ui-flow.md` §14 Q5). Should the specimen also have an SVG-only form for hosts that cannot run a browser?
3. **Design-tool sync.** Should KILN read tokens from a design tool through a connector, write back, or only ever mirror
   one-way (the draft: one-way, read-only)?
4. **Required modes.** Is dark mode required for every product, or only declared in the manifest where the product has it?
5. **Density, locales and direction.** Are density modes, right-to-left layout and locale-specific typography part of the
   standard structure or an appendix for products that need them?
6. **Icon licensing.** Where an icon set has a licence, how is it recorded so a reviewer sees it (the manifest, the
   dependency record)?
7. **Component granularity.** Is a small structural component library (layout primitives: stack, grid, container) part of the
   core set or left to the implementation?
8. **A design system for non-web UI.** The structure is surface-neutral; are terminal and editor surfaces (Zed) covered by the
   same system with their own modes, or by a sibling?

## 16. Sources

The structure follows the converging practice of published design systems; the format is the DTCG's:
- [Design Tokens Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) — the
  stable report of the W3C Design Tokens Community Group (a Community Group report, not a W3C standard).
- [Design Tokens specification reaches first stable version](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
  — the announcement.
- Common practice for tiered tokens, specified components with states and accessibility, patterns, governance and
  deprecation, consolidated from published design-system guidance.

## 17. One sentence

KILN's design system is a small, standard, human-approved set of tokens, components and patterns — specified, versioned and
checked the same way in every factory, beside the experience charter — so the interface gates can tell whether a feature is
built from the right parts, and no one has to take a value on trust.

## 18. Appendix — starter manifest

```markdown
---
name: <product> design system
version: 1.0.0
owner: <named design owner, or "a Decider">
charter: 1.0.0                 # the experience charter version this was made against
modes: [light, dark]           # every semantic token has a value in each
breakpoints: { compact: 0, regular: 720, wide: 1200 }
implementation:
  tokens_build: <where the generated CSS / constants are>
  components: <library path or package>
  external: <design tool or Storybook link, optional; mirrored read-only>
status: approved               # draft · approved
---
## Inventory
| Id | Kind | Status | Since |
|---|---|---|---|
| C:button | component | stable | 1.0.0 |
| P:destructive-undo | pattern | beta | 1.0.0 |

## Notes
<what is out of scope, open questions, known gaps>
```
