// T060 — FR-011: no test opens a network connection. (1) STATIC: nothing under src/ or tests/ imports a network module, calls a global fetch or a WebSocket, or
// passes a port number or a host to connect/listen/createConnection — only a Unix-domain socket PATH is allowed. (2) RUNTIME: an owner for the correct control and
// for the native strategy is exercised (open, submit, state), and `lsof -nP -a -i -p <pid>` lists no network socket — also after a kill and a restart.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { inProcess } from "../src/completer.ts";
import { killNow, makeStore, startOwner } from "../src/harness.ts";
import { GATE, KEY, MOVE } from "../src/scenarios/common.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return f === "node_modules" ? [] : statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });

const FORBIDDEN: [string, RegExp][] = [
  ["node:http", /["']node:http["']/],
  ["node:https", /["']node:https["']/],
  ["node:http2", /["']node:http2["']/],
  ["node:dgram", /["']node:dgram["']/],
  ["node:dns", /["']node:dns(\/promises)?["']/],
  ["node:tls", /["']node:tls["']/],
  ["a global fetch(", /(^|[^.\w])fetch\s*\(/],
  ["new WebSocket(", /new\s+WebSocket\s*\(/],
  // connect/listen/createConnection given a number, an options object, or a string that is not an absolute path
  ["connect/listen with a port or a host", /\.(connect|listen|createConnection)\(\s*(\d|\{|["'`](?!\/))/],
];

test("NN1 static: no network module, no fetch, no WebSocket, no port or host in any file of src/ or tests/", () => {
  const files = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "tests"))].filter((f) => !f.endsWith("no-network.test.ts"));
  assert.ok(files.length >= 30, `scanned ${files.length} files`);
  for (const f of files) {
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (line.trimStart().startsWith("//")) return;
        for (const [what, re] of FORBIDDEN) assert.ok(!re.test(line), `${f.replace(ROOT, "")}:${i + 1} uses ${what}: ${line.trim()}`);
      });
  }
});

const networkSockets = (pid: number): string => {
  try {
    return execFileSync("lsof", ["-nP", "-a", "-i", "-p", String(pid)], { encoding: "utf8" }).trim();
  } catch (e) {
    const err = e as { status?: number; stdout?: string };
    if (err.status === 1) return (err.stdout ?? "").trim(); // lsof exits 1 when it lists nothing
    throw e; // lsof missing or failed: the proof was not made, so the test fails
  }
};

for (const name of ["control-sqlite", "native-signal"]) {
  test(`NN2 runtime: the ${name} owner holds no network socket — while serving, and after a kill and a restart`, async () => {
    const s = makeStore();
    try {
      let owner = await startOwner({ strategy: name, store: s });
      const c = await inProcess(s.socket);
      await c.open(GATE);
      await c.state(GATE);
      assert.equal(networkSockets(owner.pid), "", `${name} owner has a network socket`);
      const first = await c.submit(GATE, KEY, MOVE);
      assert.equal(first.status, "committed");
      assert.equal(networkSockets(owner.pid), "", "after a submit");
      c.close();
      await killNow(owner);
      owner = await startOwner({ strategy: name, store: s });
      const c2 = await inProcess(s.socket);
      await c2.state(GATE);
      assert.equal(networkSockets(owner.pid), "", "after a restart");
      c2.close();
      await killNow(owner);
    } finally {
      s.cleanup();
    }
  });
}

test("NN3 the lsof probe can see a network socket (so an empty answer means something)", async () => {
  const { createServer } = await import("node:net");
  const server = createServer();
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  try {
    assert.match(networkSockets(process.pid), /LISTEN/);
  } finally {
    server.close();
  }
});
