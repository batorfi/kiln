> Status: concept — **final** (2026-10-21, human@batorfi; previously a proposal, 2026-10-20). Open decisions were
> settled on 2026-10-21 and are recorded where they apply; what remains open is listed in
> [`open-decisions.md`](./open-decisions.md). Building it is admitted only at the Roadmap gate.
> Type: concept
>
> Scope note: this doc details **Health** — how KILN watches its own machinery and tells people when something looks wrong:
> what is watched, what a signal contains, how severity, thresholds and notifications work, how the watcher is itself
> watched, and the rule that Health observes and never acts. It is a concept, not a spec.
>
> Companion docs:
>   - The design:              `web-front-door.md` (§6.1 three kinds of signal, §6.9 health without decisions)
>   - The record:              `the-record.md` · Insights: `insights.md`
>   - The director, Needs you: `the-director.md`
>   - Hosts:                   `factories-anywhere.md` · Configuration: `configuration.md`
>   - Knowledge:               `factory-wiki.md` · Teams: `team-space.md`
>   - The user experience:     `user-experience.md` (and `mockups/19`, with `01`, `05`, `15`, `33`)
>   - The PRD:                 `../prd/kiln-prd.md`

# KILN — Health

## 1. In one paragraph

Health answers one question: **is KILN itself working as it should, right now?** A health watcher on every host observes
the machinery — steps, the lane, models, hosts, the record and its views, knowledge, configuration, the team connection —
and raises **signals** when a condition looks wrong: what it is, why it matters, the evidence, and what a person could do.
It **never acts**: it does not abort a step, move the lane, touch a gate, change a policy or send anything anywhere.
Signals resolve themselves when the condition clears, carry their history, and are honest about their own limits — when the
watcher cannot see, Health says *unknown*, never *all good*.

## 2. Where Health sits

| | Answers | Time | Acts? |
|---|---|---|---|
| **Needs you** (`the-director.md` §5) | what is waiting on me? | now | no — people act |
| **Health** | is the machinery working? | now | **no — observes only** |
| **Insights** (`insights.md`) | how is the work going, over time? | weeks | no — evidence for people |
| **The record** (`the-record.md`) | what happened, and why? | always | no — it is the history |
| **The director** | what happens next, by rule? | now | yes — deterministic rules, recorded |

Health is about **conditions of the system**, not the quality of the work (that is the judges' and insights' job) and not
decisions (those are gates and Needs you). A slow model load is a health signal; a judge's objection is not.

## 3. Principles

| | Principle | Meaning |
|---|---|---|
| **H1** | **Observe, never act** | Health raises signals; every corrective action is a person's command or an existing director rule, attributed as such |
| **H2** | **Every signal explains itself** | what, since when, why it matters, the evidence (linked events), and what a person could do |
| **H3** | **Measured against this machine** | thresholds start from defaults and adapt to measured baselines — a model's usual load time on this host, a factory's usual step length |
| **H4** | **Quiet by default** | signals are de-duplicated, grouped, resolved automatically when the condition clears; only what matters interrupts |
| **H5** | **Honest about itself** | if the watcher, a view or a host cannot be observed, Health shows *unknown since…*, never a green light |
| **H6** | **Broken guarantees are never quiet** | a signal that a KILN guarantee may be broken is always critical and cannot be configured away |
| **H7** | **Local** | Health reads only local telemetry and the record; nothing leaves the machine; export is opt-in |
| **H8** | **About systems, not people** | a gate waiting is information about the flow, never a mark against a person |

## 4. What Health watches

| Domain | Conditions (examples) | Default severity |
|---|---|---|
| **Steps and the lane** | a step running with no progress beyond its usual length; a step resumed twice or more; the lane idle while work is queued; a swap storm (many swaps in a short time) | warning |
| **Models** | a load much slower than this model's usual; a model unreachable; memory budget pressure; a model's version changed since it was checked (re-check needed) | warning |
| **Hosts** | offline; sleeping (info); disk filling; clock skew; KILN or Pi versions mismatched; a move waiting to apply; events not yet replicated to the workshop | warning |
| **The record and its views** | the outbox growing faster than it drains; a view (read model, metrics, analytics) lagging; the store approaching its size budget | warning / info |
| **Gates** | a gate waiting past its reminder interval — information only, it never decides | info |
| **Policy and security** | a refused request to an unlisted destination; a blocked tool; secret-like strings in an artifact; repeated failed session attempts on the front door; credentials or a host identity close to expiry or revoked | info / warning |
| **Knowledge** | vault conformance failing; a change to an immutable `raw/` file; drifted pages piling up; an ingest or scan pass that failed; scan coverage gaps | warning / info |
| **Configuration and dependencies** | `kiln check config` failing after a file was edited outside KILN; Spec Kit out of the supported range or its templates changed; Ollama, Pi or Pi Durable versions changed | warning |
| **Teams** | the team space unreachable; an invalid signature on a team act; overlapping claims; base drift beyond a threshold; a merge queue entry stuck | warning / info |
| **The bench** | abandoned spike worktrees; notebook or archive size | info |

### 4.1 Broken guarantees

A separate class of conditions means a KILN guarantee may have been broken — things that should never happen:

- a gate settled without a committed move, or by a restart;
- a judge step that ran on a model other than the strongest bound one;
- a request that reached a destination policy did not allow;
- a projection rebuild that is not byte-identical, or a factory-log that fails validation;
- two owners of one durable store.

These are always **critical**, always notify, and cannot be snoozed or configured away. Health still does not act on them:
the **director's own fail-closed checks** stop the affected factory at its next step boundary, and Health shows both — the
signal, and *what the director already did, by which rule*.

## 5. Anatomy of a signal

| Part | Contents |
|---|---|
| **Headline** | one line in plain words — *Model load much slower than usual* |
| **Subject** | the factory, host, model, view or wiki it concerns |
| **Severity** | critical · warning · info · resolved |
| **Since** | when the condition started; how many times it recurred |
| **Why it matters** | the consequence if it continues — *the next judge step will start late* |
| **Evidence** | the measurements and the linked events in the record — *2 min 51 s at 09:53; usual 38 s (median of 40 loads)* |
| **Likely cause** | where KILN can tell — *cold disk cache after a restart* — labelled as a guess |
| **What you could do** | commands a person may choose: re-check a model, move a factory, free disk, re-run `kiln check config`; each is a person's action |
| **Already done by rule** | anything the director did by its own rules, with the rule's name — never by Health |
| **Clears when** | the condition that resolves it — *the next load is within 2× usual* |

**Lifecycle.** *Raised* → *updated* (new evidence, recurrence) → *resolved* automatically when the clearing condition
holds. A person may **acknowledge** a warning (it stays visible, marked as seen) or **snooze** it for a period; both are
recorded. Critical signals can be acknowledged, never snoozed.

## 6. Severity and where signals appear

| Severity | Health page | Needs you | Notification | Elsewhere |
|---|---|---|---|---|
| **Critical** | top, pinned | *worth knowing*, first | yes | the factory's live view and its next gate brief |
| **Warning** | listed | *worth knowing* | if the person asked for it | the subject's view (factory, host, wiki) |
| **Info** | listed | — | no | the subject's view |
| **Resolved** | history | — | no | — |

Health never puts anything in *waiting on you*: nothing is stopped by a health signal. When something does stop — a policy
stop, an unavailable judge — that is the director's decision to ask, and it appears in *waiting on you* as such.

A signal that bears on a decision also appears **in the gate brief** where it matters: an overlap in the Work plan and
Merge briefs, a slow host in the Roadmap gate's placement view, a drifted page wherever it is cited.

## 7. Thresholds and baselines

- **Defaults** ship for every condition.
- **Baselines** are learned from this machine's own history: each model's load time, each role's usual step length, each
  view's usual lag. A signal fires when a measurement is far outside its baseline, not merely above a fixed number.
- **Configurable** in `kiln.config/health.yaml` (`configuration.md`): thresholds, reminder intervals, which warnings notify,
  quiet hours. Changes are checked and recorded like any configuration change.
- **Not configurable**: broken-guarantee signals (§4.1), and the rule that Health never acts.

## 8. Watching the watcher

- Each host's watcher writes a **heartbeat**; the workshop shows when each was last heard from.
- If a watcher, a view or a host stops reporting, Health shows **unknown since <time>** for what it covered — the workshop
  overview's status pill turns grey, not green.
- After a crash, Health reports the **recovery**: what resumed, what kept waiting, that nothing was approved by the restart,
  and when every view caught up (mockups 05, 19).

## 9. Health across hosts and teams

- **Every host** runs a watcher over its own factories, models and stores; the **workshop** gathers their signals into one
  view, grouped by host.
- **Sleeping hosts** are expected to be quiet: a sleeping host is *info*, not *offline*; it becomes a warning only if it
  fails to wake when asked.
- **Teams.** A workshop's health is its owner's. The team space only shows team-level conditions — its own reachability,
  signatures, claims and the merge queue — and no member sees another member's workshop health unless they share it.

## 10. Diagnostics

- **`kiln doctor`** — the setup checks (`first-run.md`), runnable any time: machine, dependencies, models, configuration.
- **`kiln health`** — the current signals and the watcher's view, in the terminal; the same data as the Health page.
- **A diagnostic bundle** — on request, a local archive of health history, versions, configuration checks and recent
  telemetry, **without content** (no prompts, artifacts or code) and with secrets removed, for the person to inspect and
  share if they choose. KILN never sends it anywhere.
- **Local OpenTelemetry export** — off by default; when on, to a loopback collector the person runs (`web-front-door.md`
  §6.7).

## 11. In the front door

| Where | What Health shows |
|---|---|
| **Health page** (mockup 19) | overall status; signals, newest first, with the anatomy of §5; views and how far behind each is; steps and storage; hosts; and *what Health will never do* |
| **Workshop overview** (mockup 01) | one status pill — healthy · warnings · critical · unknown — and the count |
| **Factory live view** | the factory's own signals beside its steps |
| **Hosts** (mockups 15, 33) | per host: heartbeat, memory, disk, models, slow loads, sleep state |
| **Knowledge** | conformance, drift and scan coverage for each wiki |
| **Needs you** | critical and warning signals under *worth knowing* |

## 12. In the record

Health is **telemetry**, kept apart from domain events (`web-front-door.md` §6.1): `health.signal_raised`,
`health.signal_updated`, `health.signal_resolved`, `health.signal_acknowledged`, `health.signal_snoozed`,
`health.watcher_heartbeat`. Telemetry is kept for 90 days by default (`first-run.md` §7.2); **broken-guarantee signals are
also written as domain events** and kept with the record permanently, because they matter to anyone auditing a feature.

Health history feeds **insights** — recoveries per month, slow-load trends, how long views lag — as evidence over time
(`insights.md` §4.3, §4.8).

## 13. What Health will never do

- abort, pause or restart a step;
- move, hold or release the lane;
- settle, skip, delay or reopen a gate;
- change a policy, a threshold for broken guarantees, or a configuration file;
- send anything off the machine;
- rank or judge people.

## 14. How it fits KILN's rules

| KILN rule | In Health |
|---|---|
| **Humans decide** | Health informs; people and deterministic director rules act — and the brief says which |
| **No silent approval** | a gate waiting is information; a gate settled without a move is a critical signal |
| **Everything recorded** | signals, acknowledgements and snoozes are events; broken guarantees join the permanent record |
| **Local by default** | Health reads local telemetry and the record; export is opt-in and loopback |
| **Honest about gaps** | *unknown* is a state; a quiet watcher is never shown as healthy |

## 15. Open questions

1. ~~Re-surface acknowledged warnings?~~ **Decided 2026-10-21** (human@batorfi): quiet unless the condition changes, plus **one digest line a day**
   while it persists. Broken-guarantee signals can never be acknowledged into silence.
2. ~~Promote a warning to a director rule?~~ **Decided 2026-10-21** (human@batorfi): **yes, pause-only.** An Operator may write a director rule
   triggered by a health condition, recorded as configuration. A rule may only **pause a factory or hold new steps** —
   never settle, skip or re-open a gate, change a model, or resume anything. Health still only observes; the rule and its
   action are the director's, attributed to the Operator who wrote it.
3. ~~Baselines per host or shared?~~ **Decided 2026-10-21** (human@batorfi): **per host**; a new host says it is still learning. Sharing by host
   kind may come with factories anywhere.
4. ~~A standard diagnostic bundle?~~ **Decided 2026-10-21** (human@batorfi): **yes** — a versioned, documented bundle (JSON in a zip: health state,
   versions, configuration hashes, recent system events), content-free (no prompts, code, transcripts or secrets), shown
   to the person before export.

## 16. One sentence

Health watches KILN's own machinery on every host and says plainly — with evidence, baselines and what a person could do —
when something looks wrong or cannot be seen, and it never acts: people and the director's rules do.
