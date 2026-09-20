// kiln/tests/ollama-resident/failure-modes.test.ts — T022/T023 (US1), r7 · contract O2/O3 · OFFLINE tier.
//
// The Ollama resident's failure modes and request discipline, tested against a tiny FAKE loopback server, so
// they run on every machine — including a newcomer's with no Ollama at all (NC3=A: the default suite never
// needs a model). Each failure is asserted by its NAMED `OllamaError.code`, never a message substring.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { makeOllamaResident, resolveOllamaBase, isLoopbackHost, promptFor, OllamaError } from "../../src/ollama-resident.ts";
import type { WorkUnit } from "../../src/stub-resident.ts";

const unit = (id: string, role: WorkUnit["role"] = "worker"): WorkUnit => ({ id, role, tier: "strongest" });

type Reply = { status?: number; json?: unknown; text?: string; hang?: boolean };
interface Fake { host: string; requests: { method: string; url: string; body: any }[]; close(): Promise<void> }

/** A fake Ollama on an ephemeral 127.0.0.1 port. `route(url, method)` decides each reply. */
async function fakeOllama(route: (url: string, method: string) => Reply): Promise<Fake> {
  const requests: Fake["requests"] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let body: any = undefined;
      try { body = raw ? JSON.parse(raw) : undefined; } catch { body = raw; }
      requests.push({ method: req.method ?? "", url: req.url ?? "", body });
      const r = route(req.url ?? "", req.method ?? "");
      if (r.hang) return; // never answers — for the timeout test
      res.writeHead(r.status ?? 200, { "content-type": "application/json" });
      res.end(r.text ?? JSON.stringify(r.json ?? {}));
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const port = (server.address() as { port: number }).port;
  return { host: `127.0.0.1:${port}`, requests, close: () => new Promise<void>((ok) => { server.closeAllConnections?.(); server.close(() => ok()); }) };
}

const tags = (...names: string[]): Reply => ({ json: { models: names.map((name) => ({ name })) } });
const chat = (content: string): Reply => ({ json: { message: { role: "assistant", content } } });

test("O2: the request carries think:false, stream:false, a seed and temperature 0 — and the model NAME (never a URL)", async () => {
  const f = await fakeOllama((u) => (u.startsWith("/api/tags") ? tags("m:1b") : chat("did the work")));
  try {
    const r = makeOllamaResident({ model: "m:1b", host: f.host, seed: 7 });
    assert.equal(await r.run(unit("u1")), "did the work", "the visible reply is the work product");
    const call = f.requests.find((q) => q.url === "/api/chat")!;
    assert.equal(call.body.think, false, "think:false is MANDATORY (a thinking model can return '' with no error otherwise)");
    assert.equal(call.body.stream, false, "a plain request/response");
    assert.equal(call.body.options.seed, 7, "the seed is passed through (determinism)");
    assert.equal(call.body.options.temperature, 0, "temperature 0 by default");
    assert.equal(call.body.model, "m:1b", "the model NAME is sent");
    assert.ok(/"worker"/.test(call.body.messages[0].content) && /"u1"/.test(call.body.messages[0].content), "the prompt names the unit's role and id");
    assert.doesNotMatch(r.model(), /https?:|\/\//, "model() is a NAME, never a URL (P-VIII)");
  } finally { await f.close(); }
});

test("O3 empty-visible: a thinking model returning NO visible content is a NAMED FAULT, not work product (FR-003)", async () => {
  const f = await fakeOllama((u) => (u.startsWith("/api/tags") ? tags("m:1b") : chat("   ")));
  try {
    await assert.rejects(makeOllamaResident({ model: "m:1b", host: f.host }).run(unit("u")), (e: unknown) => e instanceof OllamaError && e.code === "empty-visible");
  } finally { await f.close(); }
});

test("O3 model-missing: an uninstalled model fails BY NAME before any work is sent — no silent substitution (FR-004)", async () => {
  const f = await fakeOllama(() => tags("other:7b", "another:1b"));
  try {
    const r = makeOllamaResident({ model: "wanted:1b", host: f.host });
    await assert.rejects(r.run(unit("u")), (e: unknown) => e instanceof OllamaError && e.code === "model-missing" && /wanted:1b/.test(e.message) && /other:7b/.test(e.message));
    assert.ok(!f.requests.some((q) => q.url === "/api/chat"), "NO work was sent to a model that is not installed");
  } finally { await f.close(); }
});

test("O3 model-missing: a bare name matches its :latest tag", async () => {
  const f = await fakeOllama((u) => (u.startsWith("/api/tags") ? tags("bare:latest") : chat("ok")));
  try { assert.equal(await makeOllamaResident({ model: "bare", host: f.host }).run(unit("u")), "ok"); } finally { await f.close(); }
});

test("O3 bad-status: a non-2xx is a named failure carrying the status", async () => {
  const f = await fakeOllama((u) => (u.startsWith("/api/tags") ? tags("m:1b") : { status: 500, text: "boom" }));
  try {
    await assert.rejects(makeOllamaResident({ model: "m:1b", host: f.host }).run(unit("u")), (e: unknown) => e instanceof OllamaError && e.code === "bad-status" && /500/.test(e.message));
  } finally { await f.close(); }
});

test("O3 timeout: a host that never answers is a BOUNDED, named failure — never an indefinite block", async () => {
  const f = await fakeOllama(() => ({ hang: true }));
  try {
    const t0 = Date.now();
    await assert.rejects(makeOllamaResident({ model: "m:1b", host: f.host, timeoutMs: 150 }).run(unit("u")), (e: unknown) => e instanceof OllamaError && e.code === "timeout");
    assert.ok(Date.now() - t0 < 5000, "it returned promptly instead of hanging");
  } finally { await f.close(); }
});

test("O3 endpoint-unreachable: nothing listening is a NAMED failure (and the offline suite never needs Ollama)", async () => {
  const f = await fakeOllama(() => tags()); const host = f.host; await f.close(); // grab a port, then close it
  await assert.rejects(makeOllamaResident({ model: "m:1b", host }).run(unit("u")), (e: unknown) => e instanceof OllamaError && e.code === "endpoint-unreachable");
});

test("P-III / FR-015a: a second unit while one is in flight is REFUSED at the resident, not only by the lane", async () => {
  let release!: () => void;
  const gate = new Promise<void>((ok) => (release = ok));
  const f = await fakeOllama((u) => (u.startsWith("/api/tags") ? tags("m:1b") : { hang: true }));
  try {
    const r = makeOllamaResident({ model: "m:1b", host: f.host, timeoutMs: 400 });
    const first = r.run(unit("first")).catch((e) => e); // pending (the fake never answers)
    await new Promise((ok) => setTimeout(ok, 60)); // let the first reach the wire
    await assert.rejects(r.run(unit("second")), (e: unknown) => e instanceof OllamaError && e.code === "concurrent-run");
    release(); await gate;
    assert.ok((await first) instanceof OllamaError, "the first unit ends with its own (timeout) result");
  } finally { await f.close(); }
});

test("P-VIII (NC2=A): a non-loopback host is REFUSED at construction — even when it arrives via OLLAMA_HOST", () => {
  for (const host of ["api.example.com:443", "10.0.0.5:11434", "0.0.0.0:11434", "http://gpu-box.example.com:11434", "192.168.1.9"]) {
    assert.throws(() => makeOllamaResident({ model: "m", host }), (e: unknown) => e instanceof OllamaError && e.code === "non-loopback-host", `${host} must be refused`);
  }
  const saved = process.env.OLLAMA_HOST;
  try {
    process.env.OLLAMA_HOST = "http://gpu-box.example.com:11434";
    assert.throws(() => makeOllamaResident({ model: "m" }), (e: unknown) => e instanceof OllamaError && e.code === "non-loopback-host", "OLLAMA_HOST must NOT be able to redirect the lane to a remote box");
  } finally { if (saved === undefined) delete process.env.OLLAMA_HOST; else process.env.OLLAMA_HOST = saved; }
});

test("P-VIII: loopback forms are accepted, and resolveOllamaBase normalises them", () => {
  for (const [host, base] of [["127.0.0.1:11434", "http://127.0.0.1:11434"], ["localhost", "http://localhost:11434"], ["http://127.0.0.1:9", "http://127.0.0.1:9"], ["[::1]:8080", "http://[::1]:8080"]] as const) {
    assert.equal(resolveOllamaBase(host).base, base);
  }
  assert.ok(isLoopbackHost("127.5.5.5") && isLoopbackHost("LOCALHOST") && !isLoopbackHost("0.0.0.0") && !isLoopbackHost("example.com"));
});

test("S6: different units yield different prompts (so a real model's output varies with its input)", () => {
  assert.notEqual(promptFor(unit("a", "concept-writer")), promptFor(unit("b", "code-reviewer")));
  assert.match(promptFor({ id: "x", role: "worker", tier: "standard", work: "rate limiter" }), /Input: rate limiter/);
});
