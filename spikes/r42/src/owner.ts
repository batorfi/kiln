// T016 — the OWNER process: the one process that holds the store and runs the strategy. Everything "from outside" reaches it over a Unix-domain
// socket in a private temporary directory (never a TCP port): one process owns a storage and there is no cross-process locking, so an outside
// completer — the CLI or a server worker of r13 — must go through the owner. Newline-delimited JSON, one request per line:
//   → {"id":1,"op":"open","gate":"g"} · {"id":2,"op":"submit","gate":"g","key":"k","move":{…}} · {"id":3,"op":"state","gate":"g"} · {"id":4,"op":"ping"}
//   ← {"id":1,"ok":true,"result":…}  or  {"id":1,"ok":false,"error":"…"}
// Usage: node src/owner.ts --store <dir> --strategy <name> --socket <path>
// Test-only environment: KILL_AT / KILL_LOG / FAULT_AT (src/kill.ts), OWNER_START_DELAY_MS (delays the strategy start so "not-ready" is observable) and
// OWNER_CLOCK_OFFSET_MS (the clock the strategy is handed runs this far ahead; `{"op":"clock","offsetMs":…}` moves it LIVE — the clock-jump scenario).
import { unlinkSync } from "node:fs";
import net from "node:net";
import { killPoint } from "./kill.ts";
import type { GateCompletion } from "./port.ts";
import { loadStrategy } from "./strategy.ts";

const args = process.argv.slice(2);
const arg = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const store = arg("--store");
const strategyName = arg("--strategy");
const socketPath = arg("--socket");
if (!store || !strategyName || !socketPath) {
  console.error("usage: node src/owner.ts --store <dir> --strategy <name> --socket <path>");
  process.exit(2);
}

// The first point reached on every start: a kill HERE is a kill during recovery (the store of a previous, killed owner is about to be reopened).
killPoint("recovery-start");

let gate: GateCompletion | undefined;
let started = false;
let clockOffsetMs = Number(process.env.OWNER_CLOCK_OFFSET_MS ?? 0);

type Reply = { id: unknown; ok: boolean; result?: unknown; error?: string };
const reply = (socket: net.Socket, msg: Reply, afterWrite?: () => void): void => {
  if (socket.destroyed) return;
  socket.write(`${JSON.stringify(msg)}\n`, afterWrite);
};

async function handle(socket: net.Socket, line: string): Promise<void> {
  let req: { id?: unknown; op?: unknown; gate?: unknown; key?: unknown; move?: unknown };
  try {
    req = JSON.parse(line);
  } catch {
    return reply(socket, { id: null, ok: false, error: "bad request: not JSON" });
  }
  if (typeof req !== "object" || req === null || typeof req.op !== "string") return reply(socket, { id: null, ok: false, error: "bad request: no op" });
  const id = req.id ?? null;
  if (req.op === "ping") return reply(socket, { id, ok: true, result: { pong: true, ready: started } });
  if (req.op === "clock") {
    clockOffsetMs = Number((req as { offsetMs?: unknown }).offsetMs ?? 0);
    return reply(socket, { id, ok: true, result: { offsetMs: clockOffsetMs } });
  }
  if (req.op === "submit") killPoint("move-received"); // the request line has been read; nothing has been dispatched
  if (!started || !gate) return reply(socket, { id, ok: false, error: "not-ready" });
  try {
    if (req.op === "open") return reply(socket, { id, ok: true, result: await gate.open(String(req.gate)) });
    if (req.op === "state") return reply(socket, { id, ok: true, result: await gate.state(String(req.gate)) });
    if (req.op === "submit") {
      const outcome = await gate.submit(String(req.gate), String(req.key), req.move as never);
      return reply(socket, { id, ok: true, result: outcome }, () => killPoint("ack-sent")); // after the acknowledgement has been written
    }
    return reply(socket, { id, ok: false, error: `bad request: unknown op "${req.op}"` });
  } catch (e) {
    return reply(socket, { id, ok: false, error: `owner error: ${(e as Error).message}` });
  }
}

const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  let buffer = "";
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let at: number;
    while ((at = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
      if (line.trim() !== "") void handle(socket, line);
    }
  });
  socket.on("error", () => {
    /* a client that vanished mid-request is not the owner's problem */
  });
});

try {
  unlinkSync(socketPath); // a killed predecessor leaves its socket file behind
} catch {
  /* none */
}

server.listen(socketPath, async () => {
  console.log("listening");
  try {
    const delay = Number(process.env.OWNER_START_DELAY_MS ?? 0);
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    const strategy = await loadStrategy(strategyName);
    gate = await strategy.start({ store, now: () => Date.now() + clockOffsetMs });
    started = true;
    console.log("ready");
  } catch (e) {
    console.error(`owner failed to start: ${(e as Error).message}`);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  try {
    await gate?.close();
  } finally {
    server.close();
    process.exit(0);
  }
});
