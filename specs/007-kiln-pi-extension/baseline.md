# Baseline — before any r8 implementation change (T001)

Recorded 2026-09-21 at `28897f8` (the plan-and-tasks commit), macOS, Node as installed, Pi `0.85.1`.

| Check | Result |
|---|---|
| `cd kiln && npm test` | **233 tests · 221 pass · 0 fail · 12 skipped** (the 12 are the live-Ollama tier; each skips with a printed reason) |
| `npm run validate:roadmap -- ../specs/ROADMAP.md` | **PASS** |
| `npm run runtime-ready` | exit 0 — READY |
| `npm run overlay-ready` | exit 0 — READY |
| `npm run live-ready` | exit 0 — READY |
| `npm run ollama-ready` | exit 0 — READY (Ollama was running: 9 round-trips for 9 units) |
| `pi --version` | **0.85.1** |
| `.specify/feature.json` | gitignored; points at `specs/007-kiln-pi-extension` |

Any later regression is measured against this table (T047 records the after).
