# Plugging the Kiln In — a plain-language overview (r8 / 007-kiln-pi-extension)

*This is the human-readable companion to the [r8 spec](./spec.md) and its [quality checklist](./checklists/requirements.md). It explains where KILN stands, what r8 is
for, what we already learned by trying it, and where the road leads — in prose, without the tables. Every number here comes from the spec, and the measured ones can be re-run
from [`pre-spec-probe/`](./pre-spec-probe).*

> **Status, stated plainly:** r8 is a **clarified spec, nothing more**. No r8 code exists. The three open questions were decided by a human on 2026-09-21 (see
> [The three decisions](#the-three-decisions)), the next step is a plan, and the roadmap row is `queued`. What *does* exist is a small set of measurements taken on real software, which
> is why this overview can say what Pi actually does rather than what its documentation says.

---

## The one-paragraph version

KILN is a software factory that runs on models hosted on your own machine, with a human deciding at every gate. After four finished rows it has a lane, gates, a log, a real local
model that answers tasks, and the checks that prove each of those. What it does **not** yet have is a place to live. Everything so far runs from a terminal as a set of scripts and
tests, and the screens KILN draws were designed against an interface *KILN invented for itself* — they have never once been shown inside the program they were meant for, **Pi**.
r8 is the phase that plugs KILN into Pi for real. It starts by *trying Pi's extension system to find out what it truly allows*, then loads KILN into Pi as an actual extension, and
makes one thing unbreakable at the join: **a missing or silent human is never mistaken for an approval.** It is deliberately small. It builds the socket; the next three phases
put the lights, the staff and the manager into the room.

---

## Where we are

**KILN** is named for a kiln: it fires one batch at a time, in one chamber, and holds its heat between batches. In software terms: **one lane, one loaded model at a time.** A feature
passes **nine gates** (concept, architecture, spec, plan, checkpoint, review, verification, docs, pull request), and at each one a **human decides**. Before any feature starts there is a
**Gate 0**, where a human approves the whole program of work. The rule the design rests on: *no model may approve its own work* — and a missing screen or missing person must never
quietly approve something either.

Four rows are done (the roadmap numbers them r1, r2, r3 and r7):

- **r1** built the lane, the gates, the log writer and the scheduler.
- **r2** added the roadmap view and the human-only Gate 0.
- **r3** walked one feature through all nine gates — with a stand-in worker, as r7 later admitted.
- **r7** replaced the stand-in with a real local model, taught the lane to wait for slow answers, and made the "nothing reaches the internet" check actually read the code.
  It was then attacked on purpose and reviewed. (Its own [overview](../006-kiln-live-inference/overview.md) tells that story.)

The test suite stands at 233 tests, 12 of which need a running Ollama and skip, each with a printed reason, when it is absent.

**But look at what "done" means here.** You can run and inspect all of it. You cannot yet point KILN at a feature and have it run the process for you. There is no screen a human
answers a gate on, no command that starts a lane, no manager that turns an approved spec into work, and no specialised roles. The roadmap calls the first version, **`kiln-v1`**, a
*fully runnable factory*, and that is the gap. When the human decided this (2026-09-21) the work was split into four phases so no single one would be too large:

| Phase | What it adds | The picture |
|---|---|---|
| **r8** — *this one* | KILN loaded inside Pi, plus the facts about what Pi allows | the socket in the wall |
| **r9** | The real screens: footer, gate popup, roadmap overlay, on Pi | the lights |
| **r10** | The role agents, a model for each tier, and real model swaps | the staff |
| **r11** | The director and the commands; **acceptance: a newcomer runs a lane on a real feature** | the manager |

Only after all four does the **release** phase (r4) make sense, followed by the installer (r5) and newcomer docs (r6). Publishing something that cannot yet be run — and whose surface
r8 to r11 are about to change — would repeat exactly the mistake r7 was placed first to avoid.

---

## Why r8 goes first — and why it starts with a spike

The three phases after r8 (r9, r10 and r11) all depend, directly or through each other, on what Pi's extension system can really do, and **nobody has ever run it.** The whole UI design was written from Pi's *documentation and examples*. It carries
a table of which parts of the API are "confirmed" and which need a "spike", plus seven open questions that r2 and r3 both put off as "later polish". Each phase that builds on a wrong
"confirmed" pays for the mistake. So r8 begins where good engineering should: **by trying the thing.**

A *spike* is a short, throwaway experiment whose only product is knowledge. r8's spike has eleven questions — how KILN gets loaded, how commands behave, what happens to an
extension's memory when a session is reloaded, what every UI call returns in every mode, whether overlays survive, what happens to keys, where output goes when there is no screen, and
what Pi's own model has to do with KILN's. Each gets either a measured answer with a command anyone can re-run, or an honest "not measured, because…, owned by row…". None may be silently skipped.

---

## What we already found by trying

Before writing the spec, one small experiment was run against the real Pi installed on this machine (version 0.85.1): a throwaway extension, started through Pi's scripting mode in an
empty configuration folder, with **no model called and no network**. It took a fifth of a second per run. It found the following.

**The good news.** KILN's own code loads into Pi with no build step: two real KILN modules were imported from inside a Pi extension and worked. And a command registered by an extension
runs immediately, with no model involved. So "load KILN as a real Pi extension" is not a leap of faith. It is reachable, and it can be tested automatically.

**The surprises.** Four things in KILN's own design documents turned out to be wrong or incomplete:

1. **A "confirmed" API does not exist.** The design doc lists `ctx.ui.headless` as confirmed. Pi's UI object has 28 entries and none of them is that. Pi does have `ctx.hasUI` and a `ctx.mode`
   (`tui`, `rpc`, `json` or `print`) — but not what the doc said.
2. **KILN's screen call has no counterpart.** KILN's design "raises an overlay" as a one-way push. Pi's equivalent hands back a *promise* that completes when the human closes it — a
   different shape, so it cannot be swapped in one-for-one. The footer call also takes different arguments.
3. **A screen can be "present" and unable to draw.** In Pi's scripting mode the UI reports it is available — but the call that draws a popup returns nothing at all.
4. **Silence looks like success.** With no screen at all, Pi's questions to the human **answer themselves instantly**: a choice returns "nothing", a yes/no returns "no" — in zero
   milliseconds, and the whole process exits with code 0, as if all went well.

Points 3 and 4 are the reason the next section exists.

---

## The one rule r8 exists to protect

KILN's constitution has a principle: **headless never silently approves.** With no screen, a gate must become a durable "waiting" entry in the log — it must never advance on its own.
That principle is sound. But its *test* was written as "no screen means `!ctx.hasUI`", and the measurements show the world is messier than that:

- Sometimes **no screen** — and Pi hands back an instant "no answer" that a careless program could read as "no" or as "carry on".
- Sometimes **a screen that cannot draw** (the scripting mode), where the flag says a UI exists.
- Sometimes a person **cancels** a dialog, and the answer is "nothing" — the same "nothing" as the two cases above.
- Sometimes a dialog is set to **time out**, and after a few seconds it also answers "nothing".

Four different situations, one indistinguishable result. So r8 puts a **single translator** at the join between Pi and KILN. Its rule is short and strict: *only an explicit choice of one of the
offered options, from a mode that can actually reach a human, counts as an answer. Everything else is "no answer", and "no answer" becomes a waiting entry — never an approval, and not even a
rejection.* A timeout is never a decision either, so KILN will never attach one to a gate: a gate waits for a person, not for a clock.

This is the one piece of r8 where a mistake would be silent, so it gets the strictest test: every measured way Pi can fail to answer is fed to the translator, and each must come out as
"waiting". A deliberate mutation that turns any one of them into a decision must be caught **by name**.

---

## What r8 will build

1. **The findings record.** Answers to all eleven questions, with the evidence, plus dated correction notes on the design doc where it was wrong. The originals stay as written; corrections are
   appended, as is done elsewhere in this project.
2. **KILN as a Pi extension.** A single entry point Pi loads — by `pi -e <path>` and through a package manifest in `kiln/package.json` (decision 2). When Pi loads it, it registers commands and starts *nothing* — no process, no timer, no network call — and it survives a reload
   without registering things twice. It adds no runtime dependencies.
3. **A read-only status command.** It shows the factory's current state from inside Pi. It cannot start a lane, decide a gate, or write to the log. Where it *prints* depends on the mode (Pi
   shows nothing for notifications when there is no screen), and r8 has to say plainly which modes it can and cannot show.
4. **The translator** described above — the one seam r9 will later swap real screens into.
5. **A new checker, `PiReady`,** in the family of KILN's other readiness checks. It starts a real Pi in a clean, offline, model-free setting; loads KILN; runs the command; feeds the translator
   Pi's real non-answers; and reports READY — or fails **by name**, with names such as *Pi missing*, *version not measured*, *extension failed to load*, *command missing*, and above all
   *a non-answer was approved*.
6. **One human smoke test in a real terminal**, recorded in the verification report as done or not done (decision 1) — the part automation cannot reach.
7. **A package layout** with a written note saying where r9's screens, r10's roles and r11's commands each go, so none of them has to move anything r8 built.

Like r7's live tests, the Pi tests are **opt-in**: with Pi absent they skip and print why; if someone explicitly asks for them (`KILN_PI=1`) and Pi is missing, they **fail loudly**, because a quiet
skip there could make a broken setup look green.

---

## What r8 deliberately does not do

- **No real screens.** Putting the footer, popup and roadmap overlay on Pi is r9. r8 gives it the socket and the facts.
- **No roles, no models, no director, no lane-starting command.** Those are r10 and r11. r8's only command is read-only.
- **No gate is decided.** r8 writes no gate decision to the log. When the tests play a human answering, that scripted reply is never recorded as if a person had said it.
- **Nothing is published or installed.** The checker runs Pi with its network off.
- **No change to how anything existing behaves.** The 233 tests stay green, the earlier checkers are untouched, and the only edits to existing files are small additions and the correction notes.
- **It does not decide how Pi's model relates to KILN's.** Pi has its own session model; KILN has its Ollama worker. r8 *measures* what is possible; deciding is r10's job.

---

## The three decisions

The spec had three open questions. A human answered them on 2026-09-21, and each landed on the recommendation.

**1. What proves "loaded as a real Pi extension"?** *Decided: the automatic check plus one recorded human smoke test.* Testing through Pi's scripting mode is fast and needs no model — but that mode cannot draw an overlay,
and the terminal screen is the only place KILN's layers will ever live. So the automatic check carries the repeatable proof, and **one person, once, in a real terminal** confirms the rest: KILN loads, its status shows, an overlay draws
and closes, and a gate-shaped question answered by hand counts as an answer while pressing Esc does not. The verification report must say whether that was done — it cannot be left out or implied. (A fake-terminal harness was judged
a large build for a single phase.)

**2. How is KILN placed and loaded?** *Decided: an explicit load (`pi -e <path>`) plus a Pi package manifest*, so a later `pi install` works — and the check exercises both, the install into an empty temporary Pi setup so nobody's own settings
are touched. The tempting third option — dropping KILN into the project's own `.pi/extensions/` folder so it loads automatically — was rejected: it would load KILN into *every* Pi session in this repository, including the sessions that are
*building* KILN. That is a trap for a project that builds itself with itself, and there will be a test that no such auto-load exists.

**3. Does the constitution's wording change?** *Decided: no.* The principle is fine; the phrase "headless means `!ctx.hasUI`" is not sufficient. r8 implements the stricter rule, and writes down both an exact definition of "headless" and a note
explaining why code that is *stricter* than the text cannot violate it. The wording gets another look at r9, when the real UI exists and shows what it ought to say. An amendment stays available to the human at any Gate 0.

---

## Where it is heading

If r8 goes to plan, KILN can be loaded into real Pi and answers a command there; every question about Pi's extension system has a recorded answer; the design docs stop claiming things that were never tested; and the
"silent human" hazard is closed at its one entrance. Then:

- **r9** puts the real footer, popup and overlay on Pi and lets a human answer a gate *in Pi* — the first time the whole point of the project can be seen with eyes.
- **r10** brings the role agents and a model per tier, and turns the lane's model "swap" — which today is bookkeeping, naming the same model on both sides — into a real one.
- **r11** adds the director and the commands. Its acceptance is the real definition of done for `kiln-v1`: *a newcomer starts a lane on a real, non-throwaway feature in Pi, and a human answers its gates.*
  (The roadmap already flags that r11 may itself prove too big; that will be its own first question.)
- Then the **release**, the **installer** and the **newcomer docs**.

One hazard is recorded now and owned later: **two Pi windows open in one repository would be two lanes**, which the constitution forbids. The lane today lives inside one process, so a guard across processes is r11's problem.
r8 only notes that it exists.

---

## What is still unknown

Honesty about the edges of what was measured:

- **The terminal mode itself was not run** — only the scripting, JSON and print modes. Its behaviour is documented, not measured. That is exactly what the human smoke test in decision 1 covers.
- **One machine, one Pi.** macOS, Pi 0.85.1. Pi is before version 1.0 and changing; that is why r8 only *declares* versions it has actually run — the lesson learned from the Node version floor, where a range nobody had tested turned out to be wrong.
- **Linux and Windows** are unmeasured.
- **Reload and session-switching mid-gate** — what happens to a dialog left open across a reload — is a question r8 must *measure*; nothing is assumed.

---

## Trying the measurements yourself

You need Pi installed and Python 3. From the repository root:

```bash
cd specs/007-kiln-pi-extension/pre-spec-probe
python3 drive.py answer      # a scripted "human" picks 'approve'  -> SELECT_RESULT "approve", CUSTOM_RESULT null
python3 drive.py cancel      # the dialog is cancelled              -> SELECT_RESULT null
python3 drive.py silent      # nobody answers; Pi's 4 s timeout    -> SELECT_RESULT null, after ~4.2 s
```

Each run starts a real Pi in an empty, offline, model-free setup and prints what Pi's UI reported. These scripts are **throwaway evidence**: they are not part of the toolchain, are not shipped, and are replaced by
r8's own spike and by `PiReady` when the phase is built.

---

## A short glossary

- **Pi** — the coding-agent program KILN is built to run inside. It can be extended with small TypeScript modules.
- **Extension** — a module Pi loads to add commands, screens or behaviour. KILN becomes one.
- **`ctx.ui`** — the set of calls an extension uses to talk to the human: ask a question, show a message, draw a footer or an overlay.
- **Mode** — how Pi is running: a full terminal (`tui`), a scripted channel (`rpc`), a JSON stream (`json`), or one-shot print (`print`).
- **Headless** — with no way to reach a human. The measurements show it comes in more than one kind.
- **Seam** — the one place two systems meet. Keeping it single is what lets r9 replace the pretend screens with real ones by changing only this.
- **Spike** — a short, throwaway experiment whose only product is knowledge.
- **Probe / readiness check** — a test that answers "is this capability really here?" and fails by name if not. `PiReady` is r8's.
- **`WAIT`** — the durable log entry a gate becomes when no human has answered. It is a pause, never a decision.
- **Hermetic** — run in a clean, empty configuration so the operator's own setup cannot change the result.
- **Gate 0** — the human-only checkpoint where the whole program of work is approved.
