# Quickstart Run — 001-kiln-scaffold (T028)

**Date:** 2026-09-12 · **Runner:** Node v26.8.2, `node --test` · **Zero runtime deps / zero network (P-VIII, SC-005).**

Each `quickstart.md` scenario was driven against the delivered `kiln/` contracts.
All six reproduce their expected outcome; **no scenario runs a lane or advances a
gate** (SC-006), and the module graph pulls no network (grep-confirmed).

| # | Scenario | Command | Expected | Observed |
|---|----------|---------|----------|----------|
| 1 | Complete log stream validates (R1–R6) | `node --test tests/ …` | PASS | ✅ 45/45 tests pass |
| 2 | No-silent-approval (R3) | `node --test tests/negative/no-silent-approval.test.ts` | FAIL-when-silent, PASS-when-decided | ✅ 4/4 |
| 3 | Malformed/gap stream names the reason (R2/R1) | `node --test tests/streaming/seq.test.ts` | named FAILURES | ✅ 6/6 |
| 4 | Gate-0 admission guard (M1–M4) | `node kiln/validate/roadmap.ts kiln/ROADMAP.md` | PASS; bad head → named FAIL | ✅ PASS / `FAIL — head` |
| 5 | Strongest-model binding enforced (G2/L1) | `node --test tests/negative/strongest-model.test.ts` | weaker binding REJECTED | ✅ 5/5 |
| 6 | FiringReady is falsifiable | `node kiln/validate/firing-ready.ts` | READY; omit one → named gap | ✅ READY / named gap |

**Per-scenario evidence**
- `node kiln/validate/roadmap.ts kiln/ROADMAP.md` → `PASS` (Q2=A blank: `gate0=pending`, 0 rows).
- `node kiln/validate/roadmap.ts /tmp/bad.md` → `FAIL — head "… expected a ```json block"` (named).
- `node kiln/validate/log.ts` (no arg) → usage error; on a valid JSONL → `PASS`.
- `node kiln/validate/firing-ready.ts` →
     `✓ factory-log schema: trace: P-V …`
     `✓ roadmap schema: trace: P-VI …`
     `✓ gate-rail contract: G2/L1 (strongest-model) present`
     `✓ move-vocabulary (G3): present`
     `✓ shipped ROADMAP.md (Q2=A blank): valid empty program (gate0 pending, 0 rows)`
- Full suite: `node --test "kiln/tests/**/*.test.ts"` → **45 tests, 0 fail**.
- Zero-network (P-VIII / SC-005): a `grep -rnE "fetch|node:net|axios|undici|https?://"` over
     `kiln/` finds **no runtime network calls** (only `$id`/`$schema` URLs in schema metadata).
- Zero lane advance (SC-006): `kiln/index.ts` reports `WIRING_STATUS = "not-wired …"` and
     `laneIsWired() === false`; no test opens a lane, loads a resident model, or crosses a gate.

## Reproduce

```bash
cd kiln
node --test "tests/**/*.test.ts"          # 45 ✓
node validate/roadmap.ts ROADMAP.md        # PASS
node validate/firing-ready.ts              # READY
npm test                                   # same as the full suite (package.json "test")
```
