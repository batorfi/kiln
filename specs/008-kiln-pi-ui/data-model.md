# Data model — r9 (KILN's real UI on Pi)

**Trace**: [spec.md](./spec.md) *Key Entities* · [research.md](./research.md) · [contracts/](./contracts)

r9 adds **no persisted data and no new `recordType`** (FR-005, FR-006 unchanged from r1/r2). Everything below is in-memory, or the *display* form of data r1/r2
already own. The only durable things r9 can cause are r1's existing `Wait` and `gate-completion` shapes — reused, not re-declared.

## E1 — `GateName` (D3)

`GATE_NAME: Record<GateId, string>` — a new, additive export in `kiln/contracts/move-vocabulary.ts`. `gateName(id)` returns the human name (`"spec"` for
`3`, `"gate0"` for the program gate). No new type; `GateId` is r1's existing union.

## E2 — `PresentedText` (D2)

The output of `present.ts`'s four functions (`presentHud`, `presentPopup`, `presentOverlay`, `presentGate0Face`): a plain `string`, always. **Invariant**: for
any `FactoryState`/`RoadmapHead`, `presentX(state)` differs from `renderX(state)` **only** by FR-015's three fixed substitutions — never by anything else. A
test asserts this by diffing the two outputs token-by-token and checking every diff is one of the three known kinds.

## E3 — `IdentityResult` (D4)

```
IdentityResult = { ok: true; decidedBy: string }        // decidedBy matches /^human@\S+$/
               | { ok: false; reason: string }          // KILN_HUMAN missing, empty, or malformed
```

`resolveIdentity()` is **pure** given an env object (defaults to `process.env`) — no I/O beyond reading the one variable, no caching beyond what the caller
does. An `ok: false` result is fed into the same `no-answer`-style handling FR-005 already defines: **no gate is answered without one**.

## E4 — `OverlayState` (D5, D6)

Private to `live-ctx.ts`: `{ layer: "B" | "C" | null }` — which KILN overlay (if any) currently owns a `custom()` call. Not exported, not persisted, reset
whenever the tracked overlay's `custom()` promise resolves. This is the enforcement point for FR-008 (mutual exclusion) and FR-009 (a `FactoryEvent`
firing while a `custom()` promise is pending must not corrupt or double-raise it): a redraw while `OverlayState.layer` is non-null re-renders that SAME
pending overlay's content in place — it never opens a second `custom()` call, and never drops the pending one silently.

## E5 — `LiveUICtx` (r3's existing interface, NC2 = A — reused, not redefined)

```
interface LiveUICtx {
  hasUI: boolean;
  setStatus(footer: string): void;
  raiseOverlay(layer: "A" | "B" | "C", content?: string | null): void;
}
```

r9 adds **one** concrete implementation (`makeLiveUICtx`, D5) satisfying this exact interface against a real `PiCtx` (r8's structural type). `live-tui.ts`'s
existing `attachLiveTui`/`LiveTuiSurface` and their tests are **unmodified** and now exercise a real body instead of a test double.

## E6 — The Gate-B question and the Gate-0 question (built from r1/r2's own vocabularies, never hand-written)

```
gateBQuestion(gate: Gate)  = { title: presentPopup(...)'s summary line, options: moveVocabulary(gate.id) }
gate0Question(head: RoadmapHead) = { title: presentGate0Face(...)'s summary line, options: GATE0_ADMISSION_MOVES }
```

Both are r8's existing `GateQuestion` shape (`kiln/pi/port.ts`) — no new question type. `gate0Question` uses `GATE0_ADMISSION_MOVES` (r2's existing export,
`["approve","revise","reject"]`), **never** the full `moveVocabulary("gate0")` (which also contains the roadmap-edit moves `edit-rows`/`add-row`/`drop-row`)
— matching the approved mockup, where those three are named as reachable via a separate command, not the selectable list (FR-003).

## E7 — `KeyBindings` (D10)

`kiln/ui/keymap.ts`'s three exported constants, values changed (not the shape): `LAYERB_KEY = "ctrl+alt+r"`, `LAYERC_KEY = "ctrl+alt+m"`,
`TOGGLE_KEY = "ctrl+alt+t"` (from the bare `g`/`M`/`?`). Checked against Pi's complete default-binding list; `r` and `m` are human-confirmed firing
in a real terminal, `t` registered identically and awaiting a human keypress. The original `alt+g`/`alt+m`/`alt+/` choice was dropped because bare
`alt+<letter>` types a composed character in macOS terminals; several interim choices were wrongly blamed on terminal encoding when the real cause
was shortcut-registration timing (research D10). `keymapIsConsistent()` (existing, unchanged) still asserts the three are pairwise distinct. The
shortcuts must be registered at extension **load time** via `registerKeys(pi, makeLive, opts)` (`makeLive` is built lazily and memoized).

## Relationships

`kiln/pi/ui/present.ts` → reads `kiln/contracts/move-vocabulary.ts`'s new `GATE_NAME` (E1) and wraps r1/r2's `renderHud`/`renderPopup`/`renderOverlay`/
`renderGate0Face` (all unmodified except `renderOverlay`'s column-width computation, D8) → `kiln/pi/ui/live-ctx.ts`'s `makeLiveUICtx` calls `present.ts` for
every surface's content, calls `kiln/pi/ui/identity.ts`'s `resolveIdentity` (E3) before ever building a question, calls r8's `askGate`/`interpret` (E6's
questions) and, on `answered`, calls r1's `applyMove` or r2's `recordGate0Decision`; on `no-answer` (including a bad identity), calls r1's `headlessWait` —
never a second path. `kiln/validate/ui-ready.ts` (NC3's automated half) drives this whole chain against a real, hermetic Pi the same way `PiReady` does.
