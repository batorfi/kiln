# First Live Firing — a plain-language overview (r3 / 004-kiln-live-walk)

*This is the human-readable companion to [`implementation-report.md`](./implementation-report.md).*
It explains **what r3 did and why it matters**, in prose, without the tables and the jargon.
Every claim here is backed by the run's log and the test suite (124/124, `node --test`); see
[`compliance-note.md`](./compliance-note.md) for the principle-by-principle evidence and
[`quickstart-run.md`](./quickstart-run.md) for the observed command output.

---

## The one-paragraph version

A "factory" of software-development agents was built on one principle: do everything on *local*
models, with *no cloud*, and let a **human be the only gate that decides what gets run**. The first
two phases proved the machinery with a *fake* worker — enough to show the rules hold, but not
convincing on its own. This phase, **r3**, is the first to **fire a real local model through a full
nine-gate development cycle**. Everything that can silently go wrong in that chain — a gate slipping
past the human, a fake quietly standing in for the real model, or a sneaky network call — is now
covered by a test that either *confirms it holds* or *names exactly which part broke*. And,
deliberately, r3 did not let a new program start: it fired the demo and then *handed the front door
back to the human*.

---

## What "the kiln" is

The name is an analogy. A foundry holds a charge of metal at temperature inside a single chamber
until it's done; you can't fire two different heats at once, and you don't open the chamber to "peek"
— that would ruin the heat. The system mirrors this: **one lane at a time**, with the "heat" (the
loaded model) held constant between the points where a human must decide.

A feature's lifecycle is **nine gates**: *concept → architecture → specification → plan → checkpoint →
review → verify → documentation → pull request*. Each is a checkpoint a **human approves**. A tenth,
**Gate 0**, sits *before* the lane even starts — it is the single point where someone decides
*which program of features we are going to build*. Gate 0 is human-only, and it never opens on its
own. The system's famous failure mode is what happens when a gate *should* stop for a human but
doesn't — the code calls this **"the crack in the cool."** A line-of-defense check (a critic
objecting to the design, a reviewer demanding a restart, a verifier rejecting the result) is exactly
such a crack: it *halts the whole run and hands control back to a human* instead of plowing on.

---

## What r3 actually built

Five focused pieces, each layered onto what already existed:

**1. A real worker.** The "resident" is the worker slot the lane runs code through. Before r3 it
returned a *canned* answer. Now it can drive a **genuine local model** — something like a small
language model served on your own machine — doing actual, *different* work for each task. This is
"the kiln firing live."

**2. A switch that leaves a receipt.** You can run the worker with the real model (**live**, the
default) or with the old fake (**stub**, for when no model is reachable). The twist that matters:
*whichever you choose, the choice is written into the run log.* After a crash you can still read the
log and know exactly what ran. This exists to defeat one specific trap — a fake *silently* standing
in for the real thing. An "unrecorded" fake is treated as a fault the system is designed to *catch
and name*.

**3. A full, live walk.** A throwaway (intentionally trivial) task was pushed through **all nine
gates on the live model**, start to finish. Part of the way down, a stretch of gates is *pre-approved
in advance* — but that pre-approval is itself written down, explicitly the *opposite* of a silent
bypass. Near the end, a quality check *objects to* the work and **halts the run** — demonstrating,
for real, that a crack actually stops the lane and returns it to a human.

**4. A live interface smoke test.** The on-screen view has three layers — a status footer, a
per-gate popup, and a roadmap overlay — and it was confirmed they all draw from **one shared source
of truth** and only re-draw when something genuinely happens (no timers, no background polling).
Critically, when the screen isn't available (a headless run), the program is *printed* instead — and
a gate that should block **still blocks.** In short: *hiding the view never hides the decision.*

**5. A "ready?" probe.** One check confirms the whole live path is wired up, that the live walk
passes the system's validator, that the fake is still *recorded* when used, and that **no cloud is
involved anywhere** — and that the check can be *broken on purpose* so you can see which specific
part it catches. This is the proof that r3 is ready to hand off to the next phase.

---

## The guarantees — and why they are the point

The strength of r3 is not that it fired a model; it is that a skeptical reviewer can see it did so
*without breaking the rules*. Three in particular:

- **Nothing new was smuggled in.** r3 was graded by the *exact same validator* the earlier phases
   trusted. It did not redefine the rules to make itself pass — it added no new kind of log record,
   no new shape, nothing. If the live walk looks valid, it looks valid *to the same judge*.
- **The rules are falsifiable.** If you take a live walk and *remove* the human's approval from one
    gate, the validator doesn't merely fail — it **names that gate.** The system is built to *fail
    loudly and specifically* rather than quietly pass.
- **It respects the human's authority.** r3 deliberately admitted **no new program** and advanced
   **no gate**. It fired its demo and then *re-opened Gate 0 at the end* — leaving the decision about
    the *next* real feature in the human's hands. You can confirm this from the run's log: the only
    "Gate 0" entry is a "please decide" notice, not an "approved" stamp. And it all ran **with zero
    network and no external dependencies** — the "live" model is local, inside your process.

A skeptic can stand next to the log and verify all of the above in seconds — which is the whole point
of a *falsifiable* proof rather than an assertion.

---

## The human experience, end to end

Stripped to the people-level story: a human looks at a shortlist of features (the roadmap) and
**admits** it — that is Gate 0, and only a human can do it. The lane then works **one feature at a
time**, on a live local model, with a human approving each gate in the middle — or, where a human
wishes, *pre-authorizing a safe stretch in advance, on the record.* If anything in the quality stack
objects, the run **stops and hands back.** When a feature finishes, the front door **re-opens** so
the human can admit the next one. r3 is the demonstration that this whole loop works *live*, not on
paper — and it did that without ever being in a position to skip the human.

---

## What was deliberately left undone

r3 is a *smoke walk over a throwaway*, not the real thing yet. On purpose:

- The on-screen layers were exercised through an **abstract stand-in surface** — the real "where does
   the popup sit on screen?" wiring is a smaller follow-up.
- The throwaway task is trivial, not one of the later, real features.
- The biggest one: **nothing was let through the front door.** Admitting the next feature and
   advancing anything remains a human's move.

r3 proved the machinery; it did not take the decision the system is built to *reserve for you.*

---

*Status: delivered — 124/124 tests green, `git diff --quiet specs/ROADMAP.md` clean (r3 stays
`queued`, no gate advanced), zero runtime dependencies. Commit `06cad9c`.*
