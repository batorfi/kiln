# KILN's judges and workers — an explainer

> **Type:** explainer — for understanding, not a specification. **Audience:** engineers who will write these roles' real files (r17) or build on top of them.
> **Status tags:** **[data only]** the role is named in the flow's roster and checked against gate assignments, but has no real instructions, tools or conversation of its own yet — **[built]** a real `agents/<role>.md` file and binding exist. As of this page, **every role below is [data only]**.
> **Basis:** [`contracts/src/flow/v2.ts`](../../../../kiln/packages/contracts/src/flow/v2.ts)'s `roster` (the one list every gate's `judge:` field is checked against — `contracts/flow/validate.ts`); [`workers/src/roster.ts`](../../../../kiln/packages/workers/src/roster.ts) (r16's provisional, generic stand-in); [the twelve gates](../gates/README.md); [the flow](../../../concepts/the-flow.md).

## 1. What's real today, and what is not

r16 ("Real local workers") proved that a step can hold a real, fresh conversation with a local model, with the lane, the residency manager and the replay discipline all real. It proved this with **two generic, provisional role names** — `worker` for any producer and `reviewer` for any judge (`workers/src/roster.ts`'s `PROVISIONAL_ROSTER`) — explicitly not the real roster. That file's own header says r17 ("Configuration as files") replaces it wholesale.

The flow's real roster — the fifteen names below — already exists as **data**: `flow/v2.ts` names which judge role judges which gate, and `contracts/flow/validate.ts` refuses a flow where a gate names a judge not in the roster, or names a producer as a judge. But no individual role among the fifteen has its own instructions, its own tool set, or has ever held a real conversation under its own name. This page describes what each one is *for*, grounded in the flow and the constitution, ahead of r17 giving each one a real `agents/<role>.md` file.

## 2. The five judges

Every judge **must bind to the strongest model available to the factory** (constitution II) — a weaker binding is a refused configuration, never a warning, and a judge is never silently downgraded. Four of the five are a feature's own line of defense; the Documentation gate, since constitution v2.0.1, has **no judge** at all.

| Role | Judges | Gate's question | Conditional |
|---|---|---|---|
| [**architecture-critic**](./architecture-critic.md) | [2 Architecture](../gates/02-architecture.md) | Is this the right structure? | always |
| [**design-critic**](./design-critic.md) | [2a Experience design](../gates/02a-experience-design.md) | Is this the right experience, within the charter? | only when the feature touches the interface |
| [**code-reviewer**](./code-reviewer.md) | [6 Code review](../gates/06-code-review.md) | Is the code right, against the specification? | always |
| [**ui-reviewer**](./ui-reviewer.md) | [6a UI review](../gates/06a-ui-review.md) | Does the build match the approved experience? | only when the feature touches the interface |
| [**verifier**](./verifier.md) | [7 Verification](../gates/07-verification.md) | Does it actually work as specified? | always |

## 3. The ten producers

A producer makes an artifact; a judge (where one exists) examines it; a person decides (constitution I). Producers may run on a cheaper tier *because* a strong judge, or a person, stands on their gate's far side — except where no gate does (`docs-synthesizer`, `adr-maker`), where the legacy design keeps them cheap for a different reason (§5 below).

| Role | Feeds | Gate it feeds (named in [the flow](../../../concepts/the-flow.md) or inferred) |
|---|---|---|
| [**researcher**](./researcher.md) | Concept | feeds, no gate of its own — named directly in the-flow.md |
| [**concept-writer**](./concept-writer.md) | Concept | named directly |
| [**architecture-designer**](./architecture-designer.md) | Architecture | the-flow.md names this role "designer"; `architecture-designer` is the roster's own name for it |
| [**ux-designer**](./ux-designer.md) | Experience design | named directly |
| [**feature-size-triage**](./feature-size-triage.md) | the Roadmap gate's admission (a proposal, not a gate of its own — see its own page) | inferred from the walk's `triage` field and the real-worker fixture's own `script.triage` shape |
| [**worker**](./worker.md) | Implementation, Code review, UI review, Verification (the build phase generally) | the-flow.md names "workers" (plural/generic) at all four |
| [**techwriter**](./techwriter.md) | Documentation | named directly, alongside a "wiki keeper" not in this roster |
| [**pr-writer**](./pr-writer.md) | Merge | named directly ("PR writer") |
| [**adr-maker**](./adr-maker.md) | no gate — records a decision already made | inferred from the legacy role doc; not named in the-flow.md's own table |
| [**docs-synthesizer**](./docs-synthesizer.md) | no gate — cross-feature, human-invoked | inferred from the legacy role doc; not named in the-flow.md's own table |

## 4. Not in this roster

`flow/v2.ts`'s roster is a **checked subset**, not every role the concept documents describe. The-flow.md's own table names a few roles that are *not* in `roster.producers` today — notably **planner** (Roadmap, Work plan), **director** (Implementation), and **wiki keeper** (alongside techwriter at Documentation) — because nothing yet needs the flow engine to validate a binding for them. They are out of this page's scope; it covers exactly the fifteen names the roster and `contracts/flow/validate.ts` check.

## 5. A status change worth knowing about

The legacy (first-program, nine-gate) design treated `docs-synthesizer` as a fourth **line-of-defense** role — strongest model, always, with the human as its backgate, alongside the architecture critic, the verifier and the code reviewer. The PRD's own record of constitution v2.0.0's enactment says plainly: *"the Documentation gate is unjudged, so the Docs Synthesizer is no longer a line of defense"* (`docs/prd/kiln-prd.md` — not a direct quote from `constitution.md` itself, which states rule II but not this specific rationale) — and `flow/v2.ts`'s roster places it among the **producers**, not the judges. Its own page (§below) describes this change rather than silently keeping the old framing.

Similarly, legacy's "feature-size triage" was **itself a gate** ("a gate, not a worker"). In the current flow, triage is not a gate: it is a `skippable` property on gates 1 and 2, evaluated from a producer's proposal (`feature-size-triage`) when the walk admits the feature. Its own page describes this too.

## 6. Where this is going

[`specs/015-configuration-as-files/`](../../../../specs/015-configuration-as-files/spec.md) (r17) is the row that gives each of these fifteen roles a real `agents/<role>.md` file, a real tier binding in `tiers.yaml`, and — for the first time — a real, individually-named conversation. Until then, every page below describes a role that exists in the flow's data and nowhere else.
