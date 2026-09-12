> Status: ground-up concept
> Type: skill — Feature-size Triage (a gate, not a worker)
> Companion docs: `20260911-concept.md` (vision), `20260911-gates-why-how-what.md`
>
> Grounding: the "skill" framing and triag's *two outputs / skip-rule* follow `pipeline-template`'s
> triage concept (a gate in KILN, not a worker role in `pipeline-template`). KILN-specific deltas
> (it *is itself a gate*, the skip-rule is the lane's cost optimization, not a separate concept)
> are ground-up.

# KILN — Feature-size Triage: decide the whole path through the kiln in one move

## 0. KILN vs pipeline framing

**Triage** is a **gate**, not a worker: it runs *first*, the moment the human hands the director a
raw idea, and its verdict decides **which gates this feature walks**. It is the single cheapest
decision in the whole pipeline — a cheap head decides whether a small feature *skips* Concept and
Architecture entirely. This is `pipeline-template`'s "feature-size triage" idea, sharpened into a
gate and made the **lane's cost optimization**: a small feature that skips two heavy, strongest-
tier gates is *far cheaper to run on the single lane* than the full walk.

## 1. Purpose

Read the raw human input and emit **two things**:

1. **A feature size** — `small-triage` or `standard` — by **counting the user-story complexity**
   and **scanning the input for known complexity indicators** (cross-cutting change, new external
   dependency, ambiguity, etc.).
2. **A skip-decision** — `small-triage` features **skip the Concept *and* Architecture gates**;
   everything else runs **all nine**.

This is what lets the kiln stay cheap: small features take the **short lane**.

## 2. Input

The **raw input the human just handed the director** — a doc, a ticket, a transcript, or a few
sentences. Triage is the *first* read of it.

## 3. Output

Two decisions, made by a **cheap** head:
- **Feature size:** `small-triage` or `standard`.
- **Gate set:** the **short path** (all nine minus Concept + Architecture) or the **full path**
   (all nine).

The director records this in the feature's spec and the lane's plan.

A **companion decision** is made *later*, not at triage: once the human has
approved the **spec**, they may flag the *remaining* gates (Plan through PR)
**run-unattended** — pre-authorizing each approve and letting the single lane drive
to a PR with no further stops. Triage trims the **front** (Concept + Architecture
for `small-triage`); the unattended flag trims the **back** stops of a feature
whose contract is already approved. The two compose — a `small-triage` feature
whose spec is approved can cruise the whole tail — and both are recorded in the
lane's plan.

## 4. What must NOT happen

- **Do not be a worker** — triage decides the *path*, it doesn't *do* the feature; that's the workers behind the gates.
- **Do not skip the per-checkpoint gates or the Review/Verification gates** — only the **two
   front, strongest-tier** gates (Concept, Architecture) are skippable; the safety-net gates are not.
- **Do not over-classify** — a feature called `standard` when it's really `small-triage` pays the
   full nine-gate cost for nothing; a feature called `small-triage` when it's really `standard`
   skips the very gates that would have caught its complexity — the cheaper *call* is the more
   expensive *mistake*. Classify, don't default.
- **Do not auto-cross a safety-net gate on autopilot.** The unattended flag only
   pre-authorizes the *approve* side of the trailing gates; it must **never** lift a
   line-of-defense veto — a reviewer `restart` (gate 6), a verifier `reject` (gate 7),
   or an arch-critic objection still **halts the lane and returns it to the human**.
   Autonomy pre-schedules the green outcome; it does not blind the judges.

## 5. Model tiering (KILN)

Triage is a **cheap head** — the single cheapest decision, by design. On a **local** setup this
matters most *here*, because the decision is *fast and cheap* to re-run if wrong (it's just
a re-triage), but the *cost of being wrong* is the full lane it sends the feature down — which is
why the human, at any point, can correct a classification and the lane will adjust. The human is
the backstop, not the default.

**Placement on the lane:** triage is the **first unit**, before even the researcher; it's so short
and cheap it doesn't add a meaningful hold, but it commits the lane's *plan* — which gates and in
which tier order — for the rest of the feature. It is the **first model on the lane to resolve**,
so the director can schedule subsequent units by affinity from here.

## 6. Gate type (a gate, not a worker)

Triage **is** a gate — one the human *may override* at any point, even after a skip-decision. The
gate's three-move vocabulary (Approve / Revise / Reject) applies to the *gate's decision* (the
classification), and the human can force a re-triage. This is what makes a cheap classification
safe: **the cheap call is the default, the human is the override, and the override is always open**.

The same override-always-open discipline covers the unattended flag: it too is a
**human move the human can withdraw**, and it is **never** a silent fallback — a
judge's objection at any trailing gate lifts auto-proceed and puts the human back
in the loop.

## 7. Grounding

`pipeline-template`'s triage concept: "feature-size triage decides whether a feature gets the full
gate walk or a reduced one; `small-triage` skips the concept and architecture gates." KILN deltas:
(§0) triage *is itself the lane's cost optimization* (the short lane), not just a classifier; (§5)
placement as the **first lane unit and first model to resolve** (so the affinity queue can order
from it) is ground-up KILN; the *gate* framing with *override-always-open* is KILN's gate-rail
applied to triage specifically.

*Triage is the kiln's front door: one cheap decision that picks the whole path the feature walks —
and the door stays open, because the human can always send a feature back for a longer walk. The
**unattended tail** (spec-on, run-unattended) is the back-door companion: after the contract is
approved the human may hand the remaining gates to the lane, a pre-delegation that a single
independent objection can always revoke.*
