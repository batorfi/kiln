// r13 T009 — the local-IPC rule of `kiln check network` (contracts/checks-and-docs.md): `node:net` is allowed in exactly the files on checks/local-ipc.json, and there only on a Unix-domain socket PATH —
// never a port, an options object or a host; every other network module stays refused everywhere. The first program's scan is not weakened: the same specifiers in an UNLISTED file fail as before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkNetwork, scanTextDetailed } from "#checks/network-lint.ts";

const IPC = { localIpc: true } as const;
const KEY = "packages/durable/src/channel/server.ts";
const ipc = (src: string) => scanTextDetailed(src, KEY, [], KEY, IPC).map((o) => o.code);
const plain = (src: string) => scanTextDetailed(src, "packages/lane/src/x.ts", [], "packages/lane/src/x.ts").map((o) => o.code);

test("a Unix-domain socket PATH is fine in a listed file: server.listen(path), net.connect(path), a variable, an absolute literal", () => {
  assert.deepEqual(ipc('import net from "node:net";\nexport const s = net.createServer(); s.listen(socketPath, () => {});\n'), []);
  assert.deepEqual(ipc('import net from "node:net";\nexport const c = net.connect(socketPath);\n'), []);
  assert.deepEqual(ipc('import net from "node:net";\nexport const c = net.createConnection(path);\n'), []);
  assert.deepEqual(ipc('import net from "node:net";\nconst s = net.createServer(); s.listen("/tmp/kiln-501/ab.sock");\n'), []);
  assert.deepEqual(ipc('import { createServer, connect } from "net";\nconnect(p);\ncreateServer().listen(p);\n'), []);
});

for (const [name, src] of Object.entries({
  "listen on a port": 'import net from "node:net";\nnet.createServer().listen(8080);\n',
  "listen on an options object": 'import net from "node:net";\nnet.createServer().listen({ port: 1 });\n',
  "listen with a port and a host": 'import net from "node:net";\nnet.createServer().listen(0, "127.0.0.1");\n',
  "connect to a host name": 'import net from "node:net";\nnet.connect("example.com");\n',
  "connect with an options object": 'import net from "node:net";\nnet.connect({ host: "x", port: 1 });\n',
  "connect with a port and a host": 'import net from "node:net";\nnet.connect(3000, "localhost");\n',
  "createConnection to a relative path": 'import net from "node:net";\nnet.createConnection("sock");\n',
  "createConnection on a port": 'import net from "node:net";\nnet.createConnection(80);\n',
})) {
  test(`${name} in a listed file fails network-local-ipc-port`, () => assert.ok(ipc(src).includes("network-local-ipc-port"), `${name}: ${ipc(src).join(",")}`));
}

for (const m of ["node:http", "http", "node:https", "node:http2", "node:dgram", "node:dns", "node:tls", "node:child_process"]) {
  test(`${m} in a LISTED file fails network-local-ipc-other (a local-IPC file may import node:net only)`, () => {
    assert.ok(ipc(`import x from "${m}";\nexport default x;\n`).includes("network-local-ipc-other"));
  });
}

test("node:net in an UNLISTED file is still network-import — the first program's rule is untouched", () => {
  for (const spec of ["node:net", "net"]) assert.ok(plain(`import net from "${spec}";\nexport default net;\n`).includes("network-import"), spec);
  assert.ok(plain('const n = require("net"); export default n;\n').includes("network-import"));
});

test("fetch and the http calls stay refused even in a listed file", () => {
  assert.ok(ipc('import net from "node:net";\nexport const r = await fetch("https://example.com");\n').includes("network-call"));
});

test("a listed file's net calls are not mistaken for the general network-call rule (that is what the path rule is for)", () => {
  assert.deepEqual(ipc('import net from "node:net";\nnet.connect(socketPath);\n'), []);
  // …while the same call in an unlisted file that somehow has the import is refused by name
  assert.ok(plain('import net from "node:net";\nnet.connect(socketPath);\n').includes("network-call"));
});

// the allowlist's own self-checks (same shape as the loopback allowlist's)
function scratch(files: Record<string, string>, localIpc: { schema: 1; entries: { path: string }[] }, run: (k: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "kiln-ipc-"));
  try {
    const k = join(root, "kiln");
    for (const [p, t] of Object.entries(files)) { mkdirSync(dirname(join(k, p)), { recursive: true }); writeFileSync(join(k, p), t); }
    run(k);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const NONE = { schema: 1 as const, entries: [] };
const GOOD = { "packages/durable/src/channel/server.ts": 'import net from "node:net";\nexport const s = net.createServer().listen(socketPath);\n' };

test("the check passes a listed server file and reports the allowlist in its notes", () => {
  scratch(GOOD, { schema: 1, entries: [{ path: KEY }] }, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: NONE, externals: {}, localIpc: { schema: 1, entries: [{ path: KEY }] } });
    assert.deepEqual(r.failures, []);
    assert.ok(r.notes.some((n) => /local-IPC allowlist: 1 file/.test(n)), r.notes.join("|"));
  });
});

test("the same file NOT on the list fails network-import by name", () => {
  scratch(GOOD, NONE, (k) => assert.deepEqual([...new Set(checkNetwork({ kilnDir: k, allowlist: NONE, externals: {}, localIpc: NONE }).failures.map((f) => f.code))], ["network-import"]));
});

test("a bare-name entry fails allowlist-bare-name; an entry for a missing file fails allowlist-missing-file; an unscanned file (a test) fails allowlist-missing-file", () => {
  const run = (entry: string, files = GOOD) => scratch({ ...files, "packages/durable/tests/t.test.ts": "export {};\n" }, NONE, (k) => {
    const r = checkNetwork({ kilnDir: k, allowlist: NONE, externals: {}, localIpc: { schema: 1, entries: [{ path: entry }] } });
    this_codes.push(...r.failures.map((f) => f.code));
  });
  const this_codes: string[] = [];
  run("server.ts"); run("packages/durable/src/channel/nope.ts"); run("packages/durable/tests/t.test.ts");
  assert.deepEqual(this_codes.filter((c) => c.startsWith("allowlist-")), ["allowlist-bare-name", "allowlist-missing-file", "allowlist-missing-file"]);
});

test("a local-IPC allowlist that is not schema 1 fails network-allowlist-invalid", () => {
  scratch(GOOD, NONE, (k) => assert.ok(checkNetwork({ kilnDir: k, allowlist: NONE, externals: {}, localIpc: { schema: 2, entries: [] } as never }).failures.some((f) => f.code === "network-allowlist-invalid")));
});

test("the real tree: the two channel files are listed, exist, and the check passes", () => {
  const r = checkNetwork();
  assert.deepEqual(r.failures, []);
  assert.ok(r.notes.some((n) => /local-IPC allowlist: 2 files/.test(n)), r.notes.join("|"));
});
