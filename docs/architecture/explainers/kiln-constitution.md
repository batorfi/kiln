# KILN's constitution, explained

> **Type:** explainer — for understanding, not a specification. **Audience:** software engineers who build, review or
> extend KILN and want to know what each rule of the constitution means, why it exists, and what it asks of their code.
> **Status:** explains [constitution **v2.1.0**](../../../.specify/memory/constitution.md) (amended 2026-10-25). **Where
> this explainer and the constitution differ, the constitution governs** — this page paraphrases; the constitution is
> the law.
>
> Companions: [architecture explainer](./kiln-architecture.md) · [the flow](../../concepts/the-flow.md) ·
> [the record](../../concepts/the-record.md) · [configuration](../../concepts/configuration.md) ·
> [team space](../../concepts/team-space.md) · [decisions, settled and open](../../concepts/open-decisions.md) ·
> [PRD](../../prd/kiln-prd.md)

## Contents

1. [Why KILN has a constitution](#1-why-kiln-has-a-constitution)
2. [The twelve principles at a glance](#2-the-twelve-principles-at-a-glance)
3. [Who decides — I, V, VI, XII](#3-who-decides)
4. [How good the judgment is — II](#4-how-good-the-judgment-is)
5. [How work runs — III, IV](#5-how-work-runs)
6. [What is true — VII, IX](#6-what-is-true)
7. [What leaves the machine — VIII](#7-what-leaves-the-machine)
8. [Knowledge and placement — X, XI](#8-knowledge-and-placement)
9. [The flow and the roadmap](#9-the-flow-and-the-roadmap)
10. [Roles and model tiers](#10-roles-and-model-tiers)
11. [Dependencies](#11-dependencies)
12. [Governance: changing the law](#12-governance-changing-the-law)
13. [How the principles hold each other up](#13-how-the-principles-hold-each-other-up)
14. [A reviewer's checklist](#14-a-reviewers-checklist)
15. [Questions engineers usually ask](#15-questions-engineers-usually-ask)

---

## 1. Why KILN has a constitution

KILN lets AI agents do real feature work while people make every decision that matters. That promise is easy to state
and easy to break. It breaks quietly: a timeout that "helpfully" approves a stale gate, a judge that falls back to a
smaller model when memory is tight, a dashboard that caches a decision the record never saw. None of these looks like a
bug in isolation. Each one removes a guarantee.

The constitution exists so that those guarantees do not depend on every engineer remembering them. It is a short
document — about two hundred lines — with three properties that make it different from ordinary design docs:

- **It is binding.** It supersedes every other KILN practice. When a concept doc, a PRD requirement or a clever
  shortcut disagrees with it, the constitution wins. The concept docs explain the system; they never override a
  principle.
- **It is testable.** Every principle ends with a *Testable as* line. Those lines are not decoration: they are the
  shape of the checks, probes and negative tests that prove the rule holds. If a principle cannot be checked, it is not
  finished.
- **It changes only by decision.** Amending it needs a written rationale, a person's approval and a semantic version
  bump. Nothing changes it by drift.

It also has a name for the defect it prevents. In the kiln metaphor that gave KILN its name, the constitution is the
*atmosphere* of the firing: a feature that violates it was "fired in the wrong atmosphere". The defect is in the
surroundings, not in the pot — so it must be caught before anything runs unattended.

### How to read a principle

Every principle in the constitution has the same three parts:

| Part | What it gives you |
|---|---|
| **The rule** | what must always be true, in one paragraph |
| ***Rationale*** | why the rule exists — what goes wrong without it |
| ***Testable as*** | how we know it holds — the observable property a check asserts |

This explainer adds two more for each principle: **what it means in practice** when you write code, and **what is easy
to get wrong**.

### Principle numbers in code

Code, specs and contracts cite principles by number — `P-I`, `P-V`, `P-VIII` — in comments and test names. The numbers
are stable: when the constitution was amended for the restart (v2.0.0), principles I–IX kept their numbers and the new
rules were added as X–XII. A `P-V` in a 2026-09 test still means "a missing person never approves".

---

## 2. The twelve principles at a glance

| # | Principle | In one sentence |
|---|---|---|
| **I** | Author / judge separation | No role decides the gate its own work feeds; a person makes the deciding move. |
| **II** | Every judge on the strongest model | Judges always run on the strongest model the factory has, and are never silently downgraded. |
| **III** | One lane per factory | Inside a factory, one thing runs at a time; parallelism happens between factories. |
| **IV** | Affinity is the cost lever for local models | Order the work so local models are swapped as rarely as possible. |
| **V** | A missing person never approves | Crashes, clocks, closed browsers and lost connections can delay a gate, never settle it. |
| **VI** | The Roadmap gate is human-only, always | The gate that admits work accepts no delegation and no exception. |
| **VII** | Everything is recorded | Every state change is an event with a cause and an actor, committed with the state it changes. |
| **VIII** | Local by default | Code and data stay on the machine unless a recorded policy says otherwise. |
| **IX** | One committed state; event-driven surfaces | Every screen reads the same committed state, updates on events, and decides nothing. |
| **X** | Knowledge is context, never authority | The knowledge base informs decisions; it never makes one. |
| **XI** | A factory is portable | Moving a factory between machines never changes a decision. |
| **XII** | Workshops are sovereign | Only the workshop that owns a gate can settle it — never a teammate or the team space. |

The principles group naturally around six questions, and the rest of this explainer follows that grouping:

```
   Who decides?              I  V  VI  XII      ── people decide; absence never does
   How good is the judgment? II                 ── judges are independent and strong
   How does work run?        III  IV            ── one lane per factory, few swaps
   What is true?             VII  IX            ── the record is the truth; screens only show it
   What leaves the machine?  VIII               ── nothing, unless policy says so
   Knowledge and placement?  X  XI              ── knowledge informs; placement never decides
```

---

## 3. Who decides

Four principles answer the most important question in KILN: *who* is allowed to make a gate move forward. The short
answer is: a person — and only the right person — and nothing else, ever.

### I. Author / judge separation — no model may approve its own work

**The rule.** No role, including the director and the planner, ever decides the gate its own artifact feeds. A
**producer** makes an artifact (a design, code, a work plan). A **judge** examines it and produces **evidence**. The
**deciding move is always a person's** — made live, or through a delegation that a person armed and the record shows.

**Why.** A role that approves its own work has removed its own check. Once that happens anywhere, every gate
downstream inherits an unexamined input, and the safety net has a hole you cannot see.

**In practice.**
- Keep three voices apart in code and in the record: *producer output*, *judge verdict*, *person's move*. A judge's
  verdict is a field of evidence on the gate; it is never the gate's outcome.
- The unit that authors an artifact and the unit that judges it must be different units in different conversations.
  This is why only the row task creates conversations, and why workers have no subagent tool: a model that could spawn
  its own judge could arrange its own approval.
- "Approve" in KILN's code always has an actor that is a person (`decided_by: human@…`) or a named delegation — never a
  role, a model or the system.

**Checked by.** No gate settles without a person's move or a recorded delegation; no artifact is authored and judged
by the same unit or conversation.

**Watch out for.** Treating an all-green judge verdict as "basically approved" and letting the flow advance. Green
evidence makes a person's decision easy; it does not replace it.

### V. A missing person never approves

**The rule.** A missing screen, a closed browser, a crash, a restart, a lost connection or an elapsed clock may
**delay** a gate. None of them may **settle** one. A waiting gate is a **durable waiting task**, and it settles only on
a **committed move** — a person's, or an approve under a recorded delegation on a clean path. Nothing is inferred from
absence.

**Why.** This is the rule that keeps unattended work honest. If any failure mode could approve, every other guarantee
would be decorative — you could never be sure a gate was actually decided.

**In practice.**
- A gate is a task in the `waiting` state. There is no separate "headless WAIT" mechanism: if nobody moves, the task
  simply keeps waiting — across restarts, reboots and closed laptops.
- **No durable timer ever settles a gate.** A deadline may exist as information ("waiting 3 days"); it can never be
  the cause of a settlement.
- The move and the gate's completion are **one atomic commit**, keyed exactly once. A crash between "the person
  clicked approve" and "the gate completed" must leave either both or neither.
- **First committed move wins**; a move made against a stale state version is refused, and nothing is committed.
- Defaults matter. In any code path where "no answer" is possible — a dialog dismissed, a parse that returns nothing,
  a cancelled request — the result is *no decision*, never *approve*.

**Checked by.** Kill the factory at every step of every gate: it resumes waiting; no gate settles without a committed
move; no settlement records a clock or a restart as its cause. The first program's negative tests
(`tests/negative/no-silent-approval.test.ts`, the Pi seam's "a non-answer is never an approve" fixture) are early
examples of this check.

**Watch out for.** "Auto-approve after N hours to keep the pipeline moving". It is the exact thing this principle
forbids. If waiting is a problem, the answer is better notifications or delegation that a person arms — not a clock.

### VI. The Roadmap gate is human-only, always

**The rule.** The **Roadmap gate** admits the next feature and decides how the factory runs — its profile, policy,
budget, placement and the feature's flow. It is the one gate **no exception may silence**: it accepts **no delegated
move**, no unattended chain reaches it, and a missing person leaves it waiting. It re-opens after every merged or
abandoned feature. Starting a factory is a recorded human command, and delegation never crosses factories.

**Why.** A wrong program is the most expensive mistake KILN can make: everything downstream of it is built on the
wrong premise, and it is not cheap to undo. So the decision that admits work is the one that is never automated.

**In practice.**
- The roadmap task accepts moves only from a person. A delegation object can never name the Roadmap gate.
- Approving the Roadmap gate admits **one** feature. There is no "approve the next three". When that feature merges or
  is abandoned, the gate opens again.
- Delegation armed in factory A authorizes nothing in factory B.

**Checked by.** No feature reaches its first gate without a person's approve at the Roadmap gate, recorded with its
actor; no delegation names the Roadmap gate.

**Watch out for.** Convenience features that "chain" features after a merge. Proposing the next feature is fine — the
planner drafts it and the brief shows it. Admitting it is a person's move.

### XII. Workshops are sovereign

**The rule.** Each workshop decides its own gates. **No act from a team space or another workshop settles a gate** —
not a claim, a quorum, a teammate's review or a published team rule. Only the owning workshop's deciders, or a person
the workshop explicitly names, do. A teammate's review is a **person's evidence**, never a model's verdict and never a
decision on the owner's behalf.

**Why.** Teams coordinate by making work visible, not by deciding for each other. A team space that could approve a gate
would be a control plane that nobody signed up for, and it would make every workshop's guarantees depend on everyone
else's.

**In practice.**
- Data pulled from the team space becomes events in the workshop's own record — `claim seen`, `request received` — and
  can appear as evidence or as a *condition* on a gate. It never appears as the *cause* of a settlement.
- When several people must agree, KILN models it as **required reviews**: recorded evidence that must exist before
  *approve* is offered at all. It is never modelled as several people each settling the same gate. There is still one
  decision per gate, and the first committed move wins.
- A team rule can make a workshop stricter (a policy floor, a protected path, a required gate). It can never decide
  for it.

**Checked by.** Every gate settlement names a decider who belongs to, or is explicitly named by, the owning workshop; no
team-space event appears as the cause of a settlement.

**Watch out for.** "The quorum signed, so merge". A quorum changes the *team roadmap* and the *team rules*. It does not
settle a gate in anyone's workshop.

---

## 4. How good the judgment is

### II. Every judge runs on the strongest model

**The rule.** Every **judge role** — the architecture critic at Architecture, the design critic at Experience design, the code reviewer at Code review, the UI reviewer at UI review, the verifier
at Verification, and any judge on a gate a team adds — must be bound to the **strongest model available to the
factory**, on every substrate, including a purely local one. A weaker binding is a **refused configuration**, not a
warning. A judge is **never silently downgraded**: if the strongest model is unavailable, the judged step **waits and
says why**. A policy may also require judges from a **different model family** than the author.

**Why.** Judges are the gates' backstops. A factory runs one lane, so there is no parallel pass to catch what a weak judge
misses; one cheap judge defeats the whole net. Producers can be cheap *because* a strong judge and a person stand on the
far side of their gate.

**In practice.**
- "Strongest" is resolved per factory, from its configuration and host. The tier map can say `code-reviewer: strongest`,
  and `kiln check config` refuses a binding that names anything weaker.
- Fallbacks are allowed for producers by policy. They are **never** allowed for judges. If your code has a fallback
  path, make sure it cannot be reached for a judge role.
- Memory pressure, a busy model pool or a slow remote endpoint delays a judge. It does not substitute one.
- A judged step records the model it actually ran on, so the claim "judged by the strongest model" is checkable after
  the fact.

**Checked by.** Every judge unit records a model that is the strongest the factory allows; no judge binds to a cheaper
tier; a missing strongest model produces a wait, never a substitute.

**Watch out for.** Two things. First, the Documentation gate has **no judge** in the default flow — so the old
"Docs Synthesizer" is no longer a line of defense. Second, the planner is **not** a judge: it runs on the strongest model
by default, but an Operator may bind it lower, and the never-downgraded rule does not apply to it.

---

## 5. How work runs

### III. One lane per factory; sequential inside it

**The rule.** Each **factory** works on one codebase, **strictly sequentially**: one lane, one running unit, one feature
at a time. The **director is the scheduler** — it holds the lane, yields it to a unit and reclaims it when the unit
returns; there is no separate scheduling abstraction. Parallelism happens **between factories**, never inside one. A
**per-host memory budget**, enforced by the host's model pool, limits how many factories can hold how many resident
models at once.

**Why.** Predictability and low cost are the point of a local factory. One chamber per factory makes the factory's
behaviour easy to reason about, reproduce and audit; the budget keeps several chambers on one machine from starving each
other.

**In practice.**
- Every unit acquires the factory's **lane lease** before its first model request and releases it when its run
  settles. "One running generation per factory" is an enforced invariant of the lane task, not an emergent property.
- Gate tasks never take the lane. Waiting for a person holds no model.
- The pool grants leases within the host's budget. Two factories on the same model share one loaded copy.
- Do not add concurrency *inside* a factory to make it faster. If you need more throughput, run more factories.

**Checked by.** Within a factory, at most one unit runs at any instant; across a host, resident models never exceed the
budget. On a one-factory host, the rule reads exactly as the original: one lane, one resident model.

**Watch out for.** Background helpers that quietly call a model outside the lane — housekeeping, summarisation,
compaction. Every model request goes through the lane, including the harness's own.

### IV. Model affinity is the cost lever for local models

**The rule.** Work is ordered so the lane changes local model **as rarely as possible**. A swap happens **only** when the
next unit needs a different tier from the resident one. Affinity applies **host-wide**, across factories sharing a pool;
after a restart, the lane re-establishes affinity first. Spend on remote models is governed by **budgets**, not affinity.

**Why.** Loading a large local model is the expensive move — seconds to minutes of re-heating the kiln. Running like
units together keeps the chamber hot. For local models, this is the single biggest cost lever KILN has.

**In practice.**
- The scheduler prefers units whose model is already resident. A swap is a committed lane event, counted and recorded.
- Only KILN loads and unloads models (`keep_alive`, explicit unload). A model loaded behind KILN's back breaks
  residency — and is treated as a broken-guarantee signal.
- Harness housekeeping (for example, context compaction) runs on the step's resident model rather than forcing a swap.

**Checked by.** The observed local swap count is the minimum the planned tier sequence requires; no swap occurs on an
affinity-compatible boundary; remote spend never exceeds its budget without a recorded stop.

**Watch out for.** Optimising for affinity at the expense of a rule. Affinity decides *order*; it never decides *which
tier* a role gets. A judge that "could stay on the resident work model" still swaps to the strongest model.

---

## 6. What is true

### VII. Everything is recorded

**The rule.** Every state change — gate opened, step started, model loaded or swapped, move made, delegation armed or
ended, policy stop, cost — is a **domain event** with its **cause and actor**, committed **atomically with the state it
changes**, in an ordered stream. That stream is the **primary record**. The factory-log and every other view are
**projections**, rebuildable from it. A delegated approve stays a **distinct entry** from a person's move and names the
delegation that produced it.

**Why.** The record is the audit trail and the backing for every other guarantee. "No gate settled without a person"
is only provable if every settlement, with its actor, is in the record. A decision that cannot be explained afterwards
did not happen safely.

**In practice.**
- Use the **transactional outbox**: an event is committed in the same transaction as the state change. Never write
  state and then "also log it" in a second step — a crash in between creates state the record cannot explain.
- Every event carries a typed, versioned schema and an envelope with `actor`, `cause`/`causation` and `correlation`.
  An invalid event fails its commit.
- Events hold **facts and references, never content**: no prompts, answers, transcripts, code or secrets. Content lives
  in the durable store; the record points to it.
- Stored events are **immutable**. When a schema changes, old events are lifted to the new shape at read time by pure,
  lossless upcasters; consumers only ever see the current version.
- Projections — the factory-log, read models, metrics — must rebuild **byte-identically** from the stream.

**Checked by.** Any merged feature can be reconstructed — every gate's outcome, decider, evidence and cost — from the
record alone; every projection rebuilds identically.

**Watch out for.** Two common shortcuts: updating a read model directly "because it's faster", and putting a prompt or a
code excerpt into an event "for debugging". The first creates truth outside the record; the second makes the permanent
record unsafe to keep.

### IX. One committed state; surfaces driven by events

**The rule.** Every surface — the web front door, the command line, any other view — reads **one committed state** and
updates **on domain events, never by polling**. The front door is a **loopback server that is never a source of
truth**: it renders projections and carries moves and commands into the factory, and nothing is decided in it. A front
door reachable over a network requires **real authentication**.

**Why.** People must watch and decide where the record lives. A surface with its own state would be a second, unaudited
factory — and the first place two people would see two different truths.

**In practice.**
- The server binds to loopback with a per-launch secret, checks Host and Origin, and protects against CSRF. The
  `decided_by` of a move comes from the authenticated session, **never from the request body**.
- A browser that reconnects resumes from its last event sequence number; it does not poll.
- The CLI is a surface under the same rule: `kiln gate` shows the full brief as text and submits moves through the
  same move intake, bound to the state version it was shown.
- Stopping the server loses nothing and settles nothing. If your feature stops working when the front door restarts,
  state lives in the wrong place.

**Checked by.** No surface blocks on a timer; every update is caused by an event; stopping the front door loses no state
and settles no gate; a non-loopback listener without authentication is refused.

**Watch out for.** Client-side "optimistic" moves that show a gate as approved before the commit. A gate is approved
when the commit says so — not when the button is clicked.

---

## 7. What leaves the machine

### VIII. Local by default

**The rule.** A factory runs on **local models**, and its data stays on the machine **by default**. Remote models, remote
hosts and any other egress happen **only by a configured, recorded, policy-checked choice**, per factory and per role,
and everything that leaves is recorded. Every connection beyond loopback is **authenticated and encrypted**. A role that
needs an outside resource the policy does not allow **flags it as unavailable rather than blocking** the feature.

**Why.** Ownership of code, intent and cost is a promise people make to their organisations. The default must keep that
promise with zero configuration, and every exception must be visible to whoever audits the work later.

**In practice.**
- The default profile is `local-only`. Under it, the only allowed destinations are loopback and the local model server.
- Any non-local request is checked against the factory's egress policy **before** it is sent. A violation blocks the
  request, raises a signal and arrives as a policy stop — it is never silently worked around.
- The policy is fixed at the Roadmap gate. Changing it mid-feature is not a code path; it is the next Roadmap gate.
- Extra evidence requested at a gate uses only models the policy allows; needing egress becomes a policy stop.
- A loopback-only listener is not an outbound dependency.

**Checked by.** Under `local-only`, a run completes with no outbound traffic beyond the allowlist — the network check is
written so that it can never pass vacuously; every egress event names the policy that allowed it.

**Watch out for.** Helpful network calls nobody thinks of as egress: telemetry exporters, update checks, fetching a model
card, a "quick" web search inside a role. All of them go through the policy, or they don't happen.

---

## 8. Knowledge and placement

### X. Knowledge is context, never authority

**The rule.** Factory, workshop and team knowledge — the wikis an LLM keeper writes and people curate — **inform**
producers, judges and people. They never **settle** anything. Every knowledge claim is **traceable to a source** (a
commit, a document, a decision, a person), and no knowledge content satisfies a gate, overrides a specification or
counts as a judge's verdict.

**Why.** An LLM-written knowledge base is valuable exactly as long as it is treated like a well-cited colleague, not a
law. Knowledge goes stale and can be wrong; that should cost a re-check, never a wrong decision.

**In practice.**
- Knowledge appears in briefs as *context*, with citations — and with a flag when a cited page is stale (unreviewed for
  90 days by default), contradicted, drifted from the code, or changed while the gate was open.
- A check never passes "because the wiki says so". The yardstick for a gate is the specification, the tests and the
  judges' evidence.
- Pages cite code as short excerpts with path, lines and commit; reference pages are generated from the code itself.

**Checked by.** Every knowledge page cites its sources; no gate move, delegation or check takes a knowledge page as its
cause.

**Watch out for.** Letting a well-written page substitute for a missing requirement. If the knowledge base describes
behaviour that the specification does not require, it is a note — not a contract.

### XI. A factory is portable

**The rule.** A factory's state, record and decisions are independent of the host it runs on. **Moving a factory never
changes a decision**: a move between hosts, a sleeping host or a lost connection pauses work and resumes it; it never
settles, re-opens or alters a gate.

**Why.** Factories run wherever people place them — a laptop, a team server, a cloud machine. If placement could change
outcomes, every move would need a fresh audit and nobody could trust a factory that had moved.

**In practice.**
- Everything a factory *is* lives in its durable store, its feature archives, its workspace and its knowledge
  repository. A move quiesces at a step boundary, hands those over, and resumes on the new host — a waiting gate is
  still waiting, with the same brief.
- Never let host identity leak into decision logic. Host-specific facts (memory, resident models) affect *when* work
  runs, never *what* is decided.
- A failed transfer reopens the old store; nothing has changed.

**Checked by.** A factory moved at any step resumes in the same state with the same record; no move or host change
appears as the cause of a gate settlement.

**Watch out for.** Treating "the host came back after a long sleep" as a reason to re-open or re-run a settled gate. Wake
means resume, not reconsider.

---

## 9. The flow and the roadmap

Beyond the principles, the constitution fixes the **invariants** of KILN's flow. It deliberately does *not* fix every
detail: the gates' questions, artifacts, judges and exact moves live in the gate-rail contract and in
[`the-flow.md`](../../concepts/the-flow.md). What the constitution protects is the shape no team, configuration or
convenience may break.

### The default flow

```

 Roadmap ─► 1 Concept ─► 2 Architecture ─► 2a Experience design ─► 3 Specification ─► 4 Work plan
 gate                    (judged)          (judged · when UI)                                │
   ▲                                                                                         ▼
   │   9 Merge ◄─ 8 Documentation ◄─ 7 Verification ◄─ 6a UI review ◄─ 6 Code review ◄─ 5 Implementation
   │                                  (judged)          (judged · when UI)  (judged)
   └──────────────── re-opens after every merged or abandoned feature
   └──────────────── re-opens after every merged or abandoned feature
```

### Flow invariants

| Invariant | What it means |
|---|---|
| **Fixed anchors** | The Roadmap gate is always first; the Merge gate is always last. Nothing goes before or after them. |
| **Built-in gates are never removed** | Experience design and UI review are built in and apply when a feature touches the interface; otherwise they are recorded as *not applicable*, never dropped. Teams may **add** gates (a threat model, a security review) by a recorded decision. They may not remove or reorder the built-in ones. Every added gate keeps the full gate contract: durable, waiting, settled only by a committed move, recorded. |
| **A closed set of move kinds** | Every move is one of a fixed set of kinds, each with a known consequence. Teams may label moves in their own words; they may not invent new kinds. Changing the set is a constitutional amendment. |
| **One feature at a time** | The Roadmap gate admits one feature; it re-opens after that feature. No unattended chaining. |
| **A flow per feature** | The flow is chosen per feature at the Roadmap gate, from the factory's default, and pinned for that feature. |

### The experience charter and the design system

Two companion artifacts sit beside the constitution in the repository — the **experience charter** (who the product is for,
its journeys, screens and wireframes) and the **design system** (tokens, components, patterns). They are **yardsticks, never
gates**: briefs cite them, the Experience design and UI review gates measure against them, a feature pins their versions
at admission, and only a person approves or amends them. In a team they are the repository's files, shared by every
member's factory (`team-space.md` §11a).

### The move kinds

The closed set is what keeps the director deterministic: it knows exactly what to do after every move.

| Kind | What happens next |
|---|---|
| **approve** | the work goes to the next gate |
| **revise** | the note goes to the same author conversation; the gate returns when it is done (at Code review, `revise` goes to the **workers**, never the reviewer) |
| **reject** | a fresh author at this gate, or an earlier gate the note names; every gate after the target opens again |
| **restart** | a fresh build from the last restorable point (Code review) |
| **split+revise** | the feature shrinks; the rest becomes a new roadmap feature (Implementation) |
| **mitigate** | bounded automatic fix rounds before a person decides (Verification) — never a person's move and never a settlement |
| **row edits** | the Roadmap gate's own moves: edit, add or drop rows |

A team's *Accept with residual risk* is an **approve** with a required note. The record stores the kind, the label and
the note — validators reason over kinds, people read their own words.

### Shortcuts are decisions, not defaults

KILN has three ways to move faster. Each is bounded, recorded and visible in every later brief.

- **Triage skip.** A small feature may skip **Concept and Architecture only**, with the reasoning recorded. A person may
  override it, and a flow may forbid it. No judged gate after Architecture is ever skippable.
- **Delegation (the unattended tail).** Only the person who approves a feature's **Specification gate** may arm it. It
  covers only the **approve side** of the gates after Specification — Merge only if explicitly included. **Any
  objection ends it** for that gate and every gate after: a judge's objection, a code reviewer's `restart`, a verifier's
  `reject`, a split proposed at Implementation, a blocked request, a reached budget. It never reaches the Roadmap gate
  and is never inferred from absence. *"If everything checks out, don't bother me"* is allowed; *"ship it even if a judge
  says no"* is not.
- **Bounded automatic fixing.** Verification may run automatic fix rounds before the gate opens — **2 by default,
  settable from 0 to 3** at the Roadmap gate. The cap forces a persistent failure in front of a person.

### The roadmap invariants

The program is an ordered, **dependency-gated** list of feature **rows**, kept as a committed, reviewed artifact
(`ROADMAP.md`) and admitted only at the Roadmap gate. A row fires only when its dependencies are done; each row is one
full walk of its flow; the Roadmap gate sits **between** rows, never inside one. The program gate and a feature's gates
are never confused in state or in the move vocabulary — in code, `gate0` and a feature's `gate` are different things.

---

## 10. Roles and model tiers

Roles — researcher, designer, worker, code reviewer, keeper and the rest — are defined as **files** under
`kiln.config/` and bound to models by a tier map. Configuration chooses models; the constitution fixes the rule that
configuration can never break:

| Kind of role | Model rule | Why it is safe |
|---|---|---|
| **Judges** | the strongest model available to the factory, always (Principle II) | they are the backstop; nothing stands behind them but a person |
| **Producers** | the cheapest model that the gate on their far side can bound | a strong judge and a person check their work before it counts |
| **Triage** | may be cheap | a person's gate bounds it immediately |
| **The planner** | drafts only; strongest by default, configurable | its drafts are checked deterministically and labelled before a person sees them; it never decides |

The cost of local work is **held compute and wall-clock time**, not tokens. Complexity has to justify itself.

---

## 11. Dependencies

KILN may take **runtime dependencies** where they carry their weight; Pi, Pi Durable and their companions are approved.
Three conditions apply to every dependency:

1. **Pinned.** Versions are fixed; an upgrade is a recorded change with its own review, not drift.
2. **Recorded.** Adopting a dependency is a decision someone made and the record shows.
3. **Behind one seam.** Each dependency is reached through one KILN module. Only the durable module imports Pi Durable;
   only the workers module imports `pi-ai`. The guarantees are written against KILN's own types, so they outlive any
   dependency's API.

And one rule above them: **a dependency never weakens a principle.** Where a library cannot honour one — for example, if
it offered no way to complete a waiting task atomically from outside — KILN works around it behind the seam, or does not
use it. (That exact question is settled by a go/no-go spike before the durable core is built: roadmap row r42.)

---

## 12. Governance: changing the law

### Supremacy

The constitution supersedes all other KILN practices. When a concept doc and the constitution disagree, the constitution
governs, and the concept doc is the one that gets fixed.

### Amending it

An amendment needs:

1. a **written rationale** — what changes and why;
2. **a person's approval**;
3. a **semantic version bump**;
4. for a MAJOR change, a **migration note** — what happens to code and records built under the old rule.

Amendments are drafted with a *Sync Impact Report* — an HTML comment at the top of the file that lists every change and
every downstream file affected. It is scratch: it is removed before the amended constitution is committed. The
permanent trace is the **Amendment record** at the bottom of the constitution.

### Versioning

| Bump | When | Example |
|---|---|---|
| **MAJOR** | a principle is removed or redefined in a backward-incompatible way | v2.0.0: the event stream replaced the factory-log as the record |
| **MINOR** | a principle or section is added, or guidance is materially expanded | adding *workshops are sovereign* |
| **PATCH** | clarification or wording, no change in meaning | v2.0.1: the move-kind list names `split+revise` and `mitigate` |

### Compliance

Every gate and every pull request must verify compliance with the constitution, non-obvious decisions are justified,
and **the record is the compliance evidence**. In practice, a reviewer should be able to point at the principle a
change upholds — and at the test that would fail if it stopped upholding it.

### History

| Version | Date | What happened |
|---|---|---|
| 1.0.0 | 2026-09-12 | Ratified with the first program: KILN as a Pi extension with a terminal UI. |
| 2.0.0 | 2026-10-21 | The restart: a local web front door on Pi Durable, many factories per host, an event-based record, knowledge per factory, teams of sovereign workshops. II, III, VII, VIII, IX redefined; X, XI, XII added; flow and roles reduced to invariants; pinned dependencies allowed. |
| 2.0.1 | 2026-10-21 | The closed move-kind list aligned with the flow (`split+revise`, `mitigate`). |
| 2.1.0 | 2026-10-25 | MINOR: a section on the experience charter — a person-approved, versioned setup artifact (users, principles, journeys, screen map, wireframes) — with its companion design system, and two built-in, conditionally applicable gates, Experience design and UI review, that measure features against it. The default flow becomes the Roadmap gate and eleven feature gates. No principle changes. |

---

## 13. How the principles hold each other up

The principles are not twelve independent rules. Most guarantees come from two or three of them working together, and
weakening one quietly weakens the others.

- **"No gate is approved by a crash" = V + VII + XI.** V says absence never settles a gate; VII makes every settlement an
  atomic, recorded event with an actor; XI makes sure a move between hosts can't sneak a settlement in. Remove VII and
  you can no longer *prove* V.
- **"Judgment you can trust" = I + II + VII.** I separates author from judge; II makes the judge strong; VII records which
  model judged, so the claim is checkable.
- **"The screen never lies" = IX + VII.** IX forbids surfaces from holding truth; VII says where the truth is.
- **"Nothing leaves without a reason" = VIII + VII.** VIII requires a policy; VII records every egress with the policy
  that allowed it.
- **"Teams without a control plane" = XII + I + VI.** Teammates provide evidence (I), the owning workshop decides (XII),
  and admission stays a local, human act (VI).
- **"Cheap where it's safe" = II + IV + the tier rule.** Producers can run on small models and affinity can keep them
  resident, *because* judges are strong and people decide.

---

## 14. A reviewer's checklist

Use these questions when reviewing a change to KILN. A "yes" to any of the first column needs a very good answer.

| Question | Principle |
|---|---|
| Can any path settle a gate without a person's move or a named delegation — a timeout, a default, a retry, an error handler? | I, V |
| Can a "no answer" (dismissed, cancelled, unparsable) ever become an approve? | V |
| Can delegation reach the Roadmap gate, or continue past an objection? | VI, *Flow* |
| Can a team-space event, claim or quorum cause a settlement in a workshop? | XII |
| Can a judge run on anything weaker than the strongest model, or fall back silently? | II |
| Can two units of one factory run at once, or a model request bypass the lane? | III |
| Does this load or unload a model outside KILN's residency, or swap on an affinity-compatible boundary? | IV |
| Does it change state without committing an event in the same transaction? Does an event carry content? | VII |
| Does a read model or screen hold state the record cannot rebuild? Does anything poll? | VII, IX |
| Does `decided_by` come from anywhere other than the authenticated session? | IX |
| Does anything reach the network without an egress-policy check — telemetry, updates, a web fetch? | VIII |
| Does a check, move or delegation take a knowledge page as its cause? | X |
| Does host identity influence a decision, or does a move/wake re-open a settled gate? | XI |
| Does it add a move kind, remove a built-in gate, or let triage skip a judged gate? | *Flow* (needs an amendment) |
| Does it add an unpinned dependency, or call a dependency outside its seam? | *Dependencies* |

---

## 15. Questions engineers usually ask

**Isn't "a person decides every gate" going to make KILN slow?**
It makes people the pacing resource on purpose. KILN reduces the cost of that in three ways that keep the rule intact:
complete gate briefs so decisions are quick; delegation, which a person arms at Specification for the clean path; and
several factories per host, so the machine works on factory B while a gate in factory A waits.

**Why not let a judge's "approve" settle a gate when it is confident?**
Because a verdict is evidence, not a decision (I). A confident model and a correct model are different things, and the
person who decides is accountable in a way a model cannot be. Delegation exists for the case where a person is happy to
pre-approve a clean path — and the record says so.

**What exactly counts as "the strongest model"?**
The strongest model available to *that factory* under its configuration and policy, resolved per host. On a 32 GB
laptop that may be a 12B model; on a team GPU server, something much larger; for a hybrid factory, possibly a configured
remote model. The rule is relative to what the factory can use — and absolute about never using less for a judge.

**Does "local by default" forbid cloud models?**
No. It forbids cloud models *by default* and *without a record*. A factory may use private or cloud models for the roles
its policy names, decided at the Roadmap gate, with every request checked and recorded.

**Why is the move set closed? My team wants an "escalate" move.**
Every move kind needs director logic with a known consequence; an open set would make the director's behaviour
unpredictable and unauditable. Most new needs fit an existing kind with a team label — "escalate" is usually a
*hand over* (an action, not a move) or a *reject* with a note. If one genuinely doesn't fit, propose an amendment.

**Why can't the Documentation gate be skipped for internal changes?**
Because Documentation is where a feature's story enters the knowledge base, and skipping it would make undocumented
code the easy path. For changes with no user-visible effect the brief is short, and delegation usually covers it.

**A dependency makes a principle hard to honour. Can we relax the principle for now?**
No — a dependency never weakens a principle. Work around it behind the seam, contribute upstream, or don't use it. If
the principle itself is wrong, that is an amendment with a rationale, not an exception in code.

**Where do I start if I think a principle is wrong?**
Raise it as an issue with the rationale before writing code. Design decisions in KILN go through human gates — including
changes to the law.

---

*Read next:* the [constitution itself](../../../.specify/memory/constitution.md) (it is short) ·
[the architecture explainer](./kiln-architecture.md), §14 *Where each guarantee is enforced* ·
[the flow, gate by gate](../../concepts/the-flow.md) · [decisions, settled and open](../../concepts/open-decisions.md).
