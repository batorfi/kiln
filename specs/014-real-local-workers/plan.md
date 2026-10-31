# Implementation Plan: Real local workers (row r16)

**Branch**: `014-real-local-workers` | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-real-local-workers/spec.md`

## Summary

A unit's `work` phase stops faking its generation with `sleep(stepMs)` and makes a real, fresh conversation with a local model on Ollama, through `@earendil-works/pi-ai`'s `openai-completions` API (Ollama's OpenAI-compatible endpoint — pi-ai ships no dedicated Ollama provider). A new `packages/workers/` owns the one real call site: it registers Ollama as a `pi-ai` provider, holds a provisional role roster (tier, tools, judge flag), classifies each tool read-only or write/command, and assembles the structured interruption notice from a step's checkpoint after a kill. `packages/lane/` gains a residency manager that actually loads and unloads models on Ollama (today `resident` is just a name the lease-holder asserts) and a KILN provider wrapper that every model request — including the harness's own housekeeping — must go through. A per-tier timeout fails a hung step by name without ever touching its gate (constitution V). Nothing about the gate contract, the walk, or the record changes; `kiln.unit`'s checkpoint-then-commit discipline is extended, not replaced.

## Technical Context

**Language/Version**: TypeScript, Node `^22.19.0 || >=24.1.0` (unchanged from r15)

**Primary Dependencies**: `@earendil-works/pi-ai@1.4.0` (already pinned; r16 is the first row to register a real provider on it — `createModels()`/`MutableModels.setProvider()`, the `openai-completions` API, `Models.stream()`/`complete()`), Ollama (external process, reached only over loopback, not a project dependency)

**Storage**: unchanged — the existing `kiln.lane` document family (extended with real residency fields) and `kiln.unit` checkpoints (extended with a per-tool-call log); no new document family

**Testing**: `node tests/run.ts` (default + proof tiers, as r12–r15); a new live-model tier gated the same way the legacy suite gated on a measured Pi — skipped with a printed reason when Ollama or the pinned model is not installed, never silently passed

**Target Platform**: macOS (as the rest of the codebase), loopback-only

**Project Type**: single Node package tree (`kiln/packages/*`), systems/infrastructure feature — no UI

**Performance Goals**: not latency-bound by design; a step's generation is bounded only by its tier's timeout (Clarification 1), not by a fixed budget the way scripted steps were

**Constraints**: no new network port; no egress beyond loopback to Ollama (constitution VIII); every model request — including compaction — through one KILN provider holding the lane lease (LANE-3); a judge never binds weaker than `strongest` (constitution II)

**Scale/Scope**: one host, one factory (LANE-4 — several factories sharing a pool — is explicitly r25); a model pool within a configured memory budget

**pi-ai grounding (confirmed by reading the installed package, not assumed)**: pi-ai ships provider-specific APIs for Anthropic, OpenAI (completions, responses, codex), Azure, Bedrock, Google, Mistral, and a generic `pi-messages` API — **no dedicated Ollama provider**. Ollama's own OpenAI-compatible endpoint (`/v1`) is what `openai-completions` targets, so Ollama is registered as a `Provider<"openai-completions">` with `baseUrl: "http://127.0.0.1:<port>/v1"` and a placeholder `api_key` auth (Ollama does not check it; every provider still declares an auth type). `Context { systemPrompt?, messages: Message[], tools?: Tool[] }` is the conversation; `Message = SystemMessage | UserMessage | AssistantMessage | ToolResultMessage`; `ToolCall { type:"toolCall", id, name, arguments, argumentsError? }` is how the model asks for a tool; `Models.stream(model, context, options)` / `complete(...)` is the call. Full details: [research.md](./research.md) R1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

r16 is the first row that makes a real model call, so it is the first row several constitutional rules can actually be *violated* by a bug, not just stated. Evaluated against all twelve:

| Rule | On the hook? | How the design satisfies it |
|---|---|---|
| **I** Author/judge separation | No change | A worker's conversation and a judge's conversation are still different units (FR-001); a person still decides the gate (constitution I/V unchanged — Provenance). |
| **II** Judges on the strongest model | **Yes — newly real** | `bindRole`/`isJudge` (unchanged) refuse a judge tier other than `strongest`; FR-030/FR-031 make the *residency* request, not just the tier label, fail closed: if the strongest model can't be made resident, the judged step waits and names why — it never falls back (US4). |
| **III** One lane, sequential | No change | The existing `acquire`/`release` port (`createLane()`) is reused unmodified; a real generation still holds the lease exactly where the scripted stand-in did (`kiln.unit`'s `work` phase). |
| **IV** Model affinity | **Yes — newly real** | `affinity.ts`'s pure ordering logic (LANE-2, already built) is reused unmodified (FR-023); a swap is counted only on a genuine tier change, now against a *real* resident model, not an asserted name. |
| **V** A missing person never approves | **Yes — extended** | The new per-tier timeout (Clarification 1) fails a *step* by name; FR-008 is explicit that it must never settle the *gate* the step belonged to. The gate keeps waiting for a person exactly as it would after any other failed step — proven by the same kill-point style r13/r14 already use (SC-008). |
| **VI** Roadmap gate human-only | No change | Not touched by this row. |
| **VII** Everything recorded | **Yes — extended** | `lane.transition` (declared in r15's catalog, never emitted) is emitted for every real load/hold/yield/swap (FR-027); a step's checkpoint now records enough about tool calls to build the interruption notice (FR-013) — still committed atomically with the state it describes, never a separate write. |
| **VIII** Local by default | **Yes — newly real** | The residency manager and the KILN provider are the *only* path to Ollama, reached over loopback only (FR-020); a model loaded outside that path is a detected, always-critical broken guarantee (FR-026, OBS-5) — this is the row's hardest new egress-discipline claim, because r13–r15 never made an outbound call of any kind to verify against. |
| **IX** One committed state, no polling | No change | The backbone/consumer model from r15 is untouched; nothing new polls. |
| **X** Knowledge is context, never authority | N/A | No knowledge-base interaction in this row. |
| **XI** Factory is portable | No change | Residency state lives in the existing `kiln.lane` document; moving a factory (not built until r37) is unaffected by this row's additions. |
| **XII** Workshops are sovereign | N/A | Single-workshop scope; no team-space interaction. |

**Gate result: PASS.** No violation needs justification in Complexity Tracking. The two rules with real new exposure (II and VIII) are exactly the two the spec's User Stories 3 and 4 were written to prove, and V is why Clarification 1 (the timeout) was settled the way it was rather than left to plan-time improvisation.

*Re-checked after Phase 1 design below (post-design gate).*

## Project Structure

### Documentation (this feature)

```text
specs/014-real-local-workers/
├── plan.md              # this file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   ├── worker-conversation.md
│   └── residency-manager.md
└── tasks.md              # Phase 2 (/speckit-tasks — not produced here)
```

### Source Code (repository root)

```text
kiln/packages/
├── contracts/src/          # unchanged by this row except exporting Tier (already there)
├── record/                 # unchanged
├── durable/src/tasks/unit.ts   # work phase: sleep(stepMs) stand-in → real conversation call via #workers; same checkpoint/commit shape
├── lane/src/
│   ├── lane-task.ts         # extended: real load/unload through the residency manager; lane.transition now emitted
│   ├── residency.ts         # NEW — the residency manager: explicit load/unload, readiness probes, memory budget
│   └── kiln-provider.ts     # NEW — the one front for every model request; wraps pi-ai's Models, enforces lease + resident-model targeting
├── workers/                 # was a stub (kiln.json only) — this row gives it src/
│   └── src/
│       ├── roster.ts         # NEW — the provisional role → tier/tools/judge roster (Clarification: provisional, pre-r17)
│       ├── tools.ts           # NEW — the two hand-declared tools (read-file, write-file) + replay-safety classification
│       ├── conversation.ts    # NEW — opens a fresh pi-ai Context for a step, runs it to completion or interruption
│       └── provider.ts        # NEW — registers Ollama as a pi-ai Provider<"openai-completions">
└── cli/src/                 # unchanged; existing commands exercise the real path transparently
```

**Structure Decision**: extend three existing packages (`durable`, `lane`, `contracts` untouched) and give the already-declared `workers` package its first real content, per the existing import-map layering (`#workers` already exists in `kiln/package.json`'s `imports`). `checks/boundaries.json` already permits `lane → durable, contracts`; this row adds two edges: `durable → workers` (a unit's work phase calls into workers) and `workers → lane, durable, contracts` (to acquire/release the lease and reach the residency manager). `lane` does **not** import `workers` — the residency manager only loads/unloads a model name and runs readiness probes; it never opens a conversation (research R2).

## Complexity Tracking

*No Constitution Check violations to justify — table omitted.*

---

## Post-design Constitution Check (after Phase 1)

Re-evaluated against the finished `data-model.md` and `contracts/`:

- **II / VIII** (the two rules under real new exposure): the `contracts/residency-manager.md` seam makes "a model loaded outside KILN's path" mechanically detectable (it's the only writer of the `resident` field that is ever trusted — anything else is a reconciliation mismatch), and `contracts/worker-conversation.md` makes a judge's tier refusal happen before any `pi-ai` call is made, not after. Both hold under the design, not just in prose.
- **V**: the timeout's failure path (`unit.failed`, lane released) was checked against `kiln.unit`'s existing `abort` phase shape (data-model.md §4) — it reuses the same terminal-outcome mechanism the scripted stand-in's abort already has, so no new "a clock ends something" primitive was invented.
- **No new violation surfaced during design.** Gate result: **PASS**, unchanged from the pre-design check.
