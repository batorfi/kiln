# The Kiln Actually Fires — a plain-language overview (r7 / 006-kiln-live-inference)

*This is the human-readable companion to three reports: the
[implementation report](./implementation-report.md) (what was built), the
[verification report](./verification-report.md) (how it was proven), and the
[code review report](./code-review-report.md) (what is still wrong with it).* It explains what r7 did, why it
matters, and where it is honestly still imperfect — in prose, without the tables. Every number here comes from
those reports.

---

## The one-paragraph version

The KILN project is a software factory that runs entirely on models hosted on your own machine, with a human
deciding at every gate. Its first three phases proved the machinery — but, as this phase discovered, they proved it
with a **stand-in**: the "live model" of the third phase was a small function returning a canned label, and
the safety check that promised "nothing reaches the internet" was, in two of its three copies, **looking at zero files**.
r7 fixes both. It connects the factory to a **real local model**, teaches the lane to wait for a real model's
slow answers, replaces the sleeping safety check with one that genuinely reads the code, and adds a checker that
*actually places a call* to prove a real model answered. It was then attacked on purpose — seventeen deliberate
breakages, all caught — and reviewed; the review turned up a handful of real problems, which were recorded here rather than hidden — and then fixed.

---

## Where the story stood

**KILN** is named for a kiln: it fires one batch at a time, in one chamber, and it holds its heat between
batches. In software terms that means **one lane, one loaded model at a time**, and the model is only swapped when
the work genuinely needs a different one — because swapping is the expensive move. A feature travels through
**nine gates** (concept, architecture, spec, plan, checkpoint, review, verification, docs, pull request), and at each one a
**human decides**. Before any feature starts there is a **Gate 0**, where a human approves the whole program of
work. The one rule the whole design rests on is that *no model may approve its own work* — and a missing screen or a
missing person must never be allowed to quietly approve something either.

Three phases were built on that idea. The first built the lane, the gates and the log. The second drew a roadmap
view. The third, **r3**, was billed as "the first live firing" — one feature walked through all nine gates on a real
local model.

That last claim was not quite true, and finding out why is the origin of r7. The worker slot that the lane hands tasks to
is called the **resident**. r3's resident *looked* live: it reported a model name and produced different-looking
output for each task. But underneath it was a **pure function** — it never called any model. There was no client for
a model server anywhere in the code. The model name it reported, `llama3.2:3b`, wasn't even installed on the
machine, and nothing could ever notice because nothing ever looked it up. And whatever the resident returned was simply
thrown away by the lane. This wasn't deception; the stand-in was deterministic on purpose, so that runs could be
replayed and checked. But the documents oversold it, and r3's own overview describes a real model firing that never happened.
r7 exists to make that sentence true.

It sits *before* the "publish to GitHub" phase for a practical reason. Publishing freezes a surface: an installer and docs
get written against it. Making the lane wait for slow model answers changes that surface, so it is far cheaper to do it first.

---

## What r7 set out to do

In one sentence: **make the kiln fire a real local model, prove that it did, and do it without weakening the rule
against reaching out to the internet.** The last clause turned out to be the hard part, because the moment the factory
talks to a model server, it is making a network call — even if the "network" is just your own machine.

---

## The five pieces

### 1. A worker that really talks to a model

The new resident talks to **Ollama**, a program on your machine that hosts models and answers requests at a local
address. For each task the lane hands over, the resident sends one request — roughly *"you are the code-reviewer
role working on unit 'review'; describe your work product in one sentence"* — waits for the reply, and returns it.
Real output from the run: for a "concept" task the model wrote *"I define the core logic, requirements, and functional
behavior of the feature."*

The interesting part is the set of details that make this trustworthy:

- **Repeatable.** The request fixes the randomness (temperature zero, a fixed seed), so the same task gives the same answer
  within a session. That is what lets a run be saved and replayed later.
- **The "thinking" trap.** Many modern models silently *think* before answering. If they spend their whole allowance thinking,
  they hand back an **empty answer with no error at all**. The resident tells the model not to think — and treats an empty
  answer as a fault, never as a result. This is not theoretical: when that instruction was deliberately removed and the real model
  was called, it returned nothing, and the resident raised a clearly named error.
- **Failures have names.** Model not installed, server not running, no answer in time, empty answer, an error status from the server, a
  second task started while one is running, an address that isn't local — each is its own named failure, so nothing has to be
  guessed from an error message. (One gap remains: a server that answers "success" with a body that isn't valid data still escapes as a raw error — see the review findings.)
- **One task at a time, enforced twice.** The lane only ever runs one task, and the resident *also* refuses a second one while
  one is in flight, so the rule holds even if something misuses it.
- **It only talks to your own machine.** The resident refuses any server address that isn't local — and that includes an address
  supplied through the `OLLAMA_HOST` environment variable, so a setting can't quietly point the factory at someone else's computer.
- **Its answers are kept for the run, but never written to the log.** More on that below.

### 2. Teaching the lane to wait

Until now the lane called its worker like calling a function: ask, and the answer is *there*. A real model takes seconds.
So the whole path from the lane down to the probes had to learn to **wait** for the worker. The best analogy is going from
asking a colleague across the desk to sending a letter and waiting for the reply — but with the same strict rule of only one
letter out at a time. Nothing became parallel; the "one lane" principle is intact, and a test proves at most one task is ever in flight.

Two subtleties are worth knowing. First, one check must stay *instant*: a "weak judge" — trying to give a reviewer or verifier a
cheaper model than the strongest — must be rejected **before any model is even called**. Making that check wait would have quietly
weakened it, so it was kept as an immediate error. Second, nothing old had to change: the fake workers from earlier phases still fit,
because waiting on something that is already ready costs nothing.

Because this touched about forty places, "nothing else changed" was measured rather than assumed. The earlier runs are
deterministic, so five saved logs were regenerated and compared byte for byte with the old ones: four were identical, and the
fifth differed on a single line — the line saying which worker ran — because the old file on disk had been produced in fake-worker mode.

### 3. The inspector who wasn't looking

This is the discovery that mattered most. KILN promises **zero cloud**, and three checks existed to prove it, by scanning the code for anything
that reaches the network. When r7 planted a deliberate violation to test them — a forbidden import and a raw web call — **all three checks
stayed green**.

The reason was almost comic. Two of the three checks asked, "is this path a file?" of each folder they were meant to scan; a
folder is not a file, so they skipped every folder and **examined nothing**, then reported success. The third did read some folders but
never the one where the worker code lives. So the promise had been *true* of the code but *unprovable* since the very first phase — and
every later document that cited "zero cloud ✓" was citing a check that could not have failed.

r7 replaced the three copies with a single scan that genuinely reads the code, recognises a network call even when nothing is imported
(a plain `fetch` needs no import), flags network and process modules, ignores comments, and — the safeguard that matters — **fails if it
ever finds no files to look at**. The same planted violation now turns every probe red, and each probe reports how many files it read (33).

The scan also has to allow *one* door, because the new resident must call a local server. The project's "no cloud" rule is about
external round-trips; a call to your own machine isn't cloud, and a human made that call explicitly. But the permission came with a
condition: **the guard must end up stronger, not weaker.** So the exception is narrow — exactly one file may reach the network (matched by
its path, so a same-named file elsewhere doesn't inherit it), only to a local address, and that file may not name any other host.

### 4. A checker that actually places the call

The earlier readiness checks asked *"is the live path wired up?"* — and a fake satisfies that just as well as a real model.
The new check, **OllamaReady**, asks the questions a fake can't answer. It is the difference between an inspector who confirms a kiln has a
chimney and one who lights it. In plain terms it asks: does the server answer? Is the *named* model installed? Does a real request return
real, visible text? Was the choice of worker recorded? Was the "live" claim actually **performed** — did the counted round-trips match the tasks? And is the
safety scan green with exactly one door open?

That fifth question is the heart of it. The resident counts the calls it truly made, and the checker compares that count to what the run *claimed*. A stand-in
that claims to be live but never dials leaves the counter at zero and is caught — while the older readiness check, shown the same stand-in, stays green.
That contrast is the whole reason the row exists.

Two rules shape how it behaves. **A skip is never a pass:** with no server or no model, the checker reports "skipped", says why, and still counts as *not
ready*. And each of its six deliberate-failure switches trips the question it targets, so the failure names exactly what broke.

### 5. Evidence you can replay, and the first price tag

**Replayable evidence.** One real run — all nine gates, driven by the real model — was saved into the repository as a log. It replays offline through
the project's untouched validator and passes, and a deliberately broken sibling (a gate with no human decider) fails and names the rule it broke. A fresh
live run, later, reproduced that saved log **byte for byte**, which works because the log never contains what the model *said*, only that a task ran, and
the clock is deterministic.

**A number for the cost idea.** KILN's central economic claim is that *switching* models costs far more than *working*, so the design avoids
switching. That claim had never been measured. Now it has: with the model's files already cached by the operating system, a reload took about 2.7 seconds
against 0.45 seconds when warm — roughly **6×**. On the very first load from disk it was closer to **64×**. Because the ratio depends so much on the machine's state,
the test asserts a conservative floor rather than either number.

---

## What the log does — and does not — say

The factory log is the audit trail: a closed terminal must leave a complete story. So it records that a task ran, in which state, and *which worker* did it, in a
symbolic form: *"resident selection → live model gemma4:12b @ loopback"* — the words "@ loopback" stand in for a raw address, because a ledger is for reconstructing
decisions, and an IP address is noise. It deliberately does **not** record the prompts or the model's answers. Those are held in memory for the walk and then gone.
That was tested by planting an output in the log on purpose; the test caught it.

---

## How it was proven

The verification did not reuse earlier results. It started from a **fresh clone of what is on GitHub** and rebuilt everything there.

- The everyday test suite — 196 tests at the time, of which 12 are live-model tests that skip and print their reason — passed, and passed identically when
  Ollama was pointed at a dead address. The whole suite with the live tests enabled passed all 196 against the real model, starting from a cold load. (After the review fixes it is 229 tests, and the live run is 229 of 229.)
- Every readiness check, every one of the 13 deliberate-failure switches, and five full pipelines (regenerated, then judged by the untouched validator) behaved as designed.
- A second model of a different kind — one that does *not* support "thinking", 51.7 GB — was called too, to check the resident's instructions aren't specific to one model. It answered.
- Then came the important part: **breaking the code on purpose**. Seventeen deliberate sabotages — letting any address through, accepting empty answers, dropping a required wait,
  letting the model's output leak into the log, reviving the old blind scan — and every one was caught by the test meant to catch it. Two of those were run against the real server,
  including removing the "don't think" instruction. A test suite that can't fail proves nothing; this one demonstrably can.

Along the way the verification also caught a mistake *in its own documentation* (two record counts were off by one), which was fixed.

---

## What the code review found — and what was done about it

A code review then read the code looking for defects, and confirmed each one by running it. It was done by the same session that wrote the code, so it is thorough but
not independent — a second reviewer should sign off on the top items before anything is published. It found real problems. All twelve have since been fixed, each with a
new test, and each fix was broken on purpose afterwards to prove the test notices.

1. **The one-command way to run the live tests quietly ran nothing.** The `npm` scripts used paths that didn't resolve from where npm runs them, so "run everything live"
   reported *zero tests, success* — the most serious finding, because a silent pass is exactly what this project is built to prevent. **Fixed:** a small runner resolves paths
   from its own location, sets the environment itself, and *refuses* a run that executed nothing. `npm run test:live` now genuinely runs all 229 tests.
2. **The resident followed web redirects.** A local server could have sent it — and the prompt it carries — to a different address, so "only your own machine" held for where a
   request was *aimed*, not where it *ended up*. **Fixed:** any redirect is refused, with a named error.
3. **A failed task left the lane stuck and the log empty.** **Fixed:** the lane reclaims its slot, and the walk now writes a durable "wait" record naming the unit and the failure code,
   then stops loudly with the partial log attached — so a failure is recorded and can't be mistaken for success.
4. **The safety scan could be fooled.** A `//` inside a string could make it delete a later network call, and it never read subfolders or `.js` files. **Fixed:** it now reads code the way
   a lexer does, recurses, and flags the cheap evasions. It is still a lint, not a sandbox — the runtime refusals (local address only, no redirects) are the real enforcement.
5. **Nothing kept the model loaded.** Ollama unloads an idle model after five minutes, so a run waiting on a human quietly paid the cold-load cost again. **Fixed:** the resident asks the server to
   hold the model (30 minutes by default) and can also unload it on request. Measured live: held until about 30 minutes out.

The smaller items were fixed too: a malformed response is now a named failure; contradictory options are refused instead of silently dropping the worker; the checker separates a server that is
*absent* (skip) from one that answers *wrongly* (fail, by name), verifies the worker that actually ran, and has an overall deadline; the "untouched" test was pinned to r7's own commits so it won't cry wolf
later; the cost test became its own opt-in so it can't unload the model under the others; and some housekeeping.

## What r7 deliberately does not do

- **It doesn't really swap models.** When the lane records a "swap", both sides name the same model — the swap is bookkeeping. r7 measures a real load and can now unload a model on request, but mapping different roles to different models (and unloading the old one at a swap) is the natural next step.
- **It doesn't judge whether the model is any good.** One model wrote a fluent, confident line claiming to have completed unit tests for a spec step. It proved the kiln *fires*; whether the output is *good* is what the gates and the human are for.
- **The live tests are opt-in.** They need a running Ollama and an installed model, and they can rot if nobody runs them.
- **It was verified on one machine** — macOS, one Node version, and two of six installed models. The largest installed model (135 GB) can't even load on a 96 GB machine, so that edge case is untested.
- **It admitted nothing.** The roadmap is untouched. r7 fired the approved program and reopened the front door; closing it out is the human's decision.

---

## Trying it yourself

The everyday tests need nothing installed beyond Node, and they can be run from anywhere:

```bash
cd kiln && npm test                                   # 229 tests; 12 live ones skip, each printing why
node kiln/tests/run.ts                                # the same, from the repository root
```

To fire a real model, run Ollama with a model such as `gemma4:12b`, then:

```bash
cd kiln && npm run test:live                          # all 229 tests against the real model, one file at a time
cd kiln && npm run ollama-ready                       # READY — 9 round-trips for 9 tasks
```

(The cost test unloads the model, so it is a separate opt-in that `test:live` includes and forces to run serially. A plain `KILN_LIVE=1 node --test` skips it with a printed reason
instead of disturbing the other tests.) The runner refuses to report success if it ran nothing.

---

## Where it leaves the program

r7 is complete, tested, and — after the review — hardened. One question is still open, and it is small: if someone turns the live tests on but Ollama isn't running, the tests fail loudly rather
than skip, whereas the spec's wording says skip. It's safe, but it needs a decision.

The move after that belongs to a human: close r7 at the Gate-0 seam, and re-admit the publishing, installer and docs phases that were waiting behind it. The three problems the review flagged as sitting
on the surface the *next* phase is about to publish — redirects, failure handling and the scan — are fixed, which was the reason to fix them first. One fact worth carrying forward: the repository is
**already public**, so "publish" is really about producing a curated release, not making the code reachable.

---

## A short glossary

- **Resident** — the worker slot the lane hands each task to. It reports which model it is and runs the work.
- **Lane** — the single line every task travels down; one task at a time.
- **Gate** — a checkpoint where a human decides. Gate 0 approves the whole program before any feature starts.
- **Ollama** — a program on your own machine that hosts models and answers requests locally.
- **Loopback** — your own machine's private address (`127.0.0.1`). Talking to it is not "cloud".
- **Factory log (ledger)** — the durable, timestamped record of everything that happened, checkable by a validator.
- **Probe / readiness check** — a test that answers "is this capability really here?" and fails by name if not.
- **Allowlist** — the short list of files permitted to do something dangerous; here, exactly one file may reach the network.
- **Fixture** — a real run's log saved into the repository so it can be replayed and checked offline.
- **Mutation testing** — breaking the code on purpose to confirm the tests notice.
