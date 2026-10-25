// kiln/tests/ollama-ready/_stand-in.ts — shared test aid (not a *.test.ts). A stand-in `OllamaResident` that
// COUNTS the round-trips it "performs", so `OllamaReady`'s logic is tested OFFLINE, with no Ollama at all.
import type { OllamaResident } from "../../src/ollama-resident.ts";
import { OllamaError } from "../../src/ollama-resident.ts";
import type { OllamaReadyResult } from "../../validate/ollama-ready.ts";

export function goodResident(model = "gemma4:12b"): OllamaResident & { trips: number } {
  const r = {
    trips: 0,
    baseUrl: "http://127.0.0.1:0",
    model: () => model,
    tier: () => "strongest" as const,
    preflight: async () => [model],
    roundTrips: () => r.trips,
    run: async (u: { id: string }) => { r.trips++; return `work product for ${u.id}`; },
  };
  return r as OllamaResident & { trips: number };
}

/** A resident whose preflight fails with a NAMED code — models "endpoint down" / "model not installed". */
export function failingPreflight(code: "endpoint-unreachable" | "model-missing", model = "gemma4:12b"): OllamaResident {
  return { ...goodResident(model), preflight: async () => { throw new OllamaError(code, code === "model-missing" ? `model "${model}" is not installed` : "nothing answered"); } };
}

export const failing = (r: OllamaReadyResult) => r.checks.filter((c) => !c.ok).map((c) => c.name);
