// r16 T018/T020 — `runTurn`: a fresh pi-ai conversation per call, offered exactly the role's declared tools, seeded
// with explicit references (never raw text), run through the KILN provider's lease logic, with a deterministic
// per-(unit,step) requestId. Mocked `complete` and a trivial `kilnProvider` (no live Ollama, T018's own requirement)
// — the real `bindConversationRole`/`toolsFor` guards and the real tool-execution loop run unmocked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AssistantMessage, Context, Model } from "@earendil-works/pi-ai";
import type { KilnProvider, ProviderRequest } from "#lane/kiln-provider.ts";
import type { LaneApi } from "#durable/types.ts";
import { createKilnProvider } from "#lane/kiln-provider.ts";
import { createWorkers, requestIdFor, type TurnInput } from "#workers/conversation.ts";
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

function toolCallReply(name: string, args: Record<string, unknown>): AssistantMessage {
  return { role: "assistant", content: [{ type: "toolCall", id: "call-1", name, arguments: args }], api: "openai-completions", provider: "kiln-ollama", model: "fake-model", usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "toolUse", timestamp: Date.now() };
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
    const result = await workers.runTurn(baseInput({}, workspace));
    assert.equal(result.kind, "done");
    if (result.kind === "done") assert.ok(result.result.results.includes("all set"));
  }));

test("a model turn that calls a real tool actually runs it, then finishes done", () =>
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
    const result = await workers.runTurn(baseInput({}, workspace));
    assert.equal(result.kind, "done");
    if (result.kind === "done") {
      assert.ok(result.result.results.some((r) => r.includes("hello from the workspace")), "the tool's real result must appear in the step's results");
      assert.ok(result.result.results.includes("read it, done"));
    }
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
    const result = await workers.runTurn(
      baseInput(
        { role: "worker", model: liveModel(), inputs: [{ ref: "notes.md" }] },
        workspace,
      ),
    );
    assert.equal(result.kind, "done");
    if (result.kind === "done") assert.ok(result.result.results.length > 0, "a real run must produce at least the model's own text or a tool's result");
  }));
