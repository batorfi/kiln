// `packages/lane/src/residency.ts` — the residency manager (r16 T011, research R8, R10, R11).
//
// The ONLY path by which a model becomes or stops being resident on the host's Ollama: `load`/`unload` call Ollama's
// own native API directly, over loopback only (constitution VIII). Confirmed against the real, running Ollama
// (0.35.1, 2026-11-01): `/api/generate` with no `prompt` and a `keep_alive` field loads or unloads a model without
// running inference (`done_reason: "load"`/`"unload"`); `keep_alive: -1` keeps it resident indefinitely,
// `keep_alive: 0` unloads it at once. This module never imports `pi-ai` — `probe()`'s round trip and `load`/`unload`
// both talk to Ollama directly over plain HTTP; the request/response SHAPE a real conversation uses is `#workers/`'s
// seam alone (research R2).
const DEFAULT_PORT = 11434;
const PROBE_TIMEOUT_MS = 10_000;
const KEEP_ALIVE_FOREVER = -1; // Ollama's own "never expire" value (confirmed live)
const KEEP_ALIVE_NONE = 0; // Ollama's own "unload at once" value (confirmed live)

export class ResidencyError extends Error {
  override name = "ResidencyError";
}

export class ResidencyBudgetError extends Error {
  override name = "ResidencyBudgetError";
}

export interface Readiness {
  toolCalling: boolean;
  streaming: boolean;
  /** Capability only (spec Clarification 2) — no token/cost figures are read or persisted by this row. */
  usageAccounting: boolean;
  contextWindow: number;
}

export interface BrokenGuaranteeReport {
  /** The model Ollama reports resident that this manager never asked to load (or unload-then-reload-elsewhere) for. */
  model: string;
  detail: string;
}

export interface Residency {
  /** `loaded: false` when the model was already resident through this manager (a cheap no-op, not a real transition) — callers that emit `lane.transition` use this to know whether a real load happened. */
  load(model: string, opts?: { pin?: boolean; signal?: AbortSignal }): Promise<{ loaded: boolean }>;
  /** `unloaded: false` when nothing happened — the model is pinned, or was not resident through this manager at all. */
  unload(model: string): Promise<{ unloaded: boolean }>;
  probe(model: string): Promise<Readiness>;
  /**
   * Compares Ollama's actual running-model list against this manager's own record. Writes nothing itself (FR-026's
   * caller commits the broken-guarantee event).
   *
   * `expected`: the model the caller is about to request (if any). Why this parameter exists: a fresh process
   * restarted after a kill has an empty "own" record by construction, but `keep_alive:-1`
   * means Ollama itself never forgot a model the PREVIOUS process legitimately loaded. If Ollama's resident set is
   * exactly `{expected}`, this is adopted (recorded as this manager's own, as if this process had loaded it) rather
   * than reported as a broken guarantee — the model is the one THIS acquire is about to ask for, and the durable
   * `kiln.lane` document (read by the caller before this call) already names it as the lane's own resident model;
   * nothing outside KILN's residency path put it there. Anything resident that is NOT `expected` is still reported.
   */
  reconcile(expected?: string): Promise<BrokenGuaranteeReport | null>;
}

interface OwnRecord {
  pin: boolean;
  sizeBytes: number;
}

function baseUrl(port: number): string {
  return `http://127.0.0.1:${port}`;
}

async function ollamaGenerate(url: string, model: string, keepAlive: number, signal?: AbortSignal): Promise<void> {
  const res = await fetch(`${url}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, keep_alive: keepAlive }),
    signal,
  });
  if (!res.ok) throw new ResidencyError(`Ollama refused to load/unload "${model}": HTTP ${res.status}`);
  const body = (await res.json()) as { done?: boolean; done_reason?: string };
  if (body.done !== true) throw new ResidencyError(`Ollama's load/unload of "${model}" did not complete: ${JSON.stringify(body)}`);
}

async function ollamaModelSize(url: string, model: string): Promise<number> {
  const res = await fetch(`${url}/api/tags`);
  if (!res.ok) throw new ResidencyError(`Ollama's model list answered HTTP ${res.status}`);
  const body = (await res.json()) as { models?: Array<{ name?: string; size?: number }> };
  const entry = (body.models ?? []).find((m) => m.name === model);
  if (!entry) throw new ResidencyError(`"${model}" is not an installed Ollama model (ollama pull ${model})`);
  return entry.size ?? 0;
}

async function ollamaRunningModels(url: string): Promise<Set<string>> {
  const res = await fetch(`${url}/api/ps`);
  if (!res.ok) throw new ResidencyError(`Ollama's running-model list answered HTTP ${res.status}`);
  const body = (await res.json()) as { models?: Array<{ name?: string }> };
  return new Set((body.models ?? []).map((m) => m.name).filter((n): n is string => typeof n === "string"));
}

export function createResidency(opts: { port?: number; budgetBytes: number }): Residency {
  const url = baseUrl(opts.port ?? DEFAULT_PORT);
  const own = new Map<string, OwnRecord>();

  return {
    async load(model, loadOpts = {}) {
      if (own.has(model)) {
        if (loadOpts.pin === true) own.set(model, { ...own.get(model)!, pin: true });
        return { loaded: false }; // already resident through this manager: re-asking is not a load
      }
      const sizeBytes = await ollamaModelSize(url, model);
      const currentTotal = [...own.values()].reduce((sum, v) => sum + v.sizeBytes, 0);
      if (currentTotal + sizeBytes > opts.budgetBytes) {
        throw new ResidencyBudgetError(
          `loading "${model}" (${sizeBytes} bytes) would push the resident set to ${currentTotal + sizeBytes} bytes, over the budget of ${opts.budgetBytes}`,
        );
      }
      // keep_alive is ALWAYS pinned explicitly (research R11): Ollama's own default (~5 min, observed live) would
      // otherwise unload the model on its own timer with no KILN-caused event, leaving kiln.lane's `resident` field
      // wrong with no release ever recorded. "-1" keeps it resident exactly as long as the lane's lease/pin logic says.
      await ollamaGenerate(url, model, KEEP_ALIVE_FOREVER, loadOpts.signal);
      own.set(model, { pin: loadOpts.pin === true, sizeBytes });
      return { loaded: true };
    },

    async unload(model) {
      const record = own.get(model);
      if (!record) return { unloaded: false }; // not resident through this manager at all
      if (record.pin === true) return { unloaded: false }; // FR-024: a pinned model survives a release with no unload call
      await ollamaGenerate(url, model, KEEP_ALIVE_NONE);
      own.delete(model);
      return { unloaded: true };
    },

    async probe(model) {
      // One real minimal round trip against Ollama's OpenAI-compatible endpoint — confirmed live against this exact
      // shape (2026-11-01): a trivial tool offered and checked for a real tool call (toolCalling); a streamed
      // response consumed as a stream (streaming); the response's own `usage` object's presence (usageAccounting —
      // capability only, Clarification 2: no figures are read beyond presence). `contextWindow` is read from
      // Ollama's own model listing, not probed: it is declared by the model, not discovered by a request.
      //
      // Found at code review, fixed: these four checks have no data dependency on each other (each is its own,
      // independent real round trip, and `callModel` already calls `probe()` fresh on every conversation round,
      // never cached — a deliberate, documented trade-off, see notes.md/implementation-report.md §7). Running them
      // concurrently turns four sequential round trips into the time of the slowest one, with no change to what is
      // checked or how often.
      const [contextWindow, toolCalling, streaming, usageAccounting] = await Promise.all([
        ollamaContextWindow(url, model),
        probeToolCalling(url, model),
        probeStreaming(url, model),
        probeUsage(url, model),
      ]);
      return { toolCalling, streaming, usageAccounting, contextWindow };
    },

    async reconcile(expected) {
      const running = await ollamaRunningModels(url);
      for (const model of running) {
        if (own.has(model)) continue;
        if (model === expected) {
          // Adoption, not a bypass (research, found at T038/T039): a restarted process's own bookkeeping is always
          // empty, but keep_alive:-1 means Ollama itself never forgot a model the previous process legitimately
          // loaded. The caller only passes `expected` as the model its own durable kiln.lane document already
          // names as resident, so adopting it here is recording what is already true, not trusting an outsider.
          own.set(model, { pin: false, sizeBytes: await ollamaModelSize(url, model) });
          continue;
        }
        return { model, detail: `Ollama reports "${model}" resident, but the residency manager never asked for it` };
      }
      return null;
    },
  };
}

async function ollamaContextWindow(url: string, model: string): Promise<number> {
  const res = await fetch(`${url}/api/show`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) throw new ResidencyError(`Ollama's "show" for "${model}" answered HTTP ${res.status}`);
  const body = (await res.json()) as { model_info?: Record<string, unknown> };
  const info = body.model_info ?? {};
  const key = Object.keys(info).find((k) => k.endsWith(".context_length"));
  const value = key ? info[key] : undefined;
  return typeof value === "number" ? value : 0;
}

async function chatCompletion(url: string, model: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, ...body }),
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
}

async function probeToolCalling(url: string, model: string): Promise<boolean> {
  const res = await chatCompletion(url, model, {
    messages: [{ role: "user", content: "Call the probe tool with value 1." }],
    tools: [{ type: "function", function: { name: "probe_tool", description: "a readiness probe", parameters: { type: "object", properties: { value: { type: "number" } }, required: ["value"] } } }],
  });
  if (!res.ok) return false;
  const body = (await res.json()) as { choices?: Array<{ message?: { tool_calls?: unknown[] } }> };
  return (body.choices?.[0]?.message?.tool_calls?.length ?? 0) > 0;
}

async function probeStreaming(url: string, model: string): Promise<boolean> {
  const res = await chatCompletion(url, model, { messages: [{ role: "user", content: "Say OK." }], stream: true });
  if (!res.ok || !res.body) return false;
  const reader = res.body.getReader();
  try {
    const { value } = await reader.read();
    return value !== undefined && value.length > 0;
  } finally {
    await reader.cancel().catch(() => {});
  }
}

async function probeUsage(url: string, model: string): Promise<boolean> {
  const res = await chatCompletion(url, model, { messages: [{ role: "user", content: "Say OK." }] });
  if (!res.ok) return false;
  const body = (await res.json()) as { usage?: Record<string, unknown> };
  return body.usage !== undefined && typeof body.usage === "object";
}
