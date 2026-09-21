# KILN

**A local, single-lane, spec-driven development factory for [Pi](https://github.com/earendil-works/pi).**
One model at a time, a human at every gate, no cloud.

> **Status: early.** KILN's first version, `kiln-v1`, is defined as a **fully runnable factory** — a real UI, commands to run a lane,
> a director and roles. **That is not built yet** (it is roadmap row `r8`). What exists today is the verified foundation: the single-lane
> runtime, the gate and log machinery, a real local-model worker, and the checks that prove them. You can run and inspect all of it —
> but you cannot yet point KILN at a feature and have it run the whole process for you. See [What works today](#what-works-today-and-what-does-not).

## The idea

A kiln fires one batch at a time, in one chamber, and holds its heat between batches. KILN works the same way:

- **One lane, one loaded model at a time.** A local model is slow to load, so the design avoids swapping: work is ordered so the
  model changes only when the next task genuinely needs a different one. Cost is *held compute*, not cloud tokens.
- **A human decides at every gate.** A feature passes nine gates — *concept, architecture, spec, plan, checkpoint, review,
  verification, docs, pull request* — and a **Gate 0** before the lane even starts, where a human approves the whole program of work.
- **No model approves its own work.** The roles that judge (architecture critic, code reviewer, verifier, docs synthesizer) always
  run on the strongest model, and the *deciding* move is always a human's. A missing screen or a missing person can hide a gate, but it can
  **never silently approve one** — headless, a gate becomes a durable `WAIT` in the log.
- **Local-first.** Runs on models served by [Ollama](https://ollama.com) on your own machine. The only network call the runtime makes
  is to a loopback address, and a scan in the test suite checks that nothing else reaches out.
- **Everything is recorded.** Every transition, gate decision and cost lands in a durable, timestamped **factory-log** that a validator
  can check on its own.

The rules are written down as a [constitution](./.specify/memory/constitution.md) of nine principles, and the code cites them by name.

## What works today, and what does not

**Works, and is verified:**

- The **single-lane runtime** — lane, gate primitive, log writer, model-affinity scheduler — with the gate rules enforced in code.
- A **real local-model worker** (`kiln/src/ollama-resident.ts`) that runs each unit on an Ollama model, refuses any non-loopback host,
  never follows redirects, and never writes prompts or answers into the log.
- The **three UI layers** (footer, gate popup, roadmap overlay) as pure renders of one shared state, with a headless twin that prints the same
  content and still blocks.
- **Validators** for the factory-log and the roadmap, and **four readiness probes** (`runtime-ready`, `overlay-ready`, `live-ready`,
  `ollama-ready`) that each fail by name when something is missing — `ollama-ready` actually calls the model.
- **232 tests** (12 of them need a running Ollama and skip, with a printed reason, when it is absent), plus a committed log of a real
  nine-gate run for offline replay.

**Does not exist yet** (this is what `r8` is for):

- Real **Pi integration** — the UI layers are written against an abstract interface, not Pi's real one.
- **Commands** to start a lane or answer a gate, and a **director** that turns an approved spec into gated work units. Today the only walk is a
  scripted throwaway feature used to test the machinery.
- The **role agents** (`agents/*.md`).
- An **installer** and **newcomer docs** (later rows).

## Requirements

- **Node.js** — tested on **v26.8.2**. The package declares `>= 22.6`, but that floor is **unverified**: the code is TypeScript run directly
  by Node with no build step, and older Node 22 releases need `--experimental-strip-types`.
- **Git.** There are **no runtime dependencies** (`dependencies: {}`), and nothing to `npm install`.
- *Optional, for the live tier:* [Ollama](https://ollama.com) with a model. The tests default to `gemma4:12b`; set `KILN_LIVE_MODEL` to use another.

## Try it

The npm scripts live in `kiln/` and are run from there:

```bash
git clone https://github.com/batorfi/kiln.git
cd kiln/kiln

npm test                                   # 232 tests; the 12 live ones skip, each printing why
npm run runtime-ready                      # the readiness probes (no Ollama needed)
npm run overlay-ready
npm run live-ready
npm run validate:roadmap -- ../specs/ROADMAP.md     # the project's own roadmap, judged by its own validator
npm run validate:log -- fixtures/r7-live-inference.jsonl   # a real nine-gate run's log
```

With Ollama running and a model installed:

```bash
ollama pull gemma4:12b
npm run ollama-ready                       # fires a real nine-unit walk and checks it: READY
npm run test:live                          # the whole suite against the real model (about 40 s)
```

`npm run test:live` runs the tests one file at a time, because one test unloads the model. Any run that executes **zero** tests fails, so a
mistyped path can't pass silently.

## How the repository is laid out

| Path | What is in it |
|---|---|
| [`kiln/`](./kiln) | The toolchain: `src/` (lane, gate, log writer, scheduler, resident), `ui/` (the three layers), `validate/` (validators and probes), `schemas/` and `contracts/` (the log and roadmap shapes, the gate rail), `tests/`, and `fixtures/` (a committed real run) |
| [`specs/`](./specs) | One directory per roadmap row — spec, plan, tasks, and the evidence — and [`ROADMAP.md`](./specs/ROADMAP.md), the human-approved program |
| [`docs/concepts/`](./docs/concepts) | The design: why KILN exists, the gates, the UI layers, the process flow, the role skills |
| [`.specify/`](./.specify), [`.pi/`](./.pi) | The [Spec Kit](https://github.com/github/spec-kit) scaffolding and Pi prompts the project is built with, and KILN's constitution |

## How the project is built

KILN is built by the process it describes: **spec-driven**, with [Spec Kit](https://github.com/github/spec-kit) on Pi, under the constitution.
The whole program is a **roadmap of rows**; each row is one full lane (specify, clarify, plan, tasks, implement, verify), and **a human approves
the program at Gate 0 and re-admits it at every seam between rows**. The roadmap is data, validated by the project's own validator.

| Row | What | Status |
|---|---|---|
| r1 | The single-lane runtime | done |
| r2 | The roadmap overlay (UI layer C) | done |
| r3 | The first full-rail smoke walk | done |
| r7 | True live local inference — a real Ollama-backed worker | done |
| **r8** | **Make it runnable: real Pi integration, commands, a director, roles** | **next** |
| r4 | Cut the `kiln-v1` release | queued |
| r5 | A URL-runnable installer | queued |
| r6 | Newcomer docs on GitHub Pages | queued |

Each finished row leaves evidence next to its spec. For an example of how a row is documented and checked, read the
[overview of r7](./specs/006-kiln-live-inference/overview.md), then its
[verification report](./specs/006-kiln-live-inference/verification-report.md) and
[code review report](./specs/006-kiln-live-inference/code-review-report.md) — which record what was found wrong as well as what was right.

## Read next

1. [`docs/concepts/concept.md`](./docs/concepts/concept.md) — the pitch and the defining properties
2. [`docs/concepts/kiln-analogy.md`](./docs/concepts/kiln-analogy.md) — the kiln metaphor, mapped onto the design
3. [`docs/concepts/gates-why-how-what.md`](./docs/concepts/gates-why-how-what.md) — the nine gates and why each is a human decision
4. [`docs/concepts/process-flow.md`](./docs/concepts/process-flow.md) — one feature, end to end
5. [`.specify/memory/constitution.md`](./.specify/memory/constitution.md) — the nine principles

## Contributing

There is no formal contribution process yet. Issues and questions are welcome. Because design decisions here deliberately go through human gates (the
[roadmap](./specs/ROADMAP.md)), a proposal is best raised as an issue before any code.

## License

KILN is licensed under the [Apache License 2.0](./LICENSE). Copyright 2026 Zsolt Bátorfi — see [`NOTICE`](./NOTICE).

The Spec Kit scaffolding under `.specify/` and `.pi/` is © GitHub, Inc. under the MIT License; see
[`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md).
