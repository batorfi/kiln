> Status: concept — **proposal and research snapshot** (2026-10-22) — **not admitted**. Hybrid deployment needs the
> `kiln-v1.x` row *Models beyond the machine* (r33); `kiln-v1` is local-only. Prices are list prices found on that date;
> per-feature costs are this doc's own estimates (*est.*) from stated assumptions — check both before relying on them.
> Type: concept (research)
>
> Scope note: this doc details **hybrid deployment scenarios**: the **judges** run on frontier models reached through a
> service such as OpenRouter (or a provider directly), while the **workers** run locally on the engineer's machine. It
> shows each scenario on an **Apple silicon** configuration, with the tier map, what leaves the machine, and what it costs.
>
> Companion docs:
>   - Routers and gateways (OpenRouter):    `model-routers.md` (the pinning rules this doc applies)
>   - Local scenarios S1–S6:                `model-landscape.md` §4 (this doc expands S6)
>   - Machines and prices:                  `dev-machines.md`
>   - Models beyond the machine (design):   `web-front-door.md` §13
>   - The rules:                            `../../.specify/memory/constitution.md` (II, III, IV, VII, VIII)

# KILN — hybrid deployments: remote judges, local workers

## 1. In one paragraph

A local judge is limited by memory: a 64 GB Mac can run a 27–31B judge, and a frontier-class open judge needs a $9,500
256 GB Mac Studio. A **hybrid** factory moves the **judges** — architecture critic, code reviewer, verifier — to a
frontier model reached through OpenRouter or a provider's API, and keeps the **workers**, which run most of the steps and
touch the code most often, **on the local machine**. The judges get much stronger, the Mac only has to hold worker models,
the lane stops swapping between judge and worker, and the cost is a few dollars of judge tokens per feature. The price is
that **the material judges read leaves the machine** — so a hybrid factory runs under an egress policy decided at the
Roadmap gate, with providers pinned, data collection denied, and everything that leaves recorded.

## 2. Why hybrid

| | Local judge (S1–S4) | Hybrid judge |
|---|---|---|
| **Judge strength** | 27–31B dense on 32–64 GB; 120B-class on 128 GB; frontier-class open only on 256 GB+ | frontier closed models (Claude Opus 5.5, GPT-6.1 Sol, Gemini 4 Argon) or the largest open models (Kimi K3, GLM-5.3, DeepSeek V4.1 Flash) |
| **Machine needed** | sized for the judge | sized for the **workers** only |
| **Swaps** | judge and worker share memory; on small machines they swap | the worker stays resident; **no judge swaps** |
| **Judge–author independence** | on 32 GB, the same weights write and judge | always a different model, and usually a **different family** |
| **Cost** | hardware | hardware for workers + **judge tokens per feature** |
| **Data** | nothing leaves | the judges' inputs leave, under policy |
| **Availability** | works offline | needs the network and the provider |

The core trade: hybrid buys judge quality and cheaper hardware with **egress** and **dependence on a service**. KILN's
rules make that trade explicit, recorded and reversible — a factory can be switched back to `local-only` at its next
Roadmap gate.

## 3. The rules a hybrid factory runs under

These come from the constitution and from [`model-routers.md`](./model-routers.md) §5; this doc applies them, it does not
change them.

1. **The remote judge is "the strongest model available to the factory"** (Principle II) — and it is **never silently
   downgraded**. If it is unreachable, the judged step **waits and says why**; it does not fall back to a local model. A
   policy may list a second **provider** for the **same** model (for example Anthropic and Amazon Bedrock for Claude Opus
   5.5), never a different model.
2. **Pinned routing.** Through OpenRouter, every judge request carries `only: [<approved providers>]`,
   `allow_fallbacks: false`, `data_collection: deny`, `require_parameters: true`, and `zdr: true` where the policy
   requires zero data retention. No `openrouter/auto`, no model fallback lists, no `:floor` or `:nitro` suffixes for judges.
3. **Egress policy first** (Principle VIII). KILN's own check — secrets scan, redaction, path rules — runs before anything
   reaches OpenRouter. Paths the policy marks restricted are never sent; a feature that needs them runs in a
   `local-only` factory.
4. **Everything recorded** (Principle VII). Each judge request records the model requested and served, the provider, the
   generation id, tokens and cost. A served model that differs from the requested one on a judge's request is a
   **broken-guarantee signal**, and that verdict is not used.
5. **Budgets pause, never downgrade.** A reached budget pauses the lane and arrives in Needs you as a policy stop.
6. **One lane per factory still holds** (Principle III). A remote judge step holds the lane like a local one; the
   difference is that it holds **no local model**, so the worker stays loaded.
7. **Decided at the Roadmap gate.** The profile (`hybrid`), the routing, the providers, the region and the budget are part
   of the factory's admission — shown in every brief, changeable only at the next Roadmap gate.

## 4. Choosing the remote judge

### 4.1 Candidates (via OpenRouter; list prices per million tokens, October 2026)

| Judge model | OpenRouter id | Input / output | Family | Notes |
|---|---|---|---|---|
| **Claude Opus 5.5** | `anthropic/claude-opus-5.5` | $4 / $20 | Claude | leads several October 2026 coding and agentic leaderboards; 1M context; EU in-region via Bedrock and Vertex at ~$4.40 / $22 |
| **Claude Sonnet 5.5** | `anthropic/claude-sonnet-5.5` | $2 / $10 | Claude | top of one October coding ranking; the price/quality sweet spot |
| **Claude Fable 5.1** | `anthropic/claude-fable-5.1` | $10 / $50 | Claude | the most capable and most expensive; for the riskiest gates |
| **GPT-6.1 Sol** | `openai/gpt-6.1-sol` | $2 / $10 | GPT | ~1M context; EU in-region via Azure at ~$2.20 / $11 |
| **Gemini 4 Argon** | `google/gemini-4-argon` | $2 / $10, **$4 / $20 after 2026-11-30** | Gemini | generally available 2026-10-13 |
| **Kimi K3** | `moonshotai/kimi-k3` | ~$2.55–2.60 / ~$12.75–13 (provider spread up to ~$4.50 input) | Kimi | among the strongest models for agentic work; 1M context; licence and weight availability disputed between sources |
| **GLM-5.3** | `z-ai/glm-5.3` | $1.40 / $4.40 | GLM | Z.ai's GLM family (GLM-5.2 is MIT-licensed open weights; check 5.3's licence); 1M context; EU providers from $0.55 / $1.96 |
| **DeepSeek V4.1 Flash** | `deepseek/deepseek-v4.1-flash` | $0.30 / $1.20 peak, $0.15 / $0.60 off-peak (DeepSeek direct) | DeepSeek | open weights (MIT); by far the cheapest frontier-class option; not in EU in-region routing |

OpenRouter adds **no markup on inference**; buying credits costs 5.5% (Standard) or 8% (Business), and **bring-your-own-key**
is free up to $25,000 a month of list-price usage, then 5%.

### 4.2 Three judge strategies

- **Frontier judge** — Claude Opus 5.5 (or Fable 5.1 for the riskiest gates). The strongest review money buys today.
- **Balanced judge** — Claude Sonnet 5.5 or GPT-6.1 Sol. Most of the quality at half the price.
- **Open-weight judge** — GLM-5.3, Kimi K3 or DeepSeek V4.1 Flash, on providers with zero data retention. Far stronger
  than any local 27–31B judge, at a fraction of closed-model prices; useful where a policy prefers open models or EU
  hosting.

**Cross-family by construction.** The local workers below are Qwen, Gemma and Mistral models; every remote judge above is
from another family — so each review is cross-family, which is exactly what a cross-family policy asks for.

**Different judges for different gates.** The tier map binds each judge role separately, so a factory can use, say,
GPT-6.1 Sol as architecture critic and Claude Opus 5.5 as code reviewer and verifier — two families checking the work at
different gates.

## 5. What a judge costs per feature

### 5.1 Assumptions (*est.*)

A medium feature — a few hundred lines changed across several files — with judges reading:

| Judged step | Input tokens | Output tokens |
|---|---|---|
| Design: critic reads concept, design and relevant knowledge; one answer round (P5) | ~90K | ~6K |
| Code review: diff, specification, design, surrounding code; one `revise` round | ~300K | ~15K |
| Verification: specification, test results, relevant code; two automatic fix rounds re-checked | ~210K | ~12K |
| **Total per feature** | **~600K** | **~33K** |

Prompt caching lowers the input cost of repeated rounds; the estimates below ignore it, so they lean high. Large or
messy features can cost three to five times more; small ones a third.

### 5.2 Judge cost per feature and per month (*est.*)

| Judge | Per feature (~600K in / ~33K out) | 20 features a month | 60 features a month |
|---|---|---|---|
| Claude Fable 5.1 | ~$7.65 | ~$153 | ~$459 |
| Claude Opus 5.5 | ~$3.06 | ~$61 | ~$184 |
| Gemini 4 Argon (after 2026-11-30) | ~$3.06 | ~$61 | ~$184 |
| Kimi K3 | ~$1.99 | ~$40 | ~$119 |
| Claude Sonnet 5.5 · GPT-6.1 Sol · Gemini 4 Argon (intro) | ~$1.53 | ~$31 | ~$92 |
| GLM-5.3 | ~$0.99 | ~$20 | ~$59 |
| DeepSeek V4.1 Flash (peak) | ~$0.22 | ~$4 | ~$13 |

Add 5.5% if paying through OpenRouter credits (or nothing under the BYOK allowance). **Even the frontier judge costs less
per month than a single memory upgrade** — the economics of hybrid are dominated by hardware savings, not token spend.

## 6. Hybrid scenarios on Apple silicon

Each scenario names a Mac from [`dev-machines.md`](./dev-machines.md), what stays local, the remote judges, an illustrative
tier map, and the cost. The tier maps are **pseudo-configuration** — routing shown inline in braces for readability — not
KILN's schema, which is decided in r33. In every scenario the **lint** step — which must use a
different family from the keeper — can run locally on a second family or remotely on a cheap model.

### H1 — Lean: a 32 GB Mac with a frontier judge

**Machine:** Mac mini M6, 32 GB (*est.* $1,300–1,500), or a MacBook Pro M5, 32 GB. ~170 GB/s on the M6.

- **Local:** one worker model, resident — **Devstral Small 2** (15 GB) or **Gemma 4 26B-A4B** (16–19 GB, ~4B active, fast
  even at low bandwidth). It also serves as keeper, spec writer and triage.
- **Remote:** judges on **Claude Sonnet 5.5** (balanced) or **Opus 5.5**; lint on a cheap remote model of another family.
- **What changes versus local S1:** S1's judge was the same 27B model that wrote the code. H1's judge is a frontier model
  of another family — the single biggest quality jump KILN offers on small hardware.

```yaml
# H1 — illustrative
profile: hybrid
local:
  worker: devstral-small-2:24b
  keeper: devstral-small-2:24b
  pin: [devstral-small-2:24b]
remote:                                   # via OpenRouter, pinned
  code-reviewer: anthropic/claude-sonnet-5.5   { only: [anthropic], allow_fallbacks: false, data_collection: deny, zdr: true }
  verifier:      anthropic/claude-sonnet-5.5   { same routing }
  architecture-critic: anthropic/claude-sonnet-5.5
  lint:          google/gemini-3.8-flash      { data_collection: deny }
budget: { monthly_usd: 50 }
```

**Cost:** ~$1,300–1,500 of hardware + ~$31 a month at 20 features (Sonnet 5.5). **Best for:** an engineer trying KILN on
a modest machine, or a second machine for side projects.

### H2 — Recommended: a 64 GB Mac mini with frontier judges

**Machine:** Mac mini M5 Pro (18-core CPU, 20-core GPU), 64 GB, 1 TB — $2,699–3,199. 307 GB/s.

- **Local:** two workers resident — **Qwen3.6 35B-A3B** (23–24 GB, ~3B active: fast tool-calling steps) and **Gemma 4 31B**
  (19–20 GB: keeper, spec writer, planner drafts, and a second family for lint). No swaps between them.
- **Remote:** **Claude Opus 5.5** for code review and verification; **GPT-6.1 Sol** as architecture critic — two more
  families at the gates.
- **What changes versus local S2:** S2's judge was a 31B local model pinned beside the worker. H2 spends that memory on a
  second worker and moves judging to frontier models.

```yaml
# H2 — illustrative
profile: hybrid
local:
  worker: qwen3.6:35b
  keeper: gemma4:31b
  spec-writer: gemma4:31b
  planner: gemma4:31b                     # or remote; strongest by default, an Operator may bind it here
  lint: qwen3.6:35b                       # lint uses a different family than the keeper (Gemma) — so Qwen
  pin: [qwen3.6:35b, gemma4:31b]
remote:
  architecture-critic: openai/gpt-6.1-sol      { only: [openai, azure], allow_fallbacks: false, data_collection: deny }
  code-reviewer:       anthropic/claude-opus-5.5 { only: [anthropic, amazon-bedrock], allow_fallbacks: false, data_collection: deny, zdr: true }
  verifier:            anthropic/claude-opus-5.5 { same routing }
budget: { monthly_usd: 120 }
```

**Cost:** ~$2,700–3,200 of hardware + ~$55–65 a month at 20 features (Opus 5.5 for two judges, GPT-6.1 Sol for one).
**Best for:** most engineers and teams — the strongest review available on the recommended entry machine.

### H3 — Power: a 128 GB M5 Max with hybrid and local-only factories side by side

**Machine:** Mac Studio M5 Max (40-core GPU), 128 GB, 1 TB — ≈ $5,399; or MacBook Pro 16" M5 Max, 128 GB — ≈ $5,099. 614 GB/s.

- **Local:** fast workers for two or three factories (Qwen3.6 35B-A3B, Gemma 4 31B, Laguna XS 2.1) **and** a resident
  **local judge** — **gpt-oss 120B** (65 GB) — for factories that must stay `local-only`.
- **Remote:** **Claude Opus 5.5** judges for the `hybrid` factories.
- **Why both:** the profile is chosen **per factory** at its Roadmap gate. The payments factory stays `local-only` with the
  local gpt-oss 120B judge; the web-frontend factory runs `hybrid` with Opus judges — on one machine, sharing one model
  pool, each recorded under its own policy. A network outage pauses only the hybrid factories' judged steps.

```yaml
# H3 — illustrative: two factories, two profiles, one host
factories:
  payments:   { profile: local-only, judges: gpt-oss:120b }
  web:        { profile: hybrid,     judges: anthropic/claude-opus-5.5 (pinned, zdr) }
host:
  pin: [gpt-oss:120b, qwen3.6:35b]        # 65 GB + 24 GB, room for a third worker and context
```

**Cost:** ~$5,100–5,400 of hardware + ~$61 a month per hybrid factory at 20 features (Opus 5.5). **Best for:** a lead or
power user with mixed sensitivity across codebases, or anyone who wants a local fallback **by policy** — switching a factory
to `local-only` at its next Roadmap gate keeps it working offline.

### H4 — Throughput: an M5 Ultra for many factories, judges remote

**Machine:** Mac Studio M5 Ultra (30-core CPU, 64-core GPU), **96 GB**, 1 TB — $5,499. ~1.2 TB/s.

- **Local:** workers for **three or four factories** at ~1.2 TB/s — the fastest local decode Apple sells — with no judge
  taking memory.
- **Remote:** **Claude Opus 5.5** as the default judge; **Claude Fable 5.1** bound as code reviewer in the factories where a
  defect is most expensive.
- **What changes versus local S4:** S4 needed a **256 GB** M5 Ultra (≈ $9,499) to hold DeepSeek V4 Flash as judge. H4 gets
  stronger judges on the **96 GB** model and spends the memory on throughput — about $4,000 less hardware, for roughly
  $60–150 a month of judge tokens per factory.

```yaml
# H4 — illustrative
profile: hybrid
local:
  worker: qwen3.6:35b
  keeper: gemma4:31b
  pin: [qwen3.6:35b, gemma4:31b, laguna-xs-2.1]   # shared by 3–4 factories through the host pool
remote:
  architecture-critic: anthropic/claude-opus-5.5 { pinned, zdr }
  code-reviewer:       anthropic/claude-opus-5.5 { pinned, zdr }   # Fable 5.1 in the payments factory
  verifier:            anthropic/claude-opus-5.5 { pinned, zdr }
budget: { monthly_usd: 600 }              # across factories
```

**Cost:** $5,499 of hardware + ~$60–150 a month per factory. **Best for:** a team lead running several factories, or a
small team sharing one machine's capacity (factories anywhere, r37).

### H5 — Budget and open: open-weight judges on zero-retention providers

Any of the machines above, with **GLM-5.3**, **Kimi K3** or **DeepSeek V4.1 Flash** as judges, routed only to providers
with zero data retention (`zdr: true`) — and, where a policy requires EU hosting, to EU in-region providers (GLM-5.3 has
EU providers; DeepSeek V4.1 Flash and Kimi K3 do not, today). Judge cost falls to ~$0.20–2 per feature. Choose this when
a policy prefers open-weight models, when spend matters most, or as a cross-check: an open judge and a closed judge on
different gates.

### Hybrid versus local, side by side

| Mac | Local scenario (judge) | Hybrid scenario (judge) | Hardware | Judge tokens / month (20 features) |
|---|---|---|---|---|
| M6, 32 GB | S1 (the worker model judges itself) | **H1** (Sonnet 5.5 or Opus 5.5) | ~$1,300–1,500 | ~$31–61 |
| M5 Pro, 64 GB | S2 (Gemma 4 31B, pinned) | **H2** (Opus 5.5 + GPT-6.1 Sol) | $2,699–3,199 | ~$55–65 |
| M5 Max, 128 GB | S3 (gpt-oss 120B) | **H3** (both, per factory) | ~$5,100–5,400 | ~$61 per hybrid factory |
| M5 Ultra, 96 GB vs 256 GB | S4 needs 256 GB (≈ $9,499) | **H4** on 96 GB ($5,499) | $5,499 | ~$60–150 per factory |

## 7. What leaves the machine — and what does not

| Leaves (to the pinned judge provider, under policy) | Stays local |
|---|---|
| the material a judge reads: the concept and design (Design gate), the diff, the specification and the code around the change (Code review), test results and the code under test (Verification), and the knowledge pages a brief cites | the full repository; worker conversations; the durable store and transcripts; the record; secrets (scanned and refused) |
| | restricted paths and features (a `local-only` factory) |

Recorded per request: model requested and served, provider, region, generation id, tokens, cost. The Merge gate shows
what left the machine for the feature; an **egress audit** lists every request per factory and feature.

**Redaction has limits.** A judge that cannot see the code cannot review it; redaction protects secrets and named
fields, not whole modules. Where code must not leave, the answer is a `local-only` factory with a local judge (H3), not a
hybrid one with heavy redaction.

## 8. Operating a hybrid factory

- **Speed.** Remote judges answer in seconds to a minute and need no local model load; workers never swap out for a judge.
  Judged gates feel faster than on most local setups.
- **Outages.** If the provider or network is down, judged steps wait with a clear reason in Needs you; worker steps
  continue up to the next gate. Health shows the outage; nothing is approved by it (Principle V).
- **Budgets.** Set per factory and per feature; reaching one pauses the lane until a person raises it or the next period
  begins.
- **Changing judge.** Moving from Sonnet to Opus, or from closed to open, is a recorded configuration change applied from
  the next step — and, because it changes a judge's instructions-or-model binding, a try-run on a past feature is the
  sensible first step (CFG-7).
- **Keys.** OpenRouter keys (or provider keys for BYOK) live in the macOS keychain, never in the record, store or logs.
- **Insights** (r36) compare judge models on the factory's own work — confirmation rates, findings that held up, cost —
  so the choice of judge is evidence-based over time.

## 9. Roadmap note

Hybrid needs r33 (*Models beyond the machine*): the remote catalog, profiles, per-role routing, egress policy, budgets
and — if routers are supported — the pinning rules of `model-routers.md`. It is listed in `kiln-v1.x` today. Because a
hybrid factory lowers the hardware a team needs to try KILN with strong judges — from a 128–256 GB machine to a 32–64 GB
one — **pulling r33 earlier**, or shipping a minimal hybrid (direct providers, judges only) close to the `kiln-v1`
release, is worth considering at a future Roadmap gate. That is a proposal, not a decision.

## 10. Open questions

1. Should a minimal hybrid — remote **judges only**, direct providers, no router — come before full r33?
2. May the **planner** run remotely by default in a hybrid factory (it is strongest-by-default), or stay local unless an
   Operator binds it remote?
3. Should a policy be able to name a **second model** of equal strength as a judge fallback, or only a second provider of
   the same model (as this doc assumes)?
4. How should the egress policy express "judge context" — which files around a diff may be sent — so reviews are good
   without sending more than needed?
5. Should insights recommend switching judge models, or only show the comparison?

## 11. Sources

Retrieved 2026-10-22. See also the sources of `model-routers.md`, `model-landscape.md` and `dev-machines.md`.

- Model availability on OpenRouter — [Anthropic](https://openrouter.ai/anthropic) · [OpenAI](https://openrouter.ai/openai) ·
  [Google](https://openrouter.ai/google) · [DeepSeek](https://openrouter.ai/deepseek) · [Z.ai](https://openrouter.ai/z-ai) ·
  [Moonshot AI](https://openrouter.ai/moonshotai)
- EU in-region prices — [Claude Opus 5.5](https://openrouter.ai/anthropic/claude-opus-5.5) ·
  [GPT-6.1 Sol](https://openrouter.ai/openai/gpt-6.1-sol) · [GLM-5.3](https://openrouter.ai/z-ai/glm-5.3)
- Claude prices — [claude.com/pricing](https://claude.com/pricing)
- GPT-6.1 Sol and Gemini 4 Argon prices — see `model-landscape.md` §7
- Kimi K3 and GLM-5.3 prices — [OpenRouter compare: Kimi K3 vs GLM-5.3](https://openrouter.ai/compare/moonshotai/kimi-k3/z-ai/glm-5.3) ·
  [anotherwrapper: GLM-5.3 vs Kimi K3](https://anotherwrapper.com/llm-pricing/glm-5.3/kimi-k3) ·
  [gradually.ai](https://www.gradually.ai/en/llm-comparison/kimi-k3-vs-glm-5.3/)
- DeepSeek V4.1 Flash prices — [ProPakistani: V4.1 Flash launch](https://propakistani.pk/2026/09/11/deepseek-v4-1-flash-launches-with-lower-prices-and-native-vision/) ·
  [Requesty](https://www.requesty.ai/models/deepseek/deepseek-v4.1-flash) ·
  [anotherwrapper](https://anotherwrapper.com/llm-pricing/deepseek-v4.1-flash) ·
  [TechNode](https://technode.com/2026/09/10/deepseek-formally-launches-v4-1-flash-routes-v4-pro-requests-to-flash/)
- Gemini 3.8 Flash price — [anotherwrapper](https://anotherwrapper.com/llm-pricing/gemini-3.8-flash)
- OpenRouter fees and routing — [pricing](https://openrouter.ai/pricing) ·
  [provider routing](https://openrouter.ai/docs/features/provider-routing)
