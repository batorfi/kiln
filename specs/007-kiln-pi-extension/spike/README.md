# spike/ — reproducing the r8 measurements (T008–T012)

**Throwaway evidence.** These scripts are not part of the KILN toolchain, are not shipped, and are not scanned by the P-VIII guard (they are Python and live under `specs/`).
They exist so that every **M** (measured) cell in [`../research.md`](../research.md) Part B can be re-run by anyone with Pi installed.

Every script drives a **real Pi**, hermetically: `PI_CODING_AGENT_DIR` is a fresh empty temp dir (removed afterwards), `--offline`, `--no-session` (or a temp `--session-dir`),
**no model is called** (extension commands run before the LLM) and the operator's `~/.pi` is never read or written. A hard deadline kills Pi, so nothing here can hang.

| Script | Answers | Run |
|---|---|---|
| `pirpc.py` | the harness (`PiRpc`, `headless`) | imported by the others |
| `sq04_matrix.py` (+ `matrix-ext.ts`) | **SQ4** — every reachable `ctx.ui` cell in `rpc` / `json` / `print` | `python3 sq04_matrix.py` |
| `sq07_sq11.py` (+ `out-ext.ts`) | **SQ7** — is `confirm`'s `false` conflated; **SQ11** — where `console.log` goes in `rpc` | `python3 sq07_sq11.py` |
| `sq03_lifecycle.py` (+ `life-ext.ts`) | **SQ3** — `new_session` / `switch_session` / `fork` / `clone` / `/reload`, and a dialog answered after a session switch | `python3 sq03_lifecycle.py` |
| `sq09_models.py` | **SQ9** — what an empty-config Pi reports about models (measure only; the decision is r10's) | `python3 sq09_models.py` |

Requires `pi` on `PATH` (or `KILN_PI_BIN`) and Python 3. Measured with Pi `0.85.1` on macOS. Terminal-only cells (**T**) cannot be run here; the human smoke (quickstart §5) covers them.
