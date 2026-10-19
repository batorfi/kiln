> Status: concept (proposal, rev 2, 2026-10-18) — **not admitted**
> Type: concept
>
> Scope note: this doc describes **the bench** — where engineers research, synthesise, prototype and come to
> understand the codebase while their factories run — and how the knowledge they make there flows into KILN's
> knowledge without extra effort. It introduces three capabilities: the **notebook**, **research steps** and
> **spikes**. It is a concept, not a design or a spec.
>
> Decisions taken by the human (2026-10-18): adopt the notebook, research steps and spikes as described here; connect the
> bench to making and updating roadmaps through a candidate list, evidence and readiness at the Roadmap gate (§8).
>
> Companion docs:
>   - Knowledge:                 `factory-wiki.md` (the tiers the bench promotes into)
>   - Teams:                     `team-space.md`
>   - The design:                `web-front-door.md` (§17 summarises this concept)
>   - The user experience:       `user-experience.md` (and `mockups/40`–`45`)
>   - The PRD:                   `../prd/kiln-prd.md`

# KILN — the bench

## 1. In one paragraph

While factories work, engineers spend most of their time **between gates**: reading code, researching, synthesising,
sketching and prototyping. That is where most new knowledge is made — and today it stays in personal notes, browser
tabs and throwaway branches. **The bench** is the place in each workshop for that work. A private **notebook** holds the
messy thinking and lets it mature into knowledge by promotion. **Research steps** hand the legwork of research to the
factory, on spare capacity, while the engineer decides gates. **Spikes** are explicitly ungated experiments in real code
that end in a measured **spike report** — and can become a roadmap feature that is then built properly through the
gates. Nothing on the bench decides anything, and nothing leaves it unless its author chooses.

The name follows the kiln: the bench is the potter's workbench beside the kiln, where things are shaped and tried before
anything is fired.

## 2. Principles

| | Principle | Meaning |
|---|---|---|
| **B1** | **Private by default** | the notebook, research results and spikes belong to their author until they choose to share or promote them |
| **B2** | **Never decides** | bench output is context; nothing on the bench settles, skips or shortens a gate; only *promoted* knowledge is cited in a gate brief |
| **B3** | **Explicit capture** | KILN captures only what a person deliberately sends — no keystroke, browsing or reading-time tracking, ever |
| **B4** | **The lane comes first** | research and spike work runs below feature work, never preempts a step mid-generation, never takes a held judge's lane |
| **B5** | **Labelled by origin and maturity** | every bench output says where it came from — personal note, research, spike-measured — and how mature it is |
| **B6** | **Ungated means ungated** | spike code is experimental and can never reach `main`; a spike becomes real only by becoming a feature that passes the gates |

## 3. The notebook

### 3.1 What it is

A private, messy workspace per engineer, inside their workshop — a vault folder `notebook/` following the same
Obsidian vault contract as all knowledge (`factory-wiki.md` §6): markdown, wikilinks, YAML front-matter. People write in
KILN, Obsidian or Zed; an engineer who already keeps a personal vault can point KILN at a folder inside it. Unlike the
knowledge tiers, the notebook has **no rules**: no required front-matter, no schema, no lint findings. Fragments welcome.

### 3.2 Capture

Every capture is a deliberate act:

- **browser clipper** — a page, a selection, an image; saved locally;
- **from the editor** — *send to notebook* with the selection, its file, lines and commit;
- **from the terminal** — `kiln note "…"`, or a file, a log excerpt, a screenshot;
- **from KILN itself** — a gate brief, a finding, an explainer, a judge's verdict: *note this*;
- **voice** — a memo transcribed on the machine.

### 3.3 The keeper tends it

The wiki keeper looks after the notebook lightly, at the lowest priority, and only **suggests**:

- **links** a new note to existing knowledge (*you mention leases — see Model pool*);
- **flags contradictions** with accepted knowledge;
- **notices maturity** — several notes on one topic, an idea returning over days, a question it can now answer — and
  offers to promote;
- **answers its owner's questions** from the notebook plus knowledge; no one else's questions ever draw on it.

It never rewrites a note.

### 3.4 Promotion

*Promote* turns a note, or a cluster of notes, into an **ingest** (`factory-wiki.md` §8.1): the keeper talks the
takeaways through with the author, then writes pages in the tier the author chooses — their workshop knowledge, a
factory's knowledge (if they are a Curator), or team knowledge. The notes stay in the notebook, linked to the pages they
became. The full path is:

```
notebook  ──promote──►  workshop knowledge  ──►  factory knowledge  ──►  team knowledge
 (messy, private)          (personal, clean)        (Curators)              (everyone)
```

Each step is the author's choice and is recorded.

## 4. Research steps

### 4.1 What they are

A research job an engineer hands to their factory: the agent does the legwork — reading, comparing, collecting — while
the engineer spends their time on judgment, typically deciding gates.

### 4.2 How a research step runs

1. **Ask** in plain words — from the notebook, a gate brief, knowledge, or the command line.
2. **See the plan first** — what it will read (codebase, knowledge, notebook items the author attaches, the web if
   allowed), which role and model, an estimate of time, any egress. Confirm, edit or cancel.
3. **Run** as an ordinary durable step of kind *research*: below feature work, between feature steps, preferring the
   model already loaded, surviving crashes and sleeping hosts. **Read-only tools only** — research never changes code.
4. **Land in the notebook** as a draft: findings, sources (pages, code at a commit, locally clipped web pages),
   confidence, and what it could not find — labelled *research · exploratory · researcher role on <model>*.
5. **Continue** — read, edit, ask follow-ups in the same conversation, link to a gate, promote, or turn into a spike.

### 4.3 Where it runs

By default on the lane of the factory it concerns. Where the workshop has several hosts, a research step may run on any
host with spare capacity that the work's policy allows (`factories-anywhere.md` §5), with the same priority rules.

### 4.4 Limits

A workshop policy can cap research time and spend per person and per day. Research steps appear in the record and in
machine-time and spend accounting, so their cost is always visible.

## 5. Spikes

### 5.1 What they are

An explicitly **ungated experiment** in real code: try an idea, measure it, learn — without walking ten gates for
something that may be thrown away. Its product is knowledge (a spike report), never merged code.

### 5.2 Starting a spike

From the notebook, a research result or the roadmap. Starting creates:

- an **isolated worktree** on its own branch `spike/<name>`, cut from `main` at a known commit;
- a **question** the spike must answer, and how the engineer will know;
- a **time box** (for example 90 minutes), after which it stops and asks.

### 5.3 Working in a spike

The engineer codes in it, an agent works in it with them (steerable; risky actions still held for approval), or both.
Spike work runs at the same low priority as research. A spike may run on another host where policy allows — a cloud
machine for a heavy benchmark, for example.

### 5.4 What a spike can never do

- **Merge.** KILN refuses to open a pull request to `main` from a `spike/` branch; in a team, branch protection backs it up.
- **Pass gates or use judges.** Nothing is approved; spike code is labelled *ungated* everywhere it appears.
- **Survive silently.** At the end of its time box it stops: extend (recorded), conclude or abandon.

### 5.5 The spike report

Concluding a spike produces a **spike report**, drafted by the keeper from what actually happened:

- the question, and the answer — *yes*, *no* or *partly*;
- what was tried, with code excerpts at the spike's commits;
- **measurements** from real runs — timings, sizes, test results — labelled **spike-measured**, so they carry more weight
  than claims in notes or research;
- what failed and why; what remains open.

The report goes to the notebook; promoted, it becomes a knowledge source of origin *spike-measured*.

### 5.6 From spike to feature

*Propose as a feature* drafts a factory- or team-roadmap entry. When it is adopted, its Concept or Design gate brief
starts with the spike report as evidence. The spike's code does **not** carry over: it is linked for reference, and the
feature is built properly through the gates. Concluded spike branches are **archived**, not deleted, so provenance
stays intact.

## 6. Origin and maturity labels

The bench makes knowledge carry two labels everywhere it travels — in pages, gate briefs and the director's citations:

| Origin | Meaning |
|---|---|
| **external** | a source from outside: docs, articles, incident reports |
| **factory-produced** | written from KILN's record — feature stories, implementation digests |
| **human research** | a person's own notes and synthesis |
| **research step** | gathered by a research step |
| **spike-measured** | measured in a spike, in real code |

| Maturity | Meaning |
|---|---|
| **exploratory** | early; may be wrong; aged quickly by lint |
| **validated** | checked against code, measurements or a second source |
| **decided** | backed by a gate decision or a recorded team decision |

## 7. Connections to the rest of KILN

- **Gates.** A research result, a spike or a note can be **linked to the gate it is for** (*researching for r10's Design
  gate*). Once promoted, it appears in that gate's brief as context, with its labels. When a gate opens, KILN can suggest
  what to look into — related pages, open questions, the judge's findings.
- **Factory learnings** and judge findings can appear in the engineer's notebook as prompts — *worth understanding: why
  round 2 was restarted*.
- **The director** cites promoted bench knowledge when it proposes roadmaps; a spike can be the reason a feature exists.
- **Focus.** While someone works on the bench, gates keep waiting — nothing is ever decided for them; only judged gates and
  policy stops interrupt, other notifications are batched, and a coming-back summary is ready when they surface.

## 8. The bench and the roadmap

A factory's roadmap changes in exactly one place — **the Roadmap gate**, decided by a human. The bench never edits it.
What the bench gives the roadmap is what it otherwise lacks: **candidates** (features worth building), **evidence** (is it
worth it, how big, how risky) and **corrections** (findings that change features already on it).

### 8.1 From idea to roadmap

| Stage | Lives | Moves on when |
|---|---|---|
| **Idea** | a note in the notebook | its author makes it a candidate, or the keeper suggests it |
| **Candidate** | the factory's **candidate list** | someone attaches evidence, or the director proposes it |
| **Evidenced** | the candidate, with research results and spike reports attached | the director includes it in a proposal |
| **Proposed** | the director's Roadmap-gate proposal | a human admits it |
| **Admitted** | the factory's roadmap | it runs through its gates |
| **Claimed** *(team)* | the team roadmap and a claim | its factory adopts it at its own Roadmap gate |

**The candidate list** is new: a light, unordered tray of possible features per factory — not the roadmap, no gates, no
order. *Propose as a candidate* works from a note, a research result or a spike report, and keeps the links. The director
reads the list when it drafts a proposal; Curators and the factory's deciders can edit, merge or close candidates. In a team,
*propose to the team roadmap* sends a candidate with its evidence to the quorum.

### 8.2 What each capability contributes

- **Notebook — ideas.** Notes become candidates by choice; the keeper may suggest candidates from patterns (*the same
  workaround noted three times*); factory learnings and judge findings arrive as prompts — the loop from shipped features
  back to the next roadmap.
- **Research steps — sizing and prior art.** *What would this touch? Has it been solved? Which dependencies?* When the
  director cannot size a candidate, its proposal **says so and offers a research step**; a person confirms or declines.
  The director never starts research itself.
- **Spikes — de-risking.** For *can this work at all?* or *how big is it really?* A spike's answer shapes the candidate:
  *yes* → admit with measured evidence; *no* → close it, with the reason recorded so no one spikes it again; *partly* →
  reshape it (split it, or add the condition found). Spike measurements later inform the **Work plan gate**.

### 8.3 At the Roadmap gate

The Roadmap gate brief gains an **evidence view** per proposed feature:

- the evidence behind it, each item labelled by origin and maturity (`§6`);
- its **unproven assumptions**;
- a **readiness** indication — *ready* (validated evidence), *thin* (exploratory only), *unknown* (no evidence) — as
  information only; it never decides;
- **other actions**: *research this* and *spike this before admitting*, each starting a bench item linked to the gate.

The gate's moves are unchanged. *Admit only after a spike* is expressed by editing the rows — leave it out for now, or
place it later — and revisiting it next time.

### 8.4 Keeping the roadmap current

The Roadmap gate re-opens after every merged feature; its brief gains **What we learned since the last approval**: spike
reports and research concluded since then, learnings from the feature just merged, and **corrections** — bench findings
that contradict an assumption of a queued feature. The director drafts its amendment from these, citing each; the human
decides.

Between Roadmap gates, a bench finding that undermines a queued feature is shown as *worth knowing* and flagged for the
next Roadmap gate. It never pauses the current feature and never edits the roadmap.

### 8.5 Rules

- Nothing on the bench changes a roadmap — only the Roadmap gate, by a human (or the team roadmap's quorum).
- A private note may make a candidate exist; only **promoted or shared** evidence is cited in a brief.
- The director **suggests** research and spikes; it never starts them, schedules them, or re-orders anything by itself.
- Research and spike time spent per candidate is visible, so de-risking stays proportionate.

**New events:** `bench.candidate_proposed`, `bench.candidate_evidenced`, `bench.candidate_closed`,
`bench.research_suggested`, `roadmap.correction_flagged`.

## 9. In a team

- **Research claims** — a lightweight, advisory *who is researching what* in the team space (`team-space.md`), shared by
  choice, so two people do not spend a day on the same comparison.
- **Sharing** a note, a research result or a spike report to the team space is the author's choice; a teammate's private
  notebook is never exposed.
- **Handing on a spike** — a spike can be shared with a teammate to continue, explicitly and recorded.

## 10. How it fits KILN's rules

| KILN rule | On the bench |
|---|---|
| **Humans decide; no silent approval** | nothing on the bench settles a gate; a spike can only become real by becoming a feature |
| **One lane per factory** | research and spike work wait behind feature steps and never take a held judge's lane |
| **Durable** | research and agent-assisted spike steps are durable steps; the notebook is a git-backed vault |
| **Everything recorded** | research, spikes, promotions and shares are events; the notebook's private content is not |
| **Local by default** | web research and clipping are egress, allowed only by policy; voice is transcribed locally |
| **Knowledge is context** | bench output is context — and cited in a gate brief only after promotion |
| **Readable without KILN** | the notebook is an Obsidian vault like every other |

**New events:** `bench.note_captured`, `bench.note_promoted`, `bench.research_requested`, `bench.research_completed`,
`bench.spike_started`, `bench.spike_extended`, `bench.spike_concluded`, `bench.spike_abandoned`,
`bench.spike_proposed_as_feature`, `bench.shared`. Events carry no note content.

## 11. Open questions

1. Should research and spike capacity be reserved per person on a shared host, or first come, first served below feature
   work?
2. Should the keeper's suggestions in the notebook be switchable off per person?
3. How long are archived spike branches kept?

## 12. One sentence

The bench gives engineers a place beside the kiln to think, research and prototype — a private notebook, research the
factory does for them, and ungated spikes that end in measured reports — so the knowledge made between gates becomes
knowledge the whole factory can use, without ever deciding anything on anyone's behalf.
