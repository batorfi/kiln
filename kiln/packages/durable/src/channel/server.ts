// The owner's private local channel — the server side (FR-045). A Unix-domain socket in a directory this user made safe (0700), the socket itself 0600; NEVER a port: this file is one of the two
// allowed to import node:net, and the network lint holds it to socket PATHS only. The channel carries the port's operations and nothing else; every outcome crosses unchanged.
import { existsSync, lstatSync, unlinkSync } from "node:fs";
import net from "node:net";
import { dirname } from "node:path";
import { userInfo } from "node:os";
import { ensureSafeChannelDir, secureSocketFile, socketProblem } from "./path.ts";
import { ChannelUnsafe, type Channel, type GateSpec, type GateState, type Key, type Move, type OpenOutcome, type Outcome } from "../types.ts";
import type { WalkApi } from "../walk/api.ts";
import { MAX_LINE, encode, parseRequest, type ChannelReply } from "./protocol.ts";

export interface ChannelHandlers {
  ready(): boolean;
  open(key: Key, spec: GateSpec): Promise<OpenOutcome>;
  submit(gateId: string, key: Key, move: Move): Promise<Outcome>;
  state(gateId: string): Promise<GateState>;
  /** r14: the walks of features. */
  walks: WalkApi;
}

export async function startChannel(socketPath: string, handlers: ChannelHandlers): Promise<Channel> {
  const uid = userInfo().uid;
  ensureSafeChannelDir(dirname(socketPath), uid);
  // we hold the store's owner lock, so a socket file already at this path is a corpse of a killed owner — but only if it really is one of ours
  if (existsSync(socketPath)) {
    const problem = socketProblem(lstatSync(socketPath), uid);
    if (problem) throw new ChannelUnsafe(socketPath, `a file already exists there and ${problem}`);
    unlinkSync(socketPath);
  }

  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let buffer = "";
    const send = (r: ChannelReply): void => void (socket.destroyed || socket.write(encode(r)));
    const handle = async (line: string): Promise<void> => {
      const req = parseRequest(line);
      if ("error" in req) return send({ id: req.id, ok: false, error: req.error });
      try {
        switch (req.op) {
          case "ping": return send({ id: req.id, ok: true, result: { pong: true, ready: handlers.ready(), pid: process.pid } });
          case "ready": return send({ id: req.id, ok: true, result: { ready: handlers.ready() } });
          case "gate.open": return send({ id: req.id, ok: true, result: await handlers.open(req.key, req.spec) });
          case "gate.move": return send({ id: req.id, ok: true, result: await handlers.submit(req.gateId, req.key, req.move) });
          case "gate.state": return send({ id: req.id, ok: true, result: await handlers.state(req.gateId) });
          case "feature.admit": return send({ id: req.id, ok: true, result: await handlers.walks.admit(req.key, req.feature, req.walk) });
          case "feature.state": return send({ id: req.id, ok: true, result: await handlers.walks.state(req.feature) });
          // waits on an in-process event (never a timer, never a poll) and answers from the store; an owner that closes releases it with an error
          case "feature.move": return send({ id: req.id, ok: true, result: await handlers.walks.move(req.feature, req.key, req.move) });
          case "feature.next": return send({ id: req.id, ok: true, result: await handlers.walks.next(req.feature, req.after) });
        }
      } catch (e) {
        send({ id: req.id, ok: false, error: `owner error: ${(e as Error).message}` });
      }
    };
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      if (buffer.length > MAX_LINE) {
        send({ id: null, ok: false, error: "bad-request: line too long" });
        return void socket.destroy();
      }
      let at: number;
      while ((at = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, at);
        buffer = buffer.slice(at + 1);
        if (line.trim() !== "") void handle(line);
      }
    });
    socket.on("error", () => {
      /* a client that vanished mid-request is not the owner's problem */
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => resolve());
  });
  try {
    secureSocketFile(socketPath, uid);
  } catch (e) {
    server.close();
    throw e;
  }
  return {
    socketPath,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections?.();
        try { unlinkSync(socketPath); } catch { /* already gone */ }
      }),
  };
}
