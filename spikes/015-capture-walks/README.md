# Spike 015 — capture the first program's walks as event streams (r15, T051)

`node spikes/015-capture-walks/capture.ts` — run by hand, once. Reads the frozen walkers (`legacy/src/walk.ts`) and the committed r7 files (`legacy/fixtures/`), writes `kiln/fixtures/walks/<name>.{jsonl,events.jsonl,refs.json,meta.json}` and prints what it captured and what it could not.

**Why here.** `kiln/` may not import `legacy/` (`kiln check boundaries`) and `legacy/` must stay byte-identical, so the capture lives in neither. The converter it uses is the one `kiln/packages/record` tests (`legacy-convert.ts`).

**Which old row is which** is an inference from the specs (`specs/002-kiln-lane`, `003-kiln-roadmap-overlay`, `006-kiln-live-inference`) and the walkers' own headers, not a record the first program kept: the stub walk is the lane runtime's, the program walk is the overlay's. Treat the `row` field of each `meta.json` accordingly.

**What it does not do.** It never reconstructs a stream by hand (Clarification Q3). r1 (no whole stream exists) and r8 (the Pi extension states that it does not touch the factory-log) are printed as missing with the reason and written to `kiln/fixtures/walks/MISSING.json`; the check (`kiln check record`) reports `3 of 5 named walks` and lists them.

Determinism: the walkers use the first program's deterministic clock, so a second run rewrites identical bytes (`git diff` shows nothing).
