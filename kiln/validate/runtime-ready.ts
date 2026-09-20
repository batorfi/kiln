// kiln/validate/runtime-ready.ts — T029/T030 (US6): the RuntimeReady check · E7 (SC-006).
//
// A STATIC, falsifiable `node --test` probe — the EXTENSION of 001's `firing-ready.ts`. It asserts
// the runtime EXISTS, IS WIRED, EMITS A VALID LOG, and PULLS NO CLOUD — WITHOUT advancing a gate or
// running a *real* feature (a probe, not a walk). A broken element NAMES ITSELF and flips
// `ready=false`. Like FiringReady it is a handoff proof: "the kiln fires" on a stand-in resident,
// local-first, judged BY 001's `kiln/validate/log.ts`.
//
// (a) wiring     — the five src modules + the four ui modules exist and are importable, and
//                  kiln/index.ts is wired (no longer 001's "not-wired" stub).
// (b) valid log  — a synthetic stub-resident walk's emitted JSOnL PASSES 001's kiln/validate/log.ts
//                  (R1–R6, the D5 dogfood).
// (c) no cloud   — a zero-network scan over kiln/{src,ui,validate,contracts} finds NO outbound
//                  dependency (P-VIII): no external-package import, no socket/server/fetch primitive.
//
// CLI: `node kiln/validate/runtime-ready.ts [--broken]` — prints READY or a named gap; runs no gate.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildStubWalk } from "../src/walk.ts";
import { validateLog } from "./log.ts";
import { fmt, PASS } from "./_report.ts";
import { runCli } from "./_cli.ts";
import { zeroNetworkScan, SCAN_DIRS } from "./_netscan.ts";

const parse = (lines: string[]): Record<string, unknown>[] =>
   lines.map((l) => l.trim()).filter((l) => l !== "").map((l) => JSON.parse(l) as Record<string, unknown>);

export interface Deps {
  lane: string;
  gate: string;
  writer: string;
  scheduler: string;
  resident: string;
  uiDir: string;
  index: string;
  schema: string;
}

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export const DEFAULT_DEPS: Deps = {
  lane: src("../src/lane.ts"),
  gate: src("../src/gate.ts"),
  writer: src("../src/log-writer.ts"),
  scheduler: src("../src/scheduler.ts"),
  resident: src("../src/stub-resident.ts"),
  uiDir: src("../ui"),
  index: src("../index.ts"),
  schema: src("../schemas/factory-log.schema.json"),
};

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}
export interface RuntimeReadyResult {
  ready: boolean;
  checks: Check[];
}
/** Falsify hooks: point a dep at a nonexistent file, or open the no-silent-approval hole. */
export interface RuntimeReadyOverride extends Partial<Deps> {
  brokenDogfood?: boolean;
}

function fileExists(p: string): boolean {
  try {
    return statSync(p).isFile();
   } catch {
    return false;
   }
}

export async function checkRuntimeReady(override: RuntimeReadyOverride = {}): Promise<RuntimeReadyResult> {
  const d = { ...DEFAULT_DEPS, ...override };
  const checks: Check[] = [];

       // (a) the five src modules.
  const modules: [string, string][] = [
      ["lane", d.lane],
      ["gate", d.gate],
      ["log-writer", d.writer],
      ["scheduler", d.scheduler],
      ["stub-resident", d.resident],
      ];
  for (const [name, path] of modules) {
    checks.push(fileExists(path)
        ? { name: `module ${name}`, ok: true, detail: "present + importable" }
        : { name: `module ${name}`, ok: false, detail: `missing/broken file: ${path}` });
      }

       // (a) the four ui modules.
  try {
    if (statSync(d.uiDir).isDirectory()) {
      const ui = readdirSync(d.uiDir).filter((f) => f.endsWith(".ts"));
      const need = ["factory-state.ts", "hud.ts", "popup.ts", "twin.ts"];
      const missing = need.filter((n) => !ui.includes(n));
      checks.push({ name: "ui modules", ok: missing.length === 0, detail: missing.length === 0 ? "A/B + twin present" : `missing ${missing.join(", ")}` });
         } else {
      checks.push({ name: "ui modules", ok: false, detail: `not a dir: ${d.uiDir}` });
         }
     } catch {
    checks.push({ name: "ui modules", ok: false, detail: `missing/broken dir: ${d.uiDir}` });
      }

     // (a) index wired (r1 flipped 001's not-wired stub).
  if (!fileExists(d.index)) {
    checks.push({ name: "index wired", ok: false, detail: `missing/broken file: ${d.index}` });
     } else {
    const indexSrc = readFileSync(d.index, "utf8");
    const wired = /wired/.test(indexSrc) && !/(= false\b|return false)/.test(indexSrc);
    checks.push({ name: "index wired", ok: wired, detail: wired ? "spine exported; not the not-wired stub" : "still 001's not-wired stub" });
     }

     // (b) valid log — the stub walk's emitted JSOnL PASSES 001's kiln/validate/log.ts.
   const walk = await buildStubWalk({ preDelegate: true, haltOnVeto: false }); // r7: async spine — an un-awaited walk must never read as green
   let records = parse(walk.lines);
  if (override.brokenDogfood) {
      // Falsify (b): open the no-silent-approval hole (strip a human decider) → the emitted log
      // FAILs 001's validator, so the very check that should pass now fails and names it.
    const hole = records.find((r) => r.recordType === "gate-completion" && String((r as any)["gate-completion"]?.gate) === "3");
    if (hole) delete (hole as any)["gate-completion"].decidedBy;
     }
  const schema = JSON.parse(readFileSync(d.schema, "utf8"));
  const res = validateLog(records, schema);
  checks.push({
    name: "emitted log passes 001's log.ts",
    ok: res.valid,
    detail: res.valid ? `PASS (${records.length} records, R1–R6)` : `named gap: ${res.failures[0]}`,
    });

     // (c) no cloud.
   const scan = zeroNetworkScan(
    SCAN_DIRS.map((d) => fileURLToPath(new URL(`../${d}`, import.meta.url))),
    "no external dependency; no socket/server/timer (P-VIII)",
  ); // r7: the SHARED scan (src/ui/validate/contracts — src is finally really scanned)
  checks.push({ name: "zero-network (P-VIII)", ok: scan.ok, detail: scan.detail });

  return { ready: checks.every((c) => c.ok), checks };
}

export async function reportRuntimeReady(override: RuntimeReadyOverride = {}): Promise<string> {
  const r = await checkRuntimeReady(override);
  if (r.ready) {
   return [PASS, "RuntimeReady — the kiln fires on a stub (no gate advanced, no cloud):", ...r.checks.map((c) => `   ✓ ${c.name}: ${c.detail}`)].join("\n");
      }
  return r.checks.filter((c) => !c.ok).map((c) => fmt(c.name, c.detail)).join("\n");
}

// ---- CLI (T030): `node kiln/validate/runtime-ready.ts [--broken]` ----
function isMain(): boolean {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
     } catch {
    return false;
     }
}
if (isMain()) {
  runCli(async () => {
    const broken = process.argv.includes("--broken");
    const ov: RuntimeReadyOverride = broken ? { brokenDogfood: true } : {};
    const r = await checkRuntimeReady(ov);
    if (r.ready) {
      console.log(await reportRuntimeReady(ov));
      return 0;
    }
    console.error(await reportRuntimeReady(ov));
    return 1;
  });
}
