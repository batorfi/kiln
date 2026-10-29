// The child-owner harness: a private temporary store, an owner process that runs a script (and can be armed to die at a named point), killed abruptly and started again on the SAME store.
// A start that does not finish in time fails by name with the child's stderr; `Store.cleanup()` kills every process started on the store, so a FAILING test can never leak an owner and hang the run
// (the first lesson of r42's harness).
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OWNER_MAIN = fileURLToPath(new URL("./owner-main.ts", import.meta.url));

export interface TestStore {
  dir: string;
  /** The store directory handed to the owner. */
  store: string;
  killLog: string;
  killed(): string[];
  procs: ChildProcess[];
  cleanup(): void;
}
export function makeStore(): TestStore {
  const dir = mkdtempSync(join(tmpdir(), "k13-"));
  const killLog = join(dir, "kill.log");
  const procs: ChildProcess[] = [];
  return {
    dir,
    store: join(dir, "s"),
    killLog,
    killed: () => (existsSync(killLog) ? readFileSync(killLog, "utf8").split("\n").filter(Boolean) : []),
    procs,
    cleanup: () => {
      for (const p of procs) if (p.exitCode === null && p.signalCode === null) p.kill("SIGKILL");
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export class OwnerFailed extends Error {
  readonly code = "owner-failed";
}
export interface OwnerOptions {
  script?: Record<string, unknown>[];
  killAt?: string;
  /** Die at the n-th time the armed point is reached (default 1). */
  killNth?: number;
  faultAt?: string;
  holdAt?: string;
  holdMs?: number;
  clockOffsetMs?: number;
  libraryVersion?: string;
  /** After the script the child stays alive, to be killed by the harness. */
  stayAlive?: boolean;
  /** Also serve the private channel (so `kiln gate …` in another process can reach this owner). */
  serve?: boolean;
  /** Replace the real decision step with the deliberately half-applying control (negative proofs only). */
  brokenGate?: boolean;
  /** r14: replace `kiln.row` with the deliberately weakened walk (negative proofs only). */
  brokenWalk?: boolean;
  readyTimeoutMs?: number;
  laneModule?: string;
  env?: Record<string, string>;
  /** The run is expected to die before it finishes (a kill point armed): that is not a failure. */
  expectDeath?: boolean;
  timeoutMs?: number;
}
export interface OwnerRun {
  proc: ChildProcess;
  pid: number;
  /** The `R <json>` lines printed so far, parsed. */
  results: unknown[];
  stdout(): string;
  stderr(): string;
  exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  /** Resolves when the child printed `STARTED` (the factory is open); rejects if it died first. */
  started: Promise<void>;
  /** Resolves when the child printed `LISTENING` (its channel is up; only with `serve`). */
  listening: Promise<void>;
  /** Resolves when the child printed `DONE` (its script ran to the end). */
  done: Promise<boolean>;
}

export function spawnOwner(ts: TestStore, o: OwnerOptions = {}): OwnerRun {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^(KILL_AT|FAULT_AT|HOLD_AT|HOLD_MS|CLOCK_OFFSET_MS|LIBRARY_VERSION|READY_TIMEOUT_MS|LANE_MODULE|KILL_LOG|STAY_ALIVE|BROKEN_GATE|BROKEN_WALK|HIT_LOG|SERVE|KILL_NTH)$/.test(k)) env[k] = v;
  env.KILL_LOG = ts.killLog;
  if (o.killAt) env.KILL_AT = o.killAt;
  if (o.killNth) env.KILL_NTH = String(o.killNth);
  if (o.faultAt) env.FAULT_AT = o.faultAt;
  if (o.holdAt) { env.HOLD_AT = o.holdAt; env.HOLD_MS = String(o.holdMs ?? 0); }
  if (o.clockOffsetMs) env.CLOCK_OFFSET_MS = String(o.clockOffsetMs);
  if (o.libraryVersion) env.LIBRARY_VERSION = o.libraryVersion;
  if (o.stayAlive) env.STAY_ALIVE = "1";
  if (o.brokenGate) env.BROKEN_GATE = "1";
  if (o.brokenWalk) env.BROKEN_WALK = "1";
  if (o.serve) env.SERVE = "1";
  if (o.readyTimeoutMs) env.READY_TIMEOUT_MS = String(o.readyTimeoutMs);
  if (o.laneModule) env.LANE_MODULE = o.laneModule;
  Object.assign(env, o.env ?? {});
  const proc = spawn(process.execPath, [OWNER_MAIN, "--store", ts.store, "--script", JSON.stringify(o.script ?? [])], { env, stdio: ["ignore", "pipe", "pipe"] });
  ts.procs.push(proc);
  let out = "";
  let err = "";
  const results: unknown[] = [];
  let seen = 0;
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((res) => proc.once("exit", (code, signal) => res({ code, signal })));
  let markStarted!: () => void;
  let failStarted!: (e: Error) => void;
  const started = new Promise<void>((res, rej) => ((markStarted = res), (failStarted = rej)));
  started.catch(() => {});
  let markListening!: () => void;
  let failListening!: (e: Error) => void;
  const listening = new Promise<void>((res, rej) => ((markListening = res), (failListening = rej)));
  listening.catch(() => {});
  let markDone!: (v: boolean) => void;
  const done = new Promise<boolean>((res) => (markDone = res));
  proc.stdout!.setEncoding("utf8");
  proc.stderr!.setEncoding("utf8");
  proc.stdout!.on("data", (d: string) => {
    out += d;
    const lines = out.split("\n");
    for (; seen < lines.length - 1; seen++) {
      const l = lines[seen];
      if (l.startsWith("R ")) results.push(JSON.parse(l.slice(2)));
      else if (l === "STARTED") markStarted();
      else if (l === "LISTENING") markListening();
      else if (l === "DONE") markDone(true);
    }
  });
  proc.stderr!.on("data", (d: string) => (err += d));
  void exited.then(({ code, signal }) => {
    markDone(false);
    failStarted(new OwnerFailed(`the owner ended (code ${code}, signal ${signal}) before it started\n${out}${err}`));
    failListening(new OwnerFailed(`the owner ended (code ${code}, signal ${signal}) before it listened\n${out}${err}`));
  });
  return { proc, pid: proc.pid!, results, stdout: () => out, stderr: () => err, exited, started, listening, done };
}

/** Run a script to its end (or to its death) and return everything it printed. */
export async function runOwner(ts: TestStore, o: OwnerOptions = {}): Promise<OwnerRun & { code: number | null; signal: NodeJS.Signals | null }> {
  const run = spawnOwner(ts, o);
  const timer = setTimeout(() => run.proc.kill("SIGKILL"), o.timeoutMs ?? 60_000);
  try {
    const { code, signal } = await run.exited;
    if (!o.expectDeath && (code !== 0 || signal)) throw new OwnerFailed(`the owner ended with code ${code}, signal ${signal}\n${run.stdout()}${run.stderr()}`);
    return Object.assign(run, { code, signal });
  } finally {
    clearTimeout(timer);
  }
}

/** How long a freshly spawned owner gets to say STARTED. A process that gets no CPU on a loaded machine prints nothing at all (not even Node's own warnings) for tens of seconds; a real hang is still caught, only later. */
const START_TIMEOUT_MS = 45_000;

/** Start an owner and keep it alive (a `hold` step): resolves once it has STARTED. */
export async function startOwner(ts: TestStore, o: OwnerOptions = {}): Promise<OwnerRun> {
  const run = spawnOwner(ts, { ...o, script: [...(o.script ?? []), { op: "hold" }] });
  const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new OwnerFailed(`the owner did not start within ${o.timeoutMs ?? START_TIMEOUT_MS} ms\n${run.stdout()}${run.stderr()}`)), o.timeoutMs ?? START_TIMEOUT_MS).unref());
  await Promise.race([o.serve ? Promise.all([run.started, run.listening]) : run.started, timeout]);
  return run;
}

/** Abrupt kill, then wait until the process is really gone. */
export async function killNow(run: OwnerRun): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  if (run.proc.exitCode === null && run.proc.signalCode === null) run.proc.kill("SIGKILL");
  return run.exited;
}

/**
 * Run a script to its end, then KILL the owner (SIGKILL, no cleanup) — so what a test reads afterwards is the store as a crash leaves it, never the owner's memory.
 * Resolves with everything the script printed; rejects by name if the script did not finish.
 */
export async function runThenKill(ts: TestStore, o: OwnerOptions = {}): Promise<OwnerRun> {
  const run = spawnOwner(ts, { ...o, stayAlive: true });
  const timer = setTimeout(() => run.proc.kill("SIGKILL"), o.timeoutMs ?? 60_000);
  try {
    const finished = await run.done;
    if (!finished) {
      const { code, signal } = await run.exited;
      throw new OwnerFailed(`the script did not finish (code ${code}, signal ${signal})\n${run.stdout()}${run.stderr()}`);
    }
    await killNow(run);
    return run;
  } finally {
    clearTimeout(timer);
  }
}
