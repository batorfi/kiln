# Code review report — 007-kiln-pi-extension (r8)

**Verdict: three real defects found, all fixed in this same pass, and re-verified.** The review targeted the seam's order of checks,
the driver's spawn surface, and the two `_netscan.ts` changes, per `plan.md`'s "Risks" and "Delivery order" close-out note. All fixes are
already in the working tree and covered by new or strengthened tests; nothing here is deferred.

| | |
|---|---|
| **Feature** | r8 — KILN on Pi (`specs/007-kiln-pi-extension/`) |
| **Reviewed state** | the uncommitted working tree, after T001–T049 |
| **Reviewed** | 2026-09-22 |
| **Method** | close reading of `_pi-driver.ts`, `pi-ready.ts`, `outcome.ts`, `port.ts`, `index.ts`, `status.ts`, `selftest.ts`, `output.ts`, and the `_netscan.ts` diff, plus targeted empirical checks (spawning a real broken binary, inspecting real Pi's response to a broken package manifest, diffing temp directories before/after a probe run) — not a re-run of the mutation sweep, which `mutation-log.md` already covers |

---

## Findings at a glance

| # | Severity | File | One line |
|---|---|---|---|
| CR-1 | **High** | `_pi-driver.ts` | `RpcSession` had no `error` listener on its child process — a misconfigured `KILN_PI_BIN` (right basename, wrong path) crashed the whole Node process instead of failing cleanly |
| CR-2 | **Medium** | `pi-ready.ts` | Check (g)'s `--bad-manifest` hook hardcoded the failure (`!opts.hooks?.badManifest`) instead of observing Pi's real behaviour — the check was not testing what its own name and comment claimed |
| CR-3 | **Low** | `_pi-driver.ts` | `RpcSession`'s internal 30 s auto-close timer was never cleared by an early `close()`, and a genuinely failed `install()` in `openRpcFromPackage`'s error branch left its temp agent directory behind |

---

## Findings in detail

### CR-1 — an unhandled `error` event could crash the whole process (High)

**Where**: `kiln/validate/_pi-driver.ts`, `RpcSession`'s constructor.

**What was wrong**: `launch()` (the one-shot path) registers `child.on("error", …)`, but `RpcSession` (the long-lived RPC path) did not.
Node's documented behaviour for a `ChildProcess` with no `error` listener is to **throw**, crashing the process. Measured directly:

```js
const { spawn } = require("node:child_process");
spawn("/definitely/not/a/real/binary-xyz", [], { stdio: ["pipe","pipe","pipe"] });
// node:events:505
//     throw er; // Unhandled 'error' event
```

`isAllowedBinary()` only checks the **basename** ("pi" or "pi.cmd"), not that the path resolves to a real executable — so
`KILN_PI_BIN=/some/typo/path/pi` would pass the basename check, reach `RpcSession`, and crash **the entire test run or `PiReady`
invocation**, not just report one failed check. This is the exact class of bug P-V/SC-004 exist to prevent: a broken environment must
fail by name, never bring down the caller.

**Fix**: `RpcSession` now attaches `child.on("error", …)` (records `this.spawnError`) and `child.stdin.on("error", …)` (swallows EPIPE);
`send()` no-ops once the session is known-dead instead of writing to a closed stream; `waitFor()` returns `null` immediately once
`spawnError` is set, instead of waiting out the full timeout.

**Verification**: a new test spawns `openRpc(..., { bin: "<tmpdir>/pi" })` where that exact path does not exist. Before the fix this
measurably crashed the test file; after the fix, `session.call(...)` resolves `null` in under 500 ms and the file completes normally.
(`kiln/tests/pi/pi-driver.test.ts`, "RpcSession does NOT crash the process…" and "…returns quickly, without waiting out the full timeout".)

### CR-2 — check (g) hardcoded its own answer instead of observing Pi (Medium)

**Where**: `kiln/validate/pi-ready.ts`, the package-manifest check.

**What was wrong**: the original line was

```ts
const manifestOk = installResult.ok && !opts.hooks?.badManifest;
```

— i.e. "ok unless the hook says otherwise," regardless of what actually happened. Measured directly: `pi install` on
`fixtures/pi/bad-manifest/` (a manifest naming a file that does not exist) returns **`ok: true`** — Pi accepts the install and only
*silently drops* the broken extension when it later tries to load it. The real, observable signal was already available
(`get_commands` simply never lists `kiln-status`), but the code never looked at it for this hook, because `manifestOk` was forced
`false` first. The check's own comment ("loads KILN without -e") and its failure code (`manifest-load-error`) both imply it is testing
a real load failure; it was not — it was testing whether a boolean flag was set.

**Consequence if left**: a **real** regression that broke `pi install` for a completely unrelated reason (say, a future Pi version
that *does* reject the manifest at install time, changing `installResult.ok` to `false` in the un-hooked path) could go unnoticed,
because the hooked path was never exercising the failure condition the check exists to catch — only exercising its own hook flag.

**Fix**: `manifestOk` was removed; the check now uses `installResult.ok && commandsPresent` unconditionally, exactly the same in the
hooked and un-hooked paths. The `--bad-manifest` hook only changes *which package directory* is installed (already correct); the
check itself no longer knows or cares that a hook exists.

**Verification**: `kiln/tests/pi/pi-live.test.ts`'s `--bad-manifest` test now asserts the check's detail string explicitly —
`install.ok=true` (proving the install itself succeeded, as measured) **and** `commandsPresent=false` (the real, observed failure) —
rather than merely asserting the failure code appeared.

### CR-3 — a stale timer and a leaked temp directory on a rare failure path (Low)

**Where**: `kiln/validate/_pi-driver.ts` (`RpcSession.close()`) and `kiln/validate/pi-ready.ts` (check g's error branch).

**What was wrong**: (a) `RpcSession`'s constructor scheduled `setTimeout(() => this.close(), deadline)` but never stored or cleared the
handle — calling `close()` early left the timer armed for its full 30 s, calling `close()` a second time later (`.unref()`'d, so it
never blocked process exit, but still needless work and a second `child.kill()`/`rmSync()` pair). (b) `openRpcFromPackage`'s failure
branch (`!installResult.ok`) calls `install()` with `keepAgentDir: true`, but on failure that directory is never removed by anyone —
the fallback `RpcSession` constructed in that branch owns a **different**, fresh agent directory. This path is not exercised by any
current fixture (every fixture makes `pi install` succeed; see CR-2), so it is a **latent** leak, not an observed one today — but it is
real and reachable (e.g., a nonexistent `packageDir`).

**Fix**: `RpcSession` now stores its deadline timer and clears it in a now-idempotent `close()`. `checkPiReady`'s check-g `finally`
block now removes `installResult.agentDir` directly whenever `installResult.ok` is false.

**Verification**: a new offline test confirms `close()` can be called twice without throwing.

---

## Verified sound (checked, did not reproduce)

- **The seam's order of checks** (`outcome.ts`'s `interpret`: `cannot-ask` → `dismissed` → `wrong-type` → `not-offered` → `answered`) —
  re-read against the S3.1 truth table and the T022 mutation log; unchanged, and still correct. No new finding.
- **The driver's spawn surface** — `shell: false` everywhere, an argument array never a shell string, exactly one binary (`pi`/`pi.cmd`)
  ever spawned, confirmed by re-reading every `spawn`/`spawnSync` call site in `_pi-driver.ts` (there are exactly two, both audited).
- **The two `_netscan.ts` changes** (`"pi"` in `SCAN_DIRS`, the new `PROCESS_ALLOWLIST`) — re-read against the existing r7 scan tests
  (unmodified, still passing) and the new `process-allowlist.test.ts`; the two exemptions (loopback, process) do not ride on each other
  (each was independently re-confirmed: the loopback module may not spawn; the driver may not dial).
- **Command-name resolution by `sourceInfo.path`, never bare name** — re-checked against the measured collision behaviour (`dup:1`,
  `dup:2`); `pi-ready.ts`'s `has()`/`gotStatus`/`gotSelftest` helpers tolerate a `:n` suffix correctly.
- **The `evaluateShapes` control-must-answer invariant** — this was a T045 finding, not a new one; re-confirmed still fixed and tested.

---

## Recommended order of work

All three findings are already fixed in this pass; there is no remaining order of work for this review. If a future row touches
`_pi-driver.ts` again, keep the `error`-listener pattern (CR-1) — any new spawn call site needs one.

---

## Limits of this review

- **Not a fresh-clone verification.** Nothing from r8 is committed, so this review (like the verification report) worked against the
  live working tree, not a pushed commit.
- **Did not re-run the T022/T045 mutation sweeps.** Their logs were read and spot-checked against current file contents (the restored
  files still match what the logs describe); a full re-mutation was judged unnecessary given the targeted fixes above did not touch the
  mutated functions' core logic.
- **Did not review the terminal (`tui`) code path**, because none exists yet to review — that is exactly the part FR-016's human smoke
  test covers, and it is out of a code review's reach by construction.
