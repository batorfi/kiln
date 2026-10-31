# Data model: Real local workers (row r16)

Entities of the spec, made concrete. Types are TypeScript-shaped for precision; they are JSON in the store where they persist. Decisions are in [research.md](./research.md) (R-numbers). This row **extends** `kiln.lane` and `UnitCheckpoint` (r13); it introduces no new document *family* beyond the lane's own residency fields and the unit's tool-call log.

## 1. The role roster entry (R7) — provisional, in-process only

```ts
interface RoleEntry {
  tier: "strongest" | "standard" | "cheap" | "per-task";  // fed to contracts/src/roles.ts, unchanged
  tools: string[];                                         // names declared in tools.ts (§2); unknown name = config error
  judge: boolean;                                           // feeds isJudge()
  timeoutMs: number;                                        // R6 — per-tier generation timeout
}
type ProvisionalRoster = Record<string, RoleEntry>;          // role name -> entry; NOT persisted — in-process constant, replaced wholesale by r17
```

Not a document: this table lives in code (`packages/workers/src/roster.ts`), never in the store, because it is explicitly provisional (spec Assumptions) and r17 replaces the whole module, not a row in a table.

## 2. The tool (R4, R7)

```ts
interface ToolDecl {
  name: string;                 // "read-file" | "write-file" (this row's minimal set, spec Clarification)
  replaySafe: boolean;           // true: read-file. false: write-file.
  schema: JSONSchema;             // arguments shape, passed to pi-ai's Tool declaration
  run(args: JsonObject, ctx: { workspace: string }): Promise<{ content: string; isError: boolean }>;
}
```

`replaySafe` is declared once per tool (FR-010) — never inferred from the tool's name or from what it happened to do on a given call. Both tools this row ships are scoped to the feature's own workspace directory (the per-factory worktree, assumed already provided — spec Assumptions); neither is a shell/command tool and neither can open a conversation (WORK-3, FR-003).

## 3. The unit checkpoint — extended (R3, R4)

```ts
// r13's shape (unchanged fields in plain text; new field in bold via comment)
interface UnitCheckpoint {
  phase: "work";
  done: number;
  results: string[];
  started?: true;
  toolCalls?: Array<{                 // NEW (r16) — only present for a unit whose role performs real work
    id: string;                        // pi-ai's ToolCall.id
    name: string;
    arguments: JsonObject;
    replaySafe: boolean;               // from ToolDecl.replaySafe at the time the call was made
    executed: true;                    // always true once logged — a call is only ever logged after it ran
  }>;
}
```

Appended to `toolCalls` **in the same commit** as the tool's result is recorded (not a separate commit, not after the fact) — the same "an entry and the state it records are never apart" discipline r13/r15 already hold for every other append in this task kind. A unit's `work` phase that is still scripted (no real role, r13/r14's existing scripted units) never populates `toolCalls`; its shape is unchanged.

## 4. The interruption notice (R5)

```ts
interface InterruptionNotice {
  // Not a persisted type: assembled on resume, in-memory, from UnitCheckpoint.toolCalls, then
  // injected as the first message of the resumed conversation's turn (exact pi-ai Message
  // variant — UserMessage vs. a per-call ToolResultMessage — confirmed at implementation, R5).
  lines: Array<{ name: string; arguments: JsonObject; alreadyExecuted: boolean }>;
}
```

`alreadyExecuted` is `true` exactly for entries where `replaySafe === false`; every line is included (both replay-safe and not), because the model should see its own full prior history either way — only the *instruction* differs per line (R5's rendered text).

## 5. The lane document — extended with real residency (R8, R9, R10)

```ts
// r13's shape (unchanged fields in plain text; new fields via comment)
interface LaneDoc {
  resident: string | null;    // UNCHANGED SHAPE, CHANGED MEANING: now the model the residency manager actually
                                // loaded on Ollama, not merely a name a lease-holder asserted
  hold: boolean;
  swaps: number;
  lease: { holder: TaskId; since: number } | null;
  pin?: string | null;         // NEW (r16) — FR-024: a model pinned for judges, visible, not implicit
  budgetBytes?: number;        // NEW (r16) — FR-025: the configured per-host memory budget
}
```

No new document family: `kiln.lane/main` gains two optional fields. `LaneApi`'s public surface (`acquire`/`release`/`start`) is **unchanged**; the residency manager sits *behind* `acquire` — when `acquire({model, ...})` names a model that isn't resident, the grant path (today: just records the name) now also calls the residency manager's `load()` before granting the lease, and `release()` may trigger an `unload()` when nothing else wants the model and it isn't pinned.

## 6. Readiness result (R8) — not persisted, re-checked at use

```ts
interface Readiness {
  toolCalling: boolean;
  streaming: boolean;
  usageAccounting: boolean;   // CAPABILITY ONLY (Clarification 2) — no token/cost figures recorded anywhere by this row
  contextWindow: number;       // read from the Model entry's static field, not probed
}
```

Deliberately not stored: FR-042 requires a re-check at the moment of actual use, so caching this across time would reintroduce exactly the staleness the spec's Edge Cases warn against. A probe's result is held only for the duration of the acquire call that triggered it.

## 7. The KILN provider request (R9)

```ts
interface ProviderRequest<T> {
  step: TaskId;                              // whose lease this call must hold (or share, if the step is compaction/housekeeping)
  requiredTier: Tier;                         // from the role (R7) or, for housekeeping, a fixed "standard"
  call(model: Model<"openai-completions">): Promise<T>;   // the actual pi-ai request, e.g. models.complete(model, context)
}
```

Not persisted — an in-process call shape. Its *effects* (a swap, a load) are what get recorded, via the existing `lane.acquired`/`lane.swapped` events (r13) and the newly-emitted `lane.transition` (r15's catalog, R-below).

## 8. Events — no new types, one newly emitted

The r15 catalog already declares everything this row needs:

| Type | Status before r16 | Status after r16 |
|---|---|---|
| `unit.started` / `unit.settled` / `unit.failed` / `unit.aborted` | emitted (scripted) | emitted, same shape, now for real generations too — **no schema change** |
| `lane.acquired` / `lane.released` / `lane.swapped` | emitted (scripted lease bookkeeping) | emitted, same shape, now reflecting real loads/unloads too |
| `lane.transition` (`kind: load\|hold\|yield\|swap`) | **declared, never emitted** (r15 R-notes named r16 as the row that would) | **emitted** for every real load, hold, yield and swap (FR-027) |
| `lane.cost-recorded` | emitted (`switches`, `wallClock`) | **unchanged** — Clarification 2: no token/cost fields added this row |

No event schema gains a field and no new type is added; `kiln check record`'s catalog check needs no update for this row.

## 9. The provisional boundary edge (R2)

`checks/boundaries.json` gains: `workers → durable, contracts, lane` (new) and `durable → workers` (new, for `unit.ts`'s work phase). `lane` does **not** gain an import of `workers` — the dependency runs the other way (R2, R9). The existing `lane → durable, contracts` and `durable → contracts, record` edges are unchanged.
