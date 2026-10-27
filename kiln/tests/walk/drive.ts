// The scripted CLI driver (r14 T039; contracts/check-flow.md §5): test support, NOT product. It shells out to exactly the command line a person would use — `kiln feature next`, then `kiln gate move` —
// so "from the CLI" is literally true of the acceptance walks, and the script cannot cheat by opening gates itself. Its decider is `script:r14`, recorded as given: no claim is made that it is a person.
//
//   node tests/walk/drive.ts --store <dir> --feature <f> --script <file.json> [--by script:r14]
//
// A script maps a gate to the move to make: keys `<gateKey>#<round>`, `<gateKey>`, `*` (first match wins). A move is `{kind, note?, target?, admit?}`; `expect` (default `committed`) names the status
// the owner must answer; `stop: true` ends the drive at that gate. Every step prints one JSON line.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MAIN = fileURLToPath(new URL("../../packages/cli/src/main.ts", import.meta.url));

export interface ScriptMove { kind: string; note?: string; target?: string; admit?: unknown; expect?: string; stop?: boolean }
export type Script = Record<string, ScriptMove>;
export interface DriveStep { gateId: string; gateKey: string; round: number; kind: string; answer: any }
export interface Ran { code: number | null; stdout: string; stderr: string }

export function kiln(args: string[], env: Record<string, string | undefined> = {}): Promise<Ran> {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [MAIN, ...args], { env: { ...process.env, NODE_TEST_CONTEXT: undefined, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    p.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    p.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
    p.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
const line = (r: Ran): any => JSON.parse(r.stdout.trim().split("\n").pop() ?? "null");
const pick = (script: Script, key: string, round: number): ScriptMove | undefined => script[`${key}#${round}`] ?? script[key] ?? script["*"];

export interface DriveOptions {
  store: string;
  feature: string;
  script: Script;
  by?: string;
  env?: Record<string, string | undefined>;
  /** How long to keep asking again when the owner is away (it may be restarting under a kill test). */
  patienceMs?: number;
  log?: (s: string) => void;
}
export async function drive(o: DriveOptions): Promise<{ steps: DriveStep[]; last: any }> {
  const by = o.by ?? "script:r14";
  const steps: DriveStep[] = [];
  const tmp = mkdtempSync(join(tmpdir(), "k14-drive-"));
  let after: string | undefined;
  const deadline = () => Date.now() + (o.patienceMs ?? 30_000);
  try {
    for (let n = 0; n < 200; n++) {
      // ask for the next gate; if the owner is away (exit 3/4) ask again — the answer is re-derived from the store
      let view: any;
      for (let until = deadline(); ; ) {
        const r = await kiln(["feature", "next", "--store", o.store, "--feature", o.feature, ...(after ? ["--after", after] : [])], o.env);
        if (r.code === 0) { view = line(r); break; }
        if ((r.code === 3 || r.code === 4) && Date.now() < until) { await new Promise((x) => setTimeout(x, 100)); continue; }
        throw new Error(`feature next failed (exit ${r.code}): ${r.stdout}${r.stderr}`);
      }
      if (!view.openGate) return { steps, last: view };
      const g = view.openGate;
      const m = pick(o.script, g.gateKey, g.round);
      if (!m) throw new Error(`the script has no move for ${g.gateKey}#${g.round}`);
      if (m.stop) return { steps, last: view };
      const args = ["gate", "move", "--store", o.store, "--gate", g.gateId, "--key", `m:${g.gateId}`, "--kind", m.kind, "--by", by, "--brief-ref", g.briefRef];
      if (m.note !== undefined) args.push("--note", m.note);
      if (m.target !== undefined) args.push("--target", m.target);
      if (m.admit !== undefined) {
        const f = join(tmp, `admit-${n}.json`);
        writeFileSync(f, JSON.stringify(m.admit));
        args.push("--admit", f);
      }
      let answer: any;
      for (let until = deadline(); ; ) {
        const r = await kiln(args, o.env);
        if (r.code === 0) { answer = line(r); if (answer.reason === "not-ready" && Date.now() < until) { await new Promise((x) => setTimeout(x, 100)); continue; } break; }
        if ((r.code === 3 || r.code === 4) && Date.now() < until) { await new Promise((x) => setTimeout(x, 100)); continue; } // outcome unknown: the SAME key is retried
        throw new Error(`gate move failed (exit ${r.code}): ${r.stdout}${r.stderr}`);
      }
      const step: DriveStep = { gateId: g.gateId, gateKey: g.gateKey, round: g.round, kind: m.kind, answer };
      steps.push(step);
      o.log?.(JSON.stringify({ gate: g.gateId, move: m.kind, status: answer.status, ...(answer.reason ? { reason: answer.reason } : {}) }));
      const want = m.expect ?? "committed";
      const got = answer.status === "refused" ? `refused:${answer.reason}` : answer.status;
      if (got !== want && !(want === "refused" && answer.status === "refused")) throw new Error(`at ${g.gateId} the owner answered ${got}, the script expected ${want}`);
      after = g.gateId;
    }
    throw new Error("the walk did not end within 200 gates");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const get = (n: string): string | undefined => (a.includes(`--${n}`) ? a[a.indexOf(`--${n}`) + 1] : undefined);
  const store = get("store");
  const feature = get("feature");
  const scriptFile = get("script");
  if (!store || !feature || !scriptFile) {
    console.error("usage: node tests/walk/drive.ts --store <dir> --feature <f> --script <file.json> [--by script:r14]");
    process.exit(2);
  }
  try {
    const out = await drive({ store, feature, script: JSON.parse(readFileSync(scriptFile, "utf8")), by: get("by"), log: (s) => console.log(s) });
    console.log(JSON.stringify({ done: true, status: out.last.status, gates: out.steps.length }));
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
