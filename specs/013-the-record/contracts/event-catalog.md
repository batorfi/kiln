# Contract: the event, the catalog, and appending (FR-001…FR-023)

## 1. `appendEvent(tx, draft)` (the only way an event is written)

```ts
appendEvent(tx: Tx, draft: {
  type: string;                 // a catalog type
  subject: string;
  actor: string;                // grammar: data-model §1
  causation: string;            // "cmd:<key>" | "evt:<seq>"
  data: unknown;                // validated against the type's CURRENT schema
  time?: string;                // default: the services clock, read once per call
  correlation?: string | null;  // default: derived from `subject`
  privacy?: "public" | "internal" | "sensitive";   // default: the type's class
}): Promise<Event>
```

- Runs **inside the caller's commit**. It reads and rewrites `kiln.record/head` and the last `kiln.event` chunk (and `run:<feature>` when a correlation is set) — constant work per call.
- Validation order and the **named refusals** (an `EventRejected` thrown inside the commit rolls the commit back; the caller's state does not change):

| Code | Rule |
|---|---|
| `event-type-unknown` | the type is not in the catalog (FR-012, FR-013) |
| `event-version-unknown` | the draft names a version other than the current one |
| `event-data-invalid` | the data does not validate against the schema (`path`, `message`) |
| `event-field-forbidden` | a key in `data` is in the forbidden set (data-model §1) |
| `event-actor-invalid` | no actor, or it does not match the grammar |
| `event-cause-missing` | no causation |
| `event-subject-invalid` | an empty subject, or a gate subject that is not a gate id |
| `event-time-invalid` | not an ISO instant |

- FR-014: `gate.settled` requires `decidedBy` and `move`; `move.committed` requires `decidedBy` and `kind`; there is no draft shape that settles a gate without a decider.
- `appendOutbox` (r13/r14) is removed; its twelve call sites call `appendEvent` (research R11 adds the unit and command call sites).

## 2. The catalog (contracts/src/events)

```ts
interface CatalogEntry { type: string; current: number; versions: { [n: number]: JsonSchema }; privacy: Privacy; emitted: boolean;
                         upcast?: { [fromVersion: number]: (e: Event, ctx: Ctx) => Event } }
interface Ctx { digest(text: string): string }
catalog: ReadonlyMap<string, CatalogEntry>;
```

- Schemas are JSON Schema (the subset `record/validate-core` supports), written as data in `contracts` and exported also as `schemas/events/<type>.<n>.json` by a generator that `kiln check record` keeps equal.
- Rules enforced by `kiln check record` (check-record.md): every `emitted` type is committed by some source file, and every type the source commits is in the catalog; every version has its upcaster to the next; the catalog's list equals the committed list in `data-model.md §2`.

## 3. Reading (R7, R13)

```ts
readRecord(src: Tx | Store | Reader, range?: { from?: number; to?: number }): AsyncIterable<Event>
readRun(src, feature: string): AsyncIterable<Event>
```

- Yields **current-version** events in sequence order: v0 entries from `kiln.outbox/main` (up to `legacyThrough`) upcast on the way, then chunks. Never writes.
- Errors: `EventVersionUnknown{type, version}` for a stored `schema` newer than the catalog's current; a v0 entry of an unknown type yields a `record.unknown` event.
- `Inspection.outbox` and `WalkView.history` are a **compat view** (`type, subject, at, actor, cause, data, seq`) of these events.

## 4. Version 0 → 1: per-type mapping

| v0 type | v1 `data` | Dropped / replaced |
|---|---|---|
| `gate.opened` | `{briefRef, gateKey, flow: "v2"?, round}` (`flow`/`round` read from the gate id and gate document when present, else omitted) | — |
| `move.committed` | `{kind, briefRef?, scope?, target?, decidedBy: <actor>}` | — |
| `gate.settled` | `{key, move, decidedBy}` — `move` and `decidedBy` come from the entry's sibling `move.committed` (see the note below) | — |
| `gate.withdrawn` | `{target, noteRef, noteDigest}` | `note` text |
| `gate.not-applicable`, `gate.became-applicable` | `{gate, reason: {rule, evaluated, verdict}}` | `reason.text` |
| `gate.skipped` | `{gate, reasoningRef, reasoningDigest}` | `reasoning` text |
| `walk.admitted` | unchanged fields | — |
| `walk.returned` | `{…, noteRef, noteDigest}` | `note` text |
| `walk.split` | `{from, remainderRef, remainderDigest}` | `remainder` text |
| `walk.left-lane`, `walk.not-admitted` | `{…, noteRef, noteDigest}` | `note` text |
| `walk.completed`, `walk.fix-round`, `lane.*` | unchanged fields | — |
| `walk.move-ignored` (r14-review) | `{target, noteRef, noteDigest, why}` | `note`, `because` text |
| any other | `record.unknown/1 {originalType, digest}` | the entry's data |

**Note on `gate.settled`.** A version 0 settled entry holds only the move key. The current schema also wants `move` and `decidedBy` (FR-014). The upcaster takes them from the entry's own **sibling** `move.committed` entry (same subject, same cause key, earlier sequence) — the reader has the whole stream, so the upcaster is given `ctx.siblings`; it is still a pure function of its inputs. If the sibling is absent (a truncated stream) the read fails `event-sibling-missing`, naming the entry.

## 5. Test obligations

- Every type in the catalog has a valid example and at least one invalid example per schema rule; every `E` type is produced by a real code path in a walk test.
- Upcast tests: for each v0 type, a stored sample from an r14 store; `downcast(upcast(e))` recovers every admitted field; the dropped fields are exactly §4's.
- The negative suite for `appendEvent` (check-record.md §3).
