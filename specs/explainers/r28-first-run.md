# r28 — First run

> **Type:** roadmap-row explainer — for understanding, not a specification. **Audience:** engineers who will build,
> review or plan this row. **Status:** row **queued** in the [roadmap proposal](../ROADMAP.md), which awaits the Roadmap
> gate; nothing here is admitted. The row's own `specs/NNN-…` directory (spec, plan, tasks) is written when it is admitted.
> Where this explainer and the roadmap or [PRD](../../docs/prd/kiln-prd.md) differ, they govern.

| | |
|---|---|
| **Phase** | Getting started |
| **Release** | `kiln-v1` — position 18 of 41 in the proposed order |
| **Depends on** | [r17 — Configuration as files](./r17-configuration-as-files.md), [r22 — Shaping the roadmap together](./r22-shaping-the-roadmap-together.md), [r23 — The factory knowledge base](./r23-the-factory-knowledge-base.md) |
| **Unlocks** | [r29 — New codebases](./r29-new-codebases.md), [r30 — Existing codebases, part 1: profile and full scan](./r30-existing-codebases-part-1-profile-and-full-scan.md) |
| **PRD requirements** | SETUP-1…11 |
| **Proven when** | from install to a first Roadmap gate in under an hour on a fresh machine, nothing leaving it |

## In one paragraph

From install to a first Roadmap gate in under an hour, on a fresh machine, with nothing leaving it. First run measures the machine, recommends and checks models, sets up the workshop, brings in a repository with Spec Kit and its constitution, and shapes the first roadmap.

## What it delivers

- `kiln init` in the browser or the terminal, resumable; `kiln doctor` with a machine check against a 32 GB minimum and 64 GB recommendation
- models recommended from the hardware, checked before any role uses them; setup does not finish without a strongest-model judge
- workshop and storage; a first factory from a repository, in its own worktree
- Spec Kit adopted or added (files shown first); the constitution confirmed or drafted
- a knowledge bootstrap and the first roadmap shaped together
- Ollama's cloud features checked off on local-only hosts; the demo factory downloaded on request

## Not in this row

- an existing codebase's full scan (r30)
- the release packaging (r32)

## Requirements it carries

*As listed in the roadmap: SETUP-1…11. Full text from the PRD:*

| ID | Requirement | Priority |
|---|---|---|
| SETUP-1 | **`kiln init`**: guided setup in the browser (loopback, one-time secret) or the terminal (`--no-browser`), writing the same files; resumable after interruption; any step rerunnable (`--step`). | Must |
| SETUP-2 | **`kiln doctor`**: hardware, Node, git, Ollama, network and disk checks with fixes named; a measured recommendation (factories, model sizes, memory budget, concurrency) against a **32 GB minimum / 64 GB recommended** for local-only; never installs system software. On `local-only` hosts it checks that Ollama's cloud features are off. | Must |
| SETUP-3 | **Models at setup**: recommendations from hardware, installed models first, background downloads, `kiln check model` on each, `tiers.yaml` written; setup does not finish without a judge bound to the strongest checked model; remote providers off by default. | Must |
| SETUP-4 | **Workshop and storage**: name, owner, roles, a personal signing key; one KILN home shown before creation; disk budget, backups (off by default), retention defaults. | Must |
| SETUP-5 | **First factory** from a local clone, a remote or an empty repository; always a KILN-managed worktree; `local-only` and the standard flow by default; the repository read locally and never changed. | Must |
| SETUP-6 | **Knowledge bootstrap**: proposed sources, starter wiki `AGENTS.md`, ingest on the lane in the background, workshop knowledge seeded with measured models and the machine, an empty notebook. | Should |
| SETUP-7 | **First roadmap**: a goal or open issues → a planner draft citing knowledge → the first Roadmap gate; a read-only **demo factory** from a committed replay, downloaded on request (a recorded, one-off download). | Must (gate) / Should (demo) |
| SETUP-8 | **Team at setup**: start (team-space repository, quorum, invite) or join (invite, key registration, team floor preview); joining never loosens the workshop. | Could |
| SETUP-9 | Setup recorded: `setup.step_completed` and the step's own events begin the workshop record. | Must |
| SETUP-10 | **Spec Kit**: `kiln doctor` checks `specify` (pinned range, `uv`, Python); setup **adopts** an existing `.specify/` (version, integration, templates against the manifest, existing `specs/`) or **adds** it (`specify init --here --ai pi`) only with approval — as a pull request in team codebases; the Pi integration installed for KILN's roles; other agents' integrations coexist and are never touched; a new pinned Spec Kit version is offered at the next Roadmap gate, never applied automatically. | Must |
| SETUP-11 | **The constitution**: adopted as is, edited, or drafted with `speckit.constitution` from the repository's docs and conventions, approved before the first roadmap; briefs cite its principles. | Must |

## How it is proven

**Acceptance:** from install to a first Roadmap gate in under an hour on a fresh machine, nothing leaving it.

Like every row, it walks the full flow — Concept to Merge — with its evidence (specification, plan, tasks, judges' reports, verification) kept in its own `specs/NNN-…` directory, and every principle it touches checked by a test that fails by name.

## Decisions that shape it

- ~~first-run choices~~ — **decided 2026-10-21**: demo downloaded on request; 32 GB minimum, 64 GB recommended; Spec Kit upgrades offered at the Roadmap gate; other integrations coexist (SETUP-2, 7, 10)
- ~~Ollama `:cloud` tags under `local-only`~~ — **decided 2026-10-22**: recorded as remote and refused; `kiln doctor` checks Ollama's cloud features; the network allowlist excludes `ollama.com` (CFG-6, SETUP-2)

## Rules it must keep

- **VIII** — nothing leaves during setup
- **VI** — the first act is a Roadmap-gate decision

*See [the constitution](../../.specify/memory/constitution.md) and [the constitution, explained](../../docs/architecture/explainers/kiln-constitution.md).*

## Where to read more

- [First run](../../docs/concepts/first-run.md)
- [Dev machines](../../docs/concepts/dev-machines.md)
- [PRD §6.18](../../docs/prd/kiln-prd.md)
- [The roadmap proposal](../ROADMAP.md) · [All row explainers](./README.md)

---

← [r27 — Health and broken guarantees](./r27-health-and-broken-guarantees.md) · [index](./README.md) · [r29 — New codebases](./r29-new-codebases.md) →
