# Research — r9 (KILN's real UI on Pi): plan decisions, and the spike's findings register

**Trace**: [spec.md](./spec.md) FR-001–FR-015 · [ui-mockups.md](./ui-mockups.md) · P-I, P-IV, P-V, P-VI, P-IX · Pi `0.85.1`, macOS, 2026-09-23.

Same two-part structure as r8's `research.md`: **Part A** records the decisions the plan makes (including the two items the mockup review left open).
**Part B** is the findings register for spec.md's SQ1–SQ6, pre-filled with what planning itself measured, completed by r9's own spike task.

---

## Part A — Decisions

### D1 — Layout: `kiln/pi/ui/` holds everything this row adds

**Decision.** New directory `kiln/pi/ui/`, per r8's own layout note (`kiln/pi/README.md` E7): `live-ctx.ts` (the real-`LiveUICtx` implementation, NC2 = A),
`present.ts` (the FR-015 presentation wrapper), `identity.ts` (NC1's `decidedBy` resolution), `ui-ready.ts` in `kiln/validate/` (NC3's automated half,
mirroring `PiReady`). `kiln/ui/keymap.ts` is edited in place (FR-007, additive constants change, not a new file) since r1 already owns that module and no
other row touches it.
**Rationale.** Matches the committed plan r8 left for exactly this row; nothing here needs a new top-level directory.

### D2 — The presentation wrapper is one small, pure module with a fixed substitution table

**Decision.** `kiln/pi/ui/present.ts` exports `presentHud(state)`, `presentPopup(state)`, `presentOverlay(state)`, `presentGate0Face(head)` — each calls the
real r1/r2 render function, then applies FR-015's three transforms via **string substitution against a fixed table**, not free-form text processing:
- gate names: replace `` gate${id} `` / a bare `` ${id} `` inside "moves [...]"/"OPEN"/"at gate N" phrasing with the name from D3's new export;
- timestamps: replace an ISO-8601 substring with the time-only or full-date form (a small formatter, `Intl.DateTimeFormat` with fixed options — no locale
  guessing, always `en-GB`-style unambiguous output, always UTC);
- header wording: four **exact, hard-coded** replacement pairs — dropping `presentPopup`'s trailing `— moves […]` clause (redundant once the same moves
  are the selectable list itself); the plain `=== Roadmap — kiln-v1 ===` / `Gate 0: approved by … · …` / `Firing order: …` for the plain table;
  `=== Gate 0 — kiln-v1 ===` / `Status: pending — awaiting your decision` for the Gate-0 face — approved verbatim in `ui-mockups.md`, not reworded again here.
**Rationale.** A fixed table is testable byte-for-byte (SC-008) and cannot silently drift into rewriting something the mockup review never saw. Free-form
regex rewriting of arbitrary render output would be both fragile (the render functions' exact prose can change under them) and untestable to the same
standard.
**Alternatives.** Modify `renderHud`/`renderPopup`/`renderOverlay`/`renderGate0Face` in place — rejected: r1/r2 are `done`, and FR-001–003/FR-015 all require
their return values stay byte-for-byte unmodified.

### D3 — `move-vocabulary.ts` gains one additive export: a gate-id → human-name map

**Decision.** `export const GATE_NAME: Record<GateId, string> = { gate0: "gate0", 1: "concept", 2: "architecture", 3: "spec", 4: "plan", 5: "checkpoint", 6:
"review", 7: "verification", 8: "docs", 9: "pull request" }` (dropping the `N-` numeric prefix `GATE_TO_KEY` keeps internally, since that prefix is a sort
key, not a name) plus `export function gateName(id: GateId): string`. Nothing existing in `move-vocabulary.ts` changes.
**Rationale.** `GATE_TO_KEY` (the existing private map this is built from) already carries the exact names; exporting a name-only view is the smallest
possible additive change, and keeps the sort-order prefix (`1-`, `2-`, …) as an internal-only implementation detail never shown to a user.

### D4 — `decidedBy` (NC1 = A): `KILN_HUMAN`, read once, refused loudly if malformed

**Decision.** `kiln/pi/ui/identity.ts` exports `resolveIdentity(env = process.env): { ok: true; decidedBy: string } | { ok: false; reason: string }`. It reads
`KILN_HUMAN`; **ok** iff the value is non-empty and matches `/^human@\S+$/` (the exact shape `applyMove`/`recordGate0Decision`/`resumeByToken` already
require — measured in r1/r2's own code: `resumeByToken` throws unless `decidedBy.startsWith("human@")`; `recordGate0Decision` throws unless the same).
A missing or malformed value is **not** silently defaulted — it is treated as `no-answer` in the presentation layer (a durable `WAIT`, FR-005), and the
`kiln-status`-style read-only report (extended, not re-invented) names the problem so an operator can fix it before a gate ever opens.
**Rationale.** Reuses the exact validation r1/r2 already enforce, so there is no second, looser notion of "a human" anywhere in r9's own code — a malformed
`KILN_HUMAN` fails at the **same** check `applyMove`/`recordGate0Decision` would have failed on anyway, just earlier and with a clearer message.
**Alternatives.** A new, r9-owned validation regex — rejected: it would be a second source of truth for what a valid `decidedBy` looks like, and could drift
from r1/r2's own (unmodified) requirement.

### D5 — The real `LiveUICtx` (FR-012, NC2 = A): `raiseOverlay` maps to `ctx.ui.custom`, built on r8's seam

**Decision.** `kiln/pi/ui/live-ctx.ts` exports `makeLiveUICtx(piCtx: PiCtx): LiveUICtx` (r3's existing interface, NC2 = A):
- `setStatus(footer)` → `piCtx.ui.notify` in `tui`/`rpc` (matching r8's `output.ts` pattern) with the text as-is (Layer A has no move to answer, so no seam
  involvement) — **or**, if the plan's remaining open item (below) resolves to `setFooter`, that call instead. Recorded as **still open** — see "What the
  mockup review left open," below.
- `raiseOverlay("B", content)` → builds a `GateQuestion` from the gate's real `moveVocabulary(gate.id)` and calls r8's `askGate`/`interpret` (imported, not
  re-implemented) through a small overlay component (render = the popup content via `present.ts`; `handleInput` maps Enter/arrow-navigation the same way
  Pi's own `overlay-test.ts` example does — SQ-measured pattern, not invented) — **this is a NEW overlay component, r8's `kiln-selftest` overlay is not
  reused as-is**, since that one had no selectable list at all (it just closed itself; F-1 was about closing, not choosing). On a choice, the raw value is
  fed through r8's `interpret`; `answered(option)` calls `applyMove` with D4's `decidedBy`; `no-answer` calls `headlessWait` — **exactly** r8's seam, reused,
  never re-implemented (FR-005).
- `raiseOverlay("C", content)` → the same shape, but the question and vocabulary come from `moveVocabulary("gate0")`'s admission subset when
  `gate0.status === "pending"` (routing to `recordGate0Decision`, never `applyMove` — FR-003/FR-006), or a **non-interactive** overlay (no question, just the
  plain table) otherwise.
- `raiseOverlay(layer, null)` → close whichever overlay is open for that layer (calls the pending `custom()`'s own dismiss path).
**Rationale.** r8's seam (`askGate`, `interpret`, `resolveAsk`, `headlessWait`) already proves every measured non-answer shape becomes a `WAIT`; wiring Layer
B/C's real choices through it is strictly additive reuse, not a second seam (FR-005's explicit requirement).
**Alternatives.** A second, Layer-B/C-specific interpretation of Pi's dialog results — rejected outright; it would duplicate exactly the logic r8 already
mutation-tested and risk a second, less-tested path to the same conclusion.

### D6 — Mutual exclusion (SQ5, FR-008): enforced by KILN, not assumed from Pi's own stacking

**Decision.** `live-ctx.ts` tracks which of B/C is currently open (a private, module-scoped flag reset at each `setStatus`/`raiseOverlay` call — not
persisted, not read by anything outside this file) and refuses to open a second overlay while one is pending, closing the first before opening the second.
**Rationale.** `docs/tui.md`'s "Overlay Focus" section documents *a* stacking behaviour (a focused overlay can host another non-overlay UI without losing
focus) but nothing that guarantees "at most one KILN overlay" — building the guard rather than assuming Pi enforces it is the safer, measured-first choice,
and it is cheap to build and test offline.
**Alternatives.** Rely on Pi's own overlay stacking — rejected until SQ5's terminal measurement can confirm it behaves the way KILN needs, which the plan
cannot wait for.

### D7 — A stale-token answer never applies (SQ6, FR-010): reuse `resumeByToken`'s existing refusal

**Decision.** No new guard is built. r8's `askGate`/`interpret` path resolves within a single `custom()` call's lifetime, tied to one gate's `Wait.token`;
if a session switch happens while an overlay is pending, r8's own measurement (research SQ3) shows Pi still delivers the eventual answer to the *original*
`custom()` promise's `done` callback — which is a JS closure over the *specific* `gate` object that opened it. Applying that answer therefore calls
`applyMove`/`resolveAsk` on the *same* `Gate` instance the token was minted for; `resumeByToken`'s own `"still-open"` refusal (comparing the presented token
to `gate.wait.token`) already protects a genuinely stale case (a *second* wait minted on the same gate object between the switch and the late answer).
**Rationale.** This is the same principle as D5/D6: reuse r1's existing, tested refusal rather than add a parallel one. Recorded as **T** (needs the human
terminal to confirm the closure-identity reasoning above actually holds against a real session switch) — see Part B, SQ6.
**Alternatives.** A new token-comparison guard in `live-ctx.ts` — deferred unless SQ6's terminal measurement shows the closure-based reasoning is wrong.

### D8 — `renderOverlay`'s column alignment (a mockup-review item, resolved)

**Decision.** `kiln/ui/overlay.ts`'s `rowLine` function is changed to compute column widths (id, status, short, deps) from the full row set **before**
formatting each line, replacing the current hand-placed literal spaces — an **additive, output-changing** edit to an r2-owned file, the one deliberate
exception to "r1/r2 stay unmodified" in this row.
**Rationale.** The mockup review's alignment was explicitly approved; achieving it for real needs this change, and there is no way to get column alignment
from a presentation wrapper alone (the wrapper only substitutes fixed tokens — D2 — it does not re-flow whole lines). This is the **one** r2 file this row
edits, and only this one function within it; `renderGate0Face` (a separate, r2-owned function) is *not* changed, since the Gate-0 face's own mockup used a
different, simpler column scheme that was already achievable by consistent literal spacing in the fixture used for review — **to be re-checked against a
wider range of row-description lengths in the plan's own test**, not assumed safe from one fixture.
**Alternatives.** A `present.ts`-side re-flow of `renderOverlay`'s already-rendered text — rejected: parsing rendered prose back into columns to re-align it
is far more fragile than fixing the one function that builds it, for a strictly smaller code change.

### D9 — Layer A's decorative border (a mockup-review item, resolved: not built this row)

**Decision.** The double-line box border shown in the approved mockups is **not** implemented as drawn. Layer A uses `ctx.ui.setStatus` (a plain named
status string, per FR-001 as written), not `ctx.ui.setFooter`'s custom-component path. The border in the mockup was explicitly noted, at approval time, as
"a design choice, not measured Pi chrome" (`ui-mockups.md`) — it illustrated the *content and its ordering*, not a commitment to draw a box.
**Rationale.** `setFooter` replaces Pi's **entire** built-in footer (per `docs/extensions.md`), a much larger behavioural change than a named status entry,
and drawing a persistent decorative box around it was never a functional requirement (nothing in FR-001 or the user stories asks for a specific footer
chrome) — only the *information* (`rail`, `lane`, `switches`) was. Revisiting the border is possible in a later row if a human decides it is worth
`setFooter`'s added scope.
**Alternatives.** Build a custom `setFooter` — deferred as out of scope for what FR-001 actually requires; recorded here so the choice is not silently lost.

### D10 — Keymap re-decision (FR-007, SQ1 partially measured)

**Decision.** `kiln/ui/keymap.ts`'s three constants change from bare letters to modifier+key combinations, checked against Pi's **complete** documented
default-binding list (`docs/keybindings.md`, every table) for zero conflicts:

| Constant | Old (bare) | New | Conflict check |
|---|---|---|---|
| `LAYERB_KEY` | `"g"` | `"alt+g"` | not in Pi's default-binding list; **measured**: `registerShortcut("alt+g", …)` registers with no error |
| `LAYERC_KEY` | `"M"` | `"alt+m"` | not in Pi's default-binding list; **measured**: registers with no error |
| `TOGGLE_KEY` | `"?"` | `"alt+/"` | not in Pi's default-binding list; **measured**: registers with no error |

`keymapIsConsistent()` (already exists, r1) is unchanged in shape — it still asserts the three values are distinct, which they still are.
**Rationale.** Measured directly (this planning session, hermetic RPC, no model): `pi.registerShortcut("g", …)` also registers with **no error** — so a bare
letter is not rejected at *registration* time, correcting the spec's stronger inference ("very likely wrong"). What is **not** measurable over RPC is
*firing* behaviour: whether pressing a bare `g` in a real terminal invokes the shortcut or is swallowed as ordinary editor text. Rather than gamble on an
unmeasured interaction, the plan picks unambiguous `alt+`-modified combinations, each individually confirmed to register, each checked against the full
documented default-binding list by hand (not just spot-checked) so no later default binding this session didn't happen to exercise silently steals the key.
**Alternatives.** Keep the bare letters and let the terminal smoke test (NC3) discover whether they fire — rejected: this row's own smoke test is expensive
context to spend re-discovering a fact the docs already state plainly (Key Format: keys need a modifier to be unambiguous shortcuts); spending it confirming
`alt+g`/`alt+m`/`alt+/` fire as expected is a better use of the one human check this row gets.

**CORRECTION (from the human smoke test — exactly what NC3=B's human half exists to catch; the root cause took five wrong guesses to find).**
Registration (measured above) said nothing about whether a shortcut would *fire*, and the first real terminal session found five key choices
in a row that did not:

| Attempt | Keys | What was observed | Theory offered at the time |
|---|---|---|---|
| 1 | `alt+g` / `alt+m` / `alt+/` | `⌥g` typed a literal `©` into the editor | the terminal composes Option into text |
| 2 | `ctrl+shift+b` / `m` / `/` | silence | Shift can't ride on a Ctrl-letter byte |
| 3 | `ctrl+f9` / `f10` / `f11` | silence | function-key modifiers aren't carried through |
| 4 | `ctrl+shift+home` / `end` / `delete` | silence | (built on a `ctrl+home` signal that didn't reproduce) |
| 5 | `ctrl+alt+r` / `m` / `t` | silence — in two different terminals (cmux, Terminal.app) | "Ctrl suppresses Option composition" |

**Root cause (found only by testing the simplest possible case).** A diagnostic registered a *single-modifier* shortcut (`ctrl+h`, free) through the same
`pi.registerShortcut()` API, from inside a command handler — it never fired either, even though a built-in single-modifier binding (`ctrl+l`) did. Moving that
one registration to **extension load time** (the top-level factory call) made it fire immediately. Every "silent" attempt above had registered its shortcuts
inside `/kiln-smoke-init`'s handler, i.e. dynamically after load, which Pi accepts without error and then never dispatches. After moving
`registerKeys()` to load time (and making it take a `makeLive(ctx)` factory so no `ctx` is needed at registration — see `keys.ts`), `ctrl+alt+r` and
`ctrl+alt+m` fired on the first try in the human's terminal.

**What survives, and what does not.** Independently real and kept: bare `alt+<letter>` types a composed character (`©`, `®`, `µ`, `†`) in macOS terminals
regardless of registration — so `ctrl+alt+` stays preferred over bare `alt+`. **Withdrawn**: the encoding theories for attempts 2–4 (Ctrl+Shift collapsing to
Ctrl, function-key modifier loss, navigation-key signals) — they were never tested against a correctly-registered shortcut, so this document makes no claim
about whether those combinations would have worked. The final keymap is `ctrl+alt+r` / `ctrl+alt+m` / `ctrl+alt+t`; `r` and `m` are human-confirmed firing,
`t` (dismiss) is registered identically and still awaits a human keypress.

**Lesson (the third instance in this row).** `setStatus`≠`notify`, `registerShortcut`'s options-object shape, and now registration *timing* were all Pi
behaviours no offline fake could surface, because each fake encoded the same assumption as the code it tested. `keys.test.ts` now asserts the load-time
contract directly (handlers exist the moment `registerKeys` returns; `makeLive` is not called until a shortcut fires and is then memoized).

---

## Part B — The findings register (SQ1–SQ6) — to be completed by r9's own spike task

| # | Question | Answer so far | Status | Evidence / reproduce | Left for the spike task |
|---|---|---|---|---|---|
| **SQ1** | Real, free keybindings for Layer B/C raise and dismiss | `ctrl+alt+r` / `ctrl+alt+m` / `ctrl+alt+t` (D10). Registration is error-free for every candidate tried. **Firing**: `ctrl+alt+r` (Layer B) and `ctrl+alt+m` (Layer C / Gate-0 face) MEASURED firing in a real terminal (cmux) once registered at extension load time. `ctrl+alt+t` (dismiss) registered identically, not yet human-confirmed. Dynamic (in-handler) registration never fires — the cause of five earlier false negatives. | **M** (registration) · **M** (firing: r, m) · open (firing: t; any terminal other than cmux) | `verification-report.md` §5; `research.md` D10; a `ctrl+h` load-time vs in-handler diagnostic (`smoke-harness.ts`) | a human press of `ctrl+alt+t`; optionally re-run in Terminal.app, which failed earlier only because of the same registration-timing bug |
| **SQ2** | Overlay survival across `turn_end`/compaction | Undecided; r8 never left an overlay open across a turn boundary | **T** | — | the smoke test opens Layer B/C, then (if reachable without a real model) triggers a turn boundary and checks the overlay's state |
| **SQ3** | What identity Pi exposes for the operator | **Resolved by decision, not by Pi**: `KILN_HUMAN` (D4) — Pi itself exposes none (confirmed in r8) | **D** (r8) · decision **A** taken regardless | `research.md` (r8) SQ9-adjacent finding | none — this SQ is closed by D4, not by further measurement |
| **SQ4** | Exact `overlayOptions` for the full-width modal; does `nonCapturing` matter | Documented only (`tui.d.ts`'s field list); not run | **D** | `pi-tui`'s type declarations (read during r8 planning) | the spike sets explicit `overlayOptions` and the human smoke confirms the rendered width/position is acceptable |
| **SQ5** | Does Pi's overlay stacking do the right thing alone, or does KILN need its own guard | **Decided defensively**: KILN builds its own one-at-a-time guard regardless (D6) | **D** (`docs/tui.md` "Overlay Focus") · guard built regardless of the answer | — | the smoke test still exercises "open B while C is open" once, to confirm the guard actually prevents the double-open it's meant to prevent |
| **SQ6** | Does a late answer after a session switch ever reach `applyMove` with a stale token | **Reasoned, not yet measured**: closure identity should make `resumeByToken`'s existing check sufficient (D7) | **T** | r8 research SQ3 (the underlying Pi behaviour) | the smoke test (if feasible without a real model) attempts a session switch mid-gate and confirms no move is silently misapplied |

**Note on scope**: SQ2, SQ4 and part of SQ1 need a **real model** to trigger a genuine `turn_end` in a way RPC's model-free path cannot — per the spec's own
"Not r10" scoping (this row doesn't need a model for its *own* commands), the smoke test may need to fall back to a **manual** trigger (e.g. `/compact`) if a
model-driven turn boundary isn't practical to arrange; this is recorded as a plan-time uncertainty, not resolved here.
