// The owner's private local channel — the client side (FR-045, FR-046). It connects by socket PATH only and never opens the store. A request whose connection is lost, or that gets no answer within the
// timeout (5 s by default), resolves to an explicit OUTCOME UNKNOWN — `refused(store-error)` with `detail: "connection-lost" | "timeout"` — never a hang: the caller retries the same key.
import net from "node:net";
import { ChannelError, refused, type GateSpec, type GateState, type Key, type Move, type OpenOutcome, type Outcome, type TaskCreateOutcome } from "../types.ts";
import type { WalkInput } from "../walk/input.ts";
import type { WalkView } from "../walk/view.ts";
import { encode, type ChannelReply, type ChannelRequest } from "./protocol.ts";

export const CONNECTION_LOST = "connection-lost";
export const TIMEOUT = "timeout";
export const DEFAULT_TIMEOUT_MS = 5000;

export interface ChannelClient {
  open(key: Key, spec: GateSpec): Promise<OpenOutcome>;
  submit(gateId: string, key: Key, move: Move): Promise<Outcome>;
  /** A read: it throws `ChannelError` (never answers wrongly) when the owner cannot be heard. */
  state(gateId: string): Promise<GateState>;
  /** r14: admit a feature (keyed exactly once; an unknown outcome is retried with the same key). */
  admit(key: Key, feature: string, walk: WalkInput): Promise<TaskCreateOutcome>;
  /** r14: where a feature is. A read: throws `ChannelError` when the owner cannot be heard. */
  featureState(feature: string): Promise<WalkView>;
  /** r14: the open gate once it differs from `after` (or the walk ended). WAITS — with no timeout, on an event the owner raises — and throws `ChannelError("outcome-unknown")` if the owner goes away; the caller asks again. */
  featureNext(feature: string, after?: string): Promise<WalkView>;
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

  // `waitMs` 0 = wait for the owner as long as it takes (only `feature next`, which waits on an event); the connection closing still ends it
  const request = (body: Omit<ChannelRequest, "id">, waitMs = timeoutMs): Promise<ChannelReply | { lost: string }> =>
    new Promise((resolve) => {
      if (closed) return resolve({ lost: CONNECTION_LOST });
      const id = nextId++;
      const timer = waitMs > 0 ? setTimeout(() => { pending.delete(id); resolve({ lost: TIMEOUT }); }, waitMs) : undefined;
      pending.set(id, (r) => { if (timer) clearTimeout(timer); resolve(r); });
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
    admit: async (key, feature, walk) => answered(await request({ op: "feature.admit", key, feature, walk }), (why) => refused("store-error", { detail: why })) as TaskCreateOutcome,
    featureState: async (feature) => {
      const r = await request({ op: "feature.state", feature });
      if ("lost" in r) throw new ChannelError("outcome-unknown", `no answer from the owner (${r.lost})`);
      if (!r.ok) throw new ChannelError("bad-request", r.error);
      return r.result as WalkView;
    },
    featureNext: async (feature, after) => {
      const r = await request({ op: "feature.next", feature, ...(after !== undefined ? { after } : {}) }, 0);
      if ("lost" in r) throw new ChannelError("outcome-unknown", `the owner went away while waiting (${r.lost})`);
      if (!r.ok) throw new ChannelError(/closing/.test(r.error) ? "outcome-unknown" : "bad-request", r.error);
      return r.result as WalkView;
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
