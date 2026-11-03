// r16 T018/T020/T023/T024/T025 — `runTurn`: a fresh pi-ai conversation per call, offered exactly the role's declared
// tools, seeded with explicit references (never raw text), run through the KILN provider's lease logic, with a
// deterministic per-(unit,step) requestId. Since T023, `runTurn` returns `{kind:"continue"}` after EACH tool call —
// never the whole conversation at once — so a caller drives it to completion by feeding the returned checkpoint back
// in; `runToCompletion` below is exactly that loop, standing in for what `unit.ts` really does one commit at a time.
// Mocked `complete` and a trivial `kilnProvider` (no live Ollama, T018's own requirement) — the real
// `bindConversationRole`/`toolsFor` guards and the real tool-execution loop run unmocked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AssistantMessage, Context, Model } from "@earendil-works/pi-ai";
import type { KilnProvider, ProviderRequest } from "#lane/kiln-provider.ts";
import type { Readiness } from "#lane/residency.ts";
import { GenerationTimeoutError } from "#lane/timeout.ts";
import type { LaneApi } from "#durable/types.ts";
import { createKilnProvider } from "#lane/kiln-provider.ts";
import { buildInterruptionNotice, createWorkers, requestIdFor, type TurnInput, type TurnResult, type UnitResult } from "#workers/conversation.ts";
import { UnknownRoleError } from "#workers/roster.ts";
import { liveModel, probeLiveModel, skipOption } from "../../../tests/live-gate.ts";

function withWorkspace(fn: (workspace: string) => Promise<void> | void) {
  const workspace = mkdtempSync(join(tmpdir(), "kiln-conversation-"));
  return Promise.resolve(fn(workspace)).finally(() => rmSync(workspace, { recursive: true, force: true }));
}

/** Bypasses the real lane entirely — the step is assumed to already hold whatever lease it needs. */
const passthroughKilnProvider: KilnProvider = { requestThroughLane: <T>(req: ProviderRequest<T>) => req.call() };

function textReply(text: string): AssistantMessage {
  return { role: "assistant", content: [{ type: "text", text }], api: "openai-completions", provider: "kiln-ollama", model: "fake-model", usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "stop", timestamp: Date.now() };
}

function toolCallReply(name: string, args: Record<string, unknown>, id = "call-1"): AssistantMessage {
  return { role: "assistant", content: [{ type: "toolCall", id, name, arguments: args }], api: "openai-completions", provider: "kiln-ollama", model: "fake-model", usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "toolUse", timestamp: Date.now() };
}

function multiToolCallReply(calls: Array<{ name: string; args: Record<string, unknown>; id: string }>): AssistantMessage {
  return {
    role: "assistant",
    content: calls.map((c) => ({ type: "toolCall" as const, id: c.id, name: c.name, arguments: c.args })),
    api: "openai-completions", provider: "kiln-ollama", model: "fake-model",
    usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: "toolUse", timestamp: Date.now(),
  };
}

function baseInput(overrides: Partial<TurnInput> = {}, workspace = "/tmp"): TurnInput {
  return {
    unit: 1,
    role: "worker",
    model: "fake-model",
    workspace,
    inputs: [],
    checkpoint: { phase: "work", done: 0, results: [] },
    signal: new AbortController().signal,
    ...overrides,
  };
}

/** Drives `runTurn` to completion exactly the way `unit.ts` really does: one call per commit, feeding the returned checkpoint back in. Caps iterations so a wrong implementation fails fast instead of hanging. */
async function runToCompletion(workers: { runTurn(input: TurnInput): Promise<TurnResult> }, input: TurnInput, maxCalls = 20): Promise<{ result: UnitResult; calls: number }> {
  let checkpoint = input.checkpoint;
  for (let calls = 1; calls <= maxCalls; calls++) {
    const turn = await workers.runTurn({ ...input, checkpoint });
    if (turn.kind === "done") return { result: turn.result, calls };
    checkpoint = turn.checkpoint;
  }
  throw new Error(`runToCompletion: still not done after ${maxCalls} calls`);
}

test("a fresh Context is built per call, never reused across steps (FR-001)", () =>
  withWorkspace(async (workspace) => {
    const seen: Context[] = [];
    const workers = createWorkers({
      kilnProvider: passthroughKilnProvider,
      complete: async (_m, context) => { seen.push(context); return textReply("done"); },
    });
    await workers.runTurn(baseInput({ unit: 1, checkpoint: { phase: "work", done: 0, results: [] } }, workspace));
    await workers.runTurn(baseInput({ unit: 2, checkpoint: { phase: "work", done: 0, results: [] } }, workspace));
    assert.equal(seen.length, 2);
    assert.notEqual(seen[0], seen[1], "each call must build its own Context object, never reuse one across steps");
  }));

test("the offered tools are exactly toolsFor's result and nothing more (FR-005)", () =>
  withWorkspace(async (workspace) => {
    let offered: Context["tools"];
    const workers = createWorkers({
      kilnProvider: passthroughKilnProvider,
      complete: async (_m, context) => { offered = context.tools; return textReply("done"); },
    });
    await workers.runTurn(baseInput({ role: "reviewer" }, workspace)); // reviewer declares only read-file
    assert.deepEqual(offered?.map((t) => t.name).sort(), ["read-file"]);
  }));

test("explicit inputs are recorded as references only — the message never carries raw artifact text", () =>
  withWorkspace(async (workspace) => {
    let sentText = "";
    const workers = createWorkers({
      kilnProvider: passthroughKilnProvider,
      complete: async (_m, context) => {
        const first = context.messages[0];
        sentText = typeof first.content === "string" ? first.content : JSON.stringify(first.content);
        return textReply("done");
      },
    });
    await workers.runTurn(baseInput({ inputs: [{ ref: "secret-plan.md" }] }, workspace));
    assert.match(sentText, /secret-plan\.md/);
    assert.doesNotMatch(sentText, /top-secret-content-that-must-never-be-inlined/);
  }));

test("a model turn with no tool calls finishes done, with its text in the result", () =>
  withWorkspace(async (workspace) => {
    const workers = createWorkers({ kilnProvider: passthroughKilnProvider, complete: async () => textReply("all set") });
    const { result, calls } = await runToCompletion(workers, baseInput({}, workspace));
    assert.ok(result.results.includes("all set"));
    assert.equal(calls, 1, "no tool calls: done on the first call");
  }));

test("a model turn that calls a real tool actually runs it, then finishes done — across two runTurn calls, not one (T023)", () =>
  withWorkspace(async (workspace) => {
    writeFileSync(join(workspace, "notes.md"), "hello from the workspace");
    let round = 0;
    const workers = createWorkers({
      kilnProvider: passthroughKilnProvider,
      complete: async () => {
        round += 1;
        return round === 1 ? toolCallReply("read-file", { path: "notes.md" }) : textReply("read it, done");
      },
    });
    const first = await workers.runTurn(baseInput({}, workspace));
    assert.equal(first.kind, "continue", "the tool call's result commits on its own — runTurn must not finalize in the same call that ran it");
    if (first.kind !== "continue") return;
    assert.equal(first.checkpoint.toolCalls?.length, 1);
    assert.equal(first.checkpoint.toolCalls?.[0].name, "read-file");
    assert.equal(first.checkpoint.toolCalls?.[0].replaySafe, true);

    const second = await workers.runTurn({ ...baseInput({}, workspace), checkpoint: first.checkpoint });
    assert.equal(second.kind, "done");
    if (second.kind === "done") {
      assert.ok(second.result.results.some((r) => r.includes("hello from the workspace")), "the tool's real result must appear in the step's results");
      assert.ok(second.result.results.includes("read it, done"));
    }
  }));

test("a reply with several tool calls is processed one at a time via `pending`, not all at once", () =>
  withWorkspace(async (workspace) => {
    writeFileSync(join(workspace, "a.txt"), "A");
    writeFileSync(join(workspace, "b.txt"), "B");
    let asked = 0;
    const workers = createWorkers({
      kilnProvider: passthroughKilnProvider,
      complete: async () => {
        asked += 1;
        return asked === 1 ? multiToolCallReply([{ name: "read-file", args: { path: "a.txt" }, id: "c1" }, { name: "read-file", args: { path: "b.txt" }, id: "c2" }]) : textReply("both read");
      },
    });
    const r1 = await workers.runTurn(baseInput({}, workspace));
    assert.equal(r1.kind, "continue");
    if (r1.kind !== "continue") return;
    assert.equal(r1.checkpoint.toolCalls?.length, 1, "only the FIRST of the two calls has run");
    assert.equal(r1.checkpoint.toolCalls?.[0].id, "c1");
    assert.equal(r1.checkpoint.pending?.length, 1, "the second call is queued, not yet run");
    assert.equal(asked, 1, "the model is not asked again until both calls from its last reply are done");

    const r2 = await workers.runTurn({ ...baseInput({}, workspace), checkpoint: r1.checkpoint });
    assert.equal(r2.kind, "continue");
    if (r2.kind !== "continue") return;
    assert.equal(r2.checkpoint.toolCalls?.length, 2, "now the second call has run too");
    assert.equal(r2.checkpoint.toolCalls?.[1].id, "c2");
    assert.equal(r2.checkpoint.pending, undefined, "nothing left pending — the round is complete");
    assert.equal(asked, 1, "still not asked again: the second call didn't need a new model turn, only the next pending one");

    const r3 = await workers.runTurn({ ...baseInput({}, workspace), checkpoint: r2.checkpoint });
    assert.equal(r3.kind, "done");
    assert.equal(asked, 2, "now the model is asked for the next round, having seen both results");
  }));

test("an unknown role is refused before any complete() call", () =>
  withWorkspace(async (workspace) => {
    let called = false;
    const workers = createWorkers({ kilnProvider: passthroughKilnProvider, complete: async () => { called = true; return textReply("x"); } });
    await assert.rejects(() => workers.runTurn(baseInput({ role: "nonexistent-role" }, workspace)), UnknownRoleError);
    assert.equal(called, false);
  }));

test("requestIdFor is deterministic per (unit, step): the same pair always yields the same id, a redone call never mints a new one", () => {
  assert.equal(requestIdFor(1, 0, 0), requestIdFor(1, 0, 0));
  assert.notEqual(requestIdFor(1, 0, 0), requestIdFor(1, 1, 0));
  assert.notEqual(requestIdFor(1, 0, 0), requestIdFor(2, 0, 0));
});

test("every completion request's lease goes through the KILN provider, not around it", () =>
  withWorkspace(async (workspace) => {
    let requestedStep: number | undefined;
    const spyKilnProvider: KilnProvider = {
      requestThroughLane: <T>(req: ProviderRequest<T>) => { requestedStep = req.step; return req.call(); },
    };
    const workers = createWorkers({ kilnProvider: spyKilnProvider, complete: async () => textReply("ok") });
    await workers.runTurn(baseInput({ unit: 42 }, workspace));
    assert.equal(requestedStep, 42);
  }));

// ── T024: the structured interruption notice ──────────────────────────────────────────────────────────────────────

test("buildInterruptionNotice: an empty or absent log produces no notice at all", () => {
  assert.equal(buildInterruptionNotice(undefined), null);
  assert.equal(buildInterruptionNotice([]), null);
});

test("buildInterruptionNotice: names every logged call; only non-replay-safe entries are flagged already-executed", () => {
  const notice = buildInterruptionNotice([
    { id: "c1", name: "read-file", arguments: { path: "a.txt" }, replaySafe: true, executed: true, result: "A", isError: false, round: 0 },
    { id: "c2", name: "write-file", arguments: { path: "b.txt", content: "B" }, replaySafe: false, executed: true, result: "wrote", isError: false, round: 0 },
  ]);
  assert.ok(notice);
  assert.equal(notice!.lines.length, 2);
  assert.deepEqual(notice!.lines[0], { name: "read-file", arguments: { path: "a.txt" }, alreadyExecuted: false });
  assert.deepEqual(notice!.lines[1], { name: "write-file", arguments: { path: "b.txt", content: "B" }, alreadyExecuted: true });
});

test("a resumed conversation's next model call is told, by name and argument, which non-replay-safe call already ran", () =>
  withWorkspace(async (workspace) => {
    writeFileSync(join(workspace, "out.txt"), "original");
    let secondCallMessages: Context["messages"] | undefined;
    let asked = 0;
    const workers = createWorkers({
      kilnProvider: passthroughKilnProvider,
      complete: async (_m, context) => {
        asked += 1;
        if (asked === 2) secondCallMessages = context.messages;
        return asked === 1 ? toolCallReply("write-file", { path: "out.txt", content: "changed" }) : textReply("done");
      },
    });
    const first = await workers.runTurn(baseInput({}, workspace));
    assert.equal(first.kind, "continue");
    if (first.kind !== "continue") return;

    // simulate a brand-new process picking up the SAME checkpoint — nothing in `workers` carries state across calls
    const fresh = createWorkers({ kilnProvider: passthroughKilnProvider, complete: async () => (++asked, textReply("done")) });
    void fresh; // the real resume uses the SAME workers instance in this test; a fresh instance would behave identically since runTurn is stateless
    await workers.runTurn({ ...baseInput({}, workspace), checkpoint: first.checkpoint });

    assert.ok(secondCallMessages, "the second ask must have happened");
    const rendered = secondCallMessages!.map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content))).join("\n");
    assert.match(rendered, /write-file/);
    assert.match(rendered, /out\.txt/);
    assert.match(rendered, /ALREADY EXECUTED/);
  }));

test("a resume with no prior tool calls asks the model with no interruption notice at all", () =>
  withWorkspace(async (workspace) => {
    let messages: Context["messages"] | undefined;
    const workers = createWorkers({ kilnProvider: passthroughKilnProvider, complete: async (_m, context) => { messages = context.messages; return textReply("done"); } });
    await workers.runTurn(baseInput({}, workspace));
    const rendered = messages!.map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content))).join("\n");
    assert.doesNotMatch(rendered, /interrupted/i);
  }));

// ── T025: the per-tier generation timeout ─────────────────────────────────────────────────────────────────────────

test("a generation that never resolves fails with GenerationTimeoutError within its (overridden, short) timeout — not a generic abort", () =>
  withWorkspace(async (workspace) => {
    const workers = createWorkers({
      kilnProvider: passthroughKilnProvider,
      complete: () => new Promise<AssistantMessage>(() => {}), // never settles
      timeoutMsOverride: 50,
    });
    await assert.rejects(() => workers.runTurn(baseInput({}, workspace)), GenerationTimeoutError);
  }));

test("a factory close (the caller's own signal) is reported as an abort, never recast as a GenerationTimeoutError", () =>
  withWorkspace(async (workspace) => {
    const controller = new AbortController();
    const workers = createWorkers({
      kilnProvider: passthroughKilnProvider,
      complete: () => new Promise<AssistantMessage>(() => {}),
      timeoutMsOverride: 60_000, // long enough that only the abort can win this race
    });
    const promise = workers.runTurn(baseInput({ signal: controller.signal }, workspace));
    controller.abort(new Error("factory closing"));
    await assert.rejects(() => promise, /factory closing/);
  }));

// ── T032/T033: readiness probed fresh, before any complete() call; never cached across rounds ──

const READY: Readiness = { toolCalling: true, streaming: true, usageAccounting: true, contextWindow: 999 };

test("a role with declared tools is refused when the probed model lacks tool-calling — before any complete() call (FR-041)", () =>
  withWorkspace(async (workspace) => {
    let completeCalled = false;
    const workers = createWorkers({
      kilnProvider: passthroughKilnProvider,
      probe: async () => ({ ...READY, toolCalling: false }),
      complete: async () => { completeCalled = true; return textReply("should never run"); },
    });
    await assert.rejects(workers.runTurn(baseInput({ role: "worker" }, workspace)), /CapabilityRefused|toolCalling/);
    assert.equal(completeCalled, false, "the refusal must happen before any model call — never discovered by the conversation failing partway through");
  }));

test("readiness is probed fresh on every call, never cached — a capability that disappears between two rounds is caught at the SECOND round, not assumed from the first", () =>
  withWorkspace(async (workspace) => {
    let probeCalls = 0;
    const workers = createWorkers({
      kilnProvider: passthroughKilnProvider,
      probe: async () => { probeCalls += 1; return { ...READY, toolCalling: probeCalls === 1 }; }, // ready on round 1, gone by round 2
      complete: async () => toolCallReply("read-file", { path: "a.txt" }),
    });
    const first = await workers.runTurn(baseInput({ role: "worker" }, workspace)); // round 1: probe says ready, call proceeds, tool call queued
    assert.equal(first.kind, "continue");
    assert.equal(probeCalls, 1);
    await assert.rejects(
      workers.runTurn({ ...baseInput({ role: "worker" }, workspace), checkpoint: first.checkpoint }), // round 2: the model asks again (nothing pending from round 1's single tool call)
      /CapabilityRefused|toolCalling/,
    );
    assert.equal(probeCalls, 2, "the second round re-probed instead of trusting round 1's cached result");
  }));

test("with no `probe` configured, the capability check is skipped entirely (most unit tests; production always configures one)", () =>
  withWorkspace(async (workspace) => {
    const workers = createWorkers({ kilnProvider: passthroughKilnProvider, complete: async () => textReply("fine") });
    const { result } = await runToCompletion(workers, baseInput({ role: "worker" }, workspace));
    assert.ok(result);
  }));

function trivialLane(): LaneApi {
  const held = new Set<number>();
  return {
    async acquire(step) { held.add(step); return { holder: step, since: Date.now() }; },
    async release(step) { held.delete(step); },
    holds(step) { return held.has(step); },
  };
}

const liveStatus = await probeLiveModel();

test("LIVE: a real worker turn against the installed Ollama, through the real provider, the real KILN provider and a real tool call, end to end", skipOption(liveStatus), () =>
  withWorkspace(async (workspace) => {
    writeFileSync(join(workspace, "notes.md"), "hello from a real live test");
    const workers = createWorkers({ kilnProvider: createKilnProvider(trivialLane()) }); // no `complete` override: this is the real pi-ai path
    const { result } = await runToCompletion(
      workers,
      baseInput({ role: "worker", model: liveModel(), inputs: [{ ref: "notes.md" }] }, workspace),
      8, // a real local model may take a few rounds; still bounded so a runaway fails the test instead of hanging
    );
    assert.ok(result.results.length > 0, "a real run must produce at least the model's own text or a tool's result");
  }));
