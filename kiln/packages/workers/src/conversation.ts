// `packages/workers/src/conversation.ts` — a real, fresh pi-ai conversation for one step (r16 T018, contracts/worker-conversation.md "Opening a turn").
//
// Local types here duplicate the shape of `#durable/types.ts`'s `WorkersApi` port (`TurnInput`/`TurnResult`/`ArtifactRef`/`UnitCheckpoint`/`UnitResult`) WITHOUT importing it: `workers` never
// imports `durable` (research R2/notes.md T004 — the same port-inversion r13 already uses for `durable`/`lane`). TypeScript's structural typing makes this safe: whoever composes the factory
// (a test harness today, the CLI from T037) assigns this module's `runTurn` to `Services.workers`, and the shapes line up because they are the same shape, declared twice on purpose.
//
// SCOPE (T018/T019, the MVP): `runTurn` resolves everything — the model's turn AND any tool calls it makes — synchronously within one call, returning `"done"` once the model stops calling
// tools. `"continue"` is declared (T018 must return the right TYPE) but never actually returned yet: nothing before T023 gives a turn's checkpoint anywhere durable to record mid-conversation
// progress, so there is nothing yet to pause and safely resume FROM. T023 is what makes `"continue"` meaningful; US2 (T023-T027) is what makes repeating a tool call across a kill impossible.
import { createModels } from "@earendil-works/pi-ai";
import type { AssistantMessage, Context, Message, Model, Tool, ToolCall } from "@earendil-works/pi-ai";
import { flows } from "#contracts/flow/index.ts";
import type { KilnProvider } from "#lane/kiln-provider.ts";
import { createOllamaProvider, modelFor } from "./provider.ts";
import { bindConversationRole, toolsFor } from "./roster.ts";
import { TOOLS, type ToolName } from "./tools.ts";

export type TaskId = number;
export interface ArtifactRef {
  ref: string;
}
export interface UnitCheckpoint {
  phase: "work";
  done: number;
  results: string[];
  started?: true;
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

export class UnknownToolCallError extends Error {
  override name = "UnknownToolCallError";
}

const MAX_TOOL_ROUNDS = 4;
const DEFAULT_CONTEXT_WINDOW = 131_072; // provisional default; T032/US5 wires the real readiness-probed value in

/** Deterministic per the spec's own test (WORK-5, FR-005): the same (unit, step) pair always yields the same id — a redone call after a kill reuses it, never mints a new one. */
export function requestIdFor(unit: TaskId, step: number, attempt = 0): string {
  return `unit:${unit}:step:${step}:attempt:${attempt}`;
}

function isToolCall(c: Message["role"] extends never ? never : AssistantMessage["content"][number]): c is ToolCall {
  return (c as ToolCall).type === "toolCall";
}

function toPiTool(decl: (typeof TOOLS)[ToolName]): Tool {
  // `Tool.parameters` is typebox's `TSchema` — an EMPTY interface (confirmed by reading typebox's own .d.mts), so a
  // plain JSON-schema object is structurally assignable without a builder call or a cast.
  return { name: decl.name, description: `KILN's ${decl.name} tool`, parameters: decl.schema };
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
}

export function createWorkers(config: WorkersConfig): { runTurn(input: TurnInput): Promise<TurnResult> } {
  const models = createModels();
  models.setProvider(createOllamaProvider({ port: config.port }));
  const complete = config.complete ?? ((m, c, o) => models.complete(m, c, o));
  const contextWindow = config.defaultContextWindow ?? DEFAULT_CONTEXT_WINDOW;

  async function callModel(input: TurnInput, requestId: string, messages: Message[], tools: Tool[]): Promise<AssistantMessage> {
    const bound = bindConversationRole(input.role, flows.v2.roster); // throws BEFORE any pi-ai call (constitution II, T015)
    const model: Model<"openai-completions"> = modelFor(input.model, { contextWindow });
    const context: Context = { systemPrompt: bound.systemPrompt, messages, tools };
    return config.kilnProvider.requestThroughLane({
      step: input.unit,
      model: input.model,
      signal: input.signal,
      cause: `task:${input.unit}`,
      call: () => complete(model, context, { signal: input.signal, metadata: { requestId } }),
    });
  }

  return {
    async runTurn(input: TurnInput): Promise<TurnResult> {
      const toolDecls = toolsFor(input.role); // throws on an undeclared tool name, before any pi-ai call (T008)
      const piTools = toolDecls.map(toPiTool);
      const inputLines = input.inputs.length > 0 ? `\nInputs:\n${input.inputs.map((i) => `- ${i.ref}`).join("\n")}` : "";
      const messages: Message[] = [{ role: "user", content: `Complete this step.${inputLines}`, timestamp: Date.now() }];
      const results: string[] = [...input.checkpoint.results];

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const requestId = requestIdFor(input.unit, input.checkpoint.done, round);
        const reply = await callModel(input, requestId, messages, piTools);
        const toolCalls = reply.content.filter(isToolCall);
        if (toolCalls.length === 0) {
          const text = reply.content.filter((c) => "text" in c).map((c) => (c as { text: string }).text).join("");
          results.push(text);
          return { kind: "done", result: { label: input.role, results } };
        }
        messages.push({ role: "assistant", content: reply.content, api: reply.api, provider: reply.provider, model: reply.model, usage: reply.usage, stopReason: reply.stopReason, timestamp: reply.timestamp });
        for (const call of toolCalls) {
          const tool = TOOLS[call.name as ToolName];
          if (!tool) throw new UnknownToolCallError(`the model called "${call.name}", which is not in ${input.role}'s declared tools`);
          const res = await tool.run(call.arguments as { path: string; content?: string }, { workspace: input.workspace });
          results.push(`${call.name}: ${res.content}`);
          messages.push({ role: "toolResult", toolCallId: call.id, toolName: call.name, content: [{ type: "text", text: res.content }], isError: res.isError, timestamp: Date.now() });
        }
      }
      // the round budget is exhausted — the model never stopped calling tools; finalize with what was gathered rather
      // than loop forever (a provisional bound, not a spec requirement; revisit if a real role needs more rounds).
      return { kind: "done", result: { label: input.role, results } };
    },
  };
}
