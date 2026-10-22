> Status: concept — **research snapshot and proposal** (2026-10-22). Router features and fees change often; re-check
> before relying on a number. The integration options in §6 are **proposals** for the `kiln-v1.x` row *Models beyond the
> machine* (r33) — nothing here is decided. One recommendation (§5.6, Ollama `:cloud` tags) also concerns `kiln-v1`.
> Type: concept (research)
>
> Scope note: this doc looks at **LLM routers and gateways** — OpenRouter above all, and the self-hosted and hosted
> gateways around it — and asks how, and whether, a KILN factory could use one without weakening its rules. It builds on
> the model landscape and on the design for non-local models.
>
> Companion docs:
>   - The model landscape and scenarios: `model-landscape.md` (S6, hybrid)
>   - Models beyond the machine:         `web-front-door.md` §13
>   - Configuration (catalog, tier map): `configuration.md`
>   - The rules:                         `../../.specify/memory/constitution.md` (II, VII, VIII)

# KILN — LLM routers and gateways

## 1. In one paragraph

A **router** puts many models from many providers behind one API and one key, and can choose a provider — or even a
model — for each request. **OpenRouter** is the best-known: one OpenAI-compatible endpoint for hundreds of models, no
markup on inference, provider routing controls, zero-data-retention routing, and automatic fallbacks. That convenience
is exactly what KILN's rules are wary of: a router that silently picks a different model breaks "judges on the strongest
model, never silently downgraded" (II); one that silently picks a different provider changes where data goes (VIII);
and both blur what the record must say (VII). The proposal is therefore: **routers are allowed as a provider, but always
pinned** — a fixed model, a fixed provider list, no automatic fallbacks for judges, data-collection off, and the model
actually served recorded on every request.

## 2. Kinds of router

| Kind | Examples | Where it runs | What it gives a team |
|---|---|---|---|
| **Hosted router / marketplace** | **OpenRouter** | the vendor's cloud | hundreds of models, one key, one bill; provider routing and fallbacks; data-policy routing |
| **Hosted gateway** | Vercel AI Gateway, Cloudflare AI Gateway, Portkey (managed) | the vendor's cloud or edge | one endpoint in front of your own provider accounts; caching, logs, budgets |
| **Self-hosted gateway** | **LiteLLM** (MIT), Portkey (open source), Helicone (Apache-2.0), Kong AI Gateway | your machine or server | central keys, budgets and logs under your control; nothing new leaves your network |
| **A local runtime with cloud models** | **Ollama `:cloud` tags** | Ollama's cloud, reached through the Ollama tools | larger models without the hardware — but inference is **remote** |
| **Direct provider APIs** | Anthropic, OpenAI, Google, Mistral, Together, Groq… | the provider | the simplest chain of custody: one provider, one contract |

KILN's model layer, `pi-ai`, already lists **OpenRouter** among its providers and reaches **OpenAI-compatible** endpoints
(Ollama, LiteLLM and most gateways) generically — so no new integration library is needed for any of these.

## 3. OpenRouter in detail

### 3.1 What it offers

- **One OpenAI-compatible API** for hundreds of models and providers; requests and responses are normalised across them.
- **Pricing.** No markup on inference — provider list prices are passed through. A fee applies when **buying credits**:
  5.5% on the Standard (pay-as-you-go) plan, 8% on Business. **Bring your own key (BYOK)**: free up to $25,000 a month of
  list-price inference, then 5% of what the request would cost on OpenRouter.
- **Logging.** Request metadata (time, model, token counts) is logged; prompts and completions are **not** logged unless
  you opt in.
- **Plans.** Free (25+ free models, 50 requests a day), Standard, Business (adds EU and US in-region routing, a signed
  DPA on request), Enterprise (SSO, managed policy enforcement, private endpoints).

### 3.2 Controls a KILN integration would use

**Provider routing** — the `provider` object on each request:

| Parameter | What it does | KILN use |
|---|---|---|
| `only` | allow only these provider slugs | **pin** the providers a policy has approved |
| `order` | try these providers in order | prefer a provider, within `only` |
| `allow_fallbacks` (default `true`) | when `false`, never route beyond your list | **always `false`** |
| `data_collection` (`allow` default / `deny`) | `deny` routes only to providers that do not collect data | **always `deny`** |
| `zdr` | route only to zero-data-retention endpoints | **`true`** where policy requires it |
| `require_parameters` | route only to providers that support every parameter sent | **`true`** — tool calling must be honoured, not dropped |
| `quantizations` | filter by precision (`fp8`, `int8`, `int4`…) | pin precision for judges, so "strongest" means the same weights every time |
| `max_price` | refuse providers above a price ceiling | a second guard under KILN's budgets |
| `sort` | by price, throughput or latency | only within the pinned list |

**Model routing** — features KILN should **not** use for judges:

- `models: [...]` with `route: "fallback"` — try another model if the first fails.
- `openrouter/auto` — let OpenRouter choose the model.
- Suffixes `:nitro` (fastest provider), `:floor` (cheapest), `:free` (free variants with low limits).

**What comes back.** The response's `model` field names the model that handled the request — and the docs warn it may
differ from the one requested. `usage` includes token counts and **cost**. `GET /api/v1/generation?id=…` returns the
generation's stats after the fact. The response itself has no provider field, so recording *which provider served a
request* needs the generation stats.

### 3.3 Things to know

- With **BYOK**, one analysis reports that a failing key **falls back to OpenRouter's own account** by default — traffic
  leaves your contracted provider account unless a request-level setting prevents it. Verify before relying on BYOK for
  contractual reasons.
- **Free models** have low rate limits (50 a day, or 1,000 with purchased credits) and are not suited to factory work.
- The BYOK allowance has changed during 2026 (a request-based allowance was retired); re-check the live terms.

## 4. The other gateways, briefly

- **LiteLLM** — the default open-source, self-hosted gateway (MIT): one OpenAI-compatible endpoint in front of many
  providers, with keys, budgets and logs in your own infrastructure. Enterprise governance (SSO, RBAC, team budgets)
  needs a paid licence; its Python proxy can bottleneck at high concurrency — not a concern at KILN's one generation per
  factory.
- **Portkey** — managed or self-hosted; routing, fallbacks, logs, tracing and guardrails.
- **Vercel AI Gateway** — managed, no markup on provider prices, tied to a Vercel team.
- **Cloudflare AI Gateway** — managed at Cloudflare's edge with a free tier; caching is a core feature; not
  self-hostable.
- **Helicone, Kong** — open-source cores, focused on observability and API management.

Vendor comparisons of these gateways are mostly written by competitors; treat rankings with caution.

## 5. How KILN's rules shape router use

### 5.1 Judges: no automatic model choice (Principle II)

A judge must run on the **strongest model available to the factory** and is **never silently downgraded**. Auto-routing
(`openrouter/auto`), model fallback lists and price-sorted suffixes all let something other than the factory's
configuration choose the model. **Proposed rule:** a judge's binding through a router names **one model**, pins its
providers with `only` and `allow_fallbacks: false`, and pins precision; if that model is unavailable, the judged step
**waits and says why**, as it does locally.

### 5.2 Workers: fallback only by policy (MOD-5)

The PRD already allows a work role to fall back **only if the policy names the fallback**. A router's fallback list can
implement that — but the list must come from the factory's policy, not the router's defaults, and each fallback that
fires is a recorded event (`model.fallback`), never silent.

### 5.3 Where data goes (Principle VIII)

A router adds a **third party** to the chain: KILN → router → provider. Under a factory's egress policy:

- the router itself is a destination that must be allowed, with its terms in the catalog's *data handling*;
- the **providers** behind it are pinned (`only`), with `data_collection: deny` and, where required, `zdr: true`;
- region pinning (OpenRouter Business, EU/US in-region routing) where the policy names a region;
- KILN's egress check — secrets scan, redaction, path rules — runs **before** the request reaches the router. The router
  is never the policy engine; KILN is.

### 5.4 What the record must say (Principle VII)

Every request through a router records the **requested** model, the **served** model (the response's `model`), the
**provider** (from the generation stats), the generation id, tokens and **cost**. **Proposed rule:** if the served model
differs from the requested one on a judge's request, that is a **broken-guarantee signal** — critical, recorded — and the
verdict is not used.

### 5.5 Budgets (MOD-5)

`usage.cost` on every response makes per-request spend exact; KILN's budgets pause the lane when a budget is reached.
`max_price` can be set as a second, router-side guard — never as the primary one.

### 5.6 Ollama `:cloud` tags look local but are not (`kiln-v1`)

Ollama offers **cloud models** — tags such as `gemma4:cloud` or `gpt-oss:120b-cloud` — that run in Ollama's cloud while
being named and managed like local models. For KILN this is a trap: a tier map that binds a `:cloud` tag would send code
and prompts off the machine under a profile that promises `local-only`. **Proposed for `kiln-v1`** (r17 catalog, r28
`kiln doctor`):

- the catalog records any `:cloud` or `-cloud` tag as locality **`remote`**, so `kiln check config` refuses it under
  `local-only`;
- `kiln doctor` checks whether Ollama's cloud features are enabled and recommends disabling them on local-only hosts
  (Ollama allows this);
- the per-host network check's allowlist excludes `ollama.com`, so a missed case still fails by name.

## 6. Integration options (proposals for r33)

| Option | How it works | Fits KILN when | Trade-offs |
|---|---|---|---|
| **A. Direct providers** (the default) | `pi-ai` provider entries per vendor (Anthropic, OpenAI, Google…) | most factories; the simplest audit | one key and contract per vendor |
| **B. OpenRouter as a provider** | one catalog entry per *model + pinned provider list*; KILN sends the `provider` object on every request and reads cost and served model back | a team that wants many models or open-weight models hosted by others, under one key and bill | a third party in the chain; fees on credit purchases; provider identity needs a second call |
| **C. A team-run gateway** (LiteLLM or Portkey, self-hosted) | an OpenAI-compatible provider entry pointing at the team's gateway, with its routing pinned per model | a team that already centralises keys, budgets and logs; later, team servers (r37) | another service to run; KILN must still record per request, and the gateway's own fallbacks must be off |
| **D. A hosted gateway** (Vercel, Cloudflare) | as C, but managed | a team already on that platform | as B; less model breadth than OpenRouter |

What none of the options may do: **choose a judge's model**, fall back without a policy naming the fallback, send data
anywhere the policy has not allowed, or leave a request unrecorded.

### An illustrative binding

```yaml
# kiln.config/ — illustrative only; the real schema is decided in r33
providers:
  openrouter:
    kind: openrouter                 # via pi-ai
    credentials: os-keychain:openrouter
    data_handling: { prompts_logged: false, region: eu }   # Business plan, in-region routing

models:
  claude-opus-5-5@openrouter:
    provider: openrouter
    model: anthropic/claude-opus-5.5
    family: claude
    locality: remote
    routing:                          # sent as OpenRouter's `provider` object on every request
      only: [anthropic]
      allow_fallbacks: false
      data_collection: deny
      zdr: true
      require_parameters: true

tiers:
  worker: qwen3.6:35b                 # local
  code-reviewer: claude-opus-5-5@openrouter   # remote judge; cross-family with a Qwen worker
```

## 7. Open questions

These belong to r33's open decisions (egress policy language, model-family identity), and are listed in
[`open-decisions.md`](./open-decisions.md):

1. Does r33 support routers at all, or only direct providers first?
2. May a router's model fallback ever be used for a **work** role, if the policy names it — or only provider fallback
   within one model?
3. Is a second request for provider identity (generation stats) acceptable on every call, or only sampled for workers
   and always for judges?
4. Should the `:cloud` safeguards of §5.6 land in `kiln-v1` (r17, r28)? This doc recommends yes.

## 8. Sources

Retrieved 2026-10-22.

- OpenRouter — [provider routing](https://openrouter.ai/docs/features/provider-routing) ·
  [API overview](https://openrouter.ai/docs/api-reference/overview) · [FAQ](https://openrouter.ai/docs/faq) ·
  [pricing](https://openrouter.ai/pricing)
- OpenRouter analyses — [TrueFoundry: BYOK explained](https://www.truefoundry.com/blog/openrouter-byok-explained-cheaper-often-faster-and-changing) ·
  [Capital & Compute](https://capitalandcompute.net/blog/openrouter-ai/) ·
  [Developers Digest](https://www.developersdigest.tech/llm-gateways/openrouter) ·
  [FutureAGI: what is OpenRouter](https://futureagi.com/blog/what-is-openrouter-2026/)
- `pi-ai` and Pi providers — [pi-ai README](https://cdn.jsdelivr.net/npm/@earendil-works/pi-ai@0.79.1/README.md) ·
  [pi coding agent providers](https://unpkg.com/@earendil-works/pi-coding-agent@0.83.0/docs/providers.md) ·
  [pi.dev models](https://pi.dev/docs/latest/models)
- Ollama cloud — [docs.ollama.com/cloud](https://docs.ollama.com/cloud) · [Ollama library](https://ollama.com/library)
- Gateways — [Pinggy: routers and OpenRouter alternatives](https://pinggy.io/blog/best_ai_llm_routers_openrouter_alternatives/) ·
  [FutureAGI: best LLM gateways](https://futureagi.com/blog/best-llm-gateways-2026/) ·
  [Opper: best LLM gateways](https://opper.ai/blog/best-llm-gateways) ·
  [LLM Gateway: LiteLLM alternatives](https://llmgateway.io/blog/litellm-alternatives) ·
  [Maxim: LiteLLM alternatives](https://getmaxim.ai/articles/top-litellm-alternatives-in-2026/)
