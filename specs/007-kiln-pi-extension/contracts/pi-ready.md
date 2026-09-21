# Contract — `PiReady`, the probe that starts a real Pi (E6)

**Trace**: FR-010, FR-011, FR-014, FR-015 · SC-002..SC-004, SC-009 · [research.md](../research.md) D6, D8, D9 · sibling of r7's [ollama-ready.md](../../006-kiln-live-inference/contracts/ollama-ready.md)

The **fifth** probe in the chain `RuntimeReady → OverlayCReady → LiveModelReady → OllamaReady → PiReady`, and the second that touches something real. It composes on the earlier probes (they stay static and runnable with no Pi).

## R1 — Hermetic by construction

Every Pi it starts gets: `PI_CODING_AGENT_DIR` = a **fresh empty temp dir**; `--offline` (and `PI_OFFLINE=1`); `--no-session`; `--mode rpc`; and **no model, no API key** — extension commands are handled before the LLM (M2), so none is called.
The operator's `~/.pi` is never read or written. The temp dir is removed in a `finally`. Pi writes `auth.json` and `models-store.json` into it (measured); nothing else escapes.
**A deadline bounds everything** (default 30 s overall, 10 s per step): on expiry the process is killed and the probe fails with `timeout` — it **never hangs** (SC-004).

## R2 — The checks, each with the name it fails by, and a falsify hook

| # | Check | Fails as | Hook |
|---|---|---|---|
| a | `pi --version` runs and exits 0 | `pi-missing` | `--no-pi` (point at an absent binary) |
| b | the version is in `MEASURED_PI_VERSIONS` (`["0.85.1"]`) | `pi-version-unmeasured` | `--old-version` (claim `0.0.0`) |
| c | starting Pi with `-e kiln/pi/index.ts`, `get_commands` answers and stderr carries no *Failed to load extension* | `extension-load-error` | `--bad-entry`, `--throw-on-load` (fixture entries) |
| d | both `kiln-status` and `kiln-selftest` are listed with `source: extension`, matched by `sourceInfo.path` under `kiln/pi/`, `:n` suffix tolerated | `command-missing` | `--no-command` |
| e | running `kiln-status` returns a `KILN status` line whose row count **equals the count parsed from `specs/ROADMAP.md`** by `extractHead` — the truth, not a canned string | `round-trip-mismatch` | `--wrong-status` |
| f | the seam, against **real Pi's** shapes — see R2.1 | `non-answer-approved` | `--approve-non-answer` (a fixture entry whose `interpret` maps `undefined` to `answered`) |
| g | `pi install <kiln>` into a **fresh** temp dir, then Pi **without `-e`** lists both commands (`origin: package`) | `manifest-load-error` | `--bad-manifest` (installs `fixtures/pi/bad-manifest/` instead) |
| h | no `.pi/extensions/` entry for KILN exists in the repository | `autoload-present` | `--plant-autoload` |
| i | the P-VIII scan (now including `pi`) is green **and** both allowlists have exactly one entry | `scan-red` / `allowlist-not-single` | `--extra-process`, `--extra-loopback` |

### R2.1 — Check (f), the real-Pi shapes

`kiln-selftest` is run in each way below; the probe plays the human on stdin. **Every row that is not the control MUST report `no-answer`** — any `answered` where the driver did not choose an option is `non-answer-approved`.

| Shape | How the driver produces it | Expected `SELFTEST` outcome |
|---|---|---|
| **control** | RPC: replies with `value: "approve"` | `answered:approve` — proves the probe *can* see an answer (a probe that can never say "answered" proves nothing) |
| cancel | RPC: replies `cancelled: true` | `no-answer:dismissed` |
| timeout | RPC: `kiln-selftest timeout`, the driver stays silent | `no-answer:dismissed` (after Pi's own timeout) |
| print | `pi -p "/kiln-selftest"` | `no-answer:cannot-ask`, exit 0, on **stderr** |
| json | `pi --mode json "/kiln-selftest"` | `no-answer:cannot-ask`, on **stderr** |
| rpc overlay | (the same RPC run) | `canDraw=false` — the overlay is *hidden*, not shown, and the run continues |

The TUI row is **not automatable** and is FR-016's human smoke ([quickstart.md](../quickstart.md) §5).

## R3 — Skip is never a pass

With no Pi found (and `KILN_PI` unset) the probe returns `skipped: true`, `ready: false` and a **non-empty** `skipReason`; with `KILN_PI=1` it **fails** instead (D8). A skip with no reason is itself a violation. It runs **no gate** and admits **no program** (P-VI).

## R4 — Versions (FR-015)

`MEASURED_PI_VERSIONS` is **one constant**. The probe prints the version it ran. The README states the measured version(s); a test pins the README to the constant.

## R5 — The driver, and the one process the scan allows

`validate/_pi-driver.ts` is the **only** module permitted to import `node:child_process`. It is the sole entry of `PROCESS_ALLOWLIST` in `validate/_netscan.ts` (`["validate/_pi-driver.ts"]`), enforced by the same
**exactly-one** rule as the loopback list (`--extra-process` adds a second and must fail the probe). It:

- spawns with an **argument array and `shell: false`** — never a shell string;
- spawns **only `pi`**: it refuses a binary whose basename is not `pi` (or `pi.cmd`), by name (`pi-bin-refused`); `KILN_PI_BIN` may point at a *different path* to a `pi`, never at another program;
- exposes a tiny RPC client (`get_commands`, `prompt`, `extension_ui_response`) and the deadline.

The scan still forbids every network module and every network call in that file; only the `child_process` import is exempted (`scanText` gains an optional `processAllowlist`, default `PROCESS_ALLOWLIST`).

## R6 — CLI and exit codes

`node validate/pi-ready.ts [--no-pi|--old-version|--bad-entry|--throw-on-load|--no-command|--wrong-status|--approve-non-answer|--bad-manifest|--plant-autoload|--extra-process|--extra-loopback]`
Exit `0` iff `ready`; `1` on any named failure; a **skip exits non-zero** (`KILN_PI` unset and no Pi: exit `2`, reason printed) so a wrapper cannot mistake it for READY. `npm run pi-ready` runs it from `kiln/`.
