> Status: concept (proposal, 2026-10-17) — **not admitted**
> Type: concept
>
> Scope note: this doc describes **KILN factories that run anywhere** — on the machine in front of you, on a team
> server, on a virtual machine in your own cloud account, or in a container — while the workshop, its people, its
> gates and its record stay one coherent whole. It covers the idea, the shape, and how it changes KILN's rules. It is a
> concept, not a design or a spec. Where it changes the constitution, it needs the same amendments and Roadmap-gate
> decision as the rest of `web-front-door.md`.
>
> Companion docs:
>   - The vision:                        `vision.md`
>   - The design:                        `web-front-door.md` (§12 several factories, §15 summarises this concept)
>   - The user experience:               `user-experience.md` (and `mockups/33`–`35`)
>   - How KILN uses Pi Durable:          `pi-durable.md`
>   - The wikis:                         `factory-wiki.md`

# KILN — factories anywhere

## 1. In one paragraph

Today a KILN workshop is one machine: the factories, their models, their stores and the web front door all live on
it. This concept separates **where people decide** from **where factories work**. The **workshop** stays the one place
where people see what needs them, decide at gates, and set policy. **Factories run on hosts** — any machine that runs
KILN's host runtime: your laptop, a team GPU server, a virtual machine in your cloud account, a container. A factory
keeps everything that makes it trustworthy — its single lane, its durable store, its record, its wiki, its gates —
wherever it runs, and can **move** between hosts without losing a step or a waiting gate. KILN remains software you
run yourself; "anywhere" means anywhere *you* choose, never a hosted service.

## 2. Why

- **Hardware.** A laptop or a single studio machine limits how big a model and how many factories a team can run. A
  team GPU server or a rented cloud machine removes that limit without changing how anyone works.
- **Teams.** A team wants one workshop everyone can reach from their own browser, not a machine one person sits at.
- **Placement by data.** Some code may only be worked on inside the company network; some may run on rented hardware;
  some may never leave one laptop. Choosing *where a factory runs* is how that is honoured.
- **Cost.** Local machines are paid for once; rented machines are paid by the hour. Durable gates make it possible to
  **switch a rented host off while its factory waits for a human** — the most common state of any factory — and switch
  it back on when the human decides.
- **Resilience.** A factory whose host fails can resume on another, from its durable store.

## 3. The shape: one workshop, many hosts

```
               People — browsers, anywhere they are allowed
                                  │  authenticated, encrypted
 ┌──────────────────────────── The workshop ───────────────────────────┐
 │  web front door · people & roles · policies · gate inbox             │
 │  host registry · placement · workshop knowledge · workshop record    │
 └───────┬──────────────────────────┬──────────────────────────┬────────┘
         │ host channel (mutually authenticated, encrypted, recorded)    │
 ┌───────▼────────┐        ┌────────▼────────┐        ┌────────▼────────┐
 │ host: studio-m5│        │ host: gpu-01     │        │ host: cloud-eu-1│
 │ local machine  │        │ team server      │        │ VM in your cloud│
 │ model pool     │        │ model pool       │        │ model pool      │
 │ factory A, B   │        │ factory C        │        │ factory D       │
 │  store · lane  │        │  store · lane    │        │  (suspended —   │
 │  workspace     │        │  workspace       │        │   waiting at a  │
 │  wiki · record │        │  wiki · record   │        │   gate)         │
 └────────────────┘        └──────────────────┘        └─────────────────┘
```

| Part | Role | Lives |
|---|---|---|
| **Workshop** | where people work: the front door, people and roles, policies, the cross-factory gate inbox, the host registry, placement, the workshop wiki, the workshop's own record | on any machine — the same studio machine as today, or a server the team reaches |
| **Host** | a machine running KILN's host runtime: a model pool, a scheduler, and the factories placed on it | anywhere: laptop, team server, cloud VM, container |
| **Factory** | unchanged: one roadmap, one lane, its own durable store, record, workspace and wiki | on exactly one host at a time |

**The all-in-one case is unchanged.** A single machine running the workshop and one host — today's KILN — is the
simplest topology, and remains the default. Everything in this doc is opt-in.

## 4. Hosts

A host is described by what a factory needs to know before it is placed there:

| Attribute | Meaning |
|---|---|
| **Kind** | local machine · team server · cloud VM · container |
| **Locality** | `local` (this machine) · `private` (infrastructure the team controls) · `cloud` (rented, in the team's own account) — the same classes as model locality (`web-front-door.md` §13) |
| **Region and owner** | where it is, and whose account or network it is in — for data-residency rules |
| **Capacity** | memory budget, accelerators, concurrency cap |
| **Models** | which models it can load locally, and which remote models it may reach |
| **Cost model** | owned (no hourly cost) · rented (cost per hour running, nothing while suspended) |
| **State** | online · suspended · offline — and since when |
| **Identity** | a host identity issued when the host joins the workshop, revocable at any time |

A host **joins** the workshop by an explicit, recorded human act (an Operator approves it), receives its identity,
and from then on talks to the workshop only over its authenticated, encrypted host channel.

## 5. Placement: where a factory runs

**Placement is a human decision, made at the Roadmap gate.** Alongside the profile, egress policy and budget
(`user-experience.md` §8.5), the Roadmap gate brief shows *where this factory will run*: the host, why it fits, and
what it costs. Changing it later is a recorded command, like any other change to how a factory runs.

The workshop helps by checking **fit**, never by deciding:

- **Policy fit** — the factory's data rules allow the host's locality, region and owner;
- **Model fit** — the host can load, or may reach, every model the factory's roles are bound to;
- **Capacity fit** — the host's memory budget and concurrency cap leave room;
- **Cost** — what the factory is expected to cost there, including how often the host can sleep.

A factory with `local-only` profile can be placed only on a host of locality `local` — the machine whose people chose
that profile. Its promise travels with it.

## 6. Moving a factory

A factory can move between hosts — to a bigger machine, off a failing one, into the company network — without losing
anything, because everything it is lives in its durable store, its workspace and its wiki:

1. **Request.** A person with the right to place the factory asks to move it; the move is a recorded command.
2. **Fit check.** The new host is checked as in §5; a failing check stops the move before anything changes.
3. **Quiesce.** The factory finishes its current step (or the move waits for the next gate). It never moves mid-step.
4. **Hand over.** The old host closes the store; the store, the workspace and the wiki repository are transferred to
   the new host over the host channel; the new host opens the store and becomes its single owner (`pi-durable.md`).
5. **Resume.** The new host resumes the factory's tasks: a waiting gate is still waiting, with the same brief; the lane
   re-establishes its models on the new host's pool; the record shows the move as one event with both hosts.

Moving never approves, skips or reopens a gate. If the transfer fails, the old host reopens the store and nothing has
changed.

## 7. Sleeping hosts: paying only for work

Most of a factory's life is spent **waiting for a human**. Because gates are durable tasks that hold no model and run
no code while they wait, a factory waiting at a gate needs nothing from its host — so a **rented host can be
suspended** while every factory on it waits, and resumed when a human acts.

- The workshop keeps every waiting gate's **brief** available while the host sleeps, so a Decider reads and decides as
  usual.
- A **move** on a sleeping host's gate wakes it; the decision is committed when the host's store is open again — the
  Decider sees it as *decided, applying on wake*, never as applied before it is.
- Suspension is a policy per host (*suspend when every factory on it waits for longer than N minutes*), recorded and
  visible, with the hours and money it saved.

Owned hosts can sleep too, for power and noise; the rule is the same.

## 8. When the network fails

Hosts and workshop talk over a network that will sometimes fail. The rules keep every guarantee local to where it is
enforced:

- **A host that loses the workshop keeps working** on its factories until each reaches its next gate. Gates open and
  wait durably on the host, as always.
- **No gate can be settled while its host is unreachable.** A move made in the workshop waits as *decided, not yet
  applied* and is applied exactly once when the host reconnects — keyed by the same idempotency key as any move.
- **Events catch up.** Each factory's ordered record lives on its host; the workshop's views catch up from where they
  left off when the connection returns. Nothing is reordered and nothing is lost.
- **A workshop that is down stops no work.** Factories continue to their next gates; people simply cannot decide until
  the workshop is back.
- **Health shows it.** Host offline, events behind, a move waiting to apply — each is a visible signal, never a silent
  delay.

## 9. Where data lives, and what travels

| Data | Lives | Travels to the workshop |
|---|---|---|
| **Workspace** (the code) | on the factory's host | only the excerpts a gate brief or a knowledge page needs, and only if the factory's policy allows |
| **Durable store** (transcripts, tasks) | on the factory's host | never in full; read models and briefs only |
| **Record** (events) | on the factory's host | replicated to the workshop for views, insights and audit — without prompt or answer content, as always |
| **Factory wiki** | a git repository on the host | as a git remote, so the vault can be cloned and read in Obsidian or Zed by anyone allowed |
| **Workshop wiki** | with the workshop | included read-only in every factory vault, as today |
| **Secrets** | in each host's own secret store | never |

**Restricted content stays where it is.** A factory may mark its workspace or wiki as restricted: then briefs are
assembled on the host and streamed to an authorised browser through the workshop without being stored there, and
excerpts never appear in workshop views or exports.

## 10. Security

Running beyond one machine replaces "only loopback" with "only authenticated, encrypted, and recorded":

- **Host channel** — every host and the workshop authenticate each other with their own identities and encrypt all
  traffic; a host's identity can be revoked at once; every connection is recorded.
- **People** — on a single machine, the per-launch secret of today remains enough. A workshop that people reach over
  a network uses real authentication (the team's identity provider), and every decision is still recorded under the
  person who made it.
- **Least privilege** — a host knows only the factories placed on it; the workshop holds no secrets of any host; a
  person sees only the factories their role allows.
- **Allowlists** — each host's network allowlist covers the workshop, its models, and nothing else beyond what its
  factories' policies allow; the network scan checks it per host.

## 11. How it fits KILN's rules

| KILN rule | Factories anywhere |
|---|---|
| **One lane per factory** | unchanged — a factory runs on one host at a time, one step at a time |
| **Affinity, model pool** | per host — each host has its own pool, leases and scheduler (`web-front-door.md` §12) |
| **Durable** | stronger — a factory survives not only a crash but a move, a sleeping host and a lost network |
| **Headless never approves; a human decides** | unchanged — no move, sleep, wake or reconnection settles a gate; a move made while the host is away applies exactly once |
| **Everything recorded** | each factory's record stays on its host and is replicated to the workshop; host, placement and move events join the workshop record |
| **Local by default** | unchanged as a default — the all-in-one machine needs nothing new; every remote host is an explicit, recorded choice, and a `local-only` factory runs only on a local host |
| **Readable without KILN** | unchanged — every wiki is a git repository and an Obsidian vault, wherever it lives |

**Constitution impact.** Principle VIII ("local-first") is already redefined as *local by default; egress only by
configured, recorded, policy-checked choice*; this concept extends it to hosts: *every host and every connection
between hosts and workshop is configured, authenticated, encrypted and recorded*. Principle IX (a loopback server)
gains: *a workshop reachable over a network requires real authentication*. A MINOR addition is proposed: *a factory is
portable — moving it never changes a decision*.

## 12. What changes elsewhere

- **`vision.md`** — a pillar for factories anywhere; *not a cloud service* becomes *not a hosted service*; a horizon;
  audience and success measures.
- **`web-front-door.md`** — §15 summarises this concept; §12's workshop becomes multi-host; the event catalog gains host
  events; security, constitution, open questions and roadmap gain entries.
- **`user-experience.md`** — *Host* in the mental model; core experiences for placing, moving and sleeping; host state in
  orientation and in gate briefs; the experience across scales.
- **`pi-durable.md`** — one store per factory per host; handover on a move; sleeping hosts.
- **`factory-wiki.md`** — wikis live with their factories and travel with them; vaults are cloned from git remotes.
- **Mockups** — 33 (hosts), 34 (placing a factory), 35 (moving a factory, and a sleeping host); the navigation's
  *Machine* becomes *Hosts*, and factory cards show where each factory runs.

## 13. Open questions

1. Should a host be able to belong to more than one workshop?
2. How should a factory's workspace move — full copy, or a git remote the new host clones?
3. Should the workshop itself be able to move, or fail over to a standby?
4. Which container and orchestration forms should KILN support first, if any?
5. Can Pi Durable's other storage adapters (for example its Durable Object adapter) host a factory store — and should
   they?

## 14. One sentence

KILN lets each factory run wherever its hardware, data and budget say it should — a laptop, a team server, a cloud
machine that sleeps while humans think — and move between them without losing a step, while people keep deciding
every gate from one workshop.
