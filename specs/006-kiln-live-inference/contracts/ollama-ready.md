# Contract — `OllamaReady` (E3) + the hardened P-VIII guard (E6)

**Trace**: FR-005..FR-008, FR-010, FR-011, FR-013 · P-V, P-VI, P-VIII · SC-002..SC-005, SC-007 ·
[research.md](../research.md) D6–D8

`OllamaReady` is the fourth probe in the chain `RuntimeReady → OverlayCReady → LiveModelReady →
**OllamaReady**`, and the **first that makes a real call**.

## R1 — Shape

```
checkOllamaReady(override?): Promise<{
  ready: boolean;
  skipped: boolean;
  skipReason?: string;      // REQUIRED when skipped
  checks: Check[];          // { name, ok, detail } — r1's Check, imported
  live: LiveModelReadyResult;   // the composed r3 probe
}>
```

CLI: `node kiln/validate/ollama-ready.ts [--no-endpoint | --no-model | --empty-visible | --stub-unlogged | --forged-live | --extra-loopback]`

## R2 — The checks, in order

| # | Check | Falsify hook | Names |
|---|---|---|---|
| a | endpoint answers (`GET /api/tags`, bounded timeout) | `--no-endpoint` | *endpoint unreachable* |
| b | the **named** model is present in `/api/tags` | `--no-model` | *the model name* |
| c | one round-trip returns **non-empty visible** content | `--empty-visible` | *empty visible output* |
| d | the selection is **recorded** (r3 `F-NOT-SILENT`) | `--stub-unlogged` | *unlogged stand-in* |
| e | a **fabricated** "live ran" marker with no round-trip is caught | `--forged-live` | *claimed, not performed* |
| f | hardened scan green **and** allowlist has exactly one entry | `--extra-loopback` | *the offending module* |

**Check (e) is what distinguishes r7 from r3.** `LiveModelReady` asserts the live path *exists and is
wired* — a deterministic adapter satisfies that. (c)+(e) together assert a call **happened** and
**returned model output**, which is the claim r3 could not make.

## R3 — Skip is never a pass

```
skipped === true  ⇒  ready === false  AND  skipReason is non-empty
```

**Rules**:
- When (a) or (b) fails, the probe **skips with a recorded reason**; it does **not** report success
  (FR-006, NC3-A). This is P-V's never-silently-approve applied to the test suite itself.
- A `skipped` result with no `skipReason` is itself a violation.
- The default `node --test` run **stays green with no Ollama installed** — the live tier is gated
  behind `KILN_LIVE=1`, and the skip is recorded, not silent.

## R4 — The probe never advances anything

It admits no program, advances no gate, and writes no `gate0` decision (P-VI / SC-009). It is a
*probe*, not a *walk* — the same discipline r1/r2/r3's probes hold.

## R5 — `LiveModelReady` must stay runnable with no Ollama

**Rule**: r3's probe stays **static**. The dialling checks live only in `OllamaReady`. Mixing them into
`live-ready` would make r3's own green conditional on a model being pulled, retroactively breaking a
closed row.

## R6 — The hardened scan (E6)

```
LOOPBACK_ALLOWLIST = ["ollama-resident.ts"]      // EXACTLY one entry
```

| Element | Requirement |
|---|---|
| call-based patterns | `fetch(`, `http.request(`, `https.request(`, non-loopback `new URL(` — **added to** today's import/primitive patterns, never replacing them |
| scan scope | `kiln/src`, `kiln/ui`, `kiln/validate`, `kiln/contracts` — **`kiln/src` newly covered for `fetch(`** |
| allowlist | exactly one module; a second entry fails check (f) |
| loopback assertion | the allowlisted module's target must be `127.0.0.1` / `localhost` / `$OLLAMA_HOST` |
| strictly stronger | everything the old scan caught, it still catches |

**Why this is mandatory, with evidence**: the present guard is import-and-primitive based and was
**verified not to catch a `fetch`** — `NET_PRIMITIVE` and `EXTERNAL_IMPORT` were both run against a
realistic loopback resident and neither tripped. Without R6, r7 would consume a P-VIII exception that
its own guards cannot see, leaving three *"zero-network ✓"* checks as decoration.

**Falsifiable both ways**: a planted `fetch(` in a non-allowlisted `kiln/src` module must **fail,
named** (today: undetected), and the allowlisted module must **pass by name**.

## R7 — The cost assertion (E5)

| Rule | Detail |
|---|---|
| Measures | `coldMs` (unloaded model), `warmMs` (resident), `ratio` |
| Asserts | a **conservative floor** — switching ≫ work — not the observed 64× |
| Tier | **gated** (it loads/unloads real models) |
| Tolerance | must not time out on a 135 GB `strongest` model |

Reference on the operator's machine: **18 040 ms cold · 280 ms warm · 64×**. This is the first
assertion of Principle IV's *"Testable as:"* clause anywhere in the tree.

## R8 — 001 stays untouched

`kiln/validate/log.ts`, `roadmap.ts`, the JSON Schemas, and `move-vocabulary.ts` are **unchanged**.
R5's forbidden-key check needs no amendment because it scans **keys, not values** (D5). The only
canonical signature r7 widens is `Resident.run` — see [async-spine.md](./async-spine.md).
