---
charter: experience
product: KILN
version: 0.1.0
status: draft — awaiting approval by human@batorfi
approved_by: ~
approved: ~
brief: docs/concepts/user-experience.md
---

# KILN Experience Charter

KILN's own charter, written to the structure in `docs/concepts/experience-charter.md` (§14). It grounds every surface of KILN itself — the web front door, the terminal and the editor surface. It is a **draft**: it takes effect only when a person approves it (event `charter.approved`). The wireframes are greyscale structure, not visual design; the visual layer is KILN's design system (`docs/concepts/design-system.md`, §12).

## Users and situations

- U1 **The engineer at the centre** — owns one or more factories on their own machine; decides at gates, mostly in short sittings between other work. Needs: know what waits on them, decide with enough evidence, never be surprised.
- U2 **The returning engineer** — has been away (a night, a weekend, a crash). Needs: an honest account of what happened and proof that nothing was decided for them.
- U3 **The team member** — one engineer in a team space; keeps their own workshop and gates, shares a roadmap, claims and foundations. Needs: see others without being governed by them.
- U4 **The first-time user** — has just installed KILN. Needs: a working factory and a first Roadmap gate without reading the manuals.
- U5 **The auditor / reviewer** — reads the record later (a teammate, the engineer months on). Needs: rebuild what happened from the record alone.

## Experience principles

- X1 **A person decides; the screen never does.** No default move, no auto-approve, no timeout, no pre-selected option. Delegation is visible wherever it applies.
- X2 **Needs you comes first.** What waits on a person is the first thing on every screen's frame; waiting never escalates or nags.
- X3 **Enough to decide, nowhere else to look.** A gate brief carries the question, the work, the yardstick and the evidence; the move is made only there.
- X4 **Always oriented.** Where am I, what state is it in, what happens next — answered by the frame and the page header on every screen.
- X5 **Honest about state.** Missing evidence is shown as missing; failure is named; what left the machine is listed. Never smooth over.
- X6 **Welcome back, don't catch up.** After absence the first thing is a plain account, not a log to dig through.
- X7 **Quiet by default.** Notify only what waits on the person; everything else is one calm place to look. No red alarms for ordinary waiting.
- X8 **Everything is traceable.** Every statement links to its record; what you see is what is recorded.
- X9 **You can always step in.** Steer, pause, abort, hand over — each recorded under your name and none of them a hidden decision.
- X10 **Same words everywhere.** Factory, Feature, Step, Knowledge — the same word on the web, in the terminal and in the editor. No kiln-metaphor words in the interface.

## Top journeys

- J1 **Decide at a gate** — build: J1.1 land on what needs me → J1.2 open the brief (orientation) → J1.3 read what approving commits to → J1.4 read the work against the yardstick and evidence → J1.5 weigh the options → J1.6 make a move with a note → J1.7 see what runs next. Screens: S1, S2, S6, S4.
- J2 **Come back after time away** — build: J2.1 see the account → J2.2 see what was blocked or recovered → J2.3 confirm nothing was approved for me → J2.4 pick what to take first. Screens: S3, S1.
- J3 **Shape and decide the roadmap** — build: J3.1 give the planner my inputs → J3.2 answer its questions → J3.3 compare and shape versions → J3.4 check journey coverage and flow per feature → J3.5 decide at the Roadmap gate. Screen: S7.
- J4 **Watch and steer a factory** — build: J4.1 watch the running step → J4.2 steer or pause → J4.3 answer a question from a step → J4.4 abort or end a delegation → J4.5 see cost and what left. Screens: S4, S2.
- J5 **Delegate and keep control** — build: J5.1 arm a delegation with limits → J5.2 see exactly what it covers → J5.3 see delegated passes in the gate rail → J5.4 see a delegation end on objection. Screens: S6, S4, S3.
- J6 **Audit a finished feature** — build: J6.1 open the feature record → J6.2 read each gate and its decider → J6.3 see what left the machine → J6.4 see steps and models. Screen: S5.
- J7 **First run** — build: J7.1 check the machine → J7.2 choose models → J7.3 choose workshop and storage → J7.4 set up the first factory (constitution, charter, design system) → J7.5 first roadmap → J7.6 see a whole demo feature first. Screen: S11.
- J8 **Work with a team** — build: J8.1 see who builds what and claims → J8.2 decide or sign a team roadmap change → J8.3 answer a request → J8.4 see overlap in my brief. Screens: S10, S6.
- J9 **Control where models run and spend** — build: J9.1 see what may leave → J9.2 map roles to models → J9.3 see budgets and stops → J9.4 review configuration changes. Screen: S9.
- J10 **Ask the knowledge** — build: J10.1 find a page → J10.2 read with citations → J10.3 ask and file an answer → J10.4 resolve stale findings. Screen: S8.
- J11 **Work from the terminal** — status: deferred to the CLI charter section below; same words and the same ten-part brief in text.
- J12 **Work from the editor** — status: deferred (Zed surface via ACP/MCP follows the web surface).

## Screen map

Home: S1. Frame shared by every screen: S0. Each wireframe is greyscale boxes labelled with region ids; the text outline here and the drawing agree (`kiln check charter` compares them).

- S0 The frame — the frame every screen shares: where am I, what needs me, where can I go · serves: all
  regions: Content area
  wireframe: wireframes/s0-frame.svg
- S1 Workshop overview — the home screen: what needs me now, what changed, and where every factory stands · serves: J1.1 · J2.1 · J5.3
  regions: R1 Page header · R2 Needs you now · R3 While you were away · R4 Factories · R5 Legend
  wireframe: wireframes/s1-workshop-overview.svg
- S2 Needs you — everything waiting on one person, across factories, the workshop and the team space · serves: J1.1 · J4.3 · J8.3
  regions: R1 Page header · R2 Waiting on you · R3 Suggestions · R4 Worth knowing · R5 What Needs you never does
  wireframe: wireframes/s2-needs-you.svg
- S3 Coming back — the account after time away or a crash: what happened, that nothing was decided for you, and what needs you · serves: J2.1 · J2.2 · J2.3 · J2.4 · J5.4
  regions: R1 Page header · R2 Recovery · R3 Nothing was approved · R4 By factory · R5 What needs you now · R6 Timeline
  wireframe: wireframes/s3-coming-back.svg
- S4 Factory live — one factory's current work, seen as it happens, with every way to step in · serves: J4.1 · J4.2 · J4.4 · J4.5 · J5.3 · J1.7
  regions: R1 Page header · R2 Gate rail · R3 Delegation · R4 The running step · R5 Step in · R6 Up next · R7 This feature so far
  wireframe: wireframes/s4-factory-live.svg
- S5 Feature record — one feature, rebuilt from the record alone: every gate, every decider, every step · serves: J6.1 · J6.2 · J6.3 · J6.4 · J4.5
  regions: R1 Page header · R2 Totals · R3 Gates · R4 What left the machine · R5 Steps
  wireframe: wireframes/s5-feature-record.svg
- S6 Gate brief — the ten-part brief at any gate: enough to decide without digging, and the only place a move is made · serves: J1.2 · J1.3 · J1.4 · J1.5 · J1.6 · J5.1 · J5.2 · J8.4
  regions: R1 Orientation · R2 The decision · R3 The work · R4 The yardstick · R5 The evidence · R6 Risks and open issues · R7 Provenance · R8 History · R9 The options · R10 Other actions
  wireframe: wireframes/s6-gate-brief.svg
- S7 Roadmap — shape the roadmap with the planner and decide at the Roadmap gate · serves: J3.1 · J3.2 · J3.3 · J3.4 · J3.5 · J8.2
  regions: R1 Page header · R2 Your inputs · R3 The planner asks · R4 The roadmap, shaped together · R5 Journey coverage · R6 Flow per feature · R7 How the factory runs · R8 Moves
  wireframe: wireframes/s7-roadmap.svg
- S8 Knowledge — find, read and ask the factory's knowledge, with citations and honest flags · serves: J10.1 · J10.2 · J10.3 · J10.4
  regions: R1 Page header and ask · R2 Pages · R3 Page · R4 Answer · R5 Findings
  wireframe: wireframes/s8-knowledge.svg
- S9 Models & policy — where models run, what may leave the machine, and what may be spent — and that it is enforced · serves: J9.1 · J9.2 · J9.3 · J9.4
  regions: R1 Page header · R2 Where things run · R3 Roles and models · R4 Budgets and spend · R5 Model catalog and checks · R6 Changes
  wireframe: wireframes/s9-models-and-policy.svg
- S10 Team space — who is building what, the team roadmap, requests between workshops and the team's rules · serves: J8.1 · J8.2 · J8.3
  regions: R1 Page header · R2 Workshops · R3 Team roadmap · R4 Claims · R5 Requests · R6 Published · R7 Team rules
  wireframe: wireframes/s10-team-space.svg
- S11 First run — setup in the browser, step by step, from the machine to the first Roadmap gate · serves: J7.1 · J7.2 · J7.3 · J7.4 · J7.5 · J7.6
  regions: R1 Page header · R2 This step · R3 What KILN found · R4 What stays local · R5 Step bar · R6 See a whole feature first
  wireframe: wireframes/s11-first-run.svg
- S12 Agents — roles, prompts and models per role · serves: J9.2 · links: S9 · no wireframe: configuration list; follows pattern P1 (table + detail)
- S13 Flows — gate sequences and conditions, read-only for built-ins · serves: J3.4 · links: S7 · no wireframe: list + diagram; follows P1
- S14 Hosts — machines, memory, fit · serves: J9.1 · links: S9 · no wireframe: table; follows P1
- S15 Health — checks and recovery state · serves: J2.2 · links: S3 · no wireframe: checklist; follows P1
- S16 Insights — measurements over time · serves: J6.1 · links: S5 · no wireframe: deferred
- S17 Bench — experiments on models and prompts · serves: J9.2 · no wireframe: deferred
- S18 People — members and roles · serves: J8.1 · links: S10 · no wireframe: list; follows P1

## Wireframes

The drawings are in `.specify/memory/experience-charter/wireframes/` (`s0-frame.svg` … `s11-first-run.svg`). Region ids `S#.R#` are stable; annotations cite principles and journeys. Greyscale only; no copy is final.

## Interaction patterns

- P1 **List and detail** — rows with one-line headlines; Open leads to a detail page, never an inline decision.
- P2 **Gate brief** — ten parts in a fixed order; options panel always visible; the move is the only action that decides.
- P3 **Gate rail** — one dot per gate, always a word and a shape; same component everywhere.
- P4 **Waiting** — a waiting item is quiet, shows how long it waited, never changes tone.
- P5 **Step in** — steer, pause, abort, end delegation are always grouped and always say they are recorded under the person's name.
- P6 **Empty and error states** — say what is true and what the person can do; never a blank screen or a bare error code.
- P7 **Confirm irreversible** — abort and reject name what will be lost and how far back it goes.

## Content voice

Direct, plain, second person ("You decide at this gate"). Sentence headings that say what is true. No metaphors from the kiln analogy in the interface; no marketing tone; no exclamation marks. Numbers carry units. Errors say what happened, what it means, what to do. English first; strings are localisable and nothing is baked into images.

## Accessibility floor

WCAG 2.2 AA. Every state readable without colour (word and shape). Full keyboard operation with visible focus and a logical order. Screen-reader labels for every region id's role. Terminal surface is screen-reader friendly (linear text, no animation-only meaning). Respect reduced motion and OS contrast/size settings. Wireframes carry a title and a description.

## Design system

KILN's own design system (`.specify/memory/design-system/`, seed defined in `docs/concepts/design-system.md` §12: the teal-and-sand theme, Charter display + Inter interface + monospace, status colours for wait/ok/info/delegated/danger) is pinned by this charter (version 0.2.0, teal and sand, now written as files: tokens, contrast registry, 12 components, 5 patterns). Its manifest is a draft awaiting formal approval (DSN-12); the wireframes stay greyscale structure.

## Quality bars

- A returning person understands what happened in under 30 seconds (S3).
- Any gate brief can be decided without leaving it (S6).
- Needs you count is correct on every screen within a second of a change.
- Every non-colour state test passes in greyscale.
- No screen offers a decision other than a gate move or an explicit step-in action.

## Non-goals

- No dashboards of vanity metrics; no gamification.
- No auto-approval, scoring that substitutes for a person, or "recommended" moves.
- No design or visual editor inside KILN.
- No cloud accounts required to use KILN.

## Open questions

- Q1 CLI charter: text brief layout and commands (J11).
- Q2 Editor surface: which of S4 and S6 come first (J12).
- Q3 Whether Insights (S16) and Bench (S17) warrant wireframes before they are built.
- Q4 Mobile web: read-only Needs you and Coming back only, or none.
