// kiln/validate/roadmap.ts — T016/T015 (US2): the ROADMAP.md validator.
//
// Consumes kiln/schemas/roadmap.schema.json and enforces the semantic rules the
// per-object schema cannot alone: M1 (deps/ordering resolve + cycle-free),
// M3 (a committed/approved program needs a full human-decided gate0 record),
// M4 (status invariants: gate iff active; outcome iff done). Heads are JSON (a
// YAML subset), extracted from the first ```json block of the .md. This module
// DOES NOT authorize a program (Q2=A, P-VI) — it only REJECTS a committed one.
//
// CLI: `node kiln/validate/roadmap.ts <file.md>` — prints PASS or FAIL + reasons.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validate, type Schema } from "./_core.ts";
import { fmt, PASS } from "./_report.ts";

const SCHEMA_PATH = new URL("../schemas/roadmap.schema.json", import.meta.url);

export interface RoadmapResult {
  valid: boolean;
  failures: string[];
  head: unknown;
}

export function extractHead(md: string): unknown {
  const m = md.match(/```json\s*\n?([\s\S]*?)```/);
  if (!m) throw new Error("roadmap head not found: expected a ```json block");
  return JSON.parse(m[1]);
}

function readHeadSchema(): Schema {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as Schema;
}

/** M1: every ordering entry + every row's deps resolves to an existing row id, acyclic. */
export function checkM1(head: any): string[] {
  const failures: string[] = [];
  if (!head || typeof head !== "object") return ["M1: head is not an object"];
  const rows: any[] = Array.isArray(head.rows) ? head.rows : [];
  const ids = new Set(rows.map((r: any) => r && r.id).filter(Boolean));
  for (const rid of Array.isArray(head.ordering) ? head.ordering : []) {
    if (!ids.has(rid)) failures.push(fmt("M1 ordering", `ordering references unknown row id "${rid}"`));
   }
  for (const row of rows) {
    for (const dep of Array.isArray(row?.deps) ? row.deps : []) {
      if (!ids.has(dep)) failures.push(fmt(`M1 row ${row.id}`, `deps references unknown row id "${dep}"`));
     }
   }
   // Cycle check: per-start DFS following the first out-edge; revisit detects a cycle.
  const hasCycle = (): boolean => {
    for (const a of ids) {
      const seen = new Set<string>();
      let cur: string | undefined = a;
      while (cur) {
        if (seen.has(cur)) return true;
        seen.add(cur);
        const outRows = rows.filter((r: any) => r.id === cur);
        const deps = outRows[0]?.deps;
        cur = Array.isArray(deps) && deps.length > 0 ? deps[0] : undefined;
        }
      }
   return false;
    };
  if (hasCycle()) failures.push(fmt("M1 deps", `a dependency cycle was detected (the graph must be acyclic)`));
  return failures;
}

/** M3: an approved/committed program must carry a full human-decided gate0 record. */
export function checkM3(head: any): string[] {
  const failures: string[] = [];
  if (!head || typeof head !== "object") return failures;
  const gate0 = head.gate0 ?? {};
  if (gate0.status === "approved") {
    for (const req of ["rows", "decided_by", "at"]) {
      if (!gate0[req]) failures.push(fmt("M3 gate0", `status "approved" requires a full human-decided field "${req}"`));
      }
    if (Array.isArray(head.ordering) && head.ordering.length > 0 && (!Array.isArray(head.rows) || head.rows.length === 0)) {
      failures.push(fmt("M3 ordering", `committed ordering with no rows — the scaffold cannot pre-authorize a program`));
      }
   }
  return failures;
}

/** M4: status invariants — gate present iff status=active; outcome present iff status=done. */
export function checkM4(head: any): string[] {
  const failures: string[] = [];
  if (!head || !Array.isArray(head.rows)) return failures;
  for (const row of head.rows) {
    if (row.status === "active" && !(row.gate >= 1 && row.gate <= 9)) {
      failures.push(fmt(`M4 row ${row.id}`, `status "active" requires gate in 1..9`));
      }
    if (row.status === "done" && !/^@PR#[0-9]+$/.test(String(row.outcome ?? ""))) {
      failures.push(fmt(`M4 row ${row.id}`, `status "done" requires outcome matching ^@PR#[0-9]+$`));
      }
   }
  return failures;
}

export function validateRoadmap(md: string, schema?: Schema): RoadmapResult {
  const s = schema ?? readHeadSchema();
  let head: unknown;
  try {
    head = extractHead(md);
    } catch (e) {
      return { valid: false, failures: [fmt("head", String((e as Error).message))], head: undefined };
    }
  const clean: string[] = [];
  clean.push(...validate(head, s).map((e) => fmt("schema", `${e.path} ${e.message}`)));
  clean.push(...checkM1(head as any));
  clean.push(...checkM3(head as any));
  clean.push(...checkM4(head as any));
  return { valid: clean.length === 0, failures: clean, head };
}

export function validateRoadmapFile(path: string, schema?: Schema): RoadmapResult {
  return validateRoadmap(readFileSync(path, "utf8"), schema);
}

// ---- CLI entry (T017) ----
function isMain(): boolean {
  try {
    return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
    } catch {
      return false;
    }
}
if (isMain()) {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: node kiln/validate/roadmap.ts <file.md>");
    process.exit(2);
    }
  const res = validateRoadmapFile(path);
  if (res.valid) {
    console.log(PASS);
    process.exit(0);
    } else {
    console.error(res.failures.join("\n"));
    process.exit(1);
    }
}
