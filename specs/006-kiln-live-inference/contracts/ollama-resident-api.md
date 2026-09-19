# Contract — the Ollama resident (E1)

**Trace**: FR-001..FR-004, FR-012 · P-I, P-II, P-VIII · [research.md](../research.md) D4, D5 ·
[data-model.md](../data-model.md) E1

## O1 — It implements r1's `Resident`, unchanged in role

```
makeOllamaResident(opts?: {
  model?: string;          // a plain name, e.g. "gemma4:12b" — never a URL (P-VIII)
  tier?: Tier;
  host?: string;           // default: OLLAMA_HOST ?? "127.0.0.1:11434" — MUST be loopback
  seed?: number;           // determinism (D4)
  temperature?: number;    // default 0
  numPredict?: number;     // bounded output
  timeoutMs?: number;      // bounded failure
}): Resident
```

**Rule**: it is a `Resident`, not a new abstraction. `model()` returns a name; `tier()` reports a
tier; `run()` returns the model's output. It **never decides a gate** (P-I) — the resident produces,
a human `decidedBy` or a distinct `pre-delegation` decides.

## O2 — The request (measured, not assumed)

```
POST http://<host>/api/chat
{ "model": <name>, "messages": [{"role":"user","content":<unit work>}],
  "stream": false, "think": false,
  "options": { "temperature": 0, "seed": <seed>, "num_predict": <bounded> } }
```

Visible reply read from `message.content`.

**`think: false` is mandatory.** Verified on `gemma4:12b`: `/api/generate` with `num_predict: 12`
returned `content: ''` (budget consumed by hidden reasoning); `/api/chat` with `think: false`
returned `'ready'`. A resident omitting it produces **empty work product with no error** — and since
`lane.ts` historically discarded the return value, nothing would notice.

**`stream: false`** keeps the resident a plain request/response. Streaming is available and
deliberately unused by this row.

## O3 — Failure modes, all named

| Condition | Required behaviour |
|---|---|
| Model absent from `/api/tags` | **Fail by name** at start-up. No silent substitution. Any stub fallback stays **recorded** (r3 `F-NOT-SILENT`). |
| Empty visible `content` | **Named fault.** Not accepted as work product (FR-003). |
| Host unreachable / non-2xx / timeout | Named failure or a durable `wait`. **Never** an indefinite block; **never** an auto-approved gate. |
| Host is not loopback | Rejected — by the resident and by the scan's loopback assertion (D6). |

## O4 — Output is captured, not discarded

**Rule**: the resolved work product must be **reachable by the walk**. `kiln/src/lane.ts:100`
currently calls `resident.run(unit);` as a bare statement and drops the result — which is why r3's
"real work product" claim was unobservable. r7 must not preserve that.

## O5 — What is recorded (P-VII), and what is not

**Recorded** — in r3's existing `transition.reason` slot, no new `recordType`:

```
resident selection → live model=<name> @ loopback (NC2-A: local, not cloud)
```

**Rules**:
- The location is **symbolic** (`@loopback`), not a raw address — a ledger reconstructs decisions, and
  `127.0.0.1:11434` is noise in that record.
- **No record may carry a forbidden R5 *key*** (`url`, `http`, `endpoint`, `baseUrl`, …). R5 scans
  keys, not values (D5), so this convention passes 001's **unmodified** `log.ts` — and a record that
  put the address in a `url:` key would still correctly fail.
- Both toggle positions record their selection, inherited from r3: an **unlogged** stand-in is the
  `F-NOT-SILENT` violation the probe catches.

## O6 — Prompt/response content stays out of the ledger

**Rule**: the factory-log records **that** a unit ran, on **which** resident, at what cost — not the
model's prompt or completion text. The log is an audit trail of decisions and transitions (P-VII), not
a transcript store. Work product flows to the walk (O4), not into the JSONL.
