// The two kinds of outside completer a scenario can use (FR-004): `inProcess` talks to the owner's socket from the test's own process (fast, many connections);
// `separateProcess` runs `node src/client.ts …` for every call — a different OS process from both the test and the owner, which is what the CLI or a server
// worker of r13 would be. Both speak the port; the scenarios do not know which they hold.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { connect } from "./client.ts";
import { refused, type GateId, type GateState, type Move, type MoveKey, type OpenResult, type Outcome } from "./port.ts";

export interface Completer {
  open(gate: GateId): Promise<OpenResult>;
  submit(gate: GateId, key: MoveKey, move: Move): Promise<Outcome>;
  state(gate: GateId): Promise<GateState>;
  close(): void;
}
export type CompleterFactory = (socket: string) => Promise<Completer>;

export const inProcess: CompleterFactory = (socket) => connect(socket);

const CLIENT = fileURLToPath(new URL("./client.ts", import.meta.url));

function runClient(socket: string, args: string[]): Promise<{ json: unknown; code: number | null }> {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [CLIENT, "--socket", socket, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.setEncoding("utf8");
    p.stdout.on("data", (d: string) => (out += d));
    p.on("close", (code) => {
      try {
        resolve({ json: JSON.parse(out.trim().split("\n").pop() ?? ""), code });
      } catch {
        resolve({ json: { error: `client process printed nothing parseable (exit ${code})` }, code });
      }
    });
  });
}

/** A fresh `node src/client.ts` process per call, at most `MAX_PARALLEL` at a time (a hundred concurrent node processes is a test of the laptop). */
const MAX_PARALLEL = 20;
let running = 0;
const waiting: (() => void)[] = [];
async function limited<T>(f: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await f();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

export const separateProcess: CompleterFactory = async (socket) => ({
  async open(gate) {
    const { json } = await limited(() => runClient(socket, ["open", gate]));
    return (json as { error?: string }).error ? { status: "refused", reason: "store-error", detail: (json as { error: string }).error } : (json as OpenResult);
  },
  async submit(gate, key, move) {
    const { json } = await limited(() => runClient(socket, ["submit", gate, key, move.kind, move.decidedBy, move.briefRef]));
    const err = (json as { error?: string }).error;
    return err ? refused("store-error", { detail: err }) : (json as Outcome);
  },
  async state(gate) {
    const { json } = await limited(() => runClient(socket, ["state", gate]));
    const err = (json as { error?: string }).error;
    if (err) throw new Error(err);
    return json as GateState;
  },
  close() {},
});
