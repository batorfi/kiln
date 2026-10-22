> Status: concept — **proposal** (2026-10-22) — **not admitted**. Integration directions accepted for a concept by
> human@batorfi on 2026-10-22; nothing is on the roadmap until a person admits it at a Roadmap gate. Zed's capabilities
> are as researched on that date.
> Type: concept
>
> Scope note: this doc describes how KILN can be integrated into the **Zed** editor so that software engineers stop
> switching between KILN's web front door and the code. It covers what Zed allows today, eight integration directions,
> the rules that keep an editor surface honest, a phasing, and how the same work carries to other editors.
>
> Companion docs:
>   - The web front door (the primary surface):  `web-front-door.md` · The user experience: `user-experience.md`
>   - The gate brief and moves:                  `user-experience.md` §8 · `the-flow.md`
>   - The CLI surface (WEB-6):                   `../prd/kiln-prd.md`
>   - Knowledge readable in editors:             `factory-wiki.md` §6
>   - Explore first:                             `code-exploration.md`
>   - Routers and egress:                        `model-routers.md`
>   - The rules:                                 `../../.specify/memory/constitution.md` (I, V, VII, VIII, IX)

# KILN — integrating with the Zed editor

## 1. In one paragraph

KILN's front door is where people decide; the editor is where they read code. Today an engineer reviewing a gate reads
the brief in the browser and the code in Zed, and carries the context between them by hand. **Zed is a natural second
home for KILN**: it speaks the **Agent Client Protocol (ACP)**, already lists the **Pi coding agent** — the substrate KILN
is built on — among its external agents, forwards **MCP** tools to every agent it runs, and opens any file at any line from
a link. Using only those open mechanisms, KILN can appear in Zed's Agent Panel, show its gate briefs with every citation
jumping to the code, put judges' findings on the lines they are about, give the engineer's own coding agent KILN's
knowledge, and — later — let a person decide the Code review gate where the code is. Zed stays **a surface, never a
source of truth**: the record, the gates and the rules do not move.

## 2. The context switch, and where it hurts

| Moment | What the engineer does today | What it costs |
|---|---|---|
| **Code review gate** | reads findings in the brief, then finds each file and line in the editor | the most expensive switch: dozens of jumps per review |
| **Verification gate** | reads failing requirements in the brief, opens the tests and the code under test | the same, plus terminal output |
| **Design and Work plan gates** | reads the design or plan, checks it against the current code | context lost between reading and checking |
| **Watching work happen** | follows a worker in the front door's live view, opens files to see what it changed | split attention |
| **Knowledge and exploring** | reads a module page or a tour in the browser, then navigates the code | every citation is a manual lookup |
| **Their own coding** | edits code with Zed's agent or another assistant that knows nothing about KILN's knowledge, territories or claims | duplicated understanding; avoidable conflicts with teammates' factories |

## 3. What Zed offers (October 2026)

| Mechanism | What it gives KILN | Limits |
|---|---|---|
| **Agent Client Protocol (ACP)** — JSON-RPC over stdio, Apache-licensed, co-developed with JetBrains | an agent thread in Zed's **Agent Panel** and Threads Sidebar: streamed messages, **tool calls with file locations** (Zed follows along), **diffs**, **plans**, **slash commands**, **permission requests**, **elicitation** (structured user input), **terminals**, session modes, resumable sessions | the panel is a conversation; an agent cannot draw a custom UI |
| **ACP Registry** | one-step install (`zed: acp registry`), or a custom `agent_servers` entry in settings | extension-provided agents are deprecated in favour of the registry |
| **MCP context servers** | tools and resources available to *any* agent in Zed — Zed's own, Claude, Codex — and forwarded to external agents over ACP | an engineer's agent may be cloud-hosted |
| **Extensions** (WebAssembly sandbox) | languages and **language servers**, themes, icon themes, debuggers, snippets, MCP servers; capabilities `process:exec`, `download_file`, `npm:install` | **no custom panels or webviews**, no arbitrary UI |
| **CLI and links** | `zed path:line:column` (1-based); `zed://`, `file://` and `ssh://` URLs | — |
| **Tasks, terminal, keybindings** | KILN's CLI (`kiln status`, `kiln needs`, `kiln gate`) runs in Zed's terminal; tasks and keys can be shipped as templates | — |
| **Collaboration** | channels and shared workspaces for working together | — |

**Two facts shape everything below.**

- **Pi is already a Zed agent.** Zed's documentation lists the *Pi Coding Agent* among its supported external agents, and
  several community ACP adapters for Pi exist (embedding the Pi SDK, or driving Pi in RPC mode). KILN builds on Pi, so a
  KILN agent in Zed follows a path that already works.
- **No custom panels.** KILN cannot embed its front door inside Zed. Everything goes through ACP, MCP, language servers,
  the CLI and links — which is also what makes it portable to other editors (§11).

## 4. Principles for an editor surface

| | Principle | Meaning |
|---|---|---|
| **Z1** | **A surface, never a source of truth** | Zed reads the same projections as the browser and the CLI and carries moves and commands into the same intake (Principle IX); stopping Zed loses nothing and settles nothing |
| **Z2** | **Decide only on the full brief** | a gate move is possible in Zed only after the full ten-part brief has been shown there (UX decision 4, BRIEF-2); a permission prompt or a summary is never a gate move |
| **Z3** | **One intake, one identity** | moves from Zed are bound to the state version they were made against, and `decided_by` comes from an authenticated session with the local front door — never from the request (WEB-2) |
| **Z4** | **Egress-aware** | ACP between Zed and KILN is local; anything KILN serves to an engineer's *own* agent (MCP) follows the factory's egress policy and is recorded (Principle VIII) |
| **Z5** | **Open protocols, no fork** | ACP, MCP, language servers, the CLI and links — no patched Zed, so the work carries to other editors |
| **Z6** | **Optional and additive** | the browser and the CLI remain complete surfaces; nothing requires Zed |
| **Z7** | **Read before write** | each direction ships read-only first; moves and steering come after the read-only surface has earned trust |

## 5. Integration directions

### D1 — Deep links both ways

**Front door → Zed.** Every citation KILN shows — in gate briefs, judges' findings, knowledge pages, tours, answers and
traces — gets an *Open in Zed* action that runs `zed <path>:<line>:<column>` (or a `file://` link) at the right place.

**Zed → KILN.** KILN ships **Zed task templates and keybindings**:

| Task | What it does |
|---|---|
| *KILN: needs* | `kiln needs` in Zed's terminal — everything waiting on you |
| *KILN: status* | `kiln status` for the factory of this repository |
| *KILN: open gate* | opens the front door (or `kiln gate`) at the current gate of the feature this branch belongs to |
| *KILN: ask about this file* | opens a KILN question about the current file and line |
| *KILN: open knowledge for this file* | opens the module page that covers the current file |

Cheap, useful on day one, and it works with `kiln-v1` as designed. The one hard question — *which checkout to open* — is
§6.

### D2 — KILN in Zed's Agent Panel (ACP)

A **KILN agent** in Zed, installable from the ACP Registry, built on the existing Pi ACP adapter path and talking to the
local front door through an authenticated session.

| In the KILN thread | Built on ACP's |
|---|---|
| **Talk to the director** (DIR-4) — *what is waiting for me?*, *why is r21 blocked?* — answered from the record with citations | message chunks; tool calls with locations |
| **Needs you and status**, with a notice when a gate opens or a policy stop arrives | user-facing notices; slash commands (`/needs`, `/status`, `/gate`) |
| **Gate briefs rendered in the thread** — all ten parts — where each citation is a location, so **Zed jumps to the cited code** as the engineer reads | message chunks; tool-call locations |
| **Diffs** in Zed's own diff view — the Code review diff, a work plan's changes, a split proposal | diff content |
| **Explore-first questions** — ask, trace, tour (`code-exploration.md`) | locations; plans for multi-step traces |
| **Risky-action approvals** (HITL-2) — a worker's held tool call | permission requests — the natural match |

**What D2 deliberately does not do at first:** gate moves. ACP's permission request is shaped like *allow / deny* for a
tool call; a gate move needs the full brief, a move kind from the closed set, and the state version. Moves arrive in D3.

### D3 — Decide where the code is: the Code review gate in Zed

The flagship experience — the moment that removes the most switching.

1. The KILN thread announces the open **Code review** gate and renders its **full brief**.
2. The feature's diff opens in Zed's diff view, on the factory's worktree (§6).
3. **Judges' findings appear on their lines** — as tool-call locations in the thread and, with D5, as diagnostics in the
   buffer — with severity and the reviewer's reasoning.
4. The engineer reads, jumps, runs a test in Zed's terminal, asks the director a question in the thread.
5. The move — `approve · revise · restart` — is made **in the thread** through ACP **elicitation**: a structured form whose
   options are the gate's move kinds, a required note where the flow requires one, and the brief's state version bound
   in. KILN's intake commits it exactly as a browser move: first move wins, stale moves refused, `decided_by` from the
   session.

The same pattern fits **Verification** (failing requirements next to the tests and the code under test, test output in a
terminal) and the **Implementation** gate (the split view). Gates whose evidence is mostly prose — Concept,
Specification, Documentation — gain less and can stay in the browser.

### D4 — A KILN MCP server for the engineer's own agent

Engineers will keep coding with Zed's agent, Claude, Codex or Pi itself. A **KILN MCP server** makes any of them aware of
what KILN knows:

| Tools | Resources |
|---|---|
| `kiln_knowledge_search` · `kiln_ask` (with citations) · `kiln_trace` · `kiln_module_for_file` · `kiln_claims_for_paths` (*is a teammate's factory building this?*) · `kiln_territory` · `kiln_preserved_behaviour` (from as-is specifications) · `kiln_status` | knowledge pages, specifications, the constitution, the factory's conventions |

- **Benefit:** the engineer's own changes respect the codebase's documented decisions and preserved behaviour, and
  overlap with a teammate's claim is visible before it becomes a merge conflict.
- **Egress (Z4):** if the engineer's agent runs on a cloud model, whatever the server returns leaves the machine through a
  channel KILN does not control. The server applies the factory's policy — restricted pages and paths withheld — and
  records what it served, to which client.
- Zed forwards configured MCP servers to external agents over ACP, so one configuration reaches every agent the engineer
  uses.

### D5 — Ambient awareness: a KILN language server

A **KILN language server** attached to the repository, shipped as a Zed extension, surfacing KILN's context in the code
itself while the engineer edits their own clone:

| Signal | Shown as |
|---|---|
| **Territory and claims** — editing a path a teammate's factory has claimed, or a protected path | a warning or hint, with who and which feature |
| **Knowledge on hover** — the module page, recovered decisions, the as-is specification of a function | hover |
| **Drift** — the knowledge page describing this code is stale | a hint |
| **Preserved behaviour** — lines pinned by characterization tests or as-is specifications | a hint or code lens |
| **Judges' findings** during an open Code review (D3) | diagnostics on the factory worktree's files |
| **Actions** — *Ask KILN about this*, *Propose as a candidate*, *Add to notebook* | code actions |

**To check:** attaching one language server to every language may need per-language settings in Zed; the extension can
ship them.

### D6 — Watching and steering the factory

- Open the factory's worktree **read-only** in Zed and **follow the worker**: ACP tool-call locations show where it is
  editing; ACP terminals stream its test runs.
- **Steer** a worker step (HITL-1) by sending a message in the KILN thread, recorded under the person's name. Judges
  cannot be steered, as everywhere else.

### D7 — Knowledge and specifications as Zed projects

The vault contract already makes every wiki readable in Zed (`factory-wiki.md` §6). KILN adds:

- a ready-made **Zed project** for each vault (and the workshop and team vaults), with a markdown language server that
  understands wikilinks for navigation, completion and broken-link warnings;
- **tours** as markdown whose stops are Zed-openable links;
- **Spec Kit** specifications, plans and as-is specifications edited in Zed with live preview, next to the code they
  describe.

Curators do their work in the editor they already use.

### D8 — Team review in Zed

A teammate's **required review** (TEAM-5) opens in a shared Zed workspace through Zed's collaboration channels: the
reviewer sees the diff and the brief, comments, and signs; KILN mirrors the signed review into the owning workshop's
record. The review stays a **person's evidence**, never a decision on the owner's behalf (Principle XII).

## 6. Which checkout? The worktree question

A factory works in **its own KILN-managed worktree**, one branch per feature; an engineer works in **their own clone**
(decision of 2026-10-21, `web-front-door.md` §12.7). A link from KILN must say which one it opens.

**Proposed default:**

| What the link points at | Opens | Why |
|---|---|---|
| work the factory produced — a gate's diff, a judge's finding, a worker's edit | the **factory's worktree**, read-only for people | it is what the gate is deciding on; the engineer's clone may not have it |
| knowledge, tours, traces, as-is specifications, explore answers | the **engineer's clone**, at the cited commit's path | it is where the engineer reads and works |

When the engineer's clone has drifted from the cited commit, the link says so (*this line has changed since the page was
written*) instead of silently opening the wrong code. People never edit the factory's worktree directly; steering goes
through the thread (D6), changes through a `revise`.

## 7. A day in Zed with KILN

1. **09:10** — Zed opens on the repository. The KILN thread shows: *Code review waiting on r21 (2 h), Verification on
   r23 failed after 2 fix rounds.*
2. **09:12** — `/gate r21`. The brief renders in the thread; the diff opens beside it. Three findings, each a location;
   Zed jumps to the first. The engineer runs the affected test in the terminal, asks the director *why was this cache
   introduced?* — the answer cites a recovered decision.
3. **09:31** — Two findings are real. The move form offers `approve · revise · restart`; the engineer picks `revise` with a
   note. KILN's intake commits it; the workers pick it up.
4. **10:05** — While coding their own change with their usual agent, the engineer sees a hint: a teammate's factory has
   claimed `src/billing/`. The agent, through KILN's MCP server, already knew and suggested touching the interface only.
5. **14:40** — A worker's risky action — adding a dependency — arrives as a permission request in the thread; the engineer
   allows it once. Recorded.

No browser tab was needed — and nothing about the gates, the record or the rules changed: the same moves, through the
same intake, by the same person.

## 8. How it is built

```
Zed ─┬─ Agent Panel ── ACP (stdio) ── kiln-acp ─┐
     ├─ any agent ──── MCP ─────────── kiln-mcp ─┼── authenticated session ── KILN server (front door):
     ├─ buffers ────── LSP ─────────── kiln-lsp ─┘                              read models · live push · move & command intake
     └─ terminal / tasks / links ──── kiln CLI ──────────────────────────────── (same intake)
```

- **`kiln-acp`** — a KILN agent built on the Pi ACP adapter path; a client of the front door's read models and intake,
  never a second factory. Registered in the ACP Registry.
- **`kiln-mcp`** — the knowledge and status tools of D4, policy-filtered, every response recorded.
- **`kiln-lsp`** — the language server of D5, shipped as a Zed extension.
- **Templates** — tasks, keybindings and per-vault project settings (D1, D7).
- In the codebase layout these sit beside `cli/` as an **`editor`** package, depending on `server`'s read models and
  intake — never on `durable` or `lane` directly.

## 9. How it fits KILN's rules

| Rule | In Zed |
|---|---|
| **IX** — one committed state; surfaces decide nothing | Zed shows projections and carries moves into the same intake (Z1) |
| **I and V** — a person decides; absence never approves | a closed Zed, a crashed adapter or a dropped session settles nothing; moves only by a person, on the full brief (Z2) |
| **VII** — everything recorded | moves, steering and approvals from Zed are events with the surface recorded (`via: zed`); MCP responses are recorded |
| **VIII** — local by default | ACP and the LSP are local; MCP to cloud agents is egress under policy (Z4) |
| **XII** — workshops are sovereign | team review in Zed is a person's signed evidence; it never decides the owner's gate |
| **The r9 decision** — the Pi-embedded terminal UI retired; the CLI is the terminal surface | different in kind: r9 was KILN *inside Pi's TUI*; this is an optional editor surface over open protocols, and the CLI stays the terminal surface |

## 10. Phasing

| Phase | Directions | Depends on | Fits |
|---|---|---|---|
| **1. Links and context** | D1 deep links and tasks · D7 knowledge and specs in Zed · D4 MCP server, read-only | r19 front door, r20 CLI gates, r23 knowledge | small; a candidate to land near the `kiln-v1` release |
| **2. KILN in the Agent Panel, read-only** | D2 — director, Needs you, briefs with follow-along, diffs, explore questions, risky-action approvals | r18, r20, r21 | early `kiln-v1.x` |
| **3. Decide where the code is** | D3 — Code review (then Verification, Implementation) with moves through elicitation · D6 follow and steer | phase 2; r20, r21 | `kiln-v1.x` |
| **4. Ambient and team** | D5 language server · D8 team review | r39 team space; Explore | later |

Each phase is one or more roadmap rows, proposed for a future Roadmap gate; none is admitted.

## 11. Beyond Zed

ACP is also supported by JetBrains IDEs, Neovim and Emacs, and MCP and language servers are editor-neutral. Built on those
protocols, **D2, D3, D4, D5 and D6 carry to other editors** with little change; only D1's tasks and D7's project templates
are Zed-specific. Zed is the first target because it is fast, already runs Pi as an agent, and its markdown handling fits
KILN's vaults — but the integration is an **editor surface**, not a Zed dependency.

## 12. Open questions

Each has a proposed default, to be confirmed when the first phase is admitted.

1. **Moves from Zed** — propose them (D3) once the read-only surface is proven? *Proposed: yes, phase 3, Code review
   first.*
2. **Checkout mapping** — *proposed:* factory worktree for factory-produced work, the engineer's clone for knowledge (§6).
3. **Positioning** — *proposed:* Zed first, built on editor-neutral protocols (§11).
4. **Roadmap** — *proposed:* phase 1 as a small candidate near the `kiln-v1` release; phases 2–4 in `kiln-v1.x`.
5. **Identity** — how `kiln-acp` authenticates to the front door: the per-launch secret handed over by `kiln serve`, or a
   per-user token in the OS keychain?
6. **MCP clients** — should the MCP server serve every client, or only those the workshop has allowed?
7. **Elicitation support** — confirm that Zed renders ACP elicitation forms well enough for gate moves; if not, phase 3
   falls back to *Open the move in the browser* with the brief already read.

## 13. Sources

Retrieved 2026-10-22.

- Zed — [external agents](https://zed.dev/docs/ai/external-agents) · [extensions](https://zed.dev/docs/extensions) ·
  [extension capabilities](https://zed.dev/docs/extensions/capabilities) · [CLI reference](https://zed.dev/docs/reference/cli) ·
  [Agent Client Protocol](https://zed.dev/acp) · [Pi agent](https://zed.dev/acp/agent/pi) ·
  [blog: Codex is live in Zed](https://zed.dev/blog/codex-is-live-in-zed) ·
  [blog: bring your own agent](https://zed.dev/blog/bring-your-own-agent-to-zed)
- ACP — [protocol overview](https://agentclientprotocol.com/protocol/overview) ·
  [introduction](https://agentclientprotocol.com/overview/introduction) ·
  [Tessl on ACP](https://tessl.io/blog/zed-debuts-agent-client-protocol-to-connect-ai-coding-agents-to-any-editor) ·
  [MorphLLM: ACP explained](https://www.morphllm.com/agent-client-protocol)
- Pi ACP adapters — [victor-software-house/pi-acp](https://github.com/victor-software-house/pi-acp) ·
  [svkozak/pi-acp](https://docsearch.algolia.com/mcp/docs/repo/svkozak/pi-acp) ·
  [@geohar/pi-acp](https://pi.dev/packages/@geohar/pi-acp) · [pi-acpinator](https://docs.rs/pi-acpinator/0.1.0)
- Zed in 2026 — [toolchew review](https://toolchew.com/en/review-zed-2026/) ·
  [extension API discussion #53131](https://github.com/zed-industries/zed/discussions/53131) ·
  [discussion #50999](https://github.com/zed-industries/zed/discussions/50999) ·
  [Releasebot: Zed updates](https://releasebot.io/updates/zed/zed)
