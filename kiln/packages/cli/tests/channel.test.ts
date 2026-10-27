// r13 T057 — the owner's private channel and the thin command line over it (FR-041, FR-042, FR-045, FR-046; contracts/owner-channel.md). Every completer here is a SEPARATE PROCESS of the real
// command line; the owners are real `kiln owner` processes (or the test owner, where an arming hook is needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, chmodSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { directoryProblem } from "#durable/channel/path.ts";
import { briefRef } from "#durable/canonical.ts";
import { kiln, json, startKilnOwner, type KilnOwner } from "./support/kiln.ts";
import { makeStore, startOwner as startTestOwner, killNow } from "../../durable/tests/proof/support/harness.ts";

const uid = userInfo().uid;
const brief = JSON.parse(readFileSync(fileURLToPath(new URL("../../../fixtures/demo-brief.json", import.meta.url)), "utf8"));
const BRIEF = fileURLToPath(new URL("../../../fixtures/demo-brief.json", import.meta.url));
const SILENT = fileURLToPath(new URL("../../durable/tests/support/silent-owner.ts", import.meta.url));

/** A scratch world: a store path and a private TMPDIR (so the owner's socket directory is ours to attack). Every owner started is stopped, whatever the test does. */
function world() {
  const dir = mkdtempSync(join(tmpdir(), "k13ch-"));
  const owners: KilnOwner[] = [];
  const env = { TMPDIR: dir };
  return {
    dir,
    store: join(dir, "s"),
    env,
    sockDir: join(dir, `kiln-${uid}`),
    owner(store = join(dir, "s"), extra: Record<string, string | undefined> = {}) {
      const o = startKilnOwner(store, { ...env, ...extra });
      owners.push(o);
      return o;
    },
    cleanup() {
      for (const o of owners) if (o.proc.exitCode === null && o.proc.signalCode === null) o.proc.kill("SIGKILL");
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
const open = (w: { env: Record<string, string>; store: string }, key = "o1", gate = "gate:demo:gate0:1") =>
  kiln(["gate", "open", "--store", w.store, "--key", key, "--gate", gate, "--gate-key", "gate0", "--flow", "v2", "--brief", BRIEF, "--by", "factory"], w.env);
const move = (w: { env: Record<string, string>; store: string }, key: string, kind: string, ref: string, by = "person@example", gate = "gate:demo:gate0:1") =>
  kiln(["gate", "move", "--store", w.store, "--gate", gate, "--key", key, "--kind", kind, "--by", by, "--brief-ref", ref], w.env);
const state = (w: { env: Record<string, string>; store: string }, gate = "gate:demo:gate0:1") => kiln(["gate", "state", "--store", w.store, "--gate", gate], w.env);

test("every contract outcome comes back from a separate command-line process, one JSON line each, exit 0 for any answered request", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  const o = w.owner();
  await o.ready;
  assert.match(o.stdout(), /^listening\nready\n$/);

  const opened = await open(w);
  assert.equal(opened.code, 0, opened.stderr);
  const gate = json(opened);
  assert.equal(gate.status, "opened");
  const ref = gate.gate.briefRef as string;
  assert.equal(ref, briefRef(brief), "the printed reference is the content hash of the brief");
  assert.equal(opened.stdout.trim().split("\n").length, 1, "one JSON line out");

  assert.equal(json(await open(w)).status, "repeat", "the same key again: the same gate");
  const conflict = json(await open(w, "o2"));
  assert.deepEqual([conflict.status, conflict.reason, conflict.original], ["refused", "key-conflict", "o1"]);
  assert.deepEqual(json(await state(w)), { state: "waiting" });

  const unknown = await move(w, "u1", "approve", ref, "person@example", "gate:nope:gate0:1");
  assert.equal(unknown.code, 0);
  assert.equal(json(unknown).reason, "unknown-gate");
  for (const [why, r] of [
    ["a kind outside the vocabulary", await move(w, "i1", "launch", ref)],
    ["no decider", await move(w, "i2", "approve", ref, "")],
    ["no brief reference", await move(w, "i3", "approve", "")],
    ["a different brief reference", await move(w, "i4", "approve", "sha256:" + "0".repeat(64))],
  ] as const) {
    assert.equal(r.code, 0, `${why}: ${r.stderr}`);
    assert.equal(json(r).reason, "invalid-move", why);
  }
  assert.deepEqual(json(await state(w)), { state: "waiting" }, "every refusal left the gate waiting");

  const first = json(await move(w, "m1", "approve", ref));
  assert.equal(first.status, "committed");
  assert.equal(first.record.key, "m1");
  assert.equal(json(await move(w, "m1", "approve", ref)).status, "repeat");
  const stale = json(await move(w, "m2", "reject", ref));
  assert.deepEqual([stale.status, stale.reason, stale.winner], ["refused", "stale", "m1"]);
  const keyConflict = json(await move(w, "m1", "reject", ref));
  assert.deepEqual([keyConflict.reason], ["key-conflict"]);
  const settled = json(await state(w));
  assert.equal(settled.state, "settled");
  assert.equal(settled.record.move.kind, "approve");
});

test("usage errors exit 2 and name what is wrong; no owner exits 3; nothing opens the store", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  const bad = await kiln(["gate", "move", "--store", w.store, "--gate", "g"], w.env);
  assert.equal(bad.code, 2);
  assert.match(bad.stderr, /missing --key, --kind, --by, --brief-ref/);
  assert.equal((await kiln(["gate", "frobnicate", "--store", w.store], w.env)).code, 2);
  assert.equal((await kiln(["owner"], w.env)).code, 2);
  const none = await state(w);
  assert.equal(none.code, 3, none.stdout + none.stderr);
  assert.equal(json(none).error, "unreachable");
  assert.equal(existsSync(join(w.store, "owner.lock")), false, "a completer never creates the owner's lock");
  assert.equal(existsSync(join(w.store, "store.db")) || readdirSync(w.store).some((f) => /\.(db|sqlite)/.test(f)), false, "a completer never opens or creates the store");
});

test("a second owner on an owned store is refused 20 times, naming store, pid, host and socket — and the first owner is unharmed", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  const first = w.owner();
  await first.ready;
  const ref = json(await open(w)).gate.briefRef as string;
  const refusals = [];
  for (let batch = 0; batch < 4; batch++) refusals.push(...(await Promise.all(Array.from({ length: 5 }, () => kiln(["owner", "--store", w.store], w.env)))));
  assert.equal(refusals.length, 20);
  for (const r of refusals) {
    assert.equal(r.code, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /StoreOwned/);
    for (const part of [w.store, `pid ${first.pid}`, "socket"]) assert.ok(r.stderr.includes(part), `refusal lacks "${part}": ${r.stderr}`);
    assert.match(r.stderr, /on \S+ \(socket \S+\.sock\)/, "the host and the socket are named");
  }
  assert.equal(first.proc.exitCode, null, "the first owner is still running");
  assert.equal(json(await move(w, "m1", "approve", ref)).status, "committed", "and still serving");
});

test("SIGKILL of the owner: a new process takes over on its FIRST attempt and the gate is as it was", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  const first = w.owner();
  await first.ready;
  const ref = json(await open(w)).gate.briefRef as string;
  first.kill("SIGKILL");
  await first.exited;
  assert.equal(readdirSync(w.sockDir).filter((f) => f.endsWith(".sock")).length, 1, "the corpse of the socket is still there");
  const second = w.owner();
  await second.ready; // rejects if the first attempt did not succeed
  assert.notEqual(second.pid, first.pid);
  assert.deepEqual(json(await state(w)), { state: "waiting" });
  assert.equal(json(await move(w, "m1", "approve", ref)).status, "committed");
});

test("a clean stop (SIGTERM) removes the socket and the lock, and exits 0", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  const o = w.owner();
  await o.ready;
  o.kill("SIGTERM");
  const { code } = await o.exited;
  assert.equal(code, 0);
  assert.deepEqual(readdirSync(w.sockDir).filter((f) => f.endsWith(".sock")), [], "no socket left behind");
  const again = w.owner();
  await again.ready;
});

test("a request whose owner is SIGKILLed mid-way ends with OUTCOME UNKNOWN (exit 4), quickly, and the same key then finishes the job", async (t) => {
  const ts = makeStore();
  t.after(() => ts.cleanup());
  const env = { TMPDIR: ts.dir };
  const w = { env, store: ts.store };
  const owner = await startTestOwner(ts, { serve: true, killAt: "move.commit-begin", env });
  const ref = json(await open(w)).gate.briefRef as string;
  const t0 = performance.now();
  const r = await move(w, "m1", "approve", ref);
  assert.equal(r.code, 4, r.stdout + r.stderr);
  assert.ok(performance.now() - t0 < 5000, "the loss of the connection is noticed at once, not after the timeout");
  const out = json(r);
  assert.deepEqual([out.reason, out.detail], ["store-error", "connection-lost"]);
  await killNow(owner);
  // a new owner (unarmed): the SAME key settles it, exactly once
  const next = await startTestOwner(ts, { serve: true, env });
  const again = await move(w, "m1", "approve", ref);
  assert.equal(again.code, 0, again.stdout + again.stderr);
  assert.ok(["committed", "repeat"].includes(json(again).status));
  await killNow(next);
});

for (const mode of ["silent", "drop"] as const) {
  test(`an owner that ${mode === "silent" ? "never answers" : "closes the connection"} ends with outcome unknown (exit 4) within 5 s — never a hang`, async (t) => {
    const w = world();
    t.after(() => w.cleanup());
    mkdirSync(w.store, { recursive: true });
    // the socket path the CLI will compute for this store: <TMPDIR>/kiln-<uid>/<id>.sock — found by asking a real channel where it would be
    const probe = spawn(process.execPath, ["-e", `import("${fileURLToPath(new URL("../../durable/src/channel/path.ts", import.meta.url))}").then((m) => console.log(m.channelSocketPath(process.argv[1])))`, w.store], { env: { ...process.env, TMPDIR: w.dir }, stdio: ["ignore", "pipe", "inherit"] });
    let sock = "";
    probe.stdout.on("data", (d) => (sock += d));
    await new Promise((r) => probe.once("exit", r));
    sock = sock.trim();
    assert.ok(sock.startsWith(w.dir), sock);
    const fake = spawn(process.execPath, [SILENT, mode, sock], { stdio: ["ignore", "pipe", "inherit"] });
    t.after(() => fake.kill("SIGKILL"));
    await new Promise<void>((res) => fake.stdout.on("data", (d) => String(d).includes("LISTENING") && res()));
    const t0 = performance.now();
    const r = await state(w);
    const took = performance.now() - t0;
    assert.equal(r.code, 4, r.stdout + r.stderr);
    assert.equal(json(r).error, "outcome-unknown");
    assert.ok(took < 7000, `answered "outcome unknown" in ${Math.round(took)} ms`);
    if (mode === "silent") assert.ok(took >= 4500, `a silent owner is waited for the full 5 s, not less (${Math.round(took)} ms)`);
    const mv = await move(w, "m1", "approve", "ref");
    assert.equal(mv.code, 4);
    assert.deepEqual([json(mv).reason], ["store-error"]);
    assert.ok(["connection-lost", "timeout"].includes(json(mv).detail));
  });
}

test("the socket is mode 0600 in a directory of mode 0700, and a 200-character store path still yields a short, usable socket path", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  const deep = join(w.dir, "d".repeat(100), "e".repeat(100), "store");
  assert.ok(deep.length > 200);
  const o = w.owner(deep);
  await o.ready;
  const socks = readdirSync(w.sockDir).filter((f) => f.endsWith(".sock"));
  assert.equal(socks.length, 1);
  const sock = join(w.sockDir, socks[0]);
  assert.equal(statSync(w.sockDir).mode & 0o777, 0o700);
  assert.equal(statSync(sock).mode & 0o777, 0o600);
  assert.ok(sock.length < 104, `the socket path is ${sock.length} characters`);
  assert.ok(!sock.includes("ddddd"), "it does not contain the store path");
  const r = await kiln(["gate", "state", "--store", deep, "--gate", "gate:none:gate0:1"], w.env);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.deepEqual(json(r), { state: "unknown" });
});

test("a pre-created symlink where the socket directory goes is refused with ChannelUnsafe, and nothing is left owning the store", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  const elsewhere = join(w.dir, "elsewhere");
  mkdirSync(elsewhere, { mode: 0o700 });
  symlinkSync(elsewhere, w.sockDir);
  const r = await kiln(["owner", "--store", w.store], w.env);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /ChannelUnsafe/);
  assert.ok(r.stderr.includes(w.sockDir), "it names the path");
  assert.match(r.stderr, /symbolic link/);
  assert.deepEqual(readdirSync(elsewhere), [], "nothing was created through the link");
  rmSync(w.sockDir); // the attacker's link is gone: the very next owner starts — the refusal did not leave the store owned
  const ok = w.owner();
  await ok.ready;
});

test("a socket directory with the wrong mode is refused with ChannelUnsafe naming the mode", async (t) => {
  const w = world();
  t.after(() => w.cleanup());
  mkdirSync(w.sockDir);
  chmodSync(w.sockDir, 0o755);
  const r = await kiln(["owner", "--store", w.store], w.env);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /ChannelUnsafe/);
  assert.match(r.stderr, /mode is 755, not 700/);
});

test("the safe-directory rule over a stat result: a directory owned by someone else is refused (no root needed)", () => {
  const stat = (over: Partial<{ dir: boolean; link: boolean; uid: number; mode: number }> = {}) => ({
    isDirectory: () => over.dir ?? true,
    isSymbolicLink: () => over.link ?? false,
    isSocket: () => false,
    uid: over.uid ?? 501,
    mode: over.mode ?? 0o40700,
  });
  assert.equal(directoryProblem(stat(), 501), null);
  assert.match(directoryProblem(stat({ uid: 0 }), 501)!, /owned by uid 0, not by the current user \(uid 501\)/);
  assert.match(directoryProblem(stat({ link: true }), 501)!, /symbolic link/);
  assert.match(directoryProblem(stat({ dir: false }), 501)!, /not a directory/);
  assert.match(directoryProblem(stat({ mode: 0o40770 }), 501)!, /mode is 770, not 700/);
  assert.match(directoryProblem(stat({ mode: 0o40750 }), 501)!, /750/);
});

test("the command line reaches the durable package through exactly three modules: the channel client, the path arithmetic and the owner runner", () => {
  const src = join(fileURLToPath(new URL("../src", import.meta.url)));
  const allowed = new Set(["#durable/channel/client.ts", "#durable/channel/path.ts", "#durable/owner.ts"]);
  const found = new Set<string>();
  for (const f of readdirSync(src).filter((n) => n.endsWith(".ts"))) {
    const text = readFileSync(join(src, f), "utf8");
    for (const m of text.matchAll(/from\s+["'](#durable\/[^"']+)["']/g)) {
      found.add(m[1]);
      assert.ok(allowed.has(m[1]), `${f} imports ${m[1]}, which is not one of the three`);
    }
    assert.doesNotMatch(text, /node:sqlite|pi-durable|store\.ts|factory\.ts/, `${f} must never open the store or the library`);
  }
  assert.ok(found.has("#durable/channel/client.ts"), "the scan saw the client import (it is not vacuous)");
});
