// kiln/validate/pi-ready.ts — T037, r8 · contracts/pi-ready.md · E3 (OllamaReady) sibling, the FIFTH probe in the chain
// RuntimeReady -> OverlayCReady -> LiveModelReady -> OllamaReady -> PiReady.
//
// Starts a REAL Pi, hermetically (the driver's own guarantees: fresh temp config, --offline, no model), loads KILN both ways (NC2 = A + B),
// and fails BY NAME. Composes on the earlier probes; runs no gate, admits no program (P-VI). Skip is NEVER a pass (R3).
//
// This module lives in `validate/`, which the P-VIII scan polices — it imports NEITHER `node:child_process` NOR any network primitive itself;
// all of that lives in the one allowlisted `_pi-driver.ts` (PROCESS_ALLOWLIST).

import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MEASURED_PI_VERSIONS, version as piVersionOf, openRpc, openRpcFromPackage, runHeadless,
  type RpcSession,
} from "./_pi-driver.ts";
import { LOOPBACK_ALLOWLIST, PROCESS_ALLOWLIST, allowlistIsSingle, processAllowlistIsSingle, zeroNetworkScan, SCAN_DIRS } from "./_netscan.ts";
import { extractHead } from "./roadmap.ts";
import { fmt, PASS } from "./_report.ts";
import { runCli } from "./_cli.ts";

const KILN_DIR = fileURLToPath(new URL("..", import.meta.url)).replace(/[\\/]$/, "");
const REPO_ROOT = join(KILN_DIR, "..");
const EXT_PATH = join(KILN_DIR, "pi", "index.ts");
const BAD_MANIFEST_DIR = join(KILN_DIR, "fixtures", "pi", "bad-manifest");

export const HOOK_NAMES = [
  "no-pi", "old-version", "bad-entry", "throw-on-load", "no-command", "wrong-status",
  "approve-non-answer", "bad-manifest", "plant-autoload", "extra-process", "extra-loopback",
] as const;
export type HookName = (typeof HOOK_NAMES)[number];

export interface PiReadyHooks {
  noPi?: boolean;
  oldVersion?: boolean;
  badEntry?: boolean;
  throwOnLoad?: boolean;
  noCommand?: boolean;
  wrongStatus?: boolean;
  approveNonAnswer?: boolean;
  badManifest?: boolean;
  plantAutoload?: boolean;
  extraProcess?: boolean;
  extraLoopback?: boolean;
}

export interface PiReadyOptions {
  bin?: string;
  env?: Record<string, string | undefined>;
  hooks?: PiReadyHooks;
  cwd?: string;
}

export interface PiReadyCheck { name: string; ok: boolean; detail: string }
export interface PiReadyFailure { code: string; detail: string }
export interface PiReadyResult {
  ready: boolean;
  skipped: boolean;
  skipReason: string;
  piVersion: string | null;
  checks: PiReadyCheck[];
  failures: PiReadyFailure[];
}

function fail(failures: PiReadyFailure[], code: string, detail: string): void {
  failures.push({ code, detail });
}

/** Check h: no `.pi/extensions/**` file under the repo references KILN's Pi entry point. */
function autoloadEntryExists(repoRoot: string): boolean {
  const dir = join(repoRoot, ".pi", "extensions");
  if (!existsSync(dir)) return false;
  const walk = (d: string): string[] => readdirSync(d).flatMap((e) => {
    const p = join(d, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  return walk(dir).some((f) => f.endsWith(".ts") && /kiln\/pi\/index/.test(readFileSync(f, "utf8")));
}

export async function checkPiReady(opts: PiReadyOptions = {}): Promise<PiReadyResult> {
  const env = opts.env ?? process.env;
  const demand = env.KILN_PI === "1";
  const cwd = opts.cwd ?? REPO_ROOT;
  const checks: PiReadyCheck[] = [];
  const failures: PiReadyFailure[] = [];

  // ── static checks first — need no Pi at all (contract check i, h) ──
  const loopbackList = opts.hooks?.extraLoopback ? [...LOOPBACK_ALLOWLIST, "src/other.ts"] : LOOPBACK_ALLOWLIST;
  const processList = opts.hooks?.extraProcess ? [...PROCESS_ALLOWLIST, "validate/other.ts"] : PROCESS_ALLOWLIST;
  const allowlistsOk = allowlistIsSingle(loopbackList) && processAllowlistIsSingle(processList);
  checks.push({ name: "(i) both allowlists (loopback, process) have exactly one entry", ok: allowlistsOk, detail: allowlistsOk ? `loopback=[${loopbackList.join(",")}] process=[${processList.join(",")}]` : `NOT single: loopback=[${loopbackList.join(",")}] process=[${processList.join(",")}]` });
  if (!allowlistsOk) fail(failures, "allowlist-not-single", checks[checks.length - 1].detail);

  const scan = zeroNetworkScan(SCAN_DIRS.map((d) => join(KILN_DIR, d)), "kiln source is clean", loopbackList, processList);
  checks.push({ name: "(i) the P-VIII scan is green", ok: scan.ok, detail: scan.detail });
  if (!scan.ok) fail(failures, "scan-red", scan.detail);

  const autoload = opts.hooks?.plantAutoload ? true : autoloadEntryExists(cwd);
  checks.push({ name: "(h) no project-local .pi/extensions/ auto-loads KILN", ok: !autoload, detail: autoload ? "a .pi/extensions file references kiln/pi/index — KILN must load only via -e or the package manifest" : "no such entry found" });
  if (autoload) fail(failures, "autoload-present", checks[checks.length - 1].detail);

  // A broken static check (h/i) means the environment itself is already known bad — short-circuit BEFORE touching Pi at all. This keeps
  // these checks genuinely offline and fast, and matches the CLI hooks' intent: each proves ONE thing in isolation.
  if (failures.length > 0) return { ready: false, skipped: false, skipReason: "", piVersion: null, checks, failures };

  // ── pi-missing / version ──
  if (opts.hooks?.noPi) {
    fail(failures, "pi-missing", "no `pi` binary found (--no-pi)");
    return demand
      ? { ready: false, skipped: false, skipReason: "", piVersion: null, checks, failures }
      : { ready: false, skipped: true, skipReason: "Pi tier skipped: no `pi` binary found — set KILN_PI=1 to demand it", piVersion: null, checks, failures };
  }

  const v = piVersionOf(opts.bin);
  if (!v.ok) {
    fail(failures, "pi-missing", "no `pi` binary found, or `pi --version` failed");
    return demand
      ? { ready: false, skipped: false, skipReason: "", piVersion: null, checks, failures }
      : { ready: false, skipped: true, skipReason: "Pi tier skipped: no `pi` binary found — set KILN_PI=1 to demand it", piVersion: null, checks, failures };
  }

  const piVersion = opts.hooks?.oldVersion ? "0.0.0" : v.version;
  const versionOk = piVersion !== null && MEASURED_PI_VERSIONS.includes(piVersion);
  checks.push({ name: "(b) Pi's version is one this row has MEASURED", ok: versionOk, detail: `reported=${piVersion} measured=[${MEASURED_PI_VERSIONS.join(", ")}]` });
  if (!versionOk) {
    fail(failures, "pi-version-unmeasured", checks[checks.length - 1].detail);
    return { ready: false, skipped: false, skipReason: "", piVersion, checks, failures }; // short-circuits BEFORE starting an extension
  }

  // ── live checks (c, d, e, f, g) — a real Pi, hermetically ──
  const extPath = opts.hooks?.badEntry
    ? join(KILN_DIR, "fixtures", "pi", "bad-entry.ts")
    : opts.hooks?.throwOnLoad
      ? join(KILN_DIR, "fixtures", "pi", "throws-on-load.ts")
      : opts.hooks?.noCommand
        ? join(KILN_DIR, "fixtures", "pi", "no-command.ts")
        : opts.hooks?.wrongStatus
          ? join(KILN_DIR, "fixtures", "pi", "wrong-status.ts")
          : opts.hooks?.approveNonAnswer
            ? join(KILN_DIR, "fixtures", "pi", "approve-non-answer.ts")
            : EXT_PATH;

  const session = openRpc(extPath, { bin: opts.bin });
  try {
    const cmdsData = await session.call<{ commands: { name: string; source: string; sourceInfo?: { path?: string } }[] }>("get_commands", {}, 10_000);
    const loadFailed = cmdsData === null;
    checks.push({ name: "(c) the extension loads with no error", ok: !loadFailed, detail: loadFailed ? "get_commands returned nothing — the extension likely failed to load" : "loaded" });
    if (loadFailed) { fail(failures, "extension-load-error", "the extension failed to load or crashed on load"); return finish(); }

    const commands = cmdsData!.commands ?? [];
    const has = (base: string) => commands.some((c) => (c.sourceInfo?.path ?? "").includes(join("pi", base + ".ts")) || c.name === `kiln-${base}` || c.name.startsWith(`kiln-${base}:`));
    const gotStatus = has("status") || commands.some((c) => c.name === "kiln-status" || c.name.startsWith("kiln-status:"));
    const gotSelftest = commands.some((c) => c.name === "kiln-selftest" || c.name.startsWith("kiln-selftest:"));
    const commandsOk = gotStatus && gotSelftest;
    checks.push({ name: "(d) both kiln-status and kiln-selftest are registered", ok: commandsOk, detail: `found: ${commands.map((c) => c.name).join(", ")}` });
    if (!commandsOk) { fail(failures, "command-missing", checks[checks.length - 1].detail); return finish(); }

    if (!opts.hooks?.noCommand) {
      const since = session.promptNoWait("/kiln-status");
      const statusNotify = await session.waitForUi("notify", 8000, since);
      const statusLine = (statusNotify?.message as string | undefined) ?? "";
      const roadmapMd = readFileSync(join(REPO_ROOT, "specs", "ROADMAP.md"), "utf8");
      const trueRowCount = (extractHead(roadmapMd) as { rows: unknown[] }).rows.length;
      const m = /(\d+)\s+roadmap row/.exec(statusLine);
      const reportedCount = m ? Number(m[1]) : -1;
      // The check's meaning never depends on which hook is active — it always asks "does the reported count match the truth on disk?".
      // The `wrongStatus` hook makes that FALSE by substituting a fixture extension (extPath, above); it does not change what "ok" means.
      const statusOk = reportedCount === trueRowCount;
      checks.push({ name: "(e) kiln-status reports the TRUTH parsed from disk", ok: statusOk, detail: `reported=${reportedCount} true=${trueRowCount} line="${statusLine}"` });
      if (!statusOk) fail(failures, "round-trip-mismatch", checks[checks.length - 1].detail);
    }

    // check f — the R2.1 shapes
    const shapeResults = await runSelftestShapes(session, opts.bin);
    const verdict = evaluateShapes(shapeResults);
    checks.push({ name: "(f) every non-answer shape is refused; only an explicit choice is answered", ok: verdict.ok, detail: JSON.stringify(shapeResults) });
    if (!verdict.ok) fail(failures, "non-answer-approved", `${verdict.reason}: ${JSON.stringify(shapeResults)}`);
  } finally {
    session.close();
  }

  // check g — the package manifest route (skipped when a fixture already replaced the extension path above)
  if (!opts.hooks?.badEntry && !opts.hooks?.throwOnLoad && !opts.hooks?.noCommand && !opts.hooks?.wrongStatus && !opts.hooks?.approveNonAnswer) {
    const packageDir = opts.hooks?.badManifest ? BAD_MANIFEST_DIR : KILN_DIR;
    const { session: pkgSession, installResult } = await openRpcFromPackage(packageDir, { bin: opts.bin });
    try {
      // Code-review finding (T050): this used to force `manifestOk = installResult.ok && !opts.hooks?.badManifest` — hardcoding the
      // hook's effect instead of OBSERVING it. Measured: `pi install` on `fixtures/pi/bad-manifest/` (a manifest naming a file that does
      // not exist) reports `installResult.ok: true` regardless — Pi accepts the install and only silently drops the broken extension when
      // it actually loads. The real, honest signal is whether the commands show up at all; nothing needs to be hardcoded.
      let commandsPresent = false;
      if (installResult.ok) {
        const data = await pkgSession.call<{ commands: { name: string }[] }>("get_commands", {}, 10_000);
        commandsPresent = (data?.commands ?? []).some((c) => c.name === "kiln-status" || c.name.startsWith("kiln-status:"));
      }
      const ok = installResult.ok && commandsPresent;
      checks.push({ name: "(g) `pi install ./kiln` (a fresh temp config) loads KILN without -e", ok, detail: ok ? "installed and listed" : `install.ok=${installResult.ok} commandsPresent=${commandsPresent} stderr="${installResult.stderr.slice(0, 300)}"` });
      if (!ok) fail(failures, "manifest-load-error", checks[checks.length - 1].detail);
    } finally {
      pkgSession.close();
      const dir = pkgSession.agentDirForCleanup();
      if (dir) { try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ } }
      // Code-review finding (T050): a genuinely FAILED `install()` call (installResult.ok === false) used `keepAgentDir: true` and is
      // otherwise never cleaned up — `openRpcFromPackage`'s fallback session in that branch owns its OWN fresh agent dir, not this one.
      if (!installResult.ok) { try { rmSync(installResult.agentDir, { recursive: true, force: true }); } catch { /* best-effort */ } }
    }
  }

  function finish(): PiReadyResult {
    return { ready: failures.length === 0, skipped: false, skipReason: "", piVersion, checks, failures };
  }
  return finish();
}

export interface ShapeResults { control: string; nonControl: string[] }

/**
 * The check (f) decision, pulled out as a PURE function so it can be unit-tested offline without a real Pi (T045's mutation sweep found no
 * test protected this specific branch: a probe whose control never answers is a probe that can never say "answered" — contract R2.1). Two
 * ways this can fail, given two DIFFERENT names so a mutation that collapses them together is itself visible in the detail string.
 */
export function evaluateShapes(shapes: ShapeResults): { ok: boolean; reason?: string } {
  if (shapes.control !== "answered:approve") {
    return { ok: false, reason: 'the CONTROL case did not answer — a probe that can never say "answered" proves nothing' };
  }
  if (!shapes.nonControl.every((r) => r.startsWith("no-answer:"))) {
    return { ok: false, reason: "a non-answer shape was reported as answered" };
  }
  return { ok: true };
}

/**
 * Contract R2.1 — every measured way Pi can fail to answer, plus the control. The three RPC-based shapes reuse the ALREADY-OPEN session
 * (one running `pi` process answers three prompts in turn) — spawning a fresh process per shape measurably added tens of seconds to a
 * probe that should stay near the single-round-trip cost (SC-002 is about ONE round trip, not the sum of every shape this check tries).
 */
async function runSelftestShapes(liveSession: RpcSession, bin?: string): Promise<{ control: string; nonControl: string[] }> {
  const results: string[] = [];
  const extPath = EXT_PATH;

  const rpcShape = async (reply: "approve" | "cancel" | "silent") => {
    const since = liveSession.promptNoWait(reply === "silent" ? "/kiln-selftest timeout" : "/kiln-selftest");
    const req = await liveSession.waitForUi("select", 8000, since);
    if (req && reply !== "silent") liveSession.answer(req, reply === "approve" ? { value: "approve" } : { cancelled: true });
    const notify = await liveSession.waitForUi("notify", 8000, since);
    const line = (notify?.message as string | undefined) ?? "";
    const m = /outcome=(\S+)/.exec(line);
    return m ? m[1] : "no-answer:harness-saw-nothing";
  };

  const control = await rpcShape("approve");
  results.push(await rpcShape("cancel"));
  results.push(await rpcShape("silent"));

  const p = await runHeadless("print", extPath, "/kiln-selftest", { bin });
  const j = await runHeadless("json", extPath, "/kiln-selftest", { bin });
  const extractHeadless = (r: { stderr: string }) => { const m = /outcome=(\S+)/.exec(r.stderr); return m ? m[1] : "no-answer:harness-saw-nothing"; };
  results.push(extractHeadless(p));
  results.push(extractHeadless(j));

  return { control, nonControl: results };
}

export async function reportPiReady(opts: PiReadyOptions = {}): Promise<string> {
  const r = await checkPiReady(opts);
  if (r.ready) return [PASS, `PiReady — KILN loads into real Pi ${r.piVersion} and the seam refuses every non-answer:`, ...r.checks.map((c) => `   ✓ ${c.name}: ${c.detail}`)].join("\n");
  const head = r.skipped ? [`SKIPPED (a skip is NEVER a pass): ${r.skipReason || "<<MISSING skipReason — itself a violation>>"}`] : [];
  return [...head, ...r.failures.map((f) => fmt(`[${f.code}] `, f.detail))].join("\n");
}

function isMain(): boolean {
  try { return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; }
}
if (isMain()) {
  runCli(async () => {
    const has = (f: string) => process.argv.includes(`--${f}`);
    const hooks: PiReadyHooks = {
      noPi: has("no-pi"), oldVersion: has("old-version"), badEntry: has("bad-entry"), throwOnLoad: has("throw-on-load"),
      noCommand: has("no-command"), wrongStatus: has("wrong-status"), approveNonAnswer: has("approve-non-answer"),
      badManifest: has("bad-manifest"), plantAutoload: has("plant-autoload"), extraProcess: has("extra-process"), extraLoopback: has("extra-loopback"),
    };
    const r = await checkPiReady({ hooks });
    if (r.ready) { console.log(await reportPiReady({ hooks })); return 0; }
    if (r.skipped) { console.error(await reportPiReady({ hooks })); return 2; }
    console.error(await reportPiReady({ hooks }));
    return 1;
  });
}
