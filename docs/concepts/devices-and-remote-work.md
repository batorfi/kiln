> Status: concept (proposal, 2026-10-20) — **not admitted**
> Type: concept
>
> Scope note: this doc explores **how KILN supports engineers who work across many devices and from anywhere** — a
> workstation at the desk, a notebook on the road, a tablet on the sofa, a phone in a queue — all interacting with one
> workshop and its factories. It covers what each kind of device is for, how devices are paired and trusted, how they
> reach the workshop without a KILN cloud, how decisions stay safe when made from a phone, notifications, offline reading,
> continuity between devices, and what happens when the workshop's machine is asleep. It is a concept, not a spec.
>
> Companion docs:
>   - The design and its security posture: `web-front-door.md` (§19)
>   - Hosts, sleep and network failure:   `factories-anywhere.md`
>   - Needs you and the director:          `the-director.md`
>   - The gate brief:                      `user-experience.md` §8
>   - The bench and the notebook:          `the-bench.md`
>   - People, roles and identity:          `team-space.md` §14 · Configuration: `configuration.md`
>   - Health:                              `health.md` · The record: `the-record.md`
>   - The user experience:                 `user-experience.md` (and `mockups/73`–`77`)
>   - The PRD:                             `../prd/kiln-prd.md`

# KILN on every device — multi-device and remote work

## 1. In one paragraph

An engineer's workshop lives on one machine they trust — a workstation or a server — and that machine stays the
**single authority**. Every other device is a **window into the workshop**: paired once, holding its own revocable key,
reaching the workshop over the engineer's **own private network**, never through a KILN cloud. Each kind of device does
what it is good at — the workstation runs and watches everything, the notebook does the same from anywhere, the tablet is
for reading and deciding, the phone is for triage and quick answers. A gate can be decided from any device **only with its
full brief**, high-stakes moves ask for a **step-up** confirmation, and a decision is always the **person's**, recorded with
the device it came from. Devices read offline, pick up where another device left off, and are told plainly when the
workshop is asleep or unreachable — and nothing is ever decided by a device going quiet.

## 2. How engineers actually work

| Moment | Device | What they want from KILN |
|---|---|---|
| Deep work at the desk | **workstation** | everything: watch implementation live, steer, run spikes, configure, read knowledge in Obsidian or Zed |
| Travelling, a client site, a café | **notebook** | the same front door, remotely; a spike on the workshop's machine; the vault synced |
| Reviewing in the evening | **tablet** | read a long brief, scroll a diff, go through a feature story, shape the roadmap |
| Between meetings, in a queue | **phone** | what waits on me? answer a step's question, allow a held action, decide a small gate, capture a thought |
| Asleep, on holiday | **none** | factories work to their next gate and wait; nothing is decided by absence |

The goal is not "KILN on a phone". It is that **wherever the engineer is, the factory never waits longer than it has to —
and never decides anything on its own.**

## 3. Principles

| | Principle | Meaning |
|---|---|---|
| **D1** | **One authority, many windows** | the workshop and its factories run on machines the engineer owns or chose; devices hold no authority, only views and a key |
| **D2** | **No KILN cloud** | devices reach the workshop over the engineer's own network — loopback, LAN or a private overlay network they control; there is no KILN relay or account |
| **D3** | **Paired, not logged in** | every device is paired once from a trusted device, holds its own key, and can be revoked at any time |
| **D4** | **The full brief, on any screen** | a move can be made from any device only where the full brief is available — layered for small screens, never truncated |
| **D5** | **Higher stakes, stronger proof** | high-stakes moves ask for a step-up confirmation on the device; some may be limited to trusted device classes by policy |
| **D6** | **The person decides, the device is recorded** | every move is the person's, signed by the device's key, with the device in the record |
| **D7** | **Honest about reach** | a device always shows whether it is live, stale or offline, and whether the workshop is awake |
| **D8** | **Absence never decides** | an unreachable device, a sleeping workshop or a lost phone can delay a decision, never make one |

## 4. Device classes

| Class | Typical device | Default capabilities |
|---|---|---|
| **Primary** | the workstation that runs the workshop | everything, including configuration, policies, pairing other devices |
| **Trusted** | a notebook, a second workstation | everything a person may do, remotely; configuration and policy changes with step-up |
| **Companion** | a tablet, a phone | read everything the person may see; triage Needs you; answer step questions; steer; allow or refuse held actions; decide gates — high-stakes ones with step-up |
| **Read-only** | a shared screen, a borrowed device | read briefs, the record and knowledge; no moves, no commands |

Classes are **defaults, not limits**: the person (or the team floor) can make any class stricter — for example *Merge only
from a trusted device* — never looser than the workshop's policy.

**High-stakes moves** (step-up by default on every device): admitting at the Roadmap gate, approving at the Merge gate,
arming delegation, approving with an accepted failure, changing a profile or egress policy, pairing a device, changing
who may decide.

## 5. Reaching the workshop

### 5.1 Three ways in

| Path | When | How |
|---|---|---|
| **Loopback** | on the primary machine | exactly today's front door: `127.0.0.1`, a per-launch secret |
| **Local network** | at home or in the office | the workshop listens on the LAN only when remote access is on; TLS with the workshop's own certificate; only paired devices are served |
| **Private overlay network** | anywhere else | a network the engineer or team controls — a WireGuard-style mesh, a company VPN, a self-hosted tunnel; the workshop is never exposed to the public internet by default |

Remote access is **off by default** and switched on by a recorded configuration change. The workshop shows exactly how it
can be reached, and every session from every device is recorded.

### 5.2 When the workshop should not be on a laptop

A workshop on a notebook that travels and sleeps is a poor authority. For engineers who work across devices, KILN
suggests moving the **workshop** to an always-on machine — a home server, the office workstation, a team server
(`factories-anywhere.md`) — and treating every personal device as a window. The move is the same handover as moving a
factory: quiesce, transfer the store, resume.

### 5.3 When the workshop is asleep

- A sleeping or unreachable workshop is shown as such on every device: *workshop asleep since 23:10 · last synced 23:08*.
- Devices keep showing the **last synced state**, clearly marked as stale.
- **Waking** is offered where the network allows it (wake-on-LAN through a host on the same network, or an always-on
  host acting as a waker); waking is a command, recorded.
- A move made meanwhile is **queued on the device**, visibly, and submitted when the workshop is reachable — and refused if
  the gate changed in between (§8).

## 6. Pairing and trust

1. **Start on a trusted device.** *Pair a device* shows a one-time QR code and code phrase, valid for a few minutes.
2. **Scan on the new device.** It generates its own key pair (in the device's secure storage where available), proves
   possession, and is shown the workshop's fingerprint to confirm.
3. **Choose its class and limits.** Companion by default for phones and tablets; trusted for notebooks; an expiry if
   wanted (*until Friday* for a borrowed device).
4. **Recorded.** `device.paired` with class, limits and who paired it.

- **Device keys are sub-keys of the person's identity.** A move from a device is signed by the device key, which is
  vouched for by the person's signing key; teams see the person, audits see the device.
- **Revocation is instant and remote**: revoking a lost phone ends its sessions, rejects its key, and tells the device to
  erase its cached data the next time it connects.
- **Sessions expire** by class — short for companions, longer for trusted devices; idle locks use the device's own lock
  (biometrics or passcode) for step-up.

## 7. What each device is good at

### 7.1 Workstation and notebook — the whole workshop

- The full front door, the same on both; the notebook adds a **connection bar** (*connected to Zsolt's workshop over the
  private network · 38 ms*).
- **Bench work remotely.** Spikes and research run on the workshop's hosts; the notebook edits through the editor's remote
  workspace support, or works in a local worktree that pushes to the spike branch.
- **Knowledge locally.** Wikis are git repositories: the notebook keeps a clone for Obsidian or Zed, pulls on reconnect,
  and pushes edits as commits — recorded like any edit.

### 7.2 Tablet — reading and deciding

- Long-form review: the gate brief beside the diff or the artifact; feature stories; insights.
- **Annotate while reading**: highlights and margin notes on the artifact become the draft of the move's note.
- Shaping the roadmap with the planner — a good fit for a larger touch screen.

### 7.3 Phone — triage and quick answers

- **Needs you first**: what waits, what it blocks, how long.
- **Answer and allow**: a step's question, a held risky action — each with its full context one tap away.
- **Decide small gates** with the full brief, layered: the headline and the decision first, every part reachable.
  High-stakes moves ask for step-up; some teams limit them to trusted devices.
- **Capture**: a thought, a photo of a whiteboard, a voice note — straight into the private notebook, labelled with its
  origin.
- **Focus**: during focus hours, only what matters to the person reaches the phone.

## 8. Decisions from many devices

- **The person decides, not the device.** Gates, Needs you and drafts are per person; any paired device sees the same
  open decisions.
- **First move wins** — as always. If the person decides on the tablet, the phone shows the gate as settled at once, with
  *decided on iPad at 21:14*.
- **Moves are bound to a state version** (`web-front-door.md` §5.2). A move from a device that was looking at an older
  version is refused, and the device shows what changed.
- **Offline moves** are allowed only as **queued moves**: clearly marked *will be submitted when connected; refused if the
  gate changed*. High-stakes moves cannot be queued offline.
- **Recorded with the device**: `move.committed` carries the device id and class; the brief as seen on that device is the
  one recorded with the move.

## 9. Continuity between devices

- **Pick up where you left off**: the position in a brief, an unfinished note, a half-shaped roadmap version follow the
  person, not the device — *continue reading r10's Code review brief from the iPad?*
- **Drafts are personal and synced**: a move's note drafted on the tablet is there on the workstation; it is never sent
  until the person sends it.
- **One inbox**: Needs you is the same on every device; acknowledging a suggestion on one clears it everywhere.

## 10. Notifications

- **Content-free by default.** A notification says *something waits* and how urgent — *kiln-v1 · a gate waits for you* —
  never code, findings or names of files. The content is fetched from the workshop over the private network when the
  person opens it.
- **Channels the person chooses**: the installed web app's push (with encrypted, content-free payloads), a self-hosted
  notification service, e-mail, or none.
- **Rules**: which items notify, on which devices, quiet hours and focus hours — configured as files
  (`configuration.md`), recorded when changed. Health criticals always notify somewhere (`health.md` §6).
- **Notifications are information, never decisions** (PRD WEB-5): there is no *approve* button on a lock screen.

## 11. Offline

- **Read offline**: each device keeps an encrypted cache of what the person chose — open gate briefs, the knowledge base,
  recent records — so a flight is useful.
- **Stale is visible**: every cached view shows when it was synced.
- **Write offline** only to the private notebook (merged on reconnect) and as queued moves (§8).
- **Nothing more**: commands that change how factories run (start, pause, move, arm) need a live connection.

## 12. Content on devices

A paired device is inside the workshop's boundary, but a person may not want every factory's code on every device.

- **Per-device content policy**: for example *phone: briefs and findings, no full diffs, for billing-service*; enforced by
  the workshop when serving the device, not by the device.
- **Factory policy wins**: a factory whose policy says *source never leaves this host* serves summaries and findings to
  remote devices, not code — and the brief says so.
- **Caches follow policy**: what a device may not show, it never caches.

## 13. Teams

Nothing about devices is shared: each person pairs their own devices to their own workshop. A **team floor** may require
stricter device rules — *Merge only from a trusted device*, *no companion devices for factories touching `src/payments/`*
— and every member's workshop applies it. A teammate's request (an opinion, a review) reaches the person on whichever
device they use, like any Needs you item.

## 14. What the record adds

`device.paired`, `device.class_changed`, `device.revoked`, `session.started` and `session.ended` (device, path:
loopback · LAN · overlay), `step_up.confirmed`, `move.committed` with device id, `move.queued_offline`,
`move.refused_stale`, `notification.sent` (channel, no content), `workshop.wake_requested`. No location, no content.

## 15. In the front door

| Where | What |
|---|---|
| **People → Devices** (mockup 73) | paired devices with class, limits, last seen and path; pairing; revocation; remote access status; recent sessions |
| **Phone** (mockup 74) | a content-free notification, Needs you, a gate brief layered for the phone, step-up for a high-stakes move |
| **Tablet** (mockup 75) | a Code review brief beside the diff, with annotations becoming the note |
| **Notebook, remote** (mockup 76) | the connection bar, continuity from the tablet, a spike running on the workshop's host |
| **Asleep and offline** (mockup 77) | a sleeping workshop seen from the phone, a queued move, wake, and the move refused because the gate changed |

## 16. How it fits KILN's rules

| KILN rule | Across devices |
|---|---|
| **Humans decide** | moves come from people on paired devices, with the full brief; absence of a device decides nothing |
| **No silent approval** | no approve from a notification; queued moves are refused if stale; a lost device's key is revoked |
| **Everything recorded** | pairing, sessions, step-ups, the device of every move |
| **Local by default** | no KILN cloud; remote access off by default; private networks only; content-free notifications |
| **Not a hosted service** | devices talk to the person's own workshop — nothing in between that KILN runs |

## 17. Changes elsewhere

- **Security posture** (`web-front-door.md` §19): *loopback only* becomes *loopback by default; paired devices over a
  private network when remote access is on*, with device keys, mutual TLS, step-up and revocation.
- **Workshop placement** (`factories-anywhere.md`): moving the workshop itself to an always-on host, as a recorded handover.
- **Configuration**: `devices.yaml` (classes, limits, content policy) and `notifications.yaml` (channels, rules, quiet
  hours) in `kiln.config/`.
- **People and roles**: device classes as limits on what a role may do from where.

## 18. Open questions

1. Should KILN ship its own private-network option (for example, embedding a WireGuard-style mesh), or always rely on one
   the engineer already has?
2. Should a **native** mobile app exist for stronger key storage and notifications, or is an installable web app enough?
3. Which moves, if any, should be **impossible** from a companion device even with step-up — for example the Roadmap gate?
4. How long may a queued offline move wait before it expires on its own (never deciding anything, only disappearing)?
5. Should step-up use a second device (approve on the phone what was decided on a borrowed screen)?

## 19. One sentence

KILN keeps one workshop as the single authority and turns every device the engineer owns into a paired, revocable window
onto it — over their own network, never a KILN cloud — so they can triage on a phone, decide on a tablet and build from a
notebook anywhere, with the full brief for every decision, stronger proof for the important ones, and nothing ever decided
by a device going quiet.
