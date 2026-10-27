# KILN vocabulary

A reference for engineers who are new to KILN: every term the product, the docs and the code use, defined once, in plain words, with a pointer to where it lives. Read §0–§1 first (five minutes); use the rest as a dictionary (the index at the end lists every term alphabetically).

**How to read an entry.** *Term* — what it means. **In code** says where it appears as a name or type in `kiln/`. **See** points to the document that explains it in depth. Where one English word means two different things in KILN, the entry says so, and §14 collects them.

**Sources.** The [constitution](../.specify/memory/constitution.md) (the law), the [PRD](./prd/kiln-prd.md) (requirements), the concept set in [`docs/concepts/`](./concepts), the [roadmap](../specs/ROADMAP.md), and the code in [`kiln/`](../kiln). Where this page and one of them disagree, they win — and the page has a bug.

---

## 0. The model in one minute

```
 a PERSON (the decider) ─────────────────────────────────────────────────────────────┐
        ▲  waits for you at every GATE; nothing is approved by absence               │ makes a MOVE
        │                                                                            ▼
 ROADMAP ──▶ ROW (a feature) ──▶ FLOW: Roadmap gate · Concept · Architecture · … · Merge
 (ordered      │                       each GATE = a durable TASK that WAITS, with a BRIEF
  program)     ▼                       settled only by a committed MOVE (first move wins, keyed, once)
          STEPs of work done by ROLES on MODELS, one at a time on the single LANE
          (producers make artifacts · JUDGES check them and give evidence · the person decides)
                                                  │
        everything that changes is a COMMIT that also writes its RECORD entry (the outbox)
        ▼
 DURABLE CORE (Pi Durable behind ONE seam): tasks · checkpoints · documents · one OWNER per store
```

KILN is a **local software factory you own**: agents work, independent judges check, **people decide at every gate**. Six sentences carry the whole design:

1. A **feature** (a *row* of the roadmap) walks a fixed sequence of **gates**; the standard flow has twelve.
2. A **gate** is a durable task that **waits** for a person; only a **move** can settle it — never a clock, a restart, a crash or an absent screen.
3. **Producers** make artifacts, **judges** check them and report **evidence**; a judge never decides, and no model ever approves its own work.
4. The **lane** runs **one generation at a time** per factory, so one model is resident and swaps are counted and priced.
5. Every state change is an **atomic commit** that carries its own **record** entry, so state and history never disagree.
6. Everything durable goes through **one seam**, and everything that can be killed is **proven** by killing it.

---

## 1. The product and its place

**KILN** — the product: a spec-driven, multi-agent development *factory* that runs on local models, with a local web front door, built on a durable substrate. The name is the kiln's: it fires one batch at a time, in a single chamber, and holds heat between firings. **See** [kiln-analogy](./concepts/kiln-analogy.md), [vision](./concepts/vision.md).

**Factory** — one roadmap, one lane, one durable store, one record, one wiki. The unit that builds software for one repository. A factory can move between hosts without losing a step or a waiting gate.

**Workshop** — where *people* work: the web front door, the people and policies, the inbox of what needs them. One workshop can see many factories. Distinct from the factory (where the *work* happens).

**Host** — a machine that factories run on (your laptop, a team GPU server, a VM, a container). KILN remains software you run yourself; "anywhere" means anywhere *you* choose. **See** [factories-anywhere](./concepts/factories-anywhere.md).

**Local by default** — nothing leaves the machine unless a person's policy says so (constitution VIII). The owner's only IPC is a private local socket; the network lint refuses network calls in KILN's source.

**Pi** — the open-source coding-agent harness (`pi.dev`) the first program was built as an extension of. **Pi Durable** — the TypeScript runtime of long-running agents and durable tasks that the *new* KILN is built on; every model turn, tool call and piece of state is committed to local storage before anything is shown, and a restarted process resumes where it stopped. KILN reaches it only through the **seam**. **See** [pi-durable](./concepts/pi-durable.md).

**`kiln-v1`** — the deliverable: the new KILN as the roadmap defines it (rows r12–r52+). **`kiln-v1.x`** — what comes after. **See** [kiln-v1 explainer](./architecture/explainers/kiln-v1.md).

**Legacy / the first program** — rows r1–r11: KILN as a Pi extension with a terminal UI. Frozen byte-for-byte in `legacy/` and still tested; the new code never imports it. **In code:** the `legacy` check compares its tree id with a recorded baseline.

**Spec Kit** — the toolchain (`/speckit-*` commands) that produces a feature's specification, plan and tasks as files under `specs/NNN-name/`. KILN adds the concept, the design and the judges' reports.

**Front door** (web front door) — the local webapp, served on loopback, through which people see the roadmap, the lane, every gate brief and the record. A surface; never a source of truth. **See** [web-front-door](./concepts/web-front-door.md).

---

## 2. People, roles and who may decide

**Person / decider** — the human who makes a move. Every move names one (`decidedBy`); a move with no decider is refused. **In code:** `Move.decidedBy`.

**Role** — a named function in the factory (researcher, designer, worker, reviewer…) defined as a *file* and bound to a model by a *tier map*. A role runs as a durable conversation.

**Producer** — a role that makes an artifact (concept writer, architecture designer, ux designer, worker, techwriter, PR writer, feature-size triage…). **Judge** — a role that examines an artifact and produces *evidence* (architecture critic, design critic, code reviewer, UI reviewer, verifier). **In code:** `RoleRoster { judges, producers }` in `packages/contracts/src/flow/types.ts`.

**Author / judge separation** — constitution I: no role, including the director and planner, decides the gate its own artifact feeds. A producer makes; a judge examines; **the deciding move is always a person's**.

**Evidence** — what a judge or check produces: a verdict and findings. Evidence informs the person; it is never a decision.

**Director** — the deterministic orchestrator that executes a feature's flow: it creates the row task, schedules steps one at a time on the lane, applies each move. It never writes code and never decides a gate. **Planner** — the role (a step) that *drafts* roadmaps and plans; its drafts are checked and labelled before a person sees them. **See** [the-director](./concepts/the-director.md).

**Worker** — a producer role that does the implementation steps. **Critic / reviewer / verifier** — the judges at Architecture, Code review (and UI review) and Verification.

**Triage** — the first step of a feature: judges size and clarity and may **skip** Concept and Architecture for small, well-scoped features. The skip is recorded and shown in every later brief. A flow may forbid it (`no_triage_skip`). Nothing else can skip a gate.

**Delegation** — a *recorded* grant, made by a person at the Specification gate, that lets the gates after it settle on a clean path without that person. A gate settled this way is *approved under delegation*: the move names the delegation, never a person. Never reaches the Roadmap gate; never inferred from absence. **Unattended tail** — the stretch of gates a delegation covers (Work plan through Documentation by default; Merge only if explicitly included; UI review is not delegable by default). Any objection — a critic's objection, a reviewer `restart`, a verifier `reject`, a proposed split, a reached budget — **ends the delegation**: that gate and all after it wait for a person.

**Needs you** — the one place that lists everything waiting on a person (gate decisions, risky-action approvals, policy stops, questions from steps, team requests, optional suggestions), separating what *blocks* from what is *optional*. If Needs you is empty, nothing is waiting on you. It never decides anything. **See** [the-director §5](./concepts/the-director.md).

**Steering** — telling a working author how to proceed, approving or refusing a held risky action, or adding a research step. None of these is a gate move; all appear in the next brief's provenance. Judges are never steered.

**Decider (team sense)** — a person named in a workshop's policy as allowed to decide a class of gate or to approve the experience charter.

---

## 3. The program: roadmap, rows, flows

**Roadmap** — the ordered **firing program**: a list of feature rows with dependency edges and a topological order. The lane fires exactly **one row at a time**; when a row merges, the director *proposes* the next but it never auto-starts — a person re-admits at the Roadmap gate. **In code:** `specs/ROADMAP.md` (a JSON head validated by a schema, plus a human table). **See** [roadmap](./concepts/roadmap.md).

**Row / feature** — one roadmap item, walked through all the gates. "Row" is the roadmap field and id vocabulary (`r13`); "feature" is what people say. A row's status: **`queued`** (waiting for its own first gate), **`approved`** (the program as a whole), **`done`** (merged, with `outcome: @PR#N`).

**Firing** — one row's complete walk; a *firing program* is the ordered set of firings. (From the kiln analogy.)

**Roadmap gate / gate0** — the gate *above* the lane, not one of the feature gates: a person admits **one** next feature and decides how the factory runs (profile, egress policy, budget, placement, the feature's flow). Human-only, always (constitution VI). It re-opens after every merged or abandoned feature. Its moves include the row edits `edit-rows`, `add-row`, `drop-row`. **In code:** gate key `"gate0"`; the roadmap task holds it and has *no delegation field by construction*.

**Admission** — the Roadmap-gate act of letting one feature in. Approving admits one feature only; there is no chaining.

**Flow** — the gates a feature passes. **Default flow** — the twelve gates below. **Flow version** (`v1` | `v2`) — `v1` is the first program's ten gates (the Roadmap gate + 1…9); `v2` is the standard twelve (adds Experience design and UI review). **Added gate** — a team-defined gate (security review, threat model…) included in a flow: a durable task with the same contract, the same ten-part brief and moves from the same closed set. **See** [extensible-flow](./concepts/extensible-flow.md). **In code:** `FlowDefinition` in `packages/contracts/src/flow/`.

**The standard gates (flow v2)** and their questions:

| Phase | Gate (key) | The question |
|---|---|---|
| program | **Roadmap** (`gate0`) | Which feature next, in what order — and how does this factory run? |
| contract | **Concept** (`1-concept`) | Is this worth building, on these premises? |
| contract | **Architecture** (`2-architecture`) · *judged* | Is this the right structure? |
| contract | **Experience design** (`2a-experience`) · *judged · when the feature touches the interface* | Is this the right experience, within the charter? |
| contract | **Specification** (`3-spec`) | What exactly counts as done? |
| contract | **Work plan** (`4-plan`) | In what pieces and order will it be built? |
| build and prove | **Implementation** (`5-checkpoint`) | Do we start from a safe point — and is this still one feature? |
| build and prove | **Code review** (`6-review`) · *judged* | Is the code right, measured against the specification? |
| build and prove | **UI review** (`6a-ui-review`) · *judged · when the feature touches the interface* | Does the built interface match the approved experience? |
| build and prove | **Verification** (`7-verification`) · *judged* | Does it actually work as specified? |
| release | **Documentation** (`8-docs`) | Do the docs describe what was built? |
| release | **Merge** (`9-pr`) | Do we ship it? |

**Phase** (of a gate) — `program`, `contract`, `build-and-prove` or `release`. **Judged gate** — a gate with a judge role (2, 2a, 6, 6a, 7).

**Applies-when / not applicable** — Experience design and UI review carry a deterministic `applies_when` rule (paths, labels, charter journeys, diff signals; never an LLM). A gate that does not apply is recorded as **not applicable** with its reason: not a skip, never settles by itself, shown in every later brief.

**Restorable commit** — the safe point the Implementation gate establishes; a Code review `restart` rebuilds from it. **Split+revise** — at Implementation, shrink the feature and turn the remainder into a new roadmap row.

**Re-crossing** — when work goes back to an earlier gate, every gate after the target opens again; gates are never carried across a change they did not see.

**Walk** — informally, a feature's passage through its flow (the *headless walk* of r14 drives it without a screen).

**Constitution** — the project's law: twelve principles (§12) plus the flow, the experience charter, roles and model tiers, dependencies and governance. Non-negotiable in design and review. **See** [`.specify/memory/constitution.md`](../.specify/memory/constitution.md), [explainer](./architecture/explainers/kiln-constitution.md).

---

## 4. The gate contract — the words of the durable core

These are the exact words the code uses (`kiln/packages/durable/src/types.ts`). **See** the [gate contract](../specs/011-durable-core-gate-contract/contracts/gate-contract.md) and [technical overview](../specs/011-durable-core-gate-contract/overview.md).

**Gate** — the moment KILN hands a decision to a person and **waits**. In the durable core a gate is *two tasks*: `kiln.gate` (what other tasks wait on; a projection that converges) and its `kiln.decision` task (whose single step waits for the move). While waiting, a gate runs no code, holds no model and has **no timer**.

**Gate id** (`GateId`, a string) — supplied by the caller, deterministic: `gate:<feature>:<gateKey>:<round>`, e.g. `gate:demo:gate0:1`. So re-opening is a keyed repeat. **Gate key** (`GateKey`) — which gate of the flow it is (`"3-spec"`…), distinct from the *gate id* and from an *idempotency key*. **Round** — the n-th time the same gate of the same feature opens (after work went back).

**Opening a gate** (`open`) — one atomic commit of the **gate document**, the **brief as shown** and a `gate.opened` outbox entry (plus the gate and decision tasks). After any crash the gate is *absent or whole*, never a gate document without its brief. **In code:** `gates.open(key, spec)`; `GateSpec { gateId, gateKey, flow, brief, openedBy }`.

**Brief (gate brief)** — the full context presented with a gate, in **ten parts** (where you are; what you're deciding; what was produced; what it's measured against; whether it's right; what should worry you; who did it and how; how we got here; what you can do and what then happens; what else you may do first). Assembled from committed facts before the gate may wait; honest about gaps; never recommends a move; **recorded as seen** with the move. **See** [the-gate-brief](./concepts/the-gate-brief.md). In r13 the brief is opaque JSON. Not to be confused with the *product brief* (greenfield) or a *roadmap brief* (§14).

**Brief ref (`briefRef`)** — the sha-256 of the brief's canonical JSON: the brief's identity. A move must carry the ref of the brief the gate was opened with — "the move names the brief it was decided on" is an equality of two hashes. A move naming no brief, or another one, is `invalid-move`.

**Move** — a person's decision at a gate: `{ kind, decidedBy, briefRef }`. **Move kind** — the fixed meaning behind a move; a **closed set** (teams relabel kinds, never add one):

| Kind | Meaning |
|---|---|
| `approve` | accept; the work goes to the next gate |
| `revise` | send the artifact back to its author with a note (conversation kept) |
| `reject` | discard and redo with a fresh author — at this gate or an earlier one the note names |
| `restart` | (Code review / UI review) rebuild from the restorable commit with the findings |
| `split+revise` | (Implementation) shrink the feature; the rest becomes a new row |
| `mitigate` | an *automatic* fix round at Verification (up to the cap), applied before a person decides |
| `edit-rows` · `add-row` · `drop-row` | Roadmap-gate row edits |

**Move vocabulary** — the kinds a given gate allows, copied into the gate document **as of opening** (so later flow edits don't change an open gate). A kind outside it is `invalid-move`.

**Move record** (`kiln.move`) — the *one* document written when a move commits: kind, decider, brief ref, key, time. At most one per gate.

**Settled / waiting / unknown** (`GateState`) — **waiting**: open, no move record. **Settled**: exactly one move record exists (and the decision is terminal). **Unknown**: no such gate. State is *read from the store, never from memory*. "Settled" is defined by the record; the gate *task* is a projection that converges a moment later (it may lag across a restart).

**Headless** — no screen attached. Headless means **waiting**: the same state, recorded the same way; absence never approves (constitution V).

**First move wins** — among racing moves exactly one is `committed`; every other is refused and the refusal names the winner. No clock decides.

**Idempotency key (`Key`)** — a caller-chosen string (≤ 200 chars) identifying *one submission* of a command or move. Same key + equal request → the *first outcome again* (`repeat`); same key + different request → `key-conflict`. It is what makes "retry" safe. (Not a gate key, not a cryptographic key.)

**Outcome** (`Outcome`, `OpenOutcome`) — what a submission returns: `committed`, `repeat`, or a `refused`. A **closed vocabulary**; r13 added no new refusal code:

| Outcome | Meaning |
|---|---|
| `committed` | the move is **durable** (acknowledged only after the commit) |
| `repeat` | same key, equal request: the original outcome, naming the original record; nothing written |
| `refused: lost-race` | another move settled the gate while this one waited; names the winner |
| `refused: stale` | the gate was already settled when this arrived; names the winner |
| `refused: key-conflict` | same key, *different* request; names the original key |
| `refused: invalid-move` | no decider · kind outside the vocabulary · missing/other brief ref · malformed key |
| `refused: unknown-gate` | no such gate id |
| `refused: not-ready` | the owner has just started and isn't accepting moves yet — **transient: retry the same key** |
| `refused: store-error` | the commit failed (real or injected): nothing was stored; the same key can be retried |

**Refusal** (`Refusal`) — an outcome that says "no" and **never changes the store**. A refusal is a *value*, not an exception.

**Outcome unknown** — what a *client* concludes when the owner's reply never arrived (connection lost, or no answer in 5 s): reported as `refused(store-error)` with `detail: connection-lost | timeout`. The move may or may not have committed; **retry the same key** — exactly-once makes that safe. CLI exit code 4.

**Committed means durable** — a `committed` answer is given only after the commit is on disk. **Power-loss boundary** — what is *not* covered: loss of host power may lose the newest commit (process death — SIGKILL, crash — *is* covered). Stated in the durable README.

**Exactly once** — the guarantee that a command or move takes effect once however many times it is sent, before or after any restart (§5 *command ledger*).

---

## 5. The durable core

**Durable** — state that survives process death: committed to local storage *before* anything acts on it or shows it.

**Task** — the unit of durable work in the runtime: has a kind, an input, an owner (the factory or another task), a status (`pending · running · waiting · sleeping · completing · terminal`), a **checkpoint** and, when terminal, an **outcome** (`completed · aborted · failed`). **Task kind** — a definition: a name, a version, its phases and how it aborts. **In code:** `TaskKind`, `defineKilnTask` in `store.ts`.

**The six KILN task kinds** — `kiln.roadmap` (holds the Roadmap gate; settles only through a person's move), `kiln.row` (the shell of one feature; owns its units), `kiln.unit` (one step of work), `kiln.gate`, `kiln.decision` (the gate's waiting step), `kiln.lane` (the factory's one lane). Roadmap, row and unit are *shells* with scripted work in r13; real behavior arrives in r14/r16/r18. **See** the explainers: [overview](./architecture/explainers/kiln-task-kinds/README.md) · [roadmap](./architecture/explainers/kiln-task-kinds/roadmap.md) · [row](./architecture/explainers/kiln-task-kinds/row.md) · [unit](./architecture/explainers/kiln-task-kinds/unit.md) · [gate and decision](./architecture/explainers/kiln-task-kinds/gate.md) · [lane](./architecture/explainers/kiln-task-kinds/lane.md).

**Task outcome vs. port outcome** — a task *ends* with an outcome (`completed`/`aborted`/`failed`); a gate/command *submission* returns an Outcome (`committed`/`repeat`/`refused`). Different things (§14).

**Checkpoint** — the small piece of state a task stores at each commit so a restart resumes from it, not from scratch. E.g. a unit's `{ phase: "work", done: 2, results: [...] }`. **Phase** (of a task) — a named stage with one handler; the checkpoint says which phase and how far.

**Resume** — after any restart, every live task continues from its last checkpoint; a waiting gate resumes *waiting*; a half-done step's work is redone and its result committed once. **Half-done never commits** — a step killed before its commit leaves no result, only its previous checkpoint.

**Step** — one piece of work by one role (a gate's work is several steps). In code a step is a **unit** (`kiln.unit`): user-facing "step", code-level "unit". A scripted unit's checkpoint counts steps done; its **result is committed once, at the end**.

**Commit** — one atomic write to the store: documents, new tasks and the task's own next state, all or nothing. Every KILN state change is a commit. **Transaction (`Tx`)** — what a commit's body can touch: read/write documents and create tasks, nothing else (no clock, no sleep, no other task's state).

**Document / document family** — typed JSON committed atomically with tasks. KILN uses families: `kiln.store` (store identity and library version), `kiln.gate`, `kiln.brief`, `kiln.move`, `kiln.command` (the ledger), `kiln.lane`, `kiln.outbox`. Held in the **root conversation** (the runtime's one always-present container). Documents are not transcripts; they're state.

**Command** — an operation invoked from outside that changes the factory (create a task, open a gate, submit a move). Every command carries an idempotency key. **Command ledger** (`kiln.command`) — per key: the request hash and the first outcome, written *in the same commit as the effect*, so a command either happened and is remembered or didn't and isn't. **Request hash** — sha-256 of the canonical JSON of kind + request: how "same key, different request" is detected. **Key retention** — a key lives as long as the thing it created exists in the live store; an archive may drop a key only with what it created. **In code:** `runCommand` in `commands.ts`.

**Canonical JSON** — a deterministic serialization (sorted keys, no whitespace variance) used before hashing, so equal content always has the same hash.

**Draft / plain copy** — the runtime hands documents out as drafts that become unusable once settled; the seam copies through `plain()` at commit boundaries.

**Seam** — the single KILN module (`packages/durable`, library access only in `src/library/`) through which the runtime is reached. The contract is written in KILN's words so it outlives the runtime's API; a boundary check, a directory test and a declarations scan enforce it (SC-010: **0** library names in public types). **Library / runtime** — Pi Durable, in this document.

**Store** — one SQLite database per factory (via Node's built-in `node:sqlite`, experimental and *accepted, recorded and canary-tested*). **Store version / contract number** — the library version and contract recorded in the commit that creates the store; `openFactory` compares it with the installed version **before resuming any task** and refuses a mismatch by name (FR-047).

**Factory (the object)** — what `openFactory` returns: `gates`, `tasks`, `commands`, `inspect`, `serve`, `ready`, `close`. **Ready** — resolves when every live decision step has re-registered and no gate task is ready or running; before then mutating calls answer `not-ready`. Bounded at 5 s; measured at 42 ms for 100 gates + 20 units.

**Slot** — the owner-memory rendezvous a waiting decision step parks on; a move wakes it. Memory by design and **never the truth** — answers are judged against the stored record.

**Restart limit / crash-loop guard / parked** — the runtime can park a task that crashes too often. KILN sets `restartLimit = Infinity` where the runtime is opened, so a waiting gate is **never parked** by repeated crashes (constitution V; found in the r42 spike). A **report** is what the runtime says when it does park or fault a task; it must stay empty.

**Owner** — the single process that has opened a store: holds the lock, serves the channel, runs the tasks. Exactly one per store. **Completer** — anything that settles a gate from outside the owner (the CLI, later server workers); reaches gates *only through the owner*, never by opening the store.

**Owner lock** (`owner.lock`) — a tiny separate SQLite database beside the store with one row `{pid, host, startedAt, socket}`; taking it is one `BEGIN IMMEDIATE` transaction. A live pid on this host is **refused, never stolen**; a lock of another host is never taken; a dead pid's lock is taken over atomically; a clean close empties the row. A refused start throws `StoreOwned` naming store, pid, host and socket.

**Channel** — the owner's private local interface: a Unix-domain socket at `<tmp>/kiln-<uid>/<sha1(realpath store)[0..8]>.sock` (directory `0700`, socket `0600`), newline-delimited JSON, five operations: `ping`, `ready`, `gate.open`, `gate.move`, `gate.state`. **Never a network port.** **Safe-directory rule** — the socket directory must be a real directory (no symlink), owned by the current user, mode exactly `0700`, else `ChannelUnsafe`.

**`kiln owner` / `kiln gate open|move|state`** — the thin command line over the channel. One JSON line out; exit **0** any *answered* request (a refusal is an answer), **2** usage, **3** owner unreachable, **4** outcome unknown. `kiln check` is separate.

---

## 6. The record, events and the outbox

**Record** — everything that happened, in order: the factory's append-only event stream, the single history from which every view is built. User-facing "record", internal "event stream". Arrives fully with r15. **See** [the-record](./concepts/the-record.md).

**Event** — one fact in the record, in a CloudEvents-shaped **envelope**: `id`, `seq` (gap-free order), `type`, `schema`, `time`, `subject`, **`actor`** (who: `human:<id>`, `director`, `role:<name>@<model>`, `delegation:<ref>`, `system`), `correlation`, **`causation`** (the event that led here), `trace`, `privacy`, `data`. Invalid events fail their commit.

**Outbox / transactional outbox** — the append-only document where a state change writes its event *in the same commit as the change*. State and event exist together or neither does; a **dispatcher** later reads the outbox in commit order. In r13 it is `kiln.outbox` with entries `{seq, type, subject, at, actor, cause, data}` — the seed r15 adopts without migration. **Outbox entry types now:** `gate.opened`, `move.committed`, `gate.settled`, `lane.acquired`, `lane.released`, `lane.swapped`. Every entry **must** have a non-empty actor and cause (constitution VII).

**Actor / cause** — who did it (a person, a task like `task:11`, `factory`) / what caused it (a command key, a move key, `restart`).

**Projection** — a view built *from* the record (a read model, an insight, a dashboard). Disposable and rebuildable; the record is the truth. The **gate task** is a projection of the move record.

**Catalog** — the list of event types. **Upcasting** — evolving an event schema by transforming old events on read; stored events are immutable.

**Telemetry** — observability spans/metrics; *not* the record.

---

## 7. The lane and models

**Lane** — the factory's single execution lane: at most **one running generation** per factory at any instant (constitution III). **Lane task** (`kiln.lane`) — the factory's one standing task for it. The lane's stored facts: **lease**, **resident model**, **hold flag**, **swap count** (document `kiln.lane`). **See** [the lane in the overview](../specs/011-durable-core-gate-contract/overview.md).

**Generation** — one model run (a turn or a batch of turns) on the lane. In r13 generations are *scripted* — no real model is loaded.

**Lease** — the lane's grant to one step (`{holder, since}`); `acquire` waits its turn (FIFO), `release` gives it back. After a restart a lease left by a dead generation is **released at start** with a `lane.released` entry (actor `factory`, cause `restart`).

**Resident model** — the model currently loaded. **Swap** — replacing a resident model with a different one; counted only on a genuine change (the first load and "same model again" are not swaps). **Swap count** — how many. **Hold flag** — for Architecture, Code review and Verification, the judge's model stays pinned between work and verdict (and across fix rounds) so the same judge sees every attempt. A gate *waiting* for a person never holds the lane.

**Affinity (scheduler)** — the rule that a swap happens only on a genuine tier change, so model changes are priced and recorded. The pure logic lives in `packages/lane/src/affinity.ts`. **Model pool** — a host's resident set within a memory budget; **residency** — KILN (not Ollama) owns load, pin and unload (r16).

**Tier** — `strongest · standard · cheap · per-task`: how a role is bound to a model. **Tier rule:** judges bind **only** to `strongest` (a weaker binding is a configuration error, `TierPolicyError`); producers use the cheapest model the gate on their far side can bound; triage may be cheap because a person's gate bounds it. **Ollama** — the local model runner KILN fronts.

**Egress policy** — what may leave the machine (providers pinned, data collection denied, everything that leaves recorded); decided at the Roadmap gate. **Hybrid deployment** — judges on a frontier model remote, workers local; trades "the material judges read leaves the machine" for stronger judges. **See** [hybrid-deployments](./concepts/hybrid-deployments.md).

---

## 8. The proof — how the guarantees are attacked

KILN does not claim a guarantee it has not tried to break. These are the words of the proof (`kiln/packages/durable/tests/proof/`).

**Kill point** — a named step in the product where a test may end the process (`open.begin`, `move.commit-after-write`, `gate.wake`, `unit.step-after-work`, `lane.acquire-committed`, `recover.start`…). Declared in `hooks.ts`; a static test keeps the declared list *equal* to the names the source uses. **Fault point** — a named place where a store failure can be injected (`store-write`). **Hook** — the injected object (`at(point)`, `fault(point)`) the product calls at those places; the default does nothing. **No environment variable under `src/` can kill or fault a factory**; only the test-only child owner arms a point.

**SIGKILL** — the abrupt kill: no handler, no flush, no close — exactly how a crash looks to the store.

**Child owner** — the test-only process that runs an owner and a script of steps and can be armed to die at a point. **Harness** — the test support that starts/kills/restarts owners on a scratch store.

**Wreck / wreckage** — the store as a kill leaves it. **Fresh reader** (`inspectStore`) — reads a store with *no owner* and no task machinery; what a test judges is the store, never the owner's memory. **Inspection** — what it returns (gate state, documents, records, outbox, timers, commands, lane).

**Oracle** — the invariants applied to an inspection. **I1** a waiting gate has no move record · **I2** a settled gate has exactly one record and its decision terminal with that record's key · **I3** nothing half-applied (record without completed decision and vice versa; gate without brief or `gate.opened`; record without `move.committed`; terminal gate task without `gate.settled`) · **I4** at most one record/gate document per id · **I5** a settled gate stays settled across restarts · **I6** a waiting gate stays waiting and is never parked · **I7** no timer, sleep or deadline · **I8** the lane never records two holders (checked as a running balance over ordered entries) · **I9** a command key has one outcome and one request hash.

**Never vacuous** — a proof that exercised nothing proves nothing: a run with zero kill points, none fired, or a declared point that never fired **fails by name** and prints `exercised N of N`. **Negative control / broken-gate control** — a deliberately half-applying gate kept in the tests' support code that the oracle *must* flag, proving the proof can fail. **Mutation check** — sabotage the product (skip the brief check, judge repeats by memory, un-settle on restart, restore the library's default restart limit…), confirm a named test fails, undo and verify the tree is clean.

**Restart storm** — ≥ 7 consecutive kills with no move (more than the runtime's own limit of 5): the gate is still waiting, nothing parked. **Random kills** — 300 kills at random instants (seeded). **Clock proof** — a ±10-year clock jump and real elapsed time settle nothing; the store holds 0 timers.

**Separate-process completer** — the same exactly-once and kill-point cases driven through `kiln gate …` instead of in-process.

**Canary** — a test that fails loudly, by name, if an assumption about the platform (Node's built-in SQLite) stops being true. **Floor matrix** — the suite and `kiln check` run on the lowest supported Node versions (22.19.0, 23.6.0, 24.1.0) and the installed one. **Baseline** (`baseline.md`) — measured readings recorded per phase.

**Spike** (research sense) — a time-boxed, ungated experiment that ends in a measured report and a verdict; **r42** was the spike that decided the durable core could be built (verdict `go`). **Planted violation** — a deliberately wrong file placed in a copy of the tree to prove a check fails on it.

---

## 9. The codebase and its checks

**Package layout (`kiln/packages/`)** — layered; the arrow means "may import":

| Package | Responsibility |
|---|---|
| `contracts` | pure types, gate ids, move kinds, flow and role data, schemas — no I/O |
| `record` | validators, report formatting; the event stream itself arrives with r15 |
| `durable` | **the seam**: gate contract, task kinds, ledger, owner, channel |
| `lane` | the lane task (lease, resident model, hold, swaps) + the pure affinity logic |
| `workers` | role conversations on models; the only importer of the model library *for model calls* |
| `director` | deterministic flow orchestration and checked planner drafts (r18) |
| `server` · `web` | the loopback front door and its assets (r19) |
| `cli` | the `kiln` command line (`check`, `owner`, `gate`) |
| `checks` (in `kiln/checks/`) | the three static checks |

**Layer rule** — dependency direction is declared in `kiln/checks/boundaries.json`; e.g. `lane → durable` is allowed, `durable → lane` is not, which is why the lane is injected into durable as a **port** (`LaneApi`).

**Port** — a small interface one package defines and another implements (`LaneApi`: `start`, `acquire`, `release`), injected through options, so the layers stay one-directional.

**`kiln check`** — three static checks, each **never vacuous**: **`network`** (no network call or import in KILN source; `node:net` allowed only in two listed channel files, on a socket *path*), **`boundaries`** (layer direction, `node:` built-ins, bare specifiers, legacy imports, responsibilities, pinned dependencies, the one external seam), **`legacy`** (the `legacy/` tree is byte-identical to its recorded baseline). **Local-IPC allowlist** — `checks/local-ipc.json`.

**External seam** — a dependency declared in `boundaries.json` as reachable from one named package only. **Pin** — an exact version (no `^`, `~`, tag). **Lockfile** — the committed `package-lock.json`. **`DEPENDENCIES.md`** — the recorded decision: each dependency's version, integrity, licence, reason and seam, plus the `node:sqlite` posture and the upgrade rule ("a deliberate, recorded change with its own row and review"). A test keeps it equal to `package.json` and the lock.

**Floor** — the minimum Node (`^22.19.0 || >=23.6.0`). **Type stripping** — Node runs TypeScript directly with no build step; so no enums, namespaces or constructor parameter properties. **Import map** — `#durable/…`, `#contracts/…` aliases in `package.json`.

**Row (spec sense)** / **Spec directory** — a Spec Kit feature directory `specs/NNN-name/` with `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`, plus KILN's `baseline.md`, `notes.md`, `overview.md`.

---

## 10. Knowledge, the bench and the surfaces

**Wiki (factory wiki / workshop wiki)** — LLM-written, person-curated interlinked markdown pages (a plain Obsidian vault) that inform decisions and are written back by factories (feature stories, overviews, explainers). **The wiki informs decisions; it never makes them** (constitution X: knowledge is context, never authority). **Curator** — the keeper role of a factory's knowledge. **See** [factory-wiki](./concepts/factory-wiki.md).

**The Feed** — one place to drop any raw input (a half-sentence, a screenshot, a ticket link); KILN keeps it exactly as given, a planner step drafts where it could go, the person decides. Feeding decides nothing. **See** [the-feed](./concepts/the-feed.md).

**Bench** — each workshop's place for thinking beside the factories: a private **notebook** (notes mature into knowledge by *promotion*), **research steps** (legwork handed to spare capacity) and **spikes** (ungated experiments ending in a **spike report**). Nothing on the bench decides anything. **See** [the-bench](./concepts/the-bench.md).

**Insights** — evidence derived from the record (where time goes, which gates send work back, whether judges catch real problems). Never change anything on their own; describe the factory, not the people. **Health** — a watcher that raises **signals** about KILN itself (steps, lane, models, hosts, record, knowledge); it never acts; when it cannot see it says *unknown*, never "all good". **Policy stop** — a configured rule (egress blocked, budget reached) that halts a step and appears in Needs you.

**Configuration** — plain reviewable files (hosts, providers, model catalog, role instructions, tier map, policies, per-factory settings); every change checked, recorded, and effective from the next step. Safety rules cannot be configured away. **Profile** — a factory's model-locality setting chosen at the Roadmap gate: `local-only` (the default, provable), `hybrid` or `remote-first`; it, with the egress policy, decides which providers a factory may route to. (Not the *codebase profile* of a brownfield scan, §10.)

**Experience charter** — the approved description of who the product is for, its principles, journeys, screen map and accessibility floor; a **yardstick, never a gate**, approved by a person before the first Roadmap gate and pinned by each feature at admission. **Design system** — the approved foundations, tokens, components and patterns plus a manifest; features are designed from it, built from it and checked against it. **Journey coverage map** — the Roadmap-gate view of charter journeys vs. planned features.

**Team space** — the shared git repository where personal workshops publish what they build, share knowledge and request decisions; it coordinates and **never decides** (no one's gate moves from outside their workshop; constitution XII: workshops are sovereign). **Claim** — a factory's signed note of which team feature it builds and what code it touches. **Quorum** — the signatures a team roadmap change needs.

**Explore first** — KILN arrives as a *guide* before a factory: read code and history, build knowledge, answer with citations, recover rules and draft specs of what the system already does — all local, changing nothing. **Brownfield** (existing code): codebase **profile**, full **scan**, **baseline** of what build and tests do today, **territory** (the code a factory may change), trust **stages** (observe → rehearse → contribute → own), "what must not change". **Greenfield** (new code): product brief + constitution, researched and decided technology choices, a **walking skeleton** (the thinnest end-to-end path), then vertical slices.

**Zed / ACP / MCP** — the editor integration: KILN shown in Zed's agent panel through the Agent Client Protocol and MCP tools; a surface, never a source of truth.

**Surface** — anything that shows or accepts: web front door, CLI, editor. Surfaces are driven by events and hold no state of their own (constitution IX).

---

## 11. Seen from the roadmap and the repository

**Gate entry / gate log (factory-log)** — the first program's append-only log of gate decisions, still validated by `kiln/packages/record`. **r-number** — a roadmap row id (`r12` foundations reset, `r42` the completer spike, `r13` this durable core, `r14` the walk, `r15` events and archive, `r16` workers and models …). **PR close-out** — a row closes `done` at its merged PR with `outcome: @PR#N`; closing is a person's Roadmap-gate move.

**Spec Kit commands** used on this repository — `/speckit-specify` (the what and why), `-clarify` (up to five targeted questions), `-plan` (research, data model, contracts, quickstart), `-tasks` (dependency-ordered `tasks.md`), `-analyze` (read-only consistency check), `-implement` (execute the tasks, tick them `[X]`).

---

## 12. The twelve principles (constitution v2.1.0), in one line each

I. **Author/judge separation** — no model approves its own work. II. **Every judge on the strongest model.** III. **One lane per factory**, sequential inside it. IV. **Model affinity** is the cost lever for local models. V. **A missing person never approves.** VI. **The Roadmap gate is human-only**, always. VII. **Everything is recorded**, atomically with the change. VIII. **Local by default.** IX. **One committed state; surfaces driven by events.** X. **Knowledge is context, never authority.** XI. **A factory is portable** (it can move hosts; a store carries its lock and names its host). XII. **Workshops are sovereign.**

---

## 13. Quick reference: what answers what

| If you want to know… | …look at |
|---|---|
| is this gate waiting or settled? | `gates.state(gateId)` → `waiting` / `settled` / `unknown` — read from the store |
| did my move take effect? | the `Outcome`; if you got *outcome unknown*, resend the **same key** |
| who decided and what did they see? | the move record (decider, `briefRef`) and the stored brief |
| why did a refusal happen? | `reason` (+ `winner` / `original` / `detail`) |
| is the owner up and accepting moves? | channel `ready`; CLI `kiln owner` prints `listening` then `ready` |
| who owns this store? | the `owner.lock` row, or the `StoreOwned` message |
| what changed and why? | the outbox entry: `type`, `actor`, `cause` |
| what holds the lane? | the `kiln.lane` document: lease, resident, hold, swaps |
| is the contract still held after a crash? | the oracle (I1–I9) over a fresh-reader inspection |

---

## 14. Words that mean two things

| Word | Sense A | Sense B |
|---|---|---|
| **key** | *idempotency key* — identifies one submission (`move-1`, `open-1`) | *gate key* — which gate of the flow (`3-spec`); also *document key* inside a family |
| **brief** | *gate brief* — the ten-part context shown at a gate | *product brief* (greenfield), *roadmap brief*, or the JSON "brief as shown" stored in `kiln.brief` (r13 treats it as opaque) |
| **outcome** | *port outcome* — `committed` / `repeat` / `refused` | *task outcome* — `completed` / `aborted` / `failed` |
| **committed** | a move outcome: durable | "a commit" — any atomic store write; also the git sense |
| **record** | *the record* — the event stream | *move record* — the one stored document of a gate's decision; *a record in the store* |
| **step / unit** | user-facing "step": one piece of work by one role | code-level `kiln.unit` task |
| **feature / row** | what people say | the roadmap field and ids (`r13`) |
| **hold** | the lane's *hold flag* (keep a judge's model pinned) | "holds the lane" (has the lease) · "hold-yield" (a unit holds then yields the lane) |
| **ready** | the owner's *ready* signal (accepts moves) | a task state `ready` (scheduler: runnable) |
| **checkpoint** | a task's saved resume state | the Implementation gate's key is `5-checkpoint` (its name is *Implementation*; it establishes a *restorable commit*) |
| **settled** | a gate with a move record | a task that is terminal (the gate task settles after the record) |
| **state** | gate state: waiting/settled/unknown | task status; "the committed state" (constitution IX) |
| **owner** | the process that owns a store | a task's owner (the factory or another task) |
| **seam** | the durable package boundary | — (the only seam in the codebase sense is the *external seam* the boundary check lists) |
| **spike** | an ungated experiment in the bench | the r42 *row* that tested completing a waiting task from outside |
| **ready/not-ready** | the transient refusal `not-ready` | CLI/`ready` promise; both mean "start-up convergence not finished" |
| **judge** | a role that produces evidence | never a decider — "the judge approved" is always a mistake |

---

## Index

*Alphabetical; the section holds the definition.*

Actor §6 · Added gate §3 · Admission §3 · Affinity §7 · Applies-when §3 · Approve §4 · Author/judge separation §2 · Baseline (brownfield) §10 · Baseline (measured) §8 · Bench §10 · Brief §4 · Brief ref §4 · Brownfield §10 · Canary §8 · Catalog §6 · Cause §6 · Channel §5 · Checkpoint §5 · Child owner §8 · Claim §10 · Command §5 · Command ledger §5 · Commit §5 · Completer §5 · Configuration §10 · Constitution §3, §12 · Crash-loop guard §5 · Curator §10 · Decider §2 · Delegation §2 · Design system §10 · Director §2 · Document §5 · Draft §5 · Egress policy §7 · Event §6 · Evidence §2 · Exactly once §4 · Experience charter §10 · Explore first §10 · Factory §1 · Fault point §8 · Feed §10 · First move wins §4 · Flow §3 · Floor §9 · Fresh reader §8 · Gate §4 · Gate id §4 · Gate key §4 · Generation §7 · Greenfield §10 · Headless §4 · Health §10 · Hold flag §7 · Hook §8 · Host §1 · Idempotency key §4 · Insights §10 · Inspection §8 · Judge §2 · Key retention §5 · Kill point §8 · `kiln check` §9 · `kiln gate` / `kiln owner` §5 · Lane §7 · Lane task §7 · Layer rule §9 · Lease §7 · Legacy §1 · Lockfile §9 · Model pool §7 · Move §4 · Move kind §4 · Move record §4 · Move vocabulary §4 · Mutation check §8 · Needs you §2 · Negative control §8 · Never vacuous §8 · Not applicable §3 · Oracle §8 · Outbox §6 · Outcome §4 · Outcome unknown §4 · Owner §5 · Owner lock §5 · Phase (gate) §3 · Phase (task) §5 · Pi / Pi Durable §1 · Pin §9 · Planner §2 · Port §9 · Power-loss boundary §4 · Producer §2 · Projection §6 · Quorum §10 · Re-crossing §3 · Ready §5 · Record §6 · Refusal §4 · Request hash §5 · Restart limit §5 · Restart storm §8 · Restorable commit §3 · Resume §5 · Resident model §7 · Role §2 · Roadmap §3 · Roadmap gate §3 · Row §3 · Seam §5 · Settled §4 · SIGKILL §8 · Slot §5 · Spec Kit §1 · Spike §8, §10 · Step §5 · Steering §2 · Store §5 · Store version §5 · Surface §10 · Swap §7 · Task §5 · Task kind §5 · Team space §10 · Tier §7 · Transaction §5 · Triage §2 · Unattended tail §2 · Waiting §4 · Walk §3 · Wiki §10 · Workshop §1 · Wreck §8 · Zed §10.
