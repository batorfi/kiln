> Status: concept — **final** (2026-10-21, human@batorfi; previously a proposal, rev 5, 2026-10-18). Open decisions were
> settled on 2026-10-21 and are recorded where they apply; what remains open is listed in
> [`open-decisions.md`](./open-decisions.md). Building it is admitted only at the Roadmap gate.
> Type: concept
>
> Scope note: this doc introduces **KILN's wikis**: a dedicated, LLM-maintained knowledge base for every factory, and
> one for the whole workshop, following the **LLM Wiki** pattern published by Andrej Karpathy. Factory wikis are kept
> by **Curators** — software engineers responsible for the knowledge corpus that gives roadmap planning its context;
> the workshop wiki is open to everyone. It covers the idea, how it fits KILN's rules, and what changes elsewhere. It
> is a concept, not a design or a spec.
>
> Decisions taken by the human for this revision (2026-10-17):
>   1. **Follow Karpathy.** The LLM writes the wiki directly; there is no approval step on ingests or filed answers.
>   2. **Curators may edit** factory wiki pages directly, in KILN, Obsidian or any editor.
>   3. **A workshop-wide wiki exists alongside the factory wikis, and anyone in the workshop can edit it.**
>   4. **Factories write implementation knowledge into their wikis as they build** — learnings, technical overviews,
>      explainers, how-to guides and reference — so people can explore and understand how the code was generated (§9).
>
> Source of the pattern: Andrej Karpathy, *LLM Wiki* (idea file, April 2026),
> `https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f`. Where this doc says "Karpathy's pattern", it
> means that file; KILN-specific choices are marked as such.
>
> Companion docs:
>   - The vision:                        `vision.md`
>   - The design:                        `web-front-door.md` (§14 summarises this concept)
>   - The user experience:               `user-experience.md` (and `mockups/22`–`31`)
>   - How KILN uses Pi Durable:          `pi-durable.md`

# KILN — the factory wikis and the workshop wiki

## 1. In one paragraph

Every factory gets **its own wiki**, and the workshop has **one more** for what all factories share. A wiki is a set
of interlinked markdown pages that sits between raw sources — design notes, decisions, incident reports, customer
requests, documents, and KILN's own record — and the agents that plan and do the work. As in Karpathy's LLM Wiki, the
wiki is **written and maintained by an LLM**: people choose the sources, talk the takeaways through, ask questions and
edit when they want to; the LLM does the summarising, cross-referencing and bookkeeping that make human-maintained
wikis decay. The result is a compounding body of context that the director reads when it proposes a roadmap, that
research and concept steps read when they start, and that every gate brief can cite. As factories build, they write
back what they learned and how the code was made — feature stories, overviews, explainers, how-tos — so people can
explore and understand code that agents wrote. Every wiki is a plain Obsidian vault, readable without KILN. **The wiki informs decisions; it never makes them.**

## 2. The pattern, as Karpathy describes it

Most systems that let an LLM work with documents retrieve fragments at question time and rediscover the same
knowledge every time; nothing accumulates. Karpathy's alternative is for the LLM to **compile** the sources once into a
persistent wiki and keep it current — "a persistent, compounding artifact".

| Element | Karpathy's pattern |
|---|---|
| **Raw sources** | curated, immutable documents; the LLM reads them and never edits them |
| **The wiki** | LLM-generated markdown — summaries, entity and concept pages, comparisons, an overview — owned and maintained by the LLM |
| **The schema** | a document (for example `AGENTS.md`) that tells the LLM how the wiki is structured and how to maintain it; refined by human and LLM together |
| **Ingest** | add a source; the LLM discusses the takeaways, writes a summary, updates the related pages (often 10–15), updates the index and appends to the log |
| **Query** | the LLM reads the index, then the relevant pages, and answers with citations; good answers are **filed back** as new pages |
| **Lint** | periodic health checks: contradictions, stale claims, orphan pages, missing concept pages, missing cross-references, data gaps |
| **`index.md`** | a catalog of every page with a one-line summary, read first on every query — enough navigation at moderate scale without embeddings |
| **`log.md`** | an append-only, chronological record of ingests, queries and lint passes |
| **Division of labour** | the human sources, directs and asks; the LLM summarises, cross-references, files and keeps the books |

Why it works, in Karpathy's framing: people abandon wikis because maintenance grows faster than value; an LLM does
not tire of updating cross-references, so maintenance becomes nearly free.

**KILN follows the pattern as published.** The LLM writes pages directly, with no approval step; the human stays
involved the way Karpathy describes — one source at a time, discussing what matters, asking, and correcting.

## 3. Why every factory needs one — and the workshop too

KILN's quality rests on its gates, and its gates rest on context. Today that context is scattered:

- **The director plans roadmaps from what it can find at the time** — a research step that reads documents afresh
  for every roadmap, and forgets everything afterwards.
- **Knowledge produced by the factory leaves with the feature.** Why a design was rejected, what a verification
  revealed, which assumption turned out wrong — it is all in the record, but nobody reads the record when planning.
- **Engineers carry the rest in their heads.** Constraints, past incidents, customer commitments and architectural
  intent rarely reach the agents at all.
- **Some knowledge belongs to no single factory.** How the local models behave, how Ollama and Pi work, team
  conventions, shared services, who owns what — every factory needs it, and none should keep its own copy.

A factory wiki gives each factory a **memory that compounds**; the workshop wiki gives every factory the **common
ground** beneath it. Every merged feature, every rejected design, every incident and every customer request makes the
next roadmap better informed — and the context behind any proposal can be traced back to its source.

## 4. Who keeps the wikis

### 4.1 The Curator — a factory wiki

The **Curator** is a KILN persona: a software engineer whose responsibility is a factory's knowledge corpus.

| The Curator… | The LLM (wiki keeper)… |
|---|---|
| decides which sources enter the factory wiki | reads sources, never edits them |
| runs ingests and talks the takeaways through with the keeper | writes and updates pages, the index and cross-references — directly, as in Karpathy's pattern |
| **edits pages directly** when something is better said by a person — in KILN, Obsidian or any editor | treats a person's edit as part of the wiki from then on, and keeps links and index consistent with it |
| reverts an ingest or an edit that made things worse | — |
| refines the schema with the keeper | follows the schema |
| decides what to do about lint findings | runs lint passes and proposes fixes |
| asks questions and files good answers back | answers with citations; writes filed answers as pages |

Curators are named per factory, like Deciders (`user-experience.md` §2, mockup 20); one person or a whole team can
hold the role. Anyone allowed to read a factory can read and ask its wiki; only its Curators add sources and edit.

### 4.2 Everyone — the workshop wiki

The workshop wiki has no gatekeepers: **anyone in the workshop can add sources, edit pages, run ingests and file
answers.** Every change is attributed to the person who made it, recorded, and linted like any other — openness
without loss of traceability.

## 5. The three layers

| Layer | In a factory wiki | In the workshop wiki |
|---|---|---|
| **Raw sources** — `raw/` | added by Curators: design notes, ADRs, incident reports, customer requests, specifications of other systems, clipped articles, meeting notes — plus **implementation digests**, which KILN adds to `raw/record/` as each gate settles (§8.4), and, for an existing codebase,
the **full scan**'s machine facts in `raw/scan/<commit>/`, with its pages under `pages/codebase/` (`brownfield.md` §5.3). Immutable: agents never write to existing files in `raw/`. | added by anyone: model notes, Ollama and Pi documentation, team conventions, shared-service docs, cross-factory lessons. Immutable in the same way. |
| **The wiki** — `pages/` | written by the keeper (and edited by Curators): overview, entities, concepts, decisions, incidents, source summaries, comparisons, filed answers; `index.md` | the same page types, for knowledge that spans factories |
| **The schema** — `AGENTS.md` | the factory's conventions — page types, naming, required front-matter (sources, reviewed, owner), what counts as a contradiction — refined by Curators and the keeper | the workshop's conventions, refined by anyone with the keeper |

Every wiki is **a git repository of plain markdown**, as Karpathy suggests — and **a valid Obsidian vault** that reads
cleanly in editors such as Zed (§6): versioned, diffable and portable. Each ingest, edit and filed answer is a commit,
so every change has an author and can be reverted.

**`log.md` is a projection** (a KILN-specific choice). Every wiki operation is an event in KILN's ordered record
(§11); `log.md` is generated from those events, so it cannot drift from what happened.

## 6. Readable anywhere: every wiki is an Obsidian vault

A wiki must always be readable **without KILN** — in Obsidian, in an editor such as Zed, or in any text editor. KILN's
web front door is one way to read a wiki, never the only one. This is a compatibility contract the keeper must keep and
lint must check.

**The vault.** A wiki repository *is* an Obsidian vault: open its root folder in Obsidian and everything works — links,
backlinks, properties, tags, graph view. Open the same folder in Zed and every page is plain, readable markdown.

```
kiln-v1-wiki/              ← a factory vault (open this folder)
  AGENTS.md                ← the schema
  index.md                 ← the catalog
  log.md                   ← generated from the record
  pages/                   ← written by the keeper, edited by Curators
    concepts/  entities/  decisions/  incidents/  sources/  answers/
  raw/                     ← sources, immutable
    assets/                ← images and attachments, stored locally
  workshop/                ← the workshop wiki, included read-only (§7)
  .obsidian/               ← optional, shipped with sensible defaults; never required
```

**Links are wikilinks.** Pages link with Obsidian's wikilink syntax — `[[Model residency]]`, `[[Model residency|residency]]`
for display text, `[[Judge hold#Why]]` for a heading. Images and attachments are embedded with `![[diagram.png]]` and
stored under `raw/assets/`, as Karpathy recommends. Standard markdown links are used only for external URLs.

**One name, one page.** Obsidian resolves a wikilink by file name, so the rules are:

- a page's **file name is its title** (`pages/concepts/Model residency.md` ↔ `[[Model residency]]`), and **file names are
  unique across the whole vault** — including `raw/` and the included `workshop/` folder — so a link never depends on
  folder paths;
- titles avoid the characters Obsidian and file systems reject in names: `* " \ / < > : | ? # ^ [ ]`;
- a **renamed page keeps its old title in `aliases`**, and every link to it is updated in the same commit — so old
  links keep resolving, in Obsidian and in KILN;
- files are UTF-8 with LF line endings and no byte-order mark.

**Properties are YAML front-matter.** Every page starts with front-matter that Obsidian shows as *Properties* and any
editor shows as text:

```yaml
---
type: concept
aliases: [Residency]
tags: [models, lane]
sources: ["[[ollama-faq]]", "[[incident-2026-10-14-eviction]]"]
reviewed: 2026-10-17
owner: Anna Kovács
status: current
---
```

Links inside properties are quoted wikilinks (`"[[ollama-faq]]"`), which Obsidian resolves and shows in backlinks and
the graph. Only Obsidian's simple property types are used (text, list, number, checkbox, date), and the reserved
names keep their meaning (`aliases`, `tags`).

**Readable without plugins.** Pages use only core markdown and core Obsidian syntax: headings, lists, tables, code
blocks, wikilinks, embeds, tags, and callouts (`> [!note]`, which read as plain quotes elsewhere). **No page depends
on a community plugin** — no Dataview queries, no plugin-only blocks. Generated tables are written out as plain
markdown, so they read the same in Obsidian, Zed and on a code-hosting site. Mermaid diagrams are allowed only
alongside a sentence that says the same thing.

**Citations stay precise without touching sources.** Pages cite sources by wikilink, down to a heading where one exists
(`[[ollama-faq#Memory]]`). Because `raw/` is immutable, KILN never inserts Obsidian block IDs (`^id`) into a source;
quotes are reproduced in the page instead.

**Editors such as Zed.** Zed and other editors show every page as clean markdown with readable front-matter; wikilinks
read naturally because a link's text *is* the target file's name. Editors that use a markdown language server which
understands wikilinks (Marksman, for example) also get link navigation, completion and broken-link warnings. KILN
does not require any particular editor or plugin. A proposal for ready-made Zed projects per vault, Zed-openable tours
and knowledge served to editor agents is in `zed-integration.md` (D4, D7).

**Editing in KILN, Obsidian or Zed.** People who may edit a wiki can do it anywhere. KILN picks up a change when it next
reads the repository: the change is attributed to whoever committed it, recorded as `wiki.page_edited` (with where it
was made), and linted like any other. A change to an existing file in `raw/` is reported in Health for someone to
revert, and KILN keeps citing the version it ingested — `raw/` is immutable. `index.md` and `log.md` are regenerated
rather than hand-merged. `.obsidian/` workspace state (open tabs, layout) is ignored by git, so one person's view never
becomes another's.

**Lint checks the contract.** Every lint pass also checks vault conformance: broken wikilinks, duplicate or ambiguous
names (including collisions with `workshop/`), forbidden characters, missing or malformed front-matter, links into
`raw/` that do not resolve, plugin-only syntax, and embeds whose files are missing. A wiki that fails conformance is
reported in Health, like a factory-log that fails validation.

## 6a. The notebook and origin labels

Beneath the knowledge tiers sits each person's **notebook** (`the-bench.md`): a private, unruled vault where thinking
matures, and from which notes are **promoted** by ingest into a tier the author chooses. With the bench, every page also
carries an **origin** (external · factory-produced · human research · research step · spike-measured) and a **maturity**
(exploratory · validated · decided) in its front-matter; lint ages exploratory pages faster, and gate briefs show both
labels with every citation.

## 7. Team knowledge

In a team whose members run their own workshops (`team-space.md`), a third tier joins factory and workshop knowledge:
**team knowledge**, a vault in the team space holding architecture, conventions, shared services, models, lessons that hold
for the team, and the stories of features merged to the shared `main` — the latter published **by the author's choice**.
Every member can edit it; every edit is signed, recorded and linted. It is included read-only in each member's factory
vaults as `team/`, so pages link to it with ordinary wikilinks. In a personal workshop, *workshop knowledge* is that
person's own; team-wide knowledge belongs in team knowledge.

## 7a. The workshop wiki

**What belongs there.** Knowledge that every factory needs and no factory owns: how each local and remote model
behaves, Ollama, Pi and Pi Durable, the machine, team conventions and coding standards, shared services and their
contracts, ownership of systems, and lessons that proved true in more than one factory.

**Open to everyone.** Anyone in the workshop can add a source, run an ingest, edit a page or file an answer. There is
no approval step; every change is a commit with an author, recorded in the workshop's own event stream and linted.

**Inside every factory vault.** The workshop wiki is included in each factory vault as a read-only `workshop/` folder,
pinned to a known version and updated by KILN when the workshop wiki changes. Because it sits inside the vault,
**a factory page can link to a workshop page with an ordinary wikilink** — `[[Ollama]]` — and Obsidian, Zed and KILN all
resolve it. Workshop pages are edited in the workshop wiki itself, never through a factory's copy; an edit made to the
copy is reported and not kept.

**Where the wikis live.** A factory's wiki lives on the factory's host and moves with it (`factories-anywhere.md`); people
reach it as a git remote, so any vault can be cloned and opened in Obsidian or Zed from wherever they are. The workshop
wiki lives with the workshop.

**Kept by its own steps.** Workshop-wiki ingests and lint passes are scheduled by the workshop on spare capacity, one
step at a time, at the lowest priority — they never delay a factory's work.

**Moving knowledge up.** When lint notices that the same knowledge appears in several factory wikis, it proposes a
workshop page. Anyone can create it; factory pages then link to it instead of repeating it. Restricted factory
content never moves to the workshop wiki on its own.

**How it is read.** The director and research steps read the factory wiki first and the workshop wiki second; a gate
brief labels each citation with the wiki it came from.

## 8. The three operations, as KILN steps

Each operation runs as an ordinary KILN **step**: a durable conversation, recorded and resumable like any other
(`pi-durable.md` §6). Factory-wiki steps run on the factory's lane; workshop-wiki steps on workshop capacity (§7).

### 8.1 Ingest

1. Someone who may add sources puts a source in `raw/` and starts an ingest — optionally with what to focus on.
2. The **wiki keeper** reads it and the index, and **discusses the takeaways** with that person, as Karpathy does: what
   is new, what it changes, what it contradicts. The person can steer — "emphasise the residency angle", "this part is
   out of date".
3. The keeper writes the source summary, updates every page it touches, creates new pages, updates the index, and
   **commits** — one commit per ingest, so it can be reverted as a whole. A crash mid-ingest resumes; a half-done
   ingest is never committed.
4. The result is shown as an **ingest summary**: the takeaways, every page changed with its diff, the new pages, and
   any **contradictions** the keeper resolved or left open. From there anyone who may edit can adjust a page, ask the
   keeper for a change, or revert the whole ingest.

Karpathy prefers one source at a time with the person closely involved; KILN makes that the default, and allows batch
ingests, each producing its own commit and summary.

### 8.2 Query

Anyone who may read a wiki can ask it a question. The keeper reads the index, then the relevant pages, and answers
with citations to pages — which cite their sources. If the answer is worth keeping, the person who asked can **file it
back** as a page, if they may edit that wiki (Curators for a factory wiki, anyone for the workshop wiki).

The **director queries the wikis** whenever it proposes or amends a roadmap, and research and concept steps start from
them; their citations appear in the gate brief (§10).

### 8.3 Lint

A **lint pass** checks a wiki's health: contradictions between pages, claims superseded by newer sources, orphan pages,
concepts mentioned but missing a page, missing cross-references, stale pages past their review date, pages resting
only on factory-produced sources, knowledge repeated across factories (§7), gaps a new source could fill — and vault
conformance (§6). Lint produces **findings**; the people who keep the wiki decide what to fix, dismiss or source.

**A KILN-specific choice:** lint runs on the **strongest model** and, where policy allows, a different model family
from the keeper. With no approval step on ingests, lint is the independent check — the keeper never grades its own
pages.

### 8.4 Record digests

A factory produces knowledge as it works. When each gate settles — and at the **Merge gate** in full — KILN writes an
**implementation digest** of what the record shows: what was built, which designs were rejected and why, what judges
found, what verification revealed, which assumptions changed. Digests are added to `raw/record/` **automatically**,
labelled as **produced by the factory**, so the wiki always distinguishes knowledge from outside from knowledge the
factory produced about itself. As everywhere in Karpathy's pattern there is no approval step; a Curator can revert a
digest like any change. Digests feed implementation knowledge (§9).

## 9. Implementation knowledge: how the code was built

A factory does not only *use* its wiki; as it implements the roadmap, it **writes into it**. Every feature leaves
behind the knowledge a person needs to explore and understand what was built and how it was generated: what was
learned along the way, how the result is structured, why the code is the way it is, and how to work with it. This
turns the factory's record — every gate, finding, round and steer — and its code into readable, linked, explorable
pages, so that code written by agents never becomes code nobody understands.

### 9.1 What gets written

The page types follow the familiar split between explanation, how-to and reference, plus two that are specific to a
factory:

| Page type | Answers | Written | Grounded in |
|---|---|---|---|
| **Feature story** — *"r10 — How it was built"* | How did this feature come to be? | opened at the Concept or Specification gate, extended at every gate, completed at the Merge gate | the record: every gate decision and who made it, rejected alternatives, judge findings, fix rounds, restarts, steering, tool approvals |
| **Technical overview** | What was built, and how do its parts fit together? | after the Architecture gate (intended structure), revised after Code review (actual structure) | the approved design, the diff, the code at a commit |
| **Explainer** | Why is the code the way it is? | after Code review and Verification, for each significant decision in the code | code excerpts at a commit, the judge findings and human notes that shaped them |
| **How-to guide** | How do I use, extend or operate this? | after Verification, when the behaviour is proven | the code, the tests that prove each step, the specification |
| **Reference** | What exactly are the interfaces, settings and files? | at the Merge gate | the code at the merge commit |
| **Learning** | What did the factory learn that it did not know before? | **as it happens** — when a judge finds something unexpected, a fix round fails, a step is restarted, a model misbehaves, an assumption proves wrong | the event that revealed it |

Learnings that hold beyond one factory are proposed for the workshop wiki (§7), so lessons from one factory reach
every other.

### 9.2 Written as the factory works

Implementation knowledge is written **continuously, not at the end**:

- the **record of each gate** becomes a source automatically — an *implementation digest*, labelled as factory-produced,
  added to `raw/record/` the moment the gate settles. Following Karpathy's pattern there is no approval step; Curators
  can revert any of it;
- the **wiki keeper ingests each digest** on the factory's lane, at low priority, typically while the factory waits on
  a human — so a feature's pages grow gate by gate while the feature is still being built, and are complete when it
  merges;
- pages about a feature that is still in progress are marked **in progress**, with the gate the feature has reached;
- the **Merge gate brief** shows what the feature added to the wiki, and the feature story is the first thing linked
  from it.

The Documentation gate remains about the **product's** documentation, shipped with the code. Implementation knowledge
is the **factory's** knowledge about how that code was made: it is not gated, and it never decides anything.

### 9.3 Grounded in the code, at a commit

Every claim about code points at code — exactly, and at a known version:

- pages cite code as **excerpts with their path, lines and commit** (`src/lane.ts` lines 86–90 at `7c2e9a1`), reproduced
  in the page so they read correctly even after the code moves on;
- front-matter lists the code a page covers (`code: ["src/lane.ts@7c2e9a1", "src/tiers.ts@7c2e9a1"]`), so the wiki can be
  explored **from the code** — every file and module links to the pages that explain it;
- diagrams are written as Mermaid blocks with a sentence that says the same thing, so they read in any editor (§6);
- the record is cited by event — *"finding 1 at the Code review gate, round 2"* — so a page can be traced back to the
  moment it describes.

### 9.4 Kept true as the code changes

Code written today is changed tomorrow. Lint (§8.3) gains two code-aware checks:

- **Drift** — a page cites code that has changed since the cited commit. The page is flagged *drifted*, with the diff
  that caused it; a gate brief that cites it shows the flag. The keeper refreshes it on the next pass, or a person
  does.
- **Code-grounded claims** — explainers and how-tos are checked against the code they cite, by the strongest model from
  another family: a statement the code does not support is a finding, like a contradiction between pages.

### 9.5 How people explore it

| Way in | What it offers |
|---|---|
| **By feature** | the feature story, then its overview, explainers, how-tos, reference and learnings |
| **By code** | pick a file or module; see every page that explains it, and when each was last true |
| **By question** | ask the wiki (§8.2) — *"why does the lane throw instead of waiting?"* — and get an answer that cites explainers, code and the record |
| **By learning** | the stream of what the factory — and every factory — learned, newest first |
| **From a gate** | a gate brief links the pages its feature has produced so far |
| **Outside KILN** | the same pages in Obsidian or Zed (§6), with code excerpts and diagrams readable as plain markdown |

### 9.6 Honest by construction

Implementation pages describe **what happened**, not what should have: the alternatives that were rejected, the
findings that forced a restart, the fix rounds that failed, the steer a person gave, the model that wrote each part.
They are written from the record, so they cannot quietly improve the story — and they carry the same labels as any
factory-produced knowledge, so lint can tell them apart from knowledge that came from outside.

## 10. How the wikis are used

| Where | How |
|---|---|
| **The director, at the Roadmap gate** | proposals cite the factory and workshop wikis: constraints, past incidents, dependencies, customer commitments, prior decisions |
| **Engineers exploring the code** | read feature stories, overviews, explainers and how-tos; start from a file and find every page that explains it (§9.5) |
| **Research and concept steps** | start from the wikis' indexes and relevant pages instead of re-reading every document |
| **The gate brief** | a **"Context from the wiki"** entry in *The yardstick* and *Risks and open issues*, with citations labelled by wiki — and an explicit note when a cited page is stale, contradicted, or changed since the gate opened |
| **Deciders** | ask the wikis questions while deciding; the gate keeps waiting |
| **Curators** | keep the factory wiki: sources, ingests, edits, lint, filed answers, schema |
| **Everyone** | reads, asks, and improves the workshop wiki |
| **New team members** | read the overviews and indexes to learn the workshop and its factories |

The wiki is **context, never authority**: a cited page is evidence for the human, presented like a judge's finding —
attributed, traceable, and open to doubt.

## 11. How it fits KILN's rules

| KILN rule | For the wikis |
|---|---|
| **Experience charter** | the charter is a committed artifact, not a wiki page: pages may cite it and never override it; the keeper links feature stories to the journeys and screens they served (`experience-charter.md` §9) |
| **Humans decide; models work** | the keeper writes; people choose sources, edit and revert; Deciders decide at gates. No wiki content settles a gate |
| **No model approves its own work** | nothing is approved in a wiki — it is context. The keeper's pages are checked by lint on another model, and every page is open to correction by people |
| **One lane per factory** | factory-wiki steps run on the factory's lane at lower priority than feature work, typically while the factory waits on a human; workshop-wiki steps use spare workshop capacity. Neither interrupts a feature step or holds a judge's lane |
| **Affinity** | wiki steps are scheduled by model like any other step; batching ingests avoids swaps |
| **Durable** | every operation is a durable step; a crash mid-ingest resumes, and no half-ingest is ever committed |
| **Readable without KILN** | every wiki is an Obsidian vault with wikilinks and plain-markdown pages, readable in Obsidian, Zed or any editor; conformance is linted (§6) |
| **Everything recorded** | `wiki.ingest_started`, `wiki.ingest_completed`, `wiki.page_edited`, `wiki.reverted`, `wiki.query_answered`, `wiki.answer_filed`, `wiki.lint_finding`, `wiki.finding_resolved`, `wiki.schema_changed`, `wiki.digest_proposed`, `wiki.conformance_failed`, `wiki.workshop_updated`, `wiki.digest_added`, `wiki.page_drifted`, `wiki.learning_recorded` — in the factory's or the workshop's ordered stream; `log.md` is projected from them |
| **Local by default** | sources and wikis stay on the machine; a keeper on a cloud model is subject to egress policy like any other role; clipping web pages is a network tool, allowed only by policy |
| **Several factories** | one wiki per factory, isolated like its store, plus one workshop wiki included read-only in every factory vault |

## 12. Risks and safeguards

Following Karpathy means no approval step, so the safeguards move from *before* a change to *around* it:

- **A bad ingest.** *Safeguards:* the person who started it is in the conversation; every ingest is one commit with a
  summary of what changed; anyone who may edit can adjust or revert it; lint checks it on another model.
- **Echo chamber.** Agents reading what agents wrote can harden mistakes into "facts". *Safeguards:* every page cites
  raw sources; factory-produced sources are labelled; lint flags pages resting only on them.
- **Explanations that drift from the code.** *Safeguards:* code is cited at a commit; lint flags drift and checks
  claims against the cited code (§9.4); a drifted page is marked wherever it is cited.
- **A flattering story.** *Safeguard:* implementation pages are written from the record — rejected designs, failed
  rounds and restarts included (§9.6).
- **Stale context steering a roadmap.** *Safeguards:* pages carry a reviewed date; lint flags stale pages; a gate brief
  marks a cited page that is stale or changed while the gate was open.
- **An open workshop wiki.** Anyone can edit it. *Safeguards:* every edit has an author and can be reverted; lint runs
  on every change; workshop pages are context only, labelled as such in every brief.
- **Sensitive material.** *Safeguards:* each factory wiki inherits its factory's people and policy; front-matter can
  mark a source or page as restricted; restricted content never leaves the machine, never appears in exports, and never
  moves to the workshop wiki on its own.
- **Lock-in.** *Safeguard:* the vault contract (§6), checked on every lint pass.
- **Scale.** Index-first navigation works at moderate scale (around a hundred sources, hundreds of pages); beyond that, a
  local search tool over the wiki becomes useful — and must run on the machine.
- **Cost of attention.** *Safeguard:* insights show which pages the director and gate briefs actually cite.

## 13. What changes elsewhere

- **`vision.md`** — the wiki pillar covers factory and workshop wikis; *curate the knowledge* in the human's role;
  Curators in the audience; a horizon.
- **`web-front-door.md`** — §14 summarises the wikis; the event catalog, constitution impact, open questions and
  roadmap sketch gain wiki entries.
- **`user-experience.md`** — the **Curator** persona; *Wiki*, *Workshop wiki*, *Source* and *Curator* in the mental
  model; core experiences for keeping and asking the wikis; the gate brief's *Context from the wiki*; the decision log.
- **`pi-durable.md`** — the mapping gains wiki steps, ingest summaries, the workshop wiki and the `log.md` projection.
- **Mockups** — 22 (factory wiki home), 23 (ingest summary), 24 (lint findings), 25 (asking the wiki), 26 (the same
  wiki in Obsidian and Zed), 27 (the workshop wiki), 28 (a feature's story and knowledge), 29 (an explainer grounded in
  code), 30 (a how-to and exploring by code), 31 (learnings and drift); 03 and 20 gain wiki context and the Curator role.
- **Constitution** — a MINOR addition is proposed: *knowledge is context, never authority* — every wiki claim traceable
  to a source; no wiki content settles a gate.

## 14. Open questions

1. ~~Dedicated keeper role or the researcher?~~ **Decided 2026-10-21** (human@batorfi): a **dedicated keeper role** (`kind: keeper`, its own role
   file and tier binding, tools limited to the vault); lint runs on a different model than the keeper.
2. ~~How long may a page go unreviewed?~~ **Decided 2026-10-21** (human@batorfi): a brief flags a cited page whose `reviewed` date is older than
   **90 days** (factory-configurable) — and always, regardless of age, when its cited code drifted, it is contradicted, or
   it changed while the gate was open.
3. ~~How often is a factory's copy of the workshop wiki updated?~~ **Decided 2026-10-21** (human@batorfi): **pinned per feature** — each feature reads
   the workshop wiki as of its admission at the Roadmap gate, so its briefs are reproducible; a brief notes when a cited
   workshop page has a newer version; the copy updates between features.
4. ~~How much code do implementation pages reproduce?~~ **Decided 2026-10-21** (human@batorfi): **short excerpts** (about 15 lines) with path, lines
   and commit; pages explain and point. **Reference pages** (APIs, config keys, CLI commands) are **generated
   deterministically from the code** on merge, not written by the keeper.
5. Should a mature wiki, as Karpathy suggests, become training data for a smaller local model that knows the factory?

## 15. One sentence

Every KILN factory keeps a wiki the LLM writes and Curators shape, on top of a workshop wiki everyone can improve — a
compounding, traceable memory, readable in any editor, that explains how every feature was built and gives every
roadmap and every gate the context of everything the workshop has learned, while leaving every decision to a human.
