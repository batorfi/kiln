// kiln/tests/live-gate.ts — the live-model tier (r16 T005). Unlike legacy's KILN_LIVE (an explicit demand that FAILS loudly when
// broken, because setting the flag means the operator is DEMANDING the tier — see legacy/tests/_live-gate.ts, F-1), this tier has
// no demand flag at all: a newcomer's clone needs nothing pulled, and a CI host with no Ollama never fails by missing
// infrastructure. It AUTO-PROBES Ollama's own reachability and the named model's presence, and skips by name — never silently
// passing by running nothing — when either is absent (the row's own ground rule). Set KILN_LIVE_MODEL to use a model other than
// the default; this mirrors legacy's own convention (there, an env var selects the model once the live gate is already open).
const LIVE_MODEL_ENV = "KILN_LIVE_MODEL";
const DEFAULT_LIVE_MODEL = "gemma4:12b";
const OLLAMA_PORT_ENV = "KILN_OLLAMA_PORT";
const DEFAULT_OLLAMA_PORT = 11434;
const PROBE_TIMEOUT_MS = 2000;

/** The model this run targets: `KILN_LIVE_MODEL`, or the default (legacy's own pinned model, kept for continuity). */
export function liveModel(): string {
  return process.env[LIVE_MODEL_ENV]?.trim() || DEFAULT_LIVE_MODEL;
}

/** Ollama's base URL this run targets: loopback only (constitution VIII), port from `KILN_OLLAMA_PORT` or Ollama's default. */
export function ollamaBaseUrl(): string {
  const port = Number(process.env[OLLAMA_PORT_ENV] ?? DEFAULT_OLLAMA_PORT);
  return `http://127.0.0.1:${Number.isFinite(port) ? port : DEFAULT_OLLAMA_PORT}`;
}

export interface LiveModelStatus {
  available: boolean;
  /** Empty when `available`; otherwise the printed, named reason the tier is skipped. */
  reason: string;
  model: string;
  baseUrl: string;
}

/** Probes Ollama's reachability and whether `liveModel()` is actually installed. Never throws: any failure is just "not available", named. */
export async function probeLiveModel(): Promise<LiveModelStatus> {
  const model = liveModel();
  const baseUrl = ollamaBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
  } catch (e) {
    return { available: false, reason: `Ollama not reachable at ${baseUrl} (${(e as Error).message})`, model, baseUrl };
  }
  if (!res.ok) return { available: false, reason: `Ollama at ${baseUrl} answered HTTP ${res.status}`, model, baseUrl };
  let body: { models?: Array<{ name?: string }> };
  try {
    body = (await res.json()) as typeof body;
  } catch (e) {
    return { available: false, reason: `Ollama at ${baseUrl} returned an unreadable /api/tags response (${(e as Error).message})`, model, baseUrl };
  }
  const installed = (body.models ?? []).some((m) => m.name === model);
  if (!installed) return { available: false, reason: `model "${model}" not installed (ollama pull ${model})`, model, baseUrl };
  return { available: true, reason: "", model, baseUrl };
}

/** Spread into node:test's options: `test("…", skipOption(await probeLiveModel()), async () => {…})`. */
export function skipOption(status: LiveModelStatus): { skip: string | false } {
  return { skip: status.available ? false : `live-model tier: ${status.reason}` };
}
