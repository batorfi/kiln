# Quickstart — validating r9 (KILN's real UI on Pi)

**Trace**: [spec.md](./spec.md) SC-001..SC-008 · [contracts/](./contracts) · runnable **as each piece lands**.
Prerequisites: same as r8 — Node `^22.18.0 || >=23.6.0`; Pi `0.85.1` on `PATH`. Verified on macOS.

## 1. The presentation wrapper, offline (SC-001, SC-008)

```bash
cd kiln && npm test -- tests/pi/ui/present.test.ts   # presentX(state) vs renderX(state): diffs only at the three named transforms
```
**Expect:** every fixture's diff is classified as exactly one of gate-name / timestamp / header-wording; `renderHud`/`renderPopup`/`renderOverlay`/
`renderGate0Face` are asserted byte-for-byte unmodified against r8's close-out commit (the r7/r8 "untouched" pattern, extended to cover `renderOverlay`'s
column-width change as a *declared* exception, not a silent one).

## 2. Identity resolution, offline (SC-002, SC-007)

```bash
KILN_HUMAN=human@batorfi node --test tests/pi/ui/identity.test.ts   # ok:true, decidedBy="human@batorfi"
node --test tests/pi/ui/identity.test.ts                             # KILN_HUMAN unset -> ok:false, a named reason
KILN_HUMAN=nobody node --test tests/pi/ui/identity.test.ts           # malformed (no "human@" prefix) -> ok:false
```

## 3. `UiReady` — the automated half of NC3 (SC-002..SC-004)

```bash
npm run ui-ready                              # -> READY (composes on PiReady)
npm run ui-ready -- --no-identity             # -> FAIL non-answer-approved (a valid move, no identity, must not apply)
npm run ui-ready -- --gate0-vocabulary-leak   # -> FAIL gate0-vocabulary-leak
npm run ui-ready -- --overlay-not-exclusive   # -> FAIL overlay-not-exclusive
```
**Expect:** each hook fails with exactly its named code, mirroring `pi-ready`'s own discipline; the default run is READY.

## 4. The keymap (SC-005)

```bash
node --test tests/pi/ui/keymap.test.ts   # LAYERB_KEY/LAYERC_KEY/TOGGLE_KEY each match the Key Format regex, pairwise distinct
```

## 5. The human terminal smoke (FR-013, NC3 = B) — **one person, once, a real terminal, ~10 minutes**

RPC cannot draw an overlay or press a key — this is the part automation cannot reach. **Status**: steps 1–3 were run by `human@batorfi`
(footer, `ctrl+alt+r`, `ctrl+alt+m` all confirmed); steps 4–9 remain — see [`verification-report.md`](./verification-report.md) §5.

`kiln/pi/index.ts` (r8-owned, canonical) never calls `makeLiveUICtx()`/`registerKeys()` — permanent wiring is r11's job. Use the throwaway
harness built for this: [`smoke-harness.ts`](./smoke-harness.ts) (not part of r9's delivered API; it wires the already-tested
`present.ts`/`live-ctx.ts`/`keys.ts` over a fixture `Gate`/`RoadmapHead`). **Shortcuts must be registered at extension load time** —
the harness does so; a shortcut registered inside a command handler is accepted but never fires (the cause of five false "this key
doesn't work" results found during this very test; see `research.md` D10).

1. `export KILN_HUMAN=human@<your-name>` then `pi -e specs/008-kiln-pi-ui/smoke-harness.ts` from the repo root, in a real terminal.
   The shortcuts are live from load; run `/kiln-smoke-init` once to push the footer.
2. Footer (Layer A) shows `rail=spec lane=r9 switches=3 clock=HH:MM:SS` — human-readable gate name, not the numeric id.
3. Press **`ctrl+alt+r`**. **Expect:** Layer B's card (`popup · spec OPEN — …`). The popup is a **two-step** flow: press **Enter** to dismiss
   the card, then pick a move in the list that appears (`approve`/`revise`/`reject` = `moveVocabulary(3)`).
4. `/kiln-smoke-check`. **Expect:** `APPLIED move=… decidedBy=<your KILN_HUMAN>`.
5. Press **`ctrl+alt+m`**. **Expect:** the distinct Gate-0 face (the fixture head is `pending`); the list offers **only**
   `approve`/`revise`/`reject`, never `edit-rows`/`add-row`/`drop-row`. Answering it records via `recordGate0Decision`.
6. Press **`ctrl+alt+t`**. **Expect:** the open overlay dismisses back to Layer A.
7. **Mutual exclusion**: relaunch (the fixture gate is already resolved), press `ctrl+alt+r`, then — without answering — `ctrl+alt+m`.
   **Expect:** the popup closes before the Gate-0 face opens, never both; `/kiln-smoke-check` then reads `WAITING (token=g3)`.
8. If practical without a real model: `/compact` or a session switch while a popup is open, then check a later answer was applied to the right
   gate or refused as stale (SQ6) — if not practical, record that plainly rather than guessing.
9. Record in the **verification report**: done / not done, your name, the date, Pi version, terminal, what was seen at each step (especially
   whether `ctrl+alt+t` fired), and anything odd.

If any step's *Expect* is wrong the row **does not close**: an unidentified `decidedBy` reaching the log, a leaked Gate-0 vocabulary, or two
overlays open at once are all P-I/P-V/P-VI failures, not cosmetic ones.

## Outcome → success-criteria map

| Section | Proves |
|---|---|
| 1 | SC-001, SC-008 |
| 2 | SC-002, SC-007 |
| 3 | SC-002, SC-003, SC-004 |
| 4 | SC-005 |
| 5 | SC-002, SC-003 (the terminal half), and the still-open parts of SQ1/SQ2/SQ4/SQ6 |
