// T017 — the OUTSIDE COMPLETER: a client of the owner's socket. As a library (`connect`) it is used by the tests; as a CLI it runs as a SEPARATE
// PROCESS, which is what FR-004 requires ("a completer that is a different process from the one that owns the store"). It never touches the store file.
//   node src/client.ts --socket <path> open <gate>
//   node src/client.ts --socket <path> state <gate>
//   node src/client.ts --socket <path> submit <gate> <key> <kind> <decidedBy> [briefRef]
// A request that cannot complete (the owner was killed, no answer in time) resolves to `refused(store-error)` with a detail naming why — it never hangs,
// and the caller can tell an answer from "outcome unknown".
import net from "node:net";
import { isEntryPoint } from "./entry.ts";
import { refused, type GateId, type GateState, type Move, type MoveKey, type OpenResult, type Outcome } from "./port.ts";

export interface Client {
  open(gate: GateId): Promise<OpenResult>;
  submit(gate: GateId, key: MoveKey, move: Move): Promise<Outcome>;
  state(gate: GateId): Promise<GateState>;
  ping(): Promise<{ pong: boolean; ready: boolean } | null>;
  /** Test-only seam: move the clock the owner hands its strategy. */
  setClock(offsetMs: number): Promise<boolean>;
  close(): void;
}

type Resp = { id: unknown; ok: boolean; result?: unknown; error?: string };
export const CONNECTION_LOST = "connection-lost";
export const TIMEOUT = "timeout";

export async function connect(socketPath: string, opts: { timeoutMs?: number } = {}): Promise<Client> {
  const timeoutMs = opts.timeoutMs ?? 5000;
  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const s = net.connect(socketPath);
    s.once("connect", () => resolve(s));
    s.once("error", reject);
  });
  socket.setEncoding("utf8");
  let nextId = 1;
  let closed = false;
  const pending = new Map<number, (r: Resp) => void>();
  const failAll = (error: string): void => {
    closed = true;
    for (const [id, done] of pending) done({ id, ok: false, error });
    pending.clear();
  };
  let buffer = "";
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let at: number;
    while ((at = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
      if (line.trim() === "") continue;
      try {
        const r = JSON.parse(line) as Resp;
        const done = typeof r.id === "number" ? pending.get(r.id) : undefined;
        if (done) {
          pending.delete(r.id as number);
          done(r);
        }
      } catch {
        /* a garbled line is dropped; its request will time out */
      }
    }
  });
  socket.on("close", () => failAll(CONNECTION_LOST));
  socket.on("error", () => failAll(CONNECTION_LOST));

  const request = (body: Record<string, unknown>): Promise<Resp> =>
    new Promise((resolve) => {
      if (closed) return resolve({ id: null, ok: false, error: CONNECTION_LOST });
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({ id, ok: false, error: TIMEOUT });
      }, timeoutMs);
      pending.set(id, (r) => {
        clearTimeout(timer);
        resolve(r);
      });
      socket.write(`${JSON.stringify({ id, ...body })}\n`, (err) => {
        if (err) {
          const done = pending.get(id);
          pending.delete(id);
          done?.({ id, ok: false, error: CONNECTION_LOST });
        }
      });
    });

  return {
    async open(gate) {
      const r = await request({ op: "open", gate });
      return r.ok ? (r.result as OpenResult) : { status: "refused", reason: "store-error", detail: r.error };
    },
    async submit(gate, key, move) {
      const r = await request({ op: "submit", gate, key, move });
      if (r.ok) return r.result as Outcome;
      return r.error === "not-ready" ? refused("not-ready") : refused("store-error", { detail: r.error });
    },
    async state(gate) {
      const r = await request({ op: "state", gate });
      if (!r.ok) throw new Error(r.error ?? "state failed");
      return r.result as GateState;
    },
    async setClock(offsetMs) {
      const r = await request({ op: "clock", offsetMs });
      return r.ok;
    },
    async ping() {
      const r = await request({ op: "ping" });
      return r.ok ? (r.result as { pong: boolean; ready: boolean }) : null;
    },
    close() {
      socket.destroy();
    },
  };
}

// ── the CLI ──
if (isEntryPoint(import.meta.url)) {
  const argv = process.argv.slice(2);
  const at = argv.indexOf("--socket");
  const socketPath = at >= 0 ? argv[at + 1] : undefined;
  const rest = argv.filter((_, i) => i !== at && i !== at + 1);
  const [op, gate, key, kind, decidedBy, briefRef = "brief:cli"] = rest;
  if (!socketPath || !op || !gate || (op === "submit" && (!key || !kind || !decidedBy))) {
    console.error("usage: node src/client.ts --socket <path> open|state <gate> | submit <gate> <key> <kind> <decidedBy> [briefRef]");
    process.exit(2);
  }
  let client: Client;
  try {
    client = await connect(socketPath);
  } catch (e) {
    console.log(JSON.stringify({ error: `connect failed: ${(e as Error).message}` }));
    process.exit(3);
  }
  try {
    const result =
      op === "open" ? await client.open(gate) : op === "state" ? await client.state(gate) : await client.submit(gate, key!, { kind: kind as Move["kind"], decidedBy: decidedBy!, briefRef });
    console.log(JSON.stringify(result));
  } catch (e) {
    console.log(JSON.stringify({ error: (e as Error).message }));
    process.exit(4);
  } finally {
    client.close();
  }
}
