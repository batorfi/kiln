> Status: concept (proposal, 2026-10-18) — **not admitted**
> Type: concept
>
> Scope note: this doc describes **how engineers configure KILN** — hosts, LLM providers and models, and agents (roles,
> their instructions and their bindings to models) — where configuration lives, who may change what, how changes are
> checked and recorded, and which rules no configuration can break. It is a concept, not a schema or a spec.
>
> Companion docs:
>   - Models beyond the machine: `web-front-door.md` §13
>   - Hosts:                     `factories-anywhere.md`
>   - Teams:                     `team-space.md` (team rules as a floor)
>   - The director:              `the-director.md` (the planner role)
>   - The record:                `the-record.md`
>   - First run:                 `first-run.md` (how setup writes the first configuration)
>   - The user experience:       `user-experience.md` (and `mockups/14`, `15`, `20`, `33`, `49`–`51`)
>   - The PRD:                   `../prd/kiln-prd.md`

# KILN — configuration: hosts, providers and agents

## 1. In one paragraph

**Configuration is code, every change is recorded, and safety rules cannot be configured away.** A workshop's
configuration is a folder of plain, reviewable files — hosts, providers, the model catalog, role instructions, the tier
map, policies and per-factory settings — and the web front door edits the same files. Secrets are never in them. Every
change is checked before it applies, recorded with who made it and what it was before, and takes effect for a factory
from its **next step**, never in the middle of one. Team rules set a floor that workshops and factories can make stricter,
never looser.

## 2. Principles

| | Principle | Meaning |
|---|---|---|
| **K1** | **Files first** | configuration is readable text in a git repository; the UI is a second view of it |
| **K2** | **Recorded** | every change is an event — who, what, before, after |
| **K3** | **Checked, all or nothing** | `kiln check config` validates a change before it applies; a failing check applies nothing |
| **K4** | **Next step, never mid-step** | a change to how a factory runs applies from its next step; running work is never altered |
| **K5** | **A floor, not a ceiling** | team → workshop → factory; each layer may be stricter, never looser |
| **K6** | **Rules cannot be configured away** | judges on the strongest model, no silent approval, egress by policy — enforced regardless of configuration |
| **K7** | **No secrets in files** | files name a secret; the secret lives in the OS or host secret store |

## 3. Where configuration lives

```
kiln.config/                ← a git repository (or a folder in one)
  workshop.yaml             ← people and roles, defaults, focus and notification rules
  hosts/<name>.yaml         ← one file per host
  providers/<name>.yaml     ← how models are reached
  models.yaml               ← the model catalog
  agents/<role>.md          ← role instructions
  tiers.yaml                ← default role → model bindings
  gates/<id>.md             ← added gate definitions (extensible-flow.md)
  flows/<name>.yaml         ← flows: the standard flow plus added gates
  policies/
    egress.yaml             ← what may leave, to which locality
    budgets.yaml            ← spend and research caps
    tools.yaml              ← risky-action rules
  health.yaml               ← health thresholds, reminders, notifications, quiet hours (health.md §7)
  devices.yaml              ← paired devices: classes, limits, content policy (devices-and-remote-work.md)
  notifications.yaml        ← channels, rules, quiet and focus hours
  factories/<name>.yaml     ← per factory: profile, policy, budget, placement, tier overrides
```

The workshop's configuration repository is separate from any factory's workspace and from the team space; the team
space holds the team's own floor and shared roles (§9).

## 4. Hosts

A host joins with `kiln host join`, an **Operator approves** it (it appears in Needs you), and it receives a revocable
identity (`factories-anywhere.md` §4).

```yaml
# hosts/gpu-01.yaml
kind: team-server               # local-machine · team-server · cloud-vm · container
locality: private               # local · private · cloud
owner: office network
region: eu
capacity:
  memory_budget: 180GB
  concurrency_cap: 3
models: [qwen3-coder:30b, llama-4-70b]
pin: []                         # models kept resident, e.g. the strongest local judge
sleep:
  when: all factories waiting at gates for 15m
  wake: on any decision for a factory here
cost: owned                     # or { per_hour: 2.40 USD }
serves: [zsolt, bence]          # member workshops allowed to place factories here
```

- **Measured, not guessed.** `kiln host measure` runs a short benchmark and suggests the memory budget and concurrency
  cap; the suggestion and the accepted values are recorded.
- **Pins** keep chosen models resident; the check refuses pins that do not fit the budget.
- **Placement is not host configuration** — which host a factory runs on is decided per factory at the Roadmap gate; a
  host only declares what it offers.
- **Revoke** at any time; factories on a revoked host stop at their next step boundary and wait to be moved.

## 5. Providers and models

### 5.1 Providers

How models are reached, through `pi-ai`:

```yaml
# providers/ollama-local.yaml
type: ollama
endpoint: http://127.0.0.1:11434      # loopback only
residency: managed-by-kiln            # KILN loads, pins, unloads

# providers/team-vllm.yaml
type: openai-compatible
endpoint: http://10.0.4.20:8000/v1
locality: private
credentials: keychain:team-vllm

# providers/anthropic.yaml
type: anthropic
locality: remote
credentials: keychain:anthropic-key
data_handling: { training: false, retention_days: 30, region: eu }
```

### 5.2 The model catalog

```yaml
# models.yaml
- id: gemma4:27b
  provider: ollama-local
  family: gemma
  version: pinned:sha256:…
  capabilities: measured             # filled by `kiln check model`
- id: claude-opus-5-5
  provider: anthropic
  family: claude
  version: claude-opus-5-5
  cost: { input: …, output: …, cached: … }
```

### 5.3 Checking a model

`kiln check model <id>` measures what a model can do — reachability under policy, tool calling, streaming, usage
reporting, context limit — and records the result. A model that fails a probe cannot be bound to a role that needs that
capability. A changed version is a new model and is re-checked. This generalises today's `ollama-ready` probe.

A configured provider is not automatically **usable**: a factory routes to it only if its profile and egress policy allow
it (`web-front-door.md` §13).

## 6. Agents: roles, instructions and bindings

In KILN an **agent is a role**: instructions, a tool set and rules, bound to a model.

### 6.1 Role instructions

```markdown
---
role: security-reviewer
kind: judge                      # work · judge · planner · keeper · researcher
line_of_defense: true
tools: [read, grep, run_tests]
replay: safe
judges_gate: code-review
version: 3
---
You review the diff for security issues against the specification…
```

| Field | Meaning |
|---|---|
| `kind` | what the role is for; judges, planners and keepers have kind-specific rules |
| `line_of_defense` | binds only to the strongest model; never steered mid-verdict |
| `tools` | the only tools the role's steps may use |
| `replay` | whether its tools are safe to re-run after a crash (writes and shell are never safe) |
| `judges_gate` | which gate's evidence its verdict joins |
| `version` | recorded on every step the role runs |

### 6.2 The tier map

```yaml
# tiers.yaml
worker: qwen3-coder:30b
researcher: qwen3-coder:30b
planner: gemma4:27b
code-reviewer: strongest           # resolved per host and profile
verifier: strongest
security-reviewer: strongest
techwriter: gemma4:27b
fallbacks:
  techwriter: qwen3-coder:30b      # work roles may fall back by policy; judges never
```

A factory may override bindings in `factories/<name>.yaml` — for example, a hybrid factory routes judges to a cloud model
with cross-family judging required.

### 6.3 Trying a change before using it

`kiln agents try <role> --version <n> --on <feature>` replays the role against a **committed past feature** as an ungated
run: it shows how its verdicts or drafts would have differed — findings added, findings lost, time and cost — and changes
nothing, decides nothing. It is how a team learns whether a new reviewer instruction is better before any gate depends
on it.

### 6.4 Versions and stakes

- Every step records the role **version** it ran, so behaviour changes are traceable to instruction changes.
- **Judge instruction changes are high-stakes** — they change what every gate's evidence means. By default they need an
  Operator, and for a role shared through the team space, the team's quorum.
- Old versions are kept; switching back is one recorded change.

## 7. Who may change what

| Change | Who | Applies |
|---|---|---|
| Join, revoke, measure a host; capacity, pins, sleep, serves | **Operator** | immediately for new leases; never interrupts a step |
| Providers, catalog, credentials | **Operator** | after `kiln check model` passes |
| Workshop tier map, policy and budget defaults | **Operator** | from each factory's next step |
| A factory's profile, egress, budget, placement, tier overrides | **Decider** — at the Roadmap gate, or by a recorded command | from that factory's next step |
| Work-role instructions | **Operator** | from that role's next step |
| Judge instructions; team-shared roles | **Operator** + team quorum for shared roles | from that role's next step |
| The team floor | **team quorum** | every member workshop, at its next step |

## 8. Rules no configuration can break

Checked deterministically and failing closed:

- judges bind only to the **strongest** model available to the factory — a weaker binding is refused (today's `roles.ts` /
  `TierPolicyError`, kept);
- **cross-family** judging where factory or team policy requires it;
- judges have **no fallback** — an unavailable judge asks a person;
- **no subagent tools** for any role — only the director creates conversations;
- write and shell tools are never `replay: safe`;
- every endpoint is allowed by policy — a `local-only` factory reaches nothing beyond loopback;
- factory settings are at least as strict as workshop and team floors;
- no secrets in files.

## 9. Teams

The team space (`team-space.md`) carries the team's **floor** — policy floors, protected paths, required merge rules — and
**shared roles**: `agents/*.md` every member workshop uses, so judges apply the same standard everywhere. A member
workshop may add roles of its own and make shared ones stricter in its own factories; it cannot loosen them. A change to a
shared role is proposed in the team space and takes effect when the quorum signs.

## 10. Checking and recording

**`kiln check config`** runs before any change applies:

- every role bound to a model that exists, is reachable and passed the capabilities the role needs;
- the rules in §8;
- host pins fit their budgets; host models match the catalog;
- every provider endpoint is on the allowlist the factory's policy permits;
- factory settings at least as strict as the floors above them;
- no secret material in any file.

A failing check names the problem and applies nothing. Like every KILN check, it is never vacuous.

Gates and flows are validated by **`kiln check flow`** (`extensible-flow.md` §9) as part of the same check.

**Recorded** as events in the workshop record: `config.changed` (file, who, before, after), `config.check_failed`,
`host.joined`, `host.revoked`, `host.measured`, `model.checked`, `agent.version_changed`, `agent.try_run`.

## 11. In the web front door

| Screen | Configures |
|---|---|
| **Models & policy** (mockup 14) | providers, catalog, egress, budgets, allowed destinations |
| **Agents** (mockup 49) | roles, instructions and versions, bindings, rule checks, *try on a past feature* |
| **Hosts** (mockups 33, 15) | join, capacity, pins, sleep, who may use each host |
| **People** (mockup 20) | roles, including who may configure |
| **Roadmap gate** (mockups 03, 45) | a factory's profile, policy, budget and placement, decided with its roadmap |
| **Configuration history** (mockup 51) | every change with before and after, and every check |

Every UI change writes the same files, runs the same check and records the same event.

## 12. Three tasks

1. **A cloud judge for billing-service** — add the provider and credential; `kiln check model`; at billing-service's next
   Roadmap gate switch it to `hybrid` with an egress rule allowing judges to read diffs; bind its judges to the cloud model
   in its factory file; the check confirms cross-family judging.
2. **A new team GPU server** — `kiln host join`; Operator approval; `kiln host measure`; pin the strongest judge; set
   `serves:` to the team; move factories to it at their next Roadmap gates.
3. **A security reviewer** — write `agents/security-reviewer.md`; bind it as a judge; `kiln check config`; try it on r10;
   enable it for factories that want it (mockups 49–50).

## 13. Open questions

1. Should `kiln.config/` live in the same repository as the team space for teams, or always per workshop?
2. Should *try on a past feature* be required before a judge instruction change can apply?
3. How long are old role versions kept?

## 14. One sentence

Engineers configure KILN in plain, versioned files — hosts, providers, models, roles and their bindings — or the same
settings in the front door; every change is checked, recorded and applied from the next step, and no configuration can
weaken a judge, approve anything silently or let anything leave the machine without a rule.
