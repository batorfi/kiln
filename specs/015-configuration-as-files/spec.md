# Feature Specification: Configuration as files (row r17)

**Feature Branch**: `015-configuration-as-files`

**Created**: 2026-11-03

**Status**: Draft

**Input**: the row **`r17`** — *"Configuration as files — kiln.config/ with role files (agents/*.md), the tier map with judges bound to the strongest model (including the design critic and the UI reviewer), the built-in interface roles (ux-designer, design-critic, ui-checker, ui-reviewer), kiln check config and kiln check model, changes recorded with before and after and applied from the next step; Ollama :cloud tags recorded as remote and refused under local-only."* Depends on **r16** (done, PR #9). Requirements: **CFG-1, CFG-3, CFG-4, CFG-6 (local), CFG-7 (roles), CFG-8, MOD-1 (local)**. Concept: [`docs/concepts/configuration.md`](../../docs/concepts/configuration.md).

**Provenance (what r17 builds on, and does not re-open).**

- **r16** gave the factory its first real role roster — but only as a *provisional*, hardcoded stand-in (`workers/src/roster.ts`'s `PROVISIONAL_ROSTER`), with its own file header naming r17 as the row that replaces it wholesale. r16 also hardcoded one Ollama provider (`workers/src/provider.ts`) configured by two environment variables (`KILN_OLLAMA_PORT`, `KILN_MODEL_BUDGET_BYTES`, read in `cli/src/real-workers.ts`). r17 is that replacement: the roster, the provider and the model catalog become plain files, checked and recorded, instead of code and env vars.
- **r16** also built the actual *mechanisms* this row configures rather than invents: the tier-policy guard (`contracts/src/roles.ts`'s `bindRole`/`isJudge`/`TierPolicyError`, constitution II, unchanged by this row), the readiness probe (`lane/src/residency.ts`'s `probe()`, which makes a real round trip against Ollama to check tool-calling, streaming and usage-accounting), and the residency manager's `load`/`unload`/`reconcile`. r17 does not rebuild any of these; it gives them a file-backed source of truth instead of a hardcoded one.
- **Nothing here changes how a gate is decided or how a real conversation runs.** A role still runs through `workers/src/conversation.ts`'s `runTurn`, unchanged; this row changes only *where the role's definition, its tier binding and its model's capabilities come from*.
- **Not this row**: role try-runs (`kiln agents try`, replaying a role against a past feature as an ungated run) — r26, which is also where an added gate or flow first appears. Remote providers (Anthropic, cloud models, hybrid routing) — r45 and r33. Hosts — host joining, measuring, capacity, pins, sleep — r37; this row's providers and models describe the one local host the project already runs on. Teams — shared roles, team quorum for a judge change — r38/r39; this row is single-workshop. The web front door — r19–r22; this row is files plus the `kiln` CLI only. Per-factory tier overrides and the Roadmap-gate-decided factory profile — later rows; this row's tier map is workshop-wide.

## Clarifications

### Session 2026-11-03

- Q: `docs/concepts/configuration.md` describes interface roles (`ux-designer`, `design-critic`, `ui-checker`, `ui-reviewer`) and gate/flow files (`gates/<id>.md`, `flows/<name>.yaml`) as part of `kiln.config/`'s eventual shape — does this row ship those, or only the roster/tier-map/provider/model files the roadmap row's own "What it delivers" names? → A: **Only what the roadmap row names.** `gates/`, `flows/`, `hosts/`, `factories/`, `policies/`, `health.yaml` and the four interface roles are not built this row — the roadmap's own explainer scopes r17 to `agents/*.md`, `tiers.yaml`, `providers/*.yaml` and `models.yaml`, with the twelve built-in gates and their five built-in judges (unchanged from r14/flow v2) the only roles this row's roster needs to cover for its own acceptance. `kiln.config/`'s directory layout is designed so the later files (`gates/`, `flows/`, interface roles) slot in without a breaking change, but writing them is r18's, r20's or r26's, not this row's.
- Q: "Who may change what" (configuration.md §7) names an **Operator** role distinct from other people — does this row need an actual permissions/roles system to enforce that distinction? → A: **No — single person, no permissions system yet.** This project today has exactly one person deciding anything (`human@batorfi`); the "Operator" concept in the full configuration design anticipates r19's people/front-door work and r38's team quorum, neither of which exists yet. This row records *who* made a change (the actor grammar r15 already built: `<name>@<token>`) but enforces no distinction between "a person" and "an Operator" — anyone who can run the `kiln` CLI on this machine may edit `kiln.config/` and run `kiln check config`. A later row (r19 or r38) is where "Operator" becomes a real, checked distinction.
- Q: r16's `workers/src/provider.ts` is hardcoded to Ollama's `openai-completions` shape. Does `providers/<name>.yaml` need to support a provider *type* other than `ollama` this row, given CFG-6 says "provider entries via `pi-ai`" generically? → A: **One type only: `ollama`.** CFG-6's own priority split marks remote providers "Should," not "Must," and the roadmap explicitly defers remote providers to r45/r33. `providers/<name>.yaml` declares a `type` field now (so a later row's new type is additive, not a breaking schema change) but `kiln check config` refuses any type other than `ollama` this row, by name — not silently ignored, not guessed at.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A judge can never be configured weaker than the strongest model (Priority: P1)

An engineer editing `kiln.config/tiers.yaml` tries to bind a judge role to a cheaper tier than `strongest` — by mistake, by copying a producer's line, or by assuming "just this once" is harmless. The configuration check refuses the file, naming the role and the tier it tried to bind, and nothing applies.

**Why this priority**: this is the row's own first acceptance line, and the constitutional guarantee (II) every later row that adds a judge depends on. It must be provably impossible to configure away, not merely discouraged.

**Independent Test**: write a `tiers.yaml` that binds a built-in judge role (`code-reviewer`, `verifier`, or this project's own judge roles) to `standard` or `cheap`; run `kiln check config`; show it fails, names the role and the tier, and the previous, valid configuration is still the one in effect.

**Acceptance Scenarios**:

1. **Given** a `tiers.yaml` that binds a judge role to anything but `strongest`, **When** `kiln check config` runs, **Then** it fails, naming the role and the rejected tier, and applies nothing.
2. **Given** the same invalid file, **When** a factory's next step would have read the new configuration, **Then** it still reads the last configuration that passed the check — a failing check changes nothing live.
3. **Given** a `tiers.yaml` that binds every judge role to `strongest` and every producer role to any tier, **When** `kiln check config` runs, **Then** it passes.
4. **Given** a judge role bound to `strongest`, **When** the strongest model configured for it fails `kiln check model`'s capability probe, **Then** `kiln check config` also fails, naming the missing capability — a judge is never bound to a model that cannot do what the role needs.

---

### User Story 2 - Configuration lives in plain, checked files instead of code and environment variables (Priority: P1)

An engineer wants to see, review and change KILN's own idea of its roles and models the same way they review code: as files in the repository, with a diff, not as a hardcoded roster or an environment variable only visible by reading the CLI's source.

**Why this priority**: this is CFG-1's whole premise and the reason the row exists — without it, nothing else in this row (the judge guarantee, the model catalog, the recorded history) has anywhere to live.

**Independent Test**: edit `kiln.config/agents/worker.md` and `kiln.config/tiers.yaml` with no code change at all; run `kiln check config`; start a factory; show the edited role's instructions and binding are what a real conversation actually uses — not `workers/src/roster.ts`'s old provisional content, which this row deletes.

**Acceptance Scenarios**:

1. **Given** `kiln.config/` with `agents/*.md` and `tiers.yaml`, **When** a role is resolved for a real step, **Then** its instructions, tools and tier come from these files, never from a hardcoded module.
2. **Given** a secret (a credential) referenced by a provider file, **When** the file is read, **Then** the file names where the secret lives (the OS secret store) and never contains the secret's value itself; `kiln check config` fails by name on any file that appears to contain one.
3. **Given** `workers/src/roster.ts` (r16's provisional roster), **When** this row is built, **Then** the module and its exports are deleted — not kept alive beside the new files as a second, unused path.
4. **Given** no `kiln.config/` directory at all (a fresh checkout before first setup), **When** `kiln owner` starts, **Then** it fails by name, naming the missing directory, rather than silently falling back to anything hardcoded.

---

### User Story 3 - The model catalog knows what a model can actually do, and a role is never bound to one that can't (Priority: P1)

An engineer adds a model to `kiln.config/models.yaml` naming a family and a pinned version. Before anything can bind a role to it, `kiln check model` makes a real check against the running Ollama and records exactly what the model supports — tool calling, streaming, usage reporting, its context window — so a role's requirement and a model's real capability are checked against each other, not assumed.

**Why this priority**: this is what makes `kiln check config`'s judge guarantee (User Story 1) and every producer's tool use meaningful rather than aspirational — reusing r16's own proven probe mechanism, not inventing a second one.

**Independent Test**: add an entry to `models.yaml` naming a model installed on this host; run `kiln check model <id>`; show the recorded result names tool-calling, streaming, usage-accounting and context window, each confirmed against a real request, not guessed from the model's name or family. Bump the entry's pinned version (even to a value that does not exist) and show the previous result is not reused.

**Acceptance Scenarios**:

1. **Given** a model named in `models.yaml` with a pinned version, **When** `kiln check model <id>` runs, **Then** it makes a real request against the configured provider and records tool-calling, streaming, usage-accounting and context-window results, each backed by an actual round trip (not inferred from the model's declared family).
2. **Given** a role that needs tool calling, bound to a model whose last `kiln check model` result reports tool-calling absent, **When** `kiln check config` runs, **Then** it fails, naming the role and the missing capability.
3. **Given** a model entry's pinned version changes, **When** `kiln check model` is next run for that id, **Then** the previous result is not trusted; a fresh probe runs and is recorded as a new result for the new version.
4. **Given** a model named in `models.yaml` that is not actually installed on the configured provider, **When** `kiln check model` runs, **Then** it fails by name, naming the model and the provider, never silently skipping it.

---

### User Story 4 - Every configuration change is recorded and applies from a factory's next step, never mid-step (Priority: P1)

An engineer changes `tiers.yaml` while a factory is mid-conversation on some step. The running step finishes exactly as it would have under the old configuration; only the *next* step sees the change. Afterwards, anyone can see exactly what changed, who changed it, and what it was before.

**Why this priority**: this is the row's own second acceptance line, and the general configuration principle (K4 in the concept doc) every later row that touches configuration inherits — a change that could alter a step already in flight would make "what ran" unknowable after the fact.

**Independent Test**: start a real step (a real role's conversation, from r16's own machinery); while it is in flight, change `tiers.yaml`'s binding for that same role; show the in-flight step finishes against the binding it started with, and the *next* step to use that role reads the new one; read the record and find one event naming the file, the actor, and the configuration's state before and after.

**Acceptance Scenarios**:

1. **Given** a running step, **When** `kiln.config/` changes underneath it, **Then** the step's own outcome is unaffected — it was already bound to its role, tier and model when it started.
2. **Given** a configuration change that passes `kiln check config`, **When** it is applied, **Then** one event is committed naming the changed file, the actor who changed it, and the configuration's content before and after.
3. **Given** a configuration change that fails `kiln check config`, **When** it is attempted, **Then** no `config.changed` event is committed and nothing about the live configuration differs from before the attempt.
4. **Given** the history of changes to one file, **When** it is read back, **Then** every past version is reconstructable from the record (constitution VII: the record is the primary source, not the file's own git history).

---

### User Story 5 - An Ollama `:cloud` tag can never slip past local-only (Priority: P1)

An engineer, meaning to pull a bigger local model, instead configures a model id carrying Ollama's own `:cloud` or `-cloud` suffix — a tag that routes the "local" request through Ollama's own cloud relay. Under a local-only policy, this must be caught and refused, not silently treated as just another local model name.

**Why this priority**: named explicitly in the roadmap row's own "Rules it must keep" (constitution VIII) — a single string convention is the entire difference between "stays on this machine" and "silently leaves it," so it cannot be left to chance.

**Independent Test**: add a `models.yaml` entry whose id carries a `:cloud` or `-cloud` tag; run `kiln check config` under this workshop's local-only policy; show it is refused by name, naming the tag; separately confirm the network allowlist excludes `ollama.com` regardless of configuration.

**Acceptance Scenarios**:

1. **Given** a model id carrying Ollama's `:cloud` or `-cloud` tag, **When** `kiln check config` runs under a local-only policy, **Then** it is refused by name, naming the tag — never silently accepted as a local model.
2. **Given** the same model id, **When** its locality is asked for independently of the check (for example, listing the catalog), **Then** it is reported as `remote`, not `local`, regardless of whether the check has run.
3. **Given** the project's existing network allowlist (`checks/network-allowlist.json`), **When** it is read, **Then** `ollama.com` is not in it and cannot be added by a configuration change alone — only a code change to the check itself could add it, which is a visible, reviewable diff, not a configuration edit.

---

### User Story 6 - Old role versions are kept forever, and every step records which one it ran (Priority: P2)

An engineer changes `agents/worker.md`'s instructions. The old instructions are not discarded — a later question ("why did this step behave the way it did three weeks ago?") must be answerable by looking at exactly the version that ran then, not the version that happens to exist now.

**Why this priority**: CFG-7's own versions-kept-forever requirement, and the traceability half of constitution VII; P2 because User Stories 1–5 can all be demonstrated without a second version existing yet, but the row's own acceptance does not fully hold without this.

**Independent Test**: run a step with `agents/worker.md` at version 1; change the file (bumping its declared version); run another step; read back both steps' records and show each names the exact role version it ran, and version 1's content is still readable.

**Acceptance Scenarios**:

1. **Given** a role file's version changes, **When** a step runs after the change, **Then** the step's record names the new version, and the prior version's content remains readable (kept in git, referenced by the record — never deleted).
2. **Given** two steps that ran under two different versions of the same role, **When** their records are compared, **Then** the version each one actually ran is unambiguous from the record alone, without needing to inspect git history.
3. **Given** a role file with no `version` field at all, **When** `kiln check config` runs, **Then** it fails by name — a role's version is never inferred or defaulted.

---

### Edge Cases

- A `tiers.yaml` names a role that has no corresponding `agents/<role>.md` file (or vice versa): refused by name at `kiln check config`, never silently ignored.
- Two role files declare the same role name (a case or whitespace variant of the filename, or a genuine duplicate): refused by name — never "last one wins."
- A provider file names a `type` other than `ollama` (per Clarification 3): refused by name, not silently skipped or treated as `ollama`.
- `kiln check model` is run against a model whose provider is unreachable (Ollama not running): fails by name, naming the provider and the reason — never cached from an earlier, successful run.
- A configuration file is valid YAML/Markdown but fails schema validation (wrong field type, unknown field): refused by name, naming the field — the same "never vacuous, always named" discipline every existing `kiln check` subcommand already has.
- A `models.yaml` entry's `capabilities` field is hand-edited to claim a capability `kiln check model` did not actually confirm: refused — capabilities are a check's own recorded output, never a value a file may assert for itself.
- A role file is edited to change both its instructions *and* its version number in the same commit as a judge role: still subject to the same strongest-tier check as any other judge binding — version-bumping carries no special exemption.
- Concurrent edits to `kiln.config/` from two separate `kiln check config` invocations: the same one-writer discipline the record already guarantees (r13/r15) applies; a check reads a consistent snapshot, never a half-written file.

## Requirements *(mandatory)*

### Functional Requirements

**The configuration directory (CFG-1)**

- **FR-001**: KILN MUST read role definitions, the tier map, provider definitions and the model catalog from plain files under `kiln.config/` — `agents/<role>.md`, `tiers.yaml`, `providers/<name>.yaml`, `models.yaml` — never from a hardcoded module or an environment variable for any of these four concerns.
- **FR-002**: A role file MUST declare, at minimum: a `kind`, its tool set, its replay classification per tool (reusing r16's own read-only/write-command distinction), which gate's evidence it judges (if any), and a `version`. A role file missing any required field MUST be refused by name.
- **FR-003**: A provider file MUST declare a `type`; this row MUST accept only `type: ollama` and MUST refuse any other value by name (Clarification 3) rather than ignore or guess at it.
- **FR-004**: A model catalog entry MUST declare an id, its provider, family and pinned version; its capabilities field MUST be written only by `kiln check model`'s own recorded result, never hand-authored (Edge Cases).
- **FR-005**: No configuration file MUST contain a secret's value; a file names where a secret lives (the OS secret store) by reference only. `kiln check config` MUST refuse, by name, any file that appears to contain secret material.
- **FR-006**: `kiln.config/`'s layout MUST leave room for the files this row does not write (`gates/`, `flows/`, `hosts/`, `factories/`, `policies/`, `health.yaml`, the four interface roles) without a breaking schema change when a later row adds them (Clarification 1).

**The judge guarantee (constitution II, CFG-7 roles)**

- **FR-010**: `kiln check config` MUST refuse, by name, any `tiers.yaml` binding that binds a judge role (per the flow's own judge roster, unchanged from r14) to a tier other than `strongest`.
- **FR-011**: A judge role bound to `strongest` MUST also be refused, by name, if the model `tiers.yaml` would resolve it to fails `kiln check model`'s capability check for anything the role needs (Acceptance Scenario 4 of User Story 1) — a tier name alone is not enough; the actually-resolved model must qualify.
- **FR-012**: This refusal MUST happen at `kiln check config` time, before any configuration is applied — never discovered later, mid-conversation, the way an unreadable model was discovered mid-generation before r16 built readiness probing.

**The model catalog and `kiln check model` (CFG-6 local, MOD-1 local)**

- **FR-020**: `kiln check model <id>` MUST make a real round trip against the model's configured provider to check tool-calling, streaming and usage-accounting support, and MUST read the context window from the provider's own model listing — reusing r16's `probe()` mechanism (`lane/src/residency.ts`), not a second, parallel implementation.
- **FR-021**: A model catalog entry's recorded capability result MUST be invalidated and re-checked when the entry's pinned version changes; the previous result MUST NOT be reused for a changed version.
- **FR-022**: A model named in the catalog that is not actually reachable through its configured provider MUST fail `kiln check model` by name, naming the model and the provider — never silently skipped or assumed capable.
- **FR-023**: A model id carrying Ollama's `:cloud` or `-cloud` tag MUST be recorded as locality `remote`, never `local`, independent of any policy check (User Story 5, Acceptance Scenario 2); under a `local-only` policy, binding any role to it MUST be refused by `kiln check config`, by name, naming the tag.
- **FR-024**: The project's network allowlist MUST continue to exclude `ollama.com`; nothing in `kiln.config/`'s own files MUST be able to add an entry to that allowlist — only a reviewable code change to the check itself can.

**`kiln check config`: all-or-nothing, never vacuous (CFG-3)**

- **FR-030**: `kiln check config` MUST validate, in one pass, before anything applies: every role's file validity (FR-002), every provider's type (FR-003), every model catalog entry's shape (FR-004), the judge guarantee (FR-010–FR-012), the `:cloud`/local-only rule (FR-023), and the absence of secret material (FR-005).
- **FR-031**: A failing check MUST name the specific file and field responsible and MUST apply nothing — not the failing file, and not any other file bundled in the same attempted change (all-or-nothing, matching CFG-3's own wording).
- **FR-032**: A check that examines zero files, zero roles, or zero models MUST itself fail, naming what it found nothing of — matching every existing `kiln check` subcommand's own never-vacuous discipline (`kiln check network`, `boundaries`, `legacy`, `flow`, `record`).

**Recording and timing (CFG-4, CFG-8)**

- **FR-040**: Every configuration change that passes `kiln check config` MUST commit exactly one event naming the changed file, the actor who made the change, and the configuration's content before and after (`config.changed`); a change to a model's capability result MUST commit `model.checked`; a change to a role's version MUST commit `agent.version_changed`.
- **FR-041**: A configuration change MUST take effect for a factory starting from that factory's **next step** — a step already running when the change is applied MUST complete under the configuration it started with, never have it altered mid-step.
- **FR-042**: A role file's old versions MUST be kept — never deleted or overwritten in place — so that a step's recorded version can always be read back in full (User Story 6).
- **FR-043**: Every real step MUST record which role version it ran, not only which role name.

**What this row does not change**

- **FR-050**: Everything r16 proved MUST still hold: a real conversation still runs through `workers/src/conversation.ts`'s `runTurn`, the lane and residency mechanics are unchanged, and every r16 kill-point and replay-discipline proof MUST still pass with roles and models now sourced from files instead of the provisional roster.
- **FR-051**: This row MUST NOT build role try-runs, added gates or flows (r26), remote providers (r45/r33), hosts (r37), team-shared roles or quorum (r38/r39), or any web front door screen (r19–r22). `kiln.config/`'s files for those concerns (`gates/`, `flows/`, `hosts/`, `factories/`, `policies/`, `health.yaml`) MAY be reserved in the schema (FR-006) but MUST NOT be read or acted on by this row's own code.

### Key Entities

- **Role file** (`agents/<role>.md`): a role's instructions, kind, tool set with replay classification, judged gate (if any), and version — the file-backed replacement for r16's `PROVISIONAL_ROSTER` entries.
- **Tier map** (`tiers.yaml`): role name → tier (and, once resolved, a specific model), the file-backed replacement for r16's hardcoded tier assignments.
- **Provider** (`providers/<name>.yaml`): how a model is reached — this row, `type: ollama` only, an endpoint over loopback, residency managed by KILN (unchanged from r16's `residency.ts`).
- **Model catalog entry** (`models.yaml`): a model's id, provider, family, pinned version, locality, and its capabilities as last measured by `kiln check model` — never hand-authored.
- **Configuration change event**: `config.changed` / `agent.version_changed` / `model.checked` — what r15's record catalog gains to carry this row's history (a catalog change, covered by its own test, per r15's own FR-015 convention).
- **Capability result**: the recorded outcome of one `kiln check model` run — tool-calling, streaming, usage-accounting, context window — tied to the specific pinned version it was measured against.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** of attempts to bind a judge role to a tier other than `strongest` are refused by `kiln check config`, by name, before anything applies — across a negative suite covering every built-in judge role.
- **SC-002**: A configuration change that passes `kiln check config` applies from the affected factory's next step in **100%** of trials; a step already running when the change lands completes under its starting configuration, unaffected, in every trial.
- **SC-003**: Every configuration change that passes the check commits exactly one event naming the file, actor, and before/after content; reading the record back reconstructs every past version of a changed file with **0** gaps.
- **SC-004**: **100%** of `models.yaml` entries carrying an Ollama `:cloud`/`-cloud` tag are recorded as `remote` and refused under a local-only policy; the network allowlist contains **0** entries for `ollama.com` before and after any configuration change.
- **SC-005**: `kiln check model` makes a real, confirmed round trip for tool-calling, streaming and usage-accounting on **100%** of catalog entries checked; a version bump invalidates the previous result in **100%** of cases, confirmed by re-probing rather than reusing the cached value.
- **SC-006**: Everything r16 proved still passes unchanged: its proof tier, its kill-point tests, and its live end-to-end walk all succeed with roles and the model resolved from `kiln.config/` files instead of the deleted provisional roster.
- **SC-007**: A check that examines zero configuration files, roles, or models fails by name in **100%** of attempts — no accidental vacuous pass.

## Assumptions

- **Single person, no permissions system (decided, see Clarifications).** This row records *who* changed what using the existing actor grammar; it does not build an "Operator" role distinct from any other person. That distinction belongs to r19 (people/front door) or r38 (team quorum).
- **Scope matches the roadmap row exactly, not the full configuration concept (decided, see Clarifications).** `docs/concepts/configuration.md` describes a much larger eventual shape (hosts, policies, health, interface roles, gates, flows, the web front door). This row builds only what r17's own "What it delivers" names: `agents/*.md`, `tiers.yaml`, `providers/*.yaml`, `models.yaml`, `kiln check config`, `kiln check model`, and the recorded-change/next-step-timing machinery. The directory layout reserves space for the rest without committing to their schemas yet.
- **One provider type this row (decided, see Clarifications).** `providers/<name>.yaml` declares `type: ollama` only; any other value is refused by name, not silently accepted or guessed at. Remote provider types arrive with r45/r33.
- **The built-in roster this row must cover is the twelve-gate flow's own five judges plus whatever producer roles the existing scripted/real-role test fixtures already name** — not the four interface roles (`ux-designer`, `design-critic`, `ui-checker`, `ui-reviewer`) the roadmap's short text mentions, which depend on Experience design and UI review machinery not yet built (those gates exist in the flow as conditional/not-yet-exercised; their roles are a later row's to configure for real).
- **`kiln.config/` lives at the repository root**, a sibling of `kiln/`, `specs/` and `docs/` — consistent with the concept doc's "a git repository (or a folder in one)" and with every other per-workshop artifact this project keeps at the top level.
- **Reusing, not reinventing.** The tier-policy guard, the readiness probe, the residency manager, and the event-catalog/record discipline are all r13–r16's own proven mechanisms; this row's job is to give them a file-backed source of truth, not to replace any of them.
