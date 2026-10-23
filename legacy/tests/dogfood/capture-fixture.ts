// kiln/tests/dogfood/capture-fixture.ts — T036 (US3), r7 · D9 · `npm run capture-fixture`.
//
// The EXPLICIT command that captures the committed live evidence: one REAL full-rail walk driven by a REAL
// local model, written to `kiln/fixtures/r7-live-inference.jsonl`, plus a no-`decidedBy` sibling
// `r7-live-broken.jsonl` that MUST fail 001's log.ts with a named R3. It lives in `kiln/fixtures/` — NOT
// `kiln/factory-log/`, which `.gitignore` excludes (a fixture there could never be committed).
//
// EXPLICIT ONLY: never run by a test, never silently rewritten (D9). Determinism holds in-process (temperature
// 0 + a fixed seed) but NOT across model reloads or Ollama upgrades — which is exactly why replay runs from a
// COMMITTED artifact rather than fresh live output. A sidecar (`r7-live-inference.meta.json`) records WHICH
// model and Ollama version produced it, so a future replay failure is attributable. The ledger itself stays
// pure 001-union (no new `recordType`), and carries no prompt or completion text (O6).
//
// Usage: `node kiln/tests/dogfood/capture-fixture.ts [--model <name>]`   (needs a running local Ollama)

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildLiveWalk, WalkHaltedError } from "../../src/live-walk.ts";
import { makeOllamaResident, OllamaError } from "../../src/ollama-resident.ts";
import { DEFAULT_LOCAL_MODEL } from "../../src/live-resident.ts";
import { validateLog } from "../../validate/log.ts";
import { runCli } from "../../validate/_cli.ts";

runCli(async () => {
  const args = process.argv.slice(2);
  const mi = args.indexOf("--model");
  const model = (mi >= 0 ? args[mi + 1] : undefined) ?? process.env.KILN_LIVE_MODEL ?? DEFAULT_LOCAL_MODEL;
  const dir = fileURLToPath(new URL("../../fixtures/", import.meta.url));

  const resident = makeOllamaResident({ model });
  try {
    await resident.preflight();
  } catch (e) {
    console.error(`FAIL — cannot capture: ${(e as Error).message}\n(this command needs a running local Ollama with "${model}" installed; it never falls back to a stand-in)`);
    return e instanceof OllamaError ? 1 : 2;
  }

  let good: Awaited<ReturnType<typeof buildLiveWalk>>;
  let broken: Awaited<ReturnType<typeof buildLiveWalk>>;
  try {
    good = await buildLiveWalk({ mode: "live", resident, location: "loopback", model });
    broken = await buildLiveWalk({ mode: "live", resident: makeOllamaResident({ model }), location: "loopback", model, brokenNoDecider: true });
  } catch (e) {
    if (!(e instanceof WalkHaltedError)) throw e;
    console.error(`FAIL — the live walk HALTED at unit "${e.unit}" (${e.code}); NOTHING was written. A fixture must be a complete, real run.`);
    return 1;
  }

  const goodRes = validateLog(good.lines.map((l) => JSON.parse(l)), undefined);
  const badRes = validateLog(broken.lines.map((l) => JSON.parse(l)), undefined);
  if (!goodRes.valid) { console.error(`FAIL — the captured live walk does not PASS log.ts:\n${goodRes.failures.join("\n")}`); return 1; }
  if (badRes.valid || !/R3/.test(badRes.failures.join("\n"))) { console.error("FAIL — the broken sibling did not fail with a named R3 (the guard is missing)"); return 1; }

  let ollamaVersion = "unknown";
  try { ollamaVersion = ((await (await fetch(`${resident.baseUrl}/api/version`)).json()) as { version?: string }).version ?? "unknown"; } catch { /* recorded as unknown */ }

  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}r7-live-inference.jsonl`, good.jsonl + "\n");
  writeFileSync(`${dir}r7-live-broken.jsonl`, broken.jsonl + "\n");
  writeFileSync(`${dir}r7-live-inference.meta.json`, JSON.stringify({
    model, ollamaVersion, capturedAt: new Date().toISOString(), records: good.lines.length, roundTrips: resident.roundTrips(),
    note: "Provenance for the committed fixture. Not part of the ledger. Regenerate ONLY via `npm run capture-fixture` — never from a test.",
  }, null, 2) + "\n");
  console.log(`PASS — captured ${good.lines.length} records from ${model} (Ollama ${ollamaVersion}) → kiln/fixtures/r7-live-inference.jsonl (+ broken sibling + meta)`);
  return 0;
});
