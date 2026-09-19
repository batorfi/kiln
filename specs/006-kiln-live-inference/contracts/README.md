# Contracts — 006-kiln-live-inference (r7)

The interfaces r7 exposes, and the one upstream signature it widens. Each is a **design contract**
reviewable at gate 2, not generated code.

| Contract | Covers | Trace |
|---|---|---|
| [async-spine.md](./async-spine.md) | the **one declared signature change** (`Resident.run` → union with `Promise`), the closed async propagation set, `bindAll` staying a sync throw, and the "forgotten `await` must fail loudly" rule | NC1=B · FR-015, FR-015a · P-II/III/IV/IX |
| [ollama-resident-api.md](./ollama-resident-api.md) | the live resident: request shape, `think:false`, failure modes, output capture, and what is recorded vs. kept out of the ledger | FR-001..004, FR-012 · P-I/VIII |
| [ollama-ready.md](./ollama-ready.md) | the dialling probe (checks a–f, skip-is-never-a-pass), the hardened call-based P-VIII guard, and the cost assertion | FR-005..008, FR-010, FR-011 · P-V/VI/VIII |

## What r7 is judged *by* (and does not modify)

| Judge | Owner | r7's obligation |
|---|---|---|
| `kiln/validate/log.ts` (R1–R6) | 001 | a captured live fixture **PASSes**; a no-`decidedBy` variant **FAILs named R3** |
| `kiln/validate/roadmap.ts` (M1/M3/M4) | 001 | unchanged; r7 admits no program |
| `kiln/schemas/*.json` | 001 | unchanged; **no new `recordType`** |
| `contracts/move-vocabulary.ts` (G1–G5) | 001 | unchanged |
| `runtime-ready` / `overlay-ready` / `live-ready` | r1 / r2 / r3 | still green; **composed**, not re-declared |

## The inversion r7 performs

r1–r3 proved the factory with a **deterministic stand-in**. r7 is the first row where a model actually
runs, so it inverts the burden of proof: instead of *"the live path exists and is wired"* (satisfiable
by an adapter), the claim becomes *"a call happened and returned model output"* — checks (c) and (e) of
[ollama-ready.md](./ollama-ready.md).

It pays the debt named by its own ancestor at `kiln/src/stub-resident.ts:8` —
*"A genuine live-model smoke walk is r3 — not provided here."*

## The bargain of NC2-A

r7 spends P-VIII's loopback exception **and strengthens the guard that polices it in the same change**.
The present zero-network scan was verified **not to catch a `fetch`**; r7 makes it call-based, brings
`kiln/src` into scope, and allowlists exactly one module by name. The scan ends up strictly stronger
than before — that is the condition on which the exception was granted.
