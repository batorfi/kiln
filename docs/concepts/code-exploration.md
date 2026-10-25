> Status: concept — **on the admitted roadmap** (2026-10-22): the minimal explore space is row **r43** in `kiln-v1`; as-is
> specifications, tours and archaeology, readiness and legacy languages are rows **r46–r49** in `kiln-v1.x` (PRD §6.21,
> M17). The roadmap was admitted at the Roadmap gate on 2026-10-22. Open questions answered with this doc's defaults (§15). It extends
> `brownfield.md`, which stays the reference for bringing a factory into an existing codebase.
> Type: concept
>
> Scope note: this doc explores how KILN can help software engineers **explore and understand existing and legacy
> codebases before KILN changes anything about how they work** — and how that exploration becomes the on-ramp for teams
> that have no spec-driven development practice yet but want to move, step by step, to an AI-factory way of working.
>
> Companion docs:
>   - Existing codebases:   `brownfield.md` (profile, full scan, baseline, adoption stages, territory)
>   - Knowledge:            `factory-wiki.md` (code-grounded pages, drift, Curators, interviews)
>   - The bench:            `the-bench.md` (research steps, spikes, candidates — ungated by design)
>   - Teams:                `team-space.md` · First run: `first-run.md`
>   - The model landscape:  `model-landscape.md` · Dev machines: `dev-machines.md`
>   - The rules:            `../../.specify/memory/constitution.md` (VIII, X, XII) · PRD principle P13 (ungated means ungated)

# KILN — explore first: understanding existing codebases before the factory

## 1. In one paragraph

Most teams that could use KILN do not start with a clean repository or a spec-driven habit. They start with a large,
old, partly understood codebase, knowledge that lives in a few people's heads, and no specifications at all. Asking them
to adopt ten gates on day one is asking for a leap. **Explore first** turns that leap into a staircase: KILN arrives as a
**guide** before it arrives as a factory — reading the code and its history, building a knowledge base the whole team can
use, answering questions with citations, drawing maps, recovering the rules and decisions buried in the code, and
**drafting the specifications of what the system already does**. All of it is local, changes nothing in the repository,
and is useful even if the team never adopts the factory. And every step leaves the team a little more spec-driven than
before — so that when the first feature walks through KILN's gates, the team already speaks the language and trusts the
machine.

## 2. The adoption problem this solves

| What blocks adoption | Why exploration helps |
|---|---|
| **"We don't understand our own code well enough to specify it."** | KILN builds the understanding first: a grounded knowledge base, maps, tours and answers with citations. |
| **"We have never written specifications."** | KILN drafts **as-is specifications** of existing behaviour for people to review — learning spec-driven development on code they know, with nothing at stake. |
| **"We can't trust an AI with our legacy system."** | Exploration is read-only and local; its claims cite the code and are labelled *measured* or *inferred*; people correct it and their corrections win. Trust is earned on understanding before it is asked for on changes. |
| **"Our experts are a bottleneck."** | Expert time goes into curating and answering the questions KILN could not infer — once, recorded — instead of repeated explanations. |
| **"We can't send this code to a cloud service."** | Local by default (Principle VIII): exploration runs on the team's own machines and models. |
| **"We need a business case before changing our process."** | A **readiness report** gives evidence: test health, knowledge and spec coverage, candidate territories, the first sensible features. |

Developers already spend a large share of their time understanding code rather than writing it — one widely cited study
put it near 58%. Agentic coding makes the problem sharper, not smaller: code nobody fully read is still code someone has to
understand. A tool that makes understanding cheap is valuable on its own; one that turns understanding into
specifications is the bridge into a factory.

## 3. What KILN's design already has — and what is missing

**Already designed** (`brownfield.md`, `factory-wiki.md`, `the-bench.md`):

- a **codebase profile** in minutes; a **full scan** in seven passes into the knowledge base, every claim cited at a commit
  and labelled measured or inferred; a **scan report** honest about coverage;
- a **baseline** of failing and flaky tests; **interviews** — questions for Curators about what could not be inferred;
- **code-grounded pages** that flag drift; incremental **re-scans**; a **code map** for large codebases;
- the **Observe** stage — scan, profile and baseline, no file changed — followed by Rehearse, Contribute and Own;
- research steps and spikes on the **bench**, feeding a **candidate list**.

**Missing**, and the subject of this doc:

1. **Exploration without a factory.** Today the scan belongs to a factory, which presumes a decision to adopt. Explore
   needs to work *before* that decision, with no roadmap, no gates and no change to how the team works.
2. **Interactive exploration for engineers.** Asking, tracing, mapping and touring — the daily experience of an engineer
   learning a codebase — not only a generated knowledge base.
3. **A bridge to spec-driven development.** Recovering **as-is specifications**, constitutions and decisions from the code,
   so a team learns SDD on its own system.
4. **A transformation path for a team.** Stages with evidence from "we just want to understand it" to "a factory owns this
   area", and a readiness report that makes the case.
5. **Legacy specifics.** Old languages, no tests, irreproducible builds, history imported from older version control.

## 4. Principles

| | Principle | Meaning |
|---|---|---|
| **E1** | **Zero footprint** | exploring never writes to the team's repository, branches or CI; everything lives in KILN's own workspace and knowledge base |
| **E2** | **Grounded and labelled** | every claim cites code, history, a document or a person, and says whether it was *measured* or *inferred* (Principle X) |
| **E3** | **People curate** | generated drafts — pages, tours, specs — are improved and confirmed by people; confirmed content is labelled *from a person* and wins over inference |
| **E4** | **Maps before chat** | visual structure first, conversation second — research shows maps beat reading long answers for understanding |
| **E5** | **Local by default** | exploration runs on the team's machines and local models; nothing leaves without a recorded policy (Principle VIII) |
| **E6** | **Honest about gaps** | what was not read, not understood or only guessed is shown as plainly as what was |
| **E7** | **Everything is a candidate** | findings, recovered specs and suggested changes are candidates for people to decide on — never decisions (PRD P13) |
| **E8** | **Useful without KILN** | the knowledge base is a plain Obsidian vault and markdown; a team that stops using KILN keeps all of it |

## 5. Explore mode

### 5.1 The shape

```
kiln explore <repository>
        │
        ▼
 explore space (no factory, no roadmap, no gates)        the team's repository — read only
   ├── profile ── full scan ── baseline (optional)  ◄──── code · history · docs · CI config
   ├── knowledge base (Obsidian vault)                    nothing is written here
   ├── maps · tours · questions and answers
   ├── recovered: rules · decisions · as-is specifications
   └── readiness report ──► (later) a factory on the same knowledge base
```

An **explore space** is a lightweight sibling of a factory: it has a durable store, a record, a lane on the host's model
pool and a knowledge base — but **no roadmap and no gates**, because it never changes anything. When the team decides to
adopt the factory, the explore space's knowledge base, recovered specifications and baseline become the factory's starting
point; nothing is redone.

### 5.2 Capabilities

**Orientation**
- **Start here** — an overview a new engineer can read in fifteen minutes: what the system does, its main parts, how to
  build and run it, where to look first, what is known to be fragile.
- **Architecture map** — modules and their dependencies, entry points, external systems, data stores; zoomable from
  system to module to file.
- **Glossary** — the domain's terms as the code uses them, with where each is defined and used.

**Ask and trace**
- **Questions with citations** — *where is the discount decided?*, *what calls this endpoint?*, *why does this retry
  exist?* — answered from the knowledge base and the code, every claim linked to file, line and commit, labelled measured
  or inferred. Good answers can be **filed back** as knowledge pages.
- **Trace a path** — follow a request, a job or an event end to end: entry point, handlers, rules applied, data read and
  written, side effects, error paths.
- **Data lineage** — where a field comes from, what transforms it, where it ends up.

**Maps and signals**
- **Hot spots** — areas that change often and are complex: where defects and risk concentrate.
- **Change coupling** — files that change together without depending on each other: hidden dependencies.
- **Ownership** — per module, from code owners and history together; never per-person counts or rankings.
- **Test landscape** — what is tested, how well, what is failing or flaky (the baseline), what has no tests.
- **Dead-code and unused-interface candidates** — with the evidence and a clear "candidate, not verdict" label.
- **Dependencies, licences and known vulnerabilities** — from manifests and local advisory data.

**Archaeology**
- **Why it is like this** — a narrative per module from commits, pull requests and linked issues (where policy allows):
  when it appeared, the major changes, reverts, incidents.
- **Recovered decisions** — the architectural decisions the code implies but nobody wrote down, drafted as ADRs for a
  person to confirm, correct or reject.

**Tours**
- **Guided tours** — a sequence of stops through the code that explains one thing: *how an order is placed*, *how
  authentication works*, *what on-call needs to know*. KILN drafts them; **an expert reviews and annotates them**. One
  2026 study found expert-guided tours far more effective than AI-only ones (83% versus 57% on comprehension quizzes) —
  so KILN's job is to make the expert's review cheap, not to replace it.
- **Tours per role** — new joiner, on-call engineer, product owner, auditor.

**Sizing a change before committing to it**
- **What would it take** — for a change someone is considering (*add multi-currency*, *replace the payment provider*,
  *upgrade the framework*): which modules, interfaces, data and tests are involved, who owns them, what the risks are,
  what is unknown. The result is a **candidate** with evidence, ready for a roadmap later.
- **Experiments** — a throwaway spike in a scratch worktree (the bench) to measure instead of guess: *does the upgrade
  compile? which tests break?*

### 5.3 Where it is used

- **In the browser** — the front door's knowledge, maps, tours and a question box.
- **In the editor** — see `zed-integration.md` for the Zed surface (Agent Panel, MCP server, language server). The
  knowledge base is an Obsidian vault readable in Obsidian or Zed; tours and answers link to
  `file:line`.
- **In the terminal** — `kiln explore ask`, `kiln explore trace`, `kiln explore tour`.
- **Through other agents** — the knowledge base as context for the team's existing coding assistants (an MCP server is a
  natural extension), so exploration helps even where KILN's factory is not used.

## 6. From understanding to specification: the SDD bridge

This is where exploration stops being a documentation tool and becomes the road into a factory.

### 6.1 As-is specifications

KILN drafts **specifications of what the code does today**, module by module or capability by capability, in Spec Kit's
format:

- **Requirements as observed** — each one cited to the code that implements it, labelled measured (from tests, types,
  schemas, interfaces) or inferred (from reading the logic).
- **Business rules** — the decisions the code makes (*an order over 10,000 needs approval*, *refunds after 30 days go to
  manual review*), extracted with their exact location and conditions. AWS's mainframe tooling shows the pattern works:
  deterministic analysis plus AI, with traceability from every rule to its source. KILN brings it to any stack, locally.
- **Open questions** — where the code is ambiguous or seems wrong, asked rather than guessed.
- **Characterization test proposals** — tests that would pin each requirement, ready to become the first tasks of a later
  feature.

A person reviews each as-is specification. **Confirmed** requirements become *from a person*; **corrected** ones record
the correction; **disputed** ones stay as questions. Nothing is written to the repository until the team chooses to add
the specifications — through its own pull request, when it enters the next stage.

**Why this matters.** As-is specifications are the **preserved-behaviour library** every later brownfield feature needs
(`brownfield.md` §7.1): *what must not change* is already written down and reviewed. And reviewing them is how a team
learns to read and write specifications — on code it knows, with no feature at risk.

### 6.2 A constitution discovered, not imposed

A greenfield factory writes its constitution from a product brief. An existing codebase already *has* principles — in
its conventions, its tests, its architecture, its reviews. KILN drafts a constitution **from what the code and history
actually show**, plus answers from the team's interviews: *errors are never swallowed*, *all money is integer cents*,
*every public endpoint is versioned*. Each principle cites its evidence. The team edits and adopts it — its first
spec-driven artifact, and one it recognises as its own.

The same applies to the experience: for a codebase with an interface, the explore maps (screens, routes, flows,
components, tokens) feed a **discovered experience charter** — as-is journeys, a screen map and inferred wireframes,
labelled *measured* or *inferred* — that the team confirms before it becomes a yardstick for the Experience design and UI
review gates (`experience-charter.md` §4).

### 6.3 Learning spec-driven development by replaying the past

For a team new to SDD, the gentlest lesson is a change it has already made. KILN takes a **merged change from history**
and shows how it would have looked as a spec-driven feature: the concept, the specification with its preserved
behaviour, the work plan, the tasks — next to what the team actually did. No gate decides anything; it is a worked
example on the team's own code. It is the educational twin of the **rehearsal** in `brownfield.md` §4, and can come long
before it.

### 6.4 Spec coverage

A map of the codebase showing, per module: knowledge coverage (scanned, curated), **as-is spec coverage** (drafted,
confirmed), characterization-test coverage, and recovered decisions. It turns "becoming spec-driven" from a vague goal
into a visible, incremental one — and tells the team where a factory could safely work first.

## 7. The adoption path

Exploration extends KILN's adoption stages downward, so a team can start with no commitment at all.

| Stage | KILN does | The team does | Exit evidence |
|---|---|---|---|
| **0. Explore** | profile, full scan, maps, answers, tours — in an explore space; nothing changes | reads, asks, corrects | engineers use it for real questions; the scan report is reviewed |
| **1. Understand** | curated knowledge, expert-reviewed tours, recovered decisions, interviews | names Curators, answers interview questions, reviews tours | key modules have curated pages and tours; open questions are shrinking |
| **2. Specify as-is** | drafts as-is specifications, a discovered constitution, characterization-test proposals | reviews and confirms specs; adopts the constitution; adds them through its own pull request | spec coverage of the first candidate territory; a constitution adopted |
| **3. Rehearse** | replays past changes through the flow (as `brownfield.md` §4) | compares the judges' findings with what it merged | judges' findings match or beat human review on past changes |
| **4. Contribute** | real features in a territory, through the team's pull requests | decides at gates | review outcomes, CI results, post-merge defects |
| **5. Own** | a well-bounded area through the team's merge path | grants it by quorum | a recorded team decision |

Stages 0–2 change nothing in how the team builds software; they build the understanding, the specifications and the
habits a factory needs. Stage 2 is the first time anything reaches the repository — and it arrives through the team's own
review, as documentation and tests, not as KILN-written features.

### 7.1 The readiness report

At any point, KILN can produce a **factory readiness report** for a codebase or a candidate territory — evidence, not a
score:

- **Build and test health** — reproducible build? failing and flaky tests? areas without tests?
- **Understanding** — knowledge coverage, curated pages, open questions, contradictions between docs and code.
- **Specification** — as-is spec coverage, confirmed requirements, characterization tests in place.
- **Process fit** — CI as evidence, code owners, review rules, branch conventions.
- **Candidate territories** — well-bounded, well-tested, well-understood areas where a factory could start, and why.
- **First features** — candidates from exploration with their evidence and readiness (*ready · thin · unknown*).
- **What stands in the way** — the gaps, in order of what to fix first.

No people are scored or ranked; the report describes the codebase and the process, never individuals.

## 8. Legacy codebases

Legacy systems are where exploration is worth most and is hardest.

| Legacy reality | How Explore handles it |
|---|---|
| **Old or niche languages** (COBOL, PL/SQL, RPG, VB6, old Java or C++) | deterministic parsers where they exist; otherwise model reading with every claim labelled *inferred*; language support listed honestly in the scan report |
| **No tests** | the baseline says so; as-is specifications and characterization-test proposals become the first safety net |
| **Irreproducible builds** | recorded as a finding with what failed; the scan continues on static analysis; fixing the build becomes the first candidate |
| **History imported from older version control** | history is read as far as it goes; gaps are stated, not filled |
| **Huge size** | the code map first; deep scanning inside the candidate territory, a map outside; budgets and estimates before anything runs |
| **Knowledge in retiring experts' heads** | interviews and expert-reviewed tours capture it once, labelled *from a person*, with who and when |
| **Mixed stacks and generated code** | generated, vendored and binary files excluded and listed; interfaces between stacks mapped explicitly |

Where a legacy system is being **modernised**, Explore's as-is specifications and business rules are exactly the input a
rewrite needs: the new system can be specified against what the old one demonstrably does.

## 9. Exploration for the whole team

- **One understanding, shared.** The explore space's knowledge base is published to the team space (`team-space.md`), so
  each engineer reads the same curated understanding instead of each exploring alone.
- **Readable by everyone.** Product owners, testers, auditors and new joiners read the vault without running KILN.
- **Onboarding.** A new joiner gets the *start here* page, role tours and a question box grounded in the code.
- **On-call.** Runbook-style tours and traced error paths for the parts that page people at night.

## 10. Privacy and governance

- **Local by default.** The full scan's model passes run on the team's own hardware (`dev-machines.md`); nothing leaves
  unless a policy allows it. This is what makes Explore usable on the codebases that matter most — regulated, proprietary
  and legacy systems that cannot be sent to a cloud wiki.
- **Secrets** are detected and reported, never stored in pages or sent anywhere.
- **Restricted areas** can be excluded or marked so their pages stay on the host.
- **No people analytics.** Ownership is per module; review comments are read only if the team allows; nothing ranks
  individuals.

## 11. The landscape, and where KILN stands

| Tool (2026) | What it does well | What it lacks for this purpose |
|---|---|---|
| **DeepWiki** (Cognition) | instant wikis with diagrams and Q&A for public repositories; an MCP server for agents | cloud-hosted, public-repo first; lags the latest commits; no curation, no path to specifications |
| **Google Code Wiki** | documentation regenerated after every commit; diagrams and chat | public preview; private repositories by waitlist; cloud |
| **Sourcegraph** | code search across large, multi-repository estates | enterprise pricing; search rather than curated understanding |
| **Driver.ai, repowise, Aider's repo map** | legacy comprehension; self-hosted wikis from code graphs; compact repository maps for agents | understanding only — no bridge to a development process |
| **AWS Transform for mainframe** | business-rule extraction with traceability into forward engineering | mainframe-specific; AWS's cloud |
| **Spec Kit brownfield workarounds** | adding Spec Kit to an existing repository; community extensions that bootstrap specs | no official spec recovery; drift is the main complaint |

**What KILN can uniquely combine:** exploration that is **local and private**, **grounded and kept true** (drift flagged,
people's corrections win), **curated by people** (tours, interviews, confirmed specs), and that leads **without a break**
into specifications, rehearsal and a factory that will use the very same knowledge. The others help a team understand
its code; KILN can help it understand its code *and then change how it builds software*.

## 12. How it fits KILN's rules

| Rule | In Explore |
|---|---|
| **Read before write** (`brownfield.md` B1) | stages 0–1 write nothing to the repository; stage 2 writes only through the team's own pull request |
| **Knowledge is context, never authority** (X) | every claim cited and labelled; recovered specs are candidates until a person confirms them |
| **Ungated means ungated** (PRD P13) | exploration has no gates because it decides nothing; nothing it produces settles a gate later without a person |
| **Local by default** (VIII) | scans and answers run locally; egress only by policy |
| **Everything recorded** (VII) | scans, answers filed back, confirmations and corrections are events with actors |
| **Workshops are sovereign** (XII) | a team space shares understanding; each workshop still decides its own gates |
| **A person decides** (I, V) | as-is specs, constitutions, decisions and candidates are confirmed by people, never by absence |

## 13. Roadmap opportunity

*Decided 2026-10-22 (rows admitted with the roadmap on 2026-10-22):* the minimal explore space ships in `kiln-v1`
as **r43**, right after the full scan; as-is specifications, tours and archaeology, readiness and legacy languages follow
in `kiln-v1.x` as **r46–r49** (PRD §6.21, M17). The options below are kept as the record of what was considered.

Explore is mostly built from parts `kiln-v1` already plans, but the current order delivers them late, inside the
factory: the full scan is r30, after first run (r28), and the adoption stages are r40 in `kiln-v1.x`.

**What an Explore track needs:** the durable core (r13), the record (r15), real local workers (r16), configuration (r17),
the read-only front door (r19), the knowledge base (r23, r24), and the profile and full scan (r30) — but **not** the gates
(r20), delegation (r21) or several factories (r25).

**Options for a future Roadmap gate** (proposals, not decisions):

1. **An Explore milestone before the factory** — reorder so the explore space and full scan land right after the
   knowledge base, and cut an early `kiln-explore` release: a useful product, and a source of real users and real
   codebases, months before the full factory.
2. **New candidate rows**, each one feature:
   - the **explore space** (no-factory mode) and `kiln explore` commands;
   - **maps and signals** (architecture, hot spots, change coupling, test landscape);
   - **ask and trace** with filing back;
   - **tours** with expert review;
   - **archaeology** and recovered decisions;
   - **as-is specifications** and business rules, with characterization-test proposals;
   - the **discovered constitution** and **replaying the past**;
   - **spec coverage** and the **readiness report**;
   - **legacy language support** (parsers, honest coverage).
3. **Keep the current order** and add the Explore rows to `kiln-v1.x`, accepting that adoption waits for the factory.

## 14. How we will know it works

Measured honestly, per the insights rules — about the codebase and the process, never about individuals:

- **Time to a correct answer** for a new joiner's real questions, with citations checked.
- **Correction rate** — how often people correct answers and pages; falling over time as curation improves.
- **Knowledge and spec coverage** of the candidate territory.
- **Open questions** asked and answered by experts.
- **Exploration to adoption** — how many explore spaces become factories, and how long that takes.

## 15. Open questions

*Answered 2026-10-22 with these defaults (`open-decisions.md` 24): (1) its own lightweight kind; (2) the vault and the team
space — no hosted view yet; (3) yes, through r44's MCP server under egress policy; (4) the same drift flags as knowledge
pages; (5) chosen by demand at r49; (6) exportable with restricted content redacted; (7) no separate early release — the
minimal explore space ships in `kiln-v1` instead.*

1. Should an explore space be its own kind of thing, or a factory with no roadmap admitted yet?
2. How much of the knowledge base should be shareable with people who do not run KILN — a static export, a hosted read
   view on the team's own infrastructure, or only the vault?
3. Should KILN offer an MCP server so other coding agents can use the knowledge base — and how does that fit egress policy?
4. How are as-is specifications kept true as the code changes — the same drift flags as knowledge pages, or re-derivation?
5. Which legacy languages deserve first-class deterministic parsing first?
6. Should the readiness report be shareable outside the workshop (for a management business case), and with what
   redaction?
7. Should Explore ship as an early, separate release (`kiln-explore`) before the full factory?

## 16. Sources

Retrieved 2026-10-22.

- Codebase understanding tools — [SSOJet: AI tools for codebase onboarding](https://ssojet.com/blog/ai-codebase-understanding-tools) ·
  [The Road to Enterprise: onboarding with AI](https://theroadtoenterprise.com/blog/onboarding-to-new-codebase-with-ai-tools) ·
  [Analytics Vidhya: Google Code Wiki](https://www.analyticsvidhya.com/blog/2025/12/google-code-wiki/) ·
  [Codersera: DeepWiki](https://codersera.com/blog/what-is-deepwiki-ai-code-documentation-github-repository/) ·
  [repowise: codebase documentation tools for agents](https://repowise.dev/blog/comparisons/best-codebase-documentation-tools-ai-agents) ·
  [KDnuggets: free tools to understand code](https://www.kdnuggets.com/5-free-ai-tools-to-understand-code-and-generate-documentation)
- Legacy modernisation — [AWS: Transform for mainframe, Reimagine](https://aws.amazon.com/blogs/aws/aws-transform-for-mainframe-introduces-reimagine-capabilities-and-automated-testing-functionality/) ·
  [AWS: traceable reimagine workflow (June 2026)](https://aws.amazon.com/about-aws/whats-new/2026/06/aws-transform-mainframe-traceable-reimagine-workflow/) ·
  [AWS: reimagining mainframe applications](https://aws.amazon.com/blogs/migration-and-modernization/reimagine-your-mainframe-applications-with-agentic-ai-and-aws-transform/)
- Spec-driven development in brownfield — [EPAM: Spec Kit for brownfield exploration](https://www.epam.com/insights/ai/blogs/using-spec-kit-for-brownfield-codebase) ·
  [Spec Kit discussion #331](https://github.com/github/spec-kit/discussions/331) ·
  [Spec Kit issue #1436: brownfield bootstrap](https://github.com/github/spec-kit/issues/1436) ·
  [spec-kit-brownfield extension](https://github.com/Quratulain-bilal/spec-kit-brownfield) ·
  [BrainGrid: Spec Kit in an existing project](https://www.braingrid.ai/blog/github-spec-kit-tutorial-existing-project) ·
  [CodeMySpec: SDD tools](https://codemyspec.com/blog/best-spec-driven-development-tools) ·
  [Kairi: spec-grounded modernization](https://medium.com/kairi-ai/spec-grounded-modernization-leveraging-ai-specification-kits-for-brownfield-software-systems-e69bdaf04e32)
- Comprehension research — [CodeMap, ICPC 2026](https://conf.researchr.org/details/icpc-2026/icpc-2026-research/29/Understanding-Codebase-like-a-Professional-Human-AI-Collaboration-for-Code-Comprehen) ·
  [arXiv 2504.04553](https://arxiv.org/html/2504.04553v3) · [arXiv 2603.25391](https://arxiv.org/html/2603.25391v1) ·
  [Onboarding engineers into AI-generated codebases](https://tianpan.co/blog/2026/04/17/onboarding-engineers-ai-generated-codebases)
