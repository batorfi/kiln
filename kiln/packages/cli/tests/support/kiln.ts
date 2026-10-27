// Test support: run the REAL command line (`node packages/cli/src/main.ts …`) as separate processes — what a completer is. `TMPDIR` can be pointed at a scratch directory, which moves the owner's
// private socket directory (`<tmp>/kiln-<uid>`) so the safe-directory rule can be attacked without touching the real one.
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MAIN = fileURLToPath(new URL("../../src/main.ts", import.meta.url));

export interface Ran {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  ms: number;
}
export function kiln(args: string[], env: Record<string, string | undefined> = {}, timeoutMs = 30_000): Promise<Ran> {
  const t0 = performance.now();
  const proc = spawn(process.execPath, [MAIN, ...args], { env: { ...process.env, NODE_TEST_CONTEXT: undefined, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  proc.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
  proc.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
  const timer = setTimeout(() => proc.kill("SIGKILL"), timeoutMs);
  return new Promise((resolve) =>
    proc.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, ms: performance.now() - t0 });
    }),
  );
}
/** One JSON line out, as every `kiln gate …` prints. */
export const json = (r: Ran): any => JSON.parse(r.stdout.trim().split("\n").pop()!);

export interface KilnOwner {
  proc: ChildProcess;
  pid: number;
  stdout(): string;
  stderr(): string;
  exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
  /** Resolves on the `ready` line; rejects (with everything it printed) if the process ends first or `timeoutMs` passes. */
  ready: Promise<void>;
  kill(signal?: NodeJS.Signals): void;
}
/** `kiln owner --store <dir>` as a child. */
export function startKilnOwner(store: string, env: Record<string, string | undefined> = {}, timeoutMs = 20_000): KilnOwner {
  const proc = spawn(process.execPath, [MAIN, "owner", "--store", store], { env: { ...process.env, NODE_TEST_CONTEXT: undefined, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  let err = "";
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((res) => proc.once("exit", (code, signal) => res({ code, signal })));
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`kiln owner was not ready within ${timeoutMs} ms\n${out}${err}`)), timeoutMs);
    timer.unref();
    proc.stdout!.setEncoding("utf8").on("data", (d: string) => {
      out += d;
      if (/^ready$/m.test(out)) { clearTimeout(timer); resolve(); }
    });
    proc.stderr!.setEncoding("utf8").on("data", (d: string) => (err += d));
    void exited.then(({ code, signal }) => { clearTimeout(timer); reject(new Error(`kiln owner ended (code ${code}, signal ${signal}) before ready\n${out}${err}`)); });
  });
  ready.catch(() => {});
  return { proc, pid: proc.pid!, stdout: () => out, stderr: () => err, exited, ready, kill: (s = "SIGKILL") => void proc.kill(s) };
}
