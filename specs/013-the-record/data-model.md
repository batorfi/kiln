# Data model: The record (row r15)

Entities of the spec, made concrete. Types are TypeScript-shaped for precision; they are JSON in the store. Decisions are in [research.md](./research.md) (R-numbers).

## 1. The event (R3)

```ts
interface Event<D = unknown> {
  id: string;            // UUIDv7-shaped, DETERMINISTIC: f(time ms, seq). Sorts by (time, seq).
  seq: number;           // 1…N, gap-free, one writer
  type: string;          // a catalog name, e.g. "gate.settled"
  schema: string;        // "<type>/<version>", e.g. "gate.settled/1"
  time: string;          // ISO-8601 UTC, the clock of the commit that wrote it
  subject: string;       // what it is about: "gate:<f>:<key>:<n>" | "<feature>" | "lane" | "factory"
  actor: string;         // see grammar below
  correlation: string | null;   // "run:<feature>" or null
  causation: string;     // "cmd:<key>" | "evt:<seq>"
  trace: string | null;  // null until telemetry exists (r28)
  privacy: "public" | "internal" | "sensitive";
  data: D;               // facts and {ref,digest} pairs only; additionalProperties:false per schema
}
```

**Actor grammar** (`^(human@[A-Za-z0-9._-]+|director|system|factory|task:[0-9]+|role:[a-z-]+@[^\s]+|delegation:[^\s]+|script:[A-Za-z0-9._-]+)$`). A delegated approval has actor `delegation:<ref>` and is a different event from a person's move (constitution VI/VII).

**Content pair.** `{ref: string, digest: string}` — a locator and the SHA-256 (hex) of the text it names. Locators: `move:<gateId>#note` · `walk:<feature>/moves/<key>#note` · `row:<feature>#triage.reasoning`. A schema field of this shape is the **only** way text is mentioned (FR-006).

**Forbidden anywhere in `data`**: keys `prompt`, `answer`, `transcript`, `note`, `text`, `content`, `body`, `code`, and the first program's remote keys (`url`, `http`, `https`, `cloud`, `remote`, `endpoint`, `apiBase`, `baseUrl`, `externalUrl`).

## 2. The catalog (R4, R6, R11) — what exists after r15

`E` = emitted by r15 code · `S` = schema and tests only (behaviour belongs to a later row) · `L` = legacy-stream type (carried by the old walks; emitted by nothing now). Version 1 unless noted.

| Group | Type | Mark | Data (required unless `?`) | Privacy |
|---|---|---|---|---|
| gate | `gate.opened` | E | `briefRef`, `gateKey`, `flow`, `round` | internal |
| | `gate.waiting` | L | `gate`, `token`, `deadline` | internal |
| | `move.committed` | E | `kind`, `briefRef?`, `scope?` (`"feature"`), `target?`, `decidedBy` | internal |
| | `gate.settled` | E | `key`, `move`, `decidedBy`, `cost?` | internal |
| | `gate.withdrawn` | E | `target`, `noteRef`, `noteDigest` | internal |
| | `gate.not-applicable` | E | `gate`, `reason` {`rule`,`evaluated`,`verdict`} | internal |
| | `gate.became-applicable` | E | `gate`, `reason` | internal |
| | `gate.skipped` | E | `gate`, `reasoningRef`, `reasoningDigest` | internal |
| walk / row | `walk.admitted` | E | `gate`, `required[]`, `cap`, `overrideTriage`, `applicability{}`, `skipped[]` | internal |
| | `walk.returned` | E | `from`, `round?`, `kind`, `target`, `scope?`, `work?`, `recross[]`, `noteRef`, `noteDigest` | internal |
| | `walk.split` | E | `from`, `remainderRef`, `remainderDigest` | internal |
| | `walk.left-lane` | E | `from`, `round`, `noteRef`, `noteDigest` | internal |
| | `walk.not-admitted` | E | `gate`, `round`, `noteRef`, `noteDigest` | internal |
| | `walk.completed` | E | `approved[]` | internal |
| | `walk.move-ignored` | E | `target`, `noteRef`, `noteDigest`, `why` (enum) | internal |
| mitigation | `walk.fix-round` | E | `kind:"mitigate"`, `n`, `cap`, `verdict`, `pass` | internal |
| unit | `unit.queued` / `unit.started` / `unit.settled` / `unit.failed` / `unit.aborted` | E | `unit` (task id), `label`, `owner` | internal |
| lane | `lane.acquired` | E | `holder`, `model`, `hold` | internal |
| | `lane.swapped` | E | `from`, `to`, `swaps` | internal |
| | `lane.released` | E | `holder`, `reason?` | internal |
| | `lane.held` | L | `holder`, `reason?` | internal |
| | `lane.cost-recorded` | L | `switches`, `wallClock` | internal |
| roadmap | `roadmap.amended`, `roadmap-gate.decided` | S | `rowsDigest`, `decision` (`approve`\|`revise`\|`reject`\|`edit-rows`\|`add-row`\|`drop-row`), `by` | internal |
| delegation | `delegation.armed` | L, S | `of`, `by`, `at`, `reviewer?` | internal |
| command | `command.accepted` | E | `kind`, `requestHash` | internal |
| | `command.refused` | S | `kind`, `reason` | internal |
| feature | `feature.archived` | E | `archive`, `sha256`, `bytes`, `counts{}` | internal |
| | `transcript.aged-out` | S | `archive` | internal |
| experience | `charter.approved` / `charter.amended` | S | `version`, `digest`, `by` | internal |
| | `design-system.approved` / `design-system.amended` | S | `version`, `digest`, `by` | internal |
| system | `server.started` / `server.recovered` / `store.migrated` | S | `pid`-free facts only: `contract`, `libraryVersion` | internal |
| record | `record.unknown` | read-only | `originalType`, `digest` | internal |

Types for groups of later rows (tool approval, model, egress, wiki, host, bench, team) are **not** in the catalog (FR-012); adding one is a catalog change with a test (FR-015).

## 3. Storage (R2) — document families added

| Family | Key | Value | Written by |
|---|---|---|---|
| `kiln.event` | chunk number `n` | `{events: Event[]}` — events `256n+1…256n+256`, complete envelopes | `appendEvent`, same commit as the state |
| `kiln.record` | `head` | `{next, legacyThrough, lastAt}` — `next` the next sequence number; `legacyThrough` the last sequence number held in `kiln.outbox/main`; `lastAt` the newest event's time in ms (an event is never stamped earlier than it) | `appendEvent` |
| `kiln.record` | `run:<feature>` | `{seqs: number[]}` — the run's events | `appendEvent` when `correlation` is set |
| `kiln.cursor` | consumer name | `{seq, version, failed?: {seq, error}}` (`error` may be `cursor-ahead-of-head`) | the backbone |
| `kiln.projection` | `log:<feature>` | `{state, lines: string[], seq}` — the reducer state and the lines so far | consumer `factory-log` |
| `kiln.archive` | `<feature>` | `{archive, sha256, bytes, at, keys: Record<Key, string>}` — the marker FR-062 asks for | the archive task's commit |

`kiln.outbox/main` (r13/r14) is **read-only** from r15 on: new events never go there. A store with no `kiln.outbox/main` has `legacyThrough = 0`. `kiln.event/*` and `kiln.record/*` are created by the first append under the new owner. No store-contract bump: the contract guards the library version, not document names (r14 R14 reasoning); a test opens an r14-shaped store with the new owner.

## 4. Version 0 → version 1 (R7)

A stored entry without `schema` is version 0:

```ts
interface Entry0 { type: string; subject: string; at: number; actor: string; cause: string; data: unknown; seq: number }
```

| Field of the upcast Event | From |
|---|---|
| `id` | `uuid7(at, seq)` |
| `seq`, `type` | unchanged |
| `schema` | `"<type>/1"` |
| `time` | `new Date(at).toISOString()` |
| `subject` | unchanged |
| `actor` | unchanged (must match the grammar; a `script:` or `task:` or `factory` actor is already valid) |
| `correlation` | `run:<feature>` from the subject (`gate:<f>:…` → `f`; a bare feature name → itself; `lane` → `null`) |
| `causation` | `cmd:<cause>` |
| `trace` | `null` |
| `privacy` | the type's class |
| `data` | the type's mapping: structured facts copied; a content field replaced by `{…Ref, …Digest}` per R6; a rendered sentence dropped |

Per-type mapping table: `contracts/event-catalog.md` §4.

## 5. Consumer and cursor (R8)

```ts
interface Ctx { digest(text: string): string; siblings(seq: number, key: string): Event[] }   // for upcasters (research R7)
interface Consumer {
  name: string; version: number; from?: number;       // default 1
  mode: "transactional" | "effect";
  apply?(tx: Tx, batch: Event[]): Promise<void>;       // transactional: effect + cursor in ONE commit
  deliver?(batch: Event[]): Promise<void>;             // effect: at least once, idempotent
}
interface Cursor { seq: number; version: number; failed?: { seq: number; error: string } }
```

Lag = `head.next − 1 − cursor.seq`. A consumer whose `version` differs from its cursor's restarts from `from` with a fresh cursor (a projection's rebuild) — its old documents are overwritten from the first event.

## 6. Factory-log projection (R9)

State per run (`kiln.projection/log:<feature>`):

```ts
interface LogState { seq: number /* next line number, from 0 */; switches: number; firstTime: string | null; lastTime: string | null; flow?: "v1" | "v2" }
```

Lines are the first program's records, serialized as canonical JSON with the key order the first program wrote (`recordType, ts, seq, <payload>`), one per line, `\n`-terminated. The file is the join of `lines`.

## 7. Archive (R12)

```ts
interface ArchiveHeader { format: 1; feature: string; createdFrom: { headSeq: number }; docs: number; tasks: number; events: number }
// then, one canonical-JSON line each, in a fixed order:
//   {kind:"doc", name, key, value}       for gate, brief, move, walk, command documents of the feature
//   {kind:"task", id, kind, status, input, checkpoint, outcome}   for the feature's row, gate, decision and unit tasks
//   {kind:"event", event}                 the feature run's events (a COPY — the record keeps the originals)
//   {kind:"text", ref, digest, text}     every text a ref in the feature's events names
```

Checksum: SHA-256 of the file bytes. The file name carries the first 8 hex digits. `feature.archived.counts` = `{docs, tasks, events, texts}`.

## 8. Committed event streams (R10)

```
kiln/fixtures/walks/<name>.jsonl          the original factory-log, byte for byte
kiln/fixtures/walks/<name>.events.jsonl   the converted events, one canonical JSON per line (complete envelopes)
kiln/fixtures/walks/<name>.refs.json      { "<ref>": "<text>" } for any noteRef the stream holds
kiln/fixtures/walks/<name>.meta.json      { row, walker, options, originalSha256, eventsSha256, derivedBy, derivedAt, expect: "valid"|"R3" }
```

## 9. Oracle invariants added (R14)

| | Statement |
|---|---|
| **E1** | sequence numbers 1…N have no gap or repeat; `head.next = N+1`; each chunk holds exactly its range |
| **E2** | every event validates against the schema named in its `schema` |
| **E3** | every event has a matching-grammar actor and a causation |
| **E4** | for every run, the reducer over its events from 1 equals the live `lines` and the live file |
| **E5** | every cursor ≤ head; a transactional consumer's documents equal a fresh fold to its cursor |
| **E6** | archive: file present ⇔ verifies against `feature.archived.sha256`; `feature.archived` appears once per feature; tombstones present ⇔ the event is |
| **E7** | state ⇔ event: each gate document, move record, terminal unit, lane change, ledger entry and walk outcome has exactly its one event, and no such event lacks its state |
| W1–W4, I1–I10 | r13/r14's, unchanged |
