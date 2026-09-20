// kiln/validate/ollama-ready.ts — T024–T028 (US2), r7 · E3 (OllamaReady) · contract ollama-ready.md R1–R6.
//
// The FOURTH probe in the chain  RuntimeReady → OverlayCReady → LiveModelReady → OllamaReady, and the FIRST
// that actually DIALS. `LiveModelReady` proves the live path EXISTS and is WIRED — and a deterministic adapter
// satisfies that (it is what r3 shipped). This probe asserts what r3 could not: a call HAPPENED and returned
// the model's output.
//
//   (a) the endpoint answers                          --no-endpoint
//   (b) the NAMED model is installed                  --no-model
//   (c) a round-trip returns non-empty VISIBLE output --empty-visible
//   (d) the resident selection is RECORDED (F-NOT-SILENT, inherited from r3)   --stub-unlogged
//   (e) a CLAIMED live run is a PERFORMED one         --forged-live      ← the check that separates r7 from r3
//   (f) the hardened P-VIII scan is green AND the loopback allowlist has EXACTLY ONE entry   --extra-loopback
//
// SKIP IS NEVER A PASS (R3, NC3=A): with no endpoint or no model the probe returns `skipped: true`,
// `ready: false` and a NON-EMPTY `skipReason` — P-V ("headless never silently approves") lifted to the test
// suite. A skip with no reason is itself a violation. It runs NO gate, admits NO program (P-VI): a probe,
// not a walk. It composes ON `LiveModelReady`, which stays STATIC and runnable with no Ollama (R5).
//
// This module lives in `kiln/validate/`, which the P-VIII scan polices — so it may NOT import `node:http` or
// call `fetch`. Its falsify hooks therefore work by INJECTING stand-in residents (`override.resident`); the
// real resident (the one allowlisted module) is the only thing that dials.
//
// CLI: `node kiln/validate/ollama-ready.ts [--no-endpoint|--no-model|--empty-visible|--stub-unlogged|--forged-live|--extra-loopback]`

import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { checkLiveModelReady, type LiveModelReadyOverride, type LiveModelReadyResult } from "./live-ready.ts";
import type { Check } from "./overlay-ready.ts";
import { makeOllamaResident, OllamaError, type OllamaResident } from "../src/ollama-resident.ts";
import { makeLiveResident, DEFAULT_LOCAL_MODEL, isResidentSelectionRecorded } from "../src/live-resident.ts";
import { buildLiveWalk } from "../src/live-walk.ts";
import type { Resident } from "../src/stub-resident.ts";
import { validateLog } from "./log.ts";
import { zeroNetworkScan, SCAN_DIRS, LOOPBACK_ALLOWLIST, allowlistIsSingle } from "./_netscan.ts";
import { fmt, PASS } from "./_report.ts";
import { runCli } from "./_cli.ts";

export interface OllamaReadyOverride extends LiveModelReadyOverride {
  noEndpoint?: boolean; // `--no-endpoint`: point at a closed loopback port
  noModel?: boolean; // `--no-model`: name a model that is not installed
  emptyVisible?: boolean; // `--empty-visible`: a resident whose visible output is empty
  forgedLive?: boolean; // `--forged-live`: CLAIM `live @ loopback` while driving the walk with a deterministic adapter
  extraLoopback?: boolean; // `--extra-loopback`: a SECOND loopback allowlist entry
  /** Inject the resident (tests / stand-ins). Default: the real `makeOllamaResident`. */
  resident?: OllamaResident;
  model?: string;
  host?: string;
}

export interface OllamaReadyResult {
  ready: boolean;
  skipped: boolean;
  /** REQUIRED (non-empty) whenever `skipped` — a skip with no recorded reason is itself a violation. */
  skipReason?: string;
  checks: Check[];
  live: LiveModelReadyResult; // the composed r3 probe this rides on
}

const parse = (lines: string[]): Record<string, unknown>[] => lines.filter((l) => l.trim() !== "").map((l) => JSON.parse(l) as Record<string, unknown>);
const dirOf = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const schemaPath = dirOf("../schemas/factory-log.schema.json");
const indexPath = dirOf("../index.ts");

export async function checkOllamaReady(override: OllamaReadyOverride = {}): Promise<OllamaReadyResult> {
  const checks: Check[] = [];
  const model = override.noModel ? "kiln-no-such-model:0b" : (override.model ?? process.env.KILN_LIVE_MODEL ?? DEFAULT_LOCAL_MODEL);

  // ── compose ON r3's LiveModelReady (→ OverlayCReady → RuntimeReady). It stays STATIC: no Ollama needed (R5). ──
  const live = await checkLiveModelReady({
    brokenDogfood: override.brokenDogfood,
    brokenRender: override.brokenRender,
    brokenGate0: override.brokenGate0,
    stubUnlogged: override.stubUnlogged,
  });
  checks.push({
    name: "r1+r2+r3 live path ready (composes on LiveModelReady)",
    ok: live.ready,
    detail: live.ready ? "LiveModelReady is READY — the live path is wired (necessary, NOT sufficient: an adapter satisfies it)" : `named gap: ${live.checks.filter((c) => !c.ok).map((c) => c.name).join("; ")}`,
  });

  // ── wiring: the resident is exported from the kiln entry point ──
  let indexSrc = "";
  try { indexSrc = readFileSync(indexPath, "utf8"); } catch { /* reported below */ }
  const wired = /makeOllamaResident\b/.test(indexSrc) && /checkOllamaReady\b/.test(indexSrc);
  checks.push({ name: "kiln/index.ts exports the Ollama resident + OllamaReady", ok: wired, detail: wired ? "makeOllamaResident / checkOllamaReady exported" : "index does not export the r7 pieces" });

  // ── (d) the selection is RECORDED, not silent (F-NOT-SILENT). Offline: a stand-in claiming loopback. ──
  const dWalk = await buildLiveWalk({ mode: "live", resident: makeLiveResident({ model }), location: "loopback", recordSelection: !override.stubUnlogged });
  const dRecs = parse(dWalk.lines);
  const recorded = isResidentSelectionRecorded(dRecs, "live") && dWalk.lines.some((l) => /@ loopback/.test(l));
  checks.push({
    name: "(d) the resident selection is RECORDED, not silent (F-NOT-SILENT, P-V/P-VII)",
    ok: recorded,
    detail: recorded ? "the selection is in the log, with a symbolic `@ loopback` location" : "an UNLOGGED live selection slipped through — a silent stand-in (P-V)",
  });

  // ── (f) the hardened P-VIII scan is green AND the allowlist has EXACTLY ONE entry ──
  const allowlist = override.extraLoopback ? [...LOOPBACK_ALLOWLIST, "src/extra-loopback.ts"] : LOOPBACK_ALLOWLIST;
  const scan = zeroNetworkScan(SCAN_DIRS.map((d) => dirOf(`../${d}`)), "no external dep; no network call outside the one loopback module", allowlist);
  const single = allowlistIsSingle(allowlist);
  checks.push({
    name: "(f) hardened zero-network scan green AND exactly ONE loopback allowlist entry (P-VIII, NC2=A)",
    ok: scan.ok && single,
    detail: !single ? `the loopback allowlist has ${allowlist.length} entries [${allowlist.join(", ")}] — it must have EXACTLY ONE` : scan.ok ? `${scan.detail}; allowlist = [${allowlist.join(", ")}]` : `named gap: ${scan.detail}`,
  });

  // ── the dialing checks. Any precondition missing ⇒ SKIP WITH A RECORDED REASON — never a pass (R3). ──
  let ollama: OllamaResident;
  try {
    ollama = override.resident ?? makeOllamaResident({ model, host: override.noEndpoint ? "127.0.0.1:1" : override.host });
  } catch (e) {
    checks.push({ name: "(a) the endpoint answers", ok: false, detail: `cannot construct the resident: ${(e as Error).message}` });
    return { ready: false, skipped: false, checks, live };
  }
  try {
    await ollama.preflight();
    checks.push({ name: "(a) the endpoint answers", ok: true, detail: "GET /api/tags answered" });
    checks.push({ name: `(b) the named model "${ollama.model()}" is installed`, ok: true, detail: "present in /api/tags" });
  } catch (e) {
    const code = e instanceof OllamaError ? e.code : "endpoint-unreachable";
    if (code === "model-missing") {
      checks.push({ name: "(a) the endpoint answers", ok: true, detail: "GET /api/tags answered" });
      checks.push({ name: `(b) the named model "${model}" is installed`, ok: false, detail: `model "${model}" is NOT installed: ${(e as Error).message}` });
      return { ready: false, skipped: true, skipReason: `model "${model}" is not installed — the live tier cannot run (recorded, not a pass)`, checks, live };
    }
    checks.push({ name: "(a) the endpoint answers", ok: false, detail: `endpoint unreachable (${code}): ${(e as Error).message}` });
    return { ready: false, skipped: true, skipReason: `endpoint unreachable (${code}) — is Ollama running? The live tier cannot run (recorded, not a pass)`, checks, live };
  }

  // ── (c) + (e): drive a full nine-unit walk with the resident, and MEASURE what was actually performed ──
  const before = ollama.roundTrips();
  const driving = override.forgedLive ? forgedResident(ollama.model()) : override.emptyVisible ? emptyResident(ollama) : ollama;
  let walk: Awaited<ReturnType<typeof buildLiveWalk>> | undefined;
  let walkErr: unknown;
  try {
    walk = await buildLiveWalk({ mode: "live", resident: driving, location: "loopback", model: ollama.model() });
  } catch (e) {
    walkErr = e;
  }
  if (!walk) {
    const code = walkErr instanceof OllamaError ? walkErr.code : "error";
    checks.push({
      name: "(c) a round-trip returns non-empty VISIBLE content",
      ok: false,
      detail: code === "empty-visible" ? `EMPTY VISIBLE OUTPUT: ${(walkErr as Error).message}` : `the live walk failed (${code}): ${(walkErr as Error)?.message ?? String(walkErr)}`,
    });
    checks.push({ name: "(e) a CLAIMED live run is a PERFORMED one", ok: false, detail: "not evaluated — the walk did not complete (see c)" });
    return { ready: false, skipped: false, checks, live };
  }

  const empties = walk.outputs.filter((o) => typeof o.output !== "string" || o.output.trim() === "");
  const logRes = validateLog(parse(walk.lines), JSON.parse(readFileSync(schemaPath, "utf8")));
  checks.push({
    name: "(c) a round-trip returns non-empty VISIBLE content",
    ok: empties.length === 0 && walk.outputs.length > 0 && logRes.valid,
    detail:
      empties.length > 0
        ? `EMPTY VISIBLE OUTPUT for ${empties.length}/${walk.outputs.length} unit(s): ${empties.map((o) => o.duId).join(", ")} (a thinking model spending its budget on hidden reasoning)`
        : !logRes.valid
          ? `named gap: the emitted log FAILs 001's log.ts — ${logRes.failures[0]}`
          : `${walk.outputs.length} unit output(s), all non-empty; the emitted log (${walk.lines.length} records) PASSES 001's unmodified log.ts (R1–R6)`,
  });

  const performed = ollama.roundTrips() - before;
  const claimed = walk.lines.some((l) => /@ loopback/.test(l));
  const truthful = !claimed || (performed > 0 && performed >= walk.outputs.length);
  checks.push({
    name: "(e) a CLAIMED live run is a PERFORMED one (round-trips == units)",
    ok: truthful,
    detail: truthful
      ? `${performed} round-trip(s) performed for ${walk.outputs.length} unit(s) — the \`live @ loopback\` claim is backed by real calls`
      : `CLAIMED \`live @ loopback\` but performed ${performed} round-trip(s) for ${walk.outputs.length} unit(s) — a FORGED live marker (a deterministic adapter passes LiveModelReady; it cannot make this number move)`,
  });

  return { ready: checks.every((c) => c.ok), skipped: false, checks, live };
}

/**
 * `--empty-visible`: performs a REAL round-trip (so the round-trip counter moves and (e) stays green), then
 * blanks the reply — modelling a thinking model that spent its whole budget on hidden reasoning. ONLY (c) trips.
 */
function emptyResident(real: OllamaResident): OllamaResident {
  return { ...real, run: async (u) => { await real.run(u); return ""; } };
}

/**
 * `--forged-live`: a deterministic adapter that returns a NON-EMPTY STRING (so (c) stays green) while the
 * walk CLAIMS `live @ loopback` — but it never dials, so the real resident's round-trip counter never moves.
 * ONLY (e) trips. This is exactly what r3 shipped, and exactly what `LiveModelReady` cannot tell from the real thing.
 */
function forgedResident(model: string): Resident {
  const adapter = makeLiveResident({ model });
  return { ...adapter, run: (u) => `forged:${u.id}:${JSON.stringify(adapter.run(u))}` };
}

export async function reportOllamaReady(override: OllamaReadyOverride = {}): Promise<string> {
  const r = await checkOllamaReady(override);
  if (r.ready) return [PASS, "OllamaReady — the kiln fires a REAL local model (no gate advanced, no cloud; one loopback module):", ...r.checks.map((c) => `   ✓ ${c.name}: ${c.detail}`)].join("\n");
  const head = r.skipped ? [`SKIPPED (a skip is NEVER a pass): ${r.skipReason ?? "<<MISSING skipReason — itself a violation>>"}`] : [];
  return [...head, ...r.checks.filter((c) => !c.ok).map((c) => fmt(c.name, c.detail))].join("\n");
}

// ---- CLI ----
function isMain(): boolean {
  try { return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; }
}
if (isMain()) {
  runCli(async () => {
    const has = (f: string) => process.argv.includes(f);
    const ov: OllamaReadyOverride = {
      noEndpoint: has("--no-endpoint"), noModel: has("--no-model"), emptyVisible: has("--empty-visible"),
      stubUnlogged: has("--stub-unlogged"), forgedLive: has("--forged-live"), extraLoopback: has("--extra-loopback"),
    };
    const r = await checkOllamaReady(ov);
    if (r.ready) { console.log(await reportOllamaReady(ov)); return 0; }
    console.error(await reportOllamaReady(ov));
    return 1;
  });
}
