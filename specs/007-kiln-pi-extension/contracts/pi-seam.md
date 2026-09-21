# Contract — the Pi seam (E1–E4)

**Trace**: FR-006, FR-007, FR-008, FR-009, FR-017 · P-V, P-IX, P-I · [research.md](../research.md) D1, D5 · [data-model.md](../data-model.md) E1–E4

The seam is the **one place** KILN's needs meet Pi's `ctx`. r9 changes this and nothing else (US4).

## S1 — KILN declares Pi's surface; it never imports Pi

`kiln/pi/port.ts` holds structural types for exactly the members in data-model E1. A test asserts no file under `kiln/` names an `@earendil-works/*` specifier (the P-VIII scan already flags it; the test makes the *reason* explicit).

## S2 — Capability is decided by `mode`, and defaults to *cannot ask*

`detectCapability(ctx)`:

| `ctx.mode` | `ctx.hasUI` | `canAsk` | `canDraw` | Evidence |
|---|---|---|---|---|
| `"tui"` | `true` | **true** | **true** | documented; **T** — the human smoke |
| `"rpc"` | `true` | **true** | **false** | **measured**: `select` round-trips; `custom()` → `undefined` (M5) |
| `"json"` | `false` | **false** | **false** | **measured**: dialogs answer instantly with a non-answer (M6) |
| `"print"` | `false` | **false** | **false** | **measured** (M6) |
| anything else / absent | any | **false** | **false** | fail-safe: a Pi newer than measured must not be trusted to have a human |
| `"tui"` or `"rpc"` | `false` | **false** | **false** | contradiction ⇒ fail-safe |

**Rule.** A capability is granted only by an *affirmative* row above. Nothing is inferred from `hasUI` alone.

## S3 — The outcome rule (FR-006)

```
interpret(raw, options, capability):
  if !capability.canAsk                          → no-answer("cannot-ask")
  if raw === undefined || raw === null            → no-answer("dismissed")
  if typeof raw !== "string"                      → no-answer("wrong-type")     // e.g. a boolean from confirm
  if !options.includes(raw)                       → no-answer("not-offered")
  otherwise                                       → answered(raw)
```

Order matters: `cannot-ask` is checked **first**, so a headless mode that returns a string by some future accident still cannot produce an answer.

### S3.1 — The truth table the tests must cover (each is a named row; each MUST yield `no-answer`, none may yield `answered`)

| # | Situation | Raw value | Mode | Measured? |
|---|---|---|---|---|
| N1 | human pressed Esc / client `cancelled: true` | `undefined` | tui / rpc | rpc **M**; tui **T** |
| N2 | dialog timed out | `undefined` | rpc | **M** (4.2 s) |
| N3 | headless `select` | `undefined` | print | **M** (0 ms) |
| N4 | headless `select` | `undefined` | json | **M** (0 ms) |
| N5 | `confirm` result used as an answer | `false` | print / json | **M** |
| N6 | `custom()` in RPC | `undefined` | rpc | **M** — and `canDraw` is `false`, so the layer is hidden, not shown |
| N7 | `hasUI: false`, `mode` absent | any string | — | fail-safe |
| N8 | a string not offered | `"maybe"` | tui | — |
| N9 | unknown future mode | any string | `"web"` | fail-safe |
| Y1 | **the only answer**: an offered option string | `"approve"` | tui / rpc | rpc **M** |

**Mutation requirement (SC-003).** For each of N1–N9 a mutant `interpret` that turns that row into `answered` MUST fail **that row by name**. The suite carries the mutants as data, not as comments.

## S4 — `askGate` builds the dialog, and it carries no timeout (FR-008)

`askGate(ctx, question)` calls `ctx.ui.select(question.title, [...question.options])` — **exactly two arguments**. A test hands it a fake `ctx` and asserts `arguments.length === 2` and that no third argument exists.
`GateQuestion` has no `timeout`/`signal` field (data-model E3), so a caller *cannot* supply one.
**The one exception is labelled and is not a gate:** `kiln-selftest timeout` calls `select` **with** a timeout, *only* to observe Pi's timeout shape (research D7). It does not go through `askGate`, and a test asserts `askGate` is the only path a *gate* question takes.

## S5 — `no-answer` becomes a `WAIT`, never a decision (FR-006, FR-009)

`resolveAsk(ctx, gate, question)` → `answered` ⇒ returns the option **to the caller, unapplied**; `no-answer` ⇒ returns `headlessWait(gate)` (r1). The seam:

- never calls `applyMove`, `autoApprove`, `resumeByToken`, or `makePreDelegation`;
- never writes a `recordType` (r8 adds none) — the `Wait` is r1's existing shape;
- never records a `decidedBy`. **An `answered` outcome is not a human decision until a later row applies it with the human's identity.** A scripted driver's reply is therefore *structurally unable* to become `human@…` in r8 (FR-009).

## S6 — The operational definition of "headless" (FR-017, NC3 = A)

> **Headless, for KILN, means: this run cannot obtain an *explicit human choice* from a mode that can reach a human.** It is decided by **mode and measured capability (S2)** — never by `ctx.hasUI` alone.
> A missing capability **hides** a layer and degrades the gate to a durable `WAIT`; it never advances one.

**Compliance note (to be filed as `compliance-note.md` at implementation).** P-V's text reads *"In headless (`!ctx.hasUI`) every gate … degrades to a durable `WAIT`"*. r8 implements a **strictly larger** set of
`WAIT`-producing situations than `!ctx.hasUI`: every case the text covers (S2 rows `json`, `print`, `hasUI:false`) **and** the cases it misses (RPC's UI that cannot draw; an unknown mode). Because the rule can only
ever *withhold* an approval the text would also withhold, it cannot violate the principle — **it is stricter than the wording, not different from it.** The constitution is **not amended** (NC3 = A). The wording is
to be revisited at the **r9 seam**, when a real UI exists.

## S7 — What the seam never does

No timer, no poll, no socket, no server (P-IX). No network (P-VIII). No log write. No model call. No import of Pi.
