# r16 — Real local workers

> **Roadmap row r16** · phase: Workers · release: `kiln-v1` · status: queued — part of the roadmap **proposal**, pending
> the Roadmap gate. *Explainer — written to help understand the row; [the roadmap](../ROADMAP.md) and
> [the PRD](../../docs/prd/kiln-prd.md) govern where they differ.*

## Focus

Make steps real: durable conversations on local models through `pi-ai`, each role with only its tools, with replay rules that keep a crash from doing anything twice — and judges that genuinely judge.

## What it delivers

- steps as durable conversations with role instructions and the tier's model
- tool sets per role; replay discipline (read-only replay-safe; writes and commands never re-run)
- deterministic request ids per step
- the residency manager: explicit load, pin and unload on Ollama, loopback only
- the model pool on one host with leases and a pinned judge
- a scripted feature walking with real local workers and real judges

## Why it exists

- Until now the walk is scripted; this row makes the factory actually build things (constitution I, II).
- Replay discipline is what makes durable conversations safe — a resumed worker never re-applies a write.
- KILN, not Ollama, must own residency, or an idle timer could unload a judge's model mid-verdict.

## Why it sits here

- **Depends on:** [r13](r13-durable-core.md), [r15](r15-the-record.md)
- **Unlocks:** [r17](r17-configuration-as-files.md)

On the durable core and the record. Before configuration (r17), which binds these roles to models from files.

## What it builds on

- `src/ollama-resident.ts` → residency manager
- `validate/_pi-driver.ts` → fallback worker driver
- `src/live-resident.ts`, `stub-resident.ts` → test harness

## How it is proven

**Acceptance:** A feature walks with real local workers and judges on Ollama; a crash mid-generation resumes without double-charging a tool.

Like every row, it passes all ten gates under the constitution and leaves its specification, plan, tasks, code review and
verification reports in its `specs/NNN-name/` directory.

## Requirements

WORK-1, 3–5, LANE-3 — see [the PRD](../../docs/prd/kiln-prd.md) §6.

## Not in this row

- no remote models (r33)
- no cross-factory scheduling (r25)

## Decisions before it starts

- none open

## Risks

- Local models vary in tool calling and streaming. Mitigation: per-model checks recorded (r17 `kiln check model`).

## Read more

- [Design §7 workers as durable conversations](../../docs/concepts/web-front-door.md)
- [Design §12.4 the model pool](../../docs/concepts/web-front-door.md)
