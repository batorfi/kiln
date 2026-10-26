> Status: concept — **consolidation of decided material** (UX §8, accepted 2026-10-16 and 2026-10-21; PRD BRIEF-1…6) with **proposals and open questions marked as such**. Nothing here changes a decision; where this
> document adds structure (the source of each part, the gap statements, the assembly rules), it says **[proposal]**. Building it is admitted only at the Roadmap gate (rows r20, r21, r22, r23, r26, r31, r39, r50, r51).
> Type: concept
>
> Scope note: this doc explains **the ten-part gate brief** — what a person must be able to read and understand at a gate, why it has this shape, where each part's facts come from, when a gate may be shown, and what the brief must never do.
> It is a concept, not a design or a spec: it fixes *what the human must be able to see*, not how a screen draws it. The per-gate emphasis is summarised here and stays defined in `user-experience.md` §8.5, `ui-flow.md` and `extensible-flow.md`.
>
> Companion docs:
>   - The origin of the brief:     `user-experience.md` §8 (rules, parts, headline, actions, emphasis) and decisions 4, 18–21
>   - The gates and their moves:   `the-flow.md` (§5 anatomy of a gate, §6 each gate, §7 where moves lead)
>   - The interface gates:         `ui-flow.md` §4.3 and §5.3 (their briefs) · `experience-charter.md` · `design-system.md`
>   - Added gates:                 `extensible-flow.md` §4 (`brief.emphasis`) · `team-space.md` (team context in briefs)
>   - The record:                  `the-record.md` (briefs as seen; `gate.opened`, `move.committed`)
>   - The director and Needs you:  `the-director.md` §5 (the headline travels with every item)
>   - The surfaces:                `web-front-door.md` §5.2 · `zed-integration.md` (Z2: decide only on the full brief)
>   - The PRD:                     `../prd/kiln-prd.md` (BRIEF-1…6, CORE-3, GATE-5 corrective-move notes, GATE-6 where moves lead)
>   - Mockups:                     `mockups/` 02, 03, 07–10, 68–71 (and 53 for an added gate)

# KILN — the gate brief

## 1. In one paragraph

A gate is the moment KILN hands a decision to a person, and the decision is only as good as what that person can see. So **every gate is presented with a ten-part brief**: where you are, what you are deciding, what was produced, what it is measured against, whether it is right,
what should worry you, who did it and how, how we got here, what you can do and what then happens, and what else you may do before deciding. The structure is **the same at every gate**, so it is learned once; the **emphasis** changes with the gate's question. The brief is
**assembled from committed facts** before the gate may wait for a person, is **honest about gaps**, **never recommends a move**, and is **recorded as seen** together with the move made from it — so that anyone reading the decision later sees exactly what the decider saw.

## 2. Why a brief at all

KILN's promises are structural: no gate settles without a person's committed move (constitution V), every state change is recorded with its cause (VII), and knowledge is context, never authority (X). Those promises say **who** decides and **that it is recorded**; they say nothing about whether the decision is
*informed*. A gate that is a bare "approve?" satisfies the letter of every principle and still produces rubber stamps. The brief is how KILN keeps the *quality* of human decisions as structural as their *existence*.

| Without a brief | With the ten-part brief |
|---|---|
| a yes/no on a summary written by the thing being judged | the artifact itself, the yardstick it is measured against, and the evidence of independent judges, side by side |
| a returning decider re-derives context from memory | orientation, history and "how my last note was addressed" are on the page |
| gaps (a judge did not run, a source was unavailable) are discovered later, or never | gaps are declared in the brief, in the part they affect |
| different surfaces tell different stories | one brief, one structure, in the browser, the CLI and the editor |
| "why did we approve this?" has no answer | the record holds the brief as seen, next to the move |

The brief also protects the *person*: a decision is made once, on the whole picture, with the consequences of each option stated — and a decision can be put off without penalty (waiting has no deadline that decides).

## 3. The rules **[decided — UX §8.1, BRIEF-1…6]**

Eight rules define the brief. They group naturally by what they protect:

| Protects | Rule |
|---|---|
| **Completeness** | **No gate without its brief.** A gate is never a bare yes/no. Wherever a gate appears it carries at least the **headline**, and **a move can only be made where the full brief is available**. |
| | **Complete before it is presented.** A gate opens for a person only when its brief is assembled; if evidence is still being produced, the gate is not yet waiting for a person and the experience says what it is waiting for. |
| **Comprehension** | **Self-contained.** Understandable by someone who did not watch the work, has been away for days, or is new to the factory. |
| | **Layered.** What a person needs to orient and decide first, then as deep as they want — full artifact, every finding, every transcript — without leaving the brief. |
| | **Same shape at every gate.** The same parts in the same order; only the emphasis changes. |
| **Honesty** | **Honest about gaps.** A missing part — a judge that did not run, a test that could not execute, an unavailable source, a stopped budget — is stated explicitly. A section is never silently omitted. |
| | **Advice is labelled as advice.** Judges' verdicts and any recommendation appear as attributed evidence, never as a pre-selected answer; **the brief never recommends or pre-selects a move** (BRIEF-6). |
| **Accountability** | **Recorded as seen.** The brief the person saw is part of the record, together with the move made from it. |

**Two rules that look like they conflict, and do not.** "Honest about gaps" says a brief may be *incomplete in its evidence*; "complete before presented" says a brief must be *complete in its structure*. The reconciliation: **all ten parts are assembled, and every part states what it could not
cover.** A brief with a declared gap may open the gate; a brief with a *missing part* may not. (An absent judge verdict is a declared gap, rendered in Evidence and Risks; a brief with no Evidence section at all is not assembled.)

## 4. The ten parts

Each part answers one question a person would otherwise have to ask. The order is the order of the decider's reasoning: *orient → understand the decision → see the work → know the standard → judge the evidence → weigh the risks → trust the process → learn from history → choose → act.*

| # | Part | Answers | Contents (from UX §8.2) |
|---|---|---|---|
| 1 | **Orientation** | *Where am I?* | the factory, the feature, the gate and its place among the gates; what has been decided so far; how long it has waited; first round or a return after a corrective move |
| 2 | **The decision** | *What am I deciding?* | the gate's question in plain words; what approving **commits to** and what it does **not**; what is at stake if wrong; whether this is a judged gate |
| 3 | **The work** | *What was produced?* | a plain summary, then the artifact itself; on a return round, **what changed since last time** and **how the previous note was addressed** |
| 4 | **The yardstick** | *What is it measured against?* | the earlier approved artifacts this one must honour (concept, specification, work plan) and the mapping of requirements to work and evidence; the **experience charter's** principles, journey steps and floor, with ids and pinned version; **context from the wiki** with citations |
| 5 | **The evidence** | *Is it right?* | the judges' verdicts with reasoning and findings by severity; test and verification results; automatic fix rounds and outcomes; what the factory checked and how |
| 6 | **Risks and open issues** | *What should worry me?* | assumptions agents made; questions they could not resolve; author/judge disagreements; what could not be done; cited wiki pages that are stale or contradicted |
| 7 | **Provenance** | *Who did this, and how?* | steps, roles, models and where they ran (local, private, cloud); human interventions; time and cost; **what left the machine** |
| 8 | **History** | *How did we get here?* | earlier rounds with their moves and notes; related decisions at earlier gates; delegation state, and if delegation was in force **why this gate stopped for the human** |
| 9 | **The options** | *What can I decide, and what happens then?* | every move this gate allows with its meaning, **consequence** (what the factory does next, how far back the work goes, what is kept and what is redone), cost in time, and whether a note is required; **the moves this gate does not have, and why** |
| 10 | **Other actions** | *What else can I do before deciding?* | read deeper · ask · request more evidence · ask what KILN would do · leave it waiting · hand it over · pause or stop the factory — each marked **not a decision** |

### 4.1 Where each part's facts come from **[proposal]**

The brief is never *written*; it is **assembled from committed facts** by deterministic gate and row tasks (`the-director.md`: "assembles briefs from committed facts … a gate's mechanics must never depend on a model's mood"). The only free-text content is the plain-language summaries, which are produced
by a recorded step and labelled as such. A part is only as trustworthy as its source, so naming the source is part of the concept:

| Part | Source of truth | Free text? | The gap to declare when the source is missing |
|---|---|---|---|
| 1 Orientation | the feature's events and the gate's open time; the flow in force for this feature | no | — (always available; its absence is an assembly failure, not a gap) |
| 2 The decision | the gate definition (question, judged or not, moves) and the flow's rule for what approving commits to | no | — |
| 3 The work | the committed artifact; the diff to the previous round; the previous move's note and the steps that followed it | a *summary*, labelled as a step's output | "no previous round" / "the note was not addressed by any step" |
| 4 The yardstick | the approved earlier artifacts; the charter and design system **at the versions pinned for this feature**; wiki pages **as cited, with their maturity and origin labels** | no | "no charter in this factory" / "page X changed since it was cited" |
| 5 The evidence | judge verdict events and findings; deterministic check results; fix-round events | judges' reasoning is *attributed* text | "the judge did not run: *reason*" / "check Y could not execute: *reason*" |
| 6 Risks and open issues | agent-declared assumptions and unresolved questions; unresolved objections; failures and blocked requests; staleness flags from the knowledge base | attributed | "no assumptions were declared" is stated, not implied |
| 7 Provenance | the unit and lane events (roles, models, locality), steering and approval events, cost and time, egress records | no | "cost unavailable: *reason*" |
| 8 History | prior `move.committed` events and their notes; earlier gates' decisions; the delegation document and any veto | no | "first round" |
| 9 The options | the gate definition's move vocabulary and the flow's *where moves lead* table | no | — |
| 10 Other actions | fixed by this concept (UX §8.4); availability depends on policy and the number of people | no | hidden, not disabled, when unavailable (e.g. *hand it over* in a one-person workshop) |

Every cell that says "—" is a part that **cannot** have a gap: its absence would mean the brief was not assembled, and the gate does not open.

## 5. The headline **[decided — UX §8.3]**

The headline is the brief in a few lines — the minimum that **travels with a gate wherever it appears**: in *Needs you*, in a notification, in the factory's own view, in the CLI list, in the editor.

| Always in the headline | Never in the headline |
|---|---|
| factory, feature and gate, with the gate's question | a recommendation or a pre-selected move |
| how long it has waited; whether it is a return round | KILN's opinion (that is a labelled planner step, shown apart, only on request) |
| **the evidence in one line** ("all judges agree"; "code reviewer objects: 2 major findings"; "verification failed after 2 automatic fix rounds") | anything that would let a person decide without opening the brief |
| the moves available | |
| anything unusual: a gap in the evidence, a stopped delegation, a blocked request, a reached budget | |

**The headline is enough to understand what is waiting and how much attention it needs. It is never enough to decide.** Surfaces enforce this: *Needs you* "never shows an item it cannot back with a full brief or request"; the editor integration decides only after the full ten parts have been shown there
(Zed rule Z2).

## 6. The same shape, different emphasis **[decided — UX §8.5, ui-flow, extensible-flow]**

The structure is fixed; the **emphasis** follows the gate's question — it decides what is put *first* inside the parts, not which parts exist.

| Gate | The brief puts first |
|---|---|
| **Roadmap gate** | the features, order and dependencies; what changed since the last approval; the wiki context behind the proposal; evidence and readiness per feature; the factory's profile, egress policy, budget and **host**; the flow proposed per feature with reasons, which interface gates apply, the journey-coverage map |
| **Concept** | the problem, premises and scope; the research it rests on; what is explicitly out of scope |
| **Architecture** | the proposed structure and its alternatives; the architecture critic's objections and how the design answers them |
| **Experience design** *(interface work)* | journey steps served; mockups beside the screens they change; the states matrix; charter ids; the design critic's findings; proposed charter amendments |
| **Specification** | what "done" means, requirement by requirement; how each will be verified; that this is where the unattended tail can be armed, and what it would cover |
| **Work plan** | the pieces and their order; the model order and its expected cost in time and swaps; overlap with teammates' claims |
| **Implementation** | the restorable starting point; the size of the work ahead; whether it is still one feature and what a split would look like |
| **Code review** | the changes mapped to the specification; the reviewer's findings by severity; what `revise` and `restart` would each redo |
| **UI review** *(interface work)* | approved against built per screen and state; accessibility, token, state, structure and visual-match evidence; whether the reviewer saw the images; accepted deviations |
| **Verification** | requirement-by-requirement results; the automatic fix rounds attempted and what they changed; the verifier's diagnosis |
| **Documentation** | what the documentation now says, compared with what was built |
| **Merge** | the whole feature end to end; open risks carried forward; what left the machine; what merging will do; what the feature added to the wiki; in a team, required reviews and checks, base drift, the merge-queue position |
| **An added gate** | whatever its definition lists in `brief.emphasis` — with the same ten parts, its judges' verdicts as evidence, and the same moves-from-the-closed-set rule |

Two properties follow from "same shape": a person who has read one brief knows where to look in every other, and a surface can render any gate — built-in or added — from the same component, which is how a team can add a gate without weakening anything.

## 7. The life of a brief

```text
 1 WORK       author steps run on the lane; research may be added
 2 EVIDENCE   judges and deterministic checks run; Verification's capped fix rounds
 3 ASSEMBLE   the ten parts are assembled from committed facts; every gap is declared in its part
 4 OPEN       one commit: the gate document · the brief AS IT WILL BE SHOWN · gate.opened      ← the brief gets an id
 5 WAIT       the gate is a waiting durable task; it appears in Needs you with its HEADLINE
              (more evidence may arrive: the brief is UPDATED, the update marked as such)
 6 SEE        the full brief is shown to the person on the surface they decide from  (what counts as "shown" is open, §12.1)
 7 MOVE       one atomic commit: the move · decided_by · the brief seen · the state version · the idempotency key
 8 APPLY      the director applies the move; the next gate's brief will show how the note was addressed
```

What each stage guarantees:

- **Assembly is deterministic and happens before waiting (stages 3–4).** The gate is not "waiting for a person" until the brief is complete; until then the experience says what it *is* waiting for (a judge, a check, a fix round). This is the third of the gate's five moments (`the-flow.md` §5).
- **The brief is committed with the gate (stage 4).** The gate contract requires that opening commit "the gate document, the brief *as it will be shown*, and `gate.opened`" (PRD CORE-3). The brief therefore exists as an immutable, identified object (`brief:9c1…` in the record's examples) *before* anyone looks at it.
- **A move names the brief it was made on (stage 7).** The `move.committed` event carries the brief id; "recorded as seen" is a *reference*, not a copy — the record points to content rather than embedding it (`the-record.md`). An auditor following a merge backwards reaches the approval, the brief it was made on, and the verification.
- **A move is bound to the state version it was made against (stage 7).** A move made on a brief that has since been superseded by newer state is refused and nothing is committed (`web-front-door.md` §5.2) — so a person can never approve something other than what they read.
- **Waiting is free (stage 5).** No clock, restart or missing screen settles the gate, and the brief does not "expire". Returning after days shows the same brief, plus anything that arrived (marked), plus what changed in the factory's state.

### 7.1 Updating a brief while the gate waits **[decided in part · open in part]**

Decided: *Request more evidence* is **additive** — a new verdict never replaces or hides an earlier one, "so asking again can add a yes but never erase a no"; the gate stays open and "the brief is updated when the evidence arrives, and the update is marked as such"; the request is costed before it runs and bounded by budget and policy, not by a count (decisions 18–20).

**[open]** How "the brief as it will be shown" (an immutable object committed at gate open) and "the brief is updated" fit together is not spelled out in the sources. The consistent reading is **versions**: each update is a new immutable brief version that *supersedes* the previous for display and that the next
move must be bound to (via the state version), while every earlier version stays in the record. Under that reading "recorded as seen" means *the version the person had on screen when they moved*, which is why the move must carry it. This is a design question for r20 and the record's catalog (r15), flagged
in section 12.

## 8. Actions besides deciding **[decided — UX §8.4]**

Part 10 is not decoration: it is where the brief admits that a decision is often *preceded* by questions. None of these settles the gate, and every one is recorded.

| Action | What it does | Constraint |
|---|---|---|
| **Read deeper** | the full artifact, every finding, step transcripts, the relevant part of the record | read-only |
| **Ask** | a question to the director or about the work | an answer that needs an agent runs as a visible, recorded step; the gate keeps waiting |
| **Request more evidence** | an additional check, a second judge, a judge from another model family | policy-bound, costed before it runs, **additive** — it can add a yes but never erase a no; needing egress becomes a policy stop |
| **Ask what KILN would do** | the planner's opinion, on request only | recorded planner step; labelled; shown **apart from the evidence**; never in the headline |
| **Leave it waiting** | decide later | no penalty, no deadline that decides |
| **Hand it over** | pass the decision to another permitted person, with a note | only in a multi-person workshop; hidden otherwise |
| **Pause or stop the factory** | when the issue is bigger than this gate | |

The deliberate asymmetry: a person may *ask for more* at any time, but the brief never *volunteers a verdict*. KILN's opinion exists, is available, and is kept out of the way.

## 9. One brief, three surfaces

| Surface | What it must render | What it must not do |
|---|---|---|
| **Web front door** | all ten parts, layered; the headline in *Needs you*; the state version bound to the move | offer a move without the full brief; show a different brief from the CLI or the editor |
| **`kiln` CLI** (the terminal surface, r20) | the same projection as plain text — `kiln gate` shows the brief; moves through the same move intake and the same rules | decide from a list view or a summary |
| **Zed** (r50/r51, kiln-v1.x) | the full brief **rendered in the agent thread — all ten parts — with every citation a location** (the editor jumps to the cited code); a move only after the full brief has been shown there, via elicitation, bound to the state version | treat a permission prompt or a summary as a gate move (Z2) |

The invariant across surfaces is **one brief, one structure**: surfaces differ in presentation and in what they let you *jump to*, never in content or in what counts as "seen".

## 10. What the brief must never do

| Never | Why |
|---|---|
| recommend or pre-select a move | the decision belongs to the person; an opinion is available on request, labelled and apart (BRIEF-6) |
| omit a part, or a gap | "an absent section is never silently omitted" — silence reads as "nothing to report" |
| let the work's author write its own evidence | author/judge separation (constitution I): judges' verdicts are attributed, independent evidence |
| replace or hide an earlier verdict | evidence is additive |
| present stale knowledge as current | wiki citations carry maturity and origin labels, and stale, drifted or recently changed pages are flagged (BRIEF-5) |
| depend on a clock | a brief never expires, urgency is only visibility ("an item does not become more urgent by waiting, only more visible") |
| hide what left the machine | provenance states what left, to whom, under which policy (constitution VIII) |
| differ between surfaces | one brief, recorded as seen |
| be assembled by a model's mood | assembly is deterministic from committed facts; only labelled summaries are free text |

## 11. A brief, illustrated **[illustrative — not a mockup]**

A Code review gate, second round (compare mockup 02). *Content is invented to show the shape.*

| Part | What the person reads |
|---|---|
| **Headline** | *kiln-v1 · r20 · Code review — waiting 3 h 10 m · round 2 · code reviewer objects: 1 major, 2 minor · moves: approve · revise · restart · note required for revise/restart* |
| **1 Orientation** | Concept, Architecture, Specification, Work plan, Implementation approved (dates, deciders). Round 2: you chose *revise* on round 1 (Tuesday 11:02). |
| **2 The decision** | "Is the code right, measured against the specification?" Approving commits the change to Verification; it does **not** merge it. Judged gate: the reviewer is independent of the workers and runs on the strongest model. |
| **3 The work** | 14 files, +420 −96. **Since round 1:** the retry path was rewritten; **your note** ("the retry can double-apply a move") was addressed in `retry.ts` and covered by two new tests. Full diff below; each hunk links to the requirement it serves. |
| **4 The yardstick** | Specification R3, R7, R9 mapped to files and tests; wiki page *Gate contract* (cited, **changed since citation** — see Risks). |
| **5 The evidence** | Reviewer (round 2): **1 major** — error path in `intake.ts` not covered by R7; 2 minor. Round 1's three findings: 2 resolved, 1 carried. Tests: 183 pass. *Not run:* the visual checker (no interface files changed). |
| **6 Risks and open issues** | Worker assumed idempotency keys are unique per gate (unverified). One disagreement: author argues the major finding is out of scope; reviewer maintains it. Wiki page *Gate contract* changed after citation. |
| **7 Provenance** | 9 steps across 3 roles; local models; the reviewer on the strongest local model; 2 steers from you in round 1; 41 min machine time; **nothing left the machine**. |
| **8 History** | Round 1 → *revise* with your note. Earlier gates: all approved by you; delegation **not armed**. |
| **9 The options** | **approve** → Verification (the major finding recorded as accepted). **revise** *(note required)* → workers fix on the current code, then a fresh reviewer conversation; about 30 min. **restart** *(note required)* → rebuild from the restorable commit with the findings; about 90 min. *Not available:* **reject** — the work is not "done wrong" at this gate; use *restart*. |
| **10 Other actions** | Read the transcripts · ask "why was this approach chosen?" · request a second review from another model family (est. 25 min, local) · ask what KILN would do · leave waiting. |

## 12. Open questions and proposals

| # | Question | Why it matters | Where it lands |
|---|---|---|---|
| 1 | **Brief versions.** Is an update a new immutable brief version that supersedes the previous for display, with the move bound to the version seen? (section 7.1) | "recorded as seen" and "updated when evidence arrives" must be one coherent thing | r20 (the brief on the web) and r15's event catalog |
| 2 | **Briefs for delegated gates.** When a gate auto-settles on a clean path under a delegation, is a brief still assembled and recorded, so an auditor can read what the delegation approved? | the record must distinguish a human's live approve from a delegation's, "at the level of the commit itself" | r21 (stepping in: the unattended tail) with r20 |
| 3 | **Size and layering.** How a very large artifact or finding set is layered without ever being half-shown | "layered" must never become "truncated" | r20 design |
| 4 | **Declared-gap vocabulary.** A small closed set of gap kinds (did not run · could not run · source unavailable · budget stopped · policy stopped · not applicable) so every surface says the same thing | consistency between web, CLI and editor **[proposal]** | r20 |
| 5 | **Source of truth per part** (section 4.1) | makes the brief checkable: a test can assert that every part is derived from a named event or artifact **[proposal]** | r20 acceptance, a possible `kiln check brief` |
| 6 | **Try a gate on a past feature** (FLOW-8) shows "the brief a decider would have seen"; that requires briefs to be reproducible from the record | audit and flow-design confidence | r26 (try-runs of added gates and flows) |
| 7 | **Accessibility and localisation** of the brief | a decision surface must be usable by every Decider | the experience charter's floor, applied at r20 (the first screens, r19, are built under KILN's own charter) |

## 13. Where it is built, and how it is traced

| Piece | Row | Requirement / decision |
|---|---|---|
| The ten-part brief on the web, with its headline; the CLI (`kiln gate` as text); moves bound to the state version; the brief recorded as seen; *Needs you* | **r20** | BRIEF-1…4, 6; WEB-3, WEB-6; decisions 4, 18–21 |
| The brief committed with the gate and referenced by the move | r13 (the gate contract) · r15 (the record's event catalog) | CORE-3; `gate.opened` / `move.committed` |
| The Roadmap gate brief: row origins, per-feature readiness, journey coverage, flow and host | r22 | BRIEF-4; DIR-7; EXP-5 |
| *Context from the wiki*, with citations and staleness flags | r23 | BRIEF-5; KNOW-5, KNOW-6 |
| Base drift and the team's process shown in briefs | r31 | BROWN-5, BROWN-8 |
| Overlap with teammates' claims, required reviews and the team-aware Merge gate in briefs | r39 | TEAM-4…7 |
| The interface gates' briefs (mockups and approved-versus-built beside the screens) | r20 | EXP-3 (briefs); `ui-flow.md` |
| The brief in Zed's thread; decide-in-Zed on the full brief | r50, r51 (kiln-v1.x); links both ways from r44 | EDIT-4, EDIT-5; Z2 |
| An added gate's brief from `brief.emphasis`; try a gate on a past feature | r26 (the flow as data is r14's) | FLOW-4…9; `extensible-flow.md` |

## 14. One page

1. A gate without its brief is a rubber stamp; the brief is how the **quality** of a human decision is made structural, as the **existence** of the decision already is.
2. **Ten parts, always in the same order** — orientation, decision, work, yardstick, evidence, risks, provenance, history, options, other actions — with **emphasis** that follows the gate's question.
3. The brief is **assembled from committed facts**, before the gate may wait, and committed **with** the gate; only labelled summaries are free text.
4. It is **honest about gaps**: structure complete, every shortfall declared in the part it affects.
5. It **never recommends a move**; more evidence is **additive**; KILN's opinion exists, on request, labelled and apart.
6. The **headline** travels everywhere; **a move needs the full brief**, on every surface.
7. A move is bound to the brief and state it was made on, and the brief is **recorded as seen** — so any decision can be explained afterwards by what the decider actually saw.
