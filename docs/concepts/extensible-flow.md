> Status: concept (proposal, 2026-10-18) — **not admitted**
> Type: concept
>
> Scope note: this doc makes **the factory flow extensible**: KILN ships one default flow — the Roadmap gate and the nine
> gates — and engineers add gates of their own to match their SDLC conventions, while every gate keeps the guarantees of
> the built-in ones. It is a concept, not a schema or a spec.
>
> Decisions taken by the human (2026-10-18):
>   1. **Fixed anchors**: the Roadmap gate is always first and the Merge gate always last.
>   2. **Gates after Merge** (deployment, release approval) are **out of scope** for now.
>   3. Moves come from a **closed set of move kinds**; teams may label them in their own words.
>   4. **Built-in gates cannot be removed** from a flow; flows can only **add** gates. Skipping stays as today: triage may
>      skip Concept and Design for small features, recorded with its reasoning.
>   5. Flows and gates are changed by an **Operator**, and team-shared ones by the **team quorum**.
>   6. A flow is chosen **per feature**, at the Roadmap gate, from a factory default.
>
> Companion docs:
>   - The gates and their rationale:  `gates-why-how-what.md` (describes the default flow)
>   - The design:                     `web-front-door.md` (§3.1 the default flow, §5 gates as durable tasks)
>   - Configuration:                  `configuration.md` (where gate and flow files live)
>   - The record:                     `the-record.md`
>   - Teams:                          `team-space.md`
>   - The user experience:            `user-experience.md` (and `mockups/52`–`60`)
>   - The PRD:                        `../prd/kiln-prd.md`

# KILN — an extensible flow

## 1. In one paragraph

The ten gates are KILN's **default flow**, not a hard limit. A team can add gates that match how it builds software — a
threat model, a security review, an accessibility review, a performance budget, a licence check, a product sign-off — by
writing a **gate definition** and including it in a **flow**. Every added gate is a durable task with the same contract as
the built-in ones, presents the same ten-part gate brief, uses moves from the same closed set, and is checked before it
can be used. The director stays deterministic: it executes the flow a feature was admitted with. What no flow can change
is fixed: the Roadmap gate first, the Merge gate last, the built-in gates in between, and the rules that make every gate
trustworthy.

## 2. Why

SDLC conventions differ. Regulated code needs a threat model and a security review; a design-system team needs an
accessibility review; a platform team needs a performance budget and a licence check; a product team wants a sign-off on
the specification. Today those would live outside KILN — as rules people remember, or as steps nobody records. Making the
flow extensible brings them inside: with an author, a judge where needed, a brief, a decision, and a record.

## 3. What no flow can change

| Fixed | Why |
|---|---|
| **The Roadmap gate is first**, human-only, per factory | it admits work; delegation never reaches it |
| **The Merge gate is last**, the only place *ship it* is authorised | one point of release authority; nothing runs after it (deployment gates are out of scope) |
| **The nine built-in gates stay** in every flow, in their order | the default flow is the floor every feature passes |
| **Skipping** only as today — triage may skip Concept and Design for small features | a flow cannot remove gates |
| **The gate contract** for every gate — a durable task, the move and its completion in one atomic commit, first move wins, no clock settles it, headless means waiting | the core promise does not depend on who wrote the gate |
| **Author and judge are different roles**; judges run on the strongest model | no model approves its own work |
| **Every gate has a full gate brief** | no gate is a bare yes/no |
| **Moves come from the closed set** (§5) | the director's logic stays deterministic and auditable |

## 4. A gate definition

A gate is a file — in the workshop's `kiln.config/gates/`, or shared through the team space:

```markdown
---
id: threat-model
name: Threat model gate
question: Have we identified how this could be attacked, and is the design safe enough?
phase: contract                    # contract · build-and-prove · release (program is the Roadmap gate alone)
after: design
before: specification
artifact: threat-model.md
author: threat-modeller            # a role (configuration.md §6)
judges: [security-critic]          # optional; judges must be strongest-model, line-of-defense roles
moves:
  approve: { label: "Accept the design" }
  approve_with_note: { kind: approve, label: "Accept with residual risk", note: required }
  revise: { label: "Revise the threat model" }
  reject: { returns_to: design }
delegable: false                   # may the unattended tail cross it?
hold_lane: true                    # judged gates keep the judge's model resident
applies_when:                      # when this gate joins a feature's flow automatically
  paths: ["src/auth/**", "src/payments/**"]
  labels: [security-sensitive]
deciders: [any]                    # or named people, e.g. a product owner
brief:
  emphasis: [assets and trust boundaries, attack paths, mitigations, residual risk]
version: 1
---
The threat modeller identifies assets, trust boundaries and attack paths…
```

| Field | Meaning |
|---|---|
| `phase`, `after`, `before` | where the gate sits; it can only be placed between built-in gates, never before the Roadmap gate or after Merge |
| `artifact`, `author` | what is produced, and by which role |
| `judges` | independent roles whose verdicts become evidence; optional for human-only gates |
| `moves` | which move kinds the gate offers, with the team's own labels and rules |
| `delegable` | whether the unattended tail may cross it (only on a clean path, as always) |
| `applies_when` | conditions under which the gate joins a feature automatically |
| `deciders` | who may decide it — any decider of the factory, or named people |
| `brief.emphasis` | what this gate's brief puts first |
| `version` | pinned per feature at admission; every event records it |

A gate without an author is allowed for **human-only** gates — for example a product sign-off reviewing an existing
artifact. A gate may also run a **deterministic check** as evidence (a licence scan, a benchmark) through a role whose
tools run that check.

## 5. Move kinds: a closed set with open labels

| Kind | Meaning (fixed) |
|---|---|
| **approve** | proceed to the next gate; may require a note |
| **revise** | the note goes to the same author conversation; the gate returns |
| **reject** | return to a named earlier gate (`returns_to`), or stop the feature |
| **restart** | a fresh author from the last restorable point |
| **split+revise** | grow the feature into two |
| **mitigate** | up to N automatic fix rounds before a human decides |

A gate offers any subset, under its own labels — *Accept with residual risk* is an **approve** with a required note.
The record stores the **kind**, the label and the note, so validators and insights reason over kinds while people read
their own words. New kinds are not allowed: they would need new director logic, and the director stays deterministic.

## 6. Flows

```yaml
# flows/standard.yaml — shipped, the default
gates: [roadmap, concept, design, specification, work-plan, implementation,
        code-review, verification, documentation, merge]

# flows/security-sensitive.yaml — a team's own
extends: standard
no_triage_skip: true      # Concept and Design always run
add:
  - threat-model          # after design
  - security-review       # after code-review
  - license-check         # after verification

# flows/ui.yaml
extends: standard
add:
  - accessibility-review  # after code-review
```

- A flow **extends** the standard flow and **adds** gates; it cannot remove or reorder built-in ones.
- A flow may be **stricter about skipping** — for example `no_triage_skip: true`, so Concept and Design always run for
  security-sensitive work; it can never be looser.
- Gates with `applies_when` can join a feature automatically when it matches, whatever flow it runs.
- A factory names a **default flow**; each feature may run a different one.

## 7. Choosing a flow per feature

1. **Proposed** — when the director proposes a feature at the Roadmap gate, it proposes its flow: the factory default, a
   variant chosen because of the feature's paths and labels, plus any gates whose `applies_when` match. Each choice has a
   reason.
2. **Decided** — the human decides the flow with the roadmap. Team-required gates (§8) are shown as required and cannot
   be dropped.
3. **Pinned** — the feature keeps that flow, and those gate versions, until it merges. Changing a flow or a gate never
   alters features already in progress.
4. **Refined** — if a feature turns out to touch a path a gate applies to (for example, a work plan that now changes
   `src/payments/`), the brief at the next gate says so and offers to **add** that gate; adding is a recorded decision.
   Gates are never removed from a feature in flight.

## 8. Layering and team-required gates

- **Team floor** — the team space can **require** gates for paths or labels (*security review for `src/payments/**`*); every
  member workshop's flows include them for matching features.
- **Workshop and factory** — may add gates, never drop a required one.
- **Shared flows use shared gates** — a team flow may only include team gates; a workshop gate must be proposed to the team
  before a team flow can use it.
- **Who changes what** — gate and flow files are changed by an **Operator**; team-shared gates and flows by the **team
  quorum**; a feature's flow by its **decider** at the Roadmap gate.

## 9. `kiln check flow`

Every gate and flow is checked before it can be used — deterministically, failing closed:

- the Roadmap gate first and the Merge gate last; all built-in gates present in order;
- added gates placed only between built-in gates;
- every author and judge role exists and passes its model checks; judges are strongest-model, line-of-defense roles and
  never the author;
- moves only from the closed set; `returns_to` points to an earlier gate; `restart` has a restorable point before it;
  `mitigate` has verification evidence to work from;
- delegation can be armed only at a gate marked as an arming point (the Specification gate by default);
- team-required gates present for matching features;
- no cycles, no unreachable gates.

A failing check names the problem and applies nothing. Like every KILN check, it is never vacuous.

## 10. Trying a gate before using it

`kiln gates try <gate> --on <feature>` replays a past feature as if the gate had been in its flow — runs the author and
judges against the feature's state at that point, and shows the brief a decider would have seen. It is ungated and
changes nothing; it is how a team finds out whether a new gate earns its place.

## 11. How the rest of KILN adapts

| Part | Change |
|---|---|
| **Director** | still deterministic; builds steps and gates from the feature's pinned flow instead of a constant rail |
| **Gate brief** | the same ten parts; emphasis from the gate definition; added gates carry their judges' verdicts like built-in ones |
| **Record** | gate keys (`custom:threat-model`), flow and gate versions on every gate event; validators read move kinds from the definition |
| **Factory-log projection** | gains flow keys (MINOR); built-in gates keep their existing ids |
| **Delegation** | crosses only `delegable` gates; any judge's objection still ends it |
| **Knowledge** | implementation digests and feature stories include added gates automatically |
| **Bench** | a spike or research can be linked to an added gate like any other |
| **Team space** | shared gates and flows, required gates, changes by quorum |

## 12. From today's code

| Existing | Becomes |
|---|---|
| `contracts/move-vocabulary.ts` — `GATE_RAIL`, `MOVE_VOCABULARY` | the **standard flow as data**, plus the closed set of move kinds |
| `contracts/gate-rail.md` | the anchors and invariants of §3 |
| `GateId = "gate0" \| 1…9` | flow keys; built-in keys unchanged |
| `validate/log.ts` (G3: move in vocabulary) | validates moves against the pinned flow version |

Building gates as data in the first durable-core milestone, with only the standard flow, keeps this cheap; added gates and
flows can arrive later without reworking the director.

## 13. Examples

| Gate | Placed | Author / judge | Moves |
|---|---|---|---|
| **Threat model** | after Design | threat modeller / security critic | approve · approve with note · revise · reject → Design |
| **Security review** | after Code review | — / security reviewer | approve · restart |
| **Accessibility review** | after Code review | — / accessibility reviewer | approve · restart |
| **Performance budget** | after Verification | benchmark role (deterministic) / — | approve · mitigate (2) · reject |
| **Licence check** | before Merge | licence scanner (deterministic) / — | approve · reject → Implementation |
| **Product sign-off** | after Specification | — (human-only, named decider) | approve · revise |

## 14. Open questions

1. Should added gates be allowed to be **arming points** for delegation, or only the Specification gate?
2. Should `applies_when` be able to look at the **diff** (not only paths and labels) — for example *a new dependency was
   added*?
3. When post-merge gates come into scope, how should they relate to the Merge gate's authority?

## 15. One sentence

KILN's ten gates are the default flow every feature passes; teams add gates that match how they build software, and every
added gate keeps the same contract, brief, moves and checks — so the flow can grow without the guarantees getting weaker.
