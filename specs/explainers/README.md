# Roadmap row explainers

> **Type:** index. One explainer per row of the [roadmap](../ROADMAP.md) — what each row delivers, why, what it
> carries from the [PRD](../../docs/prd/kiln-prd.md), how it is proven and what shapes it. The roadmap was admitted at the Roadmap gate on
> 2026-10-22 (human@batorfi); r12 is the next row. The roadmap and the PRD govern where an explainer differs. Generated from the roadmap and PRD on 2026-10-22;
> regenerate or edit them together when rows change.

**43 rows** in the committed order — **27 in `kiln-v1`** (ending with the release, r32) and **16 in `kiln-v1.x`**.
Row ids are never reused, so they are not in numeric order.

For the big picture, read [what `kiln-v1` delivers](../../docs/architecture/explainers/kiln-v1.md) and [what `kiln-v1.x` adds](../../docs/architecture/explainers/kiln-v1x.md).


## `kiln-v1`

| # | Row | Phase | Depends on | Proven when |
|---|---|---|---|---|
| 1 | [**r12** Foundations reset](./r12-foundations-reset.md) | Foundation | — | new layout builds; legacy frozen; every ported test green; `kiln check` runs the network check |
| 2 | [**r42** Spike: completing a waiting task from outside](./r42-spike-completing-a-waiting-task-from-outside.md) | Durable core | r12 | go / go-with-fallback / no-go decided by a spike report; kill-at-every-step tests show one atomic move + completion, first move wins; a no-go re-opens the Roadmap gate |
| 3 | [**r13** Durable core and the gate contract](./r13-durable-core-and-the-gate-contract.md) | Durable core | r12, r42 | kill the server at every step of a gate task: it resumes, waits, and settles only on a committed move |
| 4 | [**r14** Gates as data, walked headless](./r14-gates-as-data-walked-headless.md) | Durable core | r13 | a scripted feature walks ten gates from the CLI; `kiln check flow` refuses every invalid flow in its negative suite |
| 5 | [**r15** The record](./r15-the-record.md) | Durable core | r14 | factory-log rebuilt byte-identical from events; the first program's committed walks (closed rows r1–r3, r7, r8) replay as streams; old event versions upcast on read |
| 6 | [**r16** Real local workers](./r16-real-local-workers.md) | Workers | r13, r15 | a feature walks with real local workers and judges on Ollama; a crash mid-generation resumes without double-charging a tool |
| 7 | [**r17** Configuration as files](./r17-configuration-as-files.md) | Workers | r16 | a weaker judge binding is refused; a config change applies from the next step and is recorded with before/after |
| 8 | [**r18** The director](./r18-the-director.md) | Director | r14, r17 | the same situation yields the same next step every time; planner drafts that fail checks never reach a person |
| 9 | [**r19** Web front door, read-only](./r19-web-front-door-read-only.md) | Front door | r15 | a second browser tab without the secret sees nothing; a reconnect resumes from its last seq with no polling |
| 10 | [**r20** Gates on the web](./r20-gates-on-the-web.md) | Front door | r18, r19 | a person decides every gate of a real feature in the browser and from the CLI; a move on a stale state version is refused |
| 11 | [**r21** Stepping in](./r21-stepping-in.md) | Front door | r20 | an armed tail crosses clean gates as *delegated*, and stops at the first objection; a judge cannot be steered |
| 12 | [**r22** Shaping the roadmap together](./r22-shaping-the-roadmap-together.md) | Front door | r20 | a roadmap shaped from inputs, conversation and pinned edits; approve admits exactly the version read |
| 13 | [**r23** The factory knowledge base](./r23-the-factory-knowledge-base.md) | Knowledge | r20 | a wiki that opens cleanly in Obsidian and Zed; briefs cite pages and flag stale ones |
| 14 | [**r24** Implementation knowledge and the workshop wiki](./r24-implementation-knowledge-and-the-workshop-wiki.md) | Knowledge | r23 | a merged feature has a feature story grounded at a commit; a code change flags the pages it drifts |
| 15 | [**r25** One workshop, several factories](./r25-one-workshop-several-factories.md) | Workshop | r20 | three factories on one host share the model pool; one Needs you across them |
| 16 | [**r26** Agents and flows](./r26-agents-and-flows.md) | Workshop | r18, r25 | an added gate defined, checked, tried on a past feature, and chosen for one feature at the Roadmap gate |
| 17 | [**r27** Health and broken guarantees](./r27-health-and-broken-guarantees.md) | Workshop | r19, r15 | an injected broken guarantee is critical and recorded; a silent watcher shows *unknown*, never healthy |
| 18 | [**r53** The Feed](./r53-the-feed.md) | Workshop | r22, r24 | an item fed as a screenshot and a note is stored untouched, sorted into drafted destinations (only those this build has), routed by a person, and its trail shows *from your feed*; nothing is decided by feeding, and a routed item can be taken back |
| 19 | [**r28** First run](./r28-first-run.md) | Getting started | r17, r22, r23 | from install to a first Roadmap gate in under an hour on a fresh machine, nothing leaving it |
| 20 | [**r29** New codebases](./r29-new-codebases.md) | Getting started | r26, r28 | an empty repository reaches a merged walking skeleton that builds and passes from a clean clone |
| 21 | [**r30** Existing codebases, part 1: profile and full scan](./r30-existing-codebases-part-1-profile-and-full-scan.md) | Getting started | r24, r28 | a full scan of this repository writes module pages, a coverage report and open questions; a crash mid-scan resumes |
| 22 | [**r43** Explore space](./r43-explore-space.md) | Explore | r30 | an explore space answers a new joiner's questions with citations and draws the architecture map — and writes nothing to the repository |
| 23 | [**r44** KILN in Zed, phase 1](./r44-kiln-in-zed-phase-1.md) | Editor | r20, r24, r43 | every citation in a brief opens at its line in Zed; KILN tasks run from Zed; an engineer's own agent asks KILN's MCP server who is building a path, and the response is recorded |
| 24 | [**r31** Existing codebases, part 2: baseline, territory, process](./r31-existing-codebases-part-2-baseline-territory-process.md) | Getting started | r30, r21 | a feature outside its territory is flagged at Code review; pre-existing failures never block on their own |
| 25 | [**r38** Team space, part 1](./r38-team-space-part-1.md) | Team | r24, r25 | a team roadmap change takes effect only when the quorum has signed |
| 26 | [**r39** Team space, part 2](./r39-team-space-part-2.md) | Team | r38, r31 | overlapping claims surface at the Work plan gate; a required teammate review conditions *approve*; the Merge gate uses the code host's queue |
| 27 | [**r32** Cut the kiln-v1 release](./r32-cut-the-kiln-v1-release.md) | Release | r21, r24, r26, r27, r29, r31, r39, r43, r44, r53 | a newcomer installs KILN, runs first setup on a real repository and decides its first Roadmap gate in under an hour |

## `kiln-v1.x`

| # | Row | Phase | Depends on | Proven when |
|---|---|---|---|---|
| 28 | [**r45** Remote judges (judges-only hybrid)](./r45-remote-judges.md) | kiln-v1.x | r32 | a code reviewer runs on a pinned remote model; a provider outage makes the judged step wait; the egress audit lists each request with model served, provider and cost |
| 29 | [**r33** Models beyond the machine](./r33-models-beyond-the-machine.md) | kiln-v1.x | r45 | a hybrid factory's cloud judge sees only what policy allows; a local-only factory reaches nothing beyond loopback |
| 30 | [**r34** The bench, part 1: notebook and research](./r34-the-bench-part-1-notebook-and-research.md) | kiln-v1.x | r32 | a notebook entry promoted to knowledge keeps its origin; research results are cited |
| 31 | [**r35** The bench, part 2: spikes and candidates](./r35-the-bench-part-2-spikes-and-candidates.md) | kiln-v1.x | r34 | a spike's report becomes evidence on a candidate shown at the Roadmap gate; spike code never merges |
| 32 | [**r54** The Feed, the rest](./r54-the-feed-the-rest.md) | kiln-v1.x | r53, r35, r39 | a note fed from the editor lands in the notebook labelled *fed*; one item shared to the team changes no team artifact by itself; a watched folder is off until turned on and listed in *Changes* |
| 33 | [**r36** Observability in full](./r36-observability-in-full.md) | kiln-v1.x | r32 | one trace per feature; insights with counts and sample sizes; time travel to any moment |
| 34 | [**r37** Factories anywhere](./r37-factories-anywhere.md) | kiln-v1.x | r32 | a factory moves between hosts with handover; a network failure approves nothing |
| 35 | [**r46** Explore: as-is specifications](./r46-explore-as-is-specifications.md) | kiln-v1.x | r32 | a module's as-is specification cites every requirement to code; a person confirms or corrects each; characterization-test proposals pin the confirmed ones |
| 36 | [**r47** Explore: tours and archaeology](./r47-explore-tours-and-archaeology.md) | kiln-v1.x | r32 | an expert-reviewed tour opens every stop at its line; recovered decisions are confirmed, corrected or rejected by a person |
| 37 | [**r48** Explore: readiness](./r48-explore-readiness.md) | kiln-v1.x | r46, r35 | the readiness report names candidate territories and first features with evidence and scores no person; adoption stages 0–2 are recorded |
| 38 | [**r49** Explore: legacy languages](./r49-explore-legacy-languages.md) | kiln-v1.x | r32 | a scan of a legacy-language repository reports exactly which files were parsed and which only inferred |
| 39 | [**r40** Existing codebases, the rest](./r40-existing-codebases-the-rest.md) | kiln-v1.x | r31, r35, r48 | a rehearsal on a past change compares the judges' findings with what the team merged |
| 40 | [**r41** New codebases, the rest](./r41-new-codebases-the-rest.md) | kiln-v1.x | r29, r35, r39 | conventions written by the skeleton are enforced from feature two; a team starts a product together |
| 41 | [**r50** KILN in Zed, phase 2: the Agent Panel](./r50-kiln-in-zed-phase-2-the-agent-panel.md) | kiln-v1.x | r32 | a full gate brief read in Zed's Agent Panel with every citation followed in the editor; a held risky action approved there |
| 42 | [**r51** KILN in Zed, phase 3: decide where the code is](./r51-kiln-in-zed-phase-3-decide-where-the-code-is.md) | kiln-v1.x | r50 | a Code review gate decided in Zed on the full brief through the same intake as the browser; a stale move from Zed is refused |
| 43 | [**r52** KILN in Zed, phase 4: ambient and team](./r52-kiln-in-zed-phase-4-ambient-and-team.md) | kiln-v1.x | r51 | editing a claimed path warns in the buffer; a teammate's required review given from a shared Zed workspace is mirrored into the owner's record |
