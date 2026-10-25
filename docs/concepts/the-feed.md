> Status: concept — **proposal** (2026-10-25, for human@batorfi to review). Building it is admitted only at the Roadmap gate.
> Type: concept
>
> Scope note: this doc proposes **the Feed** — a free-form way to give KILN anything, with no structure required — and shows
> its look and feel in four sample illustrations. It is a concept, not a design or a spec.
>
> Companion docs:
>   - Working with KILN, Needs you:  `the-director.md` (§4)
>   - Roadmap inputs:                `roadmap.md`, `the-director.md` §4.3
>   - Knowledge:                     `factory-wiki.md`
>   - The charter and design system: `experience-charter.md`, `design-system.md`
>   - Illustrations:                 `feed/` (SVG source and PNG)

# KILN — the Feed

## 1. In one paragraph

Today KILN takes input in structured places: a roadmap brief, a gate note, a knowledge page. Real ideas do not arrive that
way — they arrive as a half-sentence, a screenshot, a ticket link, a voice note, an old PDF. **The Feed** is one place to
drop any of it, as it is. KILN **keeps it exactly as given**, the planner **drafts where it belongs**, and the engineer
**decides**. Feeding decides nothing, costs nothing, and leaves the machine nowhere.

## 2. Principles

1. **Free of form.** Nothing is required: no type, factory, title or template. Text, links, screenshots, files, voice, tickets, folders.
2. **Free of cost and of risk.** Feeding is local and instant; the original is stored untouched. The sorting step is an ordinary, visible planner step on the lane, labelled a draft, and follows the workshop's egress policy.
3. **Nothing is decided by feeding.** A fed item is a person's *evidence and wishes*, never a requirement, an approval or a move (Principle I, XCH principle X1). Reviewers may cite it; it never changes a spec on its own.
4. **KILN proposes, you choose.** Each item gets a drafted list of destinations with what each does. No option is pre-selected; more than one may be chosen; "keep as a note" and "not now" are always there.
5. **Waiting is quiet.** Feed items never appear as a blocker. They are a separate count beside Needs you, never escalate, never expire.
6. **A trail, not a pile.** Every use of a fed item shows "from your feed" and links back to the original (§5).

## 3. Where a fed item can go

| Destination | What happens | Decided by |
|---|---|---|
| Feature candidate | appears on the roadmap as a candidate; built only if admitted at the Roadmap gate | engineer |
| Input to the next roadmap | added to the roadmap brief the planner reads | engineer |
| Evidence for a gate | shown in that gate's brief, labelled "from your feed" | engineer |
| Knowledge page | written up, labelled "from a person", with citations | engineer |
| Question for a step | the next matching step is asked to look at it first | engineer |
| Suggestion to the constitution, charter or design system | opens an amendment *suggestion* only; the owner writes and approves any change | engineer, then the named owner |
| Keep as a note | stays in Feed → Notes | engineer |

The planner also reports what it **found** — overlap with a Feature in progress, a matching ticket, the factory it touches — so
the proposal is grounded, not guessed.

## 4. How it works

1. **Capture** — a global "Feed KILN" action (web, terminal `kiln feed`, editor surface), plus drag-and-drop, paste and a watched inbox folder. The item is stored in the record with time and source.
2. **Sort** — a planner step reads the item and drafts proposals and findings. It never edits artifacts, never calls a tool outside the workshop's policy.
3. **Decide** — the engineer opens the item in Feed, chooses zero or more destinations, confirms. Each confirmed destination is a recorded event naming the person.
4. **Trail** — the destination keeps a link to the original; the original keeps a list of where it went.

Events (new): `feed.captured`, `feed.sorted` (the draft), `feed.routed` (the person's choice), `feed.dismissed`. A fed item can be
edited by its author; edits are new versions, never overwrites.

## 5. Look and feel

The illustrations use the seed design system (`design-system.md` §12): warm neutrals, the ember accent for the primary action,
status shown as a word and a shape, plain second-person sentences, no metaphors from the kiln analogy.

| | |
|---|---|
| ![Feed KILN — drop anything](feed/a-feed-composer.png) | ![The Feed tray](feed/b-feed-tray.png) |
| **A. Drop anything.** One big box, any attachments, a reassurance that it stays local and decides nothing. | **B. The Feed.** Everything fed, with state in words and KILN's proposals marked "→" — never a decision. |
| ![Where should this go?](feed/c-where-it-goes.png) | ![Fed things keep their trail](feed/d-feed-trail.png) |
| **C. Where should this go?** The original as given beside a labelled draft, six destinations, none selected. | **D. The trail.** In a gate brief's yardstick and in the roadmap, fed items are visibly "from your feed". |

## 6. Interaction with the constitution and the flow

- **Principle I.** Feeding adds no producer or judge and no deciding move; routing is a person's move.
- **The Roadmap gate stays human-only.** A fed item may become a candidate or an input; admission is still the gate.
- **Judges.** A reviewer sees fed items only when the engineer routed them as evidence, labelled as such; they are never part of the author's context unmarked.
- **Teams.** Feed is personal by default. Sharing an item to the team space is an explicit action; team foundations (charter, design system, constitution) change only through their own PR path.
- **Privacy.** Items inherit the workshop's locality; a hybrid factory's egress rules apply to the sorting step like any other step; secrets scanning runs on capture.

## 7. Experience charter impact

New screen **S19 Feed** (list, filters, item detail = illustrations B and C) and a global **Feed KILN** action in the frame (S0).
New journey **J13 Feed an idea** (J13.1 drop it → J13.2 see the proposal → J13.3 choose where it goes → J13.4 see it used). New
interaction pattern **P8 Proposal, not decision**. Charter MINOR bump (0.2.0) when approved.

## 8. Open questions

- Q1 Voice: transcribe locally only, or allow a configured hybrid model?
- Q2 Should the watched inbox folder be on by default?
- Q3 Retention: keep forever (the record is append-only) or allow author-initiated redaction with a tombstone?
- Q4 Should the sorting step run immediately or batch when the lane is busy?
