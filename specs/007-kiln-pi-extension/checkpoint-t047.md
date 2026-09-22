# T047 — full validation checkpoint (2026-09-22)

| Check | Before r8 (T001 baseline) | After r8 implementation |
|---|---|---|
| `npm test` | 233 tests · 221 pass · 0 fail · 12 skipped | **369 tests · 356 pass · 0 fail · 13 skipped** (the extra skip is `untouched.test.ts`, honestly waiting on commit hashes — T046) |
| `npm run test:pi` | n/a (did not exist) | **125 tests · 124 pass · 0 fail · 1 skipped**; ≥1 `PI-LIVE:` test passed, so `--pi`'s guard is satisfied |
| `npm run pi-ready` | n/a | **READY** — Pi 0.85.1, all 9 checks pass |
| `npm run runtime-ready` | READY | READY |
| `npm run overlay-ready` | READY | READY |
| `npm run live-ready` | READY | READY |
| `npm run ollama-ready` | READY | READY |
| `npm run validate:roadmap` | PASS | PASS |

Net addition: **136 tests** (233 → 369, plus the 125 in the `test:pi`-restricted run overlapping the main count). 0 regressions.
