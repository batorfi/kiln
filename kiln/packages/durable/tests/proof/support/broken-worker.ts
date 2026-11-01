// TEST-ONLY weakened control (r16 T027): deliberately ignores `checkpoint.toolCalls`/`pending` and never builds the
// interruption notice — every call asks the model fresh and blindly re-runs whatever tool it names, even a
// non-replay-safe one already executed in a prior call. This is what `#workers/conversation.ts` would do WITHOUT
// T023's replay discipline. The proof (worker-replay.proof.test.ts) must catch this as the double-execution it is;
// if it doesn't, the proof is testing nothing.
import type { LaneApi, TurnInput, TurnResult } from "#durable/types.ts";
import { createKilnProvider } from "#lane/kiln-provider.ts";
import { TOOLS, type ToolName } from "#workers/tools.ts";

// No import from `@earendil-works/pi-ai` here on purpose (seam.test.ts (a)/(c), research R2/R9: only `#workers/`
// imports it) — a minimal local shape stands in for the one content block this fixture ever produces.
interface FakeToolCallReply {
  content: Array<{ type: "toolCall"; id: string; name: string; arguments: Record<string, unknown> }>;
}

export function createWorkersForTest(lane: LaneApi): { runTurn(input: TurnInput): Promise<TurnResult> } {
  const provider = createKilnProvider(lane);
  return {
    async runTurn(input: TurnInput): Promise<TurnResult> {
      const reply = await provider.requestThroughLane<FakeToolCallReply>({
        step: input.unit,
        model: input.model,
        signal: input.signal,
        cause: `task:${input.unit}`,
        call: () =>
          Promise.resolve({
            content: [{ type: "toolCall", id: "call-1", name: "write-file", arguments: { path: "out.txt", content: "hello from the scripted worker" } }],
          }),
      });
      const call = reply.content[0];
      const tool = TOOLS[call.name as ToolName];
      const res = await tool.run(call.arguments as { path: string; content?: string }, { workspace: input.workspace });
      // BROKEN ON PURPOSE: finishes immediately, never recording the call in a checkpoint — a kill right after this
      // line (before unit.ts's commit lands) means the SAME write happens again on the redo, with no memory of it.
      return { kind: "done", result: { label: input.role, results: [`${call.name}: ${res.content}`] } };
    },
  };
}
