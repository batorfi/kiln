// The owner's private local channel — the client side (FR-045, FR-046). It connects by socket PATH only and never opens the store. A request whose connection is lost, or that gets no answer within the
// timeout (5 s by default), resolves to an explicit OUTCOME UNKNOWN — `refused(store-error)` with `detail: "connection-lost" | "timeout"` — never a hang: the caller retries the same key.
import net from "node:net";
import { ChannelError, refused, type GateSpec, type GateState, type Key, type Move, type OpenOutcome, type Outcome } from "../types.ts";
import { encode, type ChannelReply, type ChannelRequest } from "./protocol.ts";

export const CONNECTION_LOST = "connection-lost";
export const TIMEOUT = "timeout";
export const DEFAULT_TIMEOUT_MS = 5000;

export interface ChannelClient {
  open(key: Key, spec: GateSpec): Promise<OpenOutcome>;
  submit(gateId: string, key: Key, move: Move): Promise<Outcome>;
  /** A read: it throws `ChannelError` (never answers wrongly) when the owner cannot be heard. */
  state(gateId: string): Promise<GateState>;
  ping(): Promise<{ pong: true; ready: boolean; pid: number }>;
  ready(): Promise<boolean>;
  close(): void;
}

/** Connect to the owner's socket. Rejects with `ChannelError("unreachable")` when nothing is listening there. */
export async function connect(socketPath: string, opts: { timeoutMs?: number } = {}): Promise<ChannelClient> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const socket = await new Promise<net.Socket>((resolve, reject) => {
    const s = net.connect(socketPath);
    s.once("connect", () => resolve(s));
    s.once("error", (e) => reject(new ChannelError("unreachable", `nothing answers at ${socketPath}: ${(e as NodeJS.ErrnoException).code ?? e.message}`)));
  });
  socket.setEncoding("utf8");
  let nextId = 1;
  let closed = false;
  const pending = new Map<number, (r: ChannelReply | { lost: string }) => void>();
  const failAll = (why: string): void => {
    closed = true;
    for (const done of pending.values()) done({ lost: why });
    pending.clear();
  };
  let buffer = "";
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let at: number;
    while ((at = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line) as ChannelReply;
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

  const request = (body: Omit<ChannelRequest, "id">): Promise<ChannelReply | { lost: string }> =>
    new Promise((resolve) => {
      if (closed) return resolve({ lost: CONNECTION_LOST });
      const id = nextId++;
      const timer = setTimeout(() => { pending.delete(id); resolve({ lost: TIMEOUT }); }, timeoutMs);
      pending.set(id, (r) => { clearTimeout(timer); resolve(r); });
      socket.write(encode({ id, ...body }), (err) => {
        if (err) { const d = pending.get(id); pending.delete(id); d?.({ lost: CONNECTION_LOST }); }
      });
    });
  const answered = <T>(r: ChannelReply | { lost: string }, onLost: (why: string) => T): T | unknown => ("lost" in r ? onLost(r.lost) : r.ok ? r.result : refused("store-error", { detail: r.error }));

  return {
    open: async (key, spec) => answered(await request({ op: "gate.open", key, spec }), (why) => refused("store-error", { detail: why })) as OpenOutcome,
    submit: async (gateId, key, move) => answered(await request({ op: "gate.move", gateId, key, move }), (why) => refused("store-error", { detail: why })) as Outcome,
    state: async (gateId) => {
      const r = await request({ op: "gate.state", gateId });
      if ("lost" in r) throw new ChannelError("outcome-unknown", `no answer from the owner (${r.lost})`);
      if (!r.ok) throw new ChannelError("bad-request", r.error);
      return r.result as GateState;
    },
    ping: async () => {
      const r = await request({ op: "ping" });
      if ("lost" in r || !r.ok) throw new ChannelError("outcome-unknown", "the owner did not answer a ping");
      return r.result as { pong: true; ready: boolean; pid: number };
    },
    ready: async () => {
      const r = await request({ op: "ready" });
      if ("lost" in r || !r.ok) throw new ChannelError("outcome-unknown", "the owner did not answer");
      return (r.result as { ready: boolean }).ready;
    },
    close: () => socket.destroy(),
  };
}

/** Does something answer a ping at this socket? (Used to enrich a refusal; never to take a lock.) */
export async function answers(socketPath: string, timeoutMs = 500): Promise<boolean> {
  try {
    const c = await connect(socketPath, { timeoutMs });
    try {
      await c.ping();
      return true;
    } finally {
      c.close();
    }
  } catch {
    return false;
  }
}
