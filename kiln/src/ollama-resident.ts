// kiln/src/ollama-resident.ts — T016/T017/T018 (US1), r7 · E1 (the Ollama resident) · NC1=B, NC2=A.
//
// The first `Resident` that performs GENUINE inference. r1's stub returns a fixed value and r3's "live"
// adapter is a pure function; this one sends the unit to a local Ollama and returns what the MODEL said.
// It implements r1's `Resident` interface UNCHANGED in role (D1) — `run` is now allowed to be async.
//
//   · P-I   it RUNS work, it NEVER decides a gate — a human `decidedBy` (or a distinct pre-delegation) does.
//   · P-VIII (NC2=A) this is the ONE module allowed to reach the local endpoint (`LOOPBACK_ALLOWLIST` in
//     validate/_netscan.ts, by path). It refuses any non-loopback host — INCLUDING one supplied through
//     `OLLAMA_HOST`: an env var must not be able to point the lane at a remote box and defeat the exception.
//   · P-III one unit in flight: a second `run` while one is pending is refused here too, not only by the lane.
//   · `think:false` is MANDATORY (D4/O2): measured on a thinking model, `/api/generate` with a small
//     `num_predict` returned `content: ''` (the whole budget went to hidden reasoning) with NO error. An empty
//     visible reply is therefore a NAMED FAULT (`empty-visible`), never accepted work product (FR-003).
//   · Every failure is NAMED (`OllamaError.code`) and bounded by a timeout — never an indefinite block, never
//     a silent substitution of another model, never an approved gate (O3).
//
// Prompts and completions stay OUT of the factory-log (O6): the log records THAT a unit ran, on WHICH resident.
// No dependency (Node's global `fetch`); no timer/server/UI (P-IX).

import type { Resident, WorkUnit } from "./stub-resident.ts";
import type { Tier } from "./roles.ts";

/** The default local endpoint (`host[:port]`, no scheme). Loopback by construction. */
export const OLLAMA_DEFAULT_HOST = "127.0.0.1:11434";

export type OllamaErrorCode =
  | "non-loopback-host" // the host is not loopback — refused (P-VIII / NC2=A)
  | "endpoint-unreachable" // nothing answered at the host
  | "model-missing" // the named model is not in /api/tags — never silently substituted (FR-004)
  | "empty-visible" // a thinking model returned no visible content (FR-003)
  | "bad-status" // a non-2xx response
  | "timeout" // bounded failure (O3)
  | "concurrent-run"; // a second unit while one is in flight (P-III / FR-015a)

/** A NAMED failure: tests and the `OllamaReady` probe key off `.code`, never a message substring. */
export class OllamaError extends Error {
  readonly code: OllamaErrorCode;
  constructor(code: OllamaErrorCode, message: string) {
    super(`OllamaResident[${code}]: ${message}`);
    this.name = "OllamaError";
    this.code = code;
  }
}

/** Loopback only: 127.0.0.0/8, `localhost`, `::1`. NOT `0.0.0.0` (a bind-all address is not a target). */
export function isLoopbackHost(hostname: string): boolean {
  return /^(?:127(?:\.\d{1,3}){3}|localhost|\[?::1\]?)$/i.test(hostname.trim());
}

/**
 * Resolve a host string (`host`, `host:port`, `http://host:port`, `[::1]:port`) to a base URL — or throw
 * `non-loopback-host`. Defaults to `OLLAMA_HOST`, else `OLLAMA_DEFAULT_HOST`.
 */
export function resolveOllamaBase(host?: string): { hostname: string; port: string; base: string } {
  const raw = (host ?? process.env.OLLAMA_HOST ?? OLLAMA_DEFAULT_HOST).trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const m = raw.startsWith("[") ? /^(\[[^\]]+\])(?::(\d+))?$/.exec(raw) : /^([^:]+)(?::(\d+))?$/.exec(raw);
  if (!m) throw new OllamaError("non-loopback-host", `cannot parse host "${raw}"`);
  const hostname = m[1];
  const port = m[2] ?? "11434";
  if (!isLoopbackHost(hostname)) {
    throw new OllamaError("non-loopback-host", `host "${hostname}" is not loopback — P-VIII (NC2=A) permits only the LOCAL endpoint; not even via OLLAMA_HOST`);
  }
  return { hostname, port, base: `http://${hostname}:${port}` };
}

export interface OllamaResidentOptions {
  /** A plain model NAME, e.g. `gemma4:12b` (an `ollama/` provider prefix is stripped). Never a URL (P-VIII). */
  model: string;
  /** The model's tier; line-of-defense roles bind `strongest` regardless, via the inherited `bindRole` (P-II). */
  tier?: Tier;
  /** `host[:port]` — MUST be loopback; default `OLLAMA_HOST` else `OLLAMA_DEFAULT_HOST`. */
  host?: string;
  /** Determinism (D4): `temperature` 0 + a fixed `seed` reproduce in-process (verified: identical digests). */
  seed?: number;
  temperature?: number;
  /** Bounded visible output. */
  numPredict?: number;
  /** Bounded failure (O3). Generous by default: a cold load of a large model takes minutes. */
  timeoutMs?: number;
}

/** A `Resident` that can also verify its own preconditions (FR-004). */
export interface OllamaResident extends Resident {
  /** GET /api/tags: the endpoint answers AND the named model is present. Throws a NAMED `OllamaError`. */
  preflight(): Promise<string[]>;
  /** How many chat round-trips this resident has actually PERFORMED (a response received). This is what lets
   *  `OllamaReady` tell a CLAIMED live run from a PERFORMED one — a deterministic adapter satisfies r3's
   *  `LiveModelReady`, but it cannot make this number move (check (e)). */
  roundTrips(): number;
  readonly baseUrl: string;
}

/** The deterministic prompt for a unit — role + id (+ input). Different units ⇒ different prompts (S6). */
export function promptFor(unit: WorkUnit): string {
  const input = unit.work === undefined ? "" : `\nInput: ${typeof unit.work === "string" ? unit.work : JSON.stringify(unit.work)}`;
  return `You are the "${unit.role}" role working on unit "${unit.id}" of a small software feature.${input}\nReply with ONE short sentence describing your work product. No preamble.`;
}

async function request(url: string, init: RequestInit, timeoutMs: number, what: string): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    if ((e as Error)?.name === "TimeoutError" || (e as Error)?.name === "AbortError") {
      throw new OllamaError("timeout", `${what} did not answer within ${timeoutMs} ms`);
    }
    throw new OllamaError("endpoint-unreachable", `${what} — nothing answered (${(e as Error)?.message ?? String(e)}); is Ollama running?`);
  }
}

/** A tag matches if it is the exact name, or the bare name's `:latest`. */
function modelPresent(names: string[], model: string): boolean {
  return names.includes(model) || (!model.includes(":") && names.includes(`${model}:latest`));
}

export function makeOllamaResident(opts: OllamaResidentOptions): OllamaResident {
  const name = opts.model.replace(/^ollama\//, "");
  const tier: Tier = opts.tier ?? "strongest";
  const { base } = resolveOllamaBase(opts.host); // throws `non-loopback-host` at CONSTRUCTION, before anything can be sent
  const timeoutMs = opts.timeoutMs ?? 300_000;
  let inFlight = false;
  let verified = false;
  let trips = 0;

  async function preflight(): Promise<string[]> {
    const res = await request(`${base}/api/tags`, { method: "GET" }, Math.min(timeoutMs, 15_000), "GET /api/tags");
    if (!res.ok) throw new OllamaError("bad-status", `GET /api/tags → HTTP ${res.status}`);
    const body = (await res.json()) as { models?: { name?: string }[] };
    const names = (body.models ?? []).map((m) => String(m.name));
    if (!modelPresent(names, name)) {
      throw new OllamaError("model-missing", `model "${name}" is not installed (installed: ${names.join(", ") || "none"}) — no silent substitution`);
    }
    verified = true;
    return names;
  }

  return {
    baseUrl: base,
    preflight,
    roundTrips: () => trips,
    model(): string {
      return name; // a NAME, never a URL (P-VIII)
    },
    tier(): Tier {
      return tier;
    },
    async run(unit: WorkUnit): Promise<string> {
      if (inFlight) throw new OllamaError("concurrent-run", `unit "${unit.id}" started while another is in flight — one lane, one unit (P-III / FR-015a)`);
      inFlight = true;
      try {
        if (!verified) await preflight(); // FR-004: fail BY NAME before sending work, not via an opaque 404
        const res = await request(
          `${base}/api/chat`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              model: name,
              messages: [{ role: "user", content: promptFor(unit) }],
              stream: false,
              think: false, // MANDATORY (D4/O2) — else a thinking model can spend the budget and return ''
              options: { temperature: opts.temperature ?? 0, seed: opts.seed ?? 42, num_predict: opts.numPredict ?? 128 },
            }),
          },
          timeoutMs,
          `POST /api/chat (unit "${unit.id}")`,
        );
        if (!res.ok) {
          const text = (await res.text()).slice(0, 200);
          if (res.status === 404) throw new OllamaError("model-missing", `model "${name}" not found by the server: ${text}`);
          throw new OllamaError("bad-status", `POST /api/chat → HTTP ${res.status}: ${text}`);
        }
        const body = (await res.json()) as { message?: { content?: string } };
        trips++; // a response WAS received — counted even if it turns out to be empty (a performed trip)
        const content = body.message?.content ?? "";
        if (content.trim() === "") {
          throw new OllamaError("empty-visible", `model "${name}" returned NO visible content for unit "${unit.id}" (a thinking model spending its whole budget on hidden reasoning is a FAULT, not work product)`);
        }
        return content;
      } finally {
        inFlight = false;
      }
    },
  };
}
