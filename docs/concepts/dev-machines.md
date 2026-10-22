> Status: concept — **research snapshot** (2026-10-22). Prices are US list or street prices found on that date, during a
> **memory shortage that has pushed RAM and GPU prices well above list**; they move weekly. Treat every figure as an
> estimate and check live listings before buying. Prices marked *est.* are this doc's own estimates.
> Type: concept (research)
>
> Scope note: this doc describes **developer machines for running KILN factories locally** — Apple silicon on macOS, and
> Intel/AMD/NVIDIA machines on Linux (and what that means for Windows) — in **cheap, medium and high-end
> configurations with price estimates**, each mapped to a deployment scenario. Which models run in each scenario is in
> [`model-landscape.md`](./model-landscape.md).
>
> Companion docs:
>   - Models and deployment scenarios S1–S6: `model-landscape.md`
>   - First run and hardware minimums:       `first-run.md` §15 (32 GB minimum, 64 GB recommended)
>   - Several factories on one machine:      `web-front-door.md` §12
>   - Non-functional requirements:           `../prd/kiln-prd.md` §7 (macOS first, Linux next)

# KILN — dev machines: configurations and prices

## 1. In one paragraph

A KILN factory is **memory-bound**: it needs room for a strong judge model, a fast worker model and their context, and
it generates one stream at a time per factory. That makes three numbers decide a machine — **how much memory the models
can use**, **memory bandwidth** (decode speed), and **prompt-processing speed** (how fast judges read long diffs). Apple
silicon offers the most model memory per dollar and per watt; NVIDIA GPUs offer the most speed but little memory per
dollar; AMD's Ryzen AI Max and NVIDIA's DGX Spark sit in between with 128 GB of slower unified memory. In October 2026 a
useful KILN machine costs from about **$1,300** (minimum) through **$2,700–3,200** (recommended) to **$5,000–6,000**
(workstation) and **$9,500–16,000+** (high end).

## 2. How to size a machine for KILN

| What matters | Why | Rule of thumb |
|---|---|---|
| **Model memory** | the judge and worker must stay resident to avoid swaps (Principle IV) | 32 GB: one ~20 GB model · 64 GB: judge + worker · 128 GB: a 120B-class judge + workers, or several factories |
| **Memory bandwidth** | decode speed ≈ bandwidth ÷ active weights per token | ≥ 300 GB/s for comfortable 27B judges; ≥ 600 GB/s for snappy ones |
| **Prompt processing** | judges read whole diffs, specs and briefs before answering | NVIDIA GPUs lead by a wide margin; Apple and unified-memory PCs are slower |
| **Storage** | models are 15–160 GB each; stores, archives and worktrees grow | 1 TB minimum, 2 TB comfortable |
| **Platform** | KILN `kiln-v1` targets **macOS first, Linux next** (PRD §7) | Windows: see §5.4 |

**Usable model memory** is less than total: on a Mac the GPU can wire roughly 70–75% of unified memory by default
(adjustable); on a discrete-GPU PC it is the card's VRAM — models spilled into system RAM run far slower.

### Platforms at a glance

| Platform | Model memory | Bandwidth | Price for the platform (Oct 2026) |
|---|---|---|---|
| Mac mini **M6** | up to 32 GB unified | ~170 GB/s | from $899 (16 GB); 32 GB *est.* $1,300–1,500 |
| Mac mini / MacBook Pro **M5 Pro** | up to 64 GB unified | 307 GB/s | Mac mini 64 GB: $2,699–3,199 |
| Mac Studio / MacBook Pro **M5 Max** | up to 128 GB unified | up to 614 GB/s (40-core GPU) | Mac Studio from $2,499 (36 GB); 128 GB ≈ $5,399 |
| Mac Studio **M5 Ultra** | 96–256 GB (512 GB from late Oct) | ~1.2 TB/s | from $5,499 (96 GB); 256 GB ≈ $9,499 |
| **AMD Ryzen AI Max+ 395** mini PC | 128 GB unified | ~256 GB/s | $3,400–4,350 complete |
| **NVIDIA DGX Spark** (GB10) | 128 GB unified | 273 GB/s | $4,699 Founders Edition; ASUS Ascent GX10 $3,999 |
| **RTX 5060 Ti 16 GB** | 16 GB VRAM | 448 GB/s | $580–780 street (list $429) |
| **RTX 3090** (used) | 24 GB VRAM | 936 GB/s | $800–1,250 used |
| **Radeon AI PRO R9700** | 32 GB VRAM | 640 GB/s | $1,299 list; ~€1,650 in EU listings |
| **RTX 5090** | 32 GB VRAM | 1,792 GB/s | list $1,999; street **$4,300–9,000**, often out of stock |
| **RTX PRO 6000 Blackwell** | 96 GB VRAM | 1,792 GB/s | street $9,000–11,500; NVIDIA marketplace $13,250 |

## 3. A note on the 2026 market

Memory prices rose sharply through 2026, and it shows everywhere: the M5 Ultra Mac Studio starts at $5,499 against
$4,000 for the previous generation; the DGX Spark rose from $3,999 at launch to $4,699; 128 GB Ryzen AI Max mini PCs that
sold for $1,500–1,900 a year ago now cost $3,400–4,350; and the RTX 5090 trades at two to four times its $1,999 list
price when it can be found at all. Plan budgets with headroom, prefer complete systems with known prices, and re-check
before buying — this doc's prices will age fastest.

## 4. Apple silicon (macOS)

Apple silicon is KILN's first platform. Its advantage is **unified memory**: a 128 GB Mac can hold a 120B-class judge and
its workers at once, quietly, on one power plug. Its weakness is prompt processing, which is slower than on NVIDIA GPUs.
Ollama runs natively, with MLX builds of many models.

### 4.1 Cheap — the minimum and the recommended entry

| Configuration | Memory / bandwidth | Price | Scenario |
|---|---|---|---|
| **Mac mini M6, 32 GB, 1 TB** | 32 GB / ~170 GB/s | *est.* $1,300–1,500 (base $899 with 16 GB) | **S1**, slowly |
| **Mac mini M5 Pro (18-core CPU, 20-core GPU), 64 GB, 1 TB** | 64 GB / 307 GB/s | $2,699–3,199 | **S2** — the recommended entry |
| MacBook Pro 14" M5 Pro, 48 GB | 48 GB / 307 GB/s | *est.* $2,800–3,200 | S1 comfortably, a tight S2 |

- The **M6 Mac mini at 32 GB** meets KILN's minimum, but its ~170 GB/s bandwidth makes a 27B judge slow (*est.*
  8–12 tok/s); pair it with a smaller or MoE model.
- The **M5 Pro Mac mini at 64 GB** is the honest sweet spot: a Gemma 4 31B or Qwen3.8 27B judge pinned beside a fast
  Qwen3.6 35B-A3B worker, at 307 GB/s.

### 4.2 Medium — the workstation

| Configuration | Memory / bandwidth | Price | Scenario |
|---|---|---|---|
| **Mac Studio M5 Max (40-core GPU), 128 GB, 1 TB** | 128 GB / 614 GB/s | ≈ $5,399 (4 TB ≈ $6,899) | **S3** — two or three factories |
| **MacBook Pro 16" M5 Max, 128 GB, 2 TB** | 128 GB / 614 GB/s | ≈ $5,099 (retailer tracker) | **S3**, portable |
| Mac Studio M5 Max, 64 GB | 64 GB / up to 614 GB/s | *est.* $3,300–3,700 | a fast S2 |

- 128 GB holds gpt-oss 120B (65 GB) or Laguna S 2.1 / Nemotron 3.5 Super (66–90 GB) as a pinned judge, plus a ~20 GB
  worker and context.
- Measured on an M5 Max: Qwen3.6 35B-A3B decodes at ~100 tok/s at short context, falling at very long contexts.

### 4.3 High end — frontier-class local judges

| Configuration | Memory / bandwidth | Price | Scenario |
|---|---|---|---|
| **Mac Studio M5 Ultra (30-core CPU, 64-core GPU), 96 GB, 1 TB** | 96 GB / ~1.2 TB/s | $5,499 | a very fast S3 with a ≤ 65 GB judge |
| **Mac Studio M5 Ultra, 256 GB, 1 TB** | 256 GB / ~1.2 TB/s | ≈ $9,499 ($5,499 + $4,000 memory upgrade) | **S4** — DeepSeek V4 Flash as judge |
| Mac Studio M5 Ultra, 256 GB, 4 TB | 256 GB | $12,299 (as reviewed) | S4 with room for many models |
| Mac Studio M5 Ultra, 512 GB | 512 GB | not yet priced; ships late October 2026 | S4 with GLM-5.2-class models |

- The M5 Ultra is the only single desktop machine that holds a ~156 GB frontier-class open model **and** its workers.
- A fully maxed configuration (upgraded chip, 256 GB, 16 TB) is $18,299.

## 5. Intel / AMD / NVIDIA machines (Linux, and Windows)

Linux is KILN's second platform. Three kinds of machine make sense: a **discrete NVIDIA (or AMD) GPU** in a desktop,
a **unified-memory mini PC** (AMD Ryzen AI Max+ 395), or **NVIDIA's DGX Spark**. Ollama supports NVIDIA (CUDA) and AMD
(ROCm/Vulkan) GPUs; check support for your exact card.

PC system prices below combine a GPU price found on 2026-10-22 with a *base system* estimate (CPU, motherboard, 64–128 GB
DDR5, 2 TB NVMe, power supply, case) — DDR5 is also inflated by the shortage. Base systems are *est.*

### 5.1 Cheap

| Configuration | Model memory | Price | Scenario |
|---|---|---|---|
| **Desktop + used RTX 3090 24 GB**, Ryzen 7 / Core Ultra 7, 64 GB DDR5, 2 TB | 24 GB VRAM, 936 GB/s | GPU $800–1,250 + base *est.* $1,300–1,800 ≈ **$2,100–3,050** | **S1** at good speed |
| Desktop + RTX 5060 Ti 16 GB, 64 GB DDR5, 2 TB | 16 GB VRAM, 448 GB/s | GPU $580–780 + base *est.* $1,200–1,600 ≈ **$1,800–2,400** | below S1: 14–15 GB models only (gpt-oss 20B, Devstral Small 2) |
| Desktop + Radeon AI PRO R9700 32 GB, 64 GB DDR5, 2 TB | 32 GB VRAM, 640 GB/s | GPU ~$1,300–1,650 + base *est.* $1,300–1,800 ≈ **$2,600–3,450** | **S1**, or a tight S2 |

- A used **RTX 3090** remains the cheapest way to 24 GB of fast VRAM — enough for one 27B judge-and-worker model (S1).
  Buy from sellers with returns; these cards are 5+ years old.
- **16 GB cards** sit below KILN's comfortable minimum: they run the 14–15 GB models well, but not a 27–31B judge.

### 5.2 Medium

| Configuration | Model memory | Price | Scenario |
|---|---|---|---|
| **AMD Ryzen AI Max+ 395 mini PC, 128 GB, 2 TB** (Framework Desktop, Bosgame M5, GMKtec EVO-X3, ACEMAGIC M1A PRO+, Beelink GTR9 Pro) | 128 GB unified (most assignable to the GPU), ~256 GB/s | **$3,400–4,350** complete | **S3** fit, slower decode |
| **NVIDIA DGX Spark** / ASUS Ascent GX10 (GB10, 128 GB) | 128 GB unified, 273 GB/s | **$3,999–4,699** complete | **S3** fit; strong prompt processing |
| **Desktop + 2× Radeon AI PRO R9700** (64 GB VRAM), 128 GB DDR5 | 64 GB VRAM, 640 GB/s each | GPUs $2,600–3,300 + base *est.* $1,900–2,500 ≈ **$4,500–5,800** | **S2** comfortably |
| Desktop + RTX 5090 32 GB, 64–128 GB DDR5 | 32 GB VRAM, 1,792 GB/s | GPU $4,300–9,000 street + base *est.* $1,600–2,400 ≈ **$5,900–11,400** | fast S1 / tight S2 — poor value at today's street price |

- **Ryzen AI Max+ 395** machines hold a 120B-class MoE judge at a third of a Mac Studio's price, but decode is slow on
  dense models: independent tests show ~72–82 tok/s on 30B-A3B MoE models, ~34 tok/s on gpt-oss 120B, and ~5 tok/s on a
  dense 70B. Choose MoE judges.
- **DGX Spark** has similar memory and bandwidth with NVIDIA's software stack and much faster prompt processing; decode
  speed varies ~4× with the serving stack (gpt-oss 120B: ~12 tok/s on Ollama, ~38 on tuned llama.cpp, ~50 on SGLang). It
  runs Linux (DGX OS), so it suits KILN's Linux target.
- The **RTX 5090** is the fastest consumer card, but at two to four times its list price it is hard to recommend for KILN
  until supply recovers; if found near list, it is an excellent S1/S2 machine.

### 5.3 High end

| Configuration | Model memory | Price | Scenario |
|---|---|---|---|
| **Workstation + RTX PRO 6000 Blackwell 96 GB**, Threadripper / Xeon class, 256 GB DDR5, 4 TB | 96 GB VRAM, 1,792 GB/s | GPU $9,000–11,500 + base *est.* $3,000–4,500 ≈ **$12,000–16,000** | **S3** at discrete-GPU speed |
| **Workstation + 2× RTX PRO 6000** (192 GB VRAM) | 192 GB VRAM | GPUs $18,000–23,000 + base *est.* $4,000–5,500 ≈ **$22,000–28,500** | **S4**-class judges at high speed; several factories |

- One RTX PRO 6000 holds a 120B-class MoE judge **and** a worker entirely in VRAM, with the prompt-processing speed that
  makes judged gates feel quick.
- Two cards reach frontier-class open models (DeepSeek V4 Flash ~156 GB) — the PC equivalent of a 256 GB M5 Ultra, faster
  and roughly two to three times the price. This is also the shape of a **team server** once factories can run on other
  hosts (`kiln-v1.x`, r37).

### 5.4 Windows

KILN `kiln-v1` targets **macOS first, Linux next**; Windows is not a supported platform. A Windows PC with the hardware
above can still be a good KILN machine:

- **Dual-boot or reinstall Linux** — the supported path for the hardware in §5.
- **WSL2** — Ollama and Node run under WSL2 with GPU access on NVIDIA; useful for trying KILN, but unsupported and
  untested in `kiln-v1`.
- Native Windows Ollama works, but KILN itself does not target native Windows.

## 6. Recommendations

| Budget (Oct 2026) | Apple (macOS) | PC (Linux) | Scenario |
|---|---|---|---|
| **~$1,300–2,400** — minimum | Mac mini M6, 32 GB | desktop + RTX 5060 Ti 16 GB (below minimum) | S1 / smaller models |
| **~$2,100–3,200** — recommended start | **Mac mini M5 Pro, 64 GB** | **desktop + used RTX 3090 24 GB**, or + R9700 32 GB | S1–S2 |
| **~$3,400–5,800** — workstation | **Mac Studio M5 Max, 128 GB** (~$5,399) | **Ryzen AI Max+ 395, 128 GB**, **DGX Spark**, or 2× R9700 | S2–S3 |
| **~$9,500–16,000** — high end | **Mac Studio M5 Ultra, 256 GB** (~$9,499) | **RTX PRO 6000 workstation** | S3–S4 |
| **$18,000+** — no compromises | Mac Studio M5 Ultra, 512 GB (when priced) | 2× RTX PRO 6000 | S4 |

**If unsure, start with 64 GB of fast unified memory** (Mac mini M5 Pro) **or a 24–32 GB GPU** (used RTX 3090,
Radeon AI PRO R9700): that is scenario S2 — a real, independent judge beside a fast worker — at the lowest price that does
it well. Move to 128 GB when you want a 120B-class judge or several factories at once.

## 7. What this means for KILN

- **`kiln doctor` (r28)** measures memory, bandwidth and disk, then recommends a scenario and a tier map from
  `model-landscape.md` — and states plainly below 32 GB that local-only will be slow or limited.
- **The host memory budget (r25)** — how many resident models a host may hold — should default from the measured memory,
  using the usable-memory rule in §2.
- **Performance targets are measured, not assumed** (PRD §7): `kiln host measure` and the readiness probes record
  tokens per second and swap cost per model and host, so recommendations improve with real data.
- **Refresh this doc** with each release; prices and models will have moved.

## 8. Sources

Retrieved 2026-10-22.

- Apple store configurations — [Mac mini](https://www.apple.com/shop/buy-mac/mac-mini) ·
  [Mac Studio](https://www.apple.com/shop/buy-mac/mac-studio) · [MacBook Pro](https://www.apple.com/shop/buy-mac/macbook-pro)
- Mac Studio M5 Max / M5 Ultra — [MacRumors roundup](https://www.macrumors.com/roundup/mac-studio/) ·
  [PetaPixel: up to 512 GB](https://petapixel.com/2026/08/25/apples-new-mac-studio-supports-up-to-512gb-of-unified-memory/) ·
  [TokenPost: from $5,499](https://www.tokenpost.com/news/technology/37242) ·
  [BigGo: price jump](https://finance.biggo.com/news/f2aae059-71e8-4420-adbf-f8acedf4174a) ·
  [aiindigo: M5 Max 128 GB](https://aiindigo.com/hardware/apple-mac-studio-m5-max-128gb) ·
  [TechRadar: M5 Max $200 drop](https://techradar.com/pro/as-apple-readies-its-512gb-m5-ultra-mac-studio-for-local-ai-the-m5-max-workstation-drops-by-usd200) ·
  [ModelFit: M5 Ultra 512 GB](https://modelfit.io/blog/mac-studio-m5-ultra-512gb-local-llm/)
- Mac mini M6 / M5 Pro — [Macworld: M6 Mac mini](https://macworld.com/article/3220063/apple-launches-new-m6-mac-mini-with-another-price-hike.html) ·
  [refurb.me: M5 Pro](https://www.refurb.me/stats/mac-mini/mac-mini-m5-pro-late-2026) ·
  [Pickr](https://www.pickr.com.au/news/2026/apple-mac-mini-updated-for-m6/) ·
  [Evetech: M5 Pro vs M5 Max for local AI](https://evezone.evetech.co.za/daily-drop/apple-m5-pro-vs-m5-max-for-local-ai-why-307-gb-s-and-64gb-is-the-honest-sweet-spot-for-cod) ·
  [AppleInsider](https://appleinsider.com/articles/26/03/03/what-you-get-from-a-maxed-out-macbook-pro-macbook-air-or-mac-mini)
- Ryzen AI Max+ 395 — [ComputingForGeeks comparison](https://computingforgeeks.com/ryzen-ai-max-395-mini-pc-comparison/) ·
  [PromptQuorum](https://www.promptquorum.com/local-llms/best-amd-mini-pc-local-llm-2026) ·
  [Windows Forum: EVO-X3 review](https://windowsforum.com/news/gmktec-evo-x3-review-ryzen-ai-max-395-mini-pc-with-128gb-ram-for-local-ai.447864/) ·
  [Botmonster](https://botmonster.com/hardware/amd-strix-halo-mini-pcs-ryzen-ai-max-395-homelab/) ·
  [GMKtec EVO-X3](https://www.gmktec.com/products/gmktec-evo-x3-ai-mini-pc-amd-ryzen-ai-max-395) ·
  [ACEMAGIC M1A PRO+](https://acemagic.com/products/m1a-395) · [TechPowerUp: ONEXStation](https://www.techpowerup.com/348152/onexstation-launches-as-usd-2-999-ryzen-ai-max-395-mini-pc-for-gaming-ai-and-remote-server-workloads)
- DGX Spark — [Toolhalla guide](https://toolhalla.ai/blog/nvidia-dgx-spark-complete-guide-2026) ·
  [OpenClawDC](https://openclawdc.com/blog/is-the-dgx-spark-worth-it/) · [gpuperhour](https://gpuperhour.com/blog/dgx-spark-vs-cloud-gpu)
- NVIDIA / AMD GPUs — [RTX 5090 benchmarks (PresencAI)](https://presenc.ai/research/rtx-5090-local-llm-benchmarks-2026) ·
  [Compute Market: 5090 vs 4090](https://www.compute-market.com/blog/rtx-5090-vs-rtx-4090-for-ai-2026) ·
  [ComputingForGeeks: best GPU for LLMs](https://computingforgeeks.com/best-gpu-for-llm/) ·
  [RTX 5090 out of stock](https://pasqualepillitteri.it/en/news/16362/rtx-5090-out-of-stock-us) ·
  [RTX PRO 6000 prices](https://www.digitalcitizen.life/nvidia-rtx-pro-6000-blackwell-prices-climb-past-10000-as-ai-demand-keeps-rising/) ·
  [RTX 3090 resale](https://resaleprices.com/gpu/nvidia-rtx-3090) ·
  [Aliteq: GPU price hike](https://aliteq.com/should-you-buy-a-gpu-for-local-ai-before-the-price-hike-2026) ·
  [GPUPrix: RTX 5060 Ti 16 GB](https://gpuprix.com/us/gpus/geforce-rtx-5060-ti-16gb) ·
  [TechRadar: Radeon AI PRO R9700](https://www.techradar.com/pro/amds-fastest-gpu-ever-will-sell-for-as-little-as-usd1244-radeon-ai-pro-r9700-will-come-with-32gb-gddr6-memory) ·
  [HWBusters: RTX 5080 pricing](https://hwbusters.com/news/an-rtx-5080-now-costs-more-than-an-rtx-5090-did-at-launch/)
