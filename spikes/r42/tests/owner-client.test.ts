// T019 — the owner and the outside client work end to end on the CORRECT control: over the socket, from a SECOND PROCESS, across an abrupt kill.
// This is the harness proving itself before any library strategy is judged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { connect } from "../src/client.ts";
import { killNow, makeStore, startOwner } from "../src/harness.ts";

const CLIENT = fileURLToPath(new URL("../src/client.ts", import.meta.url));
const MOVE = { kind: "approve", decidedBy: "human@spike", briefRef: "brief:1" } as const;

/** One request from a SEPARATE process, parsed. */
function cli(socket: string, ...rest: string[]): any {
  const r = spawnSync(process.execPath, [CLIENT, "--socket", socket, ...rest], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return JSON.parse(r.stdout.trim());
}

test("C1 open → waiting → submit committed → settled, from a second process; then SIGKILL → restart → still settled with the same record", async () => {
  const s = makeStore();
  try {
    const owner = await startOwner({ strategy: "control-sqlite", store: s });
    assert.deepEqual(cli(s.socket, "open", "g1"), { status: "opened" });
    assert.deepEqual(cli(s.socket, "state", "g1"), { state: "waiting" });
    const committed = cli(s.socket, "submit", "g1", "k1", "approve", "human@spike", "brief:1");
    assert.equal(committed.status, "committed");
    const before = cli(s.socket, "state", "g1");
    assert.equal(before.state, "settled");
    assert.equal(before.record.key, "k1");

    const death = await killNow(owner);
    assert.equal(death.signal, "SIGKILL", "the owner was killed abruptly");

    const again = await startOwner({ strategy: "control-sqlite", store: s });
    assert.ok(again.pid !== owner.pid, "a fresh owner process");
    const after = cli(s.socket, "state", "g1");
    assert.deepEqual(after, before, "the settled gate and its record survived the kill");
    await killNow(again);
  } finally {
    s.cleanup();
  }
});

test("C2 the in-process client library agrees with the CLI, and a repeat or a stale move gets the contract's outcomes", async () => {
  const s = makeStore();
  try {
    const owner = await startOwner({ strategy: "control-sqlite", store: s });
    const c = await connect(s.socket);
    assert.deepEqual(await c.open("g1"), { status: "opened" });
    assert.equal((await c.submit("g1", "k1", MOVE)).status, "committed");
    assert.equal((await c.submit("g1", "k1", MOVE)).status, "repeat");
    const stale = await c.submit("g1", "k2", { ...MOVE, kind: "reject" });
    assert.deepEqual(stale, { status: "refused", reason: "stale", winner: "k1" });
    const conflict = await c.submit("g1", "k1", { ...MOVE, kind: "reject" });
    assert.deepEqual(conflict, { status: "refused", reason: "key-conflict", original: "k1" });
    c.close();
    await killNow(owner);
  } finally {
    s.cleanup();
  }
});

test("C3 a malformed request line gets an error response and does NOT kill the owner", async () => {
  const s = makeStore();
  try {
    const owner = await startOwner({ strategy: "control-sqlite", store: s });
    const reply = await new Promise<string>((resolve, reject) => {
      const sock = net.connect(s.socket);
      sock.setEncoding("utf8");
      sock.once("data", (d: string) => {
        sock.destroy();
        resolve(d);
      });
      sock.once("error", reject);
      sock.once("connect", () => sock.write("this is not json\n"));
    });
    const parsed = JSON.parse(reply.trim());
    assert.equal(parsed.ok, false);
    assert.match(parsed.error, /bad request/);
    // the owner is alive and still serves
    const c = await connect(s.socket);
    assert.deepEqual(await c.ping(), { pong: true, ready: true });
    c.close();
    assert.equal(owner.proc.exitCode, null);
    await killNow(owner);
  } finally {
    s.cleanup();
  }
});

test("C4 a request to an owner that is killed mid-conversation resolves (never hangs) as refused(store-error) 'connection-lost'", async () => {
  const s = makeStore();
  try {
    const owner = await startOwner({ strategy: "control-sqlite", store: s });
    const c = await connect(s.socket, { timeoutMs: 3000 });
    await c.open("g1");
    await killNow(owner);
    const outcome = await c.submit("g1", "k1", MOVE);
    assert.equal(outcome.status, "refused");
    assert.equal((outcome as any).reason, "store-error");
    assert.match((outcome as any).detail, /connection-lost|timeout/);
    c.close();
  } finally {
    s.cleanup();
  }
});
