# Contract: the worker/judge conversation seam (`#workers`)

**Spec**: FR-001 … FR-014, FR-030 … FR-032, FR-045 … FR-046 · **PRD**: WORK-1, WORK-3, WORK-4, WORK-5 · **Research**: R1, R3, R4, R5, R6, R7

Types and signatures only, in KILN's terms. `packages/workers/` is the **only** package that imports `@earendil-works/pi-ai`'s request surface (`stream`/`complete`, `createModels`/`setProvider`) — enforced by `kiln check boundaries`, extended for this row. Everything in `packages/durable/src/tasks/unit.ts` calls through this seam and nothing else.

## Opening a turn

```ts
interface TurnInput {
  unit: TaskId;
  role: string;                         // a key into the provisional roster (data-model.md §1)
  inputs: ArtifactRef[];                // the step's explicit, recorded inputs (spec FR-002) — never free text
  checkpoint: UnitCheckpoint;            // the unit's current checkpoint (data-model.md §3); toolCalls, if any, drive resume behaviour
  signal: AbortSignal;                   // composed with the factory's own close signal (unit.ts already has this)
}
type TurnResult =
  | { kind: "continue"; checkpoint: UnitCheckpoint }   // more turns needed; unit.ts re-invokes runTurn with the new checkpoint
  | { kind: "done"; result: UnitResult };               // the step's real artifact — replaces the sleep stand-in's {label, results}

function runTurn(input: TurnInput): Promise<TurnResult>;   // throws GenerationTimeoutError on the role's tier timeout (R6); never swallows an abort
```

`runTurn` is the **only** function `unit.ts`'s `work` phase calls in place of today's `sleep(stepMs)`. It does not acquire or release the lane itself — `unit.ts` still does that around the call, exactly as it does today, because the lease boundary (one lease per step, released on every exit path) is already proven and this row does not re-derive it.

## Role binding (constitution II, FR-030/FR-031)

```ts
function bindConversationRole(role: string, roster: ProvisionalRoster): RoleEntry;
```

Throws `TierPolicyError` (the existing error from `contracts/src/roles.ts`, re-thrown unchanged) when the role is a judge and the roster's tier for it is not `strongest` — before `runTurn` makes any `pi-ai` call. A judge whose strongest model cannot be made resident (the residency manager's `load()` rejects) surfaces as the step waiting, named by reason, from `requestThroughLane` (residency-manager.md) — `runTurn` propagates that rejection, it does not catch and retry with a different model.

## Tool offering and classification (FR-005, FR-010)

```ts
function toolsFor(role: string, roster: ProvisionalRoster): ToolDecl[];   // looks up roster.tools, resolves each name against tools.ts's declared set
```

Throws a named configuration error if a role names a tool `tools.ts` does not declare — caught at conversation-open time, never discovered mid-generation. The conversation is offered **exactly** this list as `pi-ai`'s `Context.tools`; nothing instructs the model to avoid an un-offered tool, because it is never offered one (FR-005).

## The interruption notice (FR-012, FR-013, R5)

```ts
function buildInterruptionNotice(toolCalls: UnitCheckpoint["toolCalls"]): InterruptionNotice;   // pure function of the checkpoint (data-model.md §4)
```

Called by `runTurn` exactly once, on the **first** turn of a resumed step that has a non-empty `toolCalls` log; its result is prepended to the conversation before any further model call. A step resuming with an empty `toolCalls` log takes no special path (spec Edge Cases: "no interruption notice is needed or given").

## Readiness refusal (FR-040, FR-041)

```ts
function requireCapability(model: Model<"openai-completions">, need: "toolCalling" | "streaming", readiness: Readiness): void;
```

Throws a named `CapabilityRefused` error, naming the missing capability, before `runTurn` opens the conversation — never discovered by the conversation failing partway through.
