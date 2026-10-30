// r13 T058 — "no network" is observed, not only promised (FR-045, SC-007): while the owner serves, after a move, and after a SIGKILL and restart, the operating system lists NO network socket for the
// owner process; a control proves the probe can see a real TCP listener (so an empty answer means something); and the sources are scanned for `listen`/`connect` with a port or host, independently of
// the lint's own rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { kiln, json, startKilnOwner, type KilnOwner } from "./support/kiln.ts";

const kilnDir = fileURLToPath(new URL("../../..", import.meta.url));
const BRIEF = join(kilnDir, "fixtures", "demo-brief.json");

/** What the OS says this process has open on the network (IPv4/IPv6, TCP/UDP): lines after the header, "" when none. */
function networkFiles(pid: number): string {
  const r = spawnSync("lsof", ["-nP", "-a", "-i", "-p", String(pid)], { encoding: "utf8" });
  assert.ok(r.status === 0 || r.status === 1, `lsof failed to run: ${r.stderr}`); // 1 = nothing matched
  return r.stdout.split("\n").slice(1).join("\n").trim();
}
/** Unix-domain sockets of the process (the channel is one of them). */
const unixFiles = (pid: number): string => spawnSync("lsof", ["-nP", "-a", "-U", "-p", String(pid)], { encoding: "utf8" }).stdout;

test("the probe sees a real TCP listener (control: an empty answer for the owner means something)", async (t) => {
  const child = spawn(process.execPath, ["-e", "require('node:net').createServer().listen(0, '127.0.0.1', () => console.log('up')); setInterval(() => {}, 1000)"], { stdio: ["ignore", "pipe", "inherit"] });
  t.after(() => child.kill("SIGKILL"));
  await new Promise<void>((res) => child.stdout.on("data", (d) => String(d).includes("up") && res()));
  const seen = networkFiles(child.pid!);
  assert.match(seen, /TCP .*LISTEN/, `the probe must list the listener; it printed: "${seen}"`);
});

test("the owner has NO network socket while serving, after a move, and after a SIGKILL and restart — only a Unix-domain socket", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "k13nn-"));
  const env = { TMPDIR: dir };
  const store = join(dir, "s");
  const owners: KilnOwner[] = [];
  t.after(() => {
    for (const o of owners) o.kill("SIGKILL");
    rmSync(dir, { recursive: true, force: true });
  });
  const start = async (): Promise<KilnOwner> => {
    const o = startKilnOwner(store, env);
    owners.push(o);
    await o.ready;
    return o;
  };

  const first = await start();
  assert.equal(networkFiles(first.pid), "", "serving");
  assert.match(unixFiles(first.pid), /\.sock/, "the owner does hold its Unix-domain socket (the probe is looking at the right process)");

  const o = await kiln(["gate", "open", "--store", store, "--key", "o1", "--gate", "gate:demo:gate0:1", "--gate-key", "gate0", "--flow", "v2", "--brief", BRIEF, "--by", "factory"], env);
  const ref = json(o).gate.briefRef as string;
  const m = await kiln(["gate", "move", "--store", store, "--gate", "gate:demo:gate0:1", "--key", "m1", "--kind", "approve", "--by", "p@test", "--brief-ref", ref], env);
  assert.equal(json(m).status, "committed");
  assert.equal(networkFiles(first.pid), "", "after a move");

  first.kill("SIGKILL");
  await first.exited;
  const second = await start();
  assert.notEqual(second.pid, first.pid);
  assert.equal(networkFiles(second.pid), "", "after a SIGKILL and restart");
  assert.equal(json(await kiln(["gate", "state", "--store", store, "--gate", "gate:demo:gate0:1"], env)).state, "settled", "and it still serves what was settled");
});

test("no source file anywhere listens or connects with a port or host (asserted independently of the lint)", () => {
  const files: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === "tests" || e.name === ".git") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|js|mjs)$/.test(e.name)) files.push(p);
    }
  };
  walk(join(kilnDir, "packages"));
  assert.ok(files.length > 20, `the scan saw ${files.length} files`);
  let channelCalls = 0;
  for (const f of files) {
    const text = readFileSync(f, "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of text.matchAll(/\.(listen|connect|createConnection)\s*\(([^)]*)\)/g)) {
      const first = m[2].split(",")[0].trim();
      assert.doesNotMatch(first, /^\d|^\{|port|host/i, `${relative(kilnDir, f)}: .${m[1]}(${m[2]}) looks like a port or host`);
      assert.match(first, /^(socketPath|path)$/, `${relative(kilnDir, f)}: .${m[1]}(${first}) is not a socket PATH variable`);
      channelCalls++;
    }
    assert.doesNotMatch(text, /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, relative(kilnDir, f));
    assert.doesNotMatch(text, /node:(http|https|http2|dgram|tls|dns)\b/, relative(kilnDir, f));
  }
  assert.equal(channelCalls, 2, "exactly the two channel calls were seen (server listen, client connect) — the scan is not vacuous");
});
