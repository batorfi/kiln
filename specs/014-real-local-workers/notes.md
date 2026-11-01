# Implementation notes: real local workers (row r16)

Working notes from T001 onward — decisions made during implementation that went beyond what `research.md`/`data-model.md`/`contracts/` had already settled, and why. Read alongside `tasks.md`'s own "Ground rules."

## T002 — inventory of call sites that change

- `durable/src/tasks/unit.ts`'s `work` phase: the `stepMs` stand-in (`await new Promise(...)` in a `setTimeout`) is what a real role's step replaces with a conversation turn. The surrounding checkpoint/commit/lane-acquire/release shape is unchanged (research R3).
- `lane/src/lane-task.ts`'s `grant()`/`release()`: today `grant()` only *records* a model name in `kiln.lane`'s document; it never calls anything that actually loads a model. T013 is where `residency.load()`/`unload()` get called from here.
- `lane/src/types.ts`'s `WorkUnit`: unchanged by this row — it is the pure affinity type, not the real conversation's input shape (that's `contracts/worker-conversation.md`'s `TurnInput`, a different, new type in `workers/`).
- `workers/kiln.json`: rewritten (T003) from "arrives with r16" to what this row actually gives it.

## T004 — a real cycle in the plan's boundary edges, corrected

`research.md` R2 and `data-model.md` §9 both state the new boundary edges as `durable → workers` **and** `workers → lane, durable, contracts`. Implemented literally, this is an actual cycle: `durable → workers → lane → durable` (`lane → durable` already exists from r13) — `checks/boundaries.ts` itself detects exactly this and fails the rule file by name (`boundary-rules-invalid`, "the layers form a cycle"). This is not a style nit; the checker is correct to refuse it; a two-way package dependency has no real direction.

**Correction made** (the smallest change consistent with the codebase's own existing pattern): apply the *same inversion r13 already uses for `durable`/`lane`* to `durable`/`workers`.

- `durable`'s allowed imports are **unchanged** (`["contracts", "record"]`) — it never imports `#workers/*` directly, exactly as it never imports `#lane/*` directly today.
- `workers`'s allowed imports become `["contracts", "record", "lane"]` — **not** `durable`. `contracts/worker-conversation.md`'s pseudocode shows `TurnInput.unit: TaskId`, but `TaskId` is defined in `durable/src/types.ts` as a bare `type TaskId = number`; importing it would re-create the cycle. `workers/` uses a plain `number` for a step's id instead (a locally-named alias is fine; importing the type is not).
- `unit.ts`'s `work` phase (T019, out of this phase's scope) will call a `runTurn`-shaped function through **a port on `Services`**, the same way it already calls `s.lane!.acquire(...)` through the `LaneApi` port `durable` defines but never imports the concrete implementation of. The concrete `workers/src/conversation.ts`'s `runTurn` is wired in by whoever composes the factory — see the next finding, because today **nothing does**.

`checks/boundaries.json` as committed in this phase: `durable: [contracts, record]` (unchanged), `lane: [contracts, record, durable]` (unchanged), `workers: [contracts, record, lane]` (the only new edge). Verified acyclic and all 84 of `checks/tests/boundaries.test.ts` + `boundaries-dependencies.test.ts` pass unmodified against it, including B1 (the real package tree) and B3 (`lane → workers` still correctly forbidden).

## A gap found while investigating T004, out of this phase's scope but blocking for later ones

**The production CLI never wires a lane into the factory at all today.** `packages/cli/src/gate-commands.ts`'s `ownerCommand` calls `startOwner({ store: f.store })` with no `lane` or `tasks` option. `createLane()` (which produces the `{api, kinds}` pair `openFactory` needs) is called only inside test harnesses (`durable/tests/proof/support/owner-main.ts` and lane's own tests) — never in `packages/cli/src/*`, never in any production `src/` file. This means a `needsLane: true` scripted unit run through the real `kiln owner` binary today would fail at `s.lane!.acquire(...)` (`s.lane` is `undefined`), not because of anything r16 changes — this is how r13/r14 already left it, and nothing before now has needed to run a real `kiln owner` process with a lane-dependent unit.

**Why this matters for r16**: `quickstart.md`'s scenarios and task T037 (US6, the full real walk) both assume `node packages/cli/src/main.ts owner --store $S` actually runs with a resident model and a real lane. **Before T037 can run for real, something — most likely `gate-commands.ts`'s `ownerCommand`, or a new composition module it calls — must construct `createLane()`'s `{api, kinds}` (and, once it exists, a `workers` port implementation) and pass them into `startOwner`'s options.** This also needs its own boundary edges (`cli → lane`, `cli → workers`) that do not exist yet — adding them is safe (no cycle: `cli` is not imported by anything).

**Not fixed in this phase** — out of scope for Setup/Foundational (T001–T014), which only needed the machinery to exist and be unit-tested in isolation, not wired into the real CLI process. Flagging here so whoever picks up T018 (`unit.ts`'s real call) or T036–T037 (the real walk) does not discover this mid-story. Recorded in `tasks.md` is not changed by this note; raising it here per the task's own instruction to record a judgment call rather than silently route around it.

## T006–T009 — roster, tools, provider

- `toolsFor`/`resolveTools` split (T006/T008): the undeclared-tool guard is its own function (`resolveTools`) so the test can exercise the real guard against a deliberately bad name, rather than re-implementing the check inline in the test (caught and fixed during review of my own first draft).
- `pi-ai`'s `createProvider({api: ...})` requires a `ProviderStreams`-shaped object (`{stream, streamSimple}`), **not** the bare `stream` function the `.d.ts` alone suggests — confirmed against `models.js`'s real validation (`input.api.stream` must itself be a function). `research.md` R1's sketch (`api: stream`) is corrected in `provider.ts` to `api: { stream, streamSimple }`.
- `provider.ts`'s `createOllamaProvider` registers an **empty static model catalog** on purpose: `Models.complete()`/`stream()` dispatch on the `Model` object the caller supplies (via `model.provider`), not on catalog membership, so `modelFor()` builds one per call instead of maintaining a list. Verified live: a real `models.complete()` call through the registered provider against `gemma4:12b` succeeds end to end (`packages/workers/tests/provider.test.ts`).

## T010 — the timeout utility

`withTierTimeout` is an explicit `Promise`-based race (listeners on both signals), not "pass a composed signal to `work` and trust it returns promptly" — a `work` that never checks its signal at all still gets timed out correctly, proven by a test whose `work` is `new Promise(() => {})` (never settles, never touches its signal).

## T011 — the residency manager

- Verified live against the real Ollama (0.35.1) before writing any code: `/api/generate` with no `prompt` and a `keep_alive` field loads or unloads a model without inference (`done_reason: "load"`/`"unload"`); `keep_alive: -1` gives an `expires_at` ~300 years out (Ollama's documented "never expire"); `keep_alive: 0` unloads at once, confirmed via `/api/ps` going empty. `/api/show`'s `model_info` carries context length under a key ending `.context_length` (e.g. `gemma4.context_length`) — confirmed live, used for the readiness probe's `contextWindow` instead of guessing a schema.
- `probe()` talks to Ollama directly (plain `fetch`, no `pi-ai`) — `lane/` has no seam to `pi-ai` and must not gain one (only `workers/` does, research R2/R9); the probe's round trip uses Ollama's OpenAI-compatible `/v1/chat/completions` endpoint directly, the same shape confirmed manually against this host before planning even started.
- **Deviation from T011's literal test wording, recorded here rather than silently changed**: the task text asks the live test to "wait past Ollama's un-pinned default expiry" (~5 minutes) and assert the model is still resident. Doing that literally would make every `npm run test:live-models` run take 5+ minutes for one assertion. Implemented instead: the live test spies on the real `/api/generate` request `load()` sends and asserts its body carries `keep_alive: -1` — the actual mechanism that *causes* "still resident after 5 minutes" to be true, verified directly rather than by waiting for the clock. The property under test (R11: load() pins keep_alive, so Ollama's own timer never applies) is proven; the 5-minute wall-clock wait is not. If a literal wait is wanted later, it belongs in the proof tier, not the default live-model tier.

## T012 — the KILN provider

`requestThroughLane` needed a way to know "does this step already hold the lease" that didn't exist — `LaneApi` had no such query. Added `holds?(step): boolean` as an **optional** method on the `LaneApi` port (`durable/src/types.ts`) and implemented it in `createLane()`'s real `api` object, reading the same in-memory `holder` variable `grant`/`pump` already trust (no wait, no commit — synchronous). Optional, so nothing else implementing `LaneApi` is broken (checked: only `lane-task.ts` implements it today). `requestThroughLane(lane, req)` is a plain function taking the `LaneApi` as a parameter — simpler than "resolving the resident model from the document," which turned out not to be needed: the caller already knows which model it asked to be resident, and passes a no-args `call()` closure built around that knowledge.

## T013 — a significant, confirmed correction to the spec/plan: `lane.transition` cannot be emitted

**Finding, not a judgment call — stop-and-report, then fixed the implementable part.** `research.md` R9/R10, `data-model.md` §8 and `tasks.md`'s own ground rules all state `lane.transition` is "declared [in r15's catalog], never emitted" and that this row is "the row that would finally emit it" (FR-027). This is **wrong**, confirmed against the real catalog:

```
packages/contracts/src/events/catalog/lane.ts:
  legacyEntry("lane.transition", obj({ kind: ..., from: str, to: str, reason: str }, ["kind"])),
  // the first program's residency changes and costs: read-only, they exist so its streams can be replayed
```

`legacyEntry` sets `legacy: true` and `committable: false`. `packages/durable/src/record/append.ts` refuses it outright: `event-type-read-only — "lane.transition represents the first program's streams: it can be read and replayed, never committed"`. This is deliberate, existing, tested machinery (byte-identical replay of r1–r8's old streams depends on legacy types staying exclusively legacy) — not a bug to route around. Confirmed by running the actual tests: every attempt to commit `lane.transition` from new code failed three existing `lane-task.test.ts` cases with exactly this error before I removed it.

**What this means for FR-027**: it is unsatisfiable as written. A real residency transition cannot be reported through the type the spec names, because that type is reserved for legacy replay. The two honest options are (a) add a genuinely new, non-legacy event type for real lane transitions — a real catalog change, with its own schema and `kiln check record` negative-suite coverage, which is more than this row's own "no new event type" ground rule allows without a human decision — or (b) accept that real transitions are visible through the already-real, already-committed `lane.acquired`/`lane.swapped`/`lane.released` events plus `kiln.lane`'s document fields, and strike FR-027's specific claim about `lane.transition`.

**What I actually did** (the implementable part, not blocked by this): `grant()` really calls `residency.load()` before granting a lease for a model not yet resident (a real HTTP call, proven live against Ollama); `release()` really calls `residency.unload()` unless the model is pinned (FR-024, also proven live). Neither emits `lane.transition`. The `kiln.lane` document gained `pin: string | null` and `budgetBytes: number | null` (plain document fields, not events — the "no new event type or field" ground rule is about the event catalog specifically, per `data-model.md` §8's own heading; `kiln.lane`'s document shape has grown with every row since r13 without a schema change each time). Proof that a real transition happened is the test suite's own spy on the (fake, for unit tests; real, for the one live test) `Residency` object's `load`/`unload` calls — not a new committed event.

**A trade-off this surfaced, worth flagging though not blocking**: `release()` unloads the model on every release unless pinned (tasks.md's own instruction, contracts/residency-manager.md's own wording). This means two consecutive units needing the *same* model, with nothing pinning it, pay a real unload-then-reload between them — the opposite of what model affinity (constitution IV, LANE-2) tries to achieve. It does **not** miscount as a swap (`doc.resident`'s value never changes across the cycle, confirmed by test), so FR-023's guarantee holds; it is purely an efficiency question for a later row (the host scheduler, LANE-4/r25, or a smarter "keep warm between affinity-adjacent units" policy) to improve, not something this row's acceptance criteria ask it to optimize.

**Decision needed before this row closes** (recommend surfacing to the user/Roadmap-adjacent review, not resolving unilaterally): what to do about FR-027 and the `lane.transition` sentence in `research.md`/`data-model.md`. I did not amend `spec.md` myself — that is a spec-level call, not an implementation judgment call.

## T014 checkpoint — one more real finding: `checks/network-allowlist.json`

`npm run check` caught `packages/lane/src/residency.ts`'s direct `fetch()` calls as `network-call ... outside the loopback allowlist []` — the allowlist (`checks/network-allowlist.json`) was empty (`"entries": []`) before this row. Added one entry for `residency.ts` (`loopbackOnly: true`), matching the check's own required shape (`path` relative to `kiln/`, a `reason`, `loopbackOnly: true`) — confirmed by reading `checks/network-lint.ts` directly rather than guessing the schema. `packages/workers/src/provider.ts` and `tests/live-gate.ts` were **not** flagged: `provider.ts` never calls `fetch` itself (it hands a `baseUrl` to `pi-ai`, which does the HTTP work inside its own dependency, invisible to this source-only static scan — not this check's concern, by design); `tests/live-gate.ts` lives under `kiln/tests/`, outside the check's scan roots (`packages/*`, `checks/`). Only a file with a *visible* `fetch(...)` call in scanned `src/` needed the allowlist.
