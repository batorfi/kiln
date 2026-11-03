// TEST-ONLY (r16 T026): a deterministic `WorkersApi` for the subprocess kill-point proof. Exercises the REAL
// `#workers/conversation.ts` — its checkpoint/pending/toolCalls bookkeeping, the interruption notice, the real
// `write-file`/`read-file` tools writing real files — with a SCRIPTED model reply instead of a live Ollama call, so
// the proof is deterministic and needs no network. Dynamically imported by owner-main.ts via `WORKERS_MODULE`,
// exactly like `LANE_MODULE` wires in the lane; `createWorkersForTest` takes the SAME `lane` instance owner-main.ts
// already built, so the real `requestThroughLane` lease logic is exercised too, not bypassed.
import { appendFileSync } from "node:fs";
import type { LaneApi } from "#durable/types.ts";
import { createKilnProvider } from "#lane/kiln-provider.ts";
import { createWorkers, type TurnInput, type TurnResult, type WorkersConfig } from "#workers/conversation.ts";

// No import from `@earendil-works/pi-ai` here on purpose (seam.test.ts (a)/(c), research R2/R9: only `#workers/`
// imports it) — `WorkersConfig["complete"]`'s own type gives `_model`/`context` their real shape structurally,
// without this test fixture needing to name the library itself.
const USAGE = { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };

/** Round 0 (no tool result in history yet): ask for a `write-file`. Any later round: finish. Purely a function of what it is shown — no in-memory state survives a kill, exactly as a real model has none of its own either. */
const scriptedComplete: NonNullable<WorkersConfig["complete"]> = (_model, context) => {
  // WORKERS_LOG (test-only, mirrors KILL_LOG/HIT_LOG): records exactly what this call was shown, so the proof can
  // check from OUTSIDE the child process whether a resumed call actually carried the interruption notice.
  if (process.env.WORKERS_LOG) appendFileSync(process.env.WORKERS_LOG, JSON.stringify(context.messages) + "\n");
  const hasResult = context.messages.some((m) => m.role === "toolResult");
  if (!hasResult) {
    return Promise.resolve({
      role: "assistant",
      content: [{ type: "toolCall", id: "call-1", name: "write-file", arguments: { path: "out.txt", content: "hello from the scripted worker" } }],
      api: "openai-completions", provider: "kiln-ollama", model: "fake-model", usage: USAGE, stopReason: "toolUse", timestamp: Date.now(),
    });
  }
  return Promise.resolve({ role: "assistant", content: [{ type: "text", text: "done" }], api: "openai-completions", provider: "kiln-ollama", model: "fake-model", usage: USAGE, stopReason: "stop", timestamp: Date.now() });
};

export function createWorkersForTest(lane: LaneApi): { runTurn(input: TurnInput): Promise<TurnResult> } {
  return createWorkers({ kilnProvider: createKilnProvider(lane), complete: scriptedComplete });
}
