#!/usr/bin/env python3
# Regenerates specs/explainers/ from specs/ROADMAP.md and docs/prd/kiln-prd.md plus the per-row narrative below.
# Usage: python3 specs/explainers/_generate.py <repo-root>
# Edit the narrative here when a row changes, then regenerate; hand edits to the generated files are overwritten.
"""Generate one explainer per roadmap row into specs/explainers/ (scratch generator, not committed)."""
import json, os, re, sys

ROOT = sys.argv[1]
OUT = os.path.join(ROOT, "specs", "explainers")
rm = open(os.path.join(ROOT, "specs", "ROADMAP.md")).read()
prd = open(os.path.join(ROOT, "docs", "prd", "kiln-prd.md")).read()

head = json.loads(re.search(r"```json\n(.*?)\n```", rm, re.S).group(1))
ORDER = head["ordering"]
ROWS = {r["id"]: r for r in head["rows"]}
V1 = set(ORDER[: ORDER.index("r32") + 1])

# rendered table: id | phase | feature | deps | reqs | acceptance
TABLE = {}
for m in re.finditer(r"^\| (r\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| (.*) \|$", rm, re.M):
    TABLE[m.group(1)] = dict(phase=m.group(2).strip(), title=m.group(3).strip().strip("*"),
                             reqs=m.group(5).strip(), acceptance=m.group(6).strip())

REQS = {m.group(1): (m.group(2).strip(), m.group(3).strip())
        for m in re.finditer(r"^\| ([A-Z]+-\d+[a-z]?) \| (.*) \| ([^|]+) \|$", prd, re.M)}

def req_ids(s):
    out, prefix = [], None
    for tok in re.split(r"[,;]\s*", s):
        tok = re.sub(r"\s*\(.*?\)", "", tok.strip())
        for p, a, b in re.findall(r"([A-Z]+-)?(\d+[a-z]?)(?:\s*(?:…|–)\s*(\d+))?", tok):
            if p: prefix = p[:-1]
            if not prefix: continue
            rng = [f"{prefix}-{i}" for i in range(int(a), int(b) + 1)] if b else [f"{prefix}-{a}"]
            for x in rng:
                if x not in out: out.append(x)
    return out

# decisions table
dec = rm[rm.index("## Decisions needed before rows fire"): rm.index("## What the Roadmap gate decided")]
DECISIONS = {}
for m in re.finditer(r"^\| \*\*([^*]+)\*\* \| (.*) \|$", dec, re.M):
    key, text = m.group(1), m.group(2)
    ids = []
    for part in re.split(r"\s*/\s*", key):
        r = re.match(r"r(\d+)(?:–r(\d+))?$", part.strip())
        if not r: continue
        a, b = int(r.group(1)), int(r.group(2) or r.group(1))
        ids += [f"r{i}" for i in range(a, b + 1)]
    for i in ids:
        DECISIONS.setdefault(i, []).append(text)

DEPENDENTS = {}
for rid, r in ROWS.items():
    for d in r["deps"]:
        DEPENDENTS.setdefault(d, []).append(rid)

def slug(title):
    t = re.sub(r"\(.*?\)", "", title).lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t[:60].rstrip("-")

C = "../../docs/concepts/"
X = "../../docs/architecture/explainers/"
P = "../../docs/prd/kiln-prd.md"
K = "../../.specify/memory/constitution.md"

# ---- hand-written narrative per row -------------------------------------------------------------
N = {}
def row(rid, why, delivers, out, rules, read):
    N[rid] = dict(why=why, delivers=delivers, out=out, rules=rules, read=read)

row("r12",
    "The restart reorganises the repository around the new design without throwing away what the first program proved. This row creates the package layout every later row builds in, freezes the old Pi extension in `legacy/`, and ports the code that still expresses a rule KILN holds — with its tests — so the new codebase starts with its guarantees already checked.",
    ["the package layout: `contracts`, `record`, `durable`, `lane`, `workers`, `director`, `server`, `web`, `cli`, `checks` (with room for `knowledge`, `workshop`, `team`, `explore`, `editor` later)",
     "the first program's Pi extension and terminal UI frozen in `legacy/`, with no feature work there",
     "the keep-list ported with its tests green: the standard flow and move kinds as data, the schemas, the log and roadmap validators, the affinity scheduler, the strongest-judge tier policy, the deterministic clock",
     "the hardened, never-vacuous network check generalised into `checks/`",
     "the legacy `kiln/contracts/gate-rail.md` rewritten for constitution v2.0.1 and the decided move set (with r14)",
     "the legacy live-Pi suite skipping with a printed reason on a Pi version it has not measured, instead of failing"],
    ["no durable runtime yet (r13) and no new behaviour — this row moves and checks, it does not add features",
     "no user interface"],
    ["**II** — the strongest-judge policy survives the port", "**III, IV** — the scheduler's single-lane and affinity rules", "**VIII** — the network check that proves local-only", "*Dependencies* — the new layout keeps one seam per dependency"],
    [("PRD §8.2 codebase layout and §10 what we keep", P), ("The constitution", K), ("What `kiln-v1` delivers", X + "kiln-v1.md")])

row("r42",
    "Every gate in KILN depends on one primitive: a person's move, committed from outside the waiting gate task, completes that task in the same atomic commit — so a crash can never leave a move half-applied and nothing but a move settles a gate. Pi Durable does not publish this primitive, so this time-boxed spike settles it before anything is built on it.",
    ["a time-boxed spike against the pinned Pi Durable version",
     "kill-at-every-step tests proving one atomic commit for a move and its gate's completion, keyed exactly once, first move wins",
     "if the library lacks it: an upstream proposal, and the named fallback prototyped — a KILN decision table committed in the same SQLite transaction as the task store, behind the seam",
     "a spike report that decides **go**, **go with fallback** or **no-go**"],
    ["no production feature code; the spike's prototype lives behind the seam or is thrown away",
     "a **no-go** does not continue to r13 — it re-opens the Roadmap gate"],
    ["**V** — a missing person never approves", "**VII** — a move and its effect are one recorded commit", "*Dependencies* — a dependency never weakens a principle; it is reached through one seam"],
    [("KILN on Pi Durable §12", C + "pi-durable.md"), ("The web front door §5.2 — the gate contract", C + "web-front-door.md"), ("PRD CORE-6", P)])

row("r13",
    "This row builds the durable heart of a factory on Pi Durable: the task graph that holds the roadmap, each feature, each step, each gate and the lane, and the gate contract that makes \"no silent approval\" a property of the substrate rather than a check scattered through code.",
    ["the Pi Durable seam — the only module that imports Pi Durable",
     "task types: **roadmap**, **row** (one feature), **unit** (one step), **gate**, **lane**",
     "the gate contract: opening commits the gate document, the brief as it will be shown and `gate.opened`; a move and the gate's completion are one atomic commit, keyed exactly once; first move wins; stale moves refused; no durable timer settles a gate",
     "restart resumes every task from its last checkpoint; a waiting gate resumes waiting",
     "exactly-once commands and moves through idempotency keys",
     "one durable store per factory"],
    ["the flow as data and the CLI walk (r14)", "the event record and its projections (r15)", "real models (r16)"],
    ["**V** — absence, a crash or a clock never settles a gate", "**VI** — the roadmap task accepts no delegated move", "**VII** — moves are committed with their effects", "**XI** — the store is independent of its host"],
    [("KILN on Pi Durable", C + "pi-durable.md"), ("The web front door §5", C + "web-front-door.md"), ("PRD §6.2", P)])

row("r14",
    "The default flow — the Roadmap gate and nine feature gates — becomes data the director executes, not a constant rail in code. A scripted feature walks all ten gates from the command line and survives being killed at every one, which makes the flow demonstrable long before any screen exists.",
    ["the standard flow as data, with the closed set of move kinds: approve, revise, reject, restart, split+revise, mitigate, and the Roadmap gate's row edits",
     "the decided move semantics: Code review offers `approve · revise · restart`; a reject may name an earlier gate at any time; every gate after the target re-opens; triage skips only Concept and Design",
     "the fix-round cap (default 2, settable 0–3)",
     "`kiln check flow` for the default flow, with a negative suite of invalid flows it must refuse",
     "a scripted feature walking all ten gates from the CLI, surviving kill-and-resume at every gate"],
    ["added gates and flows from files (r26)", "the gate brief and moves in the browser (r20)"],
    ["*The Flow* — fixed anchors, built-in gates never removed, closed move kinds", "**I** — a person decides every gate", "**V** — kill-and-resume never settles a gate"],
    [("The flow", C + "the-flow.md"), ("An extensible flow", C + "extensible-flow.md"), ("The constitution, explained §9", X + "kiln-constitution.md")])

row("r15",
    "KILN's record is the ordered stream of domain events, committed with the state each one describes; every view — the factory-log included — is rebuilt from it. This row builds that record and proves it against the first program's real, committed walks.",
    ["the transactional outbox: every state change commits its events in the same commit",
     "the event envelope (id, seq, type, schema version, actor, causation, correlation…) and a catalog of versioned schemas — an invalid event fails its commit",
     "the backbone with durable consumer cursors",
     "the factory-log as a projection, rebuilt byte-identically",
     "schema evolution by upcasting on read; stored events never change",
     "closed features' transcripts archived beside the store; the record's size and rebuild time measured",
     "the first program's committed walks (rows r1–r3, r7, r8) replayed as event streams"],
    ["traces, insights and time travel (r36)", "the read models the front door shows (r19)"],
    ["**VII** — the event stream is the primary record; projections rebuild identically", "**IX** — surfaces will read projections of this stream"],
    [("The record", C + "the-record.md"), ("PRD §6.5 and CORE-7", P)])

row("r16",
    "Until now the walks run on scripts. This row puts real local models to work: workers and judges as durable conversations on Ollama through `pi-ai`, with the lane making sure only one generation runs at a time and only KILN decides which model is loaded.",
    ["conversations on local models through `pi-ai` — a **fresh conversation per step**, with explicit inputs recorded; only `revise` continues one",
     "tool sets per role and replay discipline: read-only tools replay safely, writes are never repeated after a crash",
     "the residency manager: explicit load and unload, loopback only, named failures",
     "**every model request through the lane**, harness housekeeping included; a model loaded outside KILN is a broken guarantee",
     "the model pool on one host; readiness probes per supported model (tool calling, streaming, usage, context)",
     "a scripted feature walking with real workers and real judges"],
    ["configuration as files (r17)", "several factories sharing the pool (r25)", "remote models (r45, r33)"],
    ["**I** — authors and judges are different units and conversations", "**II** — judges on the strongest local model", "**III, IV** — one lane, few swaps", "**VIII** — loopback only"],
    [("The web front door §7 — workers as durable conversations", C + "web-front-door.md"), ("The model landscape", C + "model-landscape.md"), ("PRD §6.3, §6.6", P)])

row("r17",
    "Roles, the tier map and the local model catalog become plain files under `kiln.config/`, checked before they apply and recorded when they change — so a factory's configuration is reviewable like code, and a rule such as \"judges on the strongest model\" cannot be configured away.",
    ["`kiln.config/` with role files (`agents/*.md`) and the tier map",
     "judges bound to the strongest model; a weaker binding refused, not warned",
     "the local model catalog: family, size, context, capabilities — the basis for the strongest-judge and other-family rules",
     "Ollama `:cloud` tags recorded as remote and refused under `local-only`",
     "`kiln check config` and `kiln check model`",
     "changes recorded with before and after, applied from the next step"],
    ["role try-runs and added gates (r26)", "remote providers (r45, r33)"],
    ["**II** — configuration can never weaken a judge", "**VII** — every change recorded", "**VIII** — `:cloud` tags cannot slip past local-only"],
    [("Configuration", C + "configuration.md"), ("Routers and gateways §5.6 — the `:cloud` trap", C + "model-routers.md"), ("PRD §6.16", P)])

row("r18",
    "The director is the deterministic code that runs each feature's flow — what comes next, in what order, on which model — with an LLM **planner** for the parts that need judgment. Its drafts are checked by rules before anyone sees them, and it never decides a gate.",
    ["the deterministic core executing a feature's pinned flow",
     "affinity ordering of steps, and capped automatic fix rounds at Verification",
     "the planner role — on the strongest model by default — drafting roadmap proposals, work plans and splits, each with reasons and citations",
     "deterministic checks on every draft; a failing draft goes back to the planner, never to a person",
     "the planner never changes a row the engineer wrote; it may only propose",
     "answers from the record with citations"],
    ["shaping the roadmap together in the browser (r22)", "Needs you (r20)"],
    ["**I** — the planner drafts, people decide", "**IV** — affinity ordering", "**VI** — the director never admits a feature"],
    [("The director and Needs you", C + "the-director.md"), ("PRD §6.4", P)])

row("r19",
    "The first screens: a local web front door that shows the factory live, built on the record's read models and pushed events. It is read-only by design — it proves the surface is a window onto committed state before it is allowed to carry any move.",
    ["a loopback server with a per-launch secret, Host and Origin checks and CSRF protection; `decided_by` will come from the session",
     "read models with live push; a reconnecting browser resumes from its last event sequence number — no polling",
     "the first screens: workshop overview, factory live view, record explorer",
     "basic metrics derived from events"],
    ["moves and the gate brief (r20)", "network-shared access (r37)"],
    ["**IX** — one committed state; surfaces driven by events, never a source of truth", "**VIII** — loopback only"],
    [("The web front door", C + "web-front-door.md"), ("The user experience", C + "user-experience.md"), ("PRD §6.7", P)])

row("r20",
    "This is where a person first decides a real feature's gates — in the browser, with the full ten-part gate brief, or from the `kiln` CLI with the same brief as text. It is the row that makes KILN a factory a person can actually run.",
    ["the ten-part gate brief with its headline, complete before presentation and recorded as seen",
     "moves bound to the state version they were made against; first move wins; stale moves refused",
     "Needs you — one inbox for everything waiting on the person",
     "the CLI as the terminal surface: `kiln status`, `kiln needs`, `kiln gate` with the brief as text and moves through the same intake",
     "no recommended move in the brief; *request more evidence* additive, costed and policy-bound"],
    ["delegation, steering and risky-action approvals (r21)", "knowledge in briefs (r23)"],
    ["**I** — a person decides", "**V** — a move only where the full brief is shown", "**IX** — the browser and the CLI share one intake"],
    [("The user experience §8 — the gate brief", C + "user-experience.md"), ("The flow", C + "the-flow.md"), ("PRD §6.8 and WEB-6", P)])

row("r21",
    "People should not have to watch every step. This row lets them step in when they choose and step back when they trust the path: delegation of the routine gates, steering of a worker mid-step, and approvals for risky tool calls — all bounded and recorded.",
    ["delegation (the unattended tail) armed only at the Specification gate, covering the approve side of later gates; **any objection ends it**",
     "steering of work steps — never of judges — recorded under the person's name",
     "risky-action approvals: tool calls held by policy until a person allows or refuses, remembered across restarts",
     "notifications that are information only, never decisions"],
    ["hand-over to another decider (r39)", "policy stops for remote models (r45, r33)"],
    ["*The Flow* — shortcuts are decisions, not defaults", "**V, VI** — delegation never inferred, never reaching the Roadmap gate", "**I** — judges cannot be steered"],
    [("The flow §8", C + "the-flow.md"), ("The web front door §8", C + "web-front-door.md"), ("PRD §6.9", P)])

row("r22",
    "A roadmap is shaped together, not handed over for a yes or no. The engineer writes their goals and constraints, talks them through with the planner, edits rows directly — and the Roadmap gate admits exactly the version they read.",
    ["the roadmap brief — the engineer's goals, must-haves, constraints, appetite, own rows and pointers",
     "a recorded shaping conversation with the planner; alternatives drafted one at a time with their cost shown",
     "direct edits and pins the planner never silently changes",
     "versioned drafts, each checked on every version",
     "row origins (from you, from the planner, from a candidate) shown in the Roadmap gate brief",
     "approve bound to the version read"],
    ["evidence from the bench (r35)", "the team roadmap (r38)"],
    ["**VI** — the Roadmap gate is human-only", "**I** — the planner drafts, the engineer decides"],
    [("The director §4.3", C + "the-director.md"), ("PRD DIR-7", P)])

row("r23",
    "Each factory gets a knowledge base in Karpathy's LLM-wiki pattern: a dedicated keeper writes and maintains pages, Curators shape them, and every claim is traced to a source. Gate briefs cite it — and say when a cited page is stale.",
    ["an LLM wiki per factory: immutable `raw/` sources, keeper-written `pages/`, an `AGENTS.md` schema, `index.md`, `log.md` as a projection",
     "ingest, query and lint as steps; a **dedicated keeper role**; lint on a different model family than the keeper",
     "the vault contract: every wiki a valid Obsidian vault, readable in Zed or any editor",
     "Curator edit rights; every edit attributed, recorded, linted",
     "knowledge cited in gate briefs, flagged when unreviewed for 90 days or drifted, contradicted or changed while the gate was open"],
    ["implementation knowledge and the workshop wiki (r24)", "team knowledge (r39)"],
    ["**X** — knowledge is context, never authority", "**VIII** — sources stay on the machine"],
    [("The factory wiki", C + "factory-wiki.md"), ("PRD §6.11", P)])

row("r24",
    "As features are built, the factory writes down how: feature stories, overviews, explainers and how-tos grounded in the code at a commit — and flags them when the code moves on. A workshop wiki anyone may edit carries what every factory shares.",
    ["implementation digests per gate, ingested by the keeper while the factory waits",
     "feature stories, overviews, explainers and how-tos grounded in code at a commit; short cited excerpts",
     "reference pages generated from the code on merge, not written by the keeper",
     "drift flagged when cited code changes",
     "a workshop wiki anyone may edit, included read-only in every factory vault and pinned per feature"],
    ["team knowledge (r39)", "brownfield knowledge from history and interviews (r40)"],
    ["**X** — every claim traceable to a source"],
    [("The factory wiki §9", C + "factory-wiki.md"), ("PRD KNOW-5, KNOW-6", P)])

row("r25",
    "One machine, several factories: each keeps its own lane, store and gates, while a shared model pool and a host scheduler keep the right models loaded across all of them — and one Needs you shows everything waiting on the person.",
    ["the factory registry and per-factory deciders",
     "the model pool shared across factories with leases, a memory budget and a host scheduler (affinity host-wide)",
     "a KILN-managed worktree per factory, a branch per feature",
     "the host runtime in-process with the workshop",
     "people and roles for a single user",
     "Needs you across factories"],
    ["several people in one workshop and the team space (r38, r39)", "other hosts (r37)"],
    ["**III** — one lane per factory; the host budget bounds resident models", "**IV** — affinity across factories", "**VI** — the Roadmap gate per factory; delegation never crosses factories"],
    [("The web front door §12 — many kilns on one machine", C + "web-front-door.md"), ("PRD §6.12", P)])

row("r26",
    "Teams build software their own way. This row lets them see and change their agents safely — role versions, try-runs on past features — and add gates of their own, such as a threat model or a security review, chosen per feature at the Roadmap gate.",
    ["the Agents screen with role versions and **try-runs on past features**; a judge's instruction change applies only after a try-run",
     "added gates and flows from files, checked by `kiln check flow`",
     "per-feature flow choice at the Roadmap gate; gates added in flight by decision, never removed",
     "team-required gates; gate try-runs",
     "the Specification gate as the only arming point; `applies_when` with deterministic diff predicates"],
    ["team-shared flows decided by quorum (r38)"],
    ["*The Flow* — anchors fixed, built-in gates never removed, closed move kinds", "**II** — added-gate judges on the strongest model"],
    [("An extensible flow", C + "extensible-flow.md"), ("Configuration §6.3", C + "configuration.md"), ("PRD §6.17", P)])

row("r27",
    "KILN watches its own machinery and says plainly when something looks wrong — and never acts on its own. A broken guarantee, such as a gate settled without a move, is always critical and always recorded.",
    ["the observe-never-act health watcher per host, with signals, baselines per host and *unknown since* states",
     "broken-guarantee signals — always critical, never snoozed, kept in the record",
     "core metrics derived from events; `kiln health`",
     "pause-only director rules an Operator may write on health conditions",
     "a versioned, content-free diagnostic bundle"],
    ["insights and traces (r36)"],
    ["**V** — health never settles anything", "**VII** — signals are events", "**IX** — a silent watcher shows *unknown*, never healthy"],
    [("Health", C + "health.md"), ("PRD OBS-3, OBS-5, OBS-6", P)])

row("r28",
    "From install to a first Roadmap gate in under an hour, on a fresh machine, with nothing leaving it. First run measures the machine, recommends and checks models, sets up the workshop, brings in a repository with Spec Kit and its constitution, and shapes the first roadmap.",
    ["`kiln init` in the browser or the terminal, resumable; `kiln doctor` with a machine check against a 32 GB minimum and 64 GB recommendation",
     "models recommended from the hardware, checked before any role uses them; setup does not finish without a strongest-model judge",
     "workshop and storage; a first factory from a repository, in its own worktree",
     "Spec Kit adopted or added (files shown first); the constitution confirmed or drafted",
     "a knowledge bootstrap and the first roadmap shaped together",
     "Ollama's cloud features checked off on local-only hosts; the demo factory downloaded on request"],
    ["an existing codebase's full scan (r30)", "the release packaging (r32)"],
    ["**VIII** — nothing leaves during setup", "**VI** — the first act is a Roadmap-gate decision"],
    [("First run", C + "first-run.md"), ("Dev machines", C + "dev-machines.md"), ("PRD §6.18", P)])

row("r29",
    "Starting from an empty repository, intent comes before code: a product brief, a constitution written from it, technology decisions made by a person — and a walking skeleton first, proven from a clean clone.",
    ["the repository created with Spec Kit, files shown before the first commit",
     "a product brief, and a constitution written from it with each principle citing its origin",
     "technology decisions recorded by a person as decision pages — no starter templates",
     "a walking skeleton on the foundation flow (standard flow, no triage skip), verified from a clean clone; for a library, build, test, CI, packaging and one public function end to end"],
    ["conventions enforcement, slices and growing into brownfield (r41)", "research and spike evidence for decisions (r35)"],
    ["**VI** — every feature admitted at the Roadmap gate", "**I** — technology choices are a person's"],
    [("New codebases", C + "greenfield.md"), ("PRD §6.20", P)])

row("r30",
    "KILN joins an existing codebase by reading before it writes: a quick profile, then a full scan of the code and its whole history into the knowledge base — every claim cited at the scanned commit and labelled measured or inferred.",
    ["the codebase profile, in minutes",
     "the full scan in seven passes: inventory, structure, repository history, build/CI/tests, understanding, reconciliation, synthesis",
     "codebase and module pages cited at the scanned commit, labelled measured or inferred; open questions; a scan report honest about coverage",
     "deep inside the territory, a map outside; two years of history in detail; code-host discussions as titles and links unless opted in",
     "durable (a crash mid-scan resumes) and local"],
    ["the baseline, territory and process fit (r31)", "incremental re-scans and adoption stages (r40)"],
    ["**X** — every claim cited", "**VIII** — local by default", "brownfield **B1** — read before write"],
    [("Existing codebases §5", C + "brownfield.md"), ("PRD BROWN-1, BROWN-11", P)])

row("r43",
    "Teams that are not ready for a factory can still start with KILN: an explore space on any repository — no roadmap, no gates, nothing written to it — that draws the codebase and answers questions about it with citations. It is the on-ramp for teams new to spec-driven work, and its knowledge becomes a factory's starting point later.",
    ["an explore space: durable store, record, lane and knowledge base, with no roadmap and no gates",
     "built on the profile and full scan (r30)",
     "the architecture map, hot spots and the test landscape",
     "questions and traces answered with citations to file, line and commit, labelled measured or inferred; good answers filed back as knowledge",
     "zero footprint: nothing written to the team's repository, branches or CI"],
    ["as-is specifications, tours, archaeology, readiness and legacy languages (r46–r49)"],
    ["**X** — knowledge informs, never decides", "**VIII** — local by default", "PRD **P13** — ungated means ungated"],
    [("Explore first", C + "code-exploration.md"), ("PRD §6.21", P)])

row("r44",
    "Engineers read code in their editor. Phase 1 of the Zed integration removes the cheapest context switches: every citation KILN shows opens in Zed at its line, KILN's CLI runs from Zed's tasks, vaults and specs are Zed projects, and the engineer's own coding agent can ask KILN what it knows.",
    ["deep links both ways: *Open in Zed* on every citation (the factory's worktree for factory work, the engineer's clone for knowledge, with a drift warning)",
     "task templates and keybindings for `kiln needs`, `kiln status`, `kiln gate` and more",
     "vaults and specifications as Zed projects, with wikilink navigation",
     "a read-only KILN MCP server — knowledge, ask, trace, module for file, claims, territory, status — filtered by egress policy, every response recorded, allowed clients only"],
    ["the KILN agent in Zed's Agent Panel (r50)", "gate moves in Zed (r51)", "the language server (r52)"],
    ["**IX** — Zed is a surface, never a source of truth", "**VIII** — MCP served to a cloud agent is egress"],
    [("KILN in Zed", C + "zed-integration.md"), ("PRD §6.22", P)])

row("r31",
    "Before KILN changes existing code, it records what is already broken, agrees where it may work, and fits into the team's own process — so nothing old is blamed on new work and the team's reviews and CI stay in charge.",
    ["the baseline: failing and flaky tests found by repeated runs; flaky tests offered as candidate features",
     "the factory's territory, **enforced at the tool level** — writes outside are refused as risky-action requests — and checked at Code review",
     "fitting the team's process: conventions, CI as evidence, code owners and required reviews, the Merge gate opening a pull request",
     "base drift shown in briefs",
     "a teammate's edit to a KILN pull request recorded and re-verified"],
    ["preserved behaviour, adoption stages and re-scans (r40)"],
    ["brownfield **B3** — the team's process stays in charge", "brownfield **B4, B5** — know the baseline; stay bounded", "**VII** — edits and refusals recorded"],
    [("Existing codebases §5–§9", C + "brownfield.md"), ("PRD BROWN-2, 3, 5, 8", P)])

row("r38",
    "A small team works on one codebase while each engineer keeps a sovereign workshop. The team space — a git repository — gives them one team roadmap, decided by a quorum of signatures, and the floor of rules every member workshop honours.",
    ["the team-space repository with subscribe and publish; coordination as the publishing floor",
     "members' signing keys and signed acts",
     "the team floor: policy floors, protected paths, shared roles, required gates",
     "the team roadmap decided by a majority quorum; rules, the decider list and the threshold changed only by the current quorum"],
    ["claims, requests, reviews and the team-aware Merge gate (r39)", "shared hosts (r37)"],
    ["**XII** — workshops are sovereign; no team act settles a gate", "**V** — missing signatures are never agreement"],
    [("The team space", C + "team-space.md"), ("PRD §6.14", P)])

row("r39",
    "With a team roadmap in place, the team needs to see who is building what, ask each other for decisions, and merge through its own code host — without anyone deciding a gate from outside the workshop that owns it.",
    ["claims made on adoption, refined at Work plan, renewed by activity (advisory: stale at 3 days, expired at 7; exclusive: 48 hours); protected paths; overlap surfaced at the Work plan gate",
     "requests and required reviews between workshops, signed and mirrored with the code host's pull request; required reviews condition *approve*",
     "hand-over of a waiting decision to a teammate the workshop names",
     "the team-aware Merge gate: base drift, required reviews and checks, the code host's merge queue",
     "published progress and team knowledge"],
    ["team bench work (r35)", "team review in Zed (r52)"],
    ["**XII** — a teammate's review is evidence, never a decision", "**I** — one decision per gate"],
    [("The team space", C + "team-space.md"), ("PRD TEAM-4…7, HITL-4", P)])

row("r32",
    "The release row turns everything before it into something a newcomer can install and use: an installer, newcomer docs, a demo of a whole feature, and a tagged release — proven by a newcomer reaching their first Roadmap gate on a real repository in under an hour.",
    ["the installer and newcomer documentation",
     "a demo factory, downloaded on request, replaying a committed walk through all ten gates",
     "a release manifest and version tag",
     "acceptance on a real repository by a newcomer"],
    ["anything in `kiln-v1.x`"],
    ["every principle — the release ships only what keeps them"],
    [("What `kiln-v1` delivers", X + "kiln-v1.md"), ("PRD §3.1 and M14", P)])

row("r45",
    "Local judges are limited by memory; frontier models are not. This first `kiln-v1.x` row moves only the judges to a remote frontier model — workers and the planner stay local — so a 32–64 GB machine gets stronger review than any local judge, for a few dollars of judge tokens per feature.",
    ["the judge roles on a remote model through a direct provider or OpenRouter, **pinned**: approved providers only, no provider fallbacks, data collection denied, zero data retention where required, every parameter honoured",
     "judge-context egress: the diff, specification, design, touched files and their direct dependents' interfaces, configurable; KILN's own egress check first",
     "budgets that pause, never downgrade; policy stops in Needs you",
     "requested and served model, provider and cost recorded per request; a served-model mismatch on a judge a broken guarantee",
     "judge fallback only to a second provider of the same model; a missing judge waits"],
    ["remote models for any role, profiles and the full catalog (r33)"],
    ["**II** — the strongest judge, never silently downgraded", "**VIII** — egress only by recorded policy", "**VII** — every request recorded"],
    [("Hybrid deployments", C + "hybrid-deployments.md"), ("Routers and gateways", C + "model-routers.md"), ("PRD MOD-6", P)])

row("r33",
    "Building on remote judges, factories may use private and cloud models for any role the policy names — with a full model catalog, profiles, per-role routing, cross-family judging and an egress policy checked before every request.",
    ["the full model catalog: locality, pinned version, family, capabilities, cost, data handling, endpoint",
     "profiles per factory: `local-only` (default, provable), `hybrid`, `remote-first`",
     "per-role routing with cross-family judging where policy requires it",
     "the egress policy language: what may go where, secrets scan and redaction, a violation blocks",
     "budgets, fallback only by policy, policy stops; routers allowed pinned"],
    ["factories on other hosts (r37)"],
    ["**VIII** — local by default", "**II** — judges never downgraded", "**IV** — affinity for local models, budgets for remote"],
    [("The web front door §13", C + "web-front-door.md"), ("Hybrid deployments", C + "hybrid-deployments.md"), ("PRD §6.10", P)])

row("r34",
    "Engineers think while factories work. The bench gives each person a private notebook that matures into knowledge, and research steps that run on spare capacity — ungated by design, feeding the roadmap with evidence rather than decisions.",
    ["a private notebook per person with explicit capture (clipper, editor, terminal, KILN, voice)",
     "keeper suggestions — links, contradictions, maturity — never rewriting",
     "promotion of notes into workshop, factory or team knowledge",
     "research steps: plan first, read-only tools, below feature work, cited results",
     "origin and maturity labels on all knowledge"],
    ["spikes and the candidate list (r35)"],
    ["PRD **P13** — ungated means ungated", "**X** — only promoted knowledge is cited", "**III** — research below feature work"],
    [("The bench", C + "the-bench.md"), ("PRD BENCH-1…4, 7", P)])

row("r35",
    "Measured beats guessed. Spikes let engineers and agents try things in throwaway worktrees and report what they measured; the candidate list and the Roadmap gate's evidence view turn that into readiness for the next features.",
    ["spikes in throwaway worktrees on `spike/` branches, time-boxed; no pull request to `main` from a spike",
     "spike reports; *propose as a feature* seeds a roadmap entry",
     "the candidate list with evidence; the Roadmap gate's evidence and readiness view",
     "the director suggests, never starts, research and spikes",
     "bench work shared in a team"],
    ["Explore's readiness report (r48)"],
    ["PRD **P13** — spike code never reaches `main`", "**I** — evidence, never decisions"],
    [("The bench", C + "the-bench.md"), ("PRD BENCH-5…12", P)])

row("r36",
    "Honest numbers about how the factory works, and the ability to see any moment again: traces per feature, insights with their sample sizes, a feature's whole journey, and time travel through the record.",
    ["one trace per feature, linked to events; opt-in OpenTelemetry export to an allowed collector",
     "insights with counts and sample sizes, the few-cases rule, no rankings of people, never automatic change",
     "a feature's journey: every gate, round, move and decider; machine time versus waiting",
     "time travel: any projection as of any point in the record"],
    ["health and core metrics are already in `kiln-v1` (r27)"],
    ["**VII** — every view a projection", "**VIII** — export only to an allowed collector", "insights never act"],
    [("Insights", C + "insights.md"), ("The record", C + "the-record.md"), ("PRD OBS-2, OBS-4, EVT-6, GATE-7", P)])

row("r37",
    "Factories stop being tied to the workshop's machine: they run on any host — a team GPU server, a cloud machine — placed by a person, moved without losing a step, and sleeping while they wait at gates.",
    ["hosts that join by an Operator's approval, with revocable identities and a mutually authenticated, encrypted channel",
     "placement at the Roadmap gate with fit checks; local-only factories only on local hosts",
     "moves with handover; sleeping hosts with moves applied on wake, exactly once",
     "network failure that never approves anything",
     "shared hosts serving several member workshops; a network-shared workshop with real authentication"],
    ["—"],
    ["**XI** — a factory is portable; moving never changes a decision", "**V** — an unreachable host is absence", "**VIII** — authenticated, encrypted connections beyond loopback"],
    [("Factories anywhere", C + "factories-anywhere.md"), ("PRD §6.12", P)])

row("r46",
    "The bridge from understanding to spec-driven development: KILN drafts specifications of what the code already does, with its business rules cited to the code, for people to confirm — the preserved-behaviour library every later change needs, and a gentle way to learn SDD on familiar code.",
    ["as-is specifications in Spec Kit's format: requirements and business rules cited to their code, open questions, characterization-test proposals",
     "confirmation, correction or dispute by a person; drift flags like knowledge pages",
     "a constitution discovered from the code and interviews",
     "past merged changes replayed as spec-driven worked examples",
     "nothing written to the repository except through the team's own pull request"],
    ["readiness and adoption stages (r48)"],
    ["**X** — recovered specs are candidates until a person confirms them", "**I** — people confirm"],
    [("Explore first §6", C + "code-exploration.md"), ("PRD EXPL-6, EXPL-7", P)])

row("r47",
    "Understanding a codebase is faster with a guide. KILN drafts tours through the code and recovers the decisions and history behind it; experts review and annotate them, because expert-guided tours teach far better than AI-only ones.",
    ["guided tours drafted by KILN and reviewed by an expert; tours per role (new joiner, on-call, product owner, auditor)",
     "why-it-is-like-this narratives per module from history",
     "recovered decisions drafted as ADRs for a person to confirm, correct or reject"],
    ["—"],
    ["**X** — every claim cited and labelled"],
    [("Explore first §5.2", C + "code-exploration.md"), ("PRD EXPL-4, EXPL-5", P)])

row("r48",
    "A team moving toward an AI factory needs evidence of where it stands. This row makes the journey visible: spec coverage, the explore stages recorded with their evidence, and a readiness report that names where a factory could start — without scoring any person.",
    ["the spec-coverage map per module",
     "adoption stages 0–2 — explore, understand, specify as-is — recorded with their exit evidence",
     "change sizing (*what would it take*) as candidates with evidence",
     "the factory readiness report: health, understanding, specification, process fit, candidate territories, first features, gaps; exportable with restricted content redacted"],
    ["the factory's own adoption stages, Rehearse to Own (r40)"],
    ["insights rules — no people scored or ranked", "**X** — evidence, never authority"],
    [("Explore first §7", C + "code-exploration.md"), ("PRD EXPL-8, EXPL-10", P)])

row("r49",
    "Legacy systems are where exploration is worth most and is hardest. This row adds deterministic parsing for the first legacy languages teams ask for, and makes scan reports exact about what was parsed and what was only inferred.",
    ["deterministic parsing for the first legacy languages, chosen by demand",
     "model reading labelled *inferred* where no parser exists",
     "scan reports that list exactly what was parsed and what was only inferred"],
    ["—"],
    ["**X** — measured and inferred never blurred", "Explore **E6** — honest about gaps"],
    [("Explore first §8", C + "code-exploration.md"), ("PRD EXPL-9", P)])

row("r40",
    "Building on the scan, baseline and Explore's readiness, this row brings the rest of brownfield: specifying what must not change, earning trust in stages from Observe to Own, and keeping the knowledge true as the code moves.",
    ["preserved behaviour in specifications and characterization tasks first in the work plan",
     "adoption stages Observe → Rehearse → Contribute → Own, recorded; rehearsal replays a past change and compares with what the team merged",
     "brownfield knowledge from code, history, docs and interviews",
     "a small, reviewed footprint: Spec Kit enters through an *Add Spec Kit* pull request on entering Contribute",
     "incremental re-scans after each merge; issues and review comments as candidates and notes"],
    ["—"],
    ["brownfield **B1–B6**", "**X** — people's corrections win over re-scans", "**I** — rehearsal is evidence"],
    [("Existing codebases", C + "brownfield.md"), ("PRD BROWN-4, 6, 7, 9, 10, 12", P)])

row("r41",
    "A young codebase stays coherent as it grows: the conventions the skeleton wrote are enforced from feature two, work is planned in vertical slices riskiest first, brownfield practices switch on when their triggers are met, and a team can start a product together.",
    ["conventions checked by the code reviewer and CI from the second feature; changes are recorded decisions",
     "vertical slices, riskiest assumptions first; tests-first work plans by default",
     "director suggestions to switch on brownfield practices when triggers are met, decided at a Roadmap gate",
     "starting a product as a team in the team space"],
    ["—"],
    ["**VI** — every switch of practice is a Roadmap-gate decision", "**XII** — the team agrees; each workshop decides its gates"],
    [("New codebases", C + "greenfield.md"), ("PRD GREEN-6…9", P)])

row("r50",
    "Phase 2 brings KILN into Zed's Agent Panel over the Agent Client Protocol — read-only at first. Engineers talk to the director, see what is waiting, and read full gate briefs whose citations jump to the code as they read.",
    ["the KILN agent in Zed's Agent Panel over ACP, installable from the ACP Registry, built on the Pi ACP adapter path",
     "talk to the director; Needs you and notices; slash commands",
     "full gate briefs with every citation as a followed location; diffs in Zed's diff view; explore questions",
     "risky-action approvals as ACP permission requests"],
    ["gate moves in Zed (r51)"],
    ["**IX** — Zed reads the same projections", "**V** — no gate move from a permission prompt"],
    [("KILN in Zed §5 (D2)", C + "zed-integration.md"), ("PRD EDIT-4", P)])

row("r51",
    "The flagship editor experience: deciding the Code review gate where the code is. The full brief is shown in Zed, findings sit on their lines, and the move is made through the same intake as the browser — then the same for Verification and Implementation.",
    ["Code review, then Verification and Implementation, decided in Zed through ACP elicitation only after the full brief",
     "the same move intake, bound to the state version, with `decided_by` from a session token in the OS keychain",
     "a browser fallback if elicitation falls short",
     "following a worker in the factory's worktree and steering a worker step from the KILN thread"],
    ["the language server and team review (r52)"],
    ["**V** — a move only on the full brief", "**IX** — one intake for every surface", "**I** — judges cannot be steered"],
    [("KILN in Zed §5 (D3, D6)", C + "zed-integration.md"), ("PRD EDIT-5, EDIT-6", P)])

row("r52",
    "The last phase makes KILN ambient in the editor: a language server surfaces territory, claims, knowledge, drift and preserved behaviour right in the code, and teammates give their required reviews from a shared Zed workspace.",
    ["a KILN language server: territory and claims, knowledge on hover, drift, preserved behaviour, judges' findings, code actions",
     "teammates' required reviews from a shared Zed workspace, mirrored into the owning workshop's record"],
    ["—"],
    ["**XII** — a teammate's review is evidence", "**VIII** — the language server is local"],
    [("KILN in Zed §5 (D5, D8)", C + "zed-integration.md"), ("PRD EDIT-7, EDIT-8", P)])

row("r53",
    "The Feed is one place to drop anything half-formed: a note, a link, a screenshot, a file, a voice note, a ticket, a folder. The original is kept untouched; a labelled planner draft suggests where it could go; a person decides, and can take it back.",
    ["one global capture action (web, `kiln feed`, editor) that stores the original untouched",
     "deterministic intake and matching, then a labelled planner draft over a closed list of destinations, with no preselection",
     "routing as a recorded choice by a person, `feed.unrouted` to take it back, and notes kept in the private notebook labelled *fed*",
     "a *from your feed* trail on every use, and the original listing where it went",
     "opt-in share to the team for a single item, and an opt-in watched inbox folder"],
    ["anything decided by feeding: a fed item is evidence or a wish, never a requirement, approval or move"],
    ["**I** — the planner proposes, a person routes", "**VII** — every route and take-back is recorded", "**VIII** — personal by default, local first"],
    [("The Feed", C + "the-feed.md"), ("PRD FEED-1…7", P)])

# ---- render -------------------------------------------------------------------------------------
missing = [r for r in ORDER if r not in N]
assert not missing, missing
os.makedirs(OUT, exist_ok=True)
FILE = {r: f"{r}-{slug(TABLE[r]['title'])}.md" for r in ORDER}

def link(r): return f"[{r} — {TABLE[r]['title']}](./{FILE[r]})"

for i, rid in enumerate(ORDER):
    t, n, r = TABLE[rid], N[rid], ROWS[rid]
    rel = "`kiln-v1`" if rid in V1 else "`kiln-v1.x`"
    deps = ", ".join(link(d) for d in r["deps"]) or "—"
    unl = ", ".join(link(d) for d in sorted(DEPENDENTS.get(rid, []), key=ORDER.index)) or "—"
    prev_ = link(ORDER[i - 1]) if i else "—"
    next_ = link(ORDER[i + 1]) if i + 1 < len(ORDER) else "—"
    L = []
    L.append(f"# {rid} — {t['title']}\n")
    L.append("> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,")
    L.append("> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on")
    L.append("> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.")
    L.append("> Where this explainer and the roadmap or [PRD](" + P + ") differ, they govern.\n")
    L.append("| | |\n|---|---|")
    L.append(f"| **Phase** | {t['phase']} |")
    L.append(f"| **Release** | {rel} — position {i + 1} of {len(ORDER)} in the committed order |")
    L.append(f"| **Depends on** | {deps} |")
    L.append(f"| **Unlocks** | {unl} |")
    L.append(f"| **PRD requirements** | {t['reqs']} |")
    L.append(f"| **Proven when** | {t['acceptance']} |\n")
    L.append("## In one paragraph\n")
    L.append(n["why"] + "\n")
    L.append("## What it delivers\n")
    L += [f"- {d}" for d in n["delivers"]]
    L.append("\n## Not in this row\n")
    L += [f"- {d}" for d in n["out"]]
    L.append("\n## Requirements it carries\n")
    L.append(f"*As listed in the roadmap: {t['reqs']}. Full text from the PRD:*\n")
    ids_ = [q for q in req_ids(t["reqs"]) if q in REQS]
    if ids_:
        L.append("| ID | Requirement | Priority |\n|---|---|---|")
        for q in ids_:
            txt, pri = REQS[q]
            L.append(f"| {q} | {txt} | {pri} |")
    else:
        g = prd[prd.index("### 3.1 Goals"): prd.index("### 3.2 Non-goals")]
        L.append("This row carries no individual requirements: it proves the PRD's **§3.1 goals** and milestone **M14** over everything")
        L.append("built before it. The goals, from the PRD:\n")
        L.append(g.split("\n", 1)[1].strip())
    L.append("\n## How it is proven\n")
    L.append(f"**Acceptance:** {t['acceptance']}.\n")
    L.append("Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, "
             "verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.\n")
    if DECISIONS.get(rid):
        L.append("## Decisions that shape it\n")
        L += [f"- {d}" for d in DECISIONS[rid]]
        L.append("")
    L.append("## Rules it must keep\n")
    L += [f"- {d}" for d in n["rules"]]
    L.append(f"\n*See [the constitution]({K}) and [the constitution, explained]({X}kiln-constitution.md).*\n")
    L.append("## Where to read more\n")
    L += [f"- [{a}]({b})" for a, b in n["read"]]
    L.append(f"- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)\n")
    L.append("---\n")
    L.append(f"← {prev_} · [index](./README.md) · {next_} →\n")
    open(os.path.join(OUT, FILE[rid]), "w").write("\n".join(L))

# index
I = ["# Roadmap row explainers\n",
     "> **Type:** index. One explainer per row of the [roadmap](../ROADMAP.md) — what each row delivers, why, what it",
     "> carries from the [PRD](" + P + "), how it is proven and what shapes it. The roadmap was admitted at the Roadmap gate on",
     "> 2026-10-22 (human@batorfi); r12 is the next row. The roadmap and the PRD govern where an explainer differs. Generated from the roadmap and PRD on 2026-10-22;",
     "> regenerate or edit them together when rows change.\n",
     f"**{len(ORDER)} rows** in the committed order — **{len(V1)} in `kiln-v1`** (ending with the release, r32) and **{len(ORDER) - len(V1)} in `kiln-v1.x`**.",
     "Row ids are never reused, so they are not in numeric order.\n",
     "For the big picture, read [what `kiln-v1` delivers](" + X + "kiln-v1.md) and [what `kiln-v1.x` adds](" + X + "kiln-v1x.md).\n"]
cur = None
for i, rid in enumerate(ORDER):
    rel = "kiln-v1" if rid in V1 else "kiln-v1.x"
    if rel != cur:
        I.append(f"\n## `{rel}`\n")
        I.append("| # | Row | Phase | Depends on | Proven when |\n|---|---|---|---|---|")
        cur = rel
    t = TABLE[rid]
    I.append(f"| {i + 1} | [**{rid}** {t['title']}](./{FILE[rid]}) | {t['phase']} | {', '.join(ROWS[rid]['deps']) or '—'} | {t['acceptance']} |")
open(os.path.join(OUT, "README.md"), "w").write("\n".join(I) + "\n")
print(len(ORDER), "explainers written to", OUT)
