> Status: ground-up concept (v2, 2026-09-11)
> Type: concept
> Supersedes (in spirit, not by reference): the dashboard-centric "AI factory" framing of `pipeline-template`
>
> Scope note: this is a human-readable overview of the idea — why KILN exists, what changes, and
> how the major pieces fit. Implementation detail (UI primitives, gate mechanics, the event
> vocabulary) lives in the companion docs, not here. For the end-to-end narrative, see
> `docs/concepts/20260911-process-flow.md`.
>
> Companion docs:
>   - UI layers & headless contract:  `20260911-ui-layers-deep.md`
>   - Human gates — why & how & what: `20260911-gates-why-how-what.md`

# KILN — a local, single-lane spec-driven development factory for Pi

## 1. Pitch

KILN is a **ground-up concept for a spec-driven, multi-agent development *factory* that runs
entirely on local models through the [pi.dev coding-agent harness](https://github.com/earendil-works/pi),
with no cloud round-trip**.

It inherits the strong idea of `pipeline-template` — a director that decomposes a feature
into gates, never writes code, and never decides its own gates, with a human at each gate — and
replaces the parallel, dashboard-driven, cloud-model machinery with three deliberate choices:
a **single execution lane** with a cooperative scheduler, **Pi-native UI** instead of a website,
and a **two-layer gate rail** with an explicit headless contract.

The name is deliberate: a *kiln* burns one batch at a time, heats a single chamber, and holds
heat between batches. That is the whole thesis.

## 2. The transform, at a glance

What KILN changes relative to `pipeline-template`:

| Aspect | `pipeline-template` | KILN |
|---|---|---|
| Parallelism | One pane per worker, many at once | **One lane**, strictly sequential |
| Orchestration head | Director + a scheduler abstraction | **Director *is* the scheduler** |
| Models | Anthropic frontier (cloud) | **Local, Ollama-served** |
| Cost unit | Tokens of cloud API | **Held compute / wall-clock** |
| UI | Dashboard website + panes | **Two TUI layers + headless fallback** |
| Human control | Gates inside the dashboard | **Gates in the same TUI as the work** |
| Model switching | Free (cloud) | **Capped, batched, priced** |
| Logging | Factory-log JSONL (rich) | **Same, plus lane/switch/wall-clock** |
| Workspace | cmux panes/workspaces | **Pi subagent isolation / workspace** |

## 3. Why this is a coherent concept, not a port

A parallel factory exists because cloud models are cheap and switching is free so the
load/un/unload penalty is tiny and throughput is the goal. Locally, both assumptions collapse:
each model is a scarce, slow-to-swap resource held on one machine, and the human wants to watch
it happen where the work happens. So the right *factory shape* for a local substrate is a single
lane, a gate rail, and an always-visible status — a kiln, not a foundry.

Three consequences follow and are the load-bearing claims of this concept:
- **One resident model at a time.**
- **The Director *is* the scheduler.**
- **The UI is two TUI layers, with a deterministic headless fallback.**

The two things most at risk with local models — *cost* and *correctness under weak model
capability* — are answered by two decisions that *use* the local constraint rather than fight it:
1. **Cost** is tamed not by spending more but by **not switching needlessly** (model-affinity
   batching), because switching — loading a new model into the chamber — is the expensive move.
2. **Quality** is guaranteed by **not trusting any model to self-approve**. Every "did we get this
   right?" is a human gate; only the work between gates may run unattended.

## 4. The nine gates

The gate rail is KILN's spine. Nine gates, in order, each a human decision:

`Concept → Architecture → Spec → Plan → Checkpoint → Review → Verification → Docs → PR`

The tail after **Spec** — `Plan → Checkpoint → Review → Verification → Docs → PR` — is the
*execution* half; the front through Spec is the *contract* half. An operator may mark the tail to
run unattended (below).

Each gate has **exactly three moves** drawn from a single canonical vocabulary:

- **Approve** — proceed to the next gate.
- **Revise** — send the work back for a scoped, in-place fix, then re-verify.
- **Reject** — abandon the feature (restart to triage, or stop).

Small-triage features may **skip the Concept and Architecture gates** — the cheap head of the
lane, where a tiny feature earns almost no new insight that triage already surfaced, while every
downstream gate (including every safety net: checkpoints, final review, verification) still runs.

### The roadmap: a pre-lane, human-approved batch plan (Gate 0)

A **single feature** is the lane's unit, but a task the human sets is usually *complex* — it is
many features. **Before any lane runs**, the deliverable is broken down into a **roadmap**: an
ordered list of **feature rows** — each row a *short description, an acceptance signal, and the
dependency it has on earlier rows*. The roadmap is **a factory artifact in its own right, one
level above the per-feature lane** — concretely a `ROADMAP.md` at the project root. It is the
*"firing program"* for a deliverable, not one lane's spec.

**The roadmap is authored *with* the human, at a pre-lane **Gate 0 — Roadmap** that *precedes* the
nine per-feature gates. The nine keep their numbers 1–9; Gate 0 is *before* the lane, not *inside*
*it* — so the per-feature walk in §3 and `process-flow.md` is unchanged:**
- the **director** (its orchestrator's *planning arm*) **assists the human** to author, order, and
  refine the breakdown, proposing a roadmap as a concrete, *challengeable draft*; helping the user
  build the roadmap *is* the director's job, the way the director runs the kiln.
- the **human decides**: *Approve* the roadmap (locking the order and the per-feature rows), *Revise*
  it with the director, or *Reject/restart* it. The director's **author/judge separation** holds at
  Gate 0 — the director *proposes*, the human *decides*; **Gate 0 is a human gate even in headless
  mode** (a durable **WAIT**), and **nothing auto-approve**s the roadmap.

**Each roadmap row is itself a full lane.** Once Gate 0 approves the roadmap, *every row runs the
ordinary Gates 1–9 as its own feature* — triage, concept, spec/plan, review, verify, docs, PR —
exactly the per-feature walk in `process-flow.md`. **Gate 0 is not the start of one lane; it is the
batch plan that *frames a sequence* of per-feature lanes.** The director routes from the approved
roadmap into a per-row lane, and **Gate 0 re-enters at every inter-feature boundary** to reconfirm
or refresh the remaining rows before the next row starts.

**The roadmap overlay (Layer C, "a new dedicated overlay").** A dedicated overlay zooms *out of* the
per-feature layers to the deliverable: it renders **the roadmap's rows, each row's short description
and status, and where the implementation is *right now*** — the in-flight row highlighted at its
current gate (e.g. *row 3 of 7 — "rate-limit the public API" — at Spec/9*, rows 1–2 merged, 4–7
pending). It **composes** with Layer A (the Flow HUD footer, which carries the per-lane state) and
Layer B (the per-gate popup), sitting *above* them as an additive surface driven by the same
`FactoryState`. **Headless fallback:** it degrades to the **roadmap written artifact** — a table in
the factory-log — so a *missing* overlay **never** hides or auto-approves **Gate 0**, exactly the
no-silent-approval contract the two core layers obey.

**Unattended *across* the roadmap: the safe default stops at one feature's PR.** The unattended
sub-section below is **per feature**: arming it runs *one row* to a ready-to-merge PR, then the
lane **stops at the inter-feature boundary and hands the roadmap back to Gate 0** — the human
confirms, replans, or amends the remaining rows before the next row starts. **Chaining unattended
*across several roadmap rows*** (a multi-feature run that keeps auto-advancing row to row) is a
**separately authorized, higher-risk** opt-in, *not* the default: when it is authorized it still
(a) respects *each row's* independent veto-still-halts, (b) emits a *per-row* gate report, and
(c) re-validates Gate 0 at *every* inter-feature boundary before the next row starts — so the
per-feature safety story is preserved row by row, and the record stays honest: cross-feature chaining
is logged as an explicit, time-stamped, human-authorized decision, distinguishable from the per-row
run that stopped at a PR.

The director's pre-lane duty lives in `skills/director.md`; Gate 0 in `gates-why-how-what.md`;
Layer C in `ui-layers-deep.md`; the per-feature lane in `process-flow.md`.

### Unattended tail ("run-unattended" after Spec)
The human's real decisions concentrate in the contract half; the back half is execution on top of a
spec the human already approved. For **trivial / schematic** features, an operator who has just
approved the **Spec** can arm the lane to **run the remaining gates unattended** — no further
human stops across `Plan → Checkpoint → Review → Verification → Docs → PR`. The human
**pre-authorizes the *approve* move** for every remaining gate and the lane drives itself to a PR.

This is the mirror image of triage-skip, and the two compose: **triage trims the *front* of a
trivial feature; unattended mode trims the *back* stops of one whose spec is already approved.**
Both are deliberate, recorded lane-shaping levers, not defaults the system reaches for on its own.

**Auto-proceed is *not* "approve blindly" — it never lifts the defenses.** It pre-authorizes the
*approve side* of each remaining gate on the clean path; an independent **reject / revise / finding
always halts the lane and returns it to the human**:

- any **line-of-defense role** (Architecture Critic, Code Reviewer, Verifier / diagnosis) that
  raises an objection **interdicts the auto-run and stops the auto-cruise** — the vetoes survive.
- a **Checkpoint** that overflows or splits (too big / wrong direction) still stops and re-routes.
- the **PR gate** in unattended mode means *produce the PR*; the operator decides whether their
  pre-authorization also covers the terminal **Approve = merge** (default: stop at a *ready-to-
  merge* PR for a final human glance).

So auto-proceed answers "**if everything checks out, don't bother me**", *not* "do it even if
something looks wrong." The guarantee that *no model may approve its own work* is preserved: that
auto-proceed only pre-schedules the **green outcome**; every independent "no" still gets heard and
still stops the line — *which is exactly why the quality-under-weak-capability claim does not break
just because the human walked away.*

**The record stays honest.** Auto-crossed gates are not skipped silently: each still emits its
gate report, **tagged as *auto-approved under pre-delegation* (spec #N approved T)** together with
the reviewing model and a "no objections raised" note. The factory-log can therefore always
**distinguish a human pre-delegating the approve from a gate that genuinely ran with no human
present** — the two are different ledger entries. This is what keeps unattended a *conscious opt-in*
and not the *missing-UI silent approval* the headless contract explicitly forbids.

**The tail is *per feature*.** When the feature being run is *a row on a roadmap* (Gate 0),
"run this feature unattended to its PR" **stops at the inter-feature boundary** — the lane hands
the roadmap back to Gate 0 rather than auto-advancing to the next row; see the roadmap sub-section
above and Gate 0 in `gates-why-how-what.md`.

The deep rationale, the per-gate move table, the skip-discipline, and the headless contract live in
`20260911-gates-why-how-what.md`. Triage's skip decision is the companion lever to unattended in
`20260911-triage.md`.

## 5. Execution model: one lane, a cooperative scheduler

KILN is sequential by design. A single lane holds one resident model at a time; the director
hands work to a worker, **yields the lane**, then resumes when the worker finishes. There is no
parallelism by design — the whole point is to make the run *predictable and cheap to hold*.

Tasks are organized into **execution units**. Each unit is a self-contained job that needs one
kind of mind and one model tier:
- a **work** unit (design, implement, document)
- a **quality** unit (an independent "line-of-defense" pass: critique, review, diagnose)
- a **gate** unit (waits for the human)

A **model-affinity queue** orders units so the lane changes model **as rarely as possible** — the
most expensive move. The director runs the next compatible unit on the current resident model, and
only swaps the model when the next unit's required tier differs. This is the single most
impactful cost lever in the design, and it is pure *scheduling*: no code changes, no worker
change — the director simply *picks the order and swaps the resident model itself*.

The cost model is plain arithmetic: **wall-clock = (work) + (switching)**. Keeping the lane
resident minimizes the second term, which locally dwarfs the first.

This is the single most important idea, so it is repeated deliberately: the director yields the
model lane, works are queued by model affinity, and a swap happens only because a new job's tier
demands a different model.

## 6. Roles and model tiers

Roles split into **line-of-defense** (a quality line the whole pipeline is guaranteed by,
**always the strongest resident model**) and **work** roles (which may use cheaper models because
a gate sits behind them).

| Line-of-defense role | Always the strongest | Why |
|---|---|---|
| **Architecture Critic** | strongest | "is the proposal coherent and safe?" |
| **Verifier / diagnosis** | strongest | "does the feature actually work?" |
| **Code Reviewer** | strongest | "is the diff right vs intent, before merge?" |
| **Docs Synthesizer** | strongest | "is the cross-feature doc correct?" |

| Work role | Standard model | Why cheaper is acceptable |
|---|---|---|
| **Researcher** | cheap / standard | gathers prior art & context (feeds Concept) |
| **Concept Writer** | standard | bounded by the Concept gate |
| **Architecture Designer** | standard | bounded by the critic + gate |
| **ADR Maker** | cheap | mechanical, formalizes a settled decision |
| **Worker** | per-task tier | bounded by per-checkpoint gates |
| **Techwriter / PR Writer** | cheap | bounded by the Docs/PR gate behind |
| **Feature-size triage** | cheap | bounded immediately by a human gate |

## 7. UI: two TUI layers *plus* a roadmap overlay, no dashboard

KILN has **no website**. The "dashboard" idea becomes two always-on TUI surfaces *plus* one
deliverable-level overlay, built on Pi's extension API, with one shared state that *degrades* to a
headless ledger when no UI is present.
- **Flow HUD (Layer A)** — a persistent footer strip: `rail: Spec/9 · lane: sonnet * · switches: 2 · 00:14`.
- **Flow Popup (Layer B)** — an on-demand overlay and the open-gate card (the same overlay, two faces).
- **Roadmap overlay (Layer C)** — a *zoomed-out, deliverable-level* view of the whole roadmap: every
  feature row, its *short description* and **status** (not started / in-flight / PR'd / merged), and
  *where the implementation is right now* (the in-flight row highlighted at its current gate). It
  composes with Layers A and B as an additive third surface, not a replacement.
- **Headless ledger** — with no UI, nothing auto-approves; gates become durable **WAIT** rows a
  human resumes by token. The roadmap overlay *degrades to the roadmap written artifact* (a table
  in the ledger) so a missing overlay never hides or auto-approves **Gate 0**.

The UI is *event-driven, not polling*: it redraws when factory events fire. The headless contract
is the one rule that keeps the whole thing honest: a missing UI may hide a gate (or a roadmap row),
it may never **silently approve** one.

## 8. What gets deleted (net)

- `dashboard/` — gone; replaced by the HUD + popup.
- cmux pane/workspace orchestration — replaced by Pi subagent isolation.
- Concurrency caps **and parallelism** — gone; not a cap on parallelism but its removal; one lane.
- The 14th "scheduler" abstraction — **collapsed into the director itself.**

New: a **lane module**, a cost/switch-accounting layer, an **event-driven UI layer *plus the roadmap
overlay* (the deliverable-level Layer C)**, and the **roadmap artifact** (`ROADMAP.md`, the "firing
program" a deliverable is broken into; Gate 0 approves it before any lane).

## 9. Repo shape (draft)

```
kiln/
  index.ts              # top-level extension: wires events -> state -> HUD/popup
  lane.ts               # the single resident-model lane + swap
  scheduler.ts          # model-affinity queue + cost accounting
  gate.ts               # the gate primitive blocking + headless-delegation
  hud.ts / overlay.ts   # the two TUI faces
  agents/*.md           # the role SKILL.md files (line-of-defense vs work)
  constitution/         # constitution template (the factory rules)
  factory-log/          # schema + validator (adds lane/switch fields)
  scaffold/             # install + scaffold scripts
  specs/                # per-feature working dir
```

## 10. Why this is worth building

`pipeline-template` proves the **gate-driven, human-in-the-loop multi-agent pipeline** idea is
sound. KILN asks: *what is the same factory when the substrate is local, one-room, and watched
live by the human at a terminal?* The answer is a **single-lane, gate-railed, Pi-native,
cost-accounted factory** where the human's only job is to **plan the roadmap with the director,
decide at the gates (including the pre-lane Gate 0), and watch the kiln**.

---

The companion docs take these up in detail: `20260911-ui-layers-deep.md`
(UI primitives + headless contract), `20260911-gates-why-how-what.md` (the rationale,
the move table, the headless contract), and `20260911-process-flow.md` (the end-to-end
narrative of one feature through the kiln). The **roadmap** concept — the deliverable-level artifact,
Gate 0, the per-feature lane loop, the roadmap overlay (Layer C), and the director's pre-lane duty —
is developed in §4 and §7 of this doc, with Gate 0 in `gates-why-how-what.md`, Layer C in
`ui-layers-deep.md`, and the pre-lane duty in `skills/director.md`.
