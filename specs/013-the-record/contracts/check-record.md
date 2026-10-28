# Contract: `kiln check record` (never vacuous) and its negative suite (FR-042, SC-002, SC-004, SC-006)

The fifth check (`network`, `boundaries`, `legacy`, `flow`, **`record`**). It imports `contracts` and `record` only: it never loads `durable` or the library.

## 1. What it examines

1. **The catalog**: every type has a current version with a schema; every version below current has an upcaster; no schema allows additional properties; no schema has a forbidden key; the generated `schemas/events/*.json` equal the catalog.
2. **The source against the catalog**: every type string passed to `appendEvent` in `kiln/packages` is in the catalog, and every catalog type marked `emitted` is passed by some file (a text scan, as the network lint scans).
3. **The committed walks**: for each stream in `kiln/fixtures/walks/`: the events validate; they replay to the original bytes; the validators' verdict equals `meta.expect` (`valid`, or `R3` for the stream kept because it fails); the stream rules of backbone-and-projection §4 hold.
4. **The upcasters**: for each registered upcaster, the committed v0 samples pass the lossless and pure tests.

## 2. Report

`PASS record — examined: <T> types, <S> source files, <W> of 5 named walks (<M> missing: <names, why>), <E> events`. **Fails** when: any of T, S, E is 0; W = 0; a committed walk's replay differs by one byte; or a walk the row names is neither replayed nor listed as missing with a reason (FR-050).

## 3. The negative suite (`checks/tests/record-negative.ts`)

Each member builds a mutated copy (JSON clone) of the catalog or a stream and must produce its **own** code and no unlisted one; a permissive check stub must fail the suite.

| Code | Member |
|---|---|
| `record-vacuous` | an empty catalog; a stream of zero events; zero walks |
| `catalog-schema-open` | a schema with `additionalProperties: true` |
| `catalog-forbidden-key` | a schema declaring `note` or `url` |
| `catalog-upcaster-missing` | a version 2 with no upcaster from 1 |
| `catalog-upcaster-lossy` | an upcaster that drops an admitted field |
| `catalog-upcaster-impure` | an upcaster that reads the clock (output differs on a second call) |
| `catalog-unknown-emitted` | source commits a type the catalog lacks |
| `catalog-dead-type` | a type marked emitted that no file commits |
| `stream-gap` | sequence 1,2,4 |
| `causation-chain-broken` | an `evt:<n>` pointing at no earlier event |
| `stream-time-backwards` | an event earlier than its predecessor |
| `stream-silent-approval` | `gate.settled` with a non-human decider and no delegation |
| `stream-delegation-merged` | a delegation folded into a person's move |
| `stream-content-key` | a `note` in an event's data |
| `stream-move-not-in-vocabulary` | a move kind the gate's flow does not offer |
| `replay-differs` | a converted stream altered by one byte |
| `replay-verdict-differs` | the broken walk converted so that it passes |
| `walk-missing-unexplained` | a named walk neither replayed nor listed |

Plus the commit-time suite for `appendEvent` (event-catalog.md §1, one member per code, each asserting **the state did not change**), run in the default tier from `durable`'s tests.
