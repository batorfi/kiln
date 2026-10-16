# Contract — the presentation wrapper (E1, E2)

**Trace**: FR-001, FR-002, FR-003, FR-015 · SC-001, SC-008 · [research.md](../research.md) D2, D3 · [data-model.md](../data-model.md) E1, E2

## P1 — Exactly three transforms, each a fixed substitution

`present.ts` calls the real render function first, unmodified, then applies **exactly** these three transforms, in this order, and no others:

1. **Gate names.** Any occurrence of a bare gate id in a gate-referring position (`gate${id}`, a trailing ` ${id}` after "OPEN"/"at gate", the numeric id
   inside a `rail=` reading) is replaced by `gateName(id)` (`kiln/contracts/move-vocabulary.ts`'s new export, research D3). `gate0` never changes (it has no
   numeric form to replace).
2. **Timestamps.** Any ISO-8601 value (`/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/`) is replaced: inside a `clock=` reading, with a **time-only** `HH:MM:SS`;
   elsewhere (a `gate0.at`-style record), with a **full date** `D MMM YYYY, HH:MM UTC`. Both forms come from one small formatter using fixed
   `Intl.DateTimeFormat` options (`timeZone: "UTC"`) — never a locale guess, never a relative ("3 minutes ago") form.
3. **Header wording.** Four exact string replacements (verbatim from `ui-mockups.md`, quoted here so a diff against this file is the review's own record):
   - `presentPopup` only: `" — moves [" + moveVocabulary(gate.id).join(", ") + "]"` → *(dropped entirely)* — the same moves are already the selectable list.
   - `presentOverlay`/`presentGate0Face` only:
     - `"=== Roadmap · Layer C — Gate 0 " + status.toUpperCase() + " · " + rows + " ==="` → `"=== Roadmap — " + head.deliverable + " ==="`
     - `"gate0 · " + status + " · decided_by " + by + " · at " + at` → `"Gate 0: " + status + " by " + by + " · " + <the formatted date from transform 2>`
     - `"=== GATE 0 — ROADMAP (the program gate; human-only, P-VI) ==="` → `"=== Gate 0 — " + head.deliverable + " ==="`
     - `"program: " + head.deliverable` → *(dropped — folded into the header above)*
     - `"gate0 head: pending"` → `"Status: pending — awaiting your decision"`

## P2 — The invariant a test enforces

For any fixture `state`/`head`: `presentX(input)` and `renderX(input)` differ **only** at the spans P1 names. A test builds several fixtures spanning
different gate ids, different timestamps, and both `gate0.status` values, and asserts the diff between raw and presented output never touches anything
outside those three transform kinds — a change to `present.ts` that starts rewriting something else is caught by this test, not discovered later by a human.

## P3 — What never changes

`renderHud`, `renderPopup`, `renderOverlay` (except its column-width computation, contract `overlay-columns.md`... *(folded into this same row's plan, not a
separate contract — see research D8)*) and `renderGate0Face` are **byte-for-byte unmodified** as functions: same signature, same inputs produce the same raw
string they always did. `present.ts` never mutates its input, never writes anything, and is called **after** the render, never instead of it.

## P4 — Failure mode

`present.ts` never throws for a well-formed `FactoryState`/`RoadmapHead` (the same ones r1/r2's own tests already exercise). A malformed gate id or timestamp
(one the fixed regex doesn't match) is passed through **unchanged** — a missing transform degrades to "less pretty," never to a thrown error that could take
down a live gate's popup.
