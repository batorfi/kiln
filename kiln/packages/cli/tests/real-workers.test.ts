// r16, found at code review: KILN_OLLAMA_PORT/KILN_MODEL_BUDGET_BYTES were parsed with a bare Number(...), which
// never throws — a typo'd value became NaN and only failed later, confusingly, the first time a URL or budget
// check used it. Fixed with an explicit, named refusal at startup; this file proves the refusal, not the whole
// real-lane/real-workers composition (that's owner-wiring.test.ts's job, through the actual CLI binary).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRealWorkers, RealWorkersConfigError } from "../src/real-workers.ts";

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const prior: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) prior[k] = process.env[k];
  try {
    for (const [k, v] of Object.entries(vars)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    return fn();
  } finally {
    for (const [k, v] of Object.entries(prior)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

test("KILN_OLLAMA_PORT=abc (not a number) is refused by name at construction, never silently becomes NaN", () => {
  withEnv({ KILN_OLLAMA_PORT: "abc", KILN_MODEL_BUDGET_BYTES: undefined }, () => {
    assert.throws(() => createRealWorkers(), (e) => e instanceof RealWorkersConfigError && /KILN_OLLAMA_PORT="abc"/.test((e as Error).message));
  });
});

test("KILN_MODEL_BUDGET_BYTES=0 (not positive) is refused by name", () => {
  withEnv({ KILN_MODEL_BUDGET_BYTES: "0", KILN_OLLAMA_PORT: undefined }, () => {
    assert.throws(() => createRealWorkers(), (e) => e instanceof RealWorkersConfigError && /KILN_MODEL_BUDGET_BYTES="0"/.test((e as Error).message));
  });
});

test("KILN_MODEL_BUDGET_BYTES=12.5 (not an integer) is refused by name", () => {
  withEnv({ KILN_MODEL_BUDGET_BYTES: "12.5", KILN_OLLAMA_PORT: undefined }, () => {
    assert.throws(() => createRealWorkers(), (e) => e instanceof RealWorkersConfigError && /KILN_MODEL_BUDGET_BYTES="12.5"/.test((e as Error).message));
  });
});

test("valid values (or none at all) construct without throwing", () => {
  withEnv({ KILN_OLLAMA_PORT: "11434", KILN_MODEL_BUDGET_BYTES: "1000000000" }, () => {
    const real = createRealWorkers();
    assert.ok(real.lane);
    assert.ok(real.workers);
  });
  withEnv({ KILN_OLLAMA_PORT: undefined, KILN_MODEL_BUDGET_BYTES: undefined }, () => {
    const real = createRealWorkers();
    assert.ok(real.lane);
    assert.ok(real.workers);
  });
});
