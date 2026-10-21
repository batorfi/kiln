> Status: concept (proposal, 2026-10-17) — **not admitted**
> Type: concept
>
> Scope note: this doc explains **how KILN uses Pi Durable** and **why it is a key enabler** of the direction in
> `vision.md` and `web-front-door.md`. It is a focused companion to `web-front-door.md` §2, §4–§8, §12 and §13, not a
> replacement: where they disagree, `web-front-door.md` governs. It describes concepts and their mapping, not code.
>
> Pi facts come from Earendil's published material and the `@earendil-works/pi-durable` README (1.3.0). The library
> is **experimental**; the human has accepted that KILN evolves with it (decision of 2026-10-16). API names are quoted
> as published and are expected to move — KILN depends on the *primitives*, not the signatures.
>
> Companion docs:
>   - The vision:                        `vision.md`
>   - The design:                        `web-front-door.md`
>   - The user experience:               `user-experience.md` (and `mockups/`)
>   - The factory wiki:                  `factory-wiki.md`

# KILN on Pi Durable — how, and why it is a key enabler

## 1. In one paragraph

Pi Durable is a TypeScript substrate for long-running agents: every model turn, tool call and piece of state is
committed to local storage before anything is shown, and a restarted process picks the work up where it stopped.
KILN uses it for far more than "agents that survive a crash". **The whole factory runs on it**: each step of work
is a durable conversation, each gate is a durable task that waits for a human, the director is a durable task graph,
and every change to the factory is an atomic commit that carries its own event. That turns KILN's founding rules —
*a human decides every gate, nothing is approved by absence, everything is recorded* — from promises that code must
keep everywhere into **properties of the substrate**. It is what makes the web front door, the event-based record,
and several factories on one machine practical to build.

## 2. The problem durability solves

KILN's founding shape — one lane, local models, a human at every gate — creates exactly the conditions under which
ordinary, in-memory software fails:

- **Steps are long.** A local model takes tens of seconds to load and minutes to hours to finish a step. A sleep, a
  crash or a closed laptop mid-step wastes held compute that cannot be bought back.
- **Gates wait for humans.** A gate may wait overnight or for days. The process that opened it will not live that
  long, and the decision must not depend on it.
- **The record must be complete.** KILN promises that every decision and every transition is recorded, and that a
  missing human can never count as a yes. Records written "after the fact" can drift from what really happened.
- **Several things must agree.** A move, the gate it settles, the next step it starts and the event that records it
  must all happen together — or not at all.
- **The human is not always watching.** Work continues while the browser is closed; the human must be able to
  return, or arrive late, and see the truth.

Without a durable substrate, KILN would have to build its own checkpointing, its own wait-and-resume machinery, its
own recovery code for every component, and its own way to keep the record and the state consistent. Pi Durable
provides all of these as one coherent model.

## 3. Pi Durable in brief

| Primitive | What it is |
|---|---|
| **Harness** | one open storage and the machinery that runs agents on it; every change is one atomic **commit**; nothing is shown before its commit is stored |
| **Storage** | memory, **SQLite** (recommended for long-running agents) or JSONL; **one process owns a storage**, other clients attach through it |
| **Conversation** | a transcript of immutable entries with its own agent — model, tools, instructions, working directory; can be **forked** from any entry |
| **Task** | a durable state machine that **checkpoints every step**; can **own child tasks**, **wait** on them, and resume after a restart |
| **Document** | typed JSON state committed atomically with transcripts and tasks |
| **Submission** | input handed to a conversation; a stable `requestId` makes it **exactly-once** |
| **Resume** | reopen the storage and resume: interrupted model requests are resent (partial kept, marked aborted); interrupted tools rerun only if declared `replay: "safe"` |
| **Busy handling** | follow-ups are queued; `whenBusy: "steer"` reaches running work after its current tool calls |
| **Hooks** | `beforeTool` / `afterTool` can block or rewrite a tool call; `api.memo` stores a decision so a rerun reuses it |
| **Observation** | `viewState()` and `watchEvents()` (safe for late or reconnecting clients), `harness.taskGraph()`, `harness.usage()` |
| **Models** | through `pi-ai`: local and remote providers, including Ollama on loopback |

## 4. Why it is a key enabler

Each of KILN's defining capabilities rests on one or more of these primitives. Remove Pi Durable and each line
below becomes a subsystem KILN must design, build and prove on its own.

| KILN capability | Enabled by | What it gives KILN |
|---|---|---|
| **Work survives anything** | task checkpoints · resume · replay policy | a crash, sleep or reboot costs at most the last moment of a step, never the step |
| **Gates wait as long as the human needs** | durable tasks in a `waiting` state | an open gate *is* a waiting task; the headless `WAIT` needs no separate machinery, and its resume token is the task's id |
| **Nothing is approved by absence or restart** | waiting tasks resume as waiting; only a commit settles them | "a missing human is never a yes" becomes a property of the substrate, not a check scattered through code |
| **The director never loses its place** | the director as a durable task graph | no recovery logic for orchestration: every task continues from its last checkpoint |
| **One truth, one record** | atomic commits carrying state and events together | the event stream is exact by construction; the factory-log is a rebuildable projection that cannot drift |
| **Decisions apply exactly once** | `requestId` on submissions · first-write-wins memo | retries, double submits and reconnects can never apply a move or command twice |
| **A browser that can come and go** | `viewState()` / `watchEvents()` with late-join snapshots | the web front door shows the truth to whoever arrives, whenever they arrive |
| **Corrective moves that keep context** | follow-ups to the same conversation · forks | `revise` continues with full context; `split+revise` forks the work into two |
| **Stepping in safely** | `whenBusy: "steer"` · `beforeTool` hooks · `api.memo` | steering and risky-action approvals, recorded, and never asked twice after a restart |
| **Cost and usage accounting** | per-conversation and per-harness usage | spend per model and role, for budgets and for insights |
| **Local, private or cloud models** | `pi-ai` providers per conversation | locality becomes a per-role choice inside one model of work |
| **Several factories, isolated** | one storage per owning process | each factory is its own store and process — a crash in one cannot touch another |

## 5. How KILN maps onto Pi Durable

| KILN concept | Pi Durable realisation |
|---|---|
| **Factory** | one process owning one durable store (SQLite) |
| **Roadmap** and the **Roadmap gate** | a *roadmap task* holding the roadmap document; it waits for the human's roadmap decision |
| **Feature** | a *row task*: the director for one feature, whose checkpoint is the director's state |
| **Step** | a *unit task* that creates one **conversation** with the role's instructions, model and tools, submits its input with a deterministic `requestId`, and waits for the run to settle |
| **Gate** | a *gate task* that opens (committing the gate document and the brief), then **waits** on a decision task until a human's move is committed |
| **Move** | one atomic commit: the move record, `decided_by` from the session, and the completion of the gate's decision — keyed exactly-once, first move wins |
| **The lane** | a *lane task* that every step must acquire before its first model request; holds the resident model, the hold flag and the swap count |
| **Delegation (unattended tail)** | a *delegation document* on the feature; covered gate tasks auto-settle on a clean path and wait for a human on any objection |
| **Revise** | the human's note submitted as a follow-up to the **same** conversation |
| **Restart / reject** | a **new** conversation for the next attempt; the old one kept for the record |
| **Split + revise** | a **fork** of the work at the approved restorable point into two continuations |
| **Automatic fix rounds** | new submissions with their own `requestId`s; the round count lives in the row task's checkpoint |
| **Steering** | a submission with `whenBusy: "steer"` — work steps only, never judges |
| **Risky action** | a `beforeTool` hook that holds the call for a human; the answer kept with `api.memo` |
| **Domain event** | an outbox entry committed in the same commit as the change it describes |
| **Factory-log** | a projection of the event stream, rebuilt and validated by KILN's existing validators |
| **Gate brief "as seen"** | committed with the gate when it opens; the move references it |
| **Workshop** | a supervisor process with its own small store for the model pool, leases and the factory registry |
| **Factories anywhere** | each factory's store lives on its host, owned by that host's process; a **move** closes the store, transfers it, and the new host reopens and resumes it — Pi Durable's one-owner rule is the handover protocol (`factories-anywhere.md` §6) |
| **Sleeping hosts** | a host whose factories all wait at gates can stop entirely: waiting gate tasks run no code, so resuming the store on wake continues exactly where it stopped |
| **Wiki ingest, query, lint** | ordinary unit tasks and conversations on the factory's lane, at lower priority than feature work; a half-done ingest is never committed |
| **Research steps** | unit tasks of kind *research*, read-only tools, scheduled below feature work on the lane; results written to the notebook |
| **Spikes** | agent-assisted spike work runs as unit tasks in the spike's worktree at research priority; the spike's time box is a recorded limit that stops it and asks — it never settles anything |
| **Ingest summary and revert** | the ingest commits as its step settles; a revert is a recorded command that adds a reverting commit |
| **Implementation digests** | written by a durable step triggered when a gate settles, derived only from that gate's committed events — so a digest can be regenerated and never disagrees with the record |
| **Workshop wiki** | its own store and steps, run by the workshop supervisor on spare capacity; included read-only in each factory vault |
| **`log.md` of the wiki** | a projection of the factory's `wiki.*` events (`factory-wiki.md` §5) |

## 6. A step, durably

1. The row task decides the next step and creates a **unit task**.
2. The unit task acquires the **lane** (one running generation per factory) and creates a **conversation** with the
   role's instructions, its tier's model and its permitted tools — in the same commit as a `unit.started` event.
3. It submits the step's input with a **deterministic `requestId`** (feature, gate, step, attempt).
4. The model works: each turn and tool call is committed before it is shown. The web front door streams it live.
5. **The machine crashes.** On restart, KILN reopens the store and resumes. The interrupted model request is resent
   with its partial answer kept; a read-only tool reruns; a workspace write does **not** — the model is told it was
   interrupted and decides how to continue. The lane re-establishes its model first.
6. The run settles; the unit task records the artifact and releases the lane; `unit.settled` is committed with it.
7. The row task wakes and opens the next gate.

Nothing in this sequence needed KILN-specific recovery code. Because the `requestId` is deterministic, a restart
can never start the same step twice.

## 7. A gate, durably

1. The row task creates a **gate task**. Its first step commits, atomically: the gate document, the gate brief as it
   will be shown, and `gate.opened`.
2. The gate task **waits** on a decision task. It runs no code while it waits; it holds no model.
3. Hours pass. The browser closes. The machine reboots. The gate task resumes as **waiting** — exactly as it was.
4. The human opens the brief and decides. The server commits, in one commit: the move, `decided_by` from the
   session, the reference to the brief as seen, and the completion of the decision task — keyed by an idempotency key.
5. The gate task wakes, validates the move against the gate's vocabulary, and settles. The row task applies it.

A retried move returns the original outcome; a move against a gate that has moved on is refused and nothing is
committed. No clock can settle a gate: gate and decision tasks use no durable timers.

## 8. What KILN adds on top

Pi Durable is deliberately general. KILN brings the rules that make it a factory:

- **The single lane.** Pi Durable runs work in parallel; KILN's lane task allows one running generation per factory.
- **Who may create a conversation.** Only the director does. Workers get no subagent tool — which is how
  author/judge separation and judges-on-the-strongest-model stay enforced.
- **The gate contract.** Move and completion in one commit, exactly once, first move wins, never by clock.
- **Replay discipline.** Read-only tools are replay-safe; anything that writes or runs commands is not.
- **Model residency and affinity.** Pi Durable knows conversations, not loaded models; KILN loads, pins and swaps
  models, and orders work to swap as rarely as possible.
- **Egress policy.** What may leave the machine is checked by KILN before every non-local request.
- **The record's meaning.** The event catalog, its schemas, the factory-log projection and its validators.

## 9. What it lets KILN stop building

| Without Pi Durable, KILN would need… | With it |
|---|---|
| its own checkpointing for every step and every component | task checkpoints |
| a separate `WAIT` mechanism with resume tokens and deadlines | waiting gate tasks |
| recovery code for the director after every crash | the director is a task graph that resumes itself |
| a log writer that must be kept consistent with state by hand | atomic commits with an outbox |
| idempotency for every command and move | `requestId` and memo |
| a custom protocol for live updates and late joiners | `viewState()` / `watchEvents()` |
| its own transcript storage, compaction and forking | conversations, compaction, forks |
| a Pi extension mapping onto a terminal UI that cannot draw over RPC (r8/r9's findings) | a local web front door on top of committed state |

## 10. Boundaries — what KILN never hands to Pi Durable

- **Decisions.** No task, hook, timer or model settles a gate. Only a human's committed move does — or an explicitly
  recorded delegation on a clean path.
- **Parallelism inside a factory.** The harness can run many things at once; a factory never does.
- **Background model work.** Background tasks are not used for model requests: they would let a second generation
  start while the lane is held.
- **Clocks that decide.** Durable timers may remind; they never decide.
- **The meaning of the record.** Pi Durable stores commits; KILN defines which events exist and what they mean.

## 11. Living with an experimental substrate

The human accepted Pi Durable's experimental status; KILN evolves with it. To keep that cheap:

- **One seam.** Every Pi Durable call lives behind one KILN module; the task graph, the gate contract and the lane are
  written against KILN's own types.
- **Pinned versions, deliberate upgrades.** An upgrade is a recorded change with its own review.
- **The contract outlives the API.** If a primitive is renamed or replaced, the seam changes; KILN's rules do not.
- **Contribute upstream.** Where KILN needs something the library lacks, the preferred path is upstream.

## 12. Open questions

- ~~**Completing a waiting task from outside.**~~ **Decided 2026-10-21** (human@batorfi): settled by a time-boxed
  go/no-go spike before the durable core (roadmap r42). Natively if Pi Durable allows it; otherwise an upstream proposal
  and, until it lands, a KILN decision table committed in the same SQLite transaction as the task store, behind the
  seam. A no-go re-opens the Roadmap gate.
- **Local models through `pi-ai`.** Tool calling, streaming, usage reporting and context-limit behaviour on Ollama
  models need to be established for each model KILN supports.
- ~~**Model residency.**~~ **Decided 2026-10-21** (human@batorfi): every model request — including the harness's own, such as compaction — goes through a KILN provider
  in front of Ollama, must hold the lane lease and targets the resident model; a request for another model is refused
  or becomes an explicit, recorded swap. Harness housekeeping runs on the step's resident model. Only KILN sets
  `keep_alive` and loads or unloads; a model loaded behind its back is a broken-guarantee signal.
- ~~**Store lifetime.**~~ **Decided 2026-10-21** (human@batorfi): **one store per factory**. When a feature closes (merged or abandoned), its
  conversations and checkpoints are exported to a checksummed, compressed **feature archive** on the factory's host —
  beside the store, never in git — a `feature.archived` event records its reference and hash, and they are compacted out
  of the live store. Archives travel with the factory on a move. They are kept forever unless an Operator sets an age-out
  (recorded; `transcript.aged_out`). The record is never archived or aged out; it is not segmented in `kiln-v1` (see
  `the-record.md` §18).
- **Session reuse.** Whether consecutive steps of the same role may share a conversation, or always start fresh.

## 13. One sentence

Pi Durable lets KILN make its promises structural: work that cannot be lost, gates that wait for as long as a human
needs and can be settled only by a human, a director that never forgets where it was, and a record that is exact
because it is written in the same breath as the change it describes.
