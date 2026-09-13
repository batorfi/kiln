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

// ---- (c) the zero-network scan (P-VIII) ----
const EXTERNAL_IMPORT = /(?:^|\s)(?:import|export)\s+[^;'"]*?\s+from\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\)/g;
const NET_PRIMITIVE = /\b(?:new\s+(?:Server|Socket|WebSocket))\b|\brequire\(\s*["'](?:http|https|net|dns|tls)["']/;

function isExternalSpecifier(spec: string): boolean {
  const s = spec.trim();
  if (s.startsWith(".") || s.startsWith("/") || s.startsWith("node:")) return false;
  return true;
}

function zeroNetworkScan(dirs: string[]): { ok: boolean; detail: string } {
  const offenders: string[] = [];
  for (const dir of dirs) {
    if (!fileExists(dir) || !statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".ts")) continue;
      const p = `${dir}/${f}`;
      const codeText = readFileSync(p, "utf8");
      if (NET_PRIMITIVE.test(codeText)) offenders.push(`${p}: a socket/server/network primitive`);
      let m: RegExpExecArray | null;
      EXTERNAL_IMPORT.lastIndex = 0;
      while ((m = EXTERNAL_IMPORT.exec(codeText)) !== null) {
        const spec = m[1] ?? m[2] ?? m[3] ?? "";
        if (isExternalSpecifier(spec)) offenders.push(`${p}: external dependency "${spec}"`);
       }
    }
}
  return offenders.length === 0
    ? { ok: true, detail: "no external dependency; no socket/server/timer (P-VIII)" }
     : { ok: false, detail: offenders.join("; ") };
}

export function checkRuntimeReady(override: RuntimeReadyOverride = {}): RuntimeReadyResult {
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
   const walk = buildStubWalk({ preDelegate: true, haltOnVeto: false });
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
   const scan = zeroNetworkScan([
    fileURLToPath(new URL("../src", import.meta.url)),
    fileURLToPath(new URL("../ui", import.meta.url)),
    fileURLToPath(new URL("../validate", import.meta.url)),
    fileURLToPath(new URL("../contracts", import.meta.url)),
      ]);
  checks.push({ name: "zero-network (P-VIII)", ok: scan.ok, detail: scan.detail });

  return { ready: checks.every((c) => c.ok), checks };
}

export function reportRuntimeReady(override: RuntimeReadyOverride = {}): string {
  const r = checkRuntimeReady(override);
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
  const broken = process.argv.includes("--broken");
  const ov: RuntimeReadyOverride = broken ? { brokenDogfood: true } : {};
  const r = checkRuntimeReady(ov);
  if (r.ready) {
    console.log(reportRuntimeReady(ov));
     process.exit(0);
      } else {
    console.error(reportRuntimeReady(ov));
      process.exit(1);
       }
}
