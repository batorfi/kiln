# The r42 spike report — an explainer

> **Type:** explainer — for understanding, not a specification. **Audience:** anyone who has to act on the r42 spike report (the architect at the Roadmap gate, whoever builds r13) and wants to understand *what was asked, what was done, what the table means and what it does not* — without reading the harness code.
> **Read with:** [the report](../../../specs/010-external-completion-spike/spike-report.md) (the verdict and the evidence) · [the implementation report](../../../specs/010-external-completion-spike/implementation-report.md) (how the work went) · [the contract](../../../specs/010-external-completion-spike/contracts/gate-completion-port.md) (what r13 may rely on) · [Pi Durable tasks](./pi-durable-tasks.md) (the library's task model).
>
> **Labels.** **[observed]** — seen by running the harness, with the evidence in the report. **[derived]** — computed by the rules from the observations. **[not tested]** — outside what was run. Facts about the library's design come from reading its package and from the observations; where they differ, the observations win.

## 1. The question, in a paragraph

KILN promises that **a gate waits for a person for as long as it takes, and is settled by that person's move and by nothing else** — not a restart, a crash, a lost connection or a clock. The plan is to build gates on **Pi Durable**, a library that saves a task's progress so a dead process can resume it. The worry: the library lets a task *wait* for other tasks or for time, but publishes no way for **something from outside** to complete a waiting task. Row **r42** was a time-boxed experiment to find out whether that primitive can be built, safely, on the pinned library (1.4.0) — **before** the rest of the durable core (r13 onwards) is built on an assumption.

## 2. The answer in a paragraph

**Yes — `go`.** [derived] One way of using the library keeps every promise we care about, including when the person's move arrives from a different process and when the program is killed at any instant: park the gate on a small "decision" task whose waiting step is held **in the memory of the one process that owns the store**, and let a move wake that step so it writes the move and finishes itself **in one commit**. It works only if the library's crash-loop guard is switched off, only if exactly one process owns the store, and only on the platform tested (macOS; Node 25.9, and Node 22.19.0 for the strategy the verdict rests on). The other way the library offers — marking the task aborted from outside — **fails**, for reasons that are instructive (§6). No fallback and no change to the library is needed.

## 3. The five promises ("guarantees"), in plain words

Each promise is a test that must pass for a strategy to count. Letters match the report's table.

| | Promise | Plain meaning | A violation looks like |
|---|---|---|---|
| **a** | **Atomic** | recording the move and settling the gate are *one* step | the store holds a move but the gate still looks open (or the reverse) — a "half-applied move" |
| **b** | **Exactly once** | sending the same decision twice (same key) never records it twice | two records, or a retry reported as a new decision |
| **c** | **First wins** | if two people decide at once, one wins and everyone else is told who won and changes nothing | two winners, or a loser that silently altered the gate |
| **d** | **No clock** | no timer, timeout, clock jump or number of restarts can settle — or park — a waiting gate | a gate that ends after a week, or stops accepting moves after enough crashes |
| **e** | **Resumes as it was** | kill and restart: a waiting gate is still waiting, a settled gate still settled with the same decision | a restart changes the answer |

Alongside, a **different process** must be able to deliver the move (the real completer will be the CLI or a server worker, not the process that owns the store).

## 4. How the experiment works — the one idea

You cannot prove "never half-applied" by looking at a running system. The harness instead **breaks it on purpose, at every step, and inspects the wreckage**.

```text
  1 start an OWNER process with a trap armed at step X        (KILL_AT=commit-after-write)
  2 a completer sends a move; the owner reaches step X and is killed with SIGKILL — no cleanup, no goodbye
  3 a FRESH reader (no owner, no memory) opens the store file and reads what the crash left behind
  4 the ORACLE checks seven store invariants (I1–I7)   ← a violation names the invariant and the step
  5 restart a clean owner, read again: did the restart change anything?
```

- **Named kill points** reach every step you can name ("inside the commit, after writing, before returning"). **Random kills** reach moments you cannot name (inside the database's own statements) but can only *condemn*, never acquit: a few hundred clean trials prove nothing about absence.
- The oracle judges **the store**, never the owner's memory — the same standard a real restart faces.
- The scenarios talk to a small **port** (`open` / `submit` / `state`) in KILN's terms, so the same tests judge any strategy, native or fallback.

### Can the harness itself be trusted?

That is the question a sceptical reader should ask first, and the report answers it with controls rather than assurances:

- A **correct** reference design (plain SQLite, one transaction) must read `held` on everything; a **deliberately broken** one (two transactions) must read `not-held` — and only at the seam between them. Both did [observed]. If the harness had said otherwise, the harness would have been wrong.
- The machinery **refuses to pass vacuously**: no scenarios, no kill point actually fired, an install that differs from the lockfile — each fails by name. A cell is `held` only if every scenario behind it *ran* and passed.
- 17 deliberate sabotages of the harness and its scenarios were each caught [observed]. A fresh clone of the branch reproduces the table.

## 5. The four contestants

| Name | What it is | Role |
|---|---|---|
| `control-sqlite` | the move and the gate's settlement in one SQLite transaction (no Pi Durable) | proves the harness can say *held* |
| `broken-two-commit` | the same, but in two transactions with a kill point between them | proves the harness can say *not-held* |
| **`native-signal`** | Pi Durable, "signal into a running step" | **the strategy the verdict rests on** |
| `native-abort` | Pi Durable, "abort-driven" | the other native option; **fails** |

A third native idea (`native-submission`) and two KILN-owned fallbacks were planned but **not tried** — they were conditional on both native attempts failing, and one did not.

## 6. Why one native design works and the other does not

**What the library offers.** A task can commit a document write *and its own next state* in one atomic commit. It cannot complete *another* task in a commit, and a task can wait only for other tasks or for the clock. The only outside entry into a task is "abort" [declared; confirmed by the observations].

### `native-signal` — keep the move and the completion in the same task

```text
 Gate task ── waits on ──▶ Decision task
                              │ step "wait": parks in the OWNER's memory:  await slot
   a move arrives ───────────▶│ wakes
                              ▼
                    ONE commit:  { write the move record  +  Decision := terminal(completed) }
                              │
 Gate task wakes (its dependency is terminal), settles
```

The record and the completion are the **same commit**, so there is no instant at which one exists without the other (a). Duplicates and rivals are judged against the **stored record** (b, c). Nothing sleeps, so no clock (d). After a kill, the library re-runs the decision's step, which waits again (e).

**What it costs** [observed]:

1. The wait exists only in the owner's memory. The library's crash-loop guard stops re-running a task that was cut off **5 times in a row** — so after 5 crashes the decision is *parked* and every move is refused. It was demonstrated: at the default, 7 kills and the next valid move is `refused(not-ready)`; with the guard disabled the move commits. The host must disable it — a setting r13's seam can always set.
2. For a short moment after a restart (about 0.2 s observed) the step has not yet re-registered; a move in that window gets `refused(not-ready)` and must be retried with the same key.
3. The library's scheduler cannot tell this wait from a stuck task, and the library's own changelog discourages waiting inside a step. It works; it is a cost to design around, not a free lunch.

### `native-abort` — complete the task from outside by aborting it

```text
 commit 1:  write the move record            ← the store now holds a move
            ───── a kill here leaves the Decision task still sleeping ─────  ← the half-applied move (I2/I3)
 commit 2:  abortTask(decision) → abort handler commits the completion
```

It fails three guarantees [observed]: **a** — two commits, and a kill between them leaves a move on an unfinished gate; **c** — it acknowledges "committed" after the abort *mark*, before the completion, so a kill right after the acknowledgement is the same wreckage; **d** — to wait at all, the task must sleep until some time, and even "the year 9999" is a stored deadline (the oracle sees a timer on every reading). It was tried honestly (it re-issues the abort on every start and on every repeat of a key; whether that fully repairs a half-applied move was not read out separately) because the report must say *where* it fails, not merely assert that it does. Promises b and e still hold for it.

## 7. Reading the results table

```text
| Strategy                    | a        | b    | c        | d        | e    | Kill points | Random |
| control-sqlite (control)    | held     | held | held     | held     | held | 6 of 6      | 300    |
| broken-two-commit (control) | not-held | held | held     | held     | held | 7 of 7      | 300    |
| native-signal †             | held     | held | held     | held     | held | 10 of 10    | 300    |
| native-abort †              | not-held | held | not-held | not-held | held | 11 of 11    | 300    |
```

- **`held`** — every scenario aimed at that promise *ran* and passed, including the one with a separate-process completer. **`not-held`** — a scenario ran and violated an invariant (named in the report). **`not-proven`** — something did not run. *Not-proven is never counted as held, and a violation outranks a gap.*
- **"10 of 10"** — all declared kill points actually fired. A point that never fires is a failure, not a skip.
- **"300"** — distinct randomised-kill trials, seeded and replayable; supporting evidence only. (An earlier draft said 600 because each batch was counted once per promise; it was corrected.)
- **†** — the strategy declared a caveat. `native-signal`'s ("d holds only with `restartLimit = Infinity`") is *enforceable by the seam*, so the verdict can stay `go`; `native-abort`'s ("waits on a clock") is not.
- **A table full of `held` for the controls is deliberate**: the first thing the spike had to show is that the instrument reads correctly.

Examples of what sits behind a cell [observed]: 100 concurrent identical submissions → exactly **1 committed, 99 repeats, 1 record**; 100 different decisions at once → **1 committed, 99 refused, every refusal naming the winner**; 100 more after a SIGKILL and restart → **0 committed, 100 repeats**.

## 8. What `go` means — and does not

| `go` **does** mean | `go` **does not** mean |
|---|---|
| r13 can build the gate contract directly on Pi Durable, using the port in the contract file | that the library offers this primitive natively — it is a *composition*, with the costs in §6 |
| no KILN-owned decision table and no upstream change is needed | that every strategy was run on Node **22.19.0** (the library's own floor): `native-signal` was (a–e held, observed); the others, and the spike's own test suite, were not **[not tested]** |
| the five promises held at every named kill point, under random kills, and from a separate process | that power loss is covered — only abrupt process death is (**[not tested]**: a host losing power) |
| the result is reproducible from a fresh clone | that a person has confirmed it — the verdict is **[derived]**; confirming it is the Roadmap gate's move, and `r42` is still `queued` |

## 9. What r13 inherits — a checklist

1. **Re-create the port** (`open` / `submit` / `state`, the outcome and refusal codes) from the contract file; do not copy the spike's code. No library names appear in the contract.
2. **Set the crash-loop guard to "never"** in the one place that opens the library. Without it, enough crashes silently stop a gate from accepting moves.
3. **One owner per store, enforced structurally.** The spike saw a second process open the database file and take its write lock while the owner was idle; neither SQLite nor the library prevents it. Completers go *through* the owner.
4. **Treat `not-ready` as "retry the same key"** (transient, after a restart), and `committed` as "durable" — never acknowledge before the completion is stored.
5. **Re-create the acceptance tests**: invariants I1–I7 and the kill-everywhere technique are what judge r13's implementation too.
6. **Decide the three things the report hands over:** raise `kiln/`'s Node floor to ≥ 22.19 (and repeat r12's floor run); accept that `kiln/` stops being dependency-free (91 packages, 112 MB — which of r12's "nothing to install" rules to amend); and accept, pin around or isolate Node's **experimental** `node:sqlite`, which the library's only durable storage rests on.

## 10. Glossary

| Term | Meaning here |
|---|---|
| **Gate** | a point in KILN's flow that waits for a person's move |
| **Move / key** | the decision, and the identity of one *submission* of it (same key + equal move = a repeat) |
| **Owner** | the one process that opens the store and runs the tasks; everything else reaches the gate through it |
| **Strategy** | one way of implementing the port (a native composition, a control, a fallback) |
| **Kill point** | a named step in the code where the harness can make the process die by SIGKILL |
| **Oracle / invariants I1–I7** | the checks run on a reopened store: waiting ⇔ no record (I1, I2) · no half-applied move (I3) · at most one record (I4) · settled stays settled (I5) · waiting is never parked (I6) · no timer (I7) |
| **Half-applied move** | a record without its completion, or a completion without its record — the failure the whole spike hunts |
| **Port / seam** | the KILN-owned interface through which r13 reaches the library, so the library can change without the contract changing |
| **Control / fallback** | a control exists to test the harness; a fallback is a KILN-owned design used only if no native strategy qualifies |

## 11. Likely misreadings

- *"600 random kills."* — 300 trials; an earlier count doubled them.
- *"`native-abort` is nearly working."* — two commits are not one; it fails the guarantee the row exists to test, and also waits on a clock.
- *"`go` means the library supports external completion."* — it means a composition works, at a stated cost.
- *"All green means the harness is lenient."* — the same harness reads the broken control `not-held`, and was sabotaged 17 ways without ever passing.
- *"It was tested on the minimum Node."* — the verdict's strategy was, and held; the other strategies and the test suite were not; see §8.
