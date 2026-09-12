# KILN: the firing analogy

> Status: Concept — the mentoring metaphor behind the name. This is the *one* doc in
> the set where "kiln" is on purpose: it is the map from a kiln's firing to the
> lane's gates.
> Type: Analogy / mental model — a correspondence table and a "where it stops
> fitting" note, **not** a spec. The firing mechanics themselves are detailed in
> the linked concept docs; this doc only maps the *image*.
> Companion docs: `concept.md` (the system), `gates-why-how-what.md` (the nine
> gates), `process-flow.md` (the lane + holds + unattended tail), `skills/README.md`,
> `roadmap.md` (Gate 0 — Roadmap, the deliverable's firing program)
> (the roles).

---

## 0. Why a kiln

Writing software the way KILN does it — take one fragile piece of unfinished work,
drive it through a planned, *staged, held, controlled-then-cooled* sequence of
decisions, and emerge with something hardened and durable — looks a lot less like a
factory floor than like a **kiln firing**. KILN names itself for that image because
the image is load-bearing: almost every design decision is the *consequence of one
clause of the firing*. This doc states that correspondence in full, and, because an
analogy that is never probed is a liability, the part where it *stops* fitting.

A kiln is a thing most people have met but few have fired. A kiln is an *insulated
chamber* that takes **greenware** — a thrown or hand-built piece of clay that is,
until it is fired, just a fragile lump that crumbles if you drop it or touch it
wrong — and drives it through a *planned temperature curve* (ramps, *soaks/holds*
at key temperatures, then a *controlled cool*) with the result that the clay goes
from a fragile, workable, *porous* state to a hardened, vitrified, durable *form*.
The whole art is in the *schedule*: it is the curve, not the flame, that decides
whether the piece survives and holds its shape. KILN is one kiln, firing one piece
at a time, on one planned curve.

---

## 1. What a kiln actually does

To map it honestly you must hold the real process in mind. A kiln firing:

1. **Stage, scheduled, not improvised.** The potter sets the *firing schedule* —
   the temperature curve with its ramps and *holds* — *before* the firing, not
   during it. The curve *is* the process.
2. **Holds/soaks do the work.** At certain temperatures the kiln *dwells* — it does
   nothing but hold the heat a moment, because *something* (maturation,
   vitrification, the glaze bonding) happens *only at the hold*. The dwell is the
   event, not the heating between.
3. **Fragile before and during; durable only after and cooled.** Greenware is handled
   on a dolly all the way to the chamber mouth; the piece is dangerous to touch while
   hot, and *only* becomes stable once fully cooled and the form has *set*.
4. **Do not open the chamber mid-fire.** A door opened *during* the firing dumps
   heat and floods the chamber with the wrong atmosphere — a *thermal shock* — that
   cracks or ruins the piece. A firing must run **sealed and uninterrupted**.
5. **The controlled cool fixes the form.** Cooling is part of the firing and the
   step that *locks in* the form irreversibly. Rush the cool (thermal shock) and the
   piece cracks or shatters; the *rate* of cooling is itself controlled.
6. **The kiln transforms; it neither authors nor judges.** The potter *shapes* the
   clay (the *authoring*) *before* loading; the kiln *hardens* it; whether to keep
   the fired piece is the **kiln operator's** decision, made *after unloading*. The
   kiln never shapes the clay and never grades the piece — it only fires it.
7. **One object, sometimes two firings to finish it.** A piece is fired once to
   harden its *form* (the **bisque** firing, producing hard but porous ware) and a
   second time to add and bond its surface (the **glaze** firing). Two passes over
   *the same object*, each with its own schedule.
8. **The environment and recipe matter as much as the heat.** A wrong *atmosphere*
   (oxidation vs. reduction), an over-firing (past the cone), or a *bad glaze* ruins
   the piece just as surely as a bad curve. Heat is necessary; the surrounding
   conditions are *co-determining*.
9. **A ruined piece: discard, check the schedule, re-fire.** When a firing fails, the
   piece is gone, the potter *inspects the schedule*, adjusts, and the next batch is
   **re-fired** — and the cost of that re-fire *rises with how far into the fire the
   failure was caught*.
10. **You read a firing by instruments, not by staring at the fire.** The potter
    watches **pyrometric cones** (clay cones that bend to a true angle only at one
    temperature — a *distilled read* of the whole chamber's heat) or a thermocouple,
    never by comprehending the entire flame. The read is a *summary*; the decision is
    made on the summary.
11. **One chamber, one thermal profile.** The simple kiln is **one chamber** running
    **one profile** at a time — *not* a foundry with many furnaces each melting a
    different metal at once. A *batch* of pieces shares the chamber; a *batch kiln*
    fires load-by-load; only a *continuous* (or tunnel) kiln runs steadily across
    multiple pieces.

---

## 2. The map: firings ↔ the lane

The correspondence, element by element:

| The kiln | In the lane | What the clause buys |
|---|---|---|
| **The kiln chamber** (one chamber, one profile) | **The single lane** — one sequential pipeline, not a parallel foundry | The whole "one chamber" premise: *one resident firing at a time.* |
| **Greenware** loaded on the dolly | **A unit of work arriving at intake** — a proposal/draft, unfinished and fragile | Everything starts as *fragile, unfired* material, not a finished product. |
| **The firing schedule** (curve + ramps + holds, set *before* the fire) | **The gate plan / dispatch order**, with its **lane-holds** | The lane *plans the whole walk* and the *holds* before it fires anything. |
| **The staged ramp, low → high heat** | **The gates in order**, front → back: cheap / low-heat decisions first, heavy / high-heat last | *"Cheap to bounce early, expensive to bounce late."* |
| **A soak / hold at a target temp** | **A gate = a lane-hold** — the lane *dwells* at a frontier head for a human **Approve / Revise / Reject** | The hold *is* the event; the decision happens *at the dwell*, not in passing. |
| **"Do not open the chamber mid-fire"** | **Do not evict the judge / switch models mid-judgment** — the lane-hold keeps the *judging model resident* while it decides | A mid-judgment eviction is a **thermal shock** that *cracks the result.* |
| **The controlled cool that fixes the form** | **Spec approval pins the form; verification measures the cooled build against it; final human sign-off unloads it** | A form *fired and cooled* is a fixed reference; deviation after = a defect. |
| **The kiln transforms but does not grade** | **Author / judge separation + human gates** — the workers *shape the clay* (author); the lane *hardens it*; the human *decides at unloading* | *"No model may approve its own work."* The kiln never grades the piece. |
| **Bisque, then glaze (two firings over one object)** | **Two passes over the work**: the build/author pass hardens the *form*; the **Review + Verification** pass is the *glaze firing* that finishes it to a sign-off-ready, durable state. Each pass has its own schedule. | The *finishing* is a *second, separate* firing, not the first. |
| **A ruined piece: discard, check schedule, re-fire** | **Reject / restart / revise + checkpoint rollback + the verification mitigation loop** — when a gate says *no*, the lane *cools*, returns to the **checkpoint** (the last good, restorable commit), adjusts, and *re-fires.* | Bouncing is *cheap early, costly at the high-fire*; the checkpoint is the restorable "before-the-high-fire" state. |
| **Wrong atmosphere / over-firing / a bad glaze** | **A violated constitution / a bypassed veto / an unsafe design** | The **quality constitution is the kiln's atmosphere + glaze recipe** — get it wrong and *every* piece is ruined. |
| **Reading by cones / thermocouple (a summary read)** | **Judges read a *summary*, not the whole lane; the human reads the gate report and decides** | *"One human, many judges"* = many instruments for one operator, never ten operators at one kiln. |
| **One chamber, not many furnaces** | **"A kiln, not a foundry"** | The local substrate means *one chamber*: a single lane, not a parallel mesh. |
| **Not re-firing for every piece; keep the chamber hot** | **Model-affinity batching** — re-loading a new model is *re-heating the kiln from cold* (a switch/re-fire cost); batching similar units in one firing avoids the reheating | *Keep the kiln hot.* The held model is the hot kiln; the switch is the cold re-light. |
| **Let the firing run to finish after the form is set (post-bisque)** | **The unattended tail** — after **Spec**, a human may let the lane *finish the firing and cool* autonomously to a PR | *But* a cracked piece still breaks it (below). |
| **The human loads and unloads; the chamber runs between** | **The gates are the only human touchpoints; the lane runs unattended *between* them** | The firing runs itself between holds; a human is at the kiln *only at the holds and the unload.* |
| **The firing *programme* is the batch plan; the kiln is *one* firing** | **The Roadmap is *one* program of rows, each row its *own* firing; the kiln never advances the program** | A *batch* is several firings planned together by the potter; KILN's chamber is a single firing, and *between* firings the *human* re-plans — that handoff is **Gate 0.** |
| **The potter decides the batch between firings** | **Gate 0 — Roadmap; a *pre-lane* gate that re-opens at each row's PR seam** | The kiln does not load itself; neither does a lane advance the program on its own. |

---

## 3. The firing schedule, drawn against the gate rail

The cleanest way to see the map is to put a firing curve next to a gate plan:

```
   A KILN FIRING                              THE LANE
 ────────────────────────────────────────────────────────────────────────────────
 ● load greenware   ────────────────────▶   intake: a unit of work — fragile, unfired
 ● preheat, drive
   out water (cheapest step) ────────▶      triage     — the cheapest decision, the cheap head
 ▲ ramp, low heat   ─────────────────▶      contract:  Concept · Architecture · Spec
   (cheap — cheap to open early)             (cheap to fix early; "fix it before firing")
 ● SOAK / hold @
   vitrifying temp ──────────────────▶      a GATE / lane-hold: the lane DWELLS at the
   (the hold does the work)                  frontier for a human APPROVE / REVISE / REJECT
 ▲▲ high fire, peak ────────────────▶       execution tail: Plan · Checkpoint · Review
   (expensive — costly to open)               · Verification · Docs · PR  →  the heavy build
 ▼ controlled cool  ─────────────────▶        Spec-frozen form holds; verification measures
   (rush it → cracks / thermal shock)         the cooled build; rush past a VETO → the lane HALTS
 ● unload, inspect, decide ──────────▶       PR gate: the human takes the finished, hardened
   keep it or scrap it                        piece (a ready-to-merge PR) in hand
 ────────────────────────────────────────────────────────────────────────────────
   one chamber · one profile · held between   one lane · one firing · a human only at the
   human touches, runs itself                 holds and the unload
```

Two readings fall out of the diagram at once. From the **left**, every kiln fact
is a system decision dressed in thermal clothing; from the **right**, every lane
decision is a firing step in disguise. The system is *designed to be read either
way* — that is the test of a good mentoring model, and it is why the kiln survives in
the name.

---

## 4. The strongest clauses, walked

### 4.1 "Do not open the chamber mid-fire" *is* the lane-hold

The single most *earned* mapping in the set: a kiln firing must run **sealed and
uninterrupted**, or the *thermal shock* of the open door cracks the piece. The lane
does exactly this: a gate is a **lane-hold** — the lane *dwells* at a gate, its
**judging model resident** (the head that was *judging* is the head that *waits*),
rather than being swapped out to free a slot. A model switch (a "model-switch") that
evicted the judge *mid-judgment* would be precisely the open-door thermal shock that
*cracks the result.* The lane-hold exists for exactly this reason, and its
*consequence* is what "the chamber stays closed."

### 4.2 The hold *is* the decision, not the heating between it

A kiln's *soaks* are where the work happens — the chamber holds and something
matures. A lane's **gates/holds** are likewise *the events*: the decision is made
*at the dwell*, not in the firing between. This is why a lane is mostly *dwelling*
(a human at the gate) with *short burnings between* (autonomous work toward the next
gate), and why "running a lane for a few minutes" feels wrong — you would not call a
firing that *bypasses its soak* a firing.

### 4.3 The controlled cool *fixes the form* — Spec then verification

Cooling is not the firing *ending*; it is the step that *locks the form in.* In the
lane, **Spec approval** plays this role: once the spec is approved, the *form* the
build must take is *fixed and reference-able*, and **Verification** later measures the
*cooled* build *against* it — anything past-cool that deviates is a **defect**, not a
surprise. And "do not rush the cool past a crack" is **exactly** the unattended
clause below: *never let the cool rush past a line-of-defense veto.*

### 4.4 The kiln never grades the piece — author/judge separation

A kiln is *transformative* but *non-judgmental*: it does not decide whether the piece
is *good* — that is the **operator's** decision at *unload*. The lane keeps this: the
**workers shape the clay** (Author, Designer, Writer, Researcher — *authoring*), the
**lane hardens it**, but *"did we get this right?"* is the **human's** call at each
gate (*unloading*), and **no model may approve its own work** (no judge is also its
own author). The kiln is the cleanest possible image of *a process that does not get
to be its own gate.*

### 4.5 One human, many instruments — never ten operators at one kiln

A kiln reads itself by **cones and a thermocouple**, not by comprehending the whole
flame — the *summary*, not the fire. The lane mirrors this with **judges that read a
summary** (the gate report, a distilled read of the frontier) for **one human
operator**, never ten operators at one kiln. *One human, many judges* is "one
operator, many cones": the *judgment is distributed* over the lanes' gates, but the
*decision is singular* at the operator.

### 4.6 Keeping the kiln hot — model-affinity batching

Re-lighting a cold kiln for every piece is *wasteful* (a cold start, a slow ramp,
energy spent getting back to temperature). The lane prices the same thing:
**loading a new model ("a switch") is re-heating the kiln from cold** — a *switch
tax* — so the scheduler **batches affinitive units into one firing** instead of
firing each individually. The *held, resident model* *is* the *hot kiln*; a *switch*
is the *cold re-light;* batch the like, keep the kiln hot, and the firing cost stays
low.

### 4.7 The unattended tail: *let the firing finish, but a crack still breaks it*

After the *form is set* (post-**Spec**, the post-bisque point), a *kiln may run to
finish* autonomously — and that is the **unattended tail**: the human pre-authorizes
the *approve* side of the trailing gates (`Plan → Checkpoint → Review → Verification →
Docs → PR`) and lets the lane drive to a **ready-to-merge PR** with no further
operator stops.

But the kiln teaches the *limit* with unusual clarity, and it is the load-bearing
clause for the unattended tail's design:

- A kiln firing is **not** *safe* just because the door *closed*. *Closing the door*
  is **not** the *same* as *a piece being fine.* (A human *pre-delegating the approve*
  under unattended mode is *conscious, logged, and distinct* — a *deliberate
  firing-start* — from a gate that *simply ran with no human present* because the UI
  was missing; that second thing is a **missing-door silent failure**, the forbidden
  case, and it must never be logged as "OK.")
- A **cracked piece breaks the firing.** Any line-of-defense veto — an **architecture
  critic objection**, a **code-reviewer `restart`**, a **verifier/diagnosis `reject`**,
  or a **checkpoint that overflows/splits** — is the *crack in the cool*: under
  unattended mode it **halts the auto-cruise and returns the lane to the human.**
  *Auto-proceed answers "if the piece survives cooling, don't bother me — it's fine,"*
  *not "ship it even if a judge says it's cracked."*

This is the *kiln's* argument for the unattended tail's one safety floor: **a human
pre-delegating the approve ≠ a gate silently auto-approving under missing UI; and a
judge's objection always *lifts* the pre-delegation, the way a crack always *breaks*
the cool.**

### 4.8 The constitution is the kiln's atmosphere and glaze recipe

A firing's *environment* — oxidation vs. reduction atmosphere, the glaze recipe, the
*cone* target — is *co-determining*: a bad atmosphere ruins a good curve and vice
versa. The lane's **quality constitution** is the kiln's *atmosphere + glaze
schedule + cone*: the *binding law the work must satisfy* for *every* firing. A
feature that violates the constitution is *over-glazed in the wrong atmosphere* —
the *failure is in the surroundings, not the heat*, and so it must be caught *before*
the unattended tail is allowed to run.

### 4.9 The firing *programme* is the Roadmap — and Gate 0 is the human *between firings*

A *batch* is several firings *planned together by the potter*; KILN's kiln is **one** firing (one roadmap row). So the **Roadmap** is the *firing programme / batch plan*, and **Gate 0 — Roadmap** is the *human between firings*: a chamber never *advances the programme itself* — it fires the *admitted* firing and stops at its **gate 9 (PR)**, where the human decides the next firing, or none. That handoff is also why a **missing Gate-0 face** must degrade to *"the programme + a `WAIT gate0`,*" never a chamber that starts the next firing on its own.

---

## 5. Where the analogy *stops* fitting

Honest mapping is worth more than a tidy one, so the *gaps* are stated:

- **No heat physically moves through software.** "Firing" is *metaphor*, not
  *thermodynamics*; "cooling" is *sign-off / locking-form*, not *temperature loss*;
  *vitrification* is *the spec-pinning + verification-measurement*, not a *real*
  phase transition. *Take the clauses, not the physics.*
- **A fired piece is *not* literally un-repairable.** Code has a *real* `git`
  undo. "Cracks" are *expensive to fix* (sunk-work, broken flow, a cooled-but-wrong
  form), not *physically impossible* to fix. The *checkpoint* is the honest
  substitute for "the kiln can't un-fire a piece": *roll back to the last good
  commit, not to a hypothetical un-fired state.*
- **A kiln *cannot argue with the potter*.** KILN's *judges* (the critic roles
  and the reviewer/verifier) do something a real kiln *cannot*: an *independent
  judgment that can say "no," with reasons, that sends the piece back.* This is a
  *deliberate departure* from a *pure* kiln — *named as such*, not glossed over.
  In a real kiln, a bad piece is *discarded*; in the lane, a bad piece is
  *diagnosed, the schedule adjusted, and re-fired* — the *mitigation loop* is a
  *layer the kiln does not have*, and it is *load-bearing* for the unattended
  tail ("a crack can be *diagnosed and re-fired,* not merely scrapped").
- **A firing finishes *one object*; a lane's output is *an artifact plus a PR*,
  that then *merges into a larger body of code*.** The kiln does not capture the
  *chaining* — a *finished* piece *becomes seed-clay for the next firing*. KILN
  emits *a diff*, the *merge* of which is the *next load of greenware, on the
  same chamber, in the same kiln* — a *conduit* the kiln analogy *elides.* The kiln analogy stops there — **KILN makes the conduit explicit and judged**: the **Roadmap** names the *order and dependencies* and **Gate 0** is the human *between firings* (§4.9); chaining is *opt-in and logged*, never an automatic advance.
- **A kiln has *no crisp *spec* to grade the cooled piece against.*** In ceramics,
  the potter compares to *intent*, *loosely*. In the lane, **Verification** measures
  a *frozen spec* (a crisp, test-able reference) — *tighter* than any kiln could be.
  The *analogy under-sells* this: *the lane's "cool" is a *precision* cool, not a
  *felt* one.*
- **Constitution ≈ atmosphere + glaze, not equal.** The constitution is *the binding
  law*, not merely *the environment*; it binds across *firings*, across *batches*,
  not just *within* one. The kiln analogy *suggests*, it does not *imply*, this
  generality — it must be *stated*, in the constitution, not borrowed from the
  metaphor.

---

## 6. One-line summary

The kiln is the right name because the firing is the right shape — one chamber, one
planned, *staged, held* curve, run *hot between human touches*, finished *by a
controlled, *independent* cool that can still say "cracked, scrap it,"* never by the
kiln *itself.* Everything else in KILN — the lane-hold, the gate rail, the
unattended tail with its one veto-lift, the constitution-as-atmosphere, the
affinity-as-keep-the-kiln-hot — is a *clause of this one analogy, walked out to its
consequences; and that is *what the name is for.*
