# Contract — `UiReady`, the automated half of NC3 (E7)

**Trace**: FR-013 · SC-002, SC-003, SC-004 · [research.md](../research.md) D5–D7 · sibling of r8's [pi-ready.md](../../007-kiln-pi-extension/contracts/pi-ready.md)

The **sixth** probe in the chain `RuntimeReady → OverlayCReady → LiveModelReady → OllamaReady → PiReady → UiReady`. Composes on `PiReady` (this row assumes
KILN already loads into Pi; it does not re-prove that). Runs in **RPC mode only** — it is the automated half NC3 = B calls for; it cannot prove anything about
the terminal (that is FR-013's human half, `quickstart.md`).

## U1 — Hermetic, same as `PiReady`

Fresh temp `PI_CODING_AGENT_DIR`, `--offline`, no model, `KILN_HUMAN` set to a **fixture** value (`human@ui-ready-fixture`) for the control cases, and
**unset** for the identity-refusal cases (L2/L3's row 2). A fixture `RoadmapHead`/`Gate` is used throughout — never the repository's own `specs/ROADMAP.md`
(unlike `PiReady`'s check (e), this probe does not need to match the real roadmap; it needs to prove the wiring, not the content).

## U2 — Checks, each with the name it fails by

| # | Check | Fails as |
|---|---|---|
| a | Layer A's `setStatus` call carries `present.ts`'s output, not `renderHud`'s raw string, for a fixture with a known gate id and timestamp | `presentation-not-applied` |
| b | A per-gate question, answered with a valid move and a valid `KILN_HUMAN`, results in exactly one `applyMove` call with the right `decidedBy` | `apply-not-called` |
| c | The same, but `KILN_HUMAN` unset: **no** `applyMove` call happens; the gate goes to `headlessWait` instead | `non-answer-approved` (same code r8 used for the analogous case — a syntactically valid choice must not become a decision without a real identity) |
| d | A Gate-0 question offers **only** `GATE0_ADMISSION_MOVES`, never the roadmap-edit moves | `gate0-vocabulary-leak` |
| e | A per-gate question's options are compared against `moveVocabulary(gate.id)` and match exactly | `vocabulary-mismatch` |
| f | Opening Layer B while Layer C is open closes C first (per L5) — verified by checking only one `custom()` call is pending at a time | `overlay-not-exclusive` |
| g | Every one of r8's measured non-answer shapes (cancelled, timed out, headless mode), replayed through Layer B, results in `headlessWait`, never `applyMove` | `non-answer-approved` |
| h | `kiln/ui/keymap.ts`'s three constants each match `docs/keybindings.md`'s Key Format (`^(ctrl\+|alt\+|shift\+|super\+)*[a-z0-9/]+$`, case-normalised) and are pairwise distinct | `keymap-invalid` |

## U3 — What this probe cannot prove (and does not claim to)

Whether a keybinding actually **fires** when typed in a real terminal (versus being swallowed as text) — SQ1's remaining gap. Whether an overlay survives a
`turn_end`/compaction (SQ2). Whether the rendered overlay is an acceptable width/position (SQ4). Whether Pi's own overlay stacking would have been sufficient
without L5's guard (SQ5 — the guard is built regardless, so this is answered by construction, not measurement). All of these are named, not silently skipped,
in `research.md` Part B, and are exactly what `quickstart.md`'s human smoke test (FR-013's other half) exists to cover.

## U4 — Skip and CLI, same discipline as `PiReady`

Gated by `kiln/tests/_pi-gate.ts` (reused, not re-implemented — this probe needs Pi, the same tier r8 already built a gate for). Skip is never a pass; a skip
carries a printed reason; `KILN_PI=1` demands the tier and fails loudly if Pi is absent. `node validate/ui-ready.ts [--no-identity|--vocabulary-leak|...]`
mirrors `pi-ready.ts`'s hook-per-failure-mode pattern.
