# UI mockups — Layers A, B, C (r9) — **approved 2026-09-23**

**Trace**: [spec.md](./spec.md) FR-001–003, FR-015 · SC-001, SC-008.

These four mockups were reviewed and approved by `human@batorfi` before the spec was accepted. Nothing here is invented ASCII art: the **content** of each is
genuine output from the real, already-committed render functions (`renderHud`, `renderPopup`, `renderOverlay`, `renderGate0Face`), and the **chrome** (the
border style, the selection-list shape, the footer layout) is reconstructed from what real Pi actually drew in a terminal during r8's own human smoke test —
not guessed. Where a mockup shows something the current code does **not** yet produce, that gap is named below, not hidden.

---

## Layer A — the footer

```
╔══════════════════════════════════════════════════╗
║ kiln: rail=spec lane=008-kiln-pi-ui switches=3   ║
║ 0.0%/0 (auto)                            unknown ║
║ ~/repos/software-factory-template (main)         ║
╚══════════════════════════════════════════════════╝
```

- `rail=spec lane=008-kiln-pi-ui switches=3` is `renderHud`'s real output, with one FR-015 substitution: `spec` in place of the raw `gate3`/`3`. The clock
  field is **intentionally omitted** here per the approved design (removed from Layer A only; Layer C's clock fields were kept — see below).
- `0.0%/0 (auto) … unknown` and the cwd/branch line are Pi's own footer segments, reordered so the KILN line sits on top, per the earlier round of feedback.
- The double-line box (`╔ ═ ╗ ║ ╚ ╝`) is a **design choice**, not measured Pi chrome — Pi's own default border style (observed) is a single `─` line. If Layer
  A is ever drawn this way for real, it needs `ctx.ui.setFooter`'s custom-component path, not the plain `setStatus` call FR-001 currently assumes. This is
  unresolved and should be confirmed in the plan (relates to SQ4).

## Layer B — the gate popup

```
╔═════════════════════════════════════════════════╗
║ popup · spec gate OPEN                          ║
║                                                 ║
║ → approve                                       ║
║   revise                                        ║
║   reject                                        ║
║                                                 ║
║ ↑↓ navigate  enter select  escape/ctrl+c cancel ║
╚═════════════════════════════════════════════════╝
```

- The header line is `renderPopup`'s real output with two FR-015 substitutions: the gate-name substitution (`spec` for `3`), and the trailing
  `— moves [approve, revise, reject]` clause **dropped** — it's redundant once the same moves are shown as the selectable list right below, and repeating
  them in the header added noise, not information. This is another FR-015(c)-style wording transform, alongside Layer C's two header rewrites.
- The move list (`approve, revise, reject`) shown as **options** is `moveVocabulary(3)` — real, not hand-written; FR-002 requires this stay driven by the
  vocabulary, never a maintained copy. Dropping it from the header text does not remove it from the row's requirements — it is still the actual selectable
  list, just shown once, not twice.
- The `→`/highlight selection style and the `↑↓ navigate … escape/ctrl+c cancel` hint line are the exact shape Pi drew for the real `Gate?` selection screen
  observed during r8's smoke test — this part **is** measured, not invented.

## Layer C — plain table (Gate 0 approved)

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ === Roadmap — kiln-v1 ===                                                     ║
║ Gate 0: approved by human@batorfi · 22 Sep 2026, 17:56 UTC                    ║
║ Firing order: r1 → r7 → r8 → r9 → r10                                         ║
║                                                                               ║
║ r1   (done)    core single-lane runtime      [deps: —]       → @PR#1          ║
║ r7   (done)    true live local inference     [deps: r3]      → @PR#4          ║
║ r8   (done)    the Pi extension foundation   [deps: r7]      → @PR#5          ║
║ r9   (active)  kiln-v1 real UI on Pi         [deps: r2,r8]   → at spec — HERE ║
║ r10  (queued)  role agents and model tiers   [deps: r8]      eligible         ║
║                                                                               ║
║ rail=spec lane=r9 switches=3 · composes with Layer A + B                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

- The row data (ids, statuses, short descriptions, deps, outcomes) is `renderOverlay`'s real content for the fixture roadmap used throughout this review.
- **Column alignment is a gap, not a fact.** The real `renderOverlay` today builds each row with hand-placed literal spaces, not computed per-column widths
  — it does **not** line up once row descriptions vary in length. The clean alignment shown here needs a small change to `renderOverlay` (compute column
  widths from the row set before formatting). **Not yet added as a requirement** — flagged in review, not resolved; needs a decision before the plan.
- The header was rewritten for the person reading it, dropping internal-only tokens (`Layer C`, the `r9..r11,r4..r6` bookkeeping range, the raw
  `gate0 ·`/`decided_by`/`at` field-name style) in favour of plain sentences — this exact wording is now **FR-015(c)**, a fixed, tested substitution.
- The Gate-0 `at` timestamp (`22 Sep 2026, 17:56 UTC`) uses FR-015's full-date form; the footer `clock=` field intentionally has **no** clock shown, matching
  the same choice made for Layer A above (kept in the footer line's *position*, dropped as a *value*, since `switches=3` still needs somewhere to sit).

## Layer C — the Gate-0 face (pending admission)

```
╔═══════════════════════════════════════════════════════╗
║ === Gate 0 — kiln-v1 ===                              ║
║                                                       ║
║   r1   |  core single-lane runtime     |  deps: —     ║
║   r7   |  true live local inference    |  deps: r3    ║
║   r8   |  the Pi extension foundation  |  deps: r7    ║
║   r9   |  kiln-v1 real UI on Pi        |  deps: r2,r8 ║
║   r10  |  role agents and model tiers  |  deps: r8    ║
║                                                       ║
║ Status: pending — awaiting your decision              ║
║                                                       ║
║ → approve                                             ║
║   revise                                              ║
║   reject                                              ║
║                                                       ║
║ ↑↓ navigate  enter select  escape/ctrl+c cancel       ║
║ edit-rows / add-row / drop-row via a separate command ║
╚═══════════════════════════════════════════════════════╝
```

- The row data is `renderGate0Face`'s real content for the same fixture.
- Same FR-015(c) substitution as the plain table: `renderGate0Face`'s real output today reads `=== GATE 0 — ROADMAP (the program gate; human-only, P-VI)
  ===` and `program: kiln-v1` as a separate line, `gate0 head: pending` for status — all constitution/field-name phrasing, reworded here for the reader.
- **FR-003 is unaffected**: this face still offers only `moveVocabulary("gate0")`'s admission subset (`approve`/`revise`/`reject`) as the selectable list;
  the three roadmap-edit moves (`edit-rows`/`add-row`/`drop-row`) are named as available via a separate command, never mixed into this list — the
  disjointness FR-003 requires between this face and Layer B's per-gate card is preserved.

---

## Open items for the plan

1. **Column alignment in `renderOverlay`** — needs a small, additive change (computed column widths) before the plain-table mockup's layout is genuinely
   achievable; currently unspecified.
2. ~~Header/copy simplification~~ — **resolved**: folded into FR-015 as its third transform (a fixed, tested set of substitutions — see spec.md).
3. **Layer A's decorative double-line border** — not measured Pi chrome; if kept, implies `setFooter`'s custom-component path rather than plain `setStatus`.
