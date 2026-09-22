// kiln/validate/_pi-driver.ts — T035, r8 · research D6, D11 · contracts/pi-ready.md R1, R5.
//
// The ONLY module in the repository allowed to import `node:child_process` (PROCESS_ALLOWLIST, exactly one entry, by path — T006). It spawns
// EXACTLY ONE program: `pi`, with an argument array and `shell: false` (never a shell string), into a FRESH, EMPTY, temp `PI_CODING_AGENT_DIR`
// removed afterward, `--offline` + `PI_OFFLINE=1`, always under a hard deadline that KILLS the process — a wedged Pi can never hang a caller
// (SC-004). It never dials any endpoint itself: no fetch, no http, no net — that would defeat the point of a process allowlist that is
// separate from the loopback one (research D6).
//
// D11 (measured): Pi answers a `prompt` only AFTER the invoked command's handler finishes, and a handler blocked on `select` cannot finish
// until the client answers it — so `RpcSession.ask()` below sends `prompt` WITHOUT awaiting its response, watches for the matching
// `extension_ui_request`, answers it, THEN awaits the (now unblocked) `prompt` response.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

/** The ONE place a supported Pi version is declared (research D9 — the Node-floor lesson: an unmeasured range is a false claim). */
export const MEASURED_PI_VERSIONS: readonly string[] = ["0.85.1"];

/**
 * Every spawned Pi's working directory. MEASURED: `ctx.cwd` inside a Pi extension is simply Pi's OWN process cwd — with no explicit `cwd`
 * here, Pi silently inherits whatever directory the CALLING script happens to run from (e.g. `kiln/` when the test suite runs `npm test`
 * from there), and `kiln-status` then reports "no roadmap found" because `specs/ROADMAP.md` lives at the repo root, not under `kiln/`.
 * Every launch below defaults to this constant so the result never depends on the caller's own cwd.
 */
export const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url)).replace(/[\\/]$/, "");

export type DriverFailure = "pi-bin-refused" | "timeout" | "spawn-error";

export interface LaunchOptions {
  bin?: string;
  args: string[];
  timeoutMs?: number;
  stdin?: string;
  onAgentDir?: (dir: string) => void;
  /** Pi's working directory (`ctx.cwd` inside the extension). Defaults to REPO_ROOT — see the constant's own comment. */
  cwd?: string;
  /** Reuse this agent dir instead of creating a fresh one (chaining install -> a session that must see what was installed). */
  agentDir?: string;
  /** Do not remove the agent dir when this launch finishes — the caller takes ownership of cleanup (chaining). */
  keepAgentDir?: boolean;
}

export interface LaunchResult {
  ok: boolean;
  failure?: DriverFailure;
  code: number | null;
  stdout: string;
  stderr: string;
  agentDir: string;
}

function resolveBin(bin?: string): string {
  return bin ?? process.env.KILN_PI_BIN ?? "pi";
}

/** R5: refuse anything whose basename is not `pi` or `pi.cmd` — `KILN_PI_BIN` may point at a DIFFERENT PATH to a `pi`, never another program. */
function isAllowedBinary(bin: string): boolean {
  const name = basename(bin);
  return name === "pi" || name === "pi.cmd";
}

function freshAgentDir(): string {
  return mkdtempSync(join(tmpdir(), "kiln-pi-agent-"));
}

/** Spawn `pi` once, hermetically, and collect its output. Never a shell string; never any binary but `pi`. */
export function launch(opts: LaunchOptions): Promise<LaunchResult> {
  const bin = resolveBin(opts.bin);
  const agentDir = opts.agentDir ?? freshAgentDir();
  const cleanup = () => { if (!opts.keepAgentDir) rmSync(agentDir, { recursive: true, force: true }); };
  opts.onAgentDir?.(agentDir);
  if (!isAllowedBinary(bin)) {
    cleanup();
    return Promise.resolve({ ok: false, failure: "pi-bin-refused", code: null, stdout: "", stderr: `refusing to spawn "${bin}": basename is not pi/pi.cmd`, agentDir });
  }

  return new Promise((resolve) => {
    let settled = false;
    const env = { ...process.env, PI_CODING_AGENT_DIR: agentDir, PI_OFFLINE: "1" };
    let child;
    try {
      // stdin defaults to "ignore" (measured: `-p`/`--mode json` BLOCK waiting for stdin EOF if left as an open, unclosed pipe — the
      // working spike harness always used DEVNULL). Only a caller that explicitly supplies `stdin` gets a real pipe, closed after writing.
      const stdinMode = opts.stdin !== undefined ? "pipe" : "ignore";
      child = spawn(bin, opts.args, { env, cwd: opts.cwd ?? REPO_ROOT, stdio: [stdinMode, "pipe", "pipe"], shell: false });
    } catch (e) {
      cleanup();
      resolve({ ok: false, failure: "spawn-error", code: null, stdout: "", stderr: String((e as Error).message), agentDir });
      return;
    }
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => { stdout += d; });
    child.stderr.on("data", (d: Buffer) => { stderr += d; });
    if (opts.stdin !== undefined) { child.stdin!.write(opts.stdin); child.stdin!.end(); }

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      cleanup();
      resolve({ ok: false, failure: "timeout", code: null, stdout, stderr, agentDir });
    }, opts.timeoutMs ?? 10_000);

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve({ ok: code === 0, code, stdout, stderr, agentDir });
    });
    child.on("error", (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve({ ok: false, failure: "spawn-error", code: null, stdout, stderr: String(e.message), agentDir });
    });
  });
}

/** `pi --version` and its exit code — R2 check (a). */
export function version(bin?: string): { ok: boolean; version: string | null } {
  const resolved = resolveBin(bin);
  if (!isAllowedBinary(resolved)) return { ok: false, version: null };
  const r = spawnSync(resolved, ["--version"], { encoding: "utf8", timeout: 15_000 });
  return { ok: !r.error && r.status === 0, version: r.status === 0 ? r.stdout.trim() : null };
}

export interface InstallOptions {
  bin?: string;
  packageDir: string;
  timeoutMs?: number;
  /** Keep the agent dir after install (its settings.json now names the package) so a later session in the SAME dir can find it. */
  keepAgentDir?: boolean;
}

/** `pi install <packageDir>` into a FRESH temp config dir (contract pi-ready.md R2 check g). Never the operator's own settings. */
export function install(opts: InstallOptions): Promise<LaunchResult> {
  return launch({ bin: opts.bin, args: ["install", opts.packageDir], timeoutMs: opts.timeoutMs ?? 20_000, keepAgentDir: opts.keepAgentDir });
}

// ── the hermetic RPC session (D11) ─────────────────────────────────────────────────────────────────────
export interface UiRequest { id: string; method: string; [k: string]: unknown }

export class RpcSession {
  private events: Record<string, unknown>[] = [];
  private answered = new Set<string>();
  private child;
  private agentDir: string;
  private ownsAgentDir: boolean;
  private nextId = 0;
  private buf = "";
  private closed = false;
  private deadlineTimer: NodeJS.Timeout;
  /** Set if the child process itself failed to spawn (e.g. a nonexistent KILN_PI_BIN whose basename still passes isAllowedBinary). */
  spawnError: Error | null = null;

  constructor(opts: { bin?: string; extraArgs?: string[]; timeoutMs?: number; agentDir?: string; noExtensionDiscovery?: boolean; cwd?: string }) {
    const bin = resolveBin(opts.bin);
    if (!isAllowedBinary(bin)) throw new Error(`refusing to spawn "${bin}": basename is not pi/pi.cmd`);
    this.ownsAgentDir = opts.agentDir === undefined;
    this.agentDir = opts.agentDir ?? freshAgentDir();
    const env = { ...process.env, PI_CODING_AGENT_DIR: this.agentDir, PI_OFFLINE: "1" };
    // `-ne` disables ALL extension discovery, which measurably also blocks a PACKAGE-installed extension (only an explicit `-e` path still
    // works with it) — so `openRpcFromPackage` must NOT pass it; `openRpc` (explicit -e, isolated) always does.
    const noDiscovery = opts.noExtensionDiscovery ?? true;
    const args = ["--mode", "rpc", "--offline", ...(noDiscovery ? ["-ne"] : []), "--no-session", ...(opts.extraArgs ?? [])];
    // Pi's cwd (defaulting to REPO_ROOT) is what `ctx.cwd` reports inside the extension — see REPO_ROOT's comment.
    this.child = spawn(bin, args, { env, cwd: opts.cwd ?? REPO_ROOT, stdio: ["pipe", "pipe", "pipe"], shell: false });
    // Code-review finding (T050): with NO 'error' listener, a spawn failure (e.g. ENOENT for a misconfigured KILN_PI_BIN whose basename
    // still passes isAllowedBinary) is an UNHANDLED 'error' event — Node throws and crashes the whole process, not just this session.
    // Measured: `spawn("/nonexistent", …)` with no listener throws synchronously-looking but actually async, uncatchable by try/catch here.
    this.child.on("error", (e) => { this.spawnError = e; });
    this.child.stdin.on("error", () => { /* EPIPE writing to a dead child — recorded via spawnError/close, never an unhandled crash */ });
    this.child.stdout.on("data", (d: Buffer) => {
      this.buf += d.toString();
      let idx: number;
      while ((idx = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, idx);
        this.buf = this.buf.slice(idx + 1);
        if (!line.trim()) continue;
        try { this.events.push(JSON.parse(line)); } catch { /* non-JSON stdout would corrupt the protocol — ignored here, checked elsewhere */ }
      }
    });
    const deadline = opts.timeoutMs ?? 30_000;
    this.deadlineTimer = setTimeout(() => this.close(), deadline);
    this.deadlineTimer.unref?.();
  }

  private send(obj: object): void {
    if (this.closed || this.spawnError) return; // never throw into a caller for a session that is already gone
    try { this.child.stdin.write(JSON.stringify(obj) + "\n"); } catch { /* EPIPE — recorded via the stdin 'error' listener above */ }
  }

  /**
   * Send a slash-command prompt WITHOUT waiting for its response (D11) — the response only arrives after any dialog it opens is answered.
   * Returns the event count BEFORE sending, so a caller can pass it to `waitForUi(..., sinceIndex)` and see only events THIS prompt causes —
   * `notify` (unlike `select`) has no "answered" concept, so without a cursor a later call would re-match a stale notify from an earlier prompt.
   */
  promptNoWait(message: string): number {
    const sinceIndex = this.events.length;
    this.send({ type: "prompt", id: `p${this.nextId++}`, message });
    return sinceIndex;
  }

  async call<T = unknown>(type: string, extra: Record<string, unknown> = {}, timeoutMs = 8000): Promise<T | null> {
    const id = `c${this.nextId++}`;
    this.send({ type, id, ...extra });
    const r = await this.waitFor((o) => o.type === "response" && o.id === id, timeoutMs);
    return (r as { data?: T } | null)?.data ?? null;
  }

  /**
   * The first `extension_ui_request` for `method` at or after `sinceIndex` (default 0 — all history). For a repeatable dialog kind like
   * `select`, "not yet answered" (tracked in `this.answered`) is enough to find the newest one. For a fire-and-forget kind like `notify`,
   * there is no "answered" marker, so a caller triggering a SECOND prompt in the same session MUST pass `promptNoWait`'s return value here,
   * or this will re-match a stale notify left over from an earlier prompt.
   */
  async waitForUi(method: string, timeoutMs = 8000, sinceIndex = 0): Promise<UiRequest | null> {
    return this.waitFor(
      (o, i) => i >= sinceIndex && o.type === "extension_ui_request" && o.method === method && !this.answered.has(o.id as string),
      timeoutMs,
    ) as Promise<UiRequest | null>;
  }

  answer(req: UiRequest, fields: Record<string, unknown>): void {
    this.answered.add(req.id);
    this.send({ type: "extension_ui_response", id: req.id, ...fields });
  }

  private async waitFor(pred: (o: Record<string, unknown>, index: number) => boolean, timeoutMs: number): Promise<Record<string, unknown> | null> {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      for (let i = 0; i < this.events.length; i++) {
        if (pred(this.events[i], i)) return this.events[i];
      }
      if (this.spawnError) return null; // the process never started — no event will ever arrive; don't wait out the full timeout
      await new Promise((r) => setTimeout(r, 25));
    }
    return null;
  }

  allEvents(): readonly Record<string, unknown>[] {
    return this.events;
  }

  close(): void {
    if (this.closed) return; // idempotent — the deadline timer and an explicit close() may both call this
    this.closed = true;
    clearTimeout(this.deadlineTimer); // code-review finding (T050): previously left running for its full 30s even after an early close()
    try { this.child.kill("SIGKILL"); } catch { /* already dead, or never started */ }
    if (this.ownsAgentDir) rmSync(this.agentDir, { recursive: true, force: true });
  }

  /** For a session opened over a REUSED agent dir (`openRpcFromPackage`): the caller owns cleanup of that dir once this session is closed. */
  agentDirForCleanup(): string | null {
    return this.ownsAgentDir ? null : this.agentDir;
  }
}

export interface RpcOptions { bin?: string; extraArgs?: string[]; timeoutMs?: number; cwd?: string }

/** Open a hermetic RPC session against a specific extension file. */
export function openRpc(extPath: string, opts: RpcOptions = {}): RpcSession {
  return new RpcSession({ bin: opts.bin, extraArgs: ["-e", extPath, ...(opts.extraArgs ?? [])], timeoutMs: opts.timeoutMs, cwd: opts.cwd });
}

/**
 * Open a hermetic RPC session against a PACKAGE (a directory with a `pi` manifest), installed first (contract R2 check g). `install()` and
 * the RPC session share the SAME agent dir — `settings.json` from the install must still be there when the session starts — and the caller
 * is responsible for removing `installResult.agentDir` once the session is closed (`session.close()` does not own it).
 */
export async function openRpcFromPackage(packageDir: string, opts: RpcOptions = {}): Promise<{ session: RpcSession; installResult: LaunchResult }> {
  const installResult = await install({ bin: opts.bin, packageDir, keepAgentDir: true });
  if (!installResult.ok) return { session: new RpcSession({ bin: opts.bin, noExtensionDiscovery: true, cwd: opts.cwd }), installResult };
  const session = new RpcSession({ bin: opts.bin, extraArgs: opts.extraArgs, timeoutMs: opts.timeoutMs, agentDir: installResult.agentDir, noExtensionDiscovery: false, cwd: opts.cwd });
  return { session, installResult };
}

/** Headless (`print`/`json`) one-shot run — contract R2.1 rows `print`/`json`. */
export function runHeadless(mode: "print" | "json", extPath: string, message: string, opts: { bin?: string; timeoutMs?: number; cwd?: string } = {}): Promise<LaunchResult> {
  const modeArgs = mode === "print" ? ["-p"] : ["--mode", "json"];
  return launch({ bin: opts.bin, args: [...modeArgs, "-ne", "--no-session", "--offline", "-e", extPath, message], timeoutMs: opts.timeoutMs ?? 15_000, cwd: opts.cwd });
}
