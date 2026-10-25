# r32 — Cut the kiln-v1 release

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** on the [roadmap](../ROADMAP.md) admitted at the Roadmap gate on
> 2026-10-22; it fires when the Roadmap gate admits it as the next feature. Its own `specs/NNN-…` directory (spec, plan, tasks) is written then.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Release |
| **Release** | `kiln-v1` — position 27 of 43 in the committed order |
| **Depends on** | [r21 — Stepping in](./r21-stepping-in.md), [r24 — Implementation knowledge and the workshop wiki](./r24-implementation-knowledge-and-the-workshop-wiki.md), [r26 — Agents and flows](./r26-agents-and-flows.md), [r27 — Health and broken guarantees](./r27-health-and-broken-guarantees.md), [r29 — New codebases](./r29-new-codebases.md), [r31 — Existing codebases, part 2: baseline, territory, process](./r31-existing-codebases-part-2-baseline-territory-process.md), [r39 — Team space, part 2](./r39-team-space-part-2.md), [r43 — Explore space](./r43-explore-space.md), [r44 — KILN in Zed, phase 1](./r44-kiln-in-zed-phase-1.md), [r53 — The Feed](./r53-the-feed.md) |
| **Unlocks** | [r45 — Remote judges (judges-only hybrid)](./r45-remote-judges.md), [r34 — The bench, part 1: notebook and research](./r34-the-bench-part-1-notebook-and-research.md), [r36 — Observability in full](./r36-observability-in-full.md), [r37 — Factories anywhere](./r37-factories-anywhere.md), [r46 — Explore: as-is specifications](./r46-explore-as-is-specifications.md), [r47 — Explore: tours and archaeology](./r47-explore-tours-and-archaeology.md), [r49 — Explore: legacy languages](./r49-explore-legacy-languages.md), [r50 — KILN in Zed, phase 2: the Agent Panel](./r50-kiln-in-zed-phase-2-the-agent-panel.md) |
| **PRD requirements** | §3.1 goals, M14 |
| **Proven when** | a newcomer installs KILN, runs first setup on a real repository and decides its first Roadmap gate in under an hour |

## In one paragraph

The release row turns everything before it into something a newcomer can install and use: an installer, newcomer docs, a demo of a whole feature, and a tagged release — proven by a newcomer reaching their first Roadmap gate on a real repository in under an hour.

## What it delivers

- the installer and newcomer documentation
- a demo factory, downloaded on request, replaying a committed walk through all eleven feature gates of an interface feature
- a release manifest and version tag
- acceptance on a real repository by a newcomer

## Not in this row

- anything in `kiln-v1.x`

## Requirements it carries

*As listed in the roadmap: §3.1 goals, M14. Full text from the PRD:*

This row carries no individual requirements: it proves the PRD's **§3.1 goals** and milestone **M14** over everything
built before it. The goals, from the PRD:

1. **A runnable factory** a person can point at a feature and walk through the twelve-gate flow (two of its gates apply only to interface work), in a browser, on local models.
2. **Rules enforced by construction** — no silent approval, author/judge separation, one step at a time per factory,
   judges on the strongest model, everything recorded — each with a check that fails by name.
3. **Durable by default** — no crash, restart, move or sleeping host loses work or settles a gate.
4. **Explainable** — the ordered record rebuilds any view at any moment; the knowledge base explains how the code was
   built.
5. **Local by default, open by choice** — a `local-only` factory provably makes no outbound call; anything else is a
   configured, recorded, policy-checked choice.
6. **Grows without redesign** — one factory → several → several hosts → a team of personal workshops sharing a team
   space, with the same concepts.
7. **An on-ramp before the factory** — a team can explore and understand an existing codebase with KILN before it changes
   anything about how it builds software, and work where its code is: in the editor as well as the browser.

## How it is proven

**Acceptance:** a newcomer installs KILN, runs first setup on a real repository and decides its first Roadmap gate in under an hour.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Rules it must keep

- every principle — the release ships only what keeps them

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [What `kiln-v1` delivers](../../docs/architecture/explainers/kiln-v1.md)
- [PRD §3.1 and M14](../../docs/prd/kiln-prd.md)
- [The roadmap](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r39 — Team space, part 2](./r39-team-space-part-2.md) · [index](./README.md) · [r45 — Remote judges (judges-only hybrid)](./r45-remote-judges.md) →
