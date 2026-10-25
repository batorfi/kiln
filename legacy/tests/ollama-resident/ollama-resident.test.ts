// kiln/tests/ollama-resident/ollama-resident.test.ts — T022 (US1), r7 · S6 · GATED live tier (`KILN_LIVE=1`).
//
// Against a REAL local Ollama: the output is genuinely the model's, varies with the input, and is captured by
// the walk. Skipped — WITH a recorded reason, never a silent pass — unless KILN_LIVE=1 (NC3=A), so the default
// `node --test` run stays green on a machine with nothing pulled.

import { test } from "node:test";
import assert from "node:assert/strict";
import { skipUnlessLive } from "../_live-gate.ts";
import { makeOllamaResident, OllamaError } from "../../src/ollama-resident.ts";
import { buildLiveWalk } from "../../src/live-walk.ts";
import { DEFAULT_LOCAL_MODEL } from "../../src/live-resident.ts";
import { validateLog } from "../../validate/log.ts";

const MODEL = process.env.KILN_LIVE_MODEL ?? DEFAULT_LOCAL_MODEL;
const u = (id: string, role: any, work?: string) => ({ id, role, tier: "strongest" as const, work });

test("S6 (live): the output is the MODEL'S — non-empty, and it varies with the input", skipUnlessLive(), async () => {
  const r = makeOllamaResident({ model: MODEL });
  await r.preflight();
  const a = String(await r.run(u("concept", "concept-writer", "a rate limiter")));
  const b = String(await r.run(u("review", "code-reviewer", "a rate limiter")));
  assert.ok(a.trim() && b.trim(), "non-empty visible output (the think:false discipline holds on a real thinking model)");
  assert.notEqual(a, b, "different units ⇒ different work product — it is not a fixed string");
});

test("S6 (live): temperature 0 + a fixed seed reproduces in-process (determinism for the fixture)", skipUnlessLive(), async () => {
  const r = makeOllamaResident({ model: MODEL });
  const first = String(await r.run(u("concept", "concept-writer", "a rate limiter")));
  const again = String(await r.run(u("concept", "concept-writer", "a rate limiter")));
  assert.equal(first, again);
});

test("S6 (live): a full nine-unit walk through the real lane captures every output and PASSES 001's log.ts", skipUnlessLive(), async () => {
  const walk = await buildLiveWalk({ mode: "live", resident: makeOllamaResident({ model: MODEL }), location: "loopback" });
  assert.equal(walk.outputs.length, 9);
  assert.ok(walk.outputs.every((o) => String(o.output).trim() !== ""), "every unit's captured work product is non-empty");
  const res = validateLog(walk.lines.map((l) => JSON.parse(l)), undefined);
  assert.equal(res.valid, true, res.failures.join("\n"));
});

test("S6 (live): a model that is not installed fails BY NAME against the real server", skipUnlessLive(), async () => {
  await assert.rejects(makeOllamaResident({ model: "no-such-model-kiln:1b" }).run(u("x", "worker")), (e: unknown) => e instanceof OllamaError && e.code === "model-missing");
});
