# Quickstart — validating r8 (KILN on Pi)

**Trace**: [spec.md](./spec.md) SC-001..SC-009 · [contracts/](./contracts) · runnable **as each piece lands**; §1 works today.
Prerequisites: Node `^22.18.0 || >=23.6.0`; **Pi `0.85.1`** on `PATH` (`pi --version`); Python 3 only for §1. Verified on macOS.

## 1. Re-run the measurements that already exist (works today — SC-001 evidence)

```bash
cd specs/007-kiln-pi-extension/pre-spec-probe
python3 drive.py answer     # SELECT_RESULT "approve"   CUSTOM_RESULT null   (rpc: hasUI true, custom undefined)
python3 drive.py cancel     # SELECT_RESULT null
python3 drive.py silent     # SELECT_RESULT null after ~4.2 s   (Pi's own timeout)
```
Real Pi, empty config dir, `--offline`, **no model called**. Throwaway evidence; r8's own spike and `PiReady` supersede it.

## 2. The suite (SC-005)

```bash
cd kiln && npm test          # Pi tests run when `pi` is found, and skip WITH A PRINTED REASON when it is not
KILN_PI=1 npm test           # demand the Pi tier: a missing or unmeasured Pi FAILS (F-1)
KILN_PI=0 npm test           # skip it explicitly
npm run test:pi              # = KILN_PI=1, restricted to tests/pi/; REFUSES a run in which no `PI-LIVE:` test passed
```
**Expect:** 0 newly failing tests; the suite's earlier count unchanged; the new `tests/pi/` files listed. A run with `KILN_PI=1` that executes zero Pi tests fails.

## 3. `PiReady` — loads KILN into real Pi and fails by name (SC-002, SC-003, SC-004, SC-009)

```bash
cd kiln && npm run pi-ready                 # → READY — Pi 0.85.1; both commands via -e and via `pi install`; every non-answer → no-answer
npm run pi-ready -- --no-pi                 # → FAIL pi-missing
npm run pi-ready -- --old-version           # → FAIL pi-version-unmeasured
npm run pi-ready -- --bad-entry             # → FAIL extension-load-error
npm run pi-ready -- --throw-on-load         # → FAIL extension-load-error   (never hangs)
npm run pi-ready -- --no-command            # → FAIL command-missing
npm run pi-ready -- --wrong-status          # → FAIL round-trip-mismatch
npm run pi-ready -- --approve-non-answer    # → FAIL non-answer-approved     ← the check that matters most
npm run pi-ready -- --bad-manifest          # → FAIL manifest-load-error
npm run pi-ready -- --plant-autoload        # → FAIL autoload-present
npm run pi-ready -- --extra-process         # → FAIL allowlist-not-single
npm run pi-ready -- --extra-loopback        # → FAIL allowlist-not-single
```
**Expect:** READY in **under 5 s** for the round trip (SC-002); each hook fails with **exactly its named failure**, never a pass and never a hang; a **skip** (no Pi, `KILN_PI` unset) prints its reason and exits non-zero.

## 4. Load it yourself, without touching your own Pi settings

```bash
# one run, explicit:
pi -e kiln/pi/index.ts
# as a package, into a THROWAWAY config dir (your ~/.pi is untouched):
export PI_CODING_AGENT_DIR="$(mktemp -d)"; PI_OFFLINE=1 pi install ./kiln && pi list
```
Inside Pi: `/kiln-status`. Headless: `pi -p "/kiln-status"` prints the status on **stderr** (Pi keeps stdout for its own protocol; `notify` prints nothing there).

## 5. The human terminal smoke (FR-016, SC-008) — **one person, once, a real terminal, ~5 minutes**

Automation cannot reach the terminal (RPC's `custom()` returns `undefined`). This is the part it cannot prove.

1. In a real terminal at the repository root, run `pi -e kiln/pi/index.ts`. *(Pi may ask you to choose a model or log in; extension commands run before the model, so you may dismiss that. Note what you saw.)*
2. Type `/kiln-status`. **Expect:** a `KILN status …` block naming the roadmap rows and the next eligible row, and `lane: none`.
3. Type `/kiln-selftest`. **Expect:** first an **overlay** is drawn — close it with Enter/Esc — then a **question** with options. Choose **`approve`**. **Expect:** `SELFTEST mode=tui canAsk=true canDraw=true outcome=answered:approve`.
4. Run `/kiln-selftest` again; this time press **Esc** at the question. **Expect:** `outcome=no-answer:dismissed` — *not* `answered`.
5. Record, in the **verification report**: **done** / **not done**, **your name**, **the date**, the **Pi version**, the **terminal**, what you saw at each step, and *anything odd* (overlay flicker, focus, a key that did something else). Anything odd feeds SQ5/SQ6 (→ r9).

If any step's *Expect* is wrong the row **does not close**: a `no-answer` that shows as `answered` is a P-V failure.

## 6. Finishing the findings register (the spike task — FR-001, SC-001)

Open [research.md](./research.md) Part B. For every **D** cell reachable in `rpc`/`json`/`print` (SQ3, SQ4, SQ7, SQ9, SQ11), run it with the driver in `validate/_pi-driver.ts` (or a scratch script), and replace **D** with **M** plus the command. Leave **T** (terminal) and **→rN** cells with their reason.
**Expect:** no blank row; no **D** cell described as *confirmed*; Part C's corrections applied to `docs/concepts/ui-layers-deep.md` as an append-only banner (SC-006).

## Outcome → success-criteria map

| Section | Proves |
|---|---|
| 1, 6 | SC-001, SC-006 |
| 2 | SC-005 |
| 3 | SC-002, SC-003, SC-004, SC-009 |
| 4 | SC-002 (by hand), SC-009 |
| 5 | SC-008 (and the terminal half of SC-003) |
| the layout note (`kiln/pi/README.md`) read by a human at the plan gate | SC-007 |
