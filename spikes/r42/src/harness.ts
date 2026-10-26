// T018 — helpers the tests and the evidence runner share: a private temporary store, an owner process that can be started with a kill or a fault armed,
// killed abruptly, and started again on the SAME store. A start that does not print `ready` in time fails `evidence-owner-failed` with the child's stderr.
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OWNER = fileURLToPath(new URL("./owner.ts", import.meta.url));

export interface Store {
  /** The private temporary directory holding everything of one scenario. */
  dir: string;
  /** What the strategy is told to keep its state in. */
  store: string;
  /** The owner's Unix-domain socket (a short path: macOS limits socket paths to ~100 characters). */
  socket: string;
  /** Which kill points fired, one per line (written by src/kill.ts just before dying). */
  killLog: string;
  killed(): string[];
  cleanup(): void;
}

export function makeStore(): Store {
  const dir = mkdtempSync(join(tmpdir(), "r42-"));
  const killLog = join(dir, "kill.log");
  return {
    dir,
    store: join(dir, "s"),
    socket: join(dir, "o.sock"),
    killLog,
    killed: () => (existsSync(killLog) ? readFileSync(killLog, "utf8").split("\n").filter(Boolean) : []),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

export class OwnerFailed extends Error {
  readonly code = "evidence-owner-failed";
}

export interface OwnerOptions {
  strategy: string;
  store: Store;
  /** Arm a kill point (SIGKILL there). */
  killAt?: string;
  /** Arm an injected store failure. */
  faultAt?: string;
  /** Delay the strategy's start so `not-ready` can be observed. */
  startDelayMs?: number;
  /** The owner is expected to die before it is ready (a kill during recovery): don't treat that as a failure. */
  expectDeath?: boolean;
  env?: Record<string, string>;
  /** How long to wait for `ready`. */
  readyTimeoutMs?: number;
}

export interface Owner {
  proc: ChildProcess;
  pid: number;
  socket: string;
  /** False when the owner died before printing `ready` (only with `expectDeath`). */
  ready: boolean;
  exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  /** Resolves when the owner prints `listening` (its socket accepts connections, though the strategy may not be started). */
  listening: Promise<void>;
  stdout(): string;
  stderr(): string;
}

export async function startOwner(opts: OwnerOptions): Promise<Owner> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  delete env.KILL_AT;
  delete env.FAULT_AT;
  delete env.OWNER_START_DELAY_MS;
  env.KILL_LOG = opts.store.killLog;
  if (opts.killAt) env.KILL_AT = opts.killAt;
  if (opts.faultAt) env.FAULT_AT = opts.faultAt;
  if (opts.startDelayMs) env.OWNER_START_DELAY_MS = String(opts.startDelayMs);
  Object.assign(env, opts.env ?? {});

  const proc = spawn(process.execPath, [OWNER, "--store", opts.store.store, "--strategy", opts.strategy, "--socket", opts.store.socket], { env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  let err = "";
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => proc.once("exit", (code, signal) => resolve({ code, signal })));
  let markListening: () => void;
  const listening = new Promise<void>((r) => (markListening = r));
  let markReady: (v: boolean) => void;
  const readyOrDead = new Promise<boolean>((r) => (markReady = r));
  proc.stdout!.setEncoding("utf8");
  proc.stderr!.setEncoding("utf8");
  proc.stdout!.on("data", (d: string) => {
    out += d;
    if (/^listening$/m.test(out)) markListening();
    if (/^ready$/m.test(out)) markReady(true);
  });
  proc.stderr!.on("data", (d: string) => (err += d));
  void exited.then(() => markReady(false));

  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), opts.readyTimeoutMs ?? 10_000).unref());
  const ready = await Promise.race([readyOrDead, timeout]);
  const owner: Owner = { proc, pid: proc.pid!, socket: opts.store.socket, ready, exited, listening, stdout: () => out, stderr: () => err };
  if (!ready) {
    const dead = proc.exitCode !== null || proc.signalCode !== null;
    if (!dead) {
      proc.kill("SIGKILL");
      await exited;
      throw new OwnerFailed(`the owner did not print "ready" within ${opts.readyTimeoutMs ?? 10_000} ms\n${err}`);
    }
    if (!opts.expectDeath) throw new OwnerFailed(`the owner died before it was ready (signal ${proc.signalCode}, code ${proc.exitCode})\n${err}`);
  }
  return owner;
}

/** Abrupt kill, then wait until the process is really gone. */
export async function killNow(owner: Owner): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  if (owner.proc.exitCode === null && owner.proc.signalCode === null) owner.proc.kill("SIGKILL");
  return owner.exited;
}

/** Start an owner, run `fn`, and always make sure the owner is gone afterwards. */
export async function withOwner<T>(opts: OwnerOptions, fn: (owner: Owner) => Promise<T>): Promise<T> {
  const owner = await startOwner(opts);
  try {
    return await fn(owner);
  } finally {
    await killNow(owner);
  }
}
