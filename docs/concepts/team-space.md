> Status: concept — **final** (2026-10-21, human@batorfi; previously a proposal, rev 2, 2026-10-17). Open decisions were
> settled on 2026-10-21 and are recorded where they apply; what remains open is listed in
> [`open-decisions.md`](./open-decisions.md). Building it is admitted only at the Roadmap gate.
> Type: concept
>
> Scope note: this doc describes how **a team works on the same codebase while each person runs their own workshop
> and factories**, collaborating in a **team space**. It is a concept, not a design or a spec.
>
> Decisions taken by the human (2026-10-17):
>   1. The shared space is called the **team space**.
>   2. It is **a git repository first**; a service may come later.
>   3. The team roadmap is decided by a **quorum** of the team's named deciders.
>   4. Claims are **advisory by default**; exclusive only on paths the team protects.
>   5. Required reviews live **in both** KILN's Merge gate and the code host's pull requests, mirrored.
>   6. Knowledge of merged features is published to team knowledge **by the author's choice**.
>   7. The default publishing level is **coordination**.
>   8. Merge order uses **the code host's merge queue when the team has one**, mirrored in KILN; otherwise a suggestion.
>   9. A **shared workshop can join** a team space as one member; every act in it is signed by a person.
>  10. Identity uses **both** personal signing keys and the team's identity provider.

> Decided by the human (2026-10-21), when the team space joined `kiln-v1`:
>  11. The default **quorum** is a **majority** of the named roadmap deciders (a team may set any threshold at or above
>      majority); a proposal that never reaches it never takes effect and is marked expired after 14 days.
>  12. Team rules, the decider list and the threshold change **only by the current quorum**; the founder's first list is
>      the team space's genesis act.
>  13. Claims are **renewed by activity**; advisory claims are stale after 3 quiet days and expire after 7; exclusive claims
>      expire after 48 hours. Expiry releases the claim only.
>  14. **Coordination is a floor** for team-roadmap features, not just a default; anything richer is published per item
>      by the author's choice; no further publishing levels in `kiln-v1`.
>
> Companion docs:
>   - Factories anywhere (a shared workshop, hosts): `factories-anywhere.md`
>   - Knowledge:                                    `factory-wiki.md`
>   - The PRD:                                       `../prd/kiln-prd.md`
>   - The user experience:                           `user-experience.md` (and `mockups/36`–`39`)

# KILN — the team space: individual workshops, one shared space

## 1. In one paragraph

Each engineer runs **their own workshop**: their own factories, their own gates, their own models and machines, their
own pace — sovereign, local-first, exactly as KILN works for one person. The team shares three things: **the
codebase** (one git repository), **a team roadmap**, and **a team space** — a shared space where workshops publish what
they are building, claim the work they take on, share knowledge, ask each other for decisions, and see each other's
progress. The team space coordinates; it never decides. No one's gate can be moved from outside their workshop, and
nothing is published without its owner's policy allowing it.

## 2. Why — and how this differs from a shared workshop

`factories-anywhere.md` already lets a team share **one workshop**: one front door, one set of policies, factories on
shared hosts, people with roles. That suits a team that wants one place and one set of rules.

Many teams work differently. Each engineer wants their own environment — their own local models, their own
experiments, their own gates — while still building **one product** together. They need:

- to **know who is building what**, so two factories do not build the same thing or fight over the same files;
- a **shared roadmap** that individual factories pick work from;
- to **share what they learn** — and how each feature was built — with everyone working on the code;
- to **involve a teammate** in a decision — a second opinion at a gate, a required review before merging to `main`;
- to **merge safely** into the same `main` without surprises.

Both topologies are supported and can be mixed: a team team space whose members include some individual workshops and
some shared ones.

## 3. Principles

| | Principle | Meaning |
|---|---|---|
| **C1** | **Sovereign workshops** | each workshop's gates are decided by its own deciders; the team space and other workshops can *ask*, never *move* |
| **C2** | **The team space coordinates, never decides** | claims, overlaps, requests and digests are information; no team space event settles a gate |
| **C3** | **Publish by choice** | a workshop shares only what its policy allows; restricted content never reaches the team space |
| **C4** | **Explicit hand-offs** | every cross-workshop act — a claim, a request for a decision, a hand-over — is explicit, signed by a person, and recorded on both sides |
| **C5** | **The code is the integration point** | workshops converge on `main` through the Merge gate and the team's merge rules; everything else is advisory |
| **C6** | **Local-first still** | a workshop works fully offline; the team space can be nothing more than a git repository; nothing about it requires a server |

## 4. The shape

```
                    ┌──────────────────────── The team space ────────────────────────┐
                    │  team roadmap · claims · team knowledge · published digests │
                    │  decision requests · team rules · members & keys            │
                    └────────▲───────────────────▲───────────────────▲────────────┘
                     publish │ subscribe  publish│subscribe   publish│subscribe
             ┌───────────────┴──────┐  ┌─────────┴────────────┐  ┌───┴──────────────────┐
             │ Zsolt's workshop     │  │ Anna's workshop      │  │ Bence's workshop     │
             │  factory: kiln-v1    │  │  factory: kiln-ui    │  │  factory: kiln-host  │
             │  own gates · models  │  │  own gates · models  │  │  own gates · models  │
             └──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘
                        └──────── branches · pull requests ─────────────────┘
                                          ▼
                              The codebase (one git repository, main)
```

| Layer | Owns | Shared? |
|---|---|---|
| **Codebase** | the code, `main`, branches, pull requests | yes — the team's repository |
| **Team space** | the team roadmap, claims, team knowledge, published digests, decision requests, team rules, members | yes — read by all members, written under each member's signature |
| **Workshop** | its factories, gates, record, factory knowledge, models, hosts, policies | no — sovereign; shares only by publishing |

## 5. The team space

**What it holds:**

| Content | Purpose |
|---|---|
| **Team roadmap** | the team's program: features, order, dependencies, owners — what factories pick work from (§6) |
| **Claims** | *"this feature is being built by Anna's factory kiln-ui, touching `web/`"* — who is building what (§7) |
| **Team knowledge** | a shared wiki vault — conventions, architecture, models, lessons — open to every member (§10) |
| **Published digests** | each workshop's chosen record of progress: gates passed, feature stories, learnings (§9) |
| **Decision requests** | a workshop asking a teammate for a decision or an opinion (§8) |
| **Team rules** | merge rules for `main`, policy floors (for example *no source code to cloud models*), shared role instructions (§11) |
| **Members** | who belongs, their public keys, their workshops, and who may change the team roadmap and rules |

**What it is made of.** The simplest team space is **a git repository** — `kiln-team-space` — with plain files: the team
roadmap as markdown with a structured head, claims as small signed files, the team knowledge as an Obsidian vault,
digests as markdown, requests and responses as signed files. Every write is a **signed commit** by a member. That gives
offline work, history, review and conflict handling for free, and needs no server — in keeping with KILN's local-first
promise. A team space **service** can sit in front of the same repository later, for live presence and faster updates;
it adds speed, never authority. **Decided:** a git repository first.

**How workshops use it.** Each workshop **subscribes** — pulls the team space, verifies signatures, and turns what it finds
into events in its own record (`team space.claim_seen`, `team space.request_received`, …). Each workshop **publishes** —
writes signed files and pushes. Every publish and every pull is recorded on the workshop's side.

## 6. The team roadmap

- **One program for the team.** The team roadmap lists features with their order, dependencies, owners and status. It is
  changed by the people the team names for it, through its own human decision — the **team Roadmap gate** — recorded in
  the team space with signatures. **Decided:** a **quorum** — the team names its roadmap deciders and how many of them
  must sign; by default a **majority** (2 of 3, 3 of 5; a one-decider team is 1), and never fewer. A change takes effect
  when the quorum of signatures is present in the repository; a proposal that never reaches it changes nothing and is
  marked expired after 14 days. Missing signatures are never counted as agreement.
- **Factories adopt features.** A workshop's own Roadmap gate shows the team roadmap beside its factory's roadmap. Adopting
  a team feature into a factory's roadmap **creates a claim** (§7). A factory can also carry private features the team
  roadmap does not list.
- **Status flows back.** As the adopted feature passes gates, the workshop publishes its progress (as its policy allows),
  so the team roadmap shows *at Code review in Anna's kiln-ui* without anyone updating it by hand.
- **The director sees the team.** When it proposes a factory roadmap, the director reads the team roadmap, existing
  claims and team knowledge, and says which features are free, claimed, or depend on someone else's work.

## 7. Claims: knowing who builds what

A **claim** says which feature a factory is building and which parts of the code it expects to touch.

- **Made at the Roadmap gate** when a feature is adopted; **refined at the Work plan gate**, when the plan names the
  files and modules it will change; **released** at merge or when the feature stops.
- **Signed and visible** to the whole team; **renewed automatically by activity** — every publish from its workshop (a step, a gate,
  a pull) renews it, so a factory waiting on its own person still holds its claims while its workshop is online. An
  advisory claim shows as **stale after 3 quiet days** and **expires after 7**; the team may change these by quorum.
  Expiry releases the claim and nothing else — it never touches the work or any gate — so abandoned claims do not block
  anyone.
- **Advisory by default.** A claim never stops another workshop from working; it makes overlap visible early.
- **Exclusive only on protected paths.** The team rules (§11) may name protected paths — shared contracts, schemas, a public
  API. A claim on a protected path is exclusive: another factory whose work plan touches it is told *blocked by Anna's
  claim — ask or wait* at its Roadmap or Work plan gate. Exclusive claims expire after **48 hours** without renewal. If two workshops
  take the same exclusive claim while offline, the one that reached the team space first holds it, and the other is told at
  its next gate.
- **Overlap detection** — across workshops, from claims, work plans and published diffs: *Anna's kiln-ui and Zsolt's
  kiln-v1 both plan to change `src/lane.ts`*. Overlap appears in both workshops' gate briefs (Work plan, Implementation,
  Merge) and in the team space, with the people to talk to. Resolving it is a human conversation; KILN only makes it
  impossible to miss.
- **Hand-over.** A claim can be handed to another member's factory, explicitly, with a note — the feature's published
  story travels with it.

## 8. Asking a teammate: decisions across workshops

Gates belong to their workshop (C1). Collaboration happens by **asking**, in three forms:

| Form | What happens | Settles a gate? |
|---|---|---|
| **Opinion** | a workshop sends a gate's brief (as its policy allows) to a teammate and asks for their view; the answer appears in the brief as attributed evidence | no |
| **Required review** | the team's merge rules require, for example, *one teammate's approval before merging to `main`*; the Merge gate brief shows the requirement and who can satisfy it; the teammate's signed approval arrives through the team space and is recorded in both workshops | it satisfies a **condition** of the gate; the owner's own move still settles it |
| **Delegated decider** | a workshop names a teammate as a decider for a specific gate or feature — for example while on holiday — explicitly, time-bounded, recorded | yes, by that named person only, under the owner's grant |

A teammate's response is a **signed act by a person**, verified by the receiving workshop, never a message from the
team space itself. A request can always be declined or left unanswered; an unanswered request never approves anything.

**Decided: both, mirrored.** A required review is a condition of the Merge gate in KILN *and* a review on the code
host's pull request. A teammate's signed approval in KILN is posted to the pull request; an approval given on the pull
request is shown in the Merge gate brief with who gave it. The code host enforces its branch protection; KILN shows and
records.

## 9. Publishing progress and provenance

Each workshop's record stays in the workshop. What it shares is **chosen and summarised**:

- **Gate outcomes** for adopted features — *passed Code review, approved by Anna, round 2* — no content.
- **Feature stories** and **implementation knowledge** for features merged to the shared `main` (§10) — so everyone working
  on the code can read how it was built.
- **Learnings** worth sharing.
- **Provenance with every pull request**: a signed summary of the feature's gates, deciders, judges and models, linked from
  the pull request, so a reviewer anywhere can see how the change came to be.

**Coordination is the floor** (decided; a floor since 2026-10-21). For every team-roadmap feature a workshop publishes at
least its claims, their release, gate outcomes (which gate, passed or sent back, by whom — no content), and provenance for
pull requests to the shared `main`; it cannot publish less. Anything richer — feature stories, learnings, summaries of
judges' findings — is published **per item, by the author's choice**. There are no further publishing levels in `kiln-v1`.
Private features — not on the team roadmap — publish nothing.

Publishing follows the workshop's policy: what may be published, at what level of detail, and what never leaves (restricted
features, code excerpts, transcripts — the latter never). Every publish is an event in the workshop's record.

## 10. Knowledge across the team

The knowledge model gains a team tier:

| Tier | Holds | Who edits | Where |
|---|---|---|---|
| **Factory knowledge** | how this factory's features were built, its sources and learnings | the factory's Curators | in the workshop |
| **Workshop knowledge** | a person's own notes, experiments, model observations | the workshop's owner | in the workshop |
| **Team knowledge** | architecture, conventions, shared services, models, lessons that hold for the team, and the stories of features merged to `main` | every member | in the team space |

- **Promotion is explicit.** A learning, a page or a feature story moves from a factory to the team knowledge by a member's
  choice (lint can suggest it, as it already does from factory to workshop knowledge).
- **Merged code brings its story.** When a feature merges to the shared `main`, its feature story and implementation pages
  are offered for team knowledge, and published **by the author's choice** (decided) — the Merge gate brief offers it,
  defaulting to *not yet*.
- **Everyone's factories read it.** Team knowledge is included read-only in every member's factory vaults (as `team/`), so
  pages link to it with ordinary wikilinks, in KILN, Obsidian and Zed.
- **One vault contract.** Team knowledge is a git repository and an Obsidian vault like every other (`factory-wiki.md` §6).

## 11. Team rules: a floor, not a ceiling

The team can set rules every member workshop honours for work on the shared codebase:

- **Merge rules** for `main` — required reviews, required checks, linked provenance.
- **Policy floors** — for example *source code never to cloud models*, *judges on the strongest model*, *local-only for
  the payments module*. A workshop can be **stricter**, never looser, for features of the shared codebase.
- **Shared role instructions and tier expectations** — the team's `agents/*.md`, so judges apply the same standards in
  every workshop.
- **Protected paths**, where claims are exclusive (§7).
- **Required gates and shared flows** — gates every member workshop's flows include for matching features, and flows the
  team shares; changed by the quorum (`extensible-flow.md` §8).
- **Claim expiry** and **publishing minimums** (for example, gate outcomes for adopted features are always published).

Rules live in the team space and are recorded. They — and the list of roadmap deciders and the quorum threshold — change
**only with the current quorum's signatures**; the founder's first list of deciders is the team space's genesis act. A workshop that would break a floor is
told so at the Roadmap gate, before any work starts.

## 12. Merging into the same `main`

The Merge gate is where workshops meet the shared code:

- **Base drift** — before merging, the factory rebases on the latest `main`; if teammates merged changes to overlapping
  code since the feature's restorable starting point, the brief says so, and the factory can re-run Verification on the new
  base before asking for the merge.
- **Required reviews and checks** from the team's merge rules appear as conditions in the Merge gate brief (§8).
- **Merge order** — when several workshops are ready to merge overlapping work, the team space shows a suggested order (by
  dependency and readiness). **Decided:** when the team's code host has a merge queue, KILN uses it — the Merge gate
  brief mirrors the queue position and re-verification on the new base; without one, the order is only a suggestion.
  KILN does not build a queue of its own.
- **After merge** — the claim is released, the provenance and feature story are published, and every workshop's next
  Roadmap gate sees the change.

## 13. Shared machines

Members may share hosts — a team GPU server — while keeping their workshops separate:

- a host can **offer capacity to several member workshops**, each with its own leases and factories, under the host's fair
  share (this answers an open question in `factories-anywhere.md`);
- a host's owner decides which workshops may use it; every placement is still each workshop's own decision;
- isolation holds: a host keeps each workshop's stores, workspaces and secrets apart.

## 13a. Research and spikes in a team

With the bench (`the-bench.md`), members can share **research claims** — a lightweight, advisory *who is researching what*
— so two people do not spend a day on the same comparison; share a note, research result or spike report to the team
space by choice; and hand a spike to a teammate to continue, explicitly. A member's private notebook is never exposed.

## 14. Identity and mixed teams

- **Every act is signed by a person.** Claims, publications, requests, responses, delegations and team-roadmap votes are
  signed by the member who made them — never by a workshop or by the team space.
- **Both keys and the identity provider** (decided). Each member signs with a **personal key** kept on their own machine, so
  signing works offline; the team's public keys live in the team space. Where the team has an identity provider, each key
  is **registered by logging in** through it, and removing someone there **revokes their key** in the team space. A team
  without an identity provider works with keys alone.
- **Shared workshops can join** (decided). A shared workshop (`factories-anywhere.md`) joins as one member workshop; its
  people keep their roles inside it, and every act it publishes is signed by the person who acted. Teams can start with one
  shared workshop and split into personal ones later, or the reverse.

## 15. How it fits KILN's rules

| KILN rule | In a team team space |
|---|---|
| **A human decides every gate** | unchanged — and only the owning workshop's deciders, or a person it explicitly names (§8) |
| **No silent approval** | an unanswered request, an expired claim, a team space update, a lost connection — none approves anything |
| **No model approves its own work** | unchanged; a teammate's opinion is a person's evidence, never a model's verdict |
| **Everything recorded** | every publish, pull, request, response and claim is an event in the workshop's record; the team space keeps its own signed history |
| **Local by default** | a workshop works fully without the team space; joining one is a recorded choice; publishing follows policy |
| **Knowledge is context** | team knowledge informs; it never decides |
| **A factory is portable** | claims and publications follow a factory when it moves between hosts |

## 16. What changes elsewhere

- **`vision.md`** — teams as first-class: individual workshops, one team space; a pillar and a horizon.
- **`web-front-door.md`** — a *Team* section; team space events; team rules in policy; merge-gate conditions; security for
  signatures and member keys.
- **`user-experience.md`** — the team space in the mental model; experiences for adopting a team feature, seeing overlap,
  asking a teammate, answering a request, publishing, merging with base drift; team context in gate briefs.
- **`factory-wiki.md`** — the team knowledge tier and promotion rules.
- **`factories-anywhere.md`** — hosts shared across member workshops.
- **PRD** — a `TEAM-` requirement area and a milestone after the workshop and knowledge milestones.
- **Mockups** — 36 (the team space), 37 (adopting a team feature: a claim, an overlap and a protected path), 38 (a
  teammate's required review), 39 (a Merge gate with team conditions, base drift and the code host's queue).

## 17. One sentence

Each engineer keeps a sovereign workshop — their own factories, gates and models — while the team shares one codebase and
a team space where work is claimed, knowledge is shared, teammates are asked for decisions, and everyone sees what everyone
is building, without anyone being able to decide a gate from outside the workshop that owns it.
