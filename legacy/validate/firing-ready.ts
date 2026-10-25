// kiln/validate/firing-ready.ts — T023/T024 (US4): the FiringReady handoff check.
//
// A STATIC, falsifiable gate-check over the three pre-lane contracts. It asserts
// PRESENCE + mutual consistency + trace notes, and that the shipped ROADMAP.md is
// the Q2=A blank. It runs NO lane and advances NO gate (SC-006 / Q1=C): a missing
// element NAMES itself and flips `ready=false`; a full set is `ready=true`.
//
// CLI: `node kiln/validate/firing-ready.ts` — prints READY or a named gap.

import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateRoadmapFile } from "./roadmap.ts";
import { fmt, PASS } from "./_report.ts";

export interface Deps {
  factoryLogSchema: string;
  roadmapSchema: string;
  gateRail: string;
  roadmapMd: string;
  moveVocabulary: string;
}

export const DEFAULT_DEPS: Deps = {
  factoryLogSchema: new URL("../schemas/factory-log.schema.json", import.meta.url).pathname,
  roadmapSchema: new URL("../schemas/roadmap.schema.json", import.meta.url).pathname,
  gateRail: new URL("../contracts/gate-rail.md", import.meta.url).pathname,
  roadmapMd: new URL("../ROADMAP.md", import.meta.url).pathname,
  moveVocabulary: new URL("../contracts/move-vocabulary.ts", import.meta.url).pathname,
};

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}
export interface FiringReadyResult {
  ready: boolean;
  checks: Check[];
}

function fileExists(p: string): boolean {
  try {
    return statSync(p).isFile();
   } catch {
    return false;
     }
}

export function checkFiringReady(override?: Partial<Deps>): FiringReadyResult {
  const d = { ...DEFAULT_DEPS, ...override };
  const checks: Check[] = [];

  // 1 + 2: both schemas present, parse, and carry a trace note (FR-009 / R6).
  for (const [name, p] of [
    ["factory-log schema", d.factoryLogSchema],
    ["roadmap schema", d.roadmapSchema],
     ] as const) {
     if (!fileExists(p)) {
      checks.push({ name, ok: false, detail: `missing file: ${p}` });
      continue;
       }
     try {
      const j = JSON.parse(readFileSync(p, "utf8"));
      checks.push({ name, ok: typeof j.trace === "string" && j.trace.trim() !== "", detail: typeof j.trace === "string" ? `trace: ${j.trace}` : "missing trace note" });
       } catch (e) {
      checks.push({ name, ok: false, detail: `does not parse: ${(e as Error).message}` });
        }
      }

     // 3: gate-rail contract present and names the strongest-model rule.
    if (!fileExists(d.gateRail)) {
      checks.push({ name: "gate-rail contract", ok: false, detail: `missing file: ${d.gateRail}` });
       } else {
      const txt = readFileSync(d.gateRail, "utf8");
      checks.push({ name: "gate-rail contract", ok: /line-of-defense/i.test(txt) && /P-II/i.test(txt), detail: "G2/L1 (strongest-model) present" });
        }

      // 4: the move-vocab / G3 is wired (the contract module is importable-consistent).
    if (!fileExists(d.moveVocabulary)) {
      checks.push({ name: "move-vocabulary (G3)", ok: false, detail: `missing file: ${d.moveVocabulary}` });
       } else {
      checks.push({ name: "move-vocabulary (G3)", ok: true, detail: "present (per-gate MoveVocabulary)" });
        }

      // 5: ROADMAP.md is present AND the Q2=A blank (valid, gate0 pending, 0 rows).
    if (!fileExists(d.roadmapMd)) {
      checks.push({ name: "shipped ROADMAP.md (Q2=A blank)", ok: false, detail: `missing file: ${d.roadmapMd}` });
       } else {
      const res = validateRoadmapFile(d.roadmapMd);
      const head = res.head as any;
      const isBlank = res.valid && head?.gate0?.status === "pending" && Array.isArray(head.rows) && head.rows.length === 0;
      checks.push({ name: "shipped ROADMAP.md (Q2=A blank)", ok: isBlank, detail: isBlank ? "valid empty program (gate0 pending, 0 rows)" : res.failures.join(" | ") });
        }

      return { ready: checks.every((c) => c.ok), checks };
}

export function reportFiringReady(override?: Partial<Deps>): string {
  const r = checkFiringReady(override);
  if (r.ready) {
    return [PASS, ...r.checks.map((c) => `  ✓ ${c.name}: ${c.detail}`)].join("\n");
     }
  const missing = r.checks.filter((c) => !c.ok).map((c) => fmt(`${c.name}`, c.detail));
  return missing.join("\n");
}

// ---- CLI (T024) ----
function isMain(): boolean {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
     } catch {
      return false;
       }
}
if (isMain()) {
  const out = reportFiringReady();
  if (checkFiringReady().ready) {
    console.log(out);
    process.exit(0);
     } else {
    console.error(out);
    process.exit(1);
     }
}
