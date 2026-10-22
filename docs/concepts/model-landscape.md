> Status: concept — **research snapshot** (2026-10-22). Model versions, scores and prices change monthly; re-check before
> relying on a number. Nothing here binds a factory: `kiln check model` and the readiness probes (roadmap r16) are the
> arbiters of whether a model is fit for a role, and the tier map is decided per factory.
> Type: concept (research)
>
> Scope note: this doc maps today's LLM landscape — open-weight and closed — onto what a KILN factory asks of a model,
> and turns it into **local deployment scenarios**: which models fill which roles on which class of machine. The
> machines themselves, with configurations and price estimates, are in [`dev-machines.md`](./dev-machines.md).
>
> Companion docs:
>   - Dev machines and prices:          `dev-machines.md`
>   - Routers and gateways:             `model-routers.md`
>   - Configuration (tier map, roles):  `configuration.md`
>   - Models beyond the machine (v1.x): `web-front-door.md` §13
>   - The rules models must satisfy:    `../../.specify/memory/constitution.md` (II, III, IV, VIII)
>   - First run and hardware minimums:  `first-run.md` §15

# KILN — the model landscape and local deployment scenarios

## 1. In one paragraph

As of October 2026, **closed frontier models** (Anthropic's Claude 5 series, OpenAI's GPT-6 series, Google's Gemini 4)
still lead coding and agentic benchmarks, but **open-weight models that fit on one workstation** have become genuinely
useful for agentic coding: 24–35B models (Qwen3.8 27B, Qwen3.6 35B-A3B, Gemma 4 31B, Devstral Small 2, Laguna XS 2.1)
run on a 32–64 GB machine, and 74–122B mixture-of-experts models (gpt-oss 120B, Nemotron 3.5 Super, Laguna S 2.1,
Qwen3.5 122B) run on 128 GB. The largest open models (DeepSeek V4, GLM-5.2, Kimi K3) need 256 GB or more. For KILN,
which is **local-only in `kiln-v1`**, the practical question is how to fill its roles — strongest judge, fast workers, a
planner, a keeper — within one machine's memory, with as few model swaps as possible.

## 2. What a KILN factory asks of a model

KILN does not want "the best model". It wants a small, stable set of models that fill its roles under its rules.

| Role | What it needs | Rule that shapes it |
|---|---|---|
| **Judges** — architecture critic, code reviewer, verifier, added-gate judges | the **strongest** model the factory can run; good long-context reading; reliable structured verdicts | **II**: strongest, never silently downgraded — a missing judge model means a wait |
| **Workers** | strong **tool calling**, code editing, test running; speed matters because they run most of the steps | tier rule: the cheapest model the far gate can bound |
| **Planner** | reasoning over the roadmap, knowledge and record | strongest by default (configurable) |
| **Keeper** (knowledge) | long context, faithful summarising with citations | its own role; **lint on a different model family** than the keeper (KNOW-2) |
| **Researcher, spec writer, techwriter** | writing quality, citations, following templates | producers, bounded by their gates |
| **Triage** | fast, cheap classification | bounded immediately by a person |

And from the machinery, for every model:

- **Tool calling and streaming that work through `pi-ai` on Ollama** — measured per model by the readiness probes, not
  assumed (`pi-durable.md` §12).
- **Enough context** for a gate's material: 128K is workable, 256K is comfortable. Context costs memory (the KV cache)
  on top of the weights.
- **Few distinct models.** A factory has **one lane** (III) and swaps local models only on a tier change (IV); every
  extra model in the tier map is a potential multi-second swap. The best local setups use two or three models in total.
- **More than one model family** if lint or a policy wants cross-family checking.

## 3. The landscape, October 2026

### 3.1 Closed frontier models (API only — relevant from `kiln-v1.x`, r33)

`kiln-v1` runs local models only. These matter for the **hybrid** profile in `kiln-v1.x`, where a policy can route
judges (or any role) to a remote model with every request checked and recorded.

| Model | Vendor | API price (input / output per 1M tokens) | Notes |
|---|---|---|---|
| **Claude Fable 5.1** | Anthropic | $10 / $50 | the top of Anthropic's range |
| **Claude Opus 5.5** | Anthropic | $4 / $20 | leads several October 2026 coding and agentic leaderboards |
| **Claude Sonnet 5.5** | Anthropic | $2 / $10 | top of one October 2026 coding ranking; the price/quality sweet spot |
| **Claude Haiku 5.5** | Anthropic | $0.10 / $0.50 (≤100K prompt) | fast and cheap; a candidate for triage or workers |
| **GPT-6.1 Sol** | OpenAI | $2 / $10 (cached input $0.10); ~1M context | released 2026-09-29; positioned as near GPT-6 Astra at a fraction of the price |
| **Gemini 4 Argon** | Google | $2 / $10 introductory, **$4 / $20 after 2026-11-30** | generally available 2026-10-13; API access rules still in flux |

*Leaderboard picture (directional — leaderboards disagree and change weekly):* Anthropic's Claude 5-series models lead the
coding leaderboards in mid-October 2026, with OpenAI's GPT-6 series and Gemini 4 Argon close behind.

**Routers.** The same closed models — and many open-weight ones hosted by others — are also reachable through routers
such as OpenRouter. How a factory could use one without weakening its rules is in [`model-routers.md`](./model-routers.md).
**Note for `kiln-v1`:** Ollama's `:cloud` tags look local but run remotely; a local-only factory must never bind one.

### 3.2 Frontier open-weight models (256 GB+ or a server)

Open weights, but too large for most workstations at useful precision. Relevant for the high-end scenario (§4, S4) and,
later, team servers (factories anywhere, r37).

| Model | Vendor / family | Size | License | Notes |
|---|---|---|---|---|
| **DeepSeek V4 Flash** | DeepSeek | 284B total, **13B active** MoE; ~156 GB checkpoint | MIT | the most practical frontier-class open model for a 256 GB machine |
| **DeepSeek V4 Pro** | DeepSeek | larger than Flash | MIT | strong algorithmic coding claims |
| **GLM-5.2** | Z.ai | ~744B total, ~40B active MoE; ~1M context | MIT | an editorial favourite for long-horizon coding agents; needs ~512 GB even quantised |
| **Kimi K3** | Moonshot AI | ~2.8T total | disputed (custom vs. modified MIT); weight availability disputed | among the strongest open models for agentic work; treat as API-only until verified |
| **Kimi K2.6 / K2.7 Code** | Moonshot AI | 1T total, 32B active (K2.6) | modified MIT | K2.7 Code is cloud-only on Ollama |
| **Devstral 2** | Mistral | 123B dense | see model card | SWE-bench Verified 72.2% (vendor); dense, so slow on unified memory |

### 3.3 Workstation open-weight models (fit in 96–128 GB)

The sweet spot for a 128 GB machine: large mixture-of-experts models whose **active** parameters are small, so they run
at interactive speed despite their size.

| Model | Vendor / family | Size (total / active) | Ollama download | Context | License | Notes |
|---|---|---|---|---|---|---|
| **gpt-oss 120B** | OpenAI | ~120B MoE | 65 GB | 128K | Apache 2.0 | adjustable reasoning; widely supported; a solid judge on 96–128 GB |
| **Nemotron 3.5 Super** | NVIDIA | 120B / 12B | 80–90 GB | up to 1M | OpenMDW-1.1 | vision, tools, thinking; tuned for agentic use |
| **Laguna S 2.1** | Poolside | 118B / 8B | 66–96 GB (by quantisation) | 256K (1M on MLX) | OpenMDW-1.1 | a coding-agent model; 70.2% Terminal-Bench 2.1 (vendor) |
| **Qwen3.5 122B** | Alibaba / Qwen | 122B MoE | 81 GB | 256K | see model card | multimodal; the large member of the Qwen3.5 family |
| **Nemotron 3.5 Bolt** | NVIDIA | 74B / 9B | 25 GB (aggressive quant) | 256K | OpenMDW-1.1 | built to fit a 24 GB GPU for everyday agentic work |

### 3.4 Desktop open-weight models (fit in 16–32 GB)

The models most KILN factories will actually run. All support tool calling on Ollama.

| Model | Vendor / family | Size | Ollama download | Context | Notes (scores are vendor-reported) |
|---|---|---|---|---|---|
| **Qwen3.8 27B** | Alibaba / Qwen | 27B dense | 18 GB | 256K | newest Qwen; thinking on by default with adjustable effort; widely called the best local coding model for a 24 GB GPU or 32 GB Mac (SWE-bench Pro 61.7 reported) |
| **Qwen3.6 35B-A3B** | Alibaba / Qwen | 35B MoE, ~3B active | 23–24 GB | 256K | fast: ~100 tok/s measured on an M5 Max; strong agentic coding |
| **Qwen3.6 27B** | Alibaba / Qwen | 27B dense | 18–19 GB | 256K | superseded by Qwen3.8 27B, still widely used |
| **Gemma 4 31B** | Google / Gemma | 31B dense | 19–20 GB | 256K | LiveCodeBench v6 80.0%, Tau2 76.9% (vendor); multimodal; a different family from Qwen |
| **Gemma 4 26B-A4B** | Google / Gemma | 25B MoE, 3.8B active | 16–19 GB | 256K | the fast Gemma |
| **Devstral Small 2** | Mistral | 24B | 15 GB | 384K | SWE-bench Verified 65.8% (vendor); Apache 2.0; built for agentic coding |
| **Laguna XS 2.1** | Poolside | 33B MoE, 3B active | ~20 GB | 256K | SWE-bench Verified 70.9% reported; made for multi-hour agentic sessions |
| **gpt-oss 20B** | OpenAI | ~21B MoE | 14 GB | 128K | Apache 2.0; the classic 16 GB choice |
| **Nemotron 3.5 Lightning** | NVIDIA | ~30B MoE, ~3B active | — | — | tools and thinking; a fast NVIDIA-family option |

### 3.5 Small helpers (under 10 GB)

For triage and quick classification, where a person's gate bounds the result immediately: **Gemma 4 E4B / E2B**
(6.6–9.5 GB / 4.6–7.5 GB), **Qwen3.5 9B / 4B**, **Gemma 4 12B** (~8 GB). Using a helper costs a swap unless it stays
resident beside the main models, so on small machines it is often better to let the worker model do triage too.

### 3.6 Model families

Cross-family checking (lint today; cross-family judging under a `kiln-v1.x` policy) needs at least two families on the
machine. The families above: **Qwen** (Alibaba), **Gemma** (Google), **gpt-oss** (OpenAI), **Nemotron** (NVIDIA),
**Devstral / Mistral**, **Laguna** (Poolside), **DeepSeek**, **GLM** (Z.ai), **Kimi** (Moonshot). How the catalog records
families so this can be enforced is an open decision for r33.

## 4. Local deployment scenarios

Each scenario is a machine class, a memory budget and a **tier map** that respects KILN's rules: the judge is the
strongest model that fits, the lane swaps as rarely as possible, and lint runs on another family. Machines and prices
for each class are in [`dev-machines.md`](./dev-machines.md).

**The tier maps are illustrative** — they show the shape of a binding, not shipped defaults, and model tags must exist
in the local catalog (check each with `kiln check model`).

**How to read the memory budget.** Usable model memory is less than total memory: on a Mac the GPU can use roughly 70–75%
of unified memory by default; on a PC it is the GPU's VRAM (or, for unified-memory PCs, the share assigned to the GPU).
Each resident model needs its weights **plus** its KV cache — several GB at long context.

### S1 — Minimum: one model does everything (32 GB unified, or a 24 GB GPU)

The `kiln-v1` minimum. Room for **one** ~20 GB model with context.

```yaml
# tiers.yaml — S1
worker: qwen3.8:27b
code-reviewer: strongest        # resolves to qwen3.8:27b — the only model that fits
verifier: strongest
architecture-critic: strongest
planner: strongest
keeper: qwen3.8:27b
lint: gemma4:12b                # another family; costs a swap each lint pass
```

- **Zero swaps** in normal work: one model is resident for every role.
- The judge is a 27B model reviewing a 27B model's work — independent *roles and conversations* (Principle I), but the
  same weights. Quality relies more on the person at the gate.
- Expect ~20–30 tok/s on a 32 GB Mac with good bandwidth, more on a 24 GB GPU; slower on a low-bandwidth base chip.
- Alternative: **Gemma 4 31B** as the single model; or **Devstral Small 2** on tighter memory.

### S2 — Balanced: strong judge, fast worker (64 GB unified, or 32–48 GB of VRAM)

The recommended single-factory setup. Two models stay resident.

```yaml
# tiers.yaml — S2
worker: qwen3.6:35b             # MoE, ~3B active: fast tool-calling steps
code-reviewer: strongest        # gemma4:31b or qwen3.8:27b, pinned resident
verifier: strongest
architecture-critic: strongest
planner: strongest
keeper: qwen3.6:35b
lint: gemma4:31b                # if the judge is qwen3.8, lint on Gemma (or vice versa)
pin: [gemma4:31b]
```

- Worker steps run fast on the MoE model; the judge is **pinned**, so judged gates cost no load time.
- Choose judge and worker from **different families** (Gemma judge, Qwen worker) to get cross-family review for free.
- Variants: Laguna XS 2.1 or Devstral Small 2 as the worker for long agentic sessions.

### S3 — Workstation: a large judge, several factories (128 GB unified, or 96 GB of VRAM)

The sweet spot for a power user or a lead running two or three factories.

```yaml
# tiers.yaml — S3
worker: qwen3.6:35b
code-reviewer: strongest        # gpt-oss:120b (65 GB) or laguna-s-2.1 / nemotron-3.5-super
verifier: strongest
architecture-critic: strongest
planner: strongest
keeper: gemma4:26b              # a fast, different family for knowledge work
lint: qwen3.8:27b
pin: [gpt-oss:120b]
```

- A 120B-class MoE judge (8–12B active) stays resident; one or two ~20 GB workers rotate around it, shared across
  factories by the host's model pool (r25).
- Two or three factories share the pool; while one waits at a gate, another uses the machine — the main reason to run
  several (`web-front-door.md` §12).
- On a 128 GB AMD Ryzen AI Max machine or a DGX Spark, the fit is the same but decode is slower (~250–275 GB/s); fine
  for judges, noticeable for workers.

### S4 — High end: frontier-class open judge (256–512 GB unified)

For teams that want the strongest local judge money can buy, without a cloud.

```yaml
# tiers.yaml — S4 (256 GB)
worker: qwen3.6:35b
code-reviewer: strongest        # DeepSeek V4 Flash (284B / 13B active, ~156 GB) — check how it is served locally
verifier: strongest
architecture-critic: strongest
planner: strongest
keeper: gemma4:31b
lint: gpt-oss:120b
pin: [deepseek-v4-flash]        # illustrative tag
```

- DeepSeek V4 Flash fits in 256 GB with room for workers; at 512 GB, GLM-5.2 becomes possible.
- Several factories, a pinned frontier-class judge, and fast workers — on one desk, nothing leaving it.
- Cost and availability are the limits (`dev-machines.md` §4.3).

### S5 — GPU workstation (24–96 GB of VRAM, Linux)

The NVIDIA path: less memory per dollar than Apple's unified memory, much more bandwidth and **far faster prompt
processing** — which matters when judges read long diffs and briefs.

- **24–32 GB** (RTX 3090 / 5090, Radeon AI PRO R9700): S1 or a tight S2 (judge and worker swapping).
- **2× 32 GB** (two R9700s, or similar): S2 comfortably.
- **96 GB** (RTX PRO 6000 Blackwell): S3 with the speed of a discrete GPU.
- System RAM can hold a model off the GPU, but offloaded layers run much slower — plan the tier map to fit VRAM.

### S6 — Hybrid (from `kiln-v1.x`, r33)

When a local judge is not strong enough for the work, a policy may route **judges** to a remote frontier model while
**workers stay local** — every request checked against the egress policy and recorded, and cross-family judging
available by choosing, say, a Claude judge for Qwen-written code.

```yaml
# tiers.yaml — S6 (illustrative; needs r33)
worker: qwen3.6:35b             # local
code-reviewer: claude-opus-5-5  # remote, under the factory's egress policy
verifier: claude-opus-5-5
architecture-critic: gpt-6.1-sol
planner: strongest
```

Not available in `kiln-v1`. The design is in `web-front-door.md` §13; hybrid scenarios on Apple silicon, with costs, are in
[`hybrid-deployments.md`](./hybrid-deployments.md). A remote judge can also be reached through a
**router** such as OpenRouter or a team-run gateway — always pinned to one model and an approved provider list; see
[`model-routers.md`](./model-routers.md).

### Choosing a scenario

| You have | Scenario | What you get |
|---|---|---|
| 32 GB Mac or a 24 GB GPU | **S1** | a working factory; the person at the gate carries more of the quality |
| 64 GB Mac or 32–48 GB of VRAM | **S2** | a real, independent judge and fast workers — the recommended start |
| 128 GB Mac, Ryzen AI Max, DGX Spark, or a 96 GB GPU | **S3** | a 120B-class judge and two or three factories |
| 256–512 GB Mac Studio | **S4** | a frontier-class open judge, locally |
| A frontier judge, and policy allows the cloud | **S6** | from `kiln-v1.x` |

## 5. Rules of thumb

- **Memory first.** Weights at 4-bit ≈ 0.55–0.6 GB per billion parameters; 8-bit ≈ 1.05–1.1 GB. Add the KV cache (grows
  with context) and keep 20–30% headroom.
- **Speed ≈ bandwidth ÷ bytes read per token.** Decode reads the **active** weights for every token, so a 3B-active MoE is
  several times faster than a 27B dense model of the same file size. Example: a 27B dense model at 4-bit (~16 GB) on a
  614 GB/s M5 Max decodes at roughly 25–35 tok/s; on a 1,792 GB/s RTX 5090, ~60–70 tok/s (measured: 61–69).
- **Dense judges, MoE workers.** Dense models tend to be steadier reviewers; MoE models are fast enough for the many
  worker steps.
- **Long context is not free.** A 256K context is a promise of the model, not of your memory; budget KV cache for the
  context the gates actually need.
- **Backends differ.** On Apple silicon, one controlled test found llama.cpp 10–24% faster than MLX on decode for a MoE
  model; vendors' and users' numbers vary widely with quantisation and settings. Measure on your own machine.
- **Measure in KILN, not on leaderboards.** Leaderboard scores are vendor-reported on different harnesses. `kiln check
  model` records what the model actually does with KILN's tools on your hardware.

## 6. What this means for KILN

- **r16 — readiness probes per model.** Tool calling, streaming, usage reporting and context behaviour are measured for
  each model KILN recommends; the list above is the starting set (Qwen3.8 27B, Qwen3.6 35B, Gemma 4 31B/26B, Devstral
  Small 2, Laguna XS 2.1, gpt-oss 20B/120B, Nemotron 3.5, Laguna S 2.1).
- **r17 — the local catalog** records family, size, context and capabilities, so `kiln check config` can enforce
  "strongest judge" and lint's other-family rule.
- **r28 — `kiln doctor` recommendations** follow the scenarios: measure memory and bandwidth, propose S1–S4 with a tier
  map, and say plainly below 32 GB that local-only will be slow or limited.
- **r33 — hybrid** brings the closed models of §3.1 in, under policy.
- **Keep this doc current.** It is a dated snapshot; refresh it when a new model family or generation lands, and before
  each release.

## 7. Sources

Retrieved 2026-10-22. Scores are vendor-reported unless stated; prices are list prices at retrieval.

- Ollama library and model pages — [library](https://ollama.com/library) ·
  [qwen3.8](https://ollama.com/library/qwen3.8) · [qwen3.6](https://ollama.com/library/qwen3.6) ·
  [qwen3.5](https://ollama.com/library/qwen3.5) · [gemma4](https://ollama.com/library/gemma4) ·
  [gpt-oss](https://ollama.com/library/gpt-oss) · [devstral-small-2](https://ollama.com/library/devstral-small-2) ·
  [laguna-s-2.1](https://ollama.com/library/laguna-s-2.1) · [nemotron-3.5-super](https://ollama.com/library/nemotron-3.5-super) ·
  [nemotron-3.5-bolt](https://ollama.com/library/nemotron-3.5-bolt) · searches for
  [devstral](https://ollama.com/search?q=devstral), [laguna](https://ollama.com/search?q=laguna),
  [nemotron](https://ollama.com/search?q=nemotron)
- Claude API pricing — [claude.com/pricing](https://claude.com/pricing)
- GPT-6.1 Sol — [TechEnclave](https://techenclave.com/news/items/openai-releases-gpt-6-1-sol-for-codex-chatgpt-work-and-the-api) ·
  [llmreference](https://www.llmreference.com/model/gpt-6.1-sol/openai-api) ·
  [anotherwrapper pricing](https://anotherwrapper.com/llm-pricing/gpt-6.1-sol)
- Gemini 4 Argon — [Toolhalla](https://toolhalla.ai/blog/gemini-4-argon-api-price-context-2026) ·
  [Let's Data Science](https://letsdatascience.com/news/google-opens-gemini-4-argon-to-gemini-app-subscribers-6313cd7e) ·
  [RTTNews](https://www.rttnews.com/3698659/google-begins-gemini-4-argon-rollout-with-access-limited-to-paying-users.aspx)
- Leaderboards — [BenchLM coding](https://benchlm.ai/coding) · [BenchLM](https://benchlm.ai/) ·
  [FrontierCode (Cognition)](https://cognition.com/frontiercode) · [BenchLM FrontierCode](https://benchlm.ai/benchmarks/frontiercode)
- Open-weight roundups — [Kilo](https://kilo.ai/open-source-models) · [AceCloud](https://acecloud.ai/blog/best-open-source-llms/) ·
  [PromptQuorum, coding](https://www.promptquorum.com/local-llms/best-local-llms-for-coding) ·
  [PromptQuorum, 2026 releases](https://www.promptquorum.com/local-llms/local-llm-model-updates-2026) ·
  [KDnuggets](https://www.kdnuggets.com/top-7-coding-models-you-can-run-locally-in-2026) ·
  [MindStudio](https://www.mindstudio.ai/blog/best-open-source-llms-agentic-coding-2026)
- Frontier open models — [Akash: Kimi K3 vs GLM-5.2 vs DeepSeek V4 Flash](https://akash.network/bits/kimi-k3-vs-glm-5-2-vs-deepseek-v4-flash-0731-self-host-guide/) ·
  [DeepInfra comparison](https://deepinfra.com/blog/kimi-k3-vs-deepseek-v4-pro-vs-glm-5-2) ·
  [ProPakistani on V4 Flash](https://propakistani.pk/2026/08/03/deepseek-v4-flash-beats-glm-5-2-rivals-opus-4-8-while-costing-just-0-28/)
- Performance — [Apple-silicon llama.cpp vs MLX benchmark](https://github.com/stared/benching-local-llms-on-apple-silicon) ·
  [oMLX community runs](https://omlx.ai/benchmarks/fnhgnhuw) · [RTX 5090 benchmarks](https://presenc.ai/research/rtx-5090-local-llm-benchmarks-2026) ·
  [Compute Market](https://www.compute-market.com/blog/rtx-5090-vs-rtx-4090-for-ai-2026)
