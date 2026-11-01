// `packages/workers/src/conversation.ts` — a real, fresh pi-ai conversation for one step (r16 T018/T023/T024/T025, contracts/worker-conversation.md "Opening a turn").
//
// Local types here duplicate the shape of `#durable/types.ts`'s `WorkersApi` port (`TurnInput`/`TurnResult`/`ArtifactRef`/`UnitCheckpoint`/`UnitResult`/`ToolCallLogEntry`) WITHOUT importing it:
// `workers` never imports `durable` (research R2/notes.md T004 — the same port-inversion r13 already uses for `durable`/`lane`). TypeScript's structural typing makes this safe: whoever composes the
// factory (a test harness today, the CLI from T037) assigns this module's `runTurn` to `Services.workers`, and the shapes line up because they are the same shape, declared twice on purpose.
//
// T023 REPLAN (not additive): `runTurn` no longer resolves a whole multi-round tool-use conversation inside one call. Each invocation does AT MOST one of: (a) run the single next pending tool call
// from the model's last reply and commit it, or (b) ask the model for a fresh round and, if it calls tools, run and commit only the FIRST one, queuing the rest as `pending`. Control always returns to
// `unit.ts` as `{kind:"continue", checkpoint}` after a tool call, so `unit.ts` commits that ONE call's result in its own atomic commit before `runTurn` is ever asked to do anything else — a kill between
// two tool calls can only ever lose work that was never committed, exactly CORE-4's existing guarantee, extended to a real generation. `{kind:"done"}` is returned only once the model's reply carries no
// tool calls. The full conversation history (every round's assistant tool-call message and its results) is rebuilt from `checkpoint.toolCalls` on every call — nothing but the checkpoint is trusted.
import { createModels } from "@earendil-works/pi-ai";
import type { AssistantMessage, Context, Message, Model, Tool, ToolCall } from "@earendil-works/pi-ai";
import { flows } from "#contracts/flow/index.ts";
import type { KilnProvider } from "#lane/kiln-provider.ts";
import { withTierTimeout } from "#lane/timeout.ts";
import { createOllamaProvider, modelFor } from "./provider.ts";
import { bindConversationRole, toolsFor } from "./roster.ts";
import { TOOLS, type ToolName } from "./tools.ts";

export type TaskId = number;
export interface ArtifactRef {
  ref: string;
}
export interface ToolCallLogEntry {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  replaySafe: boolean;
  executed: true;
  result: string;
  isError: boolean;
  round: number;
}
export interface UnitCheckpoint {
  phase: "work";
  done: number;
  results: string[];
  started?: true;
  toolCalls?: ToolCallLogEntry[];
  pending?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  round?: number;
}
export interface UnitResult {
  label: string;
  results: string[];
}
export interface TurnInput {
  unit: TaskId;
  role: string;
  model: string;
  workspace: string;
  inputs: ArtifactRef[];
  checkpoint: UnitCheckpoint;
  signal: AbortSignal;
}
export type TurnResult = { kind: "continue"; checkpoint: UnitCheckpoint } | { kind: "done"; result: UnitResult };

/** r16 T024, research R5: the structured, pure-data form of what a resumed conversation is told. `null` exactly when there is nothing to report (spec Edge Cases: "no interruption notice is needed or given"). */
export interface InterruptionNotice {
  lines: Array<{ name: string; arguments: Record<string, unknown>; alreadyExecuted: boolean }>;
}

export class UnknownToolCallError extends Error {
  override name = "UnknownToolCallError";
}

const MAX_TOOL_ROUNDS = 4;
const DEFAULT_CONTEXT_WINDOW = 131_072; // provisional default; T032/US5 wires the real readiness-probed value in

/** Deterministic per the spec's own test (WORK-5, FR-005): the same (unit, step) pair always yields the same id — a redone call after a kill reuses it, never mints a new one. */
export function requestIdFor(unit: TaskId, step: number, attempt = 0): string {
  return `unit:${unit}:step:${step}:attempt:${attempt}`;
}

function isToolCall(c: AssistantMessage["content"][number]): c is ToolCall {
  return (c as ToolCall).type === "toolCall";
}

function toPiTool(decl: (typeof TOOLS)[ToolName]): Tool {
  // `Tool.parameters` is typebox's `TSchema` — an EMPTY interface (confirmed by reading typebox's own .d.mts), so a
  // plain JSON-schema object is structurally assignable without a builder call or a cast.
  return { name: decl.name, description: `KILN's ${decl.name} tool`, parameters: decl.schema };
}

/** Pure function of the checkpoint's log (T024, research R5): `null` when there is nothing logged yet, never a notice with no content. */
export function buildInterruptionNotice(toolCalls: readonly ToolCallLogEntry[] | undefined): InterruptionNotice | null {
  if (!toolCalls || toolCalls.length === 0) return null;
  return { lines: toolCalls.map((e) => ({ name: e.name, arguments: e.arguments, alreadyExecuted: !e.replaySafe })) };
}

function renderInterruptionNotice(notice: InterruptionNotice): Message {
  const lines = notice.lines.map((l) => {
    const tail = l.alreadyExecuted ? "ALREADY EXECUTED. Do not call it again with the same effect." : "already ran; its result is in your history above.";
    return `- ${l.name}(${JSON.stringify(l.arguments)}) — ${tail}`;
  });
  return { role: "user", content: `You were interrupted before this step finished. Here is what already happened:\n${lines.join("\n")}\nContinue from here.`, timestamp: Date.now() };
}

/** Rebuilds the WHOLE message history from the checkpoint alone — nothing else is trusted (research R4). Grouped by `round` so a round's assistant message carries exactly the tool calls the model made in that one reply, in order. */
function buildMessages(input: TurnInput): Message[] {
  const inputLines = input.inputs.length > 0 ? `\nInputs:\n${input.inputs.map((i) => `- ${i.ref}`).join("\n")}` : "";
  const messages: Message[] = [{ role: "user", content: `Complete this step.${inputLines}`, timestamp: Date.now() }];
  const log = input.checkpoint.toolCalls ?? [];
  const notice = buildInterruptionNotice(log);
  if (notice) messages.push(renderInterruptionNotice(notice));
  const byRound = new Map<number, ToolCallLogEntry[]>();
  for (const e of log) {
    const arr = byRound.get(e.round) ?? [];
    arr.push(e);
    byRound.set(e.round, arr);
  }
  for (const r of [...byRound.keys()].sort((a, b) => a - b)) {
    const entries = byRound.get(r)!;
    messages.push({
      role: "assistant",
      content: entries.map((e) => ({ type: "toolCall" as const, id: e.id, name: e.name, arguments: e.arguments })),
      api: "openai-completions",
      provider: "kiln-ollama",
      model: input.model,
      timestamp: Date.now(),
    });
    for (const e of entries) {
      messages.push({ role: "toolResult", toolCallId: e.id, toolName: e.name, content: [{ type: "text", text: e.result }], isError: e.isError, timestamp: Date.now() });
    }
  }
  return messages;
}

export interface WorkersConfig {
  kilnProvider: KilnProvider;
  port?: number;
  /** Provisional: the real, probed context window arrives with US5 (T032/T033); until then every model uses this one. */
  defaultContextWindow?: number;
  /**
   * TEST-ONLY injection: replaces the real `models.complete` call with a fake one, so `conversation.test.ts` can run
   * with no live Ollama (T018's own requirement) while still exercising the real `bindConversationRole`/`toolsFor`
   * guards, the real `requestThroughLane` lease logic, and the real tool-execution loop around it. Absent in
   * production, where `createOllamaProvider` is the only path to a model (research R2/R9).
   */
  complete?: (model: Model<"openai-completions">, context: Context, options: { signal: AbortSignal; metadata: Record<string, unknown> }) => Promise<AssistantMessage>;
  /** TEST-ONLY injection (T025): replaces the role's roster `timeoutMs` so a timeout proof does not have to wait for a real 120s/180s tier timeout. Absent in production. */
  timeoutMsOverride?: number;
}

export function createWorkers(config: WorkersConfig): { runTurn(input: TurnInput): Promise<TurnResult> } {
  const models = createModels();
  models.setProvider(createOllamaProvider({ port: config.port }));
  const complete = config.complete ?? ((m, c, o) => models.complete(m, c, o));
  const contextWindow = config.defaultContextWindow ?? DEFAULT_CONTEXT_WINDOW;

  async function callModel(input: TurnInput, timeoutMs: number, systemPrompt: string, requestId: string, messages: Message[], tools: Tool[]): Promise<AssistantMessage> {
    const model: Model<"openai-completions"> = modelFor(input.model, { contextWindow });
    const context: Context = { systemPrompt, messages, tools };
    return config.kilnProvider.requestThroughLane({
      step: input.unit,
      model: input.model,
      signal: input.signal,
      cause: `task:${input.unit}`,
      // R6/FR-006-008: the generation races the role's tier timeout, composed with the caller's own signal (a factory
      // close still wins). On expiry this throws GenerationTimeoutError — unit.ts's existing failure path (release the
      // lane, let the uncaught error become the task's own `unit.failed` outcome) handles it with no special case; the
      // timeout only ever ends this ONE step, never the gate it belongs to (constitution V).
      call: () => withTierTimeout(timeoutMs, input.signal, (signal) => complete(model, context, { signal, metadata: { requestId } })),
    });
  }

  return {
    async runTurn(input: TurnInput): Promise<TurnResult> {
      const bound = bindConversationRole(input.role, flows.v2.roster); // throws BEFORE any pi-ai call (constitution II, T015)
      const toolDecls = toolsFor(input.role); // throws on an undeclared tool name, before any pi-ai call (T008)
      const timeoutMs = config.timeoutMsOverride ?? bound.timeoutMs;
      const priorResults = (input.checkpoint.toolCalls ?? []).map((e) => `${e.name}: ${e.result}`);

      // 1) a tool call the model already asked for, not yet run — execute exactly one, commit, return. No model call here.
      const pending = input.checkpoint.pending ?? [];
      if (pending.length > 0) {
        const [next, ...rest] = pending;
        const decl = toolDecls.find((d) => d.name === next.name);
        if (!decl) throw new UnknownToolCallError(`the model called "${next.name}", which is not in "${input.role}"'s declared tools`);
        const res = await decl.run(next.arguments as never, { workspace: input.workspace });
        const entry: ToolCallLogEntry = { id: next.id, name: next.name, arguments: next.arguments, replaySafe: decl.replaySafe, executed: true, result: res.content, isError: res.isError, round: input.checkpoint.round ?? 0 };
        return { kind: "continue", checkpoint: { ...input.checkpoint, toolCalls: [...(input.checkpoint.toolCalls ?? []), entry], pending: rest.length > 0 ? rest : undefined } };
      }

      // 2) nothing pending: ask the model for a fresh round, bounded so a model that never stops calling tools cannot loop forever.
      const round = (input.checkpoint.round ?? -1) + 1;
      if (round >= MAX_TOOL_ROUNDS) return { kind: "done", result: { label: input.role, results: [...priorResults, "[tool-round budget exhausted]"] } };

      const piTools = toolDecls.map(toPiTool);
      const messages = buildMessages(input);
      const requestId = requestIdFor(input.unit, input.checkpoint.done, round);
      const reply = await callModel(input, timeoutMs, bound.systemPrompt, requestId, messages, piTools);
      const calls = reply.content.filter(isToolCall);
      if (calls.length === 0) {
        const text = reply.content.filter((c) => "text" in c).map((c) => (c as { text: string }).text).join("");
        return { kind: "done", result: { label: input.role, results: [...priorResults, text] } };
      }

      const [first, ...rest] = calls;
      const decl = toolDecls.find((d) => d.name === first.name);
      if (!decl) throw new UnknownToolCallError(`the model called "${first.name}", which is not in "${input.role}"'s declared tools`);
      const res = await decl.run(first.arguments as never, { workspace: input.workspace });
      const entry: ToolCallLogEntry = { id: first.id, name: first.name, arguments: first.arguments, replaySafe: decl.replaySafe, executed: true, result: res.content, isError: res.isError, round };
      const newPending = rest.length > 0 ? rest.map((c): { id: string; name: string; arguments: Record<string, unknown> } => ({ id: c.id, name: c.name, arguments: c.arguments })) : undefined;
      return { kind: "continue", checkpoint: { ...input.checkpoint, toolCalls: [...(input.checkpoint.toolCalls ?? []), entry], pending: newPending, round } };
    },
  };
}
